# Android 配布計画: PWA + TWA

## 概要

既存の Next.js + Vercel 構成を維持したまま、PWA（Progressive Web App）化と TWA（Trusted Web Activity）を組み合わせて Google Play Store への配布を実現する。

## 確定パラメータ

| 項目 | 値 |
|------|---|
| アプローチ | PWA + TWA（Bubblewrap） |
| applicationId | `app.molkky.everyones` |
| 本番 URL | Vercel デフォルト（`*.vercel.app`） |
| theme_color | `#0052cc` |
| orientation | `portrait` |
| iOS 対応 | 今回スコープ外 |
| プッシュ通知 | なし |
| プライバシーポリシー連絡先 | `hiro182799@gmail.com` |
| Vercel プラン | Hobby（SSE は 10秒タイムアウト、自動再接続で対応） |
| Play Console アカウント | 未取得（$25 一回払い、Phase 1 と並行して申請） |

## アプローチ比較（選定理由）

| アプローチ | コスト | リスク | 備考 |
|-----------|--------|--------|------|
| **PWA + TWA（採用）** | 低（2〜3週間） | 低 | コードベース変更なし、Vercel 更新が即反映 |
| Capacitor | 中（3〜4週間） | 中 | SSR → Static Export への変更が必要 |
| React Native 移植 | 非常に高（2〜3ヶ月） | 高 | UI・コンポーネントを全面書き直し |

既存の Next.js App Router + SSE + Vercel の構成を一切壊さずに Android 配布が実現でき、Web 側を更新するだけでアプリ内容も自動更新される点を最優先とした。

---

## Phase 1: PWA 基盤整備（3〜4日）

### 1.1 manifest.ts

`src/app/manifest.ts` を新規作成（Next.js Metadata API）。`/manifest.webmanifest` として配信される。

| フィールド | 値 |
|-----------|---|
| `name` | `みんなのモルック` |
| `short_name` | `モルック` |
| `description` | `フィンランド発祥のスポーツ「モルック」のスコア管理アプリ` |
| `start_url` | `/` |
| `scope` | `/` |
| `display` | `standalone`（TWA 必須） |
| `orientation` | `portrait` |
| `background_color` | `#ffffff` |
| `theme_color` | `#0052cc` |
| `lang` | `ja` |
| `id` | `/` |
| `categories` | `["sports", "utilities"]` |

アイコン配列:

| ファイル | サイズ | purpose |
|---------|--------|---------|
| `/icons/icon-192.png` | 192x192 | `any` |
| `/icons/icon-512.png` | 512x512 | `any` |
| `/icons/icon-maskable-192.png` | 192x192 | `maskable` |
| `/icons/icon-maskable-512.png` | 512x512 | `maskable` |
| `/icons/icon.svg` | vector | `any` |

### 1.2 アイコン生成

**ソース SVG** `public/icons/icon.svg`（512x512 viewBox）:
- 背景: 角丸矩形（`rx=96`）、`fill="#0052cc"`
- 中央に白い「M」の文字（bold、約 320px）
- maskable 用は safe zone（中央 80%）に収まる配置

**PNG 生成**: devDependency に `sharp` を追加し、`scripts/generate-icons.mjs` で SVG → PNG 変換。`package.json` に `"generate:icons": "node scripts/generate-icons.mjs"` を追加。

生成ファイル一覧:

| ファイル | サイズ | 用途 |
|---------|--------|------|
| `icon-192.png` | 192x192 | Android home |
| `icon-512.png` | 512x512 | PWA install |
| `icon-maskable-192.png` | 192x192 | adaptive icon |
| `icon-maskable-512.png` | 512x512 | adaptive icon 高解像度 |
| `apple-touch-icon.png` | 180x180 | 念のため |
| `favicon.ico` | 32+16px | ブラウザタブ |
| `favicon-32.png` | 32x32 | |
| `favicon-16.png` | 16x16 | |

**スプラッシュ**: manifest の `background_color` + 最大サイズアイコンから TWA が自動生成するため不要。

### 1.3 Service Worker

**採用ライブラリ**: `@serwist/next@^9`（Workbox 後継、TypeScript ファースト）

ファイル:
- `src/app/sw.ts` — Service Worker 本体
- `next.config.ts` で `withSerwist` ラッパーを適用
- ビルド時に `public/sw.js` が自動生成

キャッシュ戦略:

| パス | 戦略 | 理由 |
|------|------|------|
| `/_next/static/**` | `CacheFirst`（30日） | ハッシュ付き静的アセット |
| `/icons/**`, `/manifest.webmanifest` | `CacheFirst`（30日） | |
| `/api/**` | `NetworkOnly` | 試合データは常に最新を取得 |
| `/api/matches/*/stream` | 除外（bypass） | SSE は SW を通すと壊れる |
| ナビゲーション（HTML） | `NetworkFirst`（タイムアウト 3秒） | オフライン時のみキャッシュ表示 |
| `/offline` | precache | オフラインフォールバック |

新規ページ: `src/app/offline/page.tsx`（「オフラインです。接続を確認してください」）

### 1.4 layout.tsx に追加するメタデータ

