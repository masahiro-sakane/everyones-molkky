# みんなのモルック

フィンランド発祥のスポーツ「モルック」に特化したスコア管理アプリ。

## 機能

- チーム作成・ユーザー登録
- リアルタイムスコア管理（URL共有対応）
- PC / タブレット / スマホ対応
- 試合データの蓄積・分析

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: PostgreSQL, Prisma
- **テスト**: Vitest, Testing Library, Storybook

## セットアップ

### 必要環境

- Node.js v20.9 以上
- Docker Desktop（PostgreSQL用）

### インストール

```bash
# 依存関係のインストール
npm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集してデータベースURLを設定

# データベース起動
docker compose up -d

# データベースのマイグレーション
npm run prisma:migrate

# シードデータ投入
npm run prisma:seed
```

### 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 でアプリにアクセスできます。

## 開発コマンド

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run test` | テスト実行（watch モード） |
| `npm run test:run` | テスト実行（一回のみ） |
| `npm run test:coverage` | カバレッジレポート生成 |
| `npm run storybook` | Storybook 起動 |
| `npm run lint` | ESLint 実行 |
| `npm run format` | Prettier フォーマット |
| `npm run prisma:studio` | Prisma Studio 起動 |
| `npm run prisma:migrate` | マイグレーション実行 |

## プロジェクト構成

```
src/
  app/              # Next.js App Router (ページ・APIルート)
  components/       # Reactコンポーネント
    ui/             # 汎用UIコンポーネント
    match/          # 試合関連コンポーネント
    team/           # チーム関連コンポーネント
    stats/          # 統計関連コンポーネント
    layout/         # レイアウトコンポーネント
  lib/              # ユーティリティ・外部クライアント
    db.ts           # Prismaクライアント
    scoring.ts      # スコア計算ロジック
  services/         # ビジネスロジック・データアクセス
  hooks/            # カスタムReactフック
  types/            # TypeScript型定義
  test/             # テストユーティリティ・ファクトリ
```

## ルール

モルックのルールは [docs/RULES.md](./docs/RULES.md) を参照してください。
