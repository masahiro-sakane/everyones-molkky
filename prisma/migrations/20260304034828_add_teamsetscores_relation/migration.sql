-- AddForeignKey
ALTER TABLE "team_set_scores" ADD CONSTRAINT "team_set_scores_setId_fkey" FOREIGN KEY ("setId") REFERENCES "sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
