import React, { useState, useRef } from 'react';
import { UploadIcon } from './Icons';

const FileDropZone = ({ 
  onFileSelect, 
  acceptedTypes = ".pdf,.png,.jpg,.jpeg", 
  maxSizeMB = 16,
  disabled = false,
  selectedFile = null
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only remove drag over if leaving the entire drop zone
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file) => {
    // Validate file type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = acceptedTypes.split(',').map(type => type.replace('.', '').trim());
    
    if (!allowedExtensions.includes(fileExtension)) {
      alert(`サポートされていないファイル形式です。対応形式: ${allowedExtensions.join(', ')}`);
      return;
    }

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(`ファイルサイズが大きすぎます。${maxSizeMB}MB以下のファイルを選択してください。`);
      return;
    }

    onFileSelect(file);
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Drop zone */}
      <label
        className={`
          relative block w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragOver && !disabled
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}
        `}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="flex flex-col items-center space-y-4">
          {/* Upload icon */}
          <div className={`text-4xl ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`}>
            <UploadIcon />
          </div>

          {/* Text content */}
          <div className="text-gray-600">
            {selectedFile ? (
              <div className="space-y-2">
                <p className="font-medium text-green-600">✓ ファイル選択済み</p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
                <p className="text-xs text-blue-600">
                  別のファイルを選択するにはここをクリックまたはドラッグ&ドロップ
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">
                  {isDragOver ? 'ファイルをドロップしてください' : 'ファイルをドラッグ&ドロップ'}
                </p>
                <p className="text-sm">
                  または <span className="text-blue-600 underline">クリックしてファイルを選択</span>
                </p>
                <p className="text-xs text-gray-500">
                  対応形式: PDF, PNG, JPG, JPEG (最大{maxSizeMB}MB)
                </p>
              </div>
            )}
          </div>

          {/* Drag overlay */}
          {isDragOver && !disabled && (
            <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-lg pointer-events-none">
              <div className="flex items-center justify-center h-full">
                <div className="text-blue-600 text-xl font-bold">
                  ファイルをドロップ
                </div>
              </div>
            </div>
          )}
        </div>
      </label>
    </div>
  );
};

export default FileDropZone;