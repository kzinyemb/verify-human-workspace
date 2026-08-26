import React from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { INSERT_UNORDERED_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND } from '@lexical/list';
import { INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND } from 'lexical';

interface EditorialToolbarProps {
  onInsertFlag: (type: 'source' | 'legal' | 'verified') => void;
  onToggleNotesMode: () => void;
  isNotesMode: boolean;
  activeTab: string;
}

export function EditorialToolbarPlugin({ 
  onInsertFlag, 
  onToggleNotesMode, 
  isNotesMode, 
  activeTab 
}: EditorialToolbarProps) {
  const [editor] = useLexicalComposerContext();

  if (activeTab !== 'editorial') return null;

  return (
    <div className="ribbon-content active" id="editorial-ribbon">
      
      {/* Lists & Indents Group */}
      <div className="group">
        <div className="btn-row">
          <button 
            type="button" 
            className="btn-ribbon" 
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}
            title="Bullet List"
          >
            • List
          </button>
          <button 
            type="button" 
            className="btn-ribbon" 
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}
            title="Numbered List"
          >
            1. List
          </button>
          <button 
            type="button" 
            className="btn-ribbon" 
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}
            title="Decrease Indent"
          >
            ↤ Outdent
          </button>
          <button 
            type="button" 
            className="btn-ribbon" 
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}
            title="Increase Indent"
          >
            ↦ Indent
          </button>
        </div>
        <div className="group-label">Lists & Indents</div>
      </div>

      {/* Fact-Check Flags Group */}
      <div className="group">
        <div className="btn-row">
          <button 
            type="button" 
            className="btn-ribbon btn-big" 
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsertFlag('source')}
            title="Mark text as needing a source"
          >
            <span>📌</span>Source Needed
          </button>
          <button 
            type="button" 
            className="btn-ribbon btn-big" 
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsertFlag('legal')}
            title="Mark text for legal review"
          >
            <span>⚖️</span>Legal Check
          </button>
          <button 
            type="button" 
            className="btn-ribbon btn-big" 
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsertFlag('verified')}
            title="Mark text as verified"
          >
            <span>✅</span>Verified
          </button>
        </div>
        <div className="group-label">Fact-Check Flags</div>
      </div>

      {/* Review Mode Group */}
      <div className="group">
        <button 
          type="button" 
          className="btn-ribbon btn-big" 
          onMouseDown={(e) => e.preventDefault()}
          onClick={onToggleNotesMode} 
          style={{ color: isNotesMode ? '#00b894' : 'inherit' }}
        >
          <span>💬</span>Editor Notes: {isNotesMode ? 'ON' : 'OFF'}
        </button>
        <div className="group-label">Review Mode</div>
      </div>
      
    </div>
  );
}