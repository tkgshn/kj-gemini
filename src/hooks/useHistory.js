import { useState, useCallback } from 'react';

// History management hook
const useHistory = () => {
  const [history, setHistory] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  const saveState = useCallback((cards, groups, description = '') => {
    const newState = {
      cards: JSON.parse(JSON.stringify(cards)),
      groups: JSON.parse(JSON.stringify(groups)),
      timestamp: Date.now(),
      description
    };

    setHistory(prev => {
      // Remove any history after current index (when we make a new action after undo)
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newState);

      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });

    setCurrentIndex(prev => Math.min(prev + 1, 49));
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  return { saveState, undo, redo, canUndo, canRedo };
};

export default useHistory;