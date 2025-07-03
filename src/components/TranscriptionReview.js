import React, { useState } from 'react';
import { CheckIcon, XIcon, Edit3Icon, MicIcon, FileTextIcon } from './Icons';

/**
 * 文字起こし結果確認・編集コンポーネント
 * @param {Object} props - プロパティ
 * @param {string} props.transcription - 文字起こし結果
 * @param {string} props.fileName - 元ファイル名
 * @param {number} props.processingTime - 処理時間（秒）
 * @param {Function} props.onConfirm - 確認完了時のコールバック
 * @param {Function} props.onCancel - キャンセル時のコールバック
 * @param {Function} props.onEdit - 編集完了時のコールバック（編集済みテキストを渡す）
 * @param {boolean} props.isVisible - 表示/非表示
 */
const TranscriptionReview = ({ 
  transcription, 
  fileName,
  processingTime,
  onConfirm, 
  onCancel, 
  onEdit,
  isVisible = false 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(transcription);
  const [showFullText, setShowFullText] = useState(false);

  if (!isVisible) return null;

  const handleSaveEdit = () => {
    setIsEditing(false);
    onEdit(editedText);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText(transcription);
  };

  const handleConfirm = () => {
    const finalText = isEditing ? editedText : transcription;
    onConfirm(finalText);
  };

  const getTextStats = (text) => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const chars = text.length;
    
    return { lines, words: words.length, chars };
  };

  const stats = getTextStats(editedText);
  const previewText = showFullText ? editedText : editedText.substring(0, 500);
  const isLongText = editedText.length > 500;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                文字起こし結果の確認
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <MicIcon />
                  <span className="ml-1">{fileName}</span>
                </div>
                <div>
                  処理時間: {Math.round(processingTime)}秒
                </div>
                <div>
                  {stats.chars}文字 / {stats.words}語 / {stats.lines}行
                </div>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* 本文表示・編集エリア */}
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <FileTextIcon />
              <span className="font-medium text-gray-700">
                文字起こし結果
              </span>
              {!isEditing && (
                <span className="text-xs text-gray-500">
                  ※ 内容を確認し、必要に応じて編集してください
                </span>
              )}
            </div>
            
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Edit3Icon />
                <span className="ml-1">編集</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center px-3 py-1 text-sm text-green-600 hover:text-green-800 transition-colors"
                >
                  <CheckIcon />
                  <span className="ml-1">保存</span>
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  <XIcon />
                  <span className="ml-1">キャンセル</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-hidden">
            {isEditing ? (
              <textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full h-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm leading-relaxed"
                placeholder="文字起こし結果を編集してください..."
              />
            ) : (
              <div className="h-full overflow-auto">
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800 font-mono">
                    {previewText}
                    {isLongText && !showFullText && (
                      <span className="text-gray-500">
                        ...\n\n(続きがあります)
                      </span>
                    )}
                  </pre>
                  
                  {isLongText && (
                    <div className="mt-4 text-center">
                      <button
                        onClick={() => setShowFullText(!showFullText)}
                        className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {showFullText ? '最初の部分のみ表示' : '全文を表示'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 注意事項 */}
        <div className="px-6 py-3 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-start">
            <div className="text-yellow-600 mr-2">⚠️</div>
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">確認ポイント:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>固有名詞（人名、地名、組織名など）が正しく認識されているか</li>
                <li>専門用語や略語が適切に文字起こしされているか</li>
                <li>発言者の意図が正確に反映されているか</li>
                <li>重要な数値や日時が正しく記録されているか</li>
              </ul>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              この内容で議事録生成とカード化を行います
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                disabled={isEditing}
              >
                <CheckIcon />
                <span className="ml-2">確認完了 - 議事録を生成</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptionReview;