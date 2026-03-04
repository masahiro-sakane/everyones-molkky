# みんなのモルック - 実装TODO

## Phase 0: プロジェクト初期セットアップ
- [x] 0-1: Next.js プロジェクト初期化（create-next-app, App Router, TypeScript, Tailwind CSS, src/ ディレクトリ）
- [x] 0-2: ESLint + Prettier 設定（.eslintrc.json, .prettierrc, npm scripts）
- [x] 0-3: Vitest セットアップ（vitest.config.ts, @testing-library/react, テスト用 npm scripts）
- [x] 0-4: Storybook セットアップ（@storybook/nextjs, Tailwind CSS 統合）
- [x] 0-5: Docker Compose で PostgreSQL 構築（docker-compose.yml, .env.example）
- [x] 0-6: Prisma 初期設定（prisma init, schema.prisma にデータソース設定, src/lib/db.ts）
- [x] 0-7: ディレクトリ構成作成（src/components/, src/services/, src/hooks/, src/types/, src/lib/, src/test/）
- [x] 0-8: 共通型定義ファイル作成（src/types/match.ts, team.ts, score.ts, user.ts）
- [x] 0-9: Git 初期化 + .gitignore 作成
- [x] 0-10: README.md 作成（セットアップ手順、開発コマンド一覧）

## Phase 1: スコア計算エンジン
- [x] 1-1: スコア関連の型定義（ThrowInput, ThrowResult, ProcessThrowParams を src/types/score.ts に定義）
- [x] 1-2: calculateThrowScore のテスト作成（1本倒し=番号得点、複数倒し=本数得点、0本=0点）
- [x] 1-3: calculateThrowScore の実装
- [x] 1-4: applyOverScoreRule のテスト作成（50点ちょうど=勝利、50点超過=25点リセット）
- [x] 1-5: applyOverScoreRule の実装
- [x] 1-6: checkConsecutiveMisses のテスト作成（3回連続ミス=失格、得点で連続ミスリセット）
- [x] 1-7: checkConsecutiveMisses の実装
- [x] 1-8: applyFaultRule のテスト作成（37点以上踏み越え=25点、37点未満踏み越え=0点のみ）
- [x] 1-9: applyFaultRule の実装
- [x] 1-10: processThrow 統合テスト作成（全ルールを組み合わせたシナリオテスト）
- [x] 1-11: processThrow の実装
- [x] 1-12: Zod バリデーションスキーマ作成（src/lib/validation.ts: 投擲入力、チーム作成、ユーザー作成）
- [x] 1-13: スコア計算のリファクタリングとカバレッジ確認（80%以上）

## Phase 2: データ永続化層
- [x] 2-1: Prisma スキーマ作成（User, Team, TeamMember, Match, MatchTeam, Set, Turn, Throw, TeamSetScore）
- [x] 2-2: Prisma マイグレーション実行（npx prisma migrate dev --name init）
- [x] 2-3: シードデータ作成（prisma/seed.ts: サンプルチーム2つ、各3名のユーザー）
- [x] 2-4: テストデータファクトリ作成（src/test/factories/: createTestUser, createTestTeam, createTestMatch）
- [x] 2-5: userService のテスト + 実装（作成、取得、一覧）
- [x] 2-6: teamService のテスト + 実装（作成、取得、一覧、メンバー追加・削除）
- [x] 2-7: matchService のテスト + 実装（作成、取得[shareCode]、ステータス更新、チーム追加）
- [x] 2-8: scoreService のテスト + 実装（投擲記録、スコア更新、TeamSetScore更新、勝利判定）
- [x] 2-9: ユーザー API Route 作成（POST /api/users, GET /api/users）
- [x] 2-10: チーム API Routes 作成（POST /api/teams, GET /api/teams, GET /api/teams/[id], PUT /api/teams/[id], POST /api/teams/[id]/members）
- [x] 2-11: 試合 API Routes 作成（POST /api/matches, GET /api/matches, GET /api/matches/[shareCode]）
- [x] 2-12: 投擲記録 API Route 作成（POST /api/matches/[shareCode]/throws）
- [x] 2-13: API ドキュメント作成（docs/api.md）

