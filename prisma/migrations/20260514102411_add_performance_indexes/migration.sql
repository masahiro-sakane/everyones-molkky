-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "matches_createdAt_idx" ON "matches"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "sets_matchId_status_idx" ON "sets"("matchId", "status");

-- CreateIndex
CREATE INDEX "throws_teamId_idx" ON "throws"("teamId");
