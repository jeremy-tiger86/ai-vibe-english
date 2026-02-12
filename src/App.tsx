import { useSessionManager } from './hooks/useSessionManager';
import VibeButton from './components/VibeButton';
import './index.css';

function App() {
  const { status, connect, disconnect, volume, summary } = useSessionManager();

  const handleToggle = () => {
    if (status === 'disconnected' || status === 'error') {
      connect();
    } else {
      disconnect();
    }
  };

  return (
    <div className="app-container">
      {/* Background Gradient Mesh (Optional Vibe) */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        background: 'radial-gradient(circle at 50% 50%, rgba(100,100,255,0.1) 0%, rgba(0,0,0,0) 60%)',
        zIndex: -1,
        pointerEvents: 'none'
      }} />

      <header style={{ position: 'absolute', top: '2rem', left: 0, width: '100%', textAlign: 'center' }}>
        <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 700, opacity: 0.8 }}>
          영어 빡세게 말하기
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          {status === 'disconnected' ? "Tap to catch the vibe" : "Keep the flow going"}
        </p>
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
          marginTop: '3rem',
          height: '2rem',
          color: 'var(--color-text-muted)',
          fontSize: '0.9rem',
          textAlign: 'center'
        }}>
          {status === 'connected' && "Say: 'Hello!'"}
          {status === 'listening' && "Listening..."}
          {status === 'speaking' && "AI Speaking..."}
        </div>

        {/* Session Summary Overlay */}
        {summary && status === 'disconnected' && (
          <div className="glass-panel" style={{
            marginTop: '2rem',
            padding: '1.5rem',
            borderRadius: '16px',
            maxWidth: '80%',
            animation: 'fadeIn 0.5s ease'
          }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Session Summary</h3>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{summary}</p>
          </div>
        )}
      </main>

      {/* Footer / Debug (Optional) */}
      <footer style={{
        position: 'absolute',
        bottom: '1rem',
        width: '100%',
        textAlign: 'center',
        opacity: 0.3,
        fontSize: '0.7rem'
      }}>
        Copyright 2026 목동호랭이 All rights reserved
      </footer>
    </div>
  );
}

export default App;
