import { useState, useRef, useCallback } from 'react';
import { GeminiLiveClient, type ConnectionState } from '../lib/geminiLive';
import { useAudioRecorder } from './useAudioRecorder';
import { SYSTEM_INSTRUCTION } from '../config/systemPrompts';

export type SessionStatus = ConnectionState | 'listening' | 'speaking';

export function useSessionManager() {
    const [status, setStatus] = useState<SessionStatus>('disconnected');
    const [volume, setVolume] = useState(0); // For visualization
    const [summary, setSummary] = useState<string | null>(null);
    const [score, setScore] = useState<any | null>(null);

    // Audio Output (Speaker)
    const audioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);

    const playAudioChunk = useCallback((base64Audio: string) => {
        // Decode and play
        // Base64 -> ArrayBuffer -> Float32Array -> AudioBuffer
        try {
            const binaryString = atob(base64Audio);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const int16Buffer = bytes.buffer;
            const dataView = new DataView(int16Buffer);
            const float32Arr = new Float32Array(len / 2);

            for (let i = 0; i < len / 2; i++) {
                const int16 = dataView.getInt16(i * 2, true); // Little endian
                float32Arr[i] = int16 / 32768.0;
            }

            const activeCtx = audioContextRef.current;
            if (!activeCtx) return;

            const audioBuffer = activeCtx.createBuffer(1, float32Arr.length, 24000); // Gemini usually sends 24k? Verify.
            // Usually 24000 for output.
            audioBuffer.copyToChannel(float32Arr, 0);

            const source = activeCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(activeCtx.destination);

            const currentTime = activeCtx.currentTime;
            // Schedule closely
            const startTime = Math.max(currentTime, nextStartTimeRef.current);
            source.start(startTime);
            nextStartTimeRef.current = startTime + audioBuffer.duration;

            // Update volume for visualization (simple average)
            let sum = 0;
            for (let i = 0; i < float32Arr.length; i += 10) sum += Math.abs(float32Arr[i]);
            setVolume(Math.min(100, (sum / (float32Arr.length / 10)) * 500));

        } catch (e) {
            console.error("Error playing audio chunk:", e);
        }
    }, []);

    const clientRef = useRef<GeminiLiveClient | null>(null);

    const { start: startRecording, stop: stopRecording } = useAudioRecorder({
        sampleRate: 16000,
        onAudioData: (base64) => {
            clientRef.current?.sendAudio(base64);
            // Visual feedback for input
            setStatus('listening');
        }
    });

    const connect = useCallback(() => {
        if (!audioContextRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass();
        }

        setSummary(null); // Reset summary

        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
        if (!apiKey) {
            console.error("API Key missing. Please set VITE_GEMINI_API_KEY in .env");
            setStatus('error');
            return;
        }

        clientRef.current = new GeminiLiveClient(
            {
                apiKey,
                model: 'gemini-1.5-flash-latest',
                systemInstruction: SYSTEM_INSTRUCTION.role + "\n" + SYSTEM_INSTRUCTION.rules.join("\n") + "\n" + SYSTEM_INSTRUCTION.evaluationProtocol
            },
            (state) => {
                setStatus(state);
                if (state === 'connected') {
                    startRecording();
                } else if (state === 'disconnected') {
                    stopRecording();
                }
            },
            (audioData) => {
                playAudioChunk(audioData);
                setStatus('speaking');
            },
            (textData) => {
                setSummary(prev => {
                    const newSummary = (prev || '') + textData;
                    try {
                        const jsonMatch = newSummary.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            if (parsed.fluency_score !== undefined) {
                                setScore(parsed);
                            }
                        }
                    } catch (e) { /* ignore incomplete json */ }
                    return newSummary;
                });
            }
        );
        clientRef.current.connect();
    }, [startRecording, stopRecording, playAudioChunk]);

    const disconnect = useCallback(() => {
        clientRef.current?.disconnect();
        stopRecording();
        setStatus('disconnected');
        setVolume(0);
    }, [stopRecording]);

    return { status, connect, disconnect, volume, SYSTEM_INSTRUCTION, summary, score };
}
