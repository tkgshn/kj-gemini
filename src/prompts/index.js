// LLMプロンプト中央管理ファイル
// 全てのプロンプトをここから一元管理する

// 議事録生成関連
export {
  generateMeetingMinutesPrompt,
  meetingMinutesSchema
} from './minutes/meetingMinutesGenerator.js';

// 文字起こし関連
export {
  BASE_MEETING_TRANSCRIPTION_PROMPT,
  generateChunkTranscriptionPrompt,
  DEFAULT_WHISPER_OPTIONS,
  SPECIALIZED_PROMPTS
} from './transcription/whisperPrompts.js';

// カード生成関連
export {
  generateCardsFromMinutesPrompt,
  generateCardsFromTextPrompt,
  cardGenerationSchema
} from './chunking/cardGenerationPrompts.js';

/**
 * プロンプト管理用ユーティリティ関数
 */
export const PromptManager = {
  /**
   * 会議タイプに応じた文字起こしプロンプトを取得
   * @param {string} meetingType - 会議タイプ
   * @returns {string} - 適切なプロンプト
   */
  getTranscriptionPrompt: (meetingType = 'default') => {
    switch (meetingType) {
      case 'personal_engagement':
        return SPECIALIZED_PROMPTS.PERSONAL_ENGAGEMENT_MEETING;
      case 'improvement_proposal':
        return SPECIALIZED_PROMPTS.IMPROVEMENT_PROPOSAL_MEETING;
      case 'discussion':
        return SPECIALIZED_PROMPTS.DISCUSSION_FOCUSED;
      default:
        return BASE_MEETING_TRANSCRIPTION_PROMPT;
    }
  },

  /**
   * チャンク用プロンプトを生成
   * @param {number} index - チャンクインデックス
   * @param {number} start - 開始時間
   * @param {number} end - 終了時間
   * @param {string} meetingType - 会議タイプ
   * @returns {string} - チャンク用プロンプト
   */
  getChunkPrompt: (index, start, end, meetingType = 'default') => {
    const basePrompt = PromptManager.getTranscriptionPrompt(meetingType);
    return generateChunkTranscriptionPrompt(index, start, end, basePrompt);
  },

  /**
   * 議事録生成プロンプトを取得
   * @param {string} transcription - 文字起こしテキスト
   * @param {string} meetingType - 会議タイプ
   * @returns {string} - 議事録生成プロンプト
   */
  getMinutesPrompt: (transcription, meetingType = 'personal_engagement') => {
    // 将来的に会議タイプ別のプロンプトを追加可能
    return generateMeetingMinutesPrompt(transcription);
  },

  /**
   * カード生成プロンプトを取得
   * @param {string} content - 元コンテンツ
   * @param {string} sourceType - ソースタイプ
   * @returns {string} - カード生成プロンプト
   */
  getCardGenerationPrompt: (content, sourceType) => {
    if (sourceType === 'audio_transcription') {
      return generateCardsFromMinutesPrompt(content);
    }
    return generateCardsFromTextPrompt(content, sourceType);
  }
};