import React, { useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { 
  FORMAT_TEXT_COMMAND, 
  UNDO_COMMAND, 
  REDO_COMMAND, 
  INDENT_CONTENT_COMMAND, 
  OUTDENT_CONTENT_COMMAND,
  $getSelection, 
  $isRangeSelection 
} from 'lexical';
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list';
import { $patchStyleText } from '@lexical/selection';

interface ToolbarProps {
  activeTab: string;
  onOpenHFModal: (type: 'header' | 'footer') => void;
  onTogglePageNums: () => void;
  pageNumsOn: boolean;
  onToggleCitations: () => void;
  onToggleForensics: () => void;
  onRename: () => void;
  docName: string;
  setDocName: (name: string) => void;
  authors: string[];
  headerText: string;
  footerText: string;
  isBadgeAdded: boolean;
  badgeTimestamp: string;
  integrityScore: number;
}

export function ToolbarPlugin({ 
  activeTab, 
  onOpenHFModal, 
  onTogglePageNums, 
  pageNumsOn, 
  onToggleCitations, 
  onToggleForensics,
  onRename,
  docName,
  setDocName,
  authors,
  headerText,
  footerText,
  isBadgeAdded,
  badgeTimestamp,
  integrityScore
}: ToolbarProps) {
  const [editor] = useLexicalComposerContext();
  const [shareModalUrl, setShareModalUrl] = useState<string | null>(null);
  const [copiedStatus, setCopiedStatus] = useState(false);

  const handleFormatText = (e: React.MouseEvent, format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'subscript' | 'superscript') => {
    e.preventDefault();
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
    editor.focus();
  };

  const handleFontFamilyChange = (e: React.MouseEvent, fontFamily: string) => {
    e.preventDefault();
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'font-family': fontFamily });
      }
    });
    editor.focus();
  };

  const handleFontSizeChange = (e: React.MouseEvent, fontSize: string) => {
    e.preventDefault();
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'font-size': fontSize });
      }
    });
    editor.focus();
  };

  const handleLineSpacingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const spacing = e.target.value;
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const nodes = selection.getNodes();
        const topLevelElements = new Set<any>();
        
        nodes.forEach((node) => {
          const topLevel = node.getTopLevelElement();
          if (topLevel) topLevelElements.add(topLevel);
        });

        if (topLevelElements.size === 0) {
          const focusNode = selection.focus.getNode();
          const topLevel = focusNode.getTopLevelElement();
          if (topLevel) topLevelElements.add(topLevel);
        }

        topLevelElements.forEach((element) => {
          const dom = editor.getElementByKey(element.getKey());
          if (dom) {
            dom.style.lineHeight = spacing;
          }
        });
      }
    });
    editor.focus();
  };

  const handleOpenShareModal = (e: React.MouseEvent) => {
    e.preventDefault();
    const uniqueId = Math.random().toString(36).substring(2, 10);
    const verificationUrl = `https://provenantforensics.com/verify?doc=${encodeURIComponent(docName)}&author=${encodeURIComponent(authors.join(','))}&integrity=${integrityScore}&id=pf_${uniqueId}`;
    
    setShareModalUrl(verificationUrl);
    setCopiedStatus(false);
    editor.focus();
  };

  const copyToClipboardModal = () => {
    if (shareModalUrl) {
      navigator.clipboard.writeText(shareModalUrl).then(() => {
        setCopiedStatus(true);
        setTimeout(() => setCopiedStatus(false), 3000);
      });
    }
  };

  const handlePrintPDF = (e: React.MouseEvent) => {
    e.preventDefault();
    window.print();
  };

  return (
    <>
      {shareModalUrl && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#ffffff',
            padding: '30px',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            fontFamily: 'Inter, sans-serif'
          }}>
            <h3 style={{ color: '#0f172a', marginBottom: '8px', fontSize: '18px' }}>🔗 Client Verification Link</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
              Share this secure link with your client so they can instantly verify your human composition score and authorship proof.
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
              <input 
                type="text" 
                readOnly 
                value={shareModalUrl} 
                onClick={(e) => (e.target as HTMLInputElement).select()}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button 
                onClick={copyToClipboardModal}
                style={{
                  background: copiedStatus ? '#00b894' : '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {copiedStatus ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {copiedStatus && (
              <div style={{ color: '#00b894', fontSize: '12px', fontWeight: 600, marginBottom: '15px' }}>
                ✓ Successfully copied to clipboard! Ready to paste.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                onClick={() => setShareModalUrl(null)}
                style={{
                  background: '#e2e8f0',
                  color: '#0f172a',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'file' && (
        <div className="ribbon-content">
          <div className="group">
            <div className="btn-row">
              <button type="button" className="btn-ribbon btn-big" onClick={handlePrintPDF}><span>📕</span>Save as PDF / Print</button>
            </div>
            <div className="group-label">Freelance Submission Actions</div>
          </div>
          <div className="group">
            <div className="btn-row">
              <button type="button" className="btn-ribbon btn-big" onClick={onRename}><span>✏️</span>Rename</button>
              <button type="button" className="btn-ribbon btn-big" style={{ color: '#d83b01' }} onClick={() => alert('Remove or trash the file.')}><span>🗑️</span>Delete</button>
            </div>
            <div className="group-label">Manage</div>
          </div>
        </div>
      )}

      {activeTab === 'home' && (
        <div className="ribbon-content">
          <div className="group">
            <div className="btn-row">
              <button 
                type="button" 
                className="btn-ribbon btn-big" 
                onMouseDown={(e) => e.preventDefault()} 
                onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
              >
                <span>↩️</span>Undo
              </button>
              <button 
                type="button" 
                className="btn-ribbon btn-big" 
                onMouseDown={(e) => e.preventDefault()} 
                onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
              >
                <span>↪️</span>Redo
              </button>
            </div>
            <div className="group-label">History</div>
          </div>

          <div className="group">
            <div className="btn-row" style={{ gap: '3px' }}>
              <button type="button" className="btn-ribbon" style={{ fontSize: '11px', padding: '4px 6px' }} onMouseDown={(e) => handleFontFamilyChange(e, 'Arial')}>Arial</button>
              <button type="button" className="btn-ribbon" style={{ fontSize: '11px', padding: '4px 6px' }} onMouseDown={(e) => handleFontFamilyChange(e, 'Calibri')}>Calibri</button>
              <button type="button" className="btn-ribbon" style={{ fontSize: '11px', padding: '4px 6px' }} onMouseDown={(e) => handleFontFamilyChange(e, 'Times New Roman')}>Times New Roman</button>
            </div>
            <div className="group-label">Font Family</div>
          </div>

          <div className="group">
            <div className="btn-row" style={{ gap: '2px', marginBottom: '5px' }}>
              <button type="button" className="btn-ribbon" style={{ fontSize: '10px', padding: '3px 5px' }} onMouseDown={(e) => handleFontSizeChange(e, '12px')}>12pt</button>
              <button type="button" className="btn-ribbon" style={{ fontSize: '10px', padding: '3px 5px' }} onMouseDown={(e) => handleFontSizeChange(e, '14px')}>14pt</button>
              <button type="button" className="btn-ribbon" style={{ fontSize: '10px', padding: '3px 5px' }} onMouseDown={(e) => handleFontSizeChange(e, '16px')}>16pt</button>
              <button type="button" className="btn-ribbon" style={{ fontSize: '10px', padding: '3px 5px' }} onMouseDown={(e) => handleFontSizeChange(e, '18px')}>18pt</button>
              <button type="button" className="btn-ribbon" style={{ fontSize: '10px', padding: '3px 5px' }} onMouseDown={(e) => handleFontSizeChange(e, '24px')}>24pt</button>
            </div>
            <div className="btn-row">
              <button type="button" className="btn-ribbon" onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleFormatText(e, 'bold')}><b>B</b></button>
              <button type="button" className="btn-ribbon" onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleFormatText(e, 'italic')}><i>I</i></button>
              <button type="button" className="btn-ribbon" onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleFormatText(e, 'underline')}><u>U</u></button>
              <button type="button" className="btn-ribbon" onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleFormatText(e, 'superscript')}>x²</button>
              <button type="button" className="btn-ribbon" onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleFormatText(e, 'subscript')}>x₂</button>
            </div>
            <div className="group-label">Font Size & Style</div>
          </div>

          <div className="group">
            <div className="btn-row">
              <button 
                type="button" 
                className="btn-ribbon" 
                onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
                title="Bullet List"
              >
                • List
              </button>
              <button 
                type="button" 
                className="btn-ribbon" 
                onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
                title="Numbered List"
              >
                1. List
              </button>
              <button 
                type="button" 
                className="btn-ribbon" 
                onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}
                title="Decrease Indent"
              >
                ↤ Outdent
              </button>
              <button 
                type="button" 
                className="btn-ribbon" 
                onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}
                title="Increase Indent"
              >
                ↦ Indent
              </button>
            </div>
            <div className="group-label">Lists & Indents</div>
          </div>

          <div className="group">
            <select style={{ marginTop: '5px', width: '120px' }} defaultValue="1.15" onChange={handleLineSpacingChange}>
              <option value="1.0">1.0 spacing</option>
              <option value="1.15">1.15 spacing</option>
              <option value="1.5">1.5 spacing</option>
              <option value="2.0">2.0 spacing</option>
            </select>
            <div className="group-label">Paragraph Formatting</div>
          </div>
        </div>
      )}

      {activeTab === 'layout' && (
        <div className="ribbon-content">
          <div className="group">
            <div className="btn-row">
              <button type="button" className="btn-ribbon btn-big" onClick={() => onOpenHFModal('header')}><span>⬆️</span>Header</button>
              <button type="button" className="btn-ribbon btn-big" onClick={() => onOpenHFModal('footer')}><span>⬇️</span>Footer</button>
              <button type="button" className="btn-ribbon btn-big" onClick={onTogglePageNums}>
                <span>🔢</span>Page Nums: {pageNumsOn ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="group-label">Header & Footer</div>
          </div>
        </div>
      )}

      {activeTab === 'references' && (
        <div className="ribbon-content">
          <div className="group">
            <button type="button" className="btn-ribbon btn-big" onClick={onToggleCitations}>
              <span>📚</span>Citations
            </button>
            <div className="group-label">Insert & Manage</div>
          </div>
          <div className="group">
            <button type="button" className="btn-ribbon btn-big" onClick={onToggleForensics} style={{ color: '#00b894' }}>
              <span>📈</span>Velocity Forensics Chart
            </button>
            <div className="group-label">Verification Tools</div>
          </div>
          <div className="group">
            <button type="button" className="btn-ribbon btn-big" onClick={handleOpenShareModal} style={{ color: '#3b82f6' }}>
              <span>🔗</span>Copy Verification Link
            </button>
            <div className="group-label">Client Share</div>
          </div>
        </div>
      )}
    </>
  );
}