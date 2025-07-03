# KJ 法アシストツール v3.12

住民の意見を効率的に整理・分析するための React アプリケーションです。会議の議事録や提案シートから意見を自動抽出し、KJ 法でカード化・グループ化できます。

## 🌟 主な機能

- **自動意見抽出**: 会議録から住民の意見のみを自動的に抽出・カード化
- **AI 自動整理**: Gemini AI による関連カードのグループ化と課題・解決策の分析
- **ドラッグ&ドロップ**: カードとグループの直感的な移動・操作
- **ローカルストレージ**: ブラウザ内でデータを自動保存（設定不要）
- **レスポンシブデザイン**: PC・タブレット対応

## 🏗️ プロジェクト構造

```
kj-gemini/
├── public/
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   └── Icons.js         # アイコンコンポーネント
│   ├── config/
│   │   └── firebase.js      # Firebase設定
│   ├── data/
│   │   └── sampleData.js    # サンプルデータ
│   ├── utils/
│   │   └── geminiApi.js     # Gemini API呼び出し
│   ├── App.js               # メインアプリケーション
│   ├── index.js             # エントリポイント
│   └── index.css            # スタイル
├── package.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 🚀 セットアップ手順

### 1. プロジェクトのクローンとインストール

```bash
# リポジトリをクローン
git clone https://github.com/your-username/kj-gemini.git
cd kj-gemini

# 依存関係をインストール
npm install
```

### 2. Gemini API 設定

1. [Google AI Studio](https://makersuite.google.com/app/apikey) で API キーを取得

### 3. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成：

```bash
# Gemini AI API Key
REACT_APP_GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. アプリケーションの起動

```bash
npm start
```

ブラウザで `http://localhost:3000` にアクセスします。

> **注意**: データはブラウザのローカルストレージに保存されるため、ブラウザのデータを削除すると失われます。重要なデータは定期的にエクスポートすることをお勧めします。

## 📖 使用方法

### 基本的な使い方

1. **カードの追加**

   - 「カードを追加」ボタンをクリック
   - データソースの種類を選択（会議ディスカッション/改善提案シート）
   - テキストを入力して「分割開始」をクリック

2. **カードの操作**

   - ドラッグして移動
   - ダブルクリックで編集
   - 右下のハンドルでリサイズ
   - 削除ボタンで削除

3. **グループ化**

   - カードを他のカードの近くにドロップしてグループを作成
   - グループタイトルをダブルクリックで編集
   - グループ全体を移動可能

4. **ビュー操作**
   - `+`/`-` ボタンでズーム
   - 「Reset」でビューリセット
   - 空白部分をドラッグしてパン

### キーボードショートカット

- `Ctrl/Cmd + クリック`: 複数選択
- `Enter`: 編集モードで保存
- `Escape`: 編集モードでキャンセル

## 🛠️ 開発とカスタマイズ

### 依存関係

- **React**: UI フレームワーク
- **TailwindCSS**: スタイリング
- **react-dnd**: ドラッグ&ドロップ機能
- **Gemini AI**: 自然言語処理・自動整理
- **localStorage**: データ永続化（ブラウザ内蔵）

### ビルド

```bash
# 本番用ビルド
npm run build

# テスト実行
npm test
```

### カスタマイズポイント

- `src/data/sampleData.js`: サンプルデータの変更
- `src/components/Icons.js`: アイコンの追加・変更
- `tailwind.config.js`: スタイルのカスタマイズ
- `src/utils/geminiApi.js`: AI 分析ロジックの調整

## 🔧 トラブルシューティング

### よくある問題

1. **Gemini API エラー**

   - `.env` ファイルに API キーが正しく設定されているか確認
   - API 使用量の制限を確認
   - API キーに適切な権限があるか確認

2. **データが保存されない**

   - ブラウザの localStorage が有効になっているか確認
   - プライベートブラウジングモードでは使用しない
   - ブラウザの容量制限に達していないか確認

3. **ビルドエラー**
   - `npm install` で依存関係を再インストール
   - Node.js のバージョンを確認（推奨: 18.x 以上）
   - キャッシュをクリア: `npm start -- --reset-cache`

### ログの確認

```bash
# 開発サーバーのログを確認
npm start

# ブラウザの開発者ツールでコンソールエラーを確認
```

## 📝 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📞 サポート

問題や質問がある場合は、GitHub の Issues ページで報告してください。

---

**KJ 法アシストツール** - 効率的な意見整理でより良い議論を促進します 🚀
