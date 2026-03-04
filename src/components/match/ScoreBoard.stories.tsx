import type { Meta, StoryObj } from '@storybook/nextjs'
import { ScoreBoard } from './ScoreBoard'
import type { TeamScore } from '@/types/score'

const meta: Meta<typeof ScoreBoard> = {
  title: 'Match/ScoreBoard',
  component: ScoreBoard,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

const teams: TeamScore[] = [
  { teamId: 'a', teamName: 'チームA', totalScore: 32, consecutiveMisses: 0, isDisqualified: false },
  { teamId: 'b', teamName: 'チームB', totalScore: 25, consecutiveMisses: 1, isDisqualified: false },
]

export const Default: Story = { args: { teams } }

export const CloseToWin: Story = {
  args: {
    teams: [
      { teamId: 'a', teamName: 'チームA', totalScore: 45, consecutiveMisses: 0, isDisqualified: false },
      { teamId: 'b', teamName: 'チームB', totalScore: 30, consecutiveMisses: 0, isDisqualified: false },
    ],
  },
}

export const WithDisqualified: Story = {
  args: {
    teams: [
      { teamId: 'a', teamName: 'チームA', totalScore: 40, consecutiveMisses: 0, isDisqualified: false },
      { teamId: 'b', teamName: 'チームB', totalScore: 0, consecutiveMisses: 3, isDisqualified: true },
    ],
  },
}
