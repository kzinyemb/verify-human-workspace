import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';

interface ForensicsPluginProps {
  onUpdateStats: (stats: { words: number; keys: number; score: number }) => void;
}

export function ForensicsPlugin({ onUpdateStats }: ForensicsPluginProps) {
  const [editor] = useLexicalComposerContext();
  
  // Using refs to store the log without triggering React re-renders on every single keystroke
  const logRef = useRef<{ k: string; t: number }[]>([]);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // 1. Attach keydown listener safely using Lexical's Root Listener
    const removeRootListener = editor.registerRootListener((rootElement, prevRootElement) => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Ignore navigation/meta keys to keep the score accurate to actual typing
        if (['Shift', 'Control', 'Alt', 'Meta', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            return;
        }

        if (!startTimeRef.current) startTimeRef.current = Date.now();
        logRef.current.push({ k: e.key, t: Date.now() - startTimeRef.current });
      };

      // Clean up old listener if the editor DOM node changes
      if (prevRootElement) {
        prevRootElement.removeEventListener('keydown', handleKeyDown);
      }
      // Add listener to the new editor DOM node
      if (rootElement) {
        rootElement.addEventListener('keydown', handleKeyDown);
      }
    });

    // 2. Listen for text updates to calculate the math
    const removeUpdateListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const text = $getRoot().getTextContent();
        const textLength = text.trim().length;
        
        // Calculate Words
        const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
        
        // Calculate Keys
        const keys = logRef.current.length;
        
        // Calculate Trust Score (Keys / Text Length)
        let score = textLength > 0 ? Math.min(100, (keys / textLength) * 100) : 0;

        // Push the update up to App.tsx
        onUpdateStats({
          words,
          keys,
          score: Math.floor(score)
        });
      });
    });

    return () => {
      removeRootListener();
      removeUpdateListener();
    };
  }, [editor, onUpdateStats]);

  return null; // This plugin works invisibly in the background
}