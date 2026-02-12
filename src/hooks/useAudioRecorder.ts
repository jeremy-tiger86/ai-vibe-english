import { useState, useCallback, useRef } from 'react';

export interface AudioRecorderConfig {
    sampleRate: number; // e.g. 16000
    onAudioData: (base64: string) => void;
    onVolumeChange?: (volume: number) => void; // 0-100
}

export function useAudioRecorder({ sampleRate, onAudioData, onVolumeChange }: AudioRecorderConfig) {
    const [isRecording, setIsRecording] = useState(false);
    const contextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);

    const start = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: sampleRate,
                }
            });
            streamRef.current = stream;

            // Unlock AudioContext for mobile browsers if needed (usually handled by user gesture)
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const context = new AudioContextClass({ sampleRate });
            contextRef.current = context;

            await context.audioWorklet.addModule('/pcm-processor.js');

            const source = context.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(context, 'pcm-processor');

            workletNode.port.onmessage = (event) => {
                const float32Array: Float32Array = event.data;

                // Calculate Volume (RMS)
                if (onVolumeChange) {
                    let sum = 0;
                    for (let i = 0; i < float32Array.length; i++) {
                        sum += float32Array[i] * float32Array[i];
                    }
                    const rms = Math.sqrt(sum / float32Array.length);
                    const volume = Math.min(100, rms * 400); // Amplify for visualization
                    onVolumeChange(volume);
                }

                // Convert Float32 to Int16 PCM
                const int16Array = new Int16Array(float32Array.length);
                for (let i = 0; i < float32Array.length; i++) {
                    const s = Math.max(-1, Math.min(1, float32Array[i]));
                    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                const buffer = int16Array.buffer;
                let binary = '';
                const bytes = new Uint8Array(buffer);
                const len = bytes.byteLength;
                for (let i = 0; i < len; i++) {
                    binary += String.fromCharCode(bytes[i]);
                }
                const base64 = btoa(binary);

                onAudioData(base64);
            };

            source.connect(workletNode);
            workletNode.connect(context.destination);

            workletNodeRef.current = workletNode;
            setIsRecording(true);

        } catch (err) {
            console.error("Error starting audio recorder:", err);
        }
    }, [sampleRate, onAudioData, onVolumeChange]);

    const stop = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (contextRef.current) {
            contextRef.current.close();
            contextRef.current = null;
        }
        workletNodeRef.current = null;
        setIsRecording(false);
    }, []);

    return { isRecording, start, stop };
}
