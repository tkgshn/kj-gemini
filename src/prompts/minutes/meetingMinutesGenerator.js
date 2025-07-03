// 議事録生成用プロンプト
// ユーザー要求仕様に基づく自分ごと化会議専用のプロンプト

/**
 * 自分ごと化会議の音声文字起こしから議事録を生成するプロンプト
 * @param {string} transcription - 文字起こしテキスト
 * @returns {string} - 構造化された議事録生成プロンプト
 */
export const generateMeetingMinutesPrompt = (transcription) => {
  return `以下は、自分ごと化会議の音声を文字起こししたものです。これをもとに会議の概要をなるべく情報量が大きくなるようにまとめてください。前後の文脈を踏まえた上で、構造化してください。
論点の整理は、賛成意見や反対意見などを整理し、インサイトは別に書いてください。会議の全部のログを清書したもの・反対意見の構造化などのまとめは別にまとめてください。

${transcription}`;
};

/**
 * レスポンススキーマ定義 - 議事録構造化用
 */
export const meetingMinutesSchema = {
  type: "OBJECT",
  properties: {
    summary: {
      type: "STRING",
      description: "会議の概要・要旨"
    },
    keyPoints: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          point: { type: "STRING", description: "主要論点" },
          supportingOpinions: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "賛成意見"
          },
          opposingOpinions: {
            type: "ARRAY", 
            items: { type: "STRING" },
            description: "反対意見"
          }
        },
        required: ["point", "supportingOpinions", "opposingOpinions"]
      },
      description: "論点と意見の整理"
    },
    insights: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "会議から得られたインサイト・気づき"
    },
    cleanedTranscript: {
      type: "STRING",
      description: "会議ログの清書版（発言者の意図が明確になるよう整理）"
    },
    oppositionStructure: {
      type: "ARRAY",
      items: {
        type: "OBJECT", 
        properties: {
          issue: { type: "STRING", description: "争点" },
          arguments: {
            type: "ARRAY",
            items: { type: "STRING" },
            description: "反対論理の構造化"
          }
        },
        required: ["issue", "arguments"]
      },
      description: "反対意見の構造化"
    }
  },
  required: ["summary", "keyPoints", "insights", "cleanedTranscript", "oppositionStructure"]
};