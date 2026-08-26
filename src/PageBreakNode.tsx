import React from 'react';
import { DecoratorNode } from 'lexical';
// Explicitly import these as types to prevent Vite build errors
import type { LexicalNode, SerializedLexicalNode } from 'lexical';

export type SerializedPageBreakNode = SerializedLexicalNode;

export class PageBreakNode extends DecoratorNode<React.ReactNode> {
  static getType(): string {
    return 'page-break';
  }

  static clone(node: PageBreakNode): PageBreakNode {
    return new PageBreakNode(node.__key);
  }

  static importJSON(_serializedNode: SerializedPageBreakNode): PageBreakNode {
    return $createPageBreakNode();
  }

  exportJSON(): SerializedPageBreakNode {
    return {
      type: 'page-break',
      version: 1,
    };
  }

  createDOM(): HTMLElement {
    const el = document.createElement('div');
    // This ensures that if the user prints to PDF, the browser respects the page break
    el.style.pageBreakAfter = 'always'; 
    return el;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): React.ReactNode {
    return (
      <div 
        className="page-break-visual" 
        contentEditable={false} // Prevents users from typing inside the gap
        style={{
          height: '40px',
          backgroundColor: '#f1f5f9',
          margin: '20px -1in', // Pulls the gap out to the edges of your 1-inch margins
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          borderTop: '1px solid #cbd5e1',
          borderBottom: '1px solid #cbd5e1',
        }}
      >
         <span style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '2px' }}>
           Page Break
         </span>
      </div>
    );
  }
}

export function $createPageBreakNode(): PageBreakNode {
  return new PageBreakNode();
}

export function $isPageBreakNode(node: LexicalNode | null | undefined): node is PageBreakNode {
  return node instanceof PageBreakNode;
}