# KJ 法アシストツール 設計ドキュメント

## システム概要

KJ 法アシストツールは、住民の意見を効率的に整理・分析するための Web アプリケーションです。会議の議事録や提案シートから自動的に意見を抽出し、KJ 法によるカード化・グループ化を支援します。

## アーキテクチャ設計

### システム構成

```
[ブラウザ] → [React SPA] → [localStorage]
                ↓
          [Gemini AI API]
```

### 技術スタック

- **フロントエンド**: React 18.2+
- **スタイリング**: TailwindCSS 3.3+
- **ドラッグ&ドロップ**: react-dnd 16.0+
- **データ永続化**: localStorage (ブラウザ内蔵)
- **AI 処理**: Google Gemini AI API
- **ビルドツール**: Create React App

## データモデル設計

### Firebase Firestore コレクション構造

```
artifacts/
  └── {appId}/
      └── users/
          └── {userId}/
              ├── kj_cards/
              │   └── {cardId}
              │       ├── text: string
              │       ├── x: number
              │       ├── y: number
              │       ├── width: number
              │       ├── height: number
              │       ├── groupId: string | null
              │       ├── sourceType: 'discussion' | 'proposal_sheet'
              │       ├── sourceIdentifier: string
              │       ├── isChallenge: boolean
              │       ├── solutionPerspective: string | null
              │       ├── createdAt: timestamp
              │       └── updatedAt: timestamp
              └── kj_groups/
                  └── {groupId}
                      ├── title: string
                      ├── x: number
                      ├── y: number
                      ├── width: number
                      ├── height: number
                      ├── isChallengeGroup: boolean
                      ├── createdAt: timestamp
                      └── updatedAt: timestamp
```

### カードデータモデル

| プロパティ          | 型             | 説明                       |
| ------------------- | -------------- | -------------------------- |
| id                  | string         | カードの一意識別子         |
| text                | string         | カードに表示されるテキスト |
| x, y                | number         | キャンバス上の座標位置     |
| width, height       | number         | カードのサイズ             |
| groupId             | string \| null | 所属グループの ID          |
| sourceType          | string         | データソースの種類         |
| sourceIdentifier    | string         | ソース内での識別子         |
| isChallenge         | boolean        | 課題カードかどうか         |
| solutionPerspective | string \| null | 解決策の視点               |

### グループデータモデル

| プロパティ       | 型      | 説明                   |
| ---------------- | ------- | ---------------------- |
| id               | string  | グループの一意識別子   |
| title            | string  | グループタイトル       |
| x, y             | number  | キャンバス上の座標位置 |
| width, height    | number  | グループのサイズ       |
| isChallengeGroup | boolean | 課題グループかどうか   |

## コンポーネント設計

### ディレクトリ構造

```
src/
├── components/          # 再利用可能なコンポーネント
│   └── Icons.js        # アイコンコンポーネント
├── config/             # 設定ファイル
│   └── firebase.js     # Firebase初期化
├── data/               # 静的データ
│   └── sampleData.js   # サンプルデータ
├── utils/              # ユーティリティ関数
│   └── geminiApi.js    # Gemini API呼び出し
├── App.js              # メインアプリケーション
├── index.js            # エントリポイント
└── index.css           # グローバルスタイル
```

### 主要コンポーネント

#### App (メインコンポーネント)

- **責務**: アプリケーション全体の状態管理とルーティング
- **状態**: カード一覧、グループ一覧、選択状態、UI 状態
- **子コンポーネント**: Canvas, Modal components

#### Card (カードコンポーネント)

- **責務**: 個別カードの表示と操作
- **機能**: ドラッグ&ドロップ、編集、リサイズ、削除
- **props**: カードデータ、イベントハンドラー

#### Group (グループコンポーネント)

- **責務**: カードグループの表示と操作
- **機能**: ドラッグ&ドロップ、タイトル編集、リサイズ
- **props**: グループデータ、含まれるカード数

#### Canvas (キャンバスコンポーネント)

- **責務**: カードとグループの配置・表示領域
- **機能**: パン、ズーム、選択範囲、ドロップターゲット

## API 設計

### Gemini AI API 統合

#### プロンプト設計

```javascript
/**
 * 意見抽出用プロンプト
 * @param {string} inputText - 入力テキスト
 * @returns {Object} - {segments: string[]} 形式のレスポンス
 */
const extractOpinionsPrompt = (inputText) => `
あなたは会議の議事録や提案シートを分析するアシスタントです。
以下のテキストから「住民の意見」「参加者の発言」「提案」に該当する部分のみを抽出してください。
結果を {"segments": ["意見1", "意見2", ...]} という形式のJSONで返してください。

テキスト:
\`\`\`
${inputText}
\`\`\`
`;
```

#### レスポンス処理

```javascript
/**
 * Gemini APIレスポンスの解析
 * @param {Object} apiResponse - API生レスポンス
 * @returns {Object} - パース済みJSONオブジェクト
 */