## Phase 3: 基盤UIコンポーネント
- [x] 3-1: デザイントークン定義（globals.css に @theme でAtlassian Design System準拠トークン定義）
- [x] 3-2: グローバルCSS設定（src/app/globals.css にベーススタイル定義）
- [x] 3-3: Button コンポーネント + Storybook Story（primary, secondary, danger, subtle, link, loading 各状態）
- [x] 3-4: Input コンポーネント + Story（text, error状態, hint, isRequired, ラベル付き）
- [x] 3-5: Select コンポーネント + Story
- [x] 3-6: Card コンポーネント + Story（CardHeader, CardTitle, CardFooter）
- [x] 3-7: Modal / Dialog コンポーネント（Escキー・背景クリックで閉じる、キーボード操作対応）
- [x] 3-8: Badge コンポーネント + Story（default, primary, success, warning, danger, info）
- [x] 3-9: Header コンポーネント（ロゴ、ナビゲーション、レスポンシブハンバーガーメニュー）
- [x] 3-10: AppLayout コンポーネント（Header + main + footer）
- [x] 3-11: ScoreBoard コンポーネント + Story（チーム名、スコア、プログレスバー、バッジ）
- [x] 3-12: SkittleInput コンポーネント + Story（12本配置図、タップ選択、得点プレビュー）
- [x] 3-13: 全UIコンポーネントのユニットテスト作成（Button, Input, Badge, ScoreBoard, SkittleInput）

## Phase 4: チーム・ユーザー管理画面
- [x] 4-1: ユーザー登録フォームコンポーネント（名前入力、バリデーション付き）
- [x] 4-2: チーム作成ページ（/teams/new: チーム名入力、メンバー追加UI）
- [x] 4-3: チーム一覧ページ（/teams: カード形式でチーム表示、チーム作成ボタン）
- [x] 4-4: チーム詳細ページ（/teams/[id]: メンバー一覧、メンバー追加・削除）
- [x] 4-5: メンバー管理コンポーネント（メンバー追加モーダル、既存ユーザー選択 or 新規作成）
- [x] 4-6: チーム管理画面のレスポンシブ対応確認（PC / タブレット / スマホ）

## Phase 5: 試合画面
- [x] 5-1: 試合作成ページ（/matches/new: 参加チーム選択[2チーム以上]、投擲順決定）
- [x] 5-2: 試合状態管理フック useMatch（試合データ取得、現在のターン・投擲者管理、スコア更新）
- [x] 5-3: 試合進行メイン画面（/matches/[shareCode]: スコアボード + 現在投擲者 + スキットル入力 + 履歴）
- [x] 5-4: ThrowRecorder コンポーネント（スキットル選択 --> 得点計算 --> 確定 --> API送信フロー）
- [x] 5-5: CurrentThrower コンポーネント（現在の投擲者名、チーム名、投擲順の表示）
- [x] 5-6: LiveScoreBoard コンポーネント（全チームのスコアをリアルタイム更新表示）
- [x] 5-7: ThrowHistory コンポーネント（投擲履歴をスクロール可能なリストで表示）
- [x] 5-8: MatchResult コンポーネント（勝利チーム表示、最終スコア、試合統計サマリー）
- [x] 5-9: DisqualificationAlert コンポーネント（失格時のアラート表示）
- [x] 5-10: ShareButton コンポーネント（試合URLをクリップボードにコピー、QRコード表示）
- [x] 5-11: フォルト入力UI（ミスボタン、踏み越えボタン、フォルト種別選択）
- [x] 5-12: 試合画面のレスポンシブ対応確認（スマホでの操作性重視）
- [x] 5-13: 試合フローの統合テスト（作成 --> 投擲 --> スコア更新 --> 勝利判定）

