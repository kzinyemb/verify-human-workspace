import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import React, { useEffect, useState } from 'react';

export function PageNumbersPlugin({ show }: { show: boolean }) {
  const [editor] = useLexicalComposerContext();
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const removeListener = editor.registerUpdateListener(() => {
      // Defer measurement so it waits for AutoPaginationPlugin to finish laying out the page
      requestAnimationFrame(() => {
        editor.getEditorState().read(() => {
          const rootElement = editor.getRootElement();
          if (!rootElement) return;

          const PAGE_HEIGHT = 1056; 
          const GAP = 40; 
          const TOTAL_PAGE_CYCLE = PAGE_HEIGHT + GAP; 

          const blocks = Array.from(rootElement.children) as HTMLElement[];
          let maxBottom = 0;

          blocks.forEach((block) => {
            const rect = block.getBoundingClientRect();
            const rootRect = rootElement.getBoundingClientRect();
            const bottom = (rect.top - rootRect.top) + rect.height;
            if (bottom > maxBottom) maxBottom = bottom;
          });

          // Also account for the full scrollable container height (catches trailing page breaks/empty lines)
          if (rootElement.scrollHeight > maxBottom) {
            maxBottom = rootElement.scrollHeight;
          }

          const pages = Math.max(1, Math.ceil(maxBottom / TOTAL_PAGE_CYCLE));
          
          setTotalPages((prevPages) => (prevPages !== pages ? pages : prevPages));
        });
      });
    });

    return () => removeListener();
  }, [editor]);

  if (!show) return null;

  const PAGE_HEIGHT = 1056;
  const GAP = 40;
  const TOTAL_PAGE_CYCLE = PAGE_HEIGHT + GAP;

  const numbers = [];
  
  for (let i = 0; i < totalPages; i++) {
    numbers.push(
      <div
        key={i}
        style={{
          position: 'absolute',
          top: `${(i * TOTAL_PAGE_CYCLE) + PAGE_HEIGHT - 55}px`,
          right: '1in',
          color: '#334155',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'inherit',
          pointerEvents: 'none',
          zIndex: 15,
        }}
      >
        {i + 1}
      </div>
    );
  }

  return <>{numbers}</>;
}