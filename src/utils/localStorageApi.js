// Local Storage API for KJ Cards and Groups
const STORAGE_KEYS = {
  CARDS: 'kj_cards',
  GROUPS: 'kj_groups',
  USER_ID: 'kj_user_id'
};

// ユニークIDを生成
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

// ユーザーIDを取得または生成
export const getUserId = () => {
  let userId = localStorage.getItem(STORAGE_KEYS.USER_ID);
  if (!userId) {
    userId = `user_${generateId()}`;
    localStorage.setItem(STORAGE_KEYS.USER_ID, userId);
  }
  return userId;
};

// カードデータの操作
export const cardsAPI = {
  // 全カードを取得
  getAll: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CARDS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting cards from localStorage:', error);
      return [];
    }
  },

  // カードを追加
  add: (cardData) => {
    try {
      const cards = cardsAPI.getAll();
      const newCard = {
        id: generateId(),
        ...cardData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      cards.push(newCard);
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
      return newCard;
    } catch (error) {
      console.error('Error adding card to localStorage:', error);
      throw error;
    }
  },

  // 複数カードを一括追加
  addMultiple: (cardsData) => {
    try {
      const cards = cardsAPI.getAll();
      const newCards = cardsData.map(cardData => ({
        id: generateId(),
        ...cardData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      cards.push(...newCards);
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
      return newCards;
    } catch (error) {
      console.error('Error adding multiple cards to localStorage:', error);
      throw error;
    }
  },

  // カードを更新
  update: (cardId, updateData) => {
    try {
      const cards = cardsAPI.getAll();
      const cardIndex = cards.findIndex(card => card.id === cardId);
      if (cardIndex !== -1) {
        cards[cardIndex] = {
          ...cards[cardIndex],
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(cards));
        return cards[cardIndex];
      }
      return null;
    } catch (error) {
      console.error('Error updating card in localStorage:', error);
      throw error;
    }
  },

  // カードを削除
  delete: (cardId) => {
    try {
      const cards = cardsAPI.getAll();
      const filteredCards = cards.filter(card => card.id !== cardId);
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(filteredCards));
      return true;
    } catch (error) {
      console.error('Error deleting card from localStorage:', error);
      throw error;
    }
  },

  // 全カードを削除
  deleteAll: () => {
    try {
      localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('Error deleting all cards from localStorage:', error);
      throw error;
    }
  }
};

// グループデータの操作
export const groupsAPI = {
  // 全グループを取得
  getAll: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.GROUPS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting groups from localStorage:', error);
      return [];
    }
  },

  // グループを追加
  add: (groupData) => {
    try {
      const groups = groupsAPI.getAll();
      const newGroup = {
        id: generateId(),
        ...groupData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      groups.push(newGroup);
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
      return newGroup;
    } catch (error) {
      console.error('Error adding group to localStorage:', error);
      throw error;
    }
  },

  // グループを更新
  update: (groupId, updateData) => {
    try {
      const groups = groupsAPI.getAll();
      const groupIndex = groups.findIndex(group => group.id === groupId);
      if (groupIndex !== -1) {
        groups[groupIndex] = {
          ...groups[groupIndex],
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(groups));
        return groups[groupIndex];
      }
      return null;
    } catch (error) {
      console.error('Error updating group in localStorage:', error);
      throw error;
    }
  },

  // グループを削除
  delete: (groupId) => {
    try {
      const groups = groupsAPI.getAll();
      const filteredGroups = groups.filter(group => group.id !== groupId);
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(filteredGroups));
      return true;
    } catch (error) {
      console.error('Error deleting group from localStorage:', error);
      throw error;
    }
  },

  // 全グループを削除
  deleteAll: () => {
    try {
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('Error deleting all groups from localStorage:', error);
      throw error;
    }
  }
};

// データエクスポート・インポート機能
export const dataAPI = {
  // 全データをエクスポート
  export: () => {
    return {
      cards: cardsAPI.getAll(),
      groups: groupsAPI.getAll(),
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
  },

  // データをインポート
  import: (data) => {
    try {
      if (data.cards) {
        localStorage.setItem(STORAGE_KEYS.CARDS, JSON.stringify(data.cards));
      }
      if (data.groups) {
        localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify(data.groups));
      }
      return true;
    } catch (error) {
      console.error('Error importing data to localStorage:', error);
      throw error;
    }
  },

  // 全データをクリア
  clearAll: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.CARDS);
      localStorage.removeItem(STORAGE_KEYS.GROUPS);
      localStorage.removeItem(STORAGE_KEYS.USER_ID);
      return true;
    } catch (error) {
      console.error('Error clearing all data from localStorage:', error);
      throw error;
    }
  }
};
