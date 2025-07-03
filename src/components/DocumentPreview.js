import React, { useState, useEffect } from 'react';

const DocumentPreview = ({ file, ocrResults = null, className = "" }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPdfMode, setIsPdfMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDocument, setPdfDocument] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const fileType = file.type;
    
    if (fileType === 'application/pdf') {
      setIsPdfMode(true);
      loadPdfPreview(file);
    } else if (fileType.startsWith('image/')) {
      setIsPdfMode(false);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const loadPdfPreview = async (file) => {
    try {
      // Note: In a real implementation, you would use PDF.js here
      // For now, we'll create a placeholder implementation
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setTotalPages(1); // Placeholder
      setCurrentPage(0);
    } catch (error) {
      console.error('PDF loading error:', error);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (!file) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* File info header */}
      <div className="bg-gray-50 p-3 rounded-lg">
        <h3 className="font-medium text-gray-900 truncate">{file.name}</h3>
        <p className="text-sm text-gray-600">
          {file.type} • {(file.size / (1024 * 1024)).toFixed(2)} MB
        </p>
      </div>

      {/* Preview area */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {isPdfMode ? (
          <div className="space-y-2">
            {/* PDF navigation */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  ← 前のページ
                </button>
                <span className="text-sm text-gray-600">
                  {currentPage + 1} / {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages - 1}
                  className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  次のページ →
                </button>
              </div>
            )}
            
            {/* PDF preview */}
            <div className="p-4 text-center">
              {previewUrl ? (
                <object
                  data={previewUrl}
                  type="application/pdf"
                  className="w-full h-64 border rounded"
                >
                  <p className="text-gray-500">PDF プレビューを表示できません</p>
                </object>
              ) : (
                <p className="text-gray-500">PDF を読み込み中...</p>
              )}
            </div>
          </div>
        ) : (
          // Image preview
          <div className="p-4">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-64 mx-auto rounded border"
                style={{ objectFit: 'contain' }}
              />
            ) : (
              <p className="text-center text-gray-500">画像を読み込み中...</p>
            )}
          </div>
        )}
      </div>

      {/* OCR Results summary */}
      {ocrResults && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">OCR 処理結果</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• テキスト: {ocrResults.textCards || 0} 個の要素</p>
            <p>• テーブル: {ocrResults.tableCards || 0} 個の要素</p>
            <p>• フォーム: {ocrResults.formCards || 0} 個の要素</p>
            <p>• 合計: {ocrResults.totalCards || 0} 枚のカード</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentPreview;