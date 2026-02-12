
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
    private onAudioData: (data: string) => void;
    private onTextData: (text: string) => void;
    private onLog?: (msg: string) => void;
    private lastLogTime = 0;

    constructor(
        config: GeminiConfig,
        onStateChange: (state: ConnectionState) => void,
        onAudioData: (data: string) => void,
        onTextData: (text: string) => void,
        onLog?: (msg: string) => void
    ) {
        this.config = config;
        this.onStateChange = onStateChange;
        this.onAudioData = onAudioData;
        this.onTextData = onTextData;
        this.onLog = onLog;
    }

    connect() {
        if (this.ws) return;

        this.onStateChange('connecting');
        this.onLog?.("Connecting to Gemini WebSocket via Proxy...");

        // Use VITE_PROXY_URL from env if available (for production), 
        // otherwise fallback to local hostname:3000
        const envProxyUrl = import.meta.env.VITE_PROXY_URL;
        const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const host = window.location.hostname;
        const port = '3000';

        const url = envProxyUrl || `${protocol}://${host}:${port}`;
        this.onLog?.(`Proxy URL: ${url}`);

        try {
            this.ws = new WebSocket(url);
        } catch (e: any) {
            this.onLog?.(`WebSocket creation failed: ${e.message}`);
            this.onStateChange('error');
            return;
        }

        this.ws.onopen = () => {
            this.onLog?.("WebSocket Opened via 'onopen' event");
            this.onStateChange('connected');
            this.sendInitialSetup();
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
            this.onLog?.(`WebSocket Closed. Code: ${event.code}, Reason: ${event.reason}`);
            this.onStateChange('disconnected');
            this.ws = null;
        };

        this.ws.onerror = (error) => {
            this.onLog?.("WebSocket Error Event");
            console.error("Gemini WebSocket Error:", error);
            this.onStateChange('error');
        };
    }

    disconnect() {
        if (this.ws) {
            this.onLog?.("Disconnecting manually...");
            this.ws.close();
            this.ws = null;
        }
    }

    sendAudio(base64Audio: string) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return;
        }

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

        try {
            this.ws.send(JSON.stringify(msg));
            const now = Date.now();
            if (now - this.lastLogTime > 2000) {
                this.onLog?.("Sending audio data..."); // Heartbeat log
                this.lastLogTime = now;
            }
        } catch (e: any) {
            this.onLog?.(`Error sending audio: ${e.message}`);
        }
    }

    private sendInitialSetup() {
        if (!this.ws) return;

        this.onLog?.("Sending Initial Setup Message...");

        const setupMsg = {
            setup: {
                model: `models/${this.config.model}`,
                generation_config: {
                    response_modalities: ["AUDIO"]
                },
                system_instruction: {
                    parts: [{ text: this.config.systemInstruction }]
                },
                tools: [
                    { google_search_retrieval: {} }
                ]
            }
        };
        this.ws.send(JSON.stringify(setupMsg));
    }

    private handleMessage(event: MessageEvent) {
        try {
            let data: any;
            if (event.data instanceof Blob) {
                this.onLog?.("Received Blob message (unexpected)");
                return;
            } else {
                data = JSON.parse(event.data);
            }

            if (data.serverContent?.modelTurn?.parts) {
                for (const part of data.serverContent.modelTurn.parts) {
                    if (part.inlineData && part.inlineData.mimeType.startsWith('audio')) {
                        this.onAudioData(part.inlineData.data);
                    }
                    if (part.text) {
                        this.onLog?.("Received Text: " + part.text.substring(0, 50) + "...");
                        this.onTextData(part.text);
                    }
                }
            }

            if (data.toolUse) {
                this.onLog?.("Tool Use Requested");
            }

        } catch (e: any) {
            console.error("Error parsing message:", e);
            this.onLog?.("Error parsing server message: " + e.message);
        }
    }
}
