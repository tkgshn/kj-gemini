# KJ法アシストツール - デプロイガイド

## 🚀 Vercelへのデプロイ手順

### 前提条件
- Node.js 14以上がインストールされていること
- GitHubアカウントを持っていること
- プロジェクトがGitHubにプッシュされていること

### 方法1: Vercel CLIを使用（推奨）

```bash
# 1. Vercel CLIをインストール
npm install -g vercel

# 2. プロジェクトのビルド
npm run build

# 3. Vercelにデプロイ
vercel --prod

# 初回は以下の質問に答える：
# - Set up and deploy "~/Developer/kj-gemini"? [Y/n] → Y
# - Which scope do you want to deploy to? → 自分のアカウントを選択
# - Link to existing project? [y/N] → N
# - What's your project's name? → kj-gemini（または任意の名前）
# - In which directory is your code located? → ./（デフォルト）
# - Want to override the settings? [y/N] → N
```

### 方法2: Vercel Webサイトから

1. [Vercel](https://vercel.com)にアクセス
2. GitHubアカウントでサインイン
3. "New Project"をクリック
4. GitHubリポジトリから`kj-gemini`を選択
5. 設定はデフォルトのままで"Deploy"をクリック

### デプロイ後の設定

#### 環境変数（必要な場合）
Vercelダッシュボードから設定：
- Settings → Environment Variables

#### カスタムドメイン
1. Settings → Domains
2. ドメインを追加
3. DNSレコードを設定

### 自動デプロイの設定

GitHubにプッシュすると自動的にデプロイされます：
- `main`ブランチ → 本番環境
- その他のブランチ → プレビュー環境

## 🌐 その他のデプロイオプション

### Netlify

```bash
# 1. ビルド
npm run build

# 2. Netlifyにドラッグ&ドロップ
# https://app.netlify.com/drop にbuildフォルダをドロップ
```

### GitHub Pages

1. `package.json`に追加：
```json
"homepage": "https://[username].github.io/kj-gemini"
```

2. gh-pagesパッケージをインストール：
```bash
npm install --save-dev gh-pages
```

3. `package.json`のscriptsに追加：
```json
"predeploy": "npm run build",
"deploy": "gh-pages -d build"
```

4. デプロイ：
```bash
npm run deploy
```

## 📝 注意事項

- このアプリはlocalStorageを使用するため、HTTPSでのホスティングが推奨されます
- ビルドサイズ: 約2-3MB（最適化済み）
- 必要な帯域幅: 最小限（静的サイトのため）

## 🔍 トラブルシューティング

### ビルドエラーが発生する場合
```bash
# キャッシュをクリアして再ビルド
rm -rf node_modules
npm install
npm run build
```

### 404エラーが発生する場合
`vercel.json`の設定を確認してください。SPAのルーティング設定が必要です。

### パフォーマンスの問題
- Vercelの分析ダッシュボードで確認
- 必要に応じてCDNの設定を調整

---

最終更新: 2025年6月14日