## Phase 6: リアルタイムスコア共有
- [x] 6-1: イベント発行ユーティリティ作成（src/lib/eventEmitter.ts: インメモリ PubSub）
- [x] 6-2: SSE エンドポイント作成（GET /api/matches/[shareCode]/stream: ReadableStream で試合イベント配信）
- [x] 6-3: 投擲記録 API に SSE イベント発行を追加（投擲確定時に scoreUpdated イベント発行）
- [x] 6-4: useRealtimeScore フック作成（EventSource 接続、自動再接続、状態同期）
- [x] 6-5: ConnectionStatus コンポーネント（接続中 / 切断中 / 再接続中の表示）
- [x] 6-6: 観戦モード画面（/matches/[shareCode]/watch: 読み取り専用のスコアボード + 投擲履歴）
- [x] 6-7: Polling フォールバック実装（SSE 非対応環境用、5秒間隔ポーリング）
- [x] 6-8: リアルタイム機能の統合テスト

## Phase 7: 統計・分析
- [x] 7-1: statsService のテスト + 実装（勝率、平均得点、ミス率、各統計指標の集計クエリ）
- [x] 7-2: 統計 API Routes 作成（GET /api/stats/teams/[id], GET /api/stats/users/[id]）
- [x] 7-3: チーム別統計ページ（/stats/teams: 勝率ランキング、各チームの詳細統計）
- [x] 7-4: ユーザー別統計ページ（/stats/users: 個人成績、得点傾向）
- [x] 7-5: 試合履歴一覧ページ（/matches: 完了済み試合の一覧、フィルタリング）
- [x] 7-6: ScoreChart コンポーネント + Story（試合内スコア推移グラフ）
- [x] 7-7: 試合リプレイページ（/matches/[shareCode]/replay: 投擲ごとのスコア推移を時系列表示）
- [x] 7-8: 統計機能のテスト

## Phase 8: 仕上げ・品質向上
- [x] 8-1: トップページ作成（/: 直近の試合、クイックスタートボタン、チーム一覧へのリンク）
- [x] 8-2: 404 ページ作成
- [x] 8-3: エラーページ作成（error.tsx, global-error.tsx）
- [x] 8-4: ローディング状態の実装（各ページの loading.tsx, Suspense boundary）
- [x] 8-5: メタデータ・OGP 設定（タイトル、説明文、OGP画像）
- [x] 8-6: E2E テスト作成（Playwright: 試合作成 --> スコア入力 --> 勝利の一連フロー）
- [x] 8-7: E2E テスト作成（Playwright: チーム作成 --> メンバー追加フロー）
- [x] 8-8: 全ページのレスポンシブデザイン最終確認
- [x] 8-9: パフォーマンス最適化（セキュリティヘッダー, next.config.ts 最適化）
- [x] 8-10: アクセシビリティ確認（キーボード操作、スクリーンリーダー、コントラスト比）
- [x] 8-11: 本番デプロイ設定（セキュリティヘッダー、環境変数、next.config.ts）
- [x] 8-12: 最終カバレッジ確認（80%以上） → 80.54% 達成

## Phase 9: デプロイ
- [x] 9-1: GitHub リポジトリ作成 + 初回コミット・プッシュ → https://github.com/masahiro-sakane/everyones-molkky
- [x] 9-2: .gitignore 最終確認（秘匿情報が含まれていないこと）
- [x] 9-3: Supabase プロジェクト作成 + PostgreSQL 接続設定
- [x] 9-4: Prisma マイグレーションを Supabase に適用
- [x] 9-5: Vercel プロジェクト作成 + GitHub リポジトリ連携
- [x] 9-6: Vercel 環境変数設定（DATABASE_URL, DIRECT_URL など）
- [x] 9-7: Vercel デプロイ実行・動作確認 → https://everyones-molkky.vercel.app
- [x] 9-8: README.md にデプロイ済みURLを追記
