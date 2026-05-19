-- AlterTable: User.name を NULL 許容に変更（Auth.js PrismaAdapter 互換）
ALTER TABLE "users" ALTER COLUMN "name" DROP NOT NULL;
