import React, { useState } from 'react';
import { XIcon } from '../Icons';

const TextDisplayPanel = ({ jsonData, isVisible, onToggle, formatAsText }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(formatAsText(jsonData));
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className={`fixed top-24 right-0 h-full bg-white shadow-lg border-l transition-transform duration-300 z-20 ${
      isVisible ? 'translate-x-0' : 'translate-x-full'
    }`} style={{ width: '400px' }}>
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">テキスト表示</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={copyToClipboard}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              copySuccess
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {copySuccess ? 'コピー完了!' : 'コピー'}
          </button>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-700"
          >
            <XIcon />
          </button>
        </div>
      </div>
      <div className="p-4 h-full overflow-auto">
        <pre className="text-sm text-gray-700 whitespace-pre-wrap break-words font-mono">
          {formatAsText(jsonData)}
        </pre>
      </div>
    </div>
  );
};

export default TextDisplayPanel;