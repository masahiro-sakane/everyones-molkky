## プロジェクト概要
- 名前: みんなのモルック
- 技術スタック: Next.js (App Router), TypeScript, Tailwind CSS, Prisma, PostgreSQL
- 目的: フィンランド発祥のスポーツ「モルック」に特化したスコア管理アプリ

## アプリの仕様
- @docs/RULES.mdのルールに従うこと
- 入力の簡便さにこだわること
- チームを作成しユーザー登録できること
- 対戦中のスコアをURL共有で他端末で共有できること
- PC、タブレット、スマホで利用できること
- 試合データを蓄積・分析できること
- チーム別、ユーザー別で勝率など分析できること

## コーディング規約
- **言語**: 全コードはTypeScriptで記述。
- **スタイル**: {Link: ESLint https://eslint.org/} と {Link: Prettier https://prettier.io/} の設定に従う。
- **コンポーネント**: Reactの機能コンポーネントのみを使用。
- **命名規則**: コンポーネントはPascalCase、関数・変数はcamelCase。

## 重要ファイル・ディレクトリ
- `./src/components/ui/`: 共通UIコンポーネント。
- `./src/lib/db.ts`: Prismaクライアントのインスタンス。
- `./docs/api.md`: APIエンドポイントの仕様。

## AIへの指示・禁止事項
- 回答およびコードの説明は日本語で行うこと。
- {Link: Tailwind CSS https://tailwindcss.com/} のutility classは推奨するが、複雑なスタイルは `tailwind.config.js` のテーマを使用する。
- 外部APIへの直接的な生クエリは避け、`./src/services/` 内の関数を経由する。
- 作業ディレクトリのホームは以下で、Bash Commandは以下から実行して下さい。
  C:\Develop\workspace\claude\everyones-molkky
- タスクは@docs/TODO.mdで管理して完了したら都度マークして下さい。
- 中断された作業は@docs/TODO.mdを参照して再開して下さい。

## テスト
- {Link: Vitest https://vitest.dev/} を使用して単体テストを記述。
- 全コンポーネントはStorybookに登録する。

## UI/UXデザイン
デザインとフロントエンド開発のガイドラインとして以下のAtlassian Design Systemを使用して下さい。
https://atlassian.design/components
