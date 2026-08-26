import React, { useState, useRef, useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';

// Import List Nodes and Plugins
import { ListNode, ListItemNode } from '@lexical/list';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';

import { ToolbarPlugin } from './ToolbarPlugin';
import { ForensicsPlugin } from './ForensicsPlugin';
import { PageBreakNode } from './PageBreakNode';
import { AutoPaginationPlugin } from './AutoPaginationPlugin';
import { PageNumbersPlugin } from './PageNumbersPlugin';
import './App.css';
import { supabase } from './supabaseClient';

function onError(error: Error) {
  console.error("Lexical Error:", error);
}

export default function App() {
  // --- LOAD INITIAL STATE FROM LOCAL STORAGE ---
  const loadStoredMeta = () => {
    const saved = localStorage.getItem('vh_writer_meta');
    if (saved) return JSON.parse(saved);
    return null;
  };
  const storedMeta = loadStoredMeta();

  const [activeTab, setActiveTab] = useState('home');
  const [viewState, setViewState] = useState<'editor' | 'forensics' | 'citations'>('editor');
  const [stats, setStats] = useState({ words: 0, keys: 0, score: 0 });
  
  const [docName, setDocName] = useState(storedMeta?.docName || 'Untitled Manuscript');
  const [companyName, setCompanyName] = useState(storedMeta?.companyName || 'Client / Company Name');
  const [authors, setAuthors] = useState<string[]>(storedMeta?.authors || ['Primary Author']);
  
  const [newAuthor, setNewAuthor] = useState('');
  const [pageNumsOn, setPageNumsOn] = useState(true);
  
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerText, setHeaderText] = useState(storedMeta?.headerText || "");
  const [isEditingFooter, setIsEditingFooter] = useState(false);
  const [footerText, setFooterText] = useState(storedMeta?.footerText || "");
  const [isBadgeAdded, setIsBadgeAdded] = useState(false);
  const [badgeTimestamp, setBadgeTimestamp] = useState("");
  const [docId, setDocId] = useState(""); 
  const [writerPhoto, setWriterPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [lastSaved, setLastSaved] = useState<string>("Up to date");

  useEffect(() => {
    const meta = { docName, companyName, authors, headerText, footerText };
    localStorage.setItem('vh_writer_meta', JSON.stringify(meta));
  }, [docName, companyName, authors, headerText, footerText]);

  const savedEditorState = localStorage.getItem('vh_writer_content');

  const initialConfig = {
    namespace: 'VerifyHumanWorkspace',
    nodes: [PageBreakNode, ListNode, ListItemNode],
    editorState: savedEditorState ? savedEditorState : undefined,
    theme: {
      text: {
        bold: 'editor-text-bold',
        italic: 'editor-text-italic',
        underline: 'editor-text-underline',
        superscript: 'editor-text-superscript',
        subscript: 'editor-text-subscript',
      },
      list: {
        ul: 'editor-list-ul',
        ol: 'editor-list-ol',
        listitem: 'editor-listitem',
        nested: {
          listitem: 'editor-nested-listitem',
        },
        olDepth: [
          'editor-list-ol-1',
          'editor-list-ol-2',
          'editor-list-ol-3',
          'editor-list-ol-4',
          'editor-list-ol-5',
        ],
      },
    },
    onError,
  };

  const handleAddAuthor = () => {
    const trimmed = newAuthor.trim();
    if (!trimmed) return;
    if (authors.includes(trimmed)) {
      alert("This author has already been added.");
      return;
    }
    if (authors.length >= 2) {
      alert("Maximum limit of 2 authors allowed.");
      return;
    }
    setAuthors([...authors, trimmed]);
    setNewAuthor('');
  };

  const handleRemoveAuthor = (index: number) => {
    setAuthors(authors.filter((_, i) => i !== index));
  };

  const handleTabSwitch = (tab: string) => {
    setActiveTab(tab);
    setViewState('editor');
  };

  const handleAddBadge = async () => {
    const timestamp = new Date().toISOString(); 
    setBadgeTimestamp(new Date(timestamp).toLocaleString()); 
    setIsBadgeAdded(true);
    
    let currentDocId = docId;
    if (!currentDocId) {
      const uniqueHash = Math.random().toString(36).substring(2, 10).toUpperCase();
      currentDocId = `VH-${new Date().getFullYear()}-${uniqueHash}`;
      setDocId(currentDocId);
    }

    try {
      const { error } = await supabase
        .from('certified_documents')
        .insert([
          {
            doc_ref_id: currentDocId,
            title: docName,
            client_name: companyName,
            authors: authors,
            tier: 'writer', 
            integrity_score: stats.score,
            word_count: stats.words,
            total_keystrokes: stats.keys,
            certified_at: timestamp,
            rhythm_data: { points: rhythmPoints }
          }
        ]);

      if (error) {
        console.error("Supabase Insert Error:", error);
        alert("Database error: Could not secure the document.");
      } else {
        console.log(`Document ${currentDocId} successfully certified and secured!`);
      }
    } catch (error) {
      console.error("Error securing document data:", error);
    }
  };

  const handleRename = () => {
    const newName = prompt("Enter new document name:", docName);
    if (newName && newName.trim()) {
      setDocName(newName.trim());
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setWriterPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const kOffset = Math.min(stats.keys * 1.2, 70);
  const ptY3 = Math.max(30, 130 - kOffset);
  const ptY5 = Math.max(25, 110 - (kOffset * 0.8));
  const ptY7 = Math.max(20, 70 - (kOffset * 0.5));
  const rhythmPoints = `0,140 100,120 200,${ptY3} 300,105 400,${ptY5} 500,85 600,${ptY7} 700,35`;

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <style>{`
        .editor-input ul, 
        .editor-input .editor-list-ul {
          display: block !important;
          list-style-type: disc !important;
          padding-left: 40px !important;
          margin-top: 10px !important;
          margin-bottom: 10px !important;
        }
        .editor-input ol, 
        .editor-input .editor-list-ol {
          display: block !important;
          list-style-type: decimal !important;
          padding-left: 40px !important;
          margin-top: 10px !important;
          margin-bottom: 10px !important;
        }
        .editor-input li, 
        .editor-input .editor-listitem {
          display: list-item !important;
          list-style-position: inside !important;
          color: #000000 !important;
        }
        .editor-input li::marker,
        .editor-input .editor-listitem::marker {
          color: #000000 !important;
          font-weight: bold !important;
        }
        .editor-input ul ul { list-style-type: circle !important; }
        .editor-input ol ol { list-style-type: lower-alpha !important; }
      `}</style>

      {/* Quick Access Top Bar */}
      <div className="quick-access">
        <div style={{ cursor: 'pointer' }} title="Exit Dashboard" onClick={() => window.location.href = 'index.html'}>🏠</div>
        
        <div style={{ background: 'var(--brand-accent)', padding: '2px 12px', borderRadius: '50px', fontWeight: 800, fontSize: '11px', color: 'var(--brand-dark)' }}>
          Human Integrity: <span>{stats.score}%</span>
        </div>
        
        <div className="header-authors-wrapper">
          <input 
            type="text"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="Manuscript Title..."
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              color: '#38bdf8',
              fontWeight: 'bold',
              fontSize: '12px',
              borderRadius: '4px',
              padding: '2px 6px',
              outline: 'none',
              width: '140px'
            }}
            onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
            onBlur={(e) => e.target.style.borderColor = 'transparent'}
            title="Manuscript Title"
          />

          <span style={{ color: '#64748b', fontSize: '12px' }}>|</span>

          <input 
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Company Name..."
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid #475569',
              color: '#f8fafc',
              fontWeight: 'bold',
              fontSize: '12px',
              borderRadius: '4px',
              padding: '2px 6px',
              outline: 'none',
              width: '160px'
            }}
            title="Company Name"
          />

          <span style={{ color: '#64748b', fontSize: '12px' }}>|</span>

          <div className="author-list">
            {authors.map((author, idx) => (
              <div key={idx} className="author-tag">
                👤 {author} 
                <span className="author-remove" onClick={() => handleRemoveAuthor(idx)}>×</span>
              </div>
            ))}
          </div>

          {authors.length < 2 ? (
            <div className="author-input-row">
              <input 
                type="text" 
                className="author-input" 
                placeholder="+ Author name..." 
                value={newAuthor}
                onChange={(e) => setNewAuthor(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAuthor()}
              />
              <button className="author-add-btn" onClick={handleAddAuthor}>Add</button>
            </div>
          ) : (
            <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginLeft: '5px' }}>
              (Max 2 authors reached)
            </span>
          )}

          <button 
            onClick={() => {
              setLastSaved(new Date().toLocaleTimeString());
              alert("Draft successfully saved to local device storage.");
            }}
            style={{
              background: 'none', border: '1px solid #475569', color: '#cbd5e1', fontSize: '10px',
              padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px'
            }}
          >
            💾 Save Draft
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <div className={`tab ${activeTab === 'file' ? 'active' : ''}`} onClick={() => handleTabSwitch('file')}>File</div>
        <div className={`tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabSwitch('home')}>Home</div>
        <div className={`tab ${activeTab === 'layout' ? 'active' : ''}`} onClick={() => handleTabSwitch('layout')}>Layout & Insert</div>
        <div className={`tab ${activeTab === 'references' ? 'active' : ''}`} onClick={() => handleTabSwitch('references')}>References & Tools</div>
      </div>

      {/* Toolbar / Ribbons */}
      <ToolbarPlugin 
        activeTab={activeTab} 
        onOpenHFModal={(type) => {
          if (type === 'header') setIsEditingHeader((prev) => !prev);
          else if (type === 'footer') setIsEditingFooter((prev) => !prev);
        }}
        onTogglePageNums={() => setPageNumsOn(!pageNumsOn)}
        pageNumsOn={pageNumsOn}
        onToggleCitations={() => setViewState(viewState === 'citations' ? 'editor' : 'citations')}
        onToggleForensics={() => setViewState(viewState === 'forensics' ? 'editor' : 'forensics')}
        onRename={handleRename}
        docName={docName}
        setDocName={setDocName}
        authors={authors}
        headerText={headerText}
        footerText={footerText}
        isBadgeAdded={isBadgeAdded}
        badgeTimestamp={badgeTimestamp}
        integrityScore={stats.score}
      />

      {/* Floating Certification Badge Button */}
      {viewState === 'editor' && (
        <div className="badge-trigger">
          <button className="action-btn" onClick={handleAddBadge}>Get Certification Badge</button>
        </div>
      )}

      {/* Main Workspace Container */}
      <div className="workspace">
        
        {viewState === 'forensics' && (
          <div className="custom-view-container" style={{ maxWidth: '850px' }}>
            <button onClick={() => setViewState('editor')} style={{ float: 'right', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 'bold' }}>✖ Close</button>
            <h2 style={{ color: '#0f172a', marginBottom: '5px' }}>Velocity Forensics & Keystroke Tracking</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Live telemetry monitoring organic human composition velocity and rhythm consistency.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '25px' }}>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Keystrokes</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '5px' }}>{stats.keys}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Word Count</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', marginTop: '5px' }}>{stats.words}</div>
              </div>
              <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Integrity Score</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#00b894', marginTop: '5px' }}>{stats.score}%</div>
              </div>
            </div>

            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '12px', color: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>📊 Keystroke Cadence Connected Dot Line Graph</span>
                <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.1)', padding: '4px 10px', borderRadius: '20px', color: '#38bdf8' }}>Real-time Session Active</span>
              </div>
              <svg viewBox="0 0 700 200" style={{ width: '100%', height: '180px', overflow: 'visible' }}>
                <line x1="0" y1="40" x2="700" y2="40" stroke="#334155" strokeDasharray="4 4" />
                <line x1="0" y1="100" x2="700" y2="100" stroke="#334155" strokeDasharray="4 4" />
                <line x1="0" y1="160" x2="700" y2="160" stroke="#334155" strokeDasharray="4 4" />
                <polyline points={rhythmPoints} fill="none" stroke="#00b894" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="0" cy="140" r="4" fill="#38bdf8" />
                <circle cx="100" cy="120" r="4" fill="#38bdf8" />
                <circle cx="200" cy={ptY3} r="5" fill="#38bdf8" />
                <circle cx="300" cy="105" r="4" fill="#38bdf8" />
                <circle cx="400" cy={ptY5} r="5" fill="#38bdf8" />
                <circle cx="500" cy="85" r="4" fill="#38bdf8" />
                <circle cx="600" cy={ptY7} r="5" fill="#38bdf8" />
                <circle cx="700" cy="35" r="6" fill="#00b894" />
              </svg>
            </div>
          </div>
        )}

        {viewState === 'citations' && (
          <div className="custom-view-container" style={{ fontFamily: '"Times New Roman", serif', lineHeight: '1.6' }}>
             <button onClick={() => setViewState('editor')} style={{ float: 'right', cursor: 'pointer', background: 'none', border: 'none' }}>✖ Close</button>
             <h2 style={{ textAlign: 'center' }}>VerifyHuman™ Citation Guides</h2>
             <hr style={{ margin: '15px 0' }}/>
             <h3>MLA Example</h3>
             <p style={{ paddingLeft: '40px', textIndent: '-40px', marginTop: '8px', marginBottom: '16px' }}>
               {authors[0]}, et al. "The Impact of Human-Centric Composition." <i>VerifyHuman Forensic Workspace</i>, Report VH-9921, 2026. Certified Human Integrity: {stats.score}%.
             </p>
             <h3>APA Example</h3>
             <p style={{ paddingLeft: '40px', textIndent: '-40px', marginTop: '8px', marginBottom: '16px' }}>
               {authors[0]} (2026). <i>The impact of human-centric composition</i> (Report No. VH-9921). VerifyHuman Forensic Workspace.
             </p>
          </div>
        )}

        {viewState === 'editor' && (
          <>
            <div 
              className="paper-wrapper document-page"
              onClick={() => {
                if (isEditingHeader) setIsEditingHeader(false);
                if (isEditingFooter) setIsEditingFooter(false);
              }}
            >
              <div className="editor-container" style={{ position: 'relative' }}>
                
                {/* Header Container */}
                <div 
                  className="document-header"
                  style={{ position: 'absolute', top: '0.4in', left: '1in', right: '1in', zIndex: 10 }}
                  onClick={(e) => { e.stopPropagation(); setIsEditingHeader(true); }}
                >
                  {isEditingHeader ? (
                    <input
                      type="text"
                      autoFocus
                      placeholder="Type header here..."
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingHeader(false); }}
                      className="header-input"
                    />
                  ) : (
                    <div className="header-display" style={{ color: '#0f172a', fontWeight: 500 }}>{headerText}</div>
                  )}
                </div>

                <RichTextPlugin
                  contentEditable={
                    <ContentEditable 
                      className="editor-input" 
                      style={{ 
                        outline: 'none',
                        cursor: 'text',
                        color: '#000000'
                      }} 
                    />
                  }
                  placeholder={
                    <div style={{ position: 'absolute', top: '1in', left: '1in', color: '#64748b', pointerEvents: 'none', fontSize: '14px' }}>
                      Start composing text or narrative content loops...
                    </div>
                  }
                  ErrorBoundary={LexicalErrorBoundary}
                />

                {/* Certification Badge Positioned Above Footer */}
                {isBadgeAdded && (
                  <div style={{
                    position: 'absolute',
                    bottom: '1.15in',
                    left: '1in',
                    right: '1in',
                    zIndex: 15,
                    padding: '10px 14px',
                    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                    border: '1.5px solid #10b981',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
                    fontFamily: 'system-ui, sans-serif'
                  }}>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handlePhotoUpload} 
                      accept="image/*" 
                      style={{ display: 'none' }} 
                    />

                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      title="Click to upload writer photo"
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: writerPhoto ? `url(${writerPhoto}) center/cover no-repeat` : '#d1fae5',
                        border: '2px dashed #10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: '#065f46',
                        textAlign: 'center',
                        cursor: 'pointer',
                        flexShrink: 0,
                        overflow: 'hidden',
                        boxShadow: '0 2px 3px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      {!writerPhoto && <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '2px' }}>📷 Photo</span>}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '11px', color: '#065f46', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                          {companyName || 'Company Name'}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 700, background: '#d1fae5', color: '#047857', padding: '2px 6px', borderRadius: '10px' }}>
                          Integrity: {stats.score}%
                        </span>
                      </div>
                      
                      <hr style={{ border: 'none', borderTop: '1px solid #10b981', opacity: 0.3, margin: '4px 0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '10px', color: '#047857', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                          Official Certification Seal
                        </span>
                      </div>

                      <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>
                        Verified human composition. Author: <strong>{authors.join(', ')}</strong> | Certified On: {badgeTimestamp}
                      </div>

                      <div style={{ 
                        display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', 
                        background: 'rgba(16, 185, 129, 0.1)', padding: '6px 10px', borderRadius: '6px', 
                        border: '1px dashed rgba(16, 185, 129, 0.3)', color: '#064e3b'
                      }}>
                        <span><strong>ID:</strong> {docId}</span>
                        <span><strong>Verify at:</strong> provenantforensics.com/verify</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer Container */}
                <div 
                  className="document-footer"
                  style={{ position: 'absolute', bottom: '0.4in', left: '1in', right: '1in', zIndex: 10 }}
                  onClick={(e) => { e.stopPropagation(); setIsEditingFooter(true); }}
                >
                  {isEditingFooter ? (
                    <input
                      type="text"
                      autoFocus
                      placeholder="Type footer here..."
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setIsEditingFooter(false); }}
                      className="footer-input"
                    />
                  ) : (
                    <div className="footer-display" style={{ color: '#0f172a', fontWeight: 500 }}>{footerText}</div>
                  )}
                </div>

                <PageNumbersPlugin show={pageNumsOn} />

              </div>
            </div>
            
            {/* Auto-save Plugin tracking changes */}
            <OnChangePlugin onChange={(editorState) => {
              const editorStateJSON = editorState.toJSON();
              localStorage.setItem('vh_writer_content', JSON.stringify(editorStateJSON));
              setLastSaved(new Date().toLocaleTimeString());
            }} />

            <HistoryPlugin delay={0} />
            <ListPlugin />
            <ForensicsPlugin onUpdateStats={setStats} />
            <AutoPaginationPlugin />
          </>
        )}
      </div>

      <div className="status-bar">
        <div>Words: <span>{stats.words}</span> | Keystrokes: <span>{stats.keys}</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ height: '8px', width: '8px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }}></span>
          Auto-saved locally at {lastSaved}
        </div>
      </div>
    </LexicalComposer>
  );
}