import type { Meta, StoryObj } from '@storybook/nextjs'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { label: '名前', placeholder: '田中 太郎' },
}

export const WithError: Story = {
  args: { label: 'メール', error: '有効なメールアドレスを入力してください', value: 'invalid' },
}

export const WithHint: Story = {
  args: { label: 'ユーザー名', hint: '50文字以内で入力してください' },
}

export const Required: Story = {
  args: { label: 'チーム名', isRequired: true, placeholder: 'チームA' },
}

export const Disabled: Story = {
  args: { label: '無効フィールド', value: '編集不可', disabled: true },
}
