import React, { useState, useRef, useEffect } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection,$createTextNode } from 'lexical';

// Import Clerk Authentication & Team Components
import { OrganizationSwitcher, UserButton, useAuth, useOrganization } from '@clerk/clerk-react';

// Import List Nodes and Plugins
import { ListNode, ListItemNode } from '@lexical/list';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';

import { ToolbarPlugin } from './ToolbarPlugin';
import { ForensicsPlugin } from './ForensicsPlugin';
import { PageBreakNode } from './PageBreakNode';
import AutoPaginationPlugin from './AutoPaginationPlugin';
import { PageNumbersPlugin } from './PageNumbersPlugin';
import './App.css';
import { supabase } from './supabaseClient';

function onError(error: Error) {
  console.error("Lexical Error:", error);
}

// Helper component to safely insert text at the active cursor position in Lexical
function InsertHelper({ textToInsert, onInserted }: { textToInsert: string | null; onInserted: () => void }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (textToInsert) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertNodes([$createTextNode(textToInsert)]);
        }
      });
      onInserted();
    }
  }, [textToInsert, editor, onInserted]);
  return null;
}

export default function EditorialApp() {
  // --- CLERK AUTHENTICATION CONTEXT ---
  const { userId } = useAuth();
  const { organization } = useOrganization();
  const activeOrgId = organization?.id || 'personal_workspace';

  // --- MULTI-DOCUMENT MANAGEMENT STATE ---
  const [currentDocId, setCurrentDocId] = useState<string>(() => {
    return localStorage.getItem('vh_active_doc_id') || ('doc_' + Date.now());
  });

  const [documentList, setDocumentList] = useState<{ id: string; title: string }[]>([]);

  // Fetch Team Documents from Supabase on Load / Org Switch
  useEffect(() => {
    const fetchTeamDocuments = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from('workspace_documents')
        .select('id, title')
        .eq('org_id', activeOrgId)
        .order('updated_at', { ascending: false });

      if (data && data.length > 0) {
        setDocumentList(data);
        if (!data.find(d => d.id === currentDocId)) {
          setCurrentDocId(data[0].id);
        }
      } else {
        const defaultId = 'doc_' + Date.now();
        setDocumentList([{ id: defaultId, title: 'New Team Document' }]);
        setCurrentDocId(defaultId);
      }
    };
    fetchTeamDocuments();
  }, [activeOrgId, userId]);

  const loadStoredMeta = (id: string) => {
    const saved = localStorage.getItem(`vh_meta_${id}`);
    if (saved) return JSON.parse(saved);
    return { docName: 'Untitled Document', orgName: organization?.name || 'Organization/University', authors: ['Enterprise Lead'], headerText: '', footerText: '', docStatus: 'Draft', sources: [] };
  };

  const storedMeta = loadStoredMeta(currentDocId);

  const [activeTab, setActiveTab] = useState('home');
  const [viewState, setViewState] = useState<'editor' | 'forensics' | 'citations'>('editor');
  const [stats, setStats] = useState({ words: 0, keys: 0, score: 0 });
  
  const [docName, setDocName] = useState(storedMeta.docName);
  const [orgName, setOrgName] = useState(storedMeta.orgName);
  const [authors, setAuthors] = useState<string[]>(storedMeta.authors);
  
  const [newAuthor, setNewAuthor] = useState('');
  const [pageNumsOn, setPageNumsOn] = useState(true);
  
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerText, setHeaderText] = useState(storedMeta.headerText);
  const [isEditingFooter, setIsEditingFooter] = useState(false);
  const [footerText, setFooterText] = useState(storedMeta.footerText);
  const [isBadgeAdded, setIsBadgeAdded] = useState(false);
  const [badgeTimestamp, setBadgeTimestamp] = useState("");
  const [docId, setDocId] = useState(""); 
  const [writerPhoto, setWriterPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [docStatus, setDocStatus] = useState(storedMeta.docStatus);
  const [sources, setSources] = useState<string[]>(storedMeta.sources);
  const [newSource, setNewSource] = useState(''); // <-- FIXED: Added this line back
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotesMode, setIsNotesMode] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("Unsaved Changes");

  // --- CREATORS SANDBOX INTEGRATION STATE ---
  const [bpm, setBpm] = useState<number>(120);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceClips, setVoiceClips] = useState<{ id: number; title: string; url: string; text: string }[]>(() => {
    const saved = localStorage.getItem('hv_voice_clips');
    if (saved) {
      try { return JSON.parse(saved).map((c: any) => ({ ...c, url: c.url || '' })); } catch(e) { return []; }
    }
    return [];
  });
  const [pendingTextInsert, setPendingTextInsert] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptionBufferRef = useRef<string>("");

  // Update local cache for immediate rendering speed
  useEffect(() => {
    const meta = { docName, orgName, authors, headerText, footerText, docStatus, sources };
    localStorage.setItem(`vh_meta_${currentDocId}`, JSON.stringify(meta));
  }, [docName, orgName, authors, headerText, footerText, docStatus, sources, currentDocId]);

  // --- DATABASE SYNC LOGIC ---
  const handleSaveToDatabase = async () => {
    if (!userId) return;
    setLastSaved("Syncing to Cloud...");
    
    const currentContent = localStorage.getItem(`vh_content_${currentDocId}`);
    const meta = { docName, orgName, authors, headerText, footerText, docStatus, sources };
    
    const { error } = await supabase
      .from('workspace_documents')
      .upsert({ 
        id: currentDocId,
        org_id: activeOrgId,
        owner_id: userId,
        title: docName,
        content: currentContent ? JSON.parse(currentContent) : {},
        metadata: meta,
        status: docStatus,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error("Database sync failed:", error);
      alert("Database sync failed. Check connection.");
      setLastSaved("Sync Failed");
    } else {
      setLastSaved(new Date().toLocaleTimeString());
      
      // Update Library Title Visually
      setDocumentList(prev => {
        const exists = prev.find(d => d.id === currentDocId);
        if (exists) return prev.map(d => d.id === currentDocId ? { ...d, title: docName } : d);
        return [{ id: currentDocId, title: docName }, ...prev];
      });
    }
  };

  const handleSwitchDocument = async (newId: string) => {
    setCurrentDocId(newId);
    localStorage.setItem('vh_active_doc_id', newId);
    
    // Pull full content from Supabase
    const { data } = await supabase.from('workspace_documents').select('*').eq('id', newId).single();
    
    if (data) {
      if (data.content) localStorage.setItem(`vh_content_${newId}`, JSON.stringify(data.content));
      if (data.metadata) {
        localStorage.setItem(`vh_meta_${newId}`, JSON.stringify(data.metadata));
        setDocName(data.metadata.docName || data.title);
        setOrgName(data.metadata.orgName);
        setAuthors(data.metadata.authors || []);
        setHeaderText(data.metadata.headerText || '');
        setFooterText(data.metadata.footerText || '');
        setDocStatus(data.metadata.docStatus || 'Draft');
        setSources(data.metadata.sources || []);
      }
    }
    window.location.reload();
  };

  const handleNewDocument = () => {
    const newId = 'doc_' + Date.now();
    const newTitle = prompt("Enter new paper title:", "Research Paper");
    if (!newTitle || !newTitle.trim()) return;

    setDocumentList([{ id: newId, title: newTitle.trim() }, ...documentList]);
    const initialNewMeta = { docName: newTitle.trim(), orgName: organization?.name || 'Organization/University', authors: ['Enterprise Lead'], headerText: '', footerText: '', docStatus: 'Draft', sources: [] };
    
    localStorage.setItem(`vh_meta_${newId}`, JSON.stringify(initialNewMeta));
    localStorage.setItem(`vh_content_${newId}`, '');
    
    setCurrentDocId(newId);
    localStorage.setItem('vh_active_doc_id', newId);
    window.location.reload();
  };

  const handleDeleteDocument = async (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to permanently delete this paper from the team database?")) {
      const { error } = await supabase.from('workspace_documents').delete().eq('id', idToDelete);
      
      if (!error) {
        const updatedList = documentList.filter(d => d.id !== idToDelete);
        setDocumentList(updatedList);
        localStorage.removeItem(`vh_meta_${idToDelete}`);
        localStorage.removeItem(`vh_content_${idToDelete}`);

        if (idToDelete === currentDocId && updatedList.length > 0) {
          handleSwitchDocument(updatedList[0].id);
        } else if (updatedList.length === 0) {
          handleNewDocument();
        }
      }
    }
  };

  const handleLibraryRename = (idToRename: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const doc = documentList.find(d => d.id === idToRename);
    const newTitle = prompt("Enter new title for paper:", doc?.title || "Research Paper");
    if (newTitle && newTitle.trim()) {
      setDocumentList(documentList.map(d => d.id === idToRename ? { ...d, title: newTitle.trim() } : d));
      if (idToRename === currentDocId) setDocName(newTitle.trim());
    }
  };

  const savedEditorState = localStorage.getItem(`vh_content_${currentDocId}`);

  const initialConfig = {
    namespace: 'EditorialEnterpriseWorkspace',
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
    if (authors.includes(trimmed)) return alert("This author has already been added.");
    if (authors.length >= 2) return alert("Maximum limit of 2 authors allowed.");
    setAuthors([...authors, trimmed]);
    setNewAuthor('');
  };

  const handleRemoveAuthor = (index: number) => {
    setAuthors(authors.filter((_, i) => i !== index));
  };

  const handleTabSwitch = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'editorial') setViewState('editor');
  };

  const handleToggleBadge = async () => {
    if (isBadgeAdded) {
      setIsBadgeAdded(false);
      return;
    }

    const timestamp = new Date().toISOString(); 
    setBadgeTimestamp(new Date(timestamp).toLocaleString()); 
    setIsBadgeAdded(true);
    
    let currentDocRefId = docId;
    if (!currentDocRefId) {
      const uniqueHash = Math.random().toString(36).substring(2, 10).toUpperCase();
      currentDocRefId = `VH-${new Date().getFullYear()}-${uniqueHash}`;
      setDocId(currentDocRefId);
    }

    try {
      const { error } = await supabase
        .from('certified_documents')
        .insert([{
            doc_ref_id: currentDocRefId,
            title: docName,
            client_name: orgName,
            authors: authors,
            tier: 'editorial', 
            integrity_score: stats.score,
            word_count: stats.words,
            total_keystrokes: stats.keys,
            certified_at: timestamp,
            rhythm_data: { points: rhythmPoints, bpm: bpm },
            status: docStatus,
            sources: sources
        }]);

      if (error) console.error("Supabase Insert Error:", error);
    } catch (error) {
      console.error("Error securing document data:", error);
    }
  };

  const handleRename = () => {
    const newName = prompt("Enter new document name:", docName);
    if (newName && newName.trim()) setDocName(newName.trim());
  };

  const handleAddSource = () => {
    if (newSource.trim()) {
      setSources([...sources, newSource.trim()]);
      setNewSource('');
    }
  };

  const handleRemoveSource = (index: number) => {
    setSources(sources.filter((_, i) => i !== index));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setWriterPhoto(objectUrl);
    }
  };

  // --- TAP TEMPO LOGIC ---
  const handleTapTempo = () => {
    const now = Date.now();
    const updatedTaps = [...tapTimes, now];
    if (updatedTaps.length > 4) updatedTaps.shift();
    setTapTimes(updatedTaps);
    if (updatedTaps.length > 1) {
      let intervals = [];
      for (let i = 1; i < updatedTaps.length; i++) intervals.push(updatedTaps[i] - updatedTaps[i-1]);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const calculatedBpm = Math.round(60000 / avgInterval);
      if (calculatedBpm >= 40 && calculatedBpm <= 240) setBpm(calculatedBpm);
    }
  };

  // --- VOICE SCRATCHPAD RECORDING LOGIC ---
  const toggleRecordingSession = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        transcriptionBufferRef.current = "";

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const transcriptText = transcriptionBufferRef.current.trim() || "New dictation captured. Refine transcript text or notes here...";
          
          const newClip = {
            id: Date.now(),
            title: `Recorded Clip - ${new Date().toLocaleTimeString()}`,
            url: audioUrl,
            text: transcriptText
          };

          const updatedClips = [newClip, ...voiceClips];
          setVoiceClips(updatedClips);
          localStorage.setItem('hv_voice_clips', JSON.stringify(updatedClips));
        };

        mediaRecorder.start();
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition();
          recognition.continuous = true;
          recognition.interimResults = false;
          recognition.lang = 'en-US';
          recognition.onresult = (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) transcriptionBufferRef.current += event.results[i][0].transcript + ' ';
            }
          };
          recognition.start();
        }
        setIsRecording(true);
      } catch (err) {
        alert("Microphone connection denied or hardware handshake blocked.");
      }
    } else {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const audioUrl = URL.createObjectURL(file);
    const newClip = {
      id: Date.now(),
      title: file.name,
      url: audioUrl,
      text: "Imported audio note. Input custom transcription or feedback loop here..."
    };
    const updatedClips = [newClip, ...voiceClips];
    setVoiceClips(updatedClips);
    localStorage.setItem('hv_voice_clips', JSON.stringify(updatedClips));
    e.target.value = '';
  };

  const deleteVoiceClip = (id: number) => {
    const updated = voiceClips.filter(c => c.id !== id);
    setVoiceClips(updated);
    localStorage.setItem('hv_voice_clips', JSON.stringify(updated));
  };

  const updateVoiceClipText = (id: number, text: string) => {
    const updated = voiceClips.map(c => c.id === id ? { ...c, text } : c);
    setVoiceClips(updated);
    localStorage.setItem('hv_voice_clips', JSON.stringify(updated));
  };

  const saveRecordedClipLocalFile = (clipId: number) => {
    const target = voiceClips.find(c => c.id === clipId);
    if (!target || !target.url) return;
    const downloadLink = document.createElement('a');
    downloadLink.href = target.url;
    downloadLink.download = target.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + ".webm";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const generateProvenanceQR = (clipId: number) => {
    const target = voiceClips.find(c => c.id === clipId);
    if (!target) return;
    const manifest = JSON.stringify({ clipId: target.id, title: target.title, verification: "verified", layer: "Sonic Provenance" });
    const qrText = encodeURIComponent(manifest);
    window.open(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrText}`, '_blank');
  };

  const kOffset = Math.min(stats.keys * 1.2, 70);
  const ptY3 = Math.max(30, 130 - kOffset);
  const ptY5 = Math.max(25, 110 - (kOffset * 0.8));
  const ptY7 = Math.max(20, 70 - (kOffset * 0.5));
  const rhythmPoints = `0,140 100,120 200,${ptY3} 300,105 400,${ptY5} 500,85 600,${ptY7} 700,35`;

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <InsertHelper textToInsert={pendingTextInsert} onInserted={() => setPendingTextInsert(null)} />
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

        /* Scratchpad Sidebar Styles */
        .scratchpad-sidebar {
          width: 360px;
          min-width: 360px;
          background: #1e293b;
          border-left: 1.5px solid rgba(255, 255, 255, 0.1);
          color: #f1f5f9;
          display: flex;
          flex-direction: column;
          height: 100%;
          transition: margin-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          z-index: 80;
        }
        .scratchpad-sidebar.closed { margin-right: -360px; }
        .scratchpad-toggle-handle {
          position: absolute; left: -40px; top: 50%; transform: translateY(-50%); width: 40px; height: 80px;
          background: #1e293b; border: 1px solid rgba(255, 255, 255, 0.1); border-right: none;
          border-radius: 12px 0 0 12px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: #f1f5f9; box-shadow: -4px 0 15px rgba(0,0,0,0.15); z-index: 100;
        }
        .scratchpad-toggle-handle:hover { color: #38bdf8; }
      `}</style>

      {/* Quick Access Top Bar */}
      <div className="quick-access" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '10px 20px', width: '100%', background: '#0f172a', borderBottom: '1px solid #1e293b' }}>
        
        {/* Clerk Organizations & Home Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ cursor: 'pointer', fontSize: '18px' }} title="Exit Dashboard" onClick={() => window.location.href = 'index.html'}>🏠</div>
          
          <div style={{ background: '#1e293b', borderRadius: '6px', padding: '2px 8px', border: '1px solid #475569' }}>
            <OrganizationSwitcher 
              hidePersonal={false}
              afterCreateOrganizationUrl="/Editorial-writingpad.html"
              afterLeaveOrganizationUrl="/Editorial-writingpad.html"
              afterSelectOrganizationUrl="/Editorial-writingpad.html"
              appearance={{
                elements: {
                  organizationSwitcherTrigger: { color: '#f8fafc' },
                  organizationSwitcherTriggerIcon: { color: '#38bdf8' }
                }
              }}
            />
          </div>
        </div>
        
        {/* Document Switcher & New Paper controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <select 
            value={currentDocId} 
            onChange={(e) => handleSwitchDocument(e.target.value)}
            style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #475569', padding: '3px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', outline: 'none', maxWidth: '130px' }}
            title="Switch Active Paper"
          >
            {documentList.map((doc) => (
              <option key={doc.id} value={doc.id}>📄 {doc.title}</option>
            ))}
          </select>
          <button 
            onClick={handleNewDocument}
            style={{ background: 'var(--brand-accent)', color: 'var(--brand-dark)', border: 'none', padding: '3px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '800', cursor: 'pointer' }}
            title="Create New Paper"
          >
            + New
          </button>
          <button 
            onClick={() => setIsLibraryOpen(true)}
            style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800', cursor: 'pointer' }}
            title="Manage All Papers"
          >
            📂 Library
          </button>
        </div>

        <div style={{ background: 'var(--brand-accent)', padding: '2px 10px', borderRadius: '50px', fontWeight: 800, fontSize: '11px', color: 'var(--brand-dark)' }}>
          Enterprise Integrity: <span>{stats.score}%</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8' }}>Status:</span>
          <select 
            value={docStatus} 
            onChange={(e) => setDocStatus(e.target.value)} 
            style={{ background: '#1e293b', color: '#fff', border: '1px solid #475569', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', outline: 'none' }}
          >
            <option value="Draft">📝 Draft</option>
            <option value="In Review">👀 In Review</option>
            <option value="Fact-Checked">🔍 Fact-Checked</option>
            <option value="Approved">✅ Approved for Publishing</option>
          </select>
        </div>
        
        <div className="header-authors-wrapper">
          <input 
            type="text"
            value={docName}
            onChange={(e) => setDocName(e.target.value)}
            placeholder="Title..."
            style={{
              background: 'transparent', border: '1px solid transparent', color: '#38bdf8', fontWeight: 'bold',
              fontSize: '12px', borderRadius: '4px', padding: '2px 6px', outline: 'none', width: '120px'
            }}
            onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
            onBlur={(e) => e.target.style.borderColor = 'transparent'}
            title="Title"
          />

          <span style={{ color: '#64748b', fontSize: '12px' }}>|</span>

          <input 
            type="text"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Organization/University..."
            style={{
              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid #475569', color: '#f8fafc',
              fontWeight: 'bold', fontSize: '12px', borderRadius: '4px', padding: '2px 6px', outline: 'none', width: '150px'
            }}
            title="Organization or University Name"
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
            <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginLeft: '5px' }}>(Max 2)</span>
          )}

          <button 
            onClick={handleSaveToDatabase}
            style={{
              background: '#00b894', border: 'none', color: '#0f172a', fontWeight: 'bold', fontSize: '10px',
              padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', marginLeft: '10px', boxShadow: '0 2px 4px rgba(0,184,148,0.3)'
            }}
          >
            💾 Save to Team Cloud
          </button>
        </div>

        {/* Clerk User Button */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <UserButton afterSignOutUrl="https://provenantforensics.com" />
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${activeTab === 'file' ? 'active' : ''}`} onClick={() => handleTabSwitch('file')}>File</div>
        <div className={`tab ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabSwitch('home')}>Home</div>
        <div className={`tab ${activeTab === 'media' ? 'active' : ''}`} onClick={() => handleTabSwitch('media')}>Media & Scene</div>
        <div className={`tab ${activeTab === 'layout' ? 'active' : ''}`} onClick={() => handleTabSwitch('layout')}>Layout & Insert</div>
        <div className={`tab ${activeTab === 'references' ? 'active' : ''}`} onClick={() => handleTabSwitch('references')}>References & Tools</div>
        <div className={`tab ${activeTab === 'editorial' ? 'active' : ''}`} onClick={() => handleTabSwitch('editorial')} style={{ background: '#3b82f6', color: 'white' }}>Editorial Review</div>
      </div>

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

      {/* --- MEDIA & SCENE RIBBON TAB --- */}
      {activeTab === 'media' && (
        <div className="ribbon-content active">
          <div className="group">
            <div className="btn-row">
              <button type="button" className="btn-ribbon btn-big" onClick={() => setPendingTextInsert('\n🎬 EXT. / INT. [LOCATION] - DAY/NIGHT\n')}><span>🎬</span>Slugline</button>
              <button type="button" className="btn-ribbon btn-big" onClick={() => setPendingTextInsert('\nCHARACTER NAME\n')}><span>👤</span>Character</button>
              <button type="button" className="btn-ribbon btn-big" onClick={() => setPendingTextInsert('\n(parenthetical note)\n')}><span>💬</span>Action/Parenthetical</button>
            </div>
            <div className="group-label">Screenwriting Breakdowns</div>
          </div>
          <div className="group">
            <div className="btn-row">
              <button type="button" className="btn-ribbon btn-big" onClick={() => setPendingTextInsert('\n[Verse 1]\n')}><span>🎵</span>Verse</button>
              <button type="button" className="btn-ribbon btn-big" onClick={() => setPendingTextInsert('\n[Chorus]\n')}><span>🎤</span>Chorus</button>
              <button type="button" className="btn-ribbon btn-big" onClick={() => setPendingTextInsert('\n[Bridge]\n')}><span>🎸</span>Bridge</button>
            </div>
            <div className="group-label">Song Structure Tags</div>
          </div>
          <div className="group">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                <input type="number" value={bpm} onChange={(e) => setBpm(Number(e.target.value))} min="40" max="240" style={{ width: '55px', textAlign: 'center', fontWeight: 'bold' }} />
                <span style={{ fontSize: '11px', fontWeight: 'bold' }}>BPM</span>
              </div>
              <button type="button" className="action-btn" style={{ padding: '4px 10px', fontSize: '10px' }} onClick={handleTapTempo}>Tap Tempo</button>
            </div>
            <div className="group-label">Tempo & Rhythm Tracker</div>
          </div>
        </div>
      )}

      {activeTab === 'editorial' && (
        <div className="ribbon-content active">
          <div className="group">
            <div className="btn-row">
              <button type="button" className="btn-ribbon btn-big" onClick={() => setIsSidebarOpen(!isSidebarOpen)}><span>📖</span>Research Notes</button>
              <button type="button" className="btn-ribbon btn-big" onClick={() => setIsNotesMode(!isNotesMode)} style={{ color: isNotesMode ? '#00b894' : 'inherit' }}>
                <span>💬</span>Editor Notes: {isNotesMode ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="group-label">Enterprise Collaboration</div>
          </div>
        </div>
      )}

      {viewState === 'editor' && (
        <div className="badge-trigger" id="floating-badge-trigger" style={{ right: isScratchpadOpen ? '410px' : '40px' }}>
          <button 
            className="action-btn" 
            onClick={handleToggleBadge}
            style={{ 
              background: isBadgeAdded ? '#ef4444' : undefined, 
              borderColor: isBadgeAdded ? '#dc2626' : undefined,
              padding: '10px 20px', fontSize: '11px'
            }}
          >
            {isBadgeAdded ? 'Remove Certification Badge' : 'Get Certification Badge'}
          </button>
        </div>
      )}

      <div className="app-split-container" style={{ display: 'flex', flexGrow: 1, overflow: 'hidden', width: '100%', position: 'relative' }}>
        <div className="workspace" style={{ flexGrow: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
          
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
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>📊 Keystroke Cadence Connected Dot Line Graph (Tempo: {bpm} BPM)</span>
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
                 {authors[0]}, et al. "The Impact of Enterprise Composition." <i>VerifyHuman Forensic Workspace</i>, Report VH-9921, 2026. Certified Human Integrity: {stats.score}%.
               </p>
               <h3>APA Example</h3>
               <p style={{ paddingLeft: '40px', textIndent: '-40px', marginTop: '8px', marginBottom: '16px' }}>
                 {authors[0]} (2026). <i>The impact of enterprise composition</i> (Report No. VH-9921). VerifyHuman Forensic Workspace.
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
                      <div className="header-display" style={{ color: '#0f172a', fontWeight: 500, minHeight: '20px' }}>
                        {headerText || '\u00A0'}
                      </div>
                    )}
                  </div>

                  <RichTextPlugin
                    contentEditable={
                      <ContentEditable 
                        className="editor-input" 
                        style={{ 
                          minHeight: '800px', 
                          height: '100%',
                          outline: 'none',
                          cursor: 'text',
                          paddingTop: '1.3in',     
                          paddingBottom: '1.6in',
                          color: isNotesMode ? '#065f46' : '#000000',
                          backgroundColor: isNotesMode ? '#f0fdf4' : 'transparent'
                        }} 
                      />
                    }
                    placeholder={
                      <div style={{ position: 'absolute', top: '1.3in', left: '1in', color: '#64748b', pointerEvents: 'none', fontSize: '14px' }}>
                        Draft enterprise text and multi-author review content...
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
                      <button 
                        onClick={() => setIsBadgeAdded(false)}
                        title="Remove badge from page"
                        style={{ position: 'absolute', top: '6px', right: '8px', background: 'none', border: 'none', color: '#065f46', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        ✕
                      </button>

                      <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />

                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        title="Click to upload writer photo"
                        style={{
                          width: '42px', height: '42px', borderRadius: '50%',
                          background: writerPhoto ? `url(${writerPhoto}) center/cover no-repeat` : '#d1fae5',
                          border: '2px dashed #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', color: '#065f46', textAlign: 'center', cursor: 'pointer',
                          flexShrink: 0, overflow: 'hidden', boxShadow: '0 2px 3px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        {!writerPhoto && <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '2px' }}>📷 Photo</span>}
                      </div>

                      <div style={{ flex: 1, paddingRight: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 800, fontSize: '11px', color: '#065f46', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                            {orgName || 'Organization/University'}
                          </span>
                          <span style={{ fontSize: '10px', fontWeight: 700, background: '#d1fae5', color: '#047857', padding: '2px 6px', borderRadius: '10px' }}>
                            Integrity: {stats.score}%
                          </span>
                        </div>
                        
                        <hr style={{ border: 'none', borderTop: '1px solid #10b981', opacity: 0.3, margin: '4px 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '10px', color: '#047857', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                            Official Certification Seal (Tempo: {bpm} BPM)
                          </span>
                        </div>

                        <div style={{ fontSize: '11px', color: '#047857', marginTop: '2px' }}>
                          Verified human composition. Author: <strong>{authors.join(', ')}</strong> | Status: {docStatus} | Certified On: {badgeTimestamp}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 10px', borderRadius: '6px', border: '1px dashed rgba(16, 185, 129, 0.3)', color: '#064e3b' }}>
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
                        className="header-input"
                      />
                    ) : (
                      <div className="header-display" style={{ color: '#0f172a', fontWeight: 500 }}>{footerText}</div>
                    )}
                  </div>

                  <PageNumbersPlugin show={pageNumsOn} />

                </div>
              </div>
              
              <OnChangePlugin onChange={(editorState) => {
                const editorStateJSON = editorState.toJSON();
                localStorage.setItem(`vh_content_${currentDocId}`, JSON.stringify(editorStateJSON));
                setLastSaved("Unsaved Changes...");
              }} />

              <HistoryPlugin delay={0} />
              <ListPlugin />
              <ForensicsPlugin onUpdateStats={setStats} />
              <AutoPaginationPlugin />
            </>
          )}
        </div>

        {/* --- VOICE SCRATCHPAD SIDEBAR --- */}
        <div id="scratchpad-sidebar" className={`scratchpad-sidebar ${isScratchpadOpen ? '' : 'closed'}`}>
          <div className="scratchpad-toggle-handle" onClick={() => setIsScratchpadOpen(!isScratchpadOpen)}>
            <span style={{ fontSize: '20px' }}>{isScratchpadOpen ? '▶' : '◀'}</span>
          </div>
          
          <div className="scratchpad-header" style={{ padding: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0f172a' }}>
            <div style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎙️</span> Voice Scratchpad
            </div>
            <span style={{ fontSize: '10px', color: '#38bdf8', fontWeight: 'bold', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 8px', borderRadius: '10px' }}>Hybrid Utility</span>
          </div>

          <div className="scratchpad-content" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto', flexGrow: 1 }}>
            <div className="voice-controls" style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(15, 23, 42, 0.4)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
              <button 
                onClick={toggleRecordingSession} 
                style={{
                  background: isRecording ? '#0f172a' : '#e11d48', color: isRecording ? '#f43f5e' : 'white',
                  border: isRecording ? '2px solid #f43f5e' : 'none', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px'
                }}
              >
                <span>{isRecording ? '■' : '●'}</span> {isRecording ? 'Recording... Tap to Stop' : 'Record Voice Note'}
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', paddingTop: '10px' }}>
                <span>Or import audio:</span>
                <label style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px dashed rgba(255, 255, 255, 0.2)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', color: '#e2e8f0' }}>
                  📁 Choose File
                  <input type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleAudioFileInput} />
                </label>
              </div>
            </div>

            <div className="voice-clips-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {voiceClips.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '12px', padding: '40px 10px', border: '2px dashed rgba(255, 255, 255, 0.05)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '24px' }}>🎙️</span>
                  <p>No audio captures mapped yet. Record your voice or import a local sound file to start parsing dictation logs.</p>
                </div>
              ) : (
                voiceClips.map(clip => (
                  <div key={clip.id} style={{ background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                      <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '12px' }}>{clip.title}</span>
                      <button onClick={() => deleteVoiceClip(clip.id)} style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '11px' }}>✖ Delete</button>
                    </div>
                    {clip.url ? <audio src={clip.url} controls style={{ width: '100%', height: '28px' }}></audio> : <div style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>Audio cached</div>}
                    <textarea 
                      value={clip.text} 
                      onChange={(e) => updateVoiceClipText(clip.id, e.target.value)} 
                      style={{ background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '8px', fontSize: '12px', color: '#e2e8f0', resize: 'vertical', minHeight: '50px', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <button onClick={() => generateProvenanceQR(clip.id)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>📜 QR Code</button>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => saveRecordedClipLocalFile(clip.id)} style={{ background: '#00b894', color: '#0f172a', border: 'none', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>💾 Save</button>
                        <button onClick={() => setPendingTextInsert(" " + clip.text.trim() + " ")} style={{ background: '#38bdf8', color: '#0f172a', border: 'none', padding: '4px 8px', borderRadius: '6px', fontWeight: 700, fontSize: '11px', cursor: 'pointer' }}>📋 Insert</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Enterprise Research & Sources Sidebar Drawer */}
        {isSidebarOpen && (
          <div className="research-sidebar" style={{ width: '320px', background: '#fff', borderLeft: '1px solid #edebe9', padding: '15px', overflowY: 'auto', position: 'fixed', right: isScratchpadOpen ? '360px' : 0, top: '230px', height: 'calc(100vh - 270px)', zIndex: 50, borderRadius: '8px 0 0 8px', boxShadow: '-4px 0 15px rgba(0,0,0,0.1)' }}>
            <h3>Sources & Enterprise Notes</h3>
            <textarea 
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
              placeholder="Paste reference link or note..." 
              style={{ width: '100%', height: '100px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '12px', marginBottom: '10px', outline: 'none' }}
            />
            <button className="author-add-btn" onClick={handleAddSource} style={{ marginBottom: '15px', padding: '8px', width: '100%', cursor: 'pointer', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>+ Save Source Snippet</button>
            <div>
              {sources.map((src, idx) => (
                <div key={idx} className="source-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '6px', fontSize: '12px', marginBottom: '8px', position: 'relative' }}>
                  <span className="source-delete" onClick={() => handleRemoveSource(idx)} style={{ position: 'absolute', top: '5px', right: '8px', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>×</span>
                  <strong>Reference #{idx + 1}</strong>
                  <p style={{ color: '#64748b', fontSize: '11px', marginTop: '3px' }}>{src}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- DOCUMENTS LIBRARY MODAL --- */}
      {isLibraryOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '16px', width: '100%', maxWidth: '600px', padding: '30px', color: '#fff', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>📂 Documents Library</h2>
              <button onClick={() => setIsLibraryOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
              Manage, switch, rename, or delete your saved research papers from the cloud.
            </p>

            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {documentList.map((doc) => (
                <div 
                  key={doc.id}
                  onClick={() => { setIsLibraryOpen(false); handleSwitchDocument(doc.id); }}
                  style={{
                    background: doc.id === currentDocId ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    border: doc.id === currentDocId ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '14px 18px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                      {doc.id === currentDocId ? '🟢 ' : '☁️ '} {doc.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>
                      ID: {doc.id} {doc.id === currentDocId ? '• (Active Paper)' : ''}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={(e) => handleLibraryRename(doc.id, e)}
                      style={{ background: '#334155', border: 'none', color: '#cbd5e1', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ✏️ Rename
                    </button>
                    <button 
                      onClick={(e) => handleDeleteDocument(doc.id, e)}
                      style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', padding: '6px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '20px' }}>
              <button 
                onClick={() => { setIsLibraryOpen(false); handleNewDocument(); }}
                style={{ background: 'var(--brand-accent)', color: 'var(--brand-dark)', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
              >
                + Create New Paper
              </button>
              <button 
                onClick={() => setIsLibraryOpen(false)}
                style={{ background: '#475569', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
              >
                Close Library
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="status-bar">
        <div>Words: <span>{stats.words}</span> | Keystrokes: <span>{stats.keys}</span> | Tempo: {bpm} BPM | Status: {docStatus}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ height: '8px', width: '8px', backgroundColor: '#3b82f6', borderRadius: '50%', display: 'inline-block' }}></span>
          {lastSaved}
        </div>
      </div>
    </LexicalComposer>
  );
}