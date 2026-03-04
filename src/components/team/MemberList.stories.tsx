import type { Meta, StoryObj } from '@storybook/nextjs'
import { MemberList } from './MemberList'

const meta: Meta<typeof MemberList> = {
  title: 'Team/MemberList',
  component: MemberList,
  tags: ['autodocs'],
  parameters: {
    nextjs: {
      appDirectory: true,
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const mockMembers = [
  { userId: 'user-1', role: 'captain', user: { id: 'user-1', name: '田中 太郎' } },
  { userId: 'user-2', role: 'member', user: { id: 'user-2', name: '佐藤 花子' } },
  { userId: 'user-3', role: 'member', user: { id: 'user-3', name: '鈴木 一郎' } },
]

const allUsers = [
  { id: 'user-1', name: '田中 太郎' },
  { id: 'user-2', name: '佐藤 花子' },
  { id: 'user-3', name: '鈴木 一郎' },
  { id: 'user-4', name: '高橋 二郎' },
]

export const Default: Story = {
  args: {
    teamId: 'team-1',
    members: mockMembers,
    allUsers,
  },
}

export const Empty: Story = {
  args: {
    teamId: 'team-1',
    members: [],
    allUsers,
  },
}

export const SingleMember: Story = {
  args: {
    teamId: 'team-1',
    members: [mockMembers[0]],
    allUsers,
  },
}
