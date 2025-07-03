import React from 'react';
import { useDrag } from 'react-dnd';
import { ItemTypes } from '../../constants/itemTypes';
import { perspectiveColors, rawPerspectiveColors } from '../../constants/colors';
import { Edit3Icon, CheckIcon, XIcon, FileTextIcon, StickyNoteIcon, MicIcon, Trash2Icon } from '../Icons';

const Card = ({ 
  id, text, x, y, width, height, groupId, onMove, onDelete, onEdit, isSelected, onClick,
  isEditing, editText, onEditTextChange, onSaveEdit, onCancelEdit,
  sourceType, solutionPerspective, isChallenge, perspectiveRaw 
}) => {
  const [{ isDragging }, drag, preview] = useDrag(() => ({
    type: ItemTypes.CARD,
    item: { id, x, y, width, height, type: ItemTypes.CARD },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    end: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (delta) {
        const newX = Math.round(item.x + delta.x);
        const newY = Math.round(item.y + delta.y);
        onMove(item.id, newX, newY);
      }
    }
  }), [id, x, y, width, height, onMove]);

  return preview(
    <div
      ref={drag}
      onClick={(e) => onClick(e, id)}
      data-card-id={id}
      style={{
        left: x,
        top: y,
        width: `${width}px`,
        height: `${height}px`,
        opacity: isDragging ? 0.5 : 1
      }}
      className={`absolute p-2 rounded-lg shadow-lg cursor-grab active:cursor-grabbing bg-yellow-100 border-2
                  ${isSelected ? 'border-blue-500 ring-2 ring-blue-500' : 'border-yellow-300'}
                  ${isChallenge ? 'border-red-500' : groupId ? 'border-dashed border-purple-500' : ''}
                  flex flex-col justify-between group`}
    >
      {isEditing ? (
        <div className="flex flex-col h-full">
          <textarea
            value={editText}
            onChange={onEditTextChange}
            className="w-full h-full p-1 border border-gray-300 rounded resize-none focus:ring-blue-500 focus:border-blue-500 text-xs flex-grow"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSaveEdit(id);
              }
            }}
          />
          <div className="flex justify-end mt-1 space-x-1">
            <button onClick={() => onSaveEdit(id)} className="p-1 text-green-600 hover:text-green-800">
              <CheckIcon />
            </button>
            <button onClick={onCancelEdit} className="p-1 text-red-600 hover:text-red-800">
              <XIcon />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-grow overflow-hidden p-1 group-hover:overflow-y-auto">
            {isChallenge && <span className="text-xs font-semibold text-red-600">[課題] </span>}
            {perspectiveRaw && (
              <span className={`text-xs font-semibold px-1 py-0.5 rounded-sm mr-1 ${rawPerspectiveColors[perspectiveRaw] || 'bg-gray-200 text-gray-800'}`}>
                [{perspectiveRaw}]
              </span>
            )}
            {solutionPerspective && (
              <span className={`text-xs font-semibold px-1 py-0.5 rounded-sm ${perspectiveColors[solutionPerspective] || 'bg-gray-200 text-gray-800'}`}>
                [{solutionPerspective.substring(0,2)}]
              </span>
            )}
            <p className={`text-xs break-words whitespace-pre-wrap ${(isChallenge || solutionPerspective || perspectiveRaw) ? 'inline' : ''}`}>
              {text}
            </p>
          </div>
          <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1 pb-1">
            <div className="flex items-center space-x-1">
              {sourceType === 'discussion' && <FileTextIcon title="データソース: 会議ディスカッション"/>}
              {sourceType === 'proposal_sheet' && <StickyNoteIcon title="データソース: 改善提案シート"/>}
              {sourceType === 'audio_transcription' && <MicIcon title="データソース: 音声文字起こし"/>}
            </div>
            <div className="flex items-center space-x-1">
              <button onClick={(e) => { e.stopPropagation(); onEdit(id); }} className="p-1 text-blue-600 hover:text-blue-800">
                <Edit3Icon />
              </button>
              <button onClick={(e) => { e.stopPropagation(); onDelete(id); }} className="p-1 text-red-600 hover:text-red-800">
                <Trash2Icon />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Card;