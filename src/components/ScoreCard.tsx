import React from 'react';

interface ScoreProps {
    score: {
        fluency_score: number;
        vocabulary_score: number;
        confidence_score: number;
        key_phrases: string[];
        feedback: string;
    };
    onClose?: () => void;
}

const ScoreCard: React.FC<ScoreProps> = ({ score, onClose }) => {
    const getGrade = (s: number) => {
        if (s >= 90) return 'S';
        if (s >= 80) return 'A';
        if (s >= 70) return 'B';
        return 'C';
    };

    const getColor = (s: number) => {
        if (s >= 90) return '#4caf50';
        if (s >= 80) return '#3182F6'; // Toss Blue for A
        if (s >= 70) return '#ff9800';
        return '#f44336';
    };

    return (
        <div className="toss-card" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '85%',
            maxWidth: '320px',
            animation: 'popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
            zIndex: 100
        }}>
            <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '22px' }}>Session Report</h2>
            <p style={{ textAlign: 'center', color: 'var(--toss-text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
                Great job! Here is your result.
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                <Metric label="Fluency" score={score.fluency_score} />
                <Metric label="Vocab" score={score.vocabulary_score} />
                <Metric label="Confidence" score={score.confidence_score} />
            </div>

            <div style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px' }}>
                <h4 style={{ color: 'var(--toss-text-secondary)', fontSize: '13px', marginBottom: '8px' }}>FEEDBACK</h4>
                <p style={{ fontSize: '15px', lineHeight: '1.5', color: '#fff', fontWeight: 500 }}>{score.feedback}</p>
            </div>

            <div style={{ marginBottom: '32px' }}>
                <h4 style={{ color: 'var(--toss-text-secondary)', fontSize: '13px', marginBottom: '12px' }}>KEY PHRASES</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {score.key_phrases.map((phrase, i) => (
                        <div key={i} style={{
                            background: 'var(--toss-bg-base)',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            fontSize: '14px',
                            color: '#E5E8EB',
                            fontWeight: 500
                        }}>
                            {phrase}
                        </div>
                    ))}
                </div>
            </div>

            {onClose && (
                <button className="toss-button" onClick={onClose}>
                    Close
                </button>
            )}
        </div>
    );

    function Metric({ label, score }: { label: string, score: number }) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <div style={{
                    fontSize: '28px',
                    fontWeight: 800,
                    color: getColor(score),
                    marginBottom: '4px'
                }}>
                    {getGrade(score)}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--toss-text-tertiary)', fontWeight: 600 }}>
                    {label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--toss-text-tertiary)', marginTop: '2px', opacity: 0.7 }}>
                    {score}
                </div>
            </div>
        );
    }
};

export default ScoreCard;
