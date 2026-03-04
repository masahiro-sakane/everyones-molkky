import type { Meta, StoryObj } from '@storybook/nextjs'
import { StatCard } from './StatCard'

const meta: Meta<typeof StatCard> = {
  title: 'Stats/StatCard',
  component: StatCard,
  tags: ['autodocs'],
  argTypes: {
    highlight: { control: 'boolean' },
    value: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    label: '試合数',
    value: 12,
    unit: '試合',
  },
}

export const Highlight: Story = {
  args: {
    label: '勝率',
    value: 75,
    unit: '%',
    sub: '9勝 3敗',
    highlight: true,
  },
}

export const WithSub: Story = {
  args: {
    label: '勝率',
    value: 60,
    unit: '%',
    sub: '6勝 4敗',
  },
}

export const AllCards: Story = {
  render: () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg">
      <StatCard label="勝率" value={75} unit="%" sub="9勝 3敗" highlight />
      <StatCard label="試合数" value={12} unit="試合" />
      <StatCard label="平均最終スコア" value={42} unit="点" />
      <StatCard label="平均投擲スコア" value={3.2} unit="点" />
      <StatCard label="ミス率" value={18} unit="%" />
      <StatCard label="失格回数" value={2} unit="回" />
    </div>
  ),
}
