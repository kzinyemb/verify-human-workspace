import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';

interface DocumentAudit {
  doc_ref_id: string;
  title: string;
  client_name: string;
  authors: string[] | string;
  integrity_score: number;
  word_count: number;
  total_keystrokes: number;
  certified_at: string;
  tier: string;
  rhythm_data?: {
    points: string;
  };
}

export default function Verify() {
  const [searchId, setSearchId] = useState('');
  const [auditData, setAuditData] = useState<DocumentAudit | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reusable search logic
  const executeSearch = useCallback(async (refId: string) => {
    if (!refId.trim()) return;

    setLoading(true);
    setError('');
    setAuditData(null);

    const formattedId = refId.trim().toUpperCase();

    try {
      const { data, error: dbError } = await supabase
        .from('certified_documents')
        .select('*')
        .eq('doc_ref_id', formattedId)
        .single();

      if (dbError || !data) {
        setError('No certified document found matching this Reference ID. The document may be uncertified or altered.');
      } else {
        setAuditData(data as DocumentAudit);
      }
    } catch (err) {
      setError('An unexpected error occurred while querying the forensic ledger.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. Auto-search if ?id= or ?ref= is present in the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlId = params.get('id') || params.get('ref');
    if (urlId) {
      setSearchId(urlId);
      executeSearch(urlId);
    }
  }, [executeSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(searchId);
  };

  // Helper to format authors cleanly
  const renderAuthors = (authors: string[] | string | undefined) => {
    if (Array.isArray(authors)) return authors.join(', ');
    if (typeof authors === 'string' && authors.trim()) return authors;
    return 'Primary Author';
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '40px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', maxWidth: '600px', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8', marginBottom: '10px' }}>
          provenantforensics™
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '15px' }}>
          Official Human Composition Ledger & Verification Portal
        </p>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSearch} style={{
        display: 'flex',
        gap: '10px',
        width: '100%',
        maxWidth: '520px',
        marginBottom: '30px'
      }}>
        <input
          type="text"
          placeholder="Enter Reference ID (e.g., VH-2026-X89B)"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          style={{
            flex: 1,
            padding: '14px 18px',
            borderRadius: '8px',
            border: '1px solid #334155',
            backgroundColor: '#1e293b',
            color: '#ffffff',
            fontSize: '15px',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '14px 24px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            fontWeight: 700,
            border: 'none',
            borderRadius: '8px',
            cursor: loading ? 'wait' : 'pointer',
            fontSize: '15px'
          }}
        >
          {loading ? 'Auditing...' : 'Verify'}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <div style={{
          maxWidth: '520px',
          width: '100%',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid #ef4444',
          color: '#fca5a5',
          padding: '14px 18px',
          borderRadius: '8px',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Verified Audit Report Result */}
      {auditData && (
        <div style={{
          maxWidth: '680px',
          width: '100%',
          backgroundColor: '#1e293b',
          border: '1px solid #10b981',
          borderRadius: '12px',
          padding: '28px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
        }}>
          {/* Status Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '20px',
            borderBottom: '1px solid #334155',
            marginBottom: '20px'
          }}>
            <div>
              <span style={{
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                ✓ Verified Human Authored
              </span>
              <h2 style={{ fontSize: '1.4rem', marginTop: '10px', color: '#ffffff' }}>
                {auditData.title || 'Untitled Document'}
              </h2>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981' }}>
                {auditData.integrity_score ?? 100}%
              </div>
              <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>
                Human Integrity
              </div>
            </div>
          </div>

          {/* Details Grid (Responsive) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
            fontSize: '14px'
          }}>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>Reference ID</span>
              <strong>{auditData.doc_ref_id}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>Client / Company</span>
              <strong>{auditData.client_name || 'N/A'}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>Author(s)</span>
              <strong>{renderAuthors(auditData.authors)}</strong>
            </div>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>Certification Date</span>
              <strong>
                {auditData.certified_at ? new Date(auditData.certified_at).toLocaleString() : 'N/A'}
              </strong>
            </div>
          </div>

          {/* Forensic Telemetry Card */}
          <div style={{
            backgroundColor: '#0f172a',
            padding: '18px',
            borderRadius: '8px',
            border: '1px solid #334155'
          }}>
            <h4 style={{ color: '#38bdf8', marginTop: 0, marginBottom: '12px', fontSize: '13px', textTransform: 'uppercase' }}>
              📊 Forensics & Telemetry Summary
            </h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>Total Keystrokes</span>
                <strong style={{ fontSize: '1.1rem' }}>{auditData.total_keystrokes?.toLocaleString() ?? 0}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>Word Count</span>
                <strong style={{ fontSize: '1.1rem' }}>{auditData.word_count?.toLocaleString() ?? 0}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8', fontSize: '12px', display: 'block' }}>Tier</span>
                <strong style={{ fontSize: '1.1rem', textTransform: 'capitalize' }}>
                  {auditData.tier || 'Standard'} Tier
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}