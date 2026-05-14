import type { Meta, StoryObj } from '@storybook/nextjs'
import { ScoreInputPanel } from './ScoreInputPanel'

const meta: Meta<typeof ScoreInputPanel> = {
  title: 'Match/ScoreInputPanel',
  component: ScoreInputPanel,
  tags: ['autodocs'],
  argTypes: {
    isFirstThrow: { control: 'boolean' },
    disabled: { control: 'boolean' },
    isLoading: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const baseArgs = {
  onConfirm: (knocked: number[]) => console.log('確定:', knocked),
  onMiss: () => console.log('ミス'),
}

export const InitialThrowMultiMode: Story = {
  name: '試合開始時（複数本モード）',
  args: { ...baseArgs, isFirstThrow: true },
}

export const SubsequentSingleMode: Story = {
  name: '2投目以降（1本モード）',
  args: { ...baseArgs, isFirstThrow: false },
}

export const Disabled: Story = {
  args: { ...baseArgs, isFirstThrow: false, disabled: true },
}

export const Loading: Story = {
  args: { ...baseArgs, isFirstThrow: false, isLoading: true },
}
