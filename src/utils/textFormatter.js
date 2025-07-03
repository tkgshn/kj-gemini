// テキスト表示フォーマット関数
export const formatAsText = (data) => {
  if (!data || !data.groups) {
    return '表示するデータがありません';
  }
  
  const challengeGroups = data.groups.filter(group => group.type === 'challenge');
  
  let text = '';
  
  challengeGroups.forEach((group, index) => {
    // 新しいデータ構造に対応
    const challenges = group.challenges || [];
    const solutions = group.solutions || {};
    const personalItems = solutions.personal || [];
    const communityItems = solutions.community || [];
    const governmentItems = solutions.government || [];
    
    text += '—\n';
    text += `課題: ${group.title}\n`;
    
    // 課題を表示
    if (challenges.length > 0) {
      text += '現状の課題:\n';
      challenges.forEach(challenge => text += `- ${challenge.text}\n`);
      text += '\n';
    }
    
    // 解決策を表示
    if (personalItems.length > 0) {
      text += '個人の取り組み:\n';
      personalItems.forEach(item => text += `- ${item.text}\n`);
    }
    
    if (communityItems.length > 0) {
      text += '地域の取り組み:\n';
      communityItems.forEach(item => text += `- ${item.text}\n`);
    }
    
    if (governmentItems.length > 0) {
      text += '行政の取り組み:\n';
      governmentItems.forEach(item => text += `- ${item.text}\n`);
    }
    
    text += '—\n';
    if (index < challengeGroups.length - 1) text += '\n';
  });
  
  // グループ化されていないカードを表示
  if (data.ungroupedCards && data.ungroupedCards.length > 0) {
    text += '\nその他:\n';
    data.ungroupedCards.forEach(card => text += `- ${card.text}\n`);
  }
  
  return text;
};