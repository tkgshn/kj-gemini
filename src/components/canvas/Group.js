import React, { useState, useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { Edit3Icon, CheckIcon, XIcon, Trash2Icon } from '../Icons';

const Group = ({ 
  id, title, isChallengeGroup, x, y, width, height, cardsInGroupCount, 
  onMove, onDelete, onEditTitle, isSelected, onClick 
}) => {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: 'GROUP',
    item: { id, x, y, width, height, type: 'GROUP' },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    end: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta && onMove) {
        const newX = Math.round(item.x + delta.x);
        const newY = Math.round(item.y + delta.y);
        onMove(item.id, newX, newY);
      }
    }
  }), [id, x, y, width, height, onMove]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(title);

  useEffect(() => {
    setCurrentTitle(title);
  }, [title]);

  const handleTitleChange = (e) => setCurrentTitle(e.target.value);
  const saveTitle = () => {
    onEditTitle(id, currentTitle);
    setIsEditingTitle(false);
  };

  const displayTitle = isChallengeGroup ? `[課題] ${title}` : title;

  return preview(
    <div
      ref={drag}
      data-group-id={id}
      style={{
        left: x,
        top: y,
        width: `${width}px`,
        height: `${height}px`,
        opacity: isDragging ? 0.7 : 1
      }}
      className={`absolute p-3 rounded-xl border-2 bg-opacity-60 shadow-xl cursor-grab active:cursor-grabbing group/groupcomp
                  ${isChallengeGroup ? 'border-red-600 bg-red-50' : 'border-purple-500 bg-purple-50'}
                  ${isSelected ? 'ring-2 ring-opacity-75' : ''}
                  ${isSelected && isChallengeGroup ? 'ring-red-700' : isSelected ? 'ring-purple-700' : ''}`}
      onClick={(e) => onClick(e, id)}
    >
      <div className="flex justify-between items-center mb-1">
        {isEditingTitle ? (
          <div className="flex items-center w-full">
            <input
              type="text"
              value={currentTitle}
              onChange={handleTitleChange}
              className="text-xs font-semibold p-1 border border-gray-300 rounded focus:ring-1 focus:ring-current flex-grow"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTitle();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
            />
            <button onClick={saveTitle} className="p-1 text-green-600 hover:text-green-800 ml-1">
              <CheckIcon />
            </button>
            <button onClick={() => setIsEditingTitle(false)} className="p-1 text-red-600 hover:text-red-800">
              <XIcon />
            </button>
          </div>
        ) : (
          <h3
            className={`text-xs font-semibold truncate ${isChallengeGroup ? 'text-red-700' : 'text-purple-700'}`}
            onDoubleClick={() => setIsEditingTitle(true)}
            title={displayTitle}
          >
            {displayTitle || '無題のグループ'}
          </h3>
        )}
        <div className="opacity-0 group-hover/groupcomp:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} className="p-1 text-gray-600 hover:text-gray-800">
            <Edit3Icon />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(id); }} className="p-1 text-red-600 hover:text-red-800">
            <Trash2Icon />
          </button>
        </div>
      </div>
      <div className={`text-xs ${isChallengeGroup ? 'text-red-500' : 'text-purple-500'}`}>
        {cardsInGroupCount} カード
      </div>
    </div>
  );
};

export default Group;