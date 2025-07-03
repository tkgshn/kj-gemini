// Helper function to get source type display name
export const getSourceTypeDisplayName = (sourceType) => {
  switch (sourceType) {
    case 'discussion':
      return '会議';
    case 'proposal_sheet':
      return '提案シート';
    case 'audio_transcription':
      return '音声';
    default:
      return '不明';
  }
};