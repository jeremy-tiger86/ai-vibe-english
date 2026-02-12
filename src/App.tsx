import { useSessionManager } from './hooks/useSessionManager';
import VibeButton from './components/VibeButton';
import ScoreCard from './components/ScoreCard';
import './index.css';

function App() {
  const { status, connect, disconnect, volume, summary, score } = useSessionManager();

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
      {/* Background - Clean Toss Style (Solid Dark) */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, width: '100%', height: '100%',
        background: 'var(--toss-bg-base)',
        zIndex: -1,
        pointerEvents: 'none'
      }} />

      <header style={{ position: 'absolute', top: '3rem', left: 0, width: '100%', textAlign: 'center', padding: '0 24px' }}>
        <h1 className="text-display" style={{ marginBottom: '8px' }}>
          영어 빡세게 말하기
        </h1>
        <p className="text-subtitle">
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
        {/* Session Summary / Score Overlay */}
        {status === 'disconnected' && (
          <>
            {score ? (
              <ScoreCard score={score} onClose={() => window.location.reload()} />
            ) : summary ? (
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
        color: 'var(--toss-text-tertiary)',
        fontSize: '13px',
        fontWeight: 500
      }}>
        Copyright 2026 목동호랭이 All rights reserved
      </footer>
    </div>
  );
}

export default App;
