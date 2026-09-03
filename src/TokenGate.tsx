import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase using your environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function TokenGate({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Keep authorized if they already have a saved session token on this device
    const savedToken = localStorage.getItem('workspace_token');
    if (savedToken) {
      setIsAuthorized(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanInput = tokenInput.trim();
    if (!cleanInput) {
      setError('Please enter a valid token.');
      setLoading(false);
      return;
    }

    try {
      // 1. Check if the token exists in Supabase
      const { data, error: fetchError } = await supabase
        .from('license_keys')
        .select('*')
        .eq('token', cleanInput)
        .single();

      if (fetchError || !data) {
        setError('Invalid License Token. Please check and try again.');
        setLoading(false);
        return;
      }

      // 2. Enforce tier seat limits
      if (data.current_seats_used >= data.max_seats) {
        setError(`Access denied: The ${data.tier_name} is full (${data.current_seats_used}/${data.max_seats} seats used).`);
        setLoading(false);
        return;
      }

      // 3. Increment the used seat count by 1 in the database
      const { error: updateError } = await supabase
        .from('license_keys')
        .update({ current_seats_used: data.current_seats_used + 1 })
        .eq('id', data.id);

      if (updateError) {
        setError('Error registering seat. Please try again.');
        setLoading(false);
        return;
      }

      // 4. Save session and unlock the workspace
      localStorage.setItem('workspace_token', cleanInput);
      setIsAuthorized(true);
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthorized) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)', textAlign: 'center', maxWidth: '400px' }}>
        <h2 style={{ marginTop: 0 }}>Workspace Access</h2>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Enter your Editorial or Writers tier license token.</p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input 
            type="text" 
            value={tokenInput} 
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Enter License Token"
            disabled={loading}
            style={{ padding: '12px', borderRadius: '4px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', fontSize: '16px' }}
          />
          {error && <span style={{ color: '#ef4444', fontSize: '14px' }}>{error}</span>}
          <button type="submit" disabled={loading} style={{ padding: '12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' }}>
            {loading ? 'Checking Seats...' : 'Launch Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}