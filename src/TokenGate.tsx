import React, { useState, useEffect } from 'react';

// Pull a comma-separated list of tokens, or default to a single token
const TOKEN_STRING = import.meta.env.VITE_ADMIN_TOKENS || 'NEWSROOM2026';
// Split the string into an array and trim any accidental spaces
const VALID_TOKENS = TOKEN_STRING.split(',').map((token: string) => token.trim());

export default function TokenGate({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if the user's saved token is still in the active valid list
    const savedToken = localStorage.getItem('workspace_token');
    if (savedToken && VALID_TOKENS.includes(savedToken)) {
      setIsAuthorized(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cleanInput = tokenInput.trim();
    if (VALID_TOKENS.includes(cleanInput)) {
      localStorage.setItem('workspace_token', cleanInput);
      setIsAuthorized(true);
    } else {
      setError('Invalid Admin License Token. Please try again.');
      setTokenInput('');
    }
  };

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', textAlign: 'center', maxWidth: '400px' }}>
        <h2 style={{ marginTop: 0 }}>Workspace Access</h2>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Please enter your Master Editorial License Token to continue.</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="text" 
            value={tokenInput} 
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Enter License Token"
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', fontSize: '16px' }}
          />
          {error && <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>}
          <button type="submit" style={{ padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
            Launch Workspace
          </button>
        </form>
      </div>
    </div>
  );
}