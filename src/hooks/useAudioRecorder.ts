import { useState, useCallback, useRef } from 'react';

export interface AudioRecorderConfig {
    sampleRate: number; // e.g. 16000
    onAudioData: (base64: string) => void;
    onVolumeChange?: (volume: number) => void; // 0-100
    onLog?: (msg: string) => void;
    audioContext?: AudioContext | null;
}

// Simple Linear Interpolation / Decimation
const downsampleBuffer = (buffer: Float32Array, inputRate: number, outputRate: number) => {
    if (outputRate >= inputRate) return buffer;
    const sampleRatio = inputRate / outputRate;
    const newLength = Math.round(buffer.length / sampleRatio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
        // Basic decimation (picking nearest neighbor) - Sufficient for voice
        const px = Math.floor(i * sampleRatio);
        result[i] = buffer[px];
    }
    return result;
};

export function useAudioRecorder({ sampleRate, onAudioData, onVolumeChange, onLog, audioContext }: AudioRecorderConfig) {
    const [isRecording, setIsRecording] = useState(false);
    const contextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);

    const start = useCallback(async () => {
        if (isRecording) return;
        try {
            onLog?.("Requesting microphone access...");
            // 1. Remove sampleRate constraint to avoid failure on some devices
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    // sampleRate: sampleRate, // Do not force sample rate
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                }
            });
            onLog?.("Microphone access granted");
            streamRef.current = stream;

            // 2. Use existing AudioContext or create new
            let context = audioContext;
            if (!context) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                context = new AudioContextClass();
            }
            contextRef.current = context;

            // Ensure context is resumed (Safari requirement)
            if (context.state === 'suspended') {
                await context.resume();
            }

            const sourceSampleRate = context.sampleRate;
            onLog?.(`AudioContext active. Sample Rate: ${sourceSampleRate}Hz`);

            try {
                await context.audioWorklet.addModule('/pcm-processor.js');
                onLog?.("AudioWorklet loaded");
            } catch (e: any) {
                onLog?.(`Error loading AudioWorklet: ${e.message}`);
                throw e;
            }

            const source = context.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(context, 'pcm-processor');

            workletNode.port.onmessage = (event) => {
                const float32Array: Float32Array = event.data;

                // Calculate Volume (RMS) for visualization (before resampling)
                if (onVolumeChange) {
                    let sum = 0;
                    for (let i = 0; i < float32Array.length; i++) {
                        sum += float32Array[i] * float32Array[i];
                    }
                    const rms = Math.sqrt(sum / float32Array.length);
                    const volume = Math.min(100, rms * 400);
                    onVolumeChange(volume);
                }

                // Downsample to 16000Hz (Gemini requirement) if necessary
                let processedData = float32Array;
                if (sourceSampleRate !== 16000) {
                    processedData = downsampleBuffer(float32Array, sourceSampleRate, 16000);
                }

                // Convert Float32 to Int16 PCM
                const int16Array = new Int16Array(processedData.length);
                for (let i = 0; i < processedData.length; i++) {
                    const s = Math.max(-1, Math.min(1, processedData[i]));
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
            onLog?.("Recording started");

        } catch (err: any) {
            console.error("Error starting audio recorder:", err);
            onLog?.("Error starting recorder: " + err.message);
        }
    }, [sampleRate, onAudioData, onVolumeChange, onLog]);

    const stop = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (contextRef.current) {
            contextRef.current.close().catch(e => console.error("Error closing AudioContext:", e));
            contextRef.current = null;
        }
        workletNodeRef.current = null;
        setIsRecording(false);
    }, []);

    return { isRecording, start, stop };
}
