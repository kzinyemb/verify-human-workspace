import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import type { LexicalCommand } from 'lexical';
import { $createPageBreakNode, PageBreakNode } from './PageBreakNode';

export const INSERT_PAGE_BREAK_COMMAND: LexicalCommand<void> = createCommand('INSERT_PAGE_BREAK_COMMAND');

export function AutoPaginationPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([PageBreakNode])) {
      throw new Error('AutoPaginationPlugin: PageBreakNode not registered on editor');
    }

    const removeCommandListener = editor.registerCommand(
      INSERT_PAGE_BREAK_COMMAND,
      () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertParagraph();
            const focusNode = selection.focus.getNode();
            const topLevelElement = focusNode.getTopLevelElement();
            
            if (topLevelElement) {
              const pageBreakNode = $createPageBreakNode();
              topLevelElement.insertBefore(pageBreakNode);
            }
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );

    const removeUpdateListener = editor.registerUpdateListener(({ dirtyElements, dirtyLeaves }) => {
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) {
        return;
      }

      editor.getEditorState().read(() => {
        const rootElement = editor.getRootElement();
        if (!rootElement) return;

        const INCH = 96;
        const PAGE_HEIGHT = 1056; 
        const GAP = 40; 
        const TOTAL_PAGE_CYCLE = PAGE_HEIGHT + GAP; 

        const MARGIN_TOP = INCH;
        const MARGIN_BOTTOM = INCH;

        const blocks = Array.from(rootElement.children) as HTMLElement[];
        let maxBottom = 0; 

        blocks.forEach((block) => {
          block.style.marginTop = '0px';
          
          const rect = block.getBoundingClientRect();
          const rootRect = rootElement.getBoundingClientRect();
          
          const top = rect.top - rootRect.top;
          const bottom = top + rect.height;

          const pageIndex = Math.floor(top / TOTAL_PAGE_CYCLE);
          const usableTopEdge = (pageIndex * TOTAL_PAGE_CYCLE) + MARGIN_TOP;
          const usableBottomEdge = (pageIndex * TOTAL_PAGE_CYCLE) + PAGE_HEIGHT - MARGIN_BOTTOM;

          const isManualBreak = block.querySelector('.page-break-visual') !== null;
          let finalBottom = bottom;

          if (isManualBreak) {
            const gapTop = (pageIndex * TOTAL_PAGE_CYCLE) + PAGE_HEIGHT;
            const pushAmount = gapTop - top - 20; 
            
            if (pushAmount > 0) {
              block.style.marginTop = `${pushAmount}px`;
              finalBottom = bottom + pushAmount;
            }
          } else {
            if (bottom > usableBottomEdge) {
              const usableTopEdgeNextPage = ((pageIndex + 1) * TOTAL_PAGE_CYCLE) + MARGIN_TOP;
              const pushAmount = usableTopEdgeNextPage - top; 
              if (pushAmount > 0) {
                  block.style.marginTop = `${pushAmount}px`;
                  finalBottom = bottom + pushAmount;
              }
            } else if (top < usableTopEdge && pageIndex > 0) {
              const pushAmount = usableTopEdge - top;
              if (pushAmount > 0) {
                  block.style.marginTop = `${pushAmount}px`;
                  finalBottom = bottom + pushAmount;
              }
            }
          }

          if (finalBottom > maxBottom) {
            maxBottom = finalBottom;
          }
        });

        const totalPages = Math.max(1, Math.ceil(maxBottom / TOTAL_PAGE_CYCLE));
        rootElement.style.minHeight = `${totalPages * TOTAL_PAGE_CYCLE}px`;
        
        const container = rootElement.closest('.editor-container') as HTMLElement;
        if (container) {
           container.style.minHeight = `${totalPages * TOTAL_PAGE_CYCLE}px`;
        }
      });
    });

    return () => {
      removeCommandListener();
      removeUpdateListener();
    };
  }, [editor]);

  return null;
}

export default AutoPaginationPlugin;