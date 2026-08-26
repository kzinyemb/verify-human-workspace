import React from 'react';
import { DecoratorNode } from 'lexical';
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
        contentEditable={false} 
        style={{
          height: '35px',
          backgroundColor: '#f8fafc',
          margin: '25px -1in', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          borderTop: '1px dashed #cbd5e1',
          borderBottom: '1px dashed #cbd5e1',
        }}
      >
         <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase' }}>
           📄 New Page
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