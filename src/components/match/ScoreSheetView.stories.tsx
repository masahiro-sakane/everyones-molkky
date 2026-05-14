import type { Meta, StoryObj } from '@storybook/nextjs'
import { ScoreSheetView } from './ScoreSheetView'
import type { ScoreSheetData, ScoreSheetRow, TeamColumn } from '@/types/scoreSheet'

const meta: Meta<typeof ScoreSheetView> = {
  title: 'Match/ScoreSheetView',
  component: ScoreSheetView,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof meta>

function buildSampleColumns(
  teams: Array<{ id: string; name: string; members: string[] }>
): TeamColumn[] {
  return teams.map((t, i) => ({
    teamId: t.id,
    teamName: t.name,
    order: i + 1,
    members: t.members.map((m, mi) => ({
      userId: `${t.id}-m${mi + 1}`,
      userName: m,
    })),
    isDisqualified: false,
    isWinner: false,
  }))
}

function buildSampleRows(
  columns: TeamColumn[],
  rounds: number
): ScoreSheetRow[] {
  const rows: ScoreSheetRow[] = []
  const cumulative = new Map<string, number>()
  columns.forEach((c) => cumulative.set(c.teamId, 0))

  for (let r = 0; r < rounds; r++) {
    const cellsByTeam = new Map<string, ScoreSheetRow['cellsByTeam'] extends Map<string, infer V> ? V : never>()
    const cumulativeByTeam = new Map<string, ScoreSheetRow['cumulativeByTeam'] extends Map<string, infer V> ? V : never>()

    columns.forEach((col) => {
      const cells = col.members.map((m, mi) => ({
        teamId: col.teamId,
        userId: `${col.teamId}-m${mi + 1}`,
        throwId: null,
        throwIndex: mi + 1,
        isLeadMarker: r === 0 && mi === 0,
        leadMarkerNumber: r === 0 && mi === 0 ? 1 : undefined,
        value:
          mi === r % col.members.length
            ? ({ kind: 'score', n: (r + mi + 1) * 2, isSingle: false } as const)
            : ({ kind: 'empty' } as const),
      }))
      cellsByTeam.set(col.teamId, cells)

      const add = (r + 1) * 2
      const next = (cumulative.get(col.teamId) ?? 0) + add
      cumulative.set(col.teamId, next)
      cumulativeByTeam.set(col.teamId, {
        total: next,
        isWinner: false,
        hasReset: false,
        becameDisqualified: false,
        throwCount: r + 1,
        hasThrowInRow: true,
      })
    })

    rows.push({ rowIndex: r + 1, cellsByTeam, cumulativeByTeam })
  }

  return rows
}

const cols3x3 = buildSampleColumns([
  { id: 'a', name: 'TeamJapan', members: ['のび太', 'スネオ', 'ジャイアン'] },
  { id: 'b', name: 'TeamFinland', members: ['ムーミン', 'スナフキン', 'ミイ'] },
  { id: 'c', name: 'TeamUSA', members: ['ミッキー', 'ミニー', 'ドナルド'] },
])

const sample3x3: ScoreSheetData = {
  columns: cols3x3,
  rows: buildSampleRows(cols3x3, 8),
  currentCell: { rowIndex: 9, teamId: 'a', userId: 'a-m1' },
  rankings: [
    { teamId: 'a', teamName: 'TeamJapan', totalScore: 80, rank: 1, isDisqualified: false },
    { teamId: 'b', teamName: 'TeamFinland', totalScore: 65, rank: 2, isDisqualified: false },
    { teamId: 'c', teamName: 'TeamUSA', totalScore: 50, rank: 3, isDisqualified: false },
  ],
  isFinished: false,
  isFirstThrow: false,
}

export const ThreeTeamsThreeMembers: Story = {
  name: '3チーム×3名',
  args: { data: sample3x3, title: 'モルック得点表', matchDate: '2026年 5月 13日 No.1' },
}

const cols2x1 = buildSampleColumns([
  { id: 'a', name: 'チームA', members: ['太郎'] },
  { id: 'b', name: 'チームB', members: ['花子'] },
])

const sample2x1: ScoreSheetData = {
  columns: cols2x1,
  rows: buildSampleRows(cols2x1, 5),
  currentCell: { rowIndex: 6, teamId: 'a', userId: 'a-m1' },
  rankings: [
    { teamId: 'a', teamName: 'チームA', totalScore: 30, rank: 1, isDisqualified: false },
    { teamId: 'b', teamName: 'チームB', totalScore: 30, rank: 2, isDisqualified: false },
  ],
  isFinished: false,
  isFirstThrow: false,
}

export const TwoTeamsOneMember: Story = {
  name: '2チーム×1名',
  args: { data: sample2x1 },
}

const cols4x2 = buildSampleColumns([
  { id: 'a', name: 'A', members: ['Alice', 'Bob'] },
  { id: 'b', name: 'B', members: ['Carol', 'Dan'] },
  { id: 'c', name: 'C', members: ['Eve', 'Frank'] },
  { id: 'd', name: 'D', members: ['Grace', 'Heidi'] },
])

const sample4x2: ScoreSheetData = {
  columns: cols4x2,
  rows: buildSampleRows(cols4x2, 6),
  currentCell: null,
  rankings: cols4x2.map((c, i) => ({
    teamId: c.teamId,
    teamName: c.teamName,
    totalScore: 50 - i * 8,
    rank: i + 1,
    isDisqualified: false,
  })),
  isFinished: true,
  isFirstThrow: false,
}

export const FourTeamsTwoMembers: Story = {
  name: '4チーム×2名',
  args: { data: sample4x2 },
}

const colsDQ = buildSampleColumns([
  { id: 'a', name: '勝者チーム', members: ['Winner'] },
  { id: 'b', name: '失格チーム', members: ['DQ'] },
])
colsDQ[0].isWinner = true
colsDQ[1].isDisqualified = true

const sampleDQ: ScoreSheetData = {
  columns: colsDQ,
  rows: buildSampleRows(colsDQ, 4),
  currentCell: null,
  rankings: [
    { teamId: 'a', teamName: '勝者チーム', totalScore: 50, rank: 1, isDisqualified: false },
    { teamId: 'b', teamName: '失格チーム', totalScore: 0, rank: 2, isDisqualified: true },
  ],
  isFinished: true,
  isFirstThrow: false,
}

export const WithWinnerAndDisqualified: Story = {
  name: '勝者+失格',
  args: { data: sampleDQ },
}
