import { useState, useCallback } from 'react';
import { useSessionManager } from './hooks/useSessionManager';
import VibeButton from './components/VibeButton';
import ScoreCard from './components/ScoreCard';
import './index.css';

function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-4), msg]); // Keep last 5 logs
    console.log(msg);
  }, []);

  const { status, connect, disconnect, volume, summary, score } = useSessionManager({ onLog: addLog });

  const handleToggle = () => {
    if (status === 'disconnected' || status === 'error') {
      addLog("User clicked Start");
      connect();
    } else {
      addLog("User clicked Stop");
      disconnect();
    }
  };

  return (
    <div className="app-container">
      {/* Background Gradient Mesh (Optional Vibe) */}
      {/* Background - Clean Toss Style (Solid Dark) */}
      {/* ... (rest of background) ... */}

      <header style={{
        width: '100%',
        textAlign: 'center',
        padding: '3rem 24px 0', // Top padding instead of absolute position 
        zIndex: 1
      }}>
        <h1 className="text-display" style={{ marginBottom: '8px' }}>
          빡세게 말하기
        </h1>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%'
      }}>
        <VibeButton
          status={status}
          volume={volume}
          onClick={handleToggle}
        />

        {/* Session Tips / Subtitles could go here */}
        <div style={{
          marginTop: '2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <p className="text-subtitle" style={{ margin: 0, color: status === 'error' ? '#FF3B30' : 'inherit' }}>
            {status === 'error' ? "Connection Error" : status === 'disconnected' ? "Tap to catch the vibe" : "Keep the flow going"}
          </p>
          <div style={{
            height: '2rem',
            color: 'var(--color-text-muted)',
            fontSize: '0.9rem',
          }}>
            {status === 'connected' && "Say: 'Hello!'"}
            {status === 'listening' && "Listening..."}
            {status === 'speaking' && "AI Speaking..."}
            {status === 'error' && "Check Environment Variables"}
          </div>
        </div>

        {/* Debug Logs Overlay */}
        <div style={{
          position: 'absolute',
          bottom: '60px',
          left: '10px',
          right: '10px',
          maxHeight: '100px',
          overflowY: 'auto',
          background: 'rgba(0,0,0,0.5)',
          color: '#0f0',
          fontSize: '10px',
          padding: '5px',
          borderRadius: '4px',
          pointerEvents: 'none',
          zIndex: 100
        }}>
          {logs.map((log, i) => <div key={i}>{log}</div>)}
        </div>

        {/* Session Summary Overlay */}
        {/* ... (rest of overlay) ... */}
        {status === 'disconnected' && (
          <>
            {score ? (
              <ScoreCard score={score} onClose={() => window.location.reload()} />
            ) : summary ? (
              // ... (summary logic) ...
              <div className="glass-panel" style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '90%',
                maxWidth: '600px',
                backgroundColor: 'rgba(30,30,30,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '2rem',
                borderRadius: '24px',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                maxHeight: '80vh',
                overflowY: 'auto',
                animation: 'fadeIn 0.5s ease',
                zIndex: 10
              }}>
                <h3 className="text-gradient" style={{ marginTop: 0, textAlign: 'center' }}>Session Summary</h3>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#ccc', marginBottom: '2rem' }}>
                  {summary}
                </div>
                <button
                  onClick={() => window.location.reload()}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    background: 'var(--color-primary)',
                    border: 'none',
                    borderRadius: '12px',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  Start New Session
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>

      {/* Footer / Debug (Optional) */}
      <footer style={{
        position: 'absolute',
        bottom: '1rem',
        width: '100%',
        textAlign: 'center',
        color: 'var(--speak-text-tertiary)',
        fontSize: '13px',
        fontWeight: 500
      }}>
        Copyright 2026 목동호랭이 All rights reserved
      </footer>
    </div>
  );
}

export default App;
