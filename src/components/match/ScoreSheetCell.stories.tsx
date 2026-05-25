import type { Meta, StoryObj } from '@storybook/nextjs'
import { ScoreSheetCell } from './ScoreSheetCell'
import type { ScoreSheetCell as Cell } from '@/types/scoreSheet'

const meta: Meta<typeof ScoreSheetCell> = {
  title: 'Match/ScoreSheetCell',
  component: ScoreSheetCell,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <table>
        <tbody>
          <tr>
            <Story />
          </tr>
        </tbody>
      </table>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof meta>

const baseCell: Cell = {
  teamId: 'team-a',
  userId: 'user-1',
  throwId: null,
  throwIndex: 1,
  value: { kind: 'empty' },
}

export const Empty: Story = {
  args: { cell: baseCell },
}

export const Score: Story = {
  args: { cell: { ...baseCell, value: { kind: 'score', n: 7, isSingle: false } } },
}

export const Miss: Story = {
  args: { cell: { ...baseCell, value: { kind: 'miss' } } },
}

export const Goal: Story = {
  args: { cell: { ...baseCell, value: { kind: 'goal', score: 10 } } },
}

export const Reset: Story = {
  args: { cell: { ...baseCell, value: { kind: 'reset', score: 15 } } },
}

export const Fault: Story = {
  args: { cell: { ...baseCell, value: { kind: 'fault', faultType: 'STEP_OVER' } } },
}

export const Disqualified: Story = {
  args: { cell: { ...baseCell, value: { kind: 'disqualified' } }, isTeamDisqualified: true },
}

export const Current: Story = {
  args: { cell: { ...baseCell, value: { kind: 'pending' } }, isCurrent: true },
}

