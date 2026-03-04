import type { Meta, StoryObj } from '@storybook/nextjs'
import { CreateTeamForm } from './CreateTeamForm'

const meta: Meta<typeof CreateTeamForm> = {
  title: 'Team/CreateTeamForm',
  component: CreateTeamForm,
  tags: ['autodocs'],
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