```ts
export const metadata: Metadata = {
  title: { default: 'みんなのモルック', template: '%s | みんなのモルック' },
  applicationName: 'みんなのモルック',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'モルック' },
  formatDetection: { telephone: false },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#0052cc',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',  // セーフエリア対応
}
```

### 1.5 next.config.ts の変更点

1. `withSerwist({ swSrc: 'src/app/sw.ts', swDest: 'public/sw.js' })` でラップ
2. `headers()` に追加:
   - `/sw.js`: `Service-Worker-Allowed: /`, `Cache-Control: no-cache`
   - `/manifest.webmanifest`: `Content-Type: application/manifest+json`
   - `/.well-known/assetlinks.json`: `Content-Type: application/json`, `Access-Control-Allow-Origin: *`

---

## Phase 2: Digital Asset Links（1日）

### assetlinks.json

配置先: `public/.well-known/assetlinks.json`  
配信 URL: `https://<domain>/.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.molkky.everyones",
    "sha256_cert_fingerprints": [
      "<upload key SHA-256>",
      "<Play App Signing key SHA-256>"
    ]
  }
}]
```

**重要**: 両方の指紋が必要。upload key だけだと Play 配信版でアドレスバーが表示される。

### 指紋の取得タイミング

1. Phase 3 で Bubblewrap が upload key を生成 → upload key の SHA-256 を追加
2. Play Console に初回 AAB アップロード → Play App Signing key の SHA-256 が表示される → 追加
3. Google の検証ツールで確認: `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://<domain>&relation=delegate_permission/common.handle_all_urls`

---

## Phase 3: TWA プロジェクト生成（2〜3日）

### 前提ソフトウェア

| ソフトウェア | バージョン | 入手先 |
|------------|-----------|--------|
| JDK | 17 LTS | Adoptium Temurin |
| Android SDK | API 34（Android 14） | Android Studio または cmdline-tools |
| Bubblewrap CLI | `^1.21.0` | `npm install -g @bubblewrap/cli` |

環境変数: `JAVA_HOME`（JDK 17）、`ANDROID_HOME`（SDK パス）、`PATH` に `$ANDROID_HOME/platform-tools`

初回: `bubblewrap doctor` で環境確認。

### TWA プロジェクト配置

`android/` ディレクトリをリポジトリルートに作成。`.gitignore` に以下を追加:
```
android/app/build/
android/.gradle/
android/android.keystore
android/.bubblewrap-cli.json
```

### bubblewrap init 設定値

`bubblewrap init --manifest=https://<domain>/manifest.webmanifest` 実行時の対話値:

| 項目 | 値 |
|------|---|
| Domain | `<vercel ドメイン>` |
| Application ID | `app.molkky.everyones` |
| Application name | `みんなのモルック` |
| Short name | `モルック` |
| Display mode | `standalone` |
| Orientation | `portrait` |
| Theme color | `#0052cc` |
| Background color | `#ffffff` |
| Navigation color | `#0052cc` |
| Icon URL | `https://<domain>/icons/icon-512.png` |
| Maskable icon URL | `https://<domain>/icons/icon-maskable-512.png` |
| Signing key path | `android/android.keystore` |
| Signing key alias | `android` |
| App version code | `1` |
| App version name | `1.0.0` |
| Min SDK | `21`（Android 5.0） |
| Target SDK | `34`（Play Store 2024 必須） |
| Fallback type | `customtabs`（TWA 非対応端末でも動作） |
| Enable Chrome OS | No |
| Include shortcuts | No |

### 署名鍵の管理

- **Play App Signing を有効化**（Google 推奨。2021年以降の新規アプリは事実上必須）
- upload key（`android.keystore`）はローカル管理。**コミット禁止**
- パスワードマネージャに keystore ファイル + パスワードをバックアップ
- upload key を紛失した場合: Play Console から「upload key リセット」を申請可能

ビルド: `bubblewrap build` で署名済み AAB（`app-release-bundle.aab`）を生成。

---

## Phase 4: 検証（2〜3日）

### PWA 単体検証（Phase 1 完了時点）

- [ ] Chrome DevTools → Application → Manifest にエラーなし
- [ ] Lighthouse PWA 監査でインストール可能判定
- [ ] Service Worker が `activated` 状態
- [ ] オフライン状態で `/offline` が表示される
- [ ] SSE（`/api/matches/*/stream`）が SW を通さず動作する
- [ ] アイコンが全サイズ 200 で配信される

### TWA 固有の確認事項

| 確認項目 | 確認方法 |
|---------|---------|
| アドレスバー非表示 | TWA 起動時に URL バーが出ないこと |
| セーフエリア（ノッチ） | ヘッダー・フッターが切れないこと |
| Android 戻るボタン | 履歴 back、ルート画面で back するとアプリ終了 |
| スプラッシュ画面 | 背景色 + アイコンが約 1秒表示 |
| ステータスバー色 | `#0052cc` が反映される |
| 外部リンク | `target="_blank"` がカスタムタブで開く |
| ディープリンク | `https://<domain>/matches/<shareCode>` を Chrome から開くと TWA が起動 |

### SSE 動作確認手順

