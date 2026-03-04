import type { Meta, StoryObj } from '@storybook/nextjs'
import { SkittleInput } from './SkittleInput'

const meta: Meta<typeof SkittleInput> = {
  title: 'Match/SkittleInput',
  component: SkittleInput,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    onConfirm: (knocked: number[]) => console.log('確定:', knocked),
  },
}

export const Disabled: Story = {
  args: {
    onConfirm: () => {},
    disabled: true,
  },
}

export const Loading: Story = {
  args: {
    onConfirm: () => {},
    isLoading: true,
  },
}
