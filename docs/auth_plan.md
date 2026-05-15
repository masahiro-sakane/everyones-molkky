# Google 認証実装計画（Auth.js v5）

## 確定パラメータ

| 項目 | 値 |
|------|---|
| ライブラリ | Auth.js v5（next-auth@5）+ @auth/prisma-adapter |
| セッション戦略 | JWT |
| avatarUrl | `image` カラムに統合（avatarUrl → image にリネーム） |
| 作成者フィールド | `Match.createdByUserId`, `Team.createdByUserId` を今回追加 |
| iOS 対応 | スコープ外 |
| プッシュ通知 | なし |

## 保護ルート設計

| ルート | 保護 | 理由 |
|-------|------|------|
| `/` | あり | ダッシュボード |
| `/login` | なし | ログイン入口 |
| `/matches/new` | あり | 試合作成 |
| `/matches/[shareCode]` | **なし** | QRコードでスコア入力 |
| `/matches/[shareCode]/watch` | **なし** | 観戦URL共有 |
| `/teams/*` | あり | チーム管理 |
| `/players/*` | あり | プレイヤー管理 |
| `/stats/*` | あり | 統計 |
| `/api/auth/*` | なし | 認証エンドポイント |
| `/api/matches/[shareCode]/*` | **なし** | スコア入力・SSE |
| `/api/matches/[shareCode]` GET | なし | 観戦データ取得 |
| `/api/teams`, `/api/users`, `/api/stats` | あり | 管理API |
| `/api/matches` POST | あり | 試合作成 |

## Phase 1: 基盤構築

### 1.1 依存パッケージ追加
```
npm install next-auth@5 @auth/prisma-adapter --legacy-peer-deps
```

### 1.2 Prisma スキーマ変更（prisma/schema.prisma）

**User モデル変更:**
- `avatarUrl` → `image` にリネーム（`@map("image")` は不要、カラム名ごと変更）
- `email String? @unique` 追加
- `emailVerified DateTime?` 追加
- `accounts Account[]` リレーション追加

**追加モデル:**
```prisma
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

**Match モデルに追加:**
```prisma
createdByUserId String?
createdBy       User?   @relation(fields: [createdByUserId], references: [id])
```

**Team モデルに追加:**
```prisma
createdByUserId String?
createdBy       User?   @relation(fields: [createdByUserId], references: [id])
```

### 1.3 マイグレーション
```
npx prisma migrate dev --name add_nextauth_and_created_by
```
- 既存 User レコードの `avatarUrl` → `image` カラムのリネームは migrate が自動検出
- `email`, `emailVerified` は NULL 許容で追加 → 既存データに影響なし

### 1.4 src/auth.ts（新規）
```typescript
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
```

### 1.5 src/app/api/auth/[...nextauth]/route.ts（新規）
```typescript
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

### 1.6 src/types/next-auth.d.ts（新規）
```typescript
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
  }
}
```

### 1.7 環境変数
`.env.local` に追加:
```
AUTH_SECRET=<openssl rand -base64 32>
AUTH_GOOGLE_ID=<Google Cloud Console から>
AUTH_GOOGLE_SECRET=<Google Cloud Console から>
AUTH_TRUST_HOST=true
```

Vercel の環境変数にも同様に設定。

Google Cloud Console 設定:
- 承認済みリダイレクト URI:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://<vercel-domain>/api/auth/callback/google`

## Phase 2: ルート保護

### 2.1 src/middleware.ts（新規）
```typescript
import { auth } from "@/auth"

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", req.url)
    return Response.redirect(loginUrl)
  }
})

export const config = {
  matcher: [
    "/",
    "/matches/new",
    "/teams/:path*",
    "/players/:path*",
    "/stats/:path*",
  ],
}
```

### 2.2 API レイヤーの認証チェック
認証必須エンドポイント（`POST /api/matches`, `POST /api/teams`, `POST /api/users`, `/api/stats/*`）:
```typescript
const session = await auth()
if (!session?.user?.id) {
  return NextResponse.json({ success: false, error: "認証が必要です" }, { status: 401 })
}
```

公開維持エンドポイント（変更なし）:
- `GET /api/matches/[shareCode]`
- `POST /api/matches/[shareCode]/throws`
- `GET /api/matches/[shareCode]/stream`
- `PATCH /api/matches/[shareCode]/throws/[throwId]`

## Phase 3: UI 実装

### 3.1 src/app/login/page.tsx（新規）
- Google でログインボタンのみのシンプルな画面
- `signIn("google")` を Server Action で呼び出し

### 3.2 src/components/layout/UserMenu.tsx（新規）
- アバター（`session.user.image`）表示
- ドロップダウンでログアウト（`signOut`）
- 未ログイン時はログインリンク

### 3.3 src/components/layout/MatchLayout.tsx 更新
- フッターナビ右端にアバター / ログインリンクを追加
- `auth()` で Session を取得して UserMenu に渡す

## Phase 4: テスト

### ユニットテスト
- `auth.ts` の jwt / session コールバック
- 認証必須 API の 401 返却
- 公開 API の未認証 200

### E2E テスト
- 未ログイン → 保護ページ → `/login` リダイレクト
- 未ログイン → `/matches/[shareCode]/watch` → 200（観戦可能）
- 未ログイン → `/matches/[shareCode]` → 200（スコア入力可能）
- 既存 13 本の E2E は認証不要ルートのため変更なし

## リスクと対策

| リスク | 対策 |
|--------|------|
| middleware matcher の誤設定で観戦 URL を保護 | E2E で未認証アクセス 200 を必須検証 |
| avatarUrl → image リネームで既存コードが壊れる | `grep -r "avatarUrl"` で参照箇所を全洗い出し後に一括置換 |
| SSE エンドポイントを誤って保護 | matcher に含めない + E2E 確認 |
| JWT サイズ肥大化（Cookie 制限超過） | token には id のみ格納 |
| MatchLayout が Server Component 化で usePathname 等が壊れる | UserMenu を Client Component に切り出し、MatchLayout は Server Component のまま auth() を呼ぶ |

## 成功基準

- [ ] 未ログインで `/teams` → `/login` リダイレクト
- [ ] Google ログイン後、フッターにアバター表示
- [ ] 未ログインで `/matches/[shareCode]/watch` が表示できる
- [ ] 未ログインで `/matches/[shareCode]` でスコア入力できる
- [ ] SSE 接続が認証なしで維持される
- [ ] 試合・チーム作成時に `createdByUserId` が記録される
- [ ] 既存 E2E 13 本が全 GREEN
- [ ] `AUTH_GOOGLE_SECRET` 等がログ・コミットに含まれない
