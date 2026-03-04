'use client'

import { useMemo } from 'react'

type DataPoint = {
  throwIndex: number
  teamId: string
  teamName: string
  score: number
  label: string
}

type ScoreChartProps = {
  snapshots: DataPoint[]
  teams: { teamId: string; teamName: string }[]
  height?: number
}

const WIN_SCORE = 50
const COLORS = [
  '#0C66E4', // brand-500
  '#22A06B', // success-500
  '#B38600', // warning-500
  '#E34935', // danger-500
  '#8270DB', // purple
  '#1D7AFC', // blue-light
]

function buildTeamLines(
  snapshots: DataPoint[],
  teams: { teamId: string; teamName: string }[]
): Map<string, DataPoint[]> {
  const map = new Map<string, DataPoint[]>()
  for (const t of teams) map.set(t.teamId, [])

  // 各チームの時系列を構築（他チームの投擲時は直前スコアを維持）
  const allIndexes = [...new Set(snapshots.map((s) => s.throwIndex))].sort((a, b) => a - b)

  const currentScores: Record<string, number> = {}
  for (const t of teams) currentScores[t.teamId] = 0

  for (const idx of allIndexes) {
    const snap = snapshots.find((s) => s.throwIndex === idx)
    if (!snap) continue
    currentScores[snap.teamId] = snap.score
    for (const t of teams) {
      map.get(t.teamId)!.push({
        throwIndex: idx,
        teamId: t.teamId,
        teamName: t.teamName,
        score: currentScores[t.teamId],
        label: snap.teamId === t.teamId ? snap.label : '',
      })
    }
  }

  return map
}

export function ScoreChart({ snapshots, teams, height = 200 }: ScoreChartProps) {
  const WIDTH = 600
  const PADDING = { top: 16, right: 16, bottom: 32, left: 40 }
  const chartW = WIDTH - PADDING.left - PADDING.right
  const chartH = height - PADDING.top - PADDING.bottom

  const teamLines = useMemo(
    () => buildTeamLines(snapshots, teams),
    [snapshots, teams]
  )

  const maxIndex = snapshots.length > 0 ? Math.max(...snapshots.map((s) => s.throwIndex)) : 0

  // X座標: throwIndex → ピクセル
  const xScale = (i: number) =>
    maxIndex > 0 ? (i / maxIndex) * chartW : 0

  // Y座標: score → ピクセル（上が0点、下がWIN_SCORE）
  const yScale = (score: number) =>
    chartH - Math.min(score / WIN_SCORE, 1) * chartH

  if (snapshots.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-neutral-400">
        投擲データがありません
      </div>
    )
  }

  // Y軸目盛り（10点刻み）
  const yTicks = [0, 10, 20, 30, 40, 50]

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${height}`}
        className="w-full"
        style={{ minWidth: '300px' }}
        role="img"
        aria-label="スコア推移グラフ"
      >
        <g transform={`translate(${PADDING.left},${PADDING.top})`}>
          {/* グリッド & Y軸ラベル */}
          {yTicks.map((tick) => {
            const y = yScale(tick)
            return (
              <g key={tick}>
                <line
                  x1={0} y1={y} x2={chartW} y2={y}
                  stroke={tick === WIN_SCORE ? '#0C66E4' : '#E8ECED'}
                  strokeWidth={tick === WIN_SCORE ? 1.5 : 1}
                  strokeDasharray={tick === WIN_SCORE ? '4 2' : undefined}
                />
                <text
                  x={-6} y={y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="#758195"
                >
                  {tick}
                </text>
              </g>
            )
          })}

          {/* 各チームの折れ線 */}
          {teams.map((team, i) => {
            const points = teamLines.get(team.teamId) ?? []
            if (points.length === 0) return null

            const pathD = points
              .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(p.throwIndex)} ${yScale(p.score)}`)
              .join(' ')

            const color = COLORS[i % COLORS.length]

            return (
              <g key={team.teamId}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {/* 最終ポイントにドット */}
                {points.at(-1) && (
                  <circle
                    cx={xScale(points.at(-1)!.throwIndex)}
                    cy={yScale(points.at(-1)!.score)}
                    r={4}
                    fill={color}
                  />
                )}
              </g>
            )
          })}

          {/* X軸ベースライン */}
          <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="#E8ECED" />
        </g>
      </svg>

      {/* 凡例 */}
      <div className="flex flex-wrap gap-3 mt-2 px-1">
        {teams.map((team, i) => (
          <div key={team.teamId} className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
              aria-hidden="true"
            />
            <span className="text-xs text-neutral-600">{team.teamName}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-6 border-t-2 border-dashed border-brand-500" aria-hidden="true" />
          <span className="text-xs text-neutral-400">50点（ゴール）</span>
        </div>
      </div>
    </div>
  )
}
