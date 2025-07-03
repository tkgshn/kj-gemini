import React, { useState, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { ItemTypes } from '../../constants/itemTypes';
import Card from './Card';
import Group from './Group';

const Canvas = ({
  cards, groups,
  onCardMove, onCardDelete, onCardResize,
  onGroupMove, onGroupDelete, onGroupEditTitle,
  scale, pan, setPan, setScale,
  selectedCards, setSelectedCards, selectedGroups, setSelectedGroups,
  onCardEdit, editingCard, onEditTextChange, onSaveCardEdit, onCancelCardEdit
}) => {
  const canvasRef = React.useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartPos, setPanStartPos] = useState({ x: 0, y: 0 });

  const handleCanvasMouseDown = (e) => {
    // Only start panning if we clicked on the canvas background, not on cards or groups
    const target = e.target;
    const isCanvasBackground = target === canvasRef.current ||
                              target.classList.contains('bg-gray-100') ||
                              (target.closest('[data-card-id]') === null &&
                               target.closest('[data-group-id]') === null);

    if (e.button === 0 && !e.shiftKey && !e.ctrlKey && !e.metaKey && isCanvasBackground) {
      setIsPanning(true);
      setPanStartPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
      setSelectedCards([]);
      setSelectedGroups([]);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStartPos.x, y: e.clientY - panStartPos.y });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  // Handle wheel events for zoom and pan
  const handleWheel = useCallback((e) => {
    // Only handle events if the target is within the canvas area
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Check if the event originated from within the canvas
    const isWithinCanvas = e.target === canvasRef.current || canvasRef.current.contains(e.target);
    if (!isWithinCanvas) return;

    e.preventDefault();
    e.stopPropagation();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (e.ctrlKey || e.metaKey) {
      // Zoom with Ctrl/Cmd + wheel
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.1, Math.min(scale * zoomFactor, 5));

      // Calculate zoom point to maintain cursor position
      const scaleChange = newScale / scale;
      const newPan = {
        x: mouseX - (mouseX - pan.x) * scaleChange,
        y: mouseY - (mouseY - pan.y) * scaleChange
      };

      setScale(newScale);
      setPan(newPan);
    } else {
      // Pan with regular wheel
      const panSpeed = 1;
      setPan({
        x: pan.x - e.deltaX * panSpeed,
        y: pan.y - e.deltaY * panSpeed
      });
    }
  }, [scale, pan, setPan, setScale]);

  const handleCardClick = (e, cardId) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelectedCards(prev => prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]);
    } else {
      setSelectedCards([cardId]);
      setSelectedGroups([]);
    }
  };

  const handleGroupClick = (e, groupId) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelectedGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
    } else {
      setSelectedGroups([groupId]);
      setSelectedCards([]);
    }
  };

  const [, drop] = useDrop(() => ({
    accept: [ItemTypes.CARD, 'GROUP'],
    drop: (item, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset();
      if (!delta) return;
      const newX = Math.round(item.x + delta.x / scale);
      const newY = Math.round(item.y + delta.y / scale);
      if (item.type === ItemTypes.CARD) onCardMove(item.id, newX, newY);
      else if (item.type === 'GROUP') onGroupMove(item.id, newX, newY);
    },
  }), [onCardMove, onGroupMove, scale]);

  return (
    <div
      ref={(el) => { drop(el); canvasRef.current = el; }}
      className="relative w-full h-full bg-gray-100 overflow-hidden cursor-grab select-none"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
      onWheel={handleWheel}
    >
      <div
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0'
        }}
      >
        {groups.map(group => (
          <Group
            key={group.id}
            {...group}
            cardsInGroupCount={cards.filter(c => c.groupId === group.id).length}
            onMove={onGroupMove}
            onDelete={onGroupDelete}
            onEditTitle={onGroupEditTitle}
            isSelected={selectedGroups.includes(group.id)}
            onClick={handleGroupClick}
          />
        ))}
        {cards.map(card => {
          const currentCardIsEditing = editingCard && editingCard.id === card.id;
          return (
            <Card
              key={card.id}
              {...card}
              onMove={onCardMove}
              onDelete={onCardDelete}
              onEdit={() => onCardEdit(card.id)}
              onResize={onCardResize}
              isSelected={selectedCards.includes(card.id)}
              onClick={handleCardClick}

              isEditing={currentCardIsEditing}
              editText={currentCardIsEditing ? editingCard.text : ''}
              onEditTextChange={onEditTextChange}
              onSaveEdit={() => onSaveCardEdit(card.id)}
              onCancelEdit={onCancelCardEdit}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Canvas;