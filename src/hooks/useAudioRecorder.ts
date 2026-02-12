import { useState, useCallback, useRef } from 'react';

export interface AudioRecorderConfig {
    sampleRate: number; // e.g. 16000
    onAudioData: (base64: string) => void;
}

export function useAudioRecorder({ sampleRate, onAudioData }: AudioRecorderConfig) {
    const [isRecording, setIsRecording] = useState(false);
    const contextRef = useRef<AudioContext | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);

    const start = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: 1,
                    sampleRate: sampleRate, // Try to request 16kHz directly
                }
            });
            streamRef.current = stream;

            const context = new AudioContext({ sampleRate });
            contextRef.current = context;

            await context.audioWorklet.addModule('/pcm-processor.js');

            const source = context.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(context, 'pcm-processor');

            workletNode.port.onmessage = (event) => {
                const float32Array: Float32Array = event.data;
                // Convert Float32 to Int16 PCM
                const int16Array = new Int16Array(float32Array.length);
                for (let i = 0; i < float32Array.length; i++) {
                    const s = Math.max(-1, Math.min(1, float32Array[i]));
                    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                }

                // Convert to Base64
                // Use a more efficient method in production, but this is fine for MVP
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
            workletNode.connect(context.destination); // Connect to processing? No, mute it.
            // Actually we don't want to hear ourselves. 
            // workletNode.connect(context.destination); 

            workletNodeRef.current = workletNode;
            setIsRecording(true);

        } catch (err) {
            console.error("Error starting audio recorder:", err);
        }
    }, [sampleRate, onAudioData]);

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
