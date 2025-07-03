import React, { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ReactMarkdown from 'react-markdown';

// Import configurations and utilities
import { callGeminiAPI } from './utils/geminiApi';
import { cardsAPI, groupsAPI, getUserId } from './utils/localStorageApi';
import { processDocumentWithAI, validateDocumentFile, checkDocumentAiHealth, formatFileSize } from './utils/documentAiApi';
import { sampleDiscussionText, sampleProposalSheetText } from './data/sampleData';
import { BotIcon, Trash2Icon, DatabaseIcon, MicIcon, ScanTextIcon, StickyNoteIcon, XIcon } from './components/Icons';
import ProgressBar from './components/ProgressBar';
import FileDropZone from './components/FileDropZone';
import DocumentPreview from './components/DocumentPreview';
import OcrResultsTable from './components/OcrResultsTable';

// Import extracted components
import Canvas from './components/canvas/Canvas';
import TableView from './components/views/TableView';
import useHistory from './hooks/useHistory';const App = () => {
  const [inputText, setInputText] = useState('');
  const [sourceType, setSourceType] = useState('discussion');
  const [cards, setCards] = useState([]);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('読み込み中...');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [userId, setUserId] = useState(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedCards, setSelectedCards] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [showInputModal, setShowInputModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [currentView, setCurrentView] = useState('canvas'); // 'canvas' or 'json'


  // 進捗表示関連の状態
  const [showProgressBar, setShowProgressBar] = useState(false);
  const [progressData, setProgressData] = useState({});
  const [progressTitle, setProgressTitle] = useState('');

  // Document AI関連の状態
  const [showDocumentAiModal, setShowDocumentAiModal] = useState(false);
  const [selectedDocumentFile, setSelectedDocumentFile] = useState(null);
  const [documentAiProgress, setDocumentAiProgress] = useState(null);
  const [isDocumentAiServerReady, setIsDocumentAiServerReady] = useState(true);
  const [documentOcrResults, setDocumentOcrResults] = useState(null);
  const [documentModalStep, setDocumentModalStep] = useState('upload'); // 'upload', 'preview', 'results', 'markdown-preview'
  const [markdownPreviewData, setMarkdownPreviewData] = useState(null);

  // 音声文字起こし関連の状態
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [selectedAudioFile, setSelectedAudioFile] = useState(null);
  const [showWhisperAXModal, setShowWhisperAXModal] = useState(false);
  const [whisperAXResult, setWhisperAXResult] = useState(null);

  // History management
  const { saveState, undo, redo, canUndo, canRedo } = useHistory();

  // Load data from localStorage
  const loadDataFromStorage = useCallback(() => {
    try {
      const storedCards = cardsAPI.getAll();
      const storedGroups = groupsAPI.getAll();
      setCards(storedCards);
      setGroups(storedGroups);
      // Save initial state after loading
      if (storedCards.length > 0 || storedGroups.length > 0) {
        setTimeout(() => saveState(storedCards, storedGroups, 'Initial load'), 100);
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
      setError("データの読み込みエラー: " + error.message);
    }
  }, [saveState]);

  // Initialize user and load data from localStorage
  useEffect(() => {
    const userId = getUserId();
    setUserId(userId);

    // Load data from localStorage
    loadDataFromStorage();
  }, [loadDataFromStorage]);

  // Undo/Redo functions
  const handleUndo = useCallback(() => {
    const previousState = undo();
    if (previousState) {
      setCards(previousState.cards);
      setGroups(previousState.groups);
      // Update localStorage
      previousState.cards.forEach(card => cardsAPI.update(card.id, card));
      previousState.groups.forEach(group => groupsAPI.update(group.id, group));
    }
  }, [undo]);

  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setCards(nextState.cards);
      setGroups(nextState.groups);
      // Update localStorage
      nextState.cards.forEach(card => cardsAPI.update(card.id, card));
      nextState.groups.forEach(group => groupsAPI.update(group.id, group));
    }
  }, [redo]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Set sample data when modal opens
  useEffect(() => {
    if (showInputModal) {
      if (sourceType === 'discussion') {
        setInputText(sampleDiscussionText);
      } else {
        setInputText(sampleProposalSheetText);
      }
    }
  }, [showInputModal, sourceType]);

  // Document AI機能は常に有効（実際の処理時にエラーハンドリング）

  // Helper function to detect if input text is JSON format for proposal sheets
  const isProposalSheetJSON = (text) => {
    if (!text || typeof text !== 'string') return false;
    try {
      const data = JSON.parse(text);
      return data.tables && Array.isArray(data.tables) && data.tables.length > 0;
    } catch (e) {
      return false;
    }
  };

  // Helper function to get button text based on input and source type
  const getButtonText = () => {
    if (isLoading && loadingMessage.includes("分割中")) {
      return loadingMessage;
    }
    if (isLoading && loadingMessage.includes("処理中")) {
      return loadingMessage;
    }
    if (sourceType === 'proposal_sheet' && isProposalSheetJSON(inputText)) {
      return 'カードとしてインポート';
    }
    return 'チャンク化開始';
  };

    // Text segmentation function
  // Process structured JSON data for improvement proposal sheets with automatic clustering
  const handleProposalSheetJSON = async (jsonData) => {
    if (!jsonData || !jsonData.tables || !userId) {
      setError("有効なJSONデータがありません。");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("改善提案シートを処理中...");
    setError(null);

    try {
      let currentX = 50, currentY = 50;
      const cardWidth = 200, cardHeight = 120, spacing = 30;
      const sourceIdentifierBase = `proposal_${Date.now()}`;

      const newCardsData = [];

      jsonData.tables.forEach((table, tableIndex) => {
        // Extract challenge/issue from the table
        const challengeRow = table.data.find(row =>
          row[0]?.includes('現状の課題') || row[0]?.includes('課題')
        );

        if (challengeRow && challengeRow[2]) {
          // Create challenge card
          newCardsData.push({
            text: challengeRow[2],
            x: currentX,
            y: currentY,
            width: cardWidth,
            height: cardHeight,
            groupId: null,
            sourceType: 'proposal_sheet',
            sourceIdentifier: `${sourceIdentifierBase}_table${tableIndex}_challenge`,
            isChallenge: true,
            solutionPerspective: null,
            perspectiveRaw: "課題",
            typeRaw: "課題",
            reasoning: "改善提案シートの現状の課題として識別"
          });

          currentX += cardWidth + spacing;
          if (currentX + cardWidth > (window.innerWidth * 0.8) / scale - pan.x) {
            currentX = 50;
            currentY += cardHeight + spacing;
          }
        }

        // Extract solutions by perspective
        const solutionRows = table.data.filter(row =>
          row[1]?.includes('できること') ||
          (row[0]?.includes('解決') && row[1])
        );

        solutionRows.forEach(row => {
          if (row[2] && row[2].trim()) {
            let solutionPerspective = null;
            let perspectiveRaw = "不明";

            if (row[1]?.includes('個人') || row[1]?.includes('私')) {
              solutionPerspective = "自分ができること";
              perspectiveRaw = "住民";
            } else if (row[1]?.includes('地域')) {
              solutionPerspective = "地域ができること";
              perspectiveRaw = "地域団体";
            } else if (row[1]?.includes('行政')) {
              solutionPerspective = "行政ができること";
              perspectiveRaw = "行政";
            }

            newCardsData.push({
              text: row[2],
              x: currentX,
              y: currentY,
              width: cardWidth,
              height: cardHeight,
              groupId: null,
              sourceType: 'proposal_sheet',
              sourceIdentifier: `${sourceIdentifierBase}_table${tableIndex}_solution${solutionRows.indexOf(row)}`,
              isChallenge: false,
              solutionPerspective: solutionPerspective,
              perspectiveRaw: perspectiveRaw,
              typeRaw: "解決策",
              reasoning: `改善提案シートの${row[1]}として識別`
            });

            currentX += cardWidth + spacing;
            if (currentX + cardWidth > (window.innerWidth * 0.8) / scale - pan.x) {
              currentX = 50;
              currentY += cardHeight + spacing;
            }
            }
        });
      });

      if (newCardsData.length > 0) {
        // Add cards to localStorage
        const newCards = cardsAPI.addMultiple(newCardsData);
        const updatedCards = [...cards, ...newCards];

        // Create automatic groups by challenge-solution clusters
        const newGroups = [];
        const challengeCards = newCards.filter(card => card.isChallenge);

        challengeCards.forEach((challengeCard, index) => {
          // Find solution cards from the same table
          const tableIndex = parseInt(challengeCard.sourceIdentifier.split('_table')[1]?.split('_')[0]);
          const solutionCards = newCards.filter(card =>
            !card.isChallenge &&
            card.sourceIdentifier.includes(`_table${tableIndex}_`)
          );

          if (solutionCards.length > 0) {
            // Calculate group position and size
            const allCards = [challengeCard, ...solutionCards];
            const minX = Math.min(...allCards.map(c => c.x));
            const maxX = Math.max(...allCards.map(c => c.x + c.width));
            const minY = Math.min(...allCards.map(c => c.y));
            const maxY = Math.max(...allCards.map(c => c.y + c.height));

            const groupData = {
              title: `課題${index + 1}: ${challengeCard.text.substring(0, 20)}...`,
              x: minX - 20,
              y: minY - 30,
              width: maxX - minX + 40,
              height: maxY - minY + 60,
              color: `hsl(${(index * 60) % 360}, 70%, 95%)`,
              sourceType: 'proposal_sheet',
              sourceIdentifier: `${sourceIdentifierBase}_group${index}`
            };

            const newGroup = groupsAPI.add(groupData);
            newGroups.push(newGroup);

            // Assign cards to group
            allCards.forEach(card => {
              card.groupId = newGroup.id;
              cardsAPI.update(card);
            });
          }
        });

        const updatedGroups = [...groups, ...newGroups];
        setCards(updatedCards);
        setGroups(updatedGroups);
        saveState(updatedCards, updatedGroups, `Added ${newCards.length} cards and ${newGroups.length} groups from structured proposal sheet`);

        setInputText('');
        setShowInputModal(false);
      } else {
        setError("構造化データから有効なカードを生成できませんでした。");
      }
    } catch (e) {
      console.error("改善提案シート処理エラー:", e);
      setError(`エラー: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSegmentText = async () => {
    if (!inputText.trim() || !userId) {
      setError("テキストが空です。");
      return;
    }

    // Check if the input is JSON data for proposal sheets
    if (sourceType === 'proposal_sheet') {
      try {
        const jsonData = JSON.parse(inputText);
        if (jsonData.tables && Array.isArray(jsonData.tables)) {
          await handleProposalSheetJSON(jsonData);
          return;
        }
      } catch (e) {
        // If parsing fails, continue with normal text processing
      }
    }

    setIsLoading(true);
    setLoadingMessage("文書内容を抽出・チャンク化中...");
    setError(null);

    const prompt = `あなたは会議の議事録や提案シートを分析するアシスタントです。以下のテキストから「重要な意見」「参加者の発言」「提案内容」「課題点」に該当する部分のみを抽出してください。会議の進行に関する情報（司会者の発言、議題の説明、時間管理、日付、場所など）や、意見ではない発言（例：「ありがとうございました」「質問はありますか」）は完全に無視してください。

抽出した各内容を、KJ法のカードとして使用できるよう、簡潔で意味の通じる独立したフレーズまたは短い文に分割してください。一つのカードには、一つのアイデアだけが含まれるように、できるだけ短く、具体的に分割してください。

さらに、各発言・意見・提案について、それが誰の立場からの発言かを以下の分類で判定してください：
- "住民": 住民、市民、参加者、地域住民などからの意見や要望
- "行政": 市役所、行政職員、自治体からの説明や提案
- "地域団体": 自治会、商店会、NPO、地域組織からの意見
- "専門家": 有識者、コンサルタント、専門家からの助言
- "不明": 発言者の立場が特定できない場合

また、各内容が「課題・問題点」なのか「解決策・提案」なのかも判定してください。

結果を以下の形式のJSONで返してください：
{
  "segments": [
    {
      "text": "抽出した内容",
      "perspective": "住民|行政|地域団体|専門家|不明",
      "type": "課題|解決策",
      "reasoning": "判定理由の簡潔な説明"
    }
  ]
}

内容がない場合は {"segments": []} を返してください。

テキスト:
\`\`\`
${inputText}
\`\`\`

JSON:`;

    const schema = {
      type: "OBJECT",
      properties: {
        segments: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              text: { type: "STRING" },
              perspective: { type: "STRING", enum: ["住民", "行政", "地域団体", "専門家", "不明"] },
              type: { type: "STRING", enum: ["課題", "解決策"] },
              reasoning: { type: "STRING" }
            },
            required: ["text", "perspective", "type"]
          }
        }
      },
      required: ["segments"]
    };

    try {
      const jsonResponse = await callGeminiAPI(prompt, schema);
      const segments = jsonResponse?.segments;

      if (segments && segments.length > 0) {
        let currentX = 50, currentY = 50;
        const cardWidth = 180, cardHeight = 100, spacing = 20;
        const sourceIdentifierBase = `input_${Date.now()}`;

        const newCardsData = [];
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];

          // Map perspective to solutionPerspective format
          const solutionPerspectiveMap = {
            "住民": "自分ができること",
            "行政": "行政ができること",
            "地域団体": "地域ができること",
            "専門家": null,
            "不明": null
          };

          newCardsData.push({
            text: segment.text || segment, // Support both old and new format
            x: currentX,
            y: currentY,
            width: cardWidth,
            height: cardHeight,
            groupId: null,
            sourceType: sourceType,
            sourceIdentifier: `${sourceIdentifierBase}_seg${i}`,
            isChallenge: segment.type === "課題",
            solutionPerspective: solutionPerspectiveMap[segment.perspective] || null,
            perspectiveRaw: segment.perspective, // Store original perspective for reference
            typeRaw: segment.type, // Store original type for reference
            reasoning: segment.reasoning, // Store reasoning for debugging
          });

          currentX += cardWidth + spacing;
          if (currentX + cardWidth > (window.innerWidth * 0.8) / scale - pan.x) {
            currentX = 50;
            currentY += cardHeight + spacing;
          }
        }

        // Add cards to localStorage
        const newCards = cardsAPI.addMultiple(newCardsData);
        const updatedCards = [...cards, ...newCards];
        setCards(updatedCards);
        saveState(updatedCards, groups, `Added ${newCards.length} cards`);

        setInputText('');
        setShowInputModal(false);
      } else {
        setError("LLMは重要な内容を抽出しませんでした。");
      }
    } catch (e) {
      console.error("テキスト分割エラー:", e);
      setError(`エラー: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Create cards from text (reusable function)
  const createCardsFromText = async (text, options = {}) => {
    const {
      sourceType: cardSourceType = 'audio_transcription',
      fileName = '',
      autoSaveAfterCreation = false
    } = options;

    console.log(`🔍 [カード作成] 開始: sourceType=${cardSourceType}, textLength=${text.length}`);

    const prompt = `あなたは会議の議事録を分析するアシスタントです。以下のテキストから「重要な意見」「参加者の発言」「提案内容」「課題点」に該当する部分のみを抽出してください。

抽出した各内容を、KJ法のカードとして使用できるよう、簡潔で意味の通じる独立したフレーズまたは短い文に分割してください。

さらに、各発言・意見・提案について、それが誰の立場からの発言かを以下の分類で判定してください：
- "住民": 住民、市民、参加者、地域住民などからの意見や要望
- "行政": 市役所、行政職員、自治体からの説明や提案
- "地域団体": 自治会、商店会、NPO、地域組織からの意見
- "専門家": 有識者、コンサルタント、専門家からの助言
- "不明": 発言者の立場が特定できない場合

また、各内容が「課題・問題点」なのか「解決策・提案」なのかも判定してください。

結果を以下の形式のJSONで返してください：
{
  "segments": [
    {
      "text": "抽出した内容",
      "perspective": "住民|行政|地域団体|専門家|不明",
      "type": "課題|解決策",
      "reasoning": "判定理由の簡潔な説明"
    }
  ]
}

テキスト:
\`\`\`
${text}
\`\`\`

JSON:`;

    const schema = {
      type: "OBJECT",
      properties: {
        segments: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              text: { type: "STRING" },
              perspective: { type: "STRING", enum: ["住民", "行政", "地域団体", "専門家", "不明"] },
              type: { type: "STRING", enum: ["課題", "解決策"] },
              reasoning: { type: "STRING" }
            },
            required: ["text", "perspective", "type"]
          }
        }
      },
      required: ["segments"]
    };

    try {
      const jsonResponse = await callGeminiAPI(prompt, schema);
      const segments = jsonResponse?.segments;

      if (segments && segments.length > 0) {
        let currentX = 50, currentY = 50;
        const cardWidth = 180, cardHeight = 100, spacing = 20;
        const sourceIdentifierBase = `${cardSourceType}_${Date.now()}`;

        const newCardsData = [];
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];

          const solutionPerspectiveMap = {
            "住民": "自分ができること",
            "行政": "行政ができること", 
            "地域団体": "地域ができること",
            "専門家": null,
            "不明": null
          };

          newCardsData.push({
            text: segment.text || segment,
            x: currentX,
            y: currentY,
            width: cardWidth,
            height: cardHeight,
            groupId: null,
            sourceType: cardSourceType,
            sourceIdentifier: `${sourceIdentifierBase}_seg${i}`,
            isChallenge: segment.type === "課題",
            solutionPerspective: solutionPerspectiveMap[segment.perspective] || null,
            perspectiveRaw: segment.perspective,
            typeRaw: segment.type,
            reasoning: segment.reasoning,
          });

          currentX += cardWidth + spacing;
          if (currentX + cardWidth > (window.innerWidth * 0.8) / scale - pan.x) {
            currentX = 50;
            currentY += cardHeight + spacing;
          }
        }

        const newCards = cardsAPI.addMultiple(newCardsData);
        const updatedCards = [...cards, ...newCards];
        setCards(updatedCards);
        
        if (autoSaveAfterCreation) {
          saveState(updatedCards, groups, `Added ${newCards.length} cards from ${cardSourceType}`);
        }

        console.log(`✅ [カード作成] 完了: ${newCards.length}枚のカード作成`);
        return newCards;
      } else {
        console.warn('❌ [カード作成] セグメントが抽出されませんでした');
        return [];
      }
    } catch (e) {
      console.error("カード作成エラー:", e);
      throw e;
    }
  };

  // Audio file selection handler
  const handleAudioFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const supportedTypes = ['audio/wav', 'audio/mp3', 'audio/aac', 'audio/ogg', 'audio/flac', 'audio/webm', 'audio/m4a', 'audio/mpeg'];
      if (!supportedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|aac|ogg|flac|webm|mpeg)$/i)) {
        setError("サポートされていないファイル形式です。対応形式: MP3, WAV, M4A, AAC, OGG, FLAC, WebM");
        return;
      }

      const warningSize = 500 * 1024 * 1024; // 500MB
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB

      if (file.size > maxSize) {
        setError(`ファイルサイズが大きすぎます。2GB以下のファイルを選択してください。（現在: ${formatFileSize(file.size)}）`);
        return;
      }

      if (file.size > warningSize) {
        const chunks = Math.ceil(file.size / (100 * 1024 * 1024));
        setError(`⚠️ 大きなファイル（${formatFileSize(file.size)}）が選択されました。${chunks}個のチャンクに分割して処理します。`);
      } else {
        setError(null);
      }

      setSelectedAudioFile(file);
    }
  };

  // WhisperAX processing function
  const handleWhisperAXProcess = async (transcriptionText) => {
    if (!transcriptionText.trim()) {
      setError("テキストが空です。");
      return null;
    }

    setIsLoading(true);
    setLoadingMessage("音声文字起こし内容から議事録を生成中...");
    setError(null);

    const prompt = `以下は、自分ごと化会議の音声を文字起こししたものです。これをもとに会議の概要をなるべく情報量が大きくなるようにまとめてください。前後の文脈を踏まえた上で、構造化してください。論点の整理は、賛成意見や反対意見などを整理し、インサイトは別に書いてください。会議の全部のログを清書したもの・反対意見の構造化などのまとめは別にまとめてください。

文字起こしテキスト:
\`\`\`
${transcriptionText}
\`\`\`

以下の形式で返してください：
1. 会議の概要
2. 議論の論点整理
3. 賛成意見・反対意見の構造化
4. インサイト
5. 会議ログの清書`;

    try {
      const response = await callGeminiAPI(prompt);
      return response;
    } catch (error) {
      console.error("WhisperAX処理エラー:", error);
      setError(`エラー: ${error.message}`);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Generate cards from WhisperAX minutes
  const handleWhisperAXCardGeneration = async (minutesText) => {
    if (!minutesText.trim()) {
      setError("議事録が空です。");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("議事録からカードを生成中...");
    setError(null);

    try {
      const newCards = await createCardsFromText(minutesText, {
        sourceType: 'audio_transcription',
        fileName: 'WhisperAX文字起こし',
        autoSaveAfterCreation: true
      });

      setSuccessMessage(`議事録から${newCards.length}枚のカードを作成しました！`);
      setTimeout(() => setSuccessMessage(''), 3000);
      
      // Close modal
      setShowWhisperAXModal(false);
      setWhisperAXResult(null);
      setInputText('');
    } catch (error) {
      console.error("カード生成エラー:", error);
      setError(`カード生成エラー: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Document AI file selection handler (for both input and drag&drop)
  const handleDocumentFileSelect = (file) => {
    if (file) {
      const validation = validateDocumentFile(file);
      if (!validation.isValid) {
        setError(validation.error);
        return;
      }

      setSelectedDocumentFile(file);
      setDocumentModalStep('preview');
      setError(null);

      // 改善提案シートの場合は自動でOCR処理を開始
      if (sourceType === 'proposal_sheet') {
        setTimeout(() => {
          // ファイルを直接パラメータとして渡すことで状態の非同期問題を回避
          handleDocumentAiProcess(file);
        }, 500); // UIの更新を待つため少し遅延
      }
    }
  };


  // Document AI processing handler
  const handleDocumentAiProcess = async (fileParam = null) => {
    const fileToProcess = fileParam || selectedDocumentFile;
    if (!fileToProcess) {
      setError("ファイルが選択されていません");
      return;
    }


    setIsLoading(true);
    setError(null);
    setDocumentModalStep('results');
    setShowProgressBar(true);
    setProgressTitle('Document AI処理中');

    try {
      const result = await processDocumentWithAI(fileToProcess, (progress, message) => {
        setDocumentAiProgress({ progress, message });
        setProgressData({
          progress,
          message,
          details: message
        });
      });

      if (result.success) {
        // Save OCR results for preview only (don't create cards yet)
        setDocumentOcrResults({
          extractedData: result.extractedData,
          stats: result.stats,
          cards: result.cards
        });

        // Move to results step for user confirmation
        setDocumentModalStep('results');
        console.log(`Document AI処理完了: ${result.cards.length}枚のカード候補を抽出`);
        console.log('カード候補:', result.cards);
      } else {
        throw new Error("Document AIから内容を抽出できませんでした");
      }

    } catch (error) {
      console.error("Document AI処理エラー:", error);
      setError(`Document AIエラー: ${error.message}`);
    } finally {
      setIsLoading(false);
      setShowProgressBar(false);
      setDocumentAiProgress(null);
    }
  };

  // Generate markdown preview from Document AI results
  const handleDocumentAiConfirm = async () => {
    if (!documentOcrResults || !documentOcrResults.cards || documentOcrResults.cards.length === 0) {
      setError("作成するカードがありません。");
      return;
    }

    try {
      // 改善提案シートの場合は、OCR結果を構造的に再処理してmarkdown形式で表示
      if (sourceType === 'proposal_sheet') {
        console.log('🔄 改善提案シート専用処理を開始 - マークダウンプレビュー生成');

        // OCR結果のテキストを結合
        const combinedText = documentOcrResults.extractedData?.raw_text ||
                            documentOcrResults.cards.map(card => card.text).join('\n');

        console.log('📋 OCR結合テキスト:', combinedText.substring(0, 500) + '...');

        // 構造化されたプレビュー生成処理
        const markdownPreview = await generateMarkdownPreview(combinedText, {
          sourceType: 'proposal_sheet',
          fileName: selectedDocumentFile.name
        });

        console.log('📄 マークダウンプレビュー生成完了');

        // マークダウンプレビューデータを保存
        setMarkdownPreviewData(markdownPreview);

        // マークダウンプレビューステップに移行
        setDocumentModalStep('markdown-preview');

      } else {
        // 通常のDocument AI処理の場合は従来通り
        const newCardsData = documentOcrResults.cards.map(card => ({
          ...card,
          x: card.x || 100 + Math.random() * 200,
          y: card.y || 100 + Math.random() * 200,
          sourceType: 'proposal_sheet_ai',
          width: card.width || 180,
          height: card.height || 100,
          groupId: null
        }));

        // Use cardsAPI to properly save to localStorage
        const newCards = cardsAPI.addMultiple(newCardsData);
        const updatedCards = [...cards, ...newCards];
        setCards(updatedCards);
        saveState(updatedCards, groups, `Document AI: ${newCards.length}枚のカードを追加`);

        console.log(`カード作成完了: ${newCards.length}枚のカードを追加`);
        console.log('作成されたカード:', newCards);

        // Show success message and close modal
        setSuccessMessage(`Document AI「${selectedDocumentFile.name}」から${newCards.length}枚のカードを作成しました！`);
        setTimeout(() => setSuccessMessage(''), 3000);
        resetDocumentAiModal();
      }

    } catch (error) {
      console.error("プレビュー生成エラー:", error);
      setError(`プレビュー生成エラー: ${error.message}`);
    }
  };

  // Generate markdown preview from OCR text
  const generateMarkdownPreview = async (text, options = {}) => {
    const { sourceType: previewSourceType = 'proposal_sheet', fileName = '' } = options;

    console.log(`🔍 [マークダウンプレビュー] 開始: sourceType=${previewSourceType}, textLength=${text.length}`);

    // マークダウンプレビュー用のプロンプト
    const markdownPrompt = `あなたは改善提案シートを分析し、マークダウン形式で整理するアシスタントです。以下は自治体の「改善提案シート」のOCR結果です。

このシートは以下の構造になっています：
- **あなたが考える現状の課題**: 提案者が認識している問題点
- **個人(私)としてできること**: 提案者個人が取り組める解決策
- **地域としてできること**: 地域コミュニティが協力して実施できる解決策
- **行政としてできること**: 行政が実施すべき解決策
- **その他**: その他の情報

OCR結果から、これらの項目を抽出し、以下のマークダウン形式で整理してください：

**あなたが考える現状の課題**
> [課題内容]

**個人(私)としてできること**
> [個人でできる解決策]

**地域としてできること**
> [地域でできる解決策]

**行政としてできること**
> [行政でできる解決策]

複数の提案がある場合は、それぞれを分けて表示してください。
タイトルや書式情報（「○○市 第○回自分ごと化会議 改善提案シート」など）、氏名などの個人情報は除外してください。

OCRテキスト:
\`\`\`
${text}
\`\`\`

マークダウン形式で整理した結果:`;

    console.log(`🤖 [マークダウンプレビュー] Gemini API呼び出し開始`);
    const markdownResponse = await callGeminiAPI(markdownPrompt);
    console.log(`✅ [マークダウンプレビュー] Gemini API応答受信`);

    return {
      markdown: markdownResponse,
      originalText: text,
      fileName: fileName
    };
  };

  // Create structured cards from markdown preview with automatic grouping
  const createStructuredCardsFromMarkdown = async (markdownText, fileName) => {
    if (!markdownText) {
      throw new Error("マークダウンテキストがありません");
    }

    console.log('🔄 構造化カード作成開始', markdownText.substring(0, 200));

    // マークダウンを解析して課題と解決策を抽出
    const issueBlocks = [];
    const lines = markdownText.split('\n');
    let currentIssue = null;
    let currentSection = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // 課題セクションの開始
      if (line.includes('あなたが考える現状の課題')) {
        // 前の課題がある場合は保存
        if (currentIssue) {
          issueBlocks.push(currentIssue);
        }
        currentIssue = {
          issue: '',
          individual: '',
          community: '',
          administration: ''
        };
        currentSection = 'issue';
        continue;
      }

      // 各解決策セクションの開始
      if (line.includes('個人(私)としてできること')) {
        currentSection = 'individual';
        continue;
      }
      if (line.includes('地域としてできること')) {
        currentSection = 'community';
        continue;
      }
      if (line.includes('行政としてできること')) {
        currentSection = 'administration';
        continue;
      }

      // 内容の抽出（> で始まる行または通常のテキスト）
      if (line && currentIssue && currentSection) {
        const content = line.replace(/^>\s*/, '').trim();
        if (content && !content.includes('**') && !content.includes('[') && !content.includes(']')) {
          if (currentSection === 'issue') {
            currentIssue.issue = currentIssue.issue ? currentIssue.issue + ' ' + content : content;
          } else if (currentSection === 'individual') {
            currentIssue.individual = currentIssue.individual ? currentIssue.individual + ' ' + content : content;
          } else if (currentSection === 'community') {
            currentIssue.community = currentIssue.community ? currentIssue.community + ' ' + content : content;
          } else if (currentSection === 'administration') {
            currentIssue.administration = currentIssue.administration ? currentIssue.administration + ' ' + content : content;
          }
        }
      }
    }

    // 最後の課題も保存
    if (currentIssue) {
      issueBlocks.push(currentIssue);
    }

    console.log('🔍 抽出された課題ブロック:', issueBlocks.length, issueBlocks);

    // カードとグループを作成
    const newCards = [];
    const newGroups = [];
    const cardWidth = 180;
    const cardHeight = 100;
    const spacing = 20;
    const groupSpacing = 100;
    
    let startX = 100;
    let startY = 100;

    issueBlocks.forEach((block, blockIndex) => {
      if (!block.issue.trim()) return;

      let currentX = startX;
      let currentY = startY + (blockIndex * (cardHeight * 3 + groupSpacing));
      const groupCards = [];

      // 課題カードを作成
      const issueCard = {
        text: block.issue,
        x: currentX,
        y: currentY,
        width: cardWidth,
        height: cardHeight,
        groupId: null, // 後で設定
        sourceType: 'proposal_sheet',
        sourceIdentifier: `${fileName}_issue_${blockIndex}`,
        isChallenge: true,
        perspectiveRaw: "課題",
        typeRaw: "課題",
        reasoning: "改善提案シートの現状の課題として識別"
      };
      
      const issueCardObj = cardsAPI.add(issueCard);
      newCards.push(issueCardObj);
      groupCards.push(issueCardObj);
      currentX += cardWidth + spacing;

      // 解決策カードを作成
      const solutions = [
        { text: block.individual, perspective: "個人", perspectiveRaw: "個人" },
        { text: block.community, perspective: "地域", perspectiveRaw: "地域" },
        { text: block.administration, perspective: "行政", perspectiveRaw: "行政" }
      ];

      solutions.forEach((solution, solutionIndex) => {
        if (solution.text.trim()) {
          const solutionCard = {
            text: solution.text,
            x: currentX,
            y: currentY,
            width: cardWidth,
            height: cardHeight,
            groupId: null, // 後で設定
            sourceType: 'proposal_sheet',
            sourceIdentifier: `${fileName}_solution_${blockIndex}_${solutionIndex}`,
            isChallenge: false,
            solutionPerspective: solution.perspective.substring(0, 2),
            perspectiveRaw: solution.perspectiveRaw,
            typeRaw: "解決策",
            reasoning: `改善提案シートの${solution.perspectiveRaw}の解決策として識別`
          };
          
          const solutionCardObj = cardsAPI.add(solutionCard);
          newCards.push(solutionCardObj);
          groupCards.push(solutionCardObj);
          currentX += cardWidth + spacing;
        }
      });

      // グループを作成
      if (groupCards.length > 0) {
        const minX = Math.min(...groupCards.map(c => c.x));
        const maxX = Math.max(...groupCards.map(c => c.x + c.width));
        const minY = Math.min(...groupCards.map(c => c.y));
        const maxY = Math.max(...groupCards.map(c => c.y + c.height));

        const groupData = {
          title: `課題${blockIndex + 1}: ${block.issue.substring(0, 20)}...`,
          x: minX - 20,
          y: minY - 30,
          width: maxX - minX + 40,
          height: maxY - minY + 60,
          color: `hsl(${(blockIndex * 60) % 360}, 70%, 95%)`,
          sourceType: 'proposal_sheet',
          sourceIdentifier: `${fileName}_group_${blockIndex}`,
          isChallengeGroup: true
        };

        const newGroup = groupsAPI.add(groupData);
        newGroups.push(newGroup);

        // カードをグループに割り当て
        groupCards.forEach(card => {
          card.groupId = newGroup.id;
          cardsAPI.update(card);
        });
      }
    });

    console.log(`✅ 構造化カード作成完了: ${newCards.length}枚のカード, ${newGroups.length}個のグループ`);
    
    return { cards: newCards, groups: newGroups };
  };

  // Create cards from markdown preview
  const handleCreateCardsFromPreview = async () => {
    if (!markdownPreviewData || !markdownPreviewData.originalText) {
      setError("プレビューデータがありません。");
      return;
    }

    try {
      console.log('🔄 マークダウンプレビューからカード作成開始');

      // 構造化されたカード作成処理を実行（マークダウンから課題-解決策グループを作成）
      const { cards: newCards, groups: newGroups } = await createStructuredCardsFromMarkdown(
        markdownPreviewData.markdown,
        selectedDocumentFile.name
      );

      // 状態を更新
      const updatedCards = [...cards, ...newCards];
      const updatedGroups = [...groups, ...newGroups];
      setCards(updatedCards);
      setGroups(updatedGroups);

      // 履歴を保存
      saveState(updatedCards, updatedGroups, `改善提案シート: ${newCards.length}枚のカード、${newGroups.length}個のグループを作成`);

      console.log(`✅ 構造化カード作成完了: ${newCards.length}枚のカード、${newGroups.length}個のグループ`);

      // Show success message and close modal
      setSuccessMessage(`改善提案シート「${selectedDocumentFile.name}」から${newCards.length}枚のカード、${newGroups.length}個のグループを作成しました！`);
      setTimeout(() => setSuccessMessage(''), 3000);
      resetDocumentAiModal();

    } catch (error) {
      console.error("カード作成エラー:", error);
      setError(`カード作成エラー: ${error.message}`);
    }
  };

  // Document AI modal reset handler
  const resetDocumentAiModal = () => {
    setShowDocumentAiModal(false);
    setSelectedDocumentFile(null);
    setDocumentAiProgress(null);
    setDocumentOcrResults(null);
    setDocumentModalStep('upload');
    setMarkdownPreviewData(null);
    setError(null);
  };

  // Document AI step navigation
  const handleDocumentStepBack = () => {
    if (documentModalStep === 'preview') {
      setDocumentModalStep('upload');
      setSelectedDocumentFile(null);
    } else if (documentModalStep === 'results') {
      setDocumentModalStep('preview');
      setDocumentOcrResults(null);
    } else if (documentModalStep === 'markdown-preview') {
      setDocumentModalStep('results');
      setMarkdownPreviewData(null);
    }
  };

  // Card editing functions
  const startEditCard = (cardId) => {
    const cardToEdit = cards.find(c => c.id === cardId);
    if (cardToEdit) {
      setEditingCard({ id: cardId, text: cardToEdit.text });
    }
  };

  const handleEditTextChange = (e) => {
    if (editingCard) {
      setEditingCard({ ...editingCard, text: e.target.value });
    }
  };

    const handleSaveCardEdit = async (cardId) => {
    if (!editingCard || !userId) return;
    const idToSave = cardId || editingCard.id;

    try {
      const updatedCard = cardsAPI.update(idToSave, {
        text: editingCard.text
      });

      if (updatedCard) {
        setCards(prevCards =>
          prevCards.map(card =>
            card.id === idToSave ? updatedCard : card
          )
        );
      }

      setEditingCard(null);
    } catch (error) {
      console.error("カード更新エラー:", error);
      setError("カード更新エラー: " + error.message);
    }
  };

  const handleCancelCardEdit = () => {
    setEditingCard(null);
  };

  // Card and Group handlers
  const handleCardMove = async (cardId, x, y) => {
    if (!userId) return;
    try {
      const updatedCard = cardsAPI.update(cardId, { x, y });
      if (updatedCard) {
        const newCards = cards.map(card =>
          card.id === cardId ? updatedCard : card
        );
        setCards(newCards);
        saveState(newCards, groups, 'Card moved');
      }
    } catch (error) {
      console.error("Error moving card:", error);
    }
  };

  const handleCardDelete = async (cardId) => {
    if (!userId) return;
    if (window.confirm("本当にこのカードを削除しますか？")) {
      try {
        cardsAPI.delete(cardId);
        const newCards = cards.filter(card => card.id !== cardId);
        setCards(newCards);
        setSelectedCards(prev => prev.filter(id => id !== cardId));
        saveState(newCards, groups, 'Card deleted');
      } catch (error) {
        console.error("Error deleting card:", error);
      }
    }
  };

  const handleCardResize = async (cardId, width, height) => {
    if (!userId) return;
    try {
      const updatedCard = cardsAPI.update(cardId, { width, height });
      if (updatedCard) {
        setCards(prevCards =>
          prevCards.map(card =>
            card.id === cardId ? updatedCard : card
          )
        );
      }
    } catch (error) {
      console.error("Error resizing card:", error);
    }
  };

    const handleGroupMove = async (groupId, x, y) => {
    if (!userId) return;
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const dx = x - group.x;
    const dy = y - group.y;

    try {
      // Update group position
      const updatedGroup = groupsAPI.update(groupId, { x, y });
      if (updatedGroup) {
        setGroups(prevGroups =>
          prevGroups.map(g =>
            g.id === groupId ? updatedGroup : g
          )
        );
      }

      // Update cards in group
      const cardsInGroup = cards.filter(card => card.groupId === groupId);
      const updatedCards = [];

      for (const card of cardsInGroup) {
        const updatedCard = cardsAPI.update(card.id, {
          x: card.x + dx,
          y: card.y + dy
        });
        if (updatedCard) {
          updatedCards.push(updatedCard);
        }
      }

      if (updatedCards.length > 0) {
        setCards(prevCards =>
          prevCards.map(card => {
            const updatedCard = updatedCards.find(uc => uc.id === card.id);
            return updatedCard || card;
          })
        );
      }
    } catch (error) {
      console.error("Error moving group:", error);
    }
  };

  const handleGroupDelete = async (groupId) => {
    if (!userId) return;
    if (window.confirm("本当にこのグループを削除しますか？ (中のカードはグループ化が解除されます)")) {
      setIsLoading(true);
      setLoadingMessage("グループを削除中...");

      try {
        // Ungroup cards
        const cardsInGroup = cards.filter(card => card.groupId === groupId);
        const updatedCards = [];

        for (const card of cardsInGroup) {
          const updatedCard = cardsAPI.update(card.id, {
            groupId: null,
            isChallenge: false,
            solutionPerspective: null
          });
          if (updatedCard) {
            updatedCards.push(updatedCard);
          }
        }

        if (updatedCards.length > 0) {
          setCards(prevCards =>
            prevCards.map(card => {
              const updatedCard = updatedCards.find(uc => uc.id === card.id);
              return updatedCard || card;
            })
          );
        }

        // Delete group
        groupsAPI.delete(groupId);
        setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
        setSelectedGroups(prev => prev.filter(id => id !== groupId));
      } catch (error) {
        console.error("Error deleting group:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGroupEditTitle = async (groupId, title) => {
    if (!userId) return;

    try {
      const updatedGroup = groupsAPI.update(groupId, { title });
      if (updatedGroup) {
        setGroups(prevGroups =>
          prevGroups.map(group =>
            group.id === groupId ? updatedGroup : group
          )
        );
      }
    } catch (error) {
      console.error("Error updating group title:", error);
    }
  };

    // Auto-organize function (AI-powered grouping and analysis)
  const handleAutoOrganize = async () => {
    if (cards.length === 0 || !userId) {
      alert("整理するカードがありません。");
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      setLoadingMessage("ステップ1/3: 関連カードをグループ化中...");
      const cardsForLLM = cards.map(c => ({ id: c.id, text: c.text }));
      const groupingPrompt = `以下のカードリストがあります。意味的に関連性の高いカード同士をグループ化し、各グループに簡潔で仮のテーマ名を付けてください。関連性が低いカードはグループ化しないでください。結果を {"groups": [{"groupName": "仮のテーマ名", "cardIds": ["id1", "id2"]}, ...], "ungroupedIds": ["id3", ...]} の形式で返してください。\n\nカードリスト: ${JSON.stringify(cardsForLLM)}`;
      const groupingSchema = {
        type: "OBJECT",
        properties: {
          groups: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                groupName: { type: "STRING" },
                cardIds: { type: "ARRAY", items: { type: "STRING" }}
              },
              required: ["groupName", "cardIds"]
            }
          },
          ungroupedIds: { type: "ARRAY", items: { type: "STRING" }}
        },
        required: ["groups"]
      };
      const groupingResponse = await callGeminiAPI(groupingPrompt, groupingSchema);

      if (!groupingResponse || !groupingResponse.groups) {
        throw new Error("グループ化のステップでLLMから無効な応答がありました。");
      }

      setLoadingMessage(`ステップ2/3: 各グループの分析中... (0/${groupingResponse.groups.length})`);
      let organizedResults = [];
      let groupCounter = 0;

      for (const tempGroup of groupingResponse.groups) {
        const groupCards = tempGroup.cardIds.map(id => cards.find(c => c.id === id)).filter(Boolean);
        if (groupCards.length === 0) continue;

        const analysisPrompt = `以下のカード群は「${tempGroup.groupName}」というテーマでまとめられました。このグループの中心的な「課題」を要約した新しいグループ名を付けてください。そして、各カードが「課題」そのものか、それに対する「解決策」かを判断してください。「解決策」の場合は、その視点を「自分ができること」「地域ができること」「行政ができること」から分類してください。結果を {"groupName": "新しい課題名", "memberCardDetails": [{"cardId": "...", "isChallenge": true/false, "solutionPerspective": "..."}]} の形式で返してください。\n\nカードリスト: ${JSON.stringify(groupCards.map(c => ({id: c.id, text: c.text})))}`;
        const analysisSchema = {
          type: "OBJECT",
          properties: {
            groupName: { type: "STRING" },
            memberCardDetails: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  cardId: { type: "STRING" },
                  isChallenge: { type: "BOOLEAN" },
                  solutionPerspective: { type: "STRING", enum: ["自分ができること", "地域ができること", "行政ができること", null] }
                },
                required: ["cardId", "isChallenge"]
              }
            }
          },
          required: ["groupName", "memberCardDetails"]
        };

        const analysisResponse = await callGeminiAPI(analysisPrompt, analysisSchema);
        if (analysisResponse) {
          organizedResults.push({ ...analysisResponse, isChallengeGroup: true });
        }
        groupCounter++;
        setLoadingMessage(`ステップ2/3: 各グループの分析中... (${groupCounter}/${groupingResponse.groups.length})`);
      }

      setLoadingMessage("ステップ3/3: 結果を保存し、レイアウトを整理中...");

      // Clear existing groups and ungroup all cards
      groupsAPI.deleteAll();
      setGroups([]);

      const allCards = cardsAPI.getAll();
      for (const card of allCards) {
        cardsAPI.update(card.id, {
          groupId: null,
          isChallenge: false,
          solutionPerspective: null
        });
      }

      // Reload cards to reflect ungrouping
      const ungroupedCards = cardsAPI.getAll();
      setCards(ungroupedCards);
      const canvasPadding = 50;
      const groupMargin = 50;
      const cardMargin = 15;
      const baseCardWidth = 160;
      const baseCardHeight = 100;
      const groupHeaderHeight = 40;
      const groupPaddingInternal = 20;

      let currentLayoutX = canvasPadding;
      let currentLayoutY = canvasPadding;
      let maxRowHeight = 0;
      const effectiveCanvasWidth = (typeof window !== 'undefined' ? window.innerWidth : 1200) - canvasPadding * 2;

      for (const groupData of organizedResults) {
        if (!groupData.memberCardDetails || groupData.memberCardDetails.length === 0) continue;
        const validMemberCards = groupData.memberCardDetails.map(detail => ({...cards.find(c => c.id === detail.cardId), ...detail})).filter(c => c.id);
        if(validMemberCards.length === 0) continue;

        const challengeCards = validMemberCards.filter(c => c.isChallenge);
        const solutionCards = { "自分ができること": [], "地域ができること": [], "行政ができること": [] };
        validMemberCards.filter(c => !c.isChallenge).forEach(c => {
          if(c.solutionPerspective && solutionCards[c.solutionPerspective])
            solutionCards[c.solutionPerspective].push(c);
        });

        let internalX = groupPaddingInternal, internalY = groupHeaderHeight + groupPaddingInternal;
        let positions = [];
        let rowHeight = 0;

        challengeCards.forEach(card => {
          positions.push({ cardId: card.id, x: internalX, y: internalY });
          internalX += baseCardWidth + cardMargin;
          rowHeight = Math.max(rowHeight, baseCardHeight);
        });
        let maxWidth = internalX - cardMargin;
        if(challengeCards.length > 0) internalY += rowHeight + groupMargin / 2;

        let solutionRowY = internalY;
        let solutionMaxHeightInRow = 0;
        internalX = groupPaddingInternal;

        Object.values(solutionCards).forEach(list => {
          list.forEach(card => {
            positions.push({ cardId: card.id, x: internalX, y: solutionRowY});
            internalX += baseCardWidth + cardMargin;
            solutionMaxHeightInRow = Math.max(solutionMaxHeightInRow, baseCardHeight);
          });
          maxWidth = Math.max(maxWidth, internalX - cardMargin);
          if (list.length > 0) solutionRowY += solutionMaxHeightInRow + cardMargin;
          internalX = groupPaddingInternal;
          solutionMaxHeightInRow = 0;
        });
        internalY = solutionRowY > internalY ? solutionRowY : internalY;

        const finalGroupWidth = maxWidth + groupPaddingInternal;
        const finalGroupHeight = internalY + groupPaddingInternal - cardMargin;

        if (currentLayoutX + finalGroupWidth > effectiveCanvasWidth && currentLayoutX > canvasPadding) {
          currentLayoutX = canvasPadding;
          currentLayoutY += maxRowHeight + groupMargin;
          maxRowHeight = 0;
        }

        const newGroup = groupsAPI.add({
          title: groupData.groupName,
          x: currentLayoutX,
          y: currentLayoutY,
          width: finalGroupWidth,
          height: finalGroupHeight,
          isChallengeGroup: true
        });

        setGroups(prevGroups => [...prevGroups, newGroup]);
        maxRowHeight = Math.max(maxRowHeight, finalGroupHeight);

        const updatedCardsForGroup = [];
        positions.forEach(pos => {
          const cardDetail = validMemberCards.find(c => c.id === pos.cardId);
          const updatedCard = cardsAPI.update(pos.cardId, {
            groupId: newGroup.id,
            isChallenge: cardDetail.isChallenge,
            solutionPerspective: cardDetail.solutionPerspective,
            x: currentLayoutX + pos.x,
            y: currentLayoutY + pos.y,
            width: baseCardWidth,
            height: baseCardHeight
          });
          if (updatedCard) {
            updatedCardsForGroup.push(updatedCard);
          }
        });

        if (updatedCardsForGroup.length > 0) {
          setCards(prevCards =>
            prevCards.map(card => {
              const updatedCard = updatedCardsForGroup.find(uc => uc.id === card.id);
              return updatedCard || card;
            })
          );
        }
        currentLayoutX += finalGroupWidth + groupMargin;
      }

      const ungroupedCardIds = new Set(groupingResponse.ungroupedIds);
      if (ungroupedCardIds.size > 0) {
        const ungroupedCards = cards.filter(c => ungroupedCardIds.has(c.id));
        if (ungroupedCards.length > 0) {
          const defaultGroupWidth = 400;
          const groupWidth = Math.min(defaultGroupWidth, ungroupedCards.length * (baseCardWidth + cardMargin) - cardMargin + groupPaddingInternal * 2);
          const groupHeight = baseCardHeight + groupHeaderHeight + groupPaddingInternal * 2;

          if (currentLayoutX + groupWidth > effectiveCanvasWidth && currentLayoutX > canvasPadding) {
            currentLayoutX = canvasPadding;
            currentLayoutY += maxRowHeight + groupMargin;
          }

          const otherGroup = groupsAPI.add({
            title: "その他",
            x: currentLayoutX,
            y: currentLayoutY,
            width: groupWidth,
            height: groupHeight,
            isChallengeGroup: false
          });

          setGroups(prevGroups => [...prevGroups, otherGroup]);

          let cardX = groupPaddingInternal;
          const updatedUngroupedCards = [];
          ungroupedCards.forEach(card => {
            const updatedCard = cardsAPI.update(card.id, {
              groupId: otherGroup.id,
              x: currentLayoutX + cardX,
              y: currentLayoutY + groupHeaderHeight + groupPaddingInternal
            });
            if (updatedCard) {
              updatedUngroupedCards.push(updatedCard);
            }
            cardX += baseCardWidth + cardMargin;
          });

          if (updatedUngroupedCards.length > 0) {
            setCards(prevCards =>
              prevCards.map(card => {
                const updatedCard = updatedUngroupedCards.find(uc => uc.id === card.id);
                return updatedCard || card;
              })
            );
          }
        }
      }

    } catch (e) {
      console.error("自動整理エラー:", e);
      setError(`自動整理エラー: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // JSON export function
  const generateReportJSON = useCallback(() => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalCards: cards.length,
        totalGroups: groups.length,
        challengeGroups: groups.filter(g => g.isChallengeGroup).length,
        ungroupedCards: cards.filter(c => !c.groupId).length
      },
      groups: [],
      ungroupedCards: []
    };

    // Process grouped cards
    groups.forEach(group => {
      const groupCards = cards.filter(c => c.groupId === group.id);
      const challengeCards = groupCards.filter(c => c.isChallenge);
      const solutionCards = groupCards.filter(c => !c.isChallenge);

      const solutions = {
        "自分ができること": solutionCards.filter(c => 
          c.solutionPerspective === "自分ができること" || 
          c.perspectiveRaw === "個人" || 
          c.solutionPerspective === "個人"
        ),
        "地域ができること": solutionCards.filter(c => 
          c.solutionPerspective === "地域ができること" || 
          c.perspectiveRaw === "地域" || 
          c.solutionPerspective === "地域"
        ),
        "行政ができること": solutionCards.filter(c => 
          c.solutionPerspective === "行政ができること" || 
          c.perspectiveRaw === "行政" || 
          c.solutionPerspective === "行政"
        ),
        "その他": solutionCards.filter(c => 
          !c.solutionPerspective && 
          !c.perspectiveRaw && 
          !c.isChallenge
        )
      };

      reportData.groups.push({
        id: group.id,
        title: group.title,
        type: group.isChallengeGroup ? "challenge" : "other",
        challenges: challengeCards.map(c => ({
          id: c.id,
          text: c.text,
          sourceType: c.sourceType
        })),
        solutions: {
          personal: solutions["自分ができること"].map(c => ({
            id: c.id,
            text: c.text,
            sourceType: c.sourceType
          })),
          community: solutions["地域ができること"].map(c => ({
            id: c.id,
            text: c.text,
            sourceType: c.sourceType
          })),
          government: solutions["行政ができること"].map(c => ({
            id: c.id,
            text: c.text,
            sourceType: c.sourceType
          })),
          other: solutions["その他"].map(c => ({
            id: c.id,
            text: c.text,
            sourceType: c.sourceType
          }))
        },
        cardCount: groupCards.length
      });
    });

    // Process ungrouped cards
    const ungroupedCards = cards.filter(c => !c.groupId);
    reportData.ungroupedCards = ungroupedCards.map(c => ({
      id: c.id,
      text: c.text,
      sourceType: c.sourceType,
      isChallenge: c.isChallenge,
      solutionPerspective: c.solutionPerspective
    }));

    return reportData;
  }, [cards, groups]);

  // View controls
  const handleZoom = (zoomIn) => setScale(prev => Math.max(0.1, Math.min(zoomIn ? prev * 1.2 : prev / 1.2, 5)));
  const resetView = () => { setScale(1); setPan({x: 0, y: 0}); };


  if (!userId) {
    return <div className="flex items-center justify-center h-screen text-xl">初期化中...</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-screen font-sans bg-gray-200">
        {/* Progress Bar */}
        <ProgressBar
          isVisible={showProgressBar}
          onCancel={null}
          progress={progressData}
          title={progressTitle}
          showCancel={false}
        />

        {/* Success Message */}
        {successMessage && (
          <div className="fixed top-0 left-0 right-0 z-20 bg-green-500 text-white text-center py-2 text-sm">
            {successMessage}
          </div>
        )}

        <header className={`fixed top-0 left-0 right-0 z-10 bg-white shadow-md ${successMessage ? 'mt-10' : ''}`}>
          {/* Main Header */}
          <div className="p-3 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-700">KJ法アシストツール v3.12</h1>

            {/* View Toggle - Tab Style */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setCurrentView('canvas')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${
                  currentView === 'canvas'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <StickyNoteIcon /> <span className="ml-1">KJ法</span>
              </button>
              <button
                onClick={() => setCurrentView('json')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center ${
                  currentView === 'json'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <DatabaseIcon /> <span className="ml-1">レポート</span>
              </button>
            </div>

            <div className="text-xs text-gray-500">UserID: {userId}</div>
          </div>

          {/* Secondary Header */}
          <div className="px-3 pb-3 flex items-center justify-between border-t border-gray-100">
            {currentView === 'canvas' ? (
              <>
                <div className="flex items-center space-x-2">
                  {/* Auto organize button */}
                  <button
                    onClick={handleAutoOrganize}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center transition-colors"
                    disabled={cards.length === 0 || isLoading}
                  >
                    <BotIcon /> <span className="ml-1">AIクラスタリング</span>
                  </button>

                  {/* Clear all button */}
                  <button
                    onClick={() => {
                      if (window.confirm("全てのカードとグループを削除しますか？この操作は取り消せません。")) {
                        // Clear all cards and groups
                        cardsAPI.deleteAll();
                        groupsAPI.deleteAll();
                        setCards([]);
                        setGroups([]);
                        setSelectedCards([]);
                        setSelectedGroups([]);
                        saveState([], [], 'Cleared all cards and groups');
                      }
                    }}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center transition-colors"
                    disabled={cards.length === 0 || isLoading}
                  >
                    <Trash2Icon /> <span className="ml-1">全削除</span>
                  </button>
                </div>
                <div className="flex items-center space-x-1">
                  {/* Undo/Redo buttons */}
                  <button
                    onClick={handleUndo}
                    disabled={!canUndo}
                    className="p-1.5 text-gray-600 hover:bg-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent rounded-md"
                    title="元に戻す (Cmd+Z)"
                  >
                    ↶
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={!canRedo}
                    className="p-1.5 text-gray-600 hover:bg-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent rounded-md"
                    title="やり直し (Cmd+Shift+Z)"
                  >
                    ↷
                  </button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  {/* Zoom controls */}
                  <button onClick={() => handleZoom(true)} className="p-1.5 text-gray-600 hover:bg-gray-300 rounded-md" title="ズームイン">+</button>
                  <button onClick={() => handleZoom(false)} className="p-1.5 text-gray-600 hover:bg-gray-300 rounded-md" title="ズームアウト">-</button>
                  <button onClick={resetView} className="p-1.5 text-gray-600 hover:bg-gray-300 rounded-md text-xs" title="ビューをリセット">Reset</button>
                  <span className="text-xs text-gray-500 ml-2">Zoom: {Math.round(scale*100)}%</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">構造化レポート表示</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500">
                    {groups.length}グループ • {cards.length}カード
                  </span>
                </div>
              </>
            )}
          </div>
        </header>

        <main className={`flex-grow relative ${successMessage ? 'mt-34' : 'mt-24'}`}>
          {currentView === 'canvas' ? (
            <div className="relative h-full">
              {/* Canvas Area with right margin for detail panel */}
              <div className="absolute inset-0 pr-80">
                <Canvas
                  cards={cards}
                  groups={groups}
                  onCardMove={handleCardMove}
                  onCardDelete={handleCardDelete}
                  onCardResize={handleCardResize}
                  onGroupMove={handleGroupMove}
                  onGroupDelete={handleGroupDelete}
                  onGroupEditTitle={handleGroupEditTitle}
                  scale={scale}
                  pan={pan}
                  setPan={setPan}
                  setScale={setScale}
                  selectedCards={selectedCards}
                  setSelectedCards={setSelectedCards}
                  selectedGroups={selectedGroups}
                  setSelectedGroups={setSelectedGroups}
                  onCardEdit={startEditCard}
                  editingCard={editingCard}
                  onEditTextChange={handleEditTextChange}
                  onSaveCardEdit={handleSaveCardEdit}
                  onCancelCardEdit={handleCancelCardEdit}
                />
              </div>

              {/* Fixed Detail Panel */}
              <div className={`fixed right-0 w-80 h-full bg-white border-l border-gray-200 shadow-lg flex flex-col z-10 ${successMessage ? 'top-34' : 'top-24'}`}>
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">文書アップロード</h3>
                  <p className="text-xs text-gray-600 mt-1">議事録・改善提案シートを追加</p>
                </div>

                <div className="flex-grow p-4 space-y-4 overflow-y-auto">
                  {/* Document Upload Buttons */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">文書の種類</h4>


                    <button
                      onClick={() => {
                        setSourceType('proposal_sheet');
                        setShowDocumentAiModal(true);
                      }}
                      className={`w-full px-4 py-3 text-sm font-medium text-white rounded-lg transition-colors ${
                        isDocumentAiServerReady
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : 'bg-gray-400 cursor-not-allowed'
                      } disabled:opacity-50`}
                      disabled={isLoading || !isDocumentAiServerReady}
                      title={!isDocumentAiServerReady ? "Document AIサーバーが利用できません" : "PDFや画像ファイルからOCRでテキストを抽出"}
                    >
                      <ScanTextIcon />
                      <span className="ml-2">
                        {isDocumentAiServerReady ? "改善提案シートをアップロード" : "Document AI (未接続)"}
                      </span>
                    </button>

                    <button
                      onClick={() => setShowWhisperAXModal(true)}
                      className="w-full px-4 py-3 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors disabled:opacity-50"
                      disabled={isLoading}
                      title="WhisperAXを使用して音声文字起こしを実行"
                    >
                      <MicIcon />
                      <span className="ml-2">
                        「会議音声の文字起こしデータ」からカードを作成
                      </span>
                    </button>

                  </div>

                  {/* Statistics */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">統計</h4>

                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">カード数:</span>
                        <span className="font-medium text-gray-900">{cards.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">グループ数:</span>
                        <span className="font-medium text-gray-900">{groups.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">選択中カード:</span>
                        <span className="font-medium text-gray-900">{selectedCards.length}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">選択中グループ:</span>
                        <span className="font-medium text-gray-900">{selectedGroups.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Help */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">ヘルプ</h4>

                    <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800">
                      <div className="space-y-1">
                        <div><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Ctrl/Cmd + Wheel</kbd> ズーム</div>
                        <div><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Wheel</kbd> パン</div>
                        <div><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Cmd + Z</kbd> 元に戻す</div>
                        <div><kbd className="px-1 py-0.5 bg-blue-200 rounded text-xs">Cmd + Shift + Z</kbd> やり直し</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <TableView jsonData={generateReportJSON()} />
          )}
        </main>

        {showInputModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
              <h2 className="text-lg font-semibold mb-2">文書内容を入力してください</h2>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">データソースの種類:</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="sourceType"
                      value="discussion"
                      checked={sourceType === 'discussion'}
                      onChange={(e) => setSourceType(e.target.value)}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">議事録</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="sourceType"
                      value="proposal_sheet"
                      checked={sourceType === 'proposal_sheet'}
                      onChange={(e) => setSourceType(e.target.value)}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">改善提案シート</span>
                  </label>
                </div>
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows="8"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="議事録や改善提案シートの内容を貼り付けてください。重要な意見や提案が抽出・カード化されます。"
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => { setShowInputModal(false); setError(null); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSegmentText}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={isLoading || !inputText.trim()}
                >
                  {getButtonText()}
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Document AI Modal */}
        {showDocumentAiModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    改善提案シートをアップロード
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    PDFや画像ファイルからOCRでテキスト・表・フォームを自動抽出
                  </p>
                </div>
                <button
                  onClick={resetDocumentAiModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XIcon />
                </button>
              </div>

              {/* Server Status */}
              <div className={`mx-6 mt-4 p-3 rounded-lg ${isDocumentAiServerReady ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${isDocumentAiServerReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-sm font-medium ${isDocumentAiServerReady ? 'text-green-800' : 'text-red-800'}`}>
                    Document AIサーバー: {isDocumentAiServerReady ? '接続済み' : '未接続'}
                  </span>
                </div>
                {!isDocumentAiServerReady && (
                  <p className="text-xs text-red-600 mt-1">
                    サーバーを起動してください: python server.py
                  </p>
                )}
              </div>

              {/* Step Indicator */}
              <div className="mx-6 mt-4 mb-6">
                <div className="flex items-center space-x-2">
                  <div className={`flex items-center ${documentModalStep === 'upload' ? 'text-blue-600' : ['preview', 'results', 'markdown-preview'].includes(documentModalStep) ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${documentModalStep === 'upload' ? 'border-blue-600 bg-blue-50' : ['preview', 'results', 'markdown-preview'].includes(documentModalStep) ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
                      1
                    </div>
                    <span className="ml-2 text-sm font-medium">ファイル選択</span>
                  </div>
                  <div className={`flex-1 h-px ${['preview', 'results', 'markdown-preview'].includes(documentModalStep) ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center ${documentModalStep === 'preview' ? 'text-blue-600' : ['results', 'markdown-preview'].includes(documentModalStep) ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${documentModalStep === 'preview' ? 'border-blue-600 bg-blue-50' : ['results', 'markdown-preview'].includes(documentModalStep) ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
                      2
                    </div>
                    <span className="ml-2 text-sm font-medium">プレビュー</span>
                  </div>
                  <div className={`flex-1 h-px ${['results', 'markdown-preview'].includes(documentModalStep) ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center ${documentModalStep === 'results' ? 'text-blue-600' : documentModalStep === 'markdown-preview' ? 'text-green-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${documentModalStep === 'results' ? 'border-blue-600 bg-blue-50' : documentModalStep === 'markdown-preview' ? 'border-green-600 bg-green-50' : 'border-gray-300'}`}>
                      3
                    </div>
                    <span className="ml-2 text-sm font-medium">OCR結果</span>
                  </div>
                  <div className={`flex-1 h-px ${documentModalStep === 'markdown-preview' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center ${documentModalStep === 'markdown-preview' ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${documentModalStep === 'markdown-preview' ? 'border-blue-600 bg-blue-50' : 'border-gray-300'}`}>
                      4
                    </div>
                    <span className="ml-2 text-sm font-medium">整理確認</span>
                  </div>
                </div>
              </div>

              {/* Modal Content */}
              <div className="flex-1 px-6 pb-6 overflow-y-auto">
                {documentModalStep === 'upload' && (
                  <div className="space-y-4">
                    <FileDropZone
                      onFileSelect={handleDocumentFileSelect}
                      acceptedTypes=".pdf,.png,.jpg,.jpeg"
                      maxSizeMB={16}
                      disabled={isLoading || !isDocumentAiServerReady}
                      selectedFile={selectedDocumentFile}
                    />
                  </div>
                )}

                {documentModalStep === 'preview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">ドキュメントプレビュー</h3>
                      <DocumentPreview
                        file={selectedDocumentFile}
                        ocrResults={documentOcrResults?.stats}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">処理設定</h3>
                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-medium text-blue-900 mb-2">OCR処理について</h4>
                          <ul className="text-sm text-blue-800 space-y-1">
                            <li>• テキスト、表、フォームフィールドを自動抽出</li>
                            <li>• 抽出されたデータはKJ法カードとして追加</li>
                            <li>• 処理には数秒から数分かかる場合があります</li>
                          </ul>
                        </div>

                        {/* Processing Progress */}
                        {documentAiProgress && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center mb-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                              <span className="text-sm text-gray-700">{documentAiProgress.message}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${documentAiProgress.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {documentModalStep === 'results' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">ドキュメント</h3>
                      <DocumentPreview
                        file={selectedDocumentFile}
                        ocrResults={documentOcrResults?.stats}
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">OCR結果</h3>
                      <OcrResultsTable
                        extractedData={documentOcrResults?.extractedData}
                        onTableEdit={(tableId, data) => {
                          console.log('Table edited:', tableId, data);
                        }}
                        onDownloadCsv={(tableId) => {
                          console.log('CSV download:', tableId);
                        }}
                      />
                    </div>
                  </div>
                )}

                {documentModalStep === 'markdown-preview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">整理結果プレビュー</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        OCR結果を以下のように整理しました。内容を確認して、問題なければカードを作成してください。
                      </p>
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        {markdownPreviewData?.markdown ? (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{markdownPreviewData.markdown}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="text-gray-500 italic">プレビューデータが見つかりません</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="mx-6 mb-4">
                  <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded p-3">{error}</p>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                <div>
                  {documentModalStep !== 'upload' && (
                    <button
                      onClick={handleDocumentStepBack}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      disabled={isLoading}
                    >
                      ← 戻る
                    </button>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={resetDocumentAiModal}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    disabled={isLoading}
                  >
                    キャンセル
                  </button>

                  {documentModalStep === 'preview' && (
                    <button
                      onClick={handleDocumentAiProcess}
                      className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                      disabled={isLoading || !selectedDocumentFile || !isDocumentAiServerReady}
                    >
                      {isLoading ? 'OCR処理中...' : 'OCR処理開始'}
                    </button>
                  )}

                  {documentModalStep === 'results' && (
                    <>
                      <button
                        onClick={() => {
                          // Download all tables as CSV (optional)
                          if (documentOcrResults?.extractedData) {
                            const allCsvData = [];
                            Object.entries(documentOcrResults.extractedData).forEach(([tableName, data]) => {
                              if (Array.isArray(data) && data.length > 0) {
                                allCsvData.push(`# ${tableName}`);
                                const csvContent = data.map(row =>
                                  row.map(cell => `"${cell?.toString().replace(/"/g, '""') || ''}"`).join(',')
                                ).join('\n');
                                allCsvData.push(csvContent);
                                allCsvData.push(''); // Empty line between tables
                              }
                            });

                            if (allCsvData.length > 0) {
                              const blob = new Blob([allCsvData.join('\n')], { type: 'text/csv;charset=utf-8;' });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `OCR結果_${new Date().toISOString().split('T')[0]}.csv`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                            }
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={!documentOcrResults?.extractedData}
                      >
                        📄 CSV一括ダウンロード
                      </button>
                      <button
                        onClick={handleDocumentAiConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        📄 確認完了
                      </button>
                    </>
                  )}

                  {documentModalStep === 'markdown-preview' && (
                    <button
                      onClick={handleCreateCardsFromPreview}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                      disabled={!markdownPreviewData}
                    >
                      ✓ カードを作成
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WhisperAX Modal */}
        {showWhisperAXModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">WhisperAX音声文字起こしから議事録・カードを作成</h2>

              {!whisperAXResult ? (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      音声文字起こしテキストを入力してください
                    </label>
                    <textarea
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                      rows="12"
                      placeholder="[0.00 --> 26.00] <|startoftranscript|><|ja|><|transcribe|><|0.00|><|endoftext|>
[54.58 --> 55.98] <|startoftranscript|><|ja|><|transcribe|><|0.00|>(拍手<|endoftext|>
...
文字起こしテキストをここに貼り付けてください"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowWhisperAXModal(false);
                        setError(null);
                        setInputText('');
                        setWhisperAXResult(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={async () => {
                        const result = await handleWhisperAXProcess(inputText);
                        if (result) {
                          setWhisperAXResult(result);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                      disabled={isLoading || !inputText.trim()}
                    >
                      {isLoading ? '処理中...' : '議事録を生成'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    <h3 className="text-md font-medium text-gray-800 mb-3">生成された議事録</h3>
                    <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                      <div className="prose prose-sm max-w-none text-gray-700">
                        <ReactMarkdown>{whisperAXResult}</ReactMarkdown>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowWhisperAXModal(false);
                        setError(null);
                        setInputText('');
                        setWhisperAXResult(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => handleWhisperAXCardGeneration(whisperAXResult)}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      disabled={isLoading}
                    >
                      {isLoading ? 'カード生成中...' : 'この議事録からカードを作成'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 bg-gray-800 bg-opacity-75 flex flex-col items-center justify-center z-[100]">
            <div className="text-white text-xl mb-2">{loadingMessage}</div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}
      </div>
    </DndProvider>
  );
};

export default App;