const parseGeminiResponse = (apiResponse) => {
  // JSONクリーニングとパース処理
  // エラーハンドリング
};
```

## 状態管理設計

### React State 構造

```javascript
// App.js内の主要な状態
const [cards, setCards] = useState([]); // カード一覧
const [groups, setGroups] = useState([]); // グループ一覧
const [selectedCards, setSelectedCards] = useState([]); // 選択カード
const [selectedGroups, setSelectedGroups] = useState([]); // 選択グループ
const [editingCard, setEditingCard] = useState(null); // 編集中カード
const [scale, setScale] = useState(1); // ズーム倍率
const [pan, setPan] = useState({ x: 0, y: 0 }); // パン位置
const [userId, setUserId] = useState(null); // ユーザーID
const [isLoading, setIsLoading] = useState(false); // ローディング状態
const [error, setError] = useState(null); // エラー状態
```

### Firebase リアルタイムリスナー

```javascript
/**
 * Firestoreリアルタイムリスナーの設定
 * カードとグループの変更を自動同期
 */
useEffect(() => {
  if (!isAuthReady || !userId) return;

  const unsubCards = onSnapshot(cardsQuery, (snapshot) =>
    setCards(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

  const unsubGroups = onSnapshot(groupsQuery, (snapshot) =>
    setGroups(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
  );

  return () => {
    unsubCards();
    unsubGroups();
  };
}, [isAuthReady, userId]);
```

## ユーザーインターフェース設計

### デザインシステム

#### カラーパレット

- **プライマリ**: Blue 600 (#2563eb)
- **セカンダリ**: Purple 500 (#8b5cf6)
- **アクセント**: Yellow 100 (#fef3c7) - カード背景
- **エラー**: Red 500 (#ef4444)
- **成功**: Green 500 (#10b981)

#### タイポグラフィ

- **ヘッダー**: text-xl font-semibold
- **カードテキスト**: text-xs
- **ボタン**: text-sm font-medium

#### レスポンシブブレイクポイント

- **sm**: 640px 以上 - タブレット
- **md**: 768px 以上 - デスクトップ
- **lg**: 1024px 以上 - 大画面

### インタラクション設計

#### ドラッグ&ドロップ

```javascript
/**
 * react-dndを使用したドラッグ&ドロップ実装
 * - カード移動: useDrag + useDrop
 * - グループ移動: カード一括移動
 * - ドロップターゲット: Canvas領域
 */
const [{ isDragging }, drag] = useDrag({
  type: "CARD",
  item: { id, x, y, type: "CARD" },
  collect: (monitor) => ({ isDragging: monitor.isDragging() }),
});
```

#### キーボードショートカット

- `Ctrl/Cmd + Click`: マルチ選択
- `Enter`: 編集保存
- `Escape`: 編集キャンセル
- `Delete`: 選択削除

## セキュリティ設計

### Firebase Security Rules

```javascript
// Firestore セキュリティルール例
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/users/{userId}/{collection}/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 認証フロー

1. 匿名認証による自動ユーザー作成
2. UserID ベースのデータ分離
3. カスタムトークン認証対応（オプション）

## パフォーマンス最適化

### React 最適化

- `useCallback` によるコールバック最適化
- `useMemo` による計算結果キャッシュ
- コンポーネントの適切な分割

### Firebase 最適化

- リアルタイムリスナーの効率的な使用
- バッチ処理による書き込み最適化
- インデックス設計（必要に応じて）

### レンダリング最適化

- 仮想化（大量カード表示時）
- CSS Transform による描画最適化
- デバウンス処理（リサイズ、移動）

## テスト戦略

### 単体テスト

- ユーティリティ関数のテスト
- コンポーネントの単体テスト
- Firebase 操作のモックテスト

### 統合テスト

- コンポーネント間の連携テスト
- Firebase 統合テスト
- API 連携テスト

### E2E テスト

- ユーザーフローのエンドツーエンドテスト
- ブラウザ互換性テスト

## デプロイメント設計

### 本番環境

- **ホスティング**: Vercel / Netlify / Firebase Hosting
- **環境変数**: プロダクション API キー
- **CDN**: 静的リソース配信最適化

### CI/CD パイプライン

```yaml
# GitHub Actions例
name: Build and Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm run build
      - run: npm test
```

## 拡張性設計

### 機能拡張ポイント

1. **多言語対応**: i18n 対応
2. **テーマ切り替え**: ダーク/ライトモード
3. **エクスポート機能**: PDF/画像出力
4. **コラボレーション**: リアルタイム共同編集
5. **AI 機能強化**: 自動グループ化、関連性分析

### アーキテクチャ拡張

- マイクロサービス化
- GraphQL API 採用
- PWA 対応
- オフライン機能

---

**設計原則**: シンプルさ、保守性、拡張性を重視した設計を心がけています。
