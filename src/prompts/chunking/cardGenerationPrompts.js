// KJ法カード生成用プロンプト管理

/**
 * 議事録からKJ法カード生成用プロンプト
 * @param {string} meetingMinutes - 構造化済み議事録
 * @returns {string} - カード生成プロンプト
 */
export const generateCardsFromMinutesPrompt = (meetingMinutes) => {
  return `以下の議事録から、KJ法で使用するカードを生成してください。各カードは一つの意見、提案、課題、または解決策を表し、後でグループ化できるように適切なサイズに分割してください。

議事録:
\`\`\`
${meetingMinutes}
\`\`\`

以下の観点でカードを生成してください：
1. 課題・問題点を表すカード
2. 解決策・提案を表すカード  
3. 意見・コメントを表すカード
4. 決定事項・合意事項を表すカード

各カードには以下の情報を含めてください：
- カードの内容（50-100文字程度）
- カードの種類（課題/解決策/意見/決定事項）
- 発言者の立場（住民/行政/地域団体/専門家/不明）
- 関連性のあるキーワード`;
};

/**
 * カード生成用レスポンススキーマ
 */
export const cardGenerationSchema = {
  type: "OBJECT",
  properties: {
    cards: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          content: {
            type: "STRING",
            description: "カードの内容（50-100文字程度）"
          },
          type: {
            type: "STRING",
            enum: ["課題", "解決策", "意見", "決定事項"],
            description: "カードの種類"
          },
          perspective: {
            type: "STRING",
            enum: ["住民", "行政", "地域団体", "専門家", "不明"],
            description: "発言者の立場"
          },
          keywords: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "関連キーワード"
          },
          isChallenge: {
            type: "BOOLEAN",
            description: "課題を表すカードかどうか"
          }
        },
        required: ["content", "type", "perspective", "keywords", "isChallenge"]
      }
    },
    summary: {
      type: "STRING", 
      description: "生成されたカードの概要"
    }
  },
  required: ["cards", "summary"]
};

/**
 * 既存のテキストからカード生成用プロンプト（従来機能との互換性）
 * @param {string} inputText - 入力テキスト
 * @param {string} sourceType - ソースタイプ（'discussion' or 'proposal_sheet'）
 * @returns {string} - カード生成プロンプト
 */
export const generateCardsFromTextPrompt = (inputText, sourceType) => {
  const sourceDescription = sourceType === 'discussion' 
    ? '会議のディスカッション内容'
    : '改善提案シート';

  return `以下の${sourceDescription}から、KJ法で使用するカードを生成してください。各カードは一つの意見、提案、課題、または解決策を表し、後でグループ化できるように適切なサイズに分割してください。

${sourceDescription}:
\`\`\`
${inputText}
\`\`\`

各カードには以下の情報を含めてください：
- カードの内容（50-100文字程度）
- カードの種類（課題/解決策/意見/決定事項）
- 発言者の立場（住民/行政/地域団体/専門家/不明）
- 関連性のあるキーワード`;
};