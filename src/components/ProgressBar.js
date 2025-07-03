import React from 'react';
import { XIcon, MicIcon, DatabaseIcon, BotIcon } from './Icons';

/**
 * 音声処理用の詳細進捗表示コンポーネント
 */
const ProgressBar = ({
  isVisible,
  onCancel,
  progress = {},
  title = "音声処理中...",
  showCancel = true
}) => {
  if (!isVisible) return null;

  const {
    stage = '準備中',
    progress: progressValue = 0,
    backend = 'WASM',
    currentChunk = 0,
    totalChunks = 0,
    chunkProgress = 0,
    overallProgress = 0,
    estimatedTimeRemaining = null,
    file = '',
    loaded = 0,
    total = 0,
    completed = false,
    successCount = 0,
    errorCount = 0,
    totalDuration = 0,
    averageSpeed = 0
  } = progress;

  // 進捗値の正規化（0-100%）
  const normalizedProgress = Math.min(Math.max(progressValue * 100, 0), 100);
  const normalizedOverallProgress = Math.min(Math.max(overallProgress * 100, 0), 100);
  const normalizedChunkProgress = Math.min(Math.max(chunkProgress * 100, 0), 100);

  // 時間フォーマット関数
  const formatTime = (seconds) => {
    if (!seconds || seconds < 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ファイルサイズフォーマット関数
  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // バックエンドアイコンの取得
  const getBackendIcon = () => {
    switch (backend) {
      case 'WebGPU':
        return <span className="text-green-600">🚀</span>;
      case 'WASM':
        return <span className="text-blue-600">⚙️</span>;
      default:
        return <BotIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  // フェーズ表示名の取得
  const getPhaseDisplayName = (phase) => {
    switch (phase) {
      case 'preparation':
        return 'ファイル準備';
      case 'chunking':
        return 'ファイル分割';
      case 'transcription':
        return '音声文字起こし';
      case 'minutes_generation':
        return '議事録生成';
      case 'card_creation':
        return 'カード作成';
      case 'completed':
        return '完了';
      default:
        return phase || '処理中';
    }
  };

  // ステージアイコンの取得
  const getStageIcon = () => {
    if (stage.includes('ダウンロード')) {
      return <DatabaseIcon className="w-4 h-4 text-blue-600" />;
    } else if (stage.includes('音声') || stage.includes('チャンク')) {
      return <MicIcon className="w-4 h-4 text-green-600" />;
    } else {
      return <BotIcon className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className={!completed ? 'animate-spin' : ''}>{getStageIcon()}</div>
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            {getBackendIcon()}
          </div>
          {showCancel && onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="処理をキャンセル"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ステージ表示 */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span className="font-medium">{stage}</span>
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              {backend}
            </span>
          </div>
        </div>

        {/* メイン進捗バー */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>全体進捗</span>
            <span>{Math.round(normalizedOverallProgress || normalizedProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ease-out ${
                completed 
                  ? 'bg-green-600' 
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 relative'
              }`}
              style={{ width: `${normalizedOverallProgress || normalizedProgress}%` }}
            >
              {!completed && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
              )}
            </div>
          </div>
        </div>

        {/* チャンク処理の詳細（チャンク処理時のみ表示） */}
        {totalChunks > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>チャンク進捗</span>
              <span>{currentChunk}/{totalChunks}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${normalizedChunkProgress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500">
              現在のチャンク: {Math.round(normalizedChunkProgress)}%
            </div>
          </div>
        )}

        {/* ファイル情報 */}
        {file && total > 0 && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-700 mb-1 truncate" title={file}>
              📁 {file}
            </div>
            <div className="text-xs text-gray-500">
              {formatFileSize(loaded)} / {formatFileSize(total)}
            </div>
            {progress.phase && (
              <div className="text-xs text-blue-600 mt-1">
                フェーズ: {getPhaseDisplayName(progress.phase)} 
                {progress.phaseProgress !== undefined && 
                  ` (${Math.round(progress.phaseProgress * 100)}%)`
                }
              </div>
            )}
          </div>
        )}

        {/* 時間情報 */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
            <div className="text-center p-2 bg-yellow-50 rounded">
              <div className="text-yellow-700 font-medium">残り時間</div>
              <div className="text-yellow-600">{formatTime(estimatedTimeRemaining)}</div>
            </div>
          )}
          {averageSpeed > 0 && (
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="text-green-700 font-medium">処理速度</div>
              <div className="text-green-600">{averageSpeed.toFixed(1)} MB/s</div>
            </div>
          )}
        </div>

        {/* 完了時の統計情報 */}
        {completed && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-green-800 font-medium mb-2">✅ 処理完了</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
              <div>成功: {successCount}</div>
              <div>エラー: {errorCount}</div>
              <div>処理時間: {totalDuration.toFixed(1)}秒</div>
              <div>平均速度: {averageSpeed.toFixed(1)} MB/s</div>
            </div>
          </div>
        )}

        {/* WebGPU使用時の特別表示 */}
        {backend === 'WebGPU' && (
          <div className="mt-3 p-2 bg-gradient-to-r from-green-50 to-blue-50 rounded border border-green-200">
            <div className="text-xs text-green-700 flex items-center">
              <span className="mr-1">🚀</span>
              WebGPU加速により高速処理中
            </div>
          </div>
        )}

        {/* キャンセルボタン（下部） */}
        {showCancel && onCancel && !completed && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
            >
              処理をキャンセル
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