1. TWA で試合作成 → shareCode を取得
2. PC ブラウザで `/matches/<shareCode>/watch` を開く
3. TWA 側で投擲入力 → PC 側に 1秒以内に反映
4. TWA をバックグラウンドへ → 復帰時に SSE 再接続（指数バックオフ）
5. 機内モード ON/OFF → Polling フォールバック発動を確認
6. 長時間（10分以上）放置 → Vercel Hobby タイムアウト（10秒）後の自動再接続を確認

> **Vercel Hobby の SSE タイムアウトについて**: 10秒でタイムアウトするが `useRealtimeScore` の自動再接続・Polling フォールバックで動作は維持される。体験が許容できない場合は SSE エンドポイントの Edge Runtime 化を別タスクとして対応。

### 検証デバイス

- Android 14（Pixel エミュレータ）
- Android 10（実機 or エミュレータ、最低限）
- 縦長画面（アスペクト比 20:9）でのセーフエリア
- 小型画面（5インチ相当）でのスコアシート表示

---

## Phase 5: Play Store 申請（3〜5日 + 審査）

### 必要な準備物

| 項目 | 仕様 |
|------|------|
| 開発者アカウント | $25 一回払い（Phase 1 と並行して申請開始） |
| AAB | `bubblewrap build` 成果物（署名済み） |
| アプリ名 | `みんなのモルック`（30文字以内） |
| 簡単な説明 | 80文字以内 |
| 詳細な説明 | 4000文字以内 |
| アプリアイコン | 512x512 PNG（32bit、アルファなし）|
| フィーチャーグラフィック | 1024x500 PNG/JPG |
| スクリーンショット（スマホ） | 最低 2枚、推奨 1080x1920 |
| スクリーンショット（タブレット） | 7インチ・10インチ各 1枚（任意） |
| プライバシーポリシー URL | `/privacy` ページを新規作成（必須） |
| カテゴリ | スポーツ |

### プライバシーポリシーページ

`src/app/privacy/page.tsx` を新規作成。記載事項:
- 収集するデータ（チーム名、ユーザー名、試合スコア、shareCode）
- 利用目的（スコア管理・分析）
- 第三者提供（なし）
- データ保存場所（Vercel + PostgreSQL）
- データ削除依頼の連絡先: `hiro182799@gmail.com`
- Cookie / sessionStorage 利用について
- 改定履歴

### データセーフティ申告

| 項目 | 申告内容 |
|------|---------|
| 収集データ | 名前（ユーザー名・チーム名）、アプリのアクティビティ（試合データ） |
| 転送中の暗号化 | はい（HTTPS） |
| 削除リクエスト | 可能（メール対応） |
| 第三者共有 | なし |
| 広告 ID | なし |
| トラッキング | なし |
| 子供向け | いいえ（13歳以上対象） |

### リリースフロー

1. **内部テスト**: 開発者自身 + 数名で起動確認
2. **クローズドテスト**: 12名以上 × 14日間（新規アカウントの必須要件）
3. **製品版リリース**: 段階公開（10% → 50% → 100%）

---

## 実装スケジュール

| Day | 作業 |
|-----|------|
| 1 | Phase 1 着手 + Play Console アカウント申請（並行） |
| 2〜3 | Phase 1 完了 → Vercel デプロイ → 本番 URL 確定 |
| 3 | Phase 2: assetlinks.json 雛形配置（指紋は後追記） |
| 4〜5 | Phase 3: Bubblewrap セットアップ + AAB 生成 |
| 5 | upload key SHA-256 を assetlinks.json に追加 → 再デプロイ |
| 6〜7 | Phase 4: 実機検証 |
| 7 | Play Console に AAB アップロード → Play App Signing key 取得 → assetlinks.json 更新 |
| 8〜21 | Phase 5: クローズドテスト 14日間（素材準備と並行） |
| 22〜 | 製品版申請 |

**合計: 約 3週間**（審査・クローズドテスト期間含む）

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| Service Worker による SSE 通信の破壊 | `/api/*` と `/stream` を `NetworkOnly` で明示除外 |
| assetlinks.json 未反映でアドレスバー表示 | Google 検証ツールで両指紋確認、CDN キャッシュ flush |
| upload keystore 紛失 | パスワードマネージャに即時バックアップ、Play App Signing でリセット可能 |
| Play Console 新規アカウント審査遅延 | Phase 1 と並行して即座に申請開始 |
| Vercel Hobby SSE 10秒タイムアウト | 自動再接続で対応。許容できなければ Edge Runtime 化を別タスク化 |
| クローズドテスト 14日間の要件 | スケジュールに織り込み済み |

## 成功基準

- [ ] Lighthouse PWA スコア 90+
- [ ] Chrome で「ホーム画面に追加」が可能
- [ ] TWA 起動時にアドレスバーが表示されない
- [ ] オフライン時に `/offline` フォールバック表示
- [ ] SSE リアルタイム同期が TWA 実機で動作する
- [ ] Play Store クローズドテストで起動・試合完走が可能
- [ ] 製品版が Play Store で一般公開される
- [ ] Web 側の通常デプロイで TWA 内コンテンツが自動更新される
