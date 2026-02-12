import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        time: new Date().toISOString(),
        env: {
            hasApiKey: !!process.env.VITE_GEMINI_API_KEY
        }
    });
});

const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Proxy server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('Client connected to proxy');

    const googleUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${process.env.VITE_GEMINI_API_KEY}`;

    let googleWs = null;

    try {
        googleWs = new WebSocket(googleUrl);
    } catch (e) {
        console.error("Failed to create Google WebSocket:", e);
        ws.close(1011, "Internal Server Error during Google WS creation");
        return;
    }

    googleWs.on('open', () => {
        console.log('Connected to Google Gemini API');
    });

    googleWs.on('message', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
        }
    });

    googleWs.on('close', (code, reason) => {
        console.log(`Google WebSocket closed: ${code} - ${reason}`);
        if (ws.readyState === WebSocket.OPEN) {
            ws.close(code, reason);
        }
    });

    googleWs.on('error', (error) => {
        console.error('Google WebSocket error:', error);
        if (ws.readyState === WebSocket.OPEN) {
            ws.close(1011, error.message);
        }
    });

    ws.on('message', (data) => {
        if (googleWs && googleWs.readyState === WebSocket.OPEN) {
            googleWs.send(data);
        } else {
            // Buffer or ignore? For live streaming, ignoring might be safer if not connected yet,
            // but we should probably wait for open. 
            // For simplicity in this v1 proxy, we just log.
            console.warn("Client sent message but Google WS is not open");
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`Client WebSocket closed: ${code} - ${reason}`);
        if (googleWs && googleWs.readyState === WebSocket.OPEN) {
            googleWs.close(code, reason);
        }
    });

    ws.on('error', (error) => {
        console.error('Client WebSocket error:', error);
        if (googleWs && googleWs.readyState === WebSocket.OPEN) {
            googleWs.close(1011, error.message);
        }
    });
});
