import type { Meta, StoryObj } from '@storybook/nextjs'
import { ScoreChart } from './ScoreChart'

const meta: Meta<typeof ScoreChart> = {
  title: 'Stats/ScoreChart',
  component: ScoreChart,
  tags: ['autodocs'],
  argTypes: {
    height: { control: { type: 'range', min: 150, max: 400, step: 10 } },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const teams = [
  { teamId: 'team-1', teamName: 'チームA' },
  { teamId: 'team-2', teamName: 'チームB' },
]

const snapshots = [
  { throwIndex: 0, teamId: 'team-1', teamName: 'チームA', score: 3, label: 'T1-1' },
  { throwIndex: 1, teamId: 'team-2', teamName: 'チームB', score: 5, label: 'T1-2' },
  { throwIndex: 2, teamId: 'team-1', teamName: 'チームA', score: 9, label: 'T2-1' },
  { throwIndex: 3, teamId: 'team-2', teamName: 'チームB', score: 12, label: 'T2-2' },
  { throwIndex: 4, teamId: 'team-1', teamName: 'チームA', score: 18, label: 'T3-1' },
  { throwIndex: 5, teamId: 'team-2', teamName: 'チームB', score: 20, label: 'T3-2' },
  { throwIndex: 6, teamId: 'team-1', teamName: 'チームA', score: 25, label: 'T4-1' },
  { throwIndex: 7, teamId: 'team-2', teamName: 'チームB', score: 30, label: 'T4-2' },
  { throwIndex: 8, teamId: 'team-1', teamName: 'チームA', score: 35, label: 'T5-1' },
  { throwIndex: 9, teamId: 'team-2', teamName: 'チームB', score: 38, label: 'T5-2' },
  { throwIndex: 10, teamId: 'team-1', teamName: 'チームA', score: 42, label: 'T6-1' },
  { throwIndex: 11, teamId: 'team-2', teamName: 'チームB', score: 42, label: 'T6-2' },
  { throwIndex: 12, teamId: 'team-1', teamName: 'チームA', score: 50, label: 'T7-1' },
]

export const Default: Story = {
  args: {
    snapshots,
    teams,
    height: 200,
  },
}

export const TallChart: Story = {
  args: {
    snapshots,
    teams,
    height: 320,
  },
}

export const ThreeTeams: Story = {
  args: {
    teams: [
      { teamId: 'team-1', teamName: 'チームA' },
      { teamId: 'team-2', teamName: 'チームB' },
      { teamId: 'team-3', teamName: 'チームC' },
    ],
    snapshots: [
      { throwIndex: 0, teamId: 'team-1', teamName: 'チームA', score: 5, label: 'T1-1' },
      { throwIndex: 1, teamId: 'team-2', teamName: 'チームB', score: 3, label: 'T1-2' },
      { throwIndex: 2, teamId: 'team-3', teamName: 'チームC', score: 8, label: 'T1-3' },
      { throwIndex: 3, teamId: 'team-1', teamName: 'チームA', score: 15, label: 'T2-1' },
      { throwIndex: 4, teamId: 'team-2', teamName: 'チームB', score: 10, label: 'T2-2' },
      { throwIndex: 5, teamId: 'team-3', teamName: 'チームC', score: 20, label: 'T2-3' },
      { throwIndex: 6, teamId: 'team-1', teamName: 'チームA', score: 28, label: 'T3-1' },
      { throwIndex: 7, teamId: 'team-2', teamName: 'チームB', score: 22, label: 'T3-2' },
      { throwIndex: 8, teamId: 'team-3', teamName: 'チームC', score: 35, label: 'T3-3' },
      { throwIndex: 9, teamId: 'team-1', teamName: 'チームA', score: 40, label: 'T4-1' },
      { throwIndex: 10, teamId: 'team-2', teamName: 'チームB', score: 50, label: 'T4-2' },
    ],
    height: 200,
  },
}

export const Empty: Story = {
  args: {
    snapshots: [],
    teams,
    height: 200,
  },
}
