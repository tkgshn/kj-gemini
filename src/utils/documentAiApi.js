/**
 * Google Cloud Document AI API utilities
 */

const API_BASE_URL = process.env.REACT_APP_DOCUMENT_AI_URL || 
  (process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5001/api');

/**
 * Document AIサーバーのヘルスチェック
 */
export const checkDocumentAiHealth = async () => {
  // 本番環境では常に接続済みとして扱う
  if (process.env.NODE_ENV === 'production') {
    return { status: 'ok', environment: 'production' };
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Document AI health check failed:', error);
    throw error;
  }
};

/**
 * ファイルをDocument AIで処理してカードデータを取得
 * @param {File} file - 処理するファイル
 * @param {Function} onProgress - 進捗コールバック（オプション）
 * @returns {Promise<Object>} 処理結果とカードデータ
 */
export const processDocumentWithAI = async (file, onProgress = null) => {
  try {
    // サポートされているファイル形式をチェック
    const supportedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!supportedTypes.includes(file.type)) {
      throw new Error(`サポートされていないファイル形式です: ${file.type}`);
    }

    // ファイルサイズチェック（16MB制限）
    const maxSize = 16 * 1024 * 1024; // 16MB
    if (file.size > maxSize) {
      throw new Error(`ファイルサイズが大きすぎます。16MB以下のファイルを選択してください。`);
    }

    // FormDataを作成
    const formData = new FormData();
    formData.append('file', file);

    // 進捗を報告
    if (onProgress) {
      onProgress(10, 'ファイルをアップロード中...');
    }

    // APIリクエストを送信
    const response = await fetch(`${API_BASE_URL}/process-document`, {
      method: 'POST',
      body: formData,
    });

    if (onProgress) {
      onProgress(50, 'Document AIで処理中...');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (onProgress) {
      onProgress(90, 'データを処理中...');
    }

    if (!result.success) {
      throw new Error(result.error || 'Document AI処理でエラーが発生しました');
    }

    if (onProgress) {
      onProgress(100, '完了');
    }

    return {
      success: true,
      cards: result.cards || [],
      extractedData: result.extracted_data || {},
      fileInfo: result.file_info || {},
      stats: {
        totalCards: result.cards?.length || 0,
        textCards: result.cards?.filter(card => card.data_type === 'text').length || 0,
        formCards: result.cards?.filter(card => card.data_type === 'form_field').length || 0,
        tableCards: result.cards?.filter(card => card.data_type === 'table').length || 0,
      }
    };

  } catch (error) {
    console.error('Document AI processing error:', error);
    if (onProgress) {
      onProgress(0, `エラー: ${error.message}`);
    }
    throw error;
  }
};

/**
 * ファイル形式のバリデーション
 * @param {File} file - チェックするファイル
 * @returns {Object} バリデーション結果
 */
export const validateDocumentFile = (file) => {
  const supportedExtensions = ['pdf', 'png', 'jpg', 'jpeg'];
  const supportedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  const maxSize = 16 * 1024 * 1024; // 16MB

  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (!fileExtension || !supportedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: `サポートされていないファイル形式です。対応形式: ${supportedExtensions.join(', ')}`
    };
  }

  if (!supportedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `サポートされていないMIMEタイプです: ${file.type}`
    };
  }

  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `ファイルサイズが大きすぎます。16MB以下のファイルを選択してください。`
    };
  }

  return {
    isValid: true,
    fileExtension,
    sizeInMB: (file.size / (1024 * 1024)).toFixed(2)
  };
};

/**
 * ファイルサイズを人間が読める形式にフォーマット
 * @param {number} bytes - バイト数
 * @returns {string} フォーマットされたサイズ
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};