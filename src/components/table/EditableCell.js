import React from 'react';

const EditableCell = ({ 
  groupId, type, itemId, text, className = "", 
  isEditing, editingText, setEditingText, 
  handleCellClick, handleKeyDown, handleCellSave 
}) => {
  if (isEditing) {
    return (
      <textarea
        value={editingText}
        onChange={(e) => setEditingText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleCellSave}
        className={`w-full p-1 text-sm border border-blue-300 rounded resize-none ${className}`}
        autoFocus
        rows={Math.max(2, Math.ceil(editingText.length / 50))}
      />
    );
  }

  return (
    <div
      onClick={() => handleCellClick(groupId, type, itemId, text)}
      className={`cursor-pointer p-1 hover:bg-gray-50 rounded text-sm ${className}`}
      title="クリックして編集"
    >
      {text}
    </div>
  );
};

export default EditableCell;