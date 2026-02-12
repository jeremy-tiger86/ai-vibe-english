/**
 * Gemini Multimodal Live API Client
 * Connects directly via WebSocket for lowest latency (Realtime).
 * Handles:
 * 1. Audio Streaming (Input -> API)
 * 2. Audio Playback (API -> Output)
 * 3. Connection State
 */

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface GeminiConfig {
    apiKey: string;
    model: string;
    systemInstruction?: string;
}

export class GeminiLiveClient {
    private ws: WebSocket | null = null;
    private config: GeminiConfig;
    private onStateChange: (state: ConnectionState) => void;
    private onAudioData: (data: string) => void; // Base64 audio chunk
    private onTextData: (text: string) => void;

    constructor(
        config: GeminiConfig,
        onStateChange: (state: ConnectionState) => void,
        onAudioData: (data: string) => void,
        onTextData: (text: string) => void
    ) {
        this.config = config;
        this.onStateChange = onStateChange;
        this.onAudioData = onAudioData;
        this.onTextData = onTextData;
    }

    connect() {
        if (this.ws) return;

        this.onStateChange('connecting');

        // Build WebSocket URL
        const host = "generativelanguage.googleapis.com";
        const uri = `wss://${host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent`;
        const url = `${uri}?key=${this.config.apiKey}`;

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            this.onStateChange('connected');
            this.sendInitialSetup();
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event);
        };

        this.ws.onclose = () => {
            this.onStateChange('disconnected');
            this.ws = null;
        };

        this.ws.onerror = (error) => {
            console.error("Gemini WebSocket Error:", error);
            this.onStateChange('error');
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    sendAudio(base64Audio: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const msg = {
            realtime_input: {
                media_chunks: [
                    {
                        mime_type: "audio/pcm",
                        data: base64Audio
                    }
                ]
            }
        };
        this.ws.send(JSON.stringify(msg));
    }

    private sendInitialSetup() {
        if (!this.ws) return;

        const setupMsg = {
            setup: {
                model: `models/${this.config.model}`,
                system_instruction: {
                    parts: [{ text: this.config.systemInstruction }]
                },
                tools: [
                    { google_search_retrieval: {} } // Optional: enable groundedness
                ]
            }
        };
        this.ws.send(JSON.stringify(setupMsg));
    }

    private handleMessage(event: MessageEvent) {
        try {
            const data = JSON.parse(event.data);

            if (data.serverContent?.modelTurn?.parts) {
                for (const part of data.serverContent.modelTurn.parts) {
                    // Handle Audio
                    if (part.inlineData && part.inlineData.mimeType.startsWith('audio')) {
                        this.onAudioData(part.inlineData.data);
                    }
                    // Handle Text (Summary/Feedback)
                    if (part.text) {
                        this.onTextData(part.text);
                    }
                }
            }
        } catch (e) {
            console.error("Error parsing message:", e);
        }
    }
}
