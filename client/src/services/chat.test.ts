import { describe, expect, it } from 'vitest'
import { mergeHistory, newClientId, toItem, upsertMessage, type ChatItem, type ChatMessage } from './chat'

const msg = (id: number, extra: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  roomId: 3,
  userId: 1,
  content: `tin ${id}`,
  createdAt: '2026-11-26T10:00:00.000Z',
  user: { id: 1, name: 'Sơn' },
  ...extra,
})

const pending = (key: string): ChatItem => ({
  key,
  roomId: 3,
  userId: 1,
  content: 'đang gửi',
  createdAt: '2026-11-26T10:00:00.000Z',
  user: { id: 1, name: 'Sơn' },
  status: 'sending',
})

describe('upsertMessage', () => {
  it('appends new messages', () => {
    expect(upsertMessage([toItem(msg(1))], msg(2)).map((m) => m.id)).toEqual([1, 2])
  })

  it('ignores duplicates', () => {
    const list = [toItem(msg(1))]
    expect(upsertMessage(list, msg(1))).toBe(list)
  })

  it('replaces the pending message with the saved one', () => {
    const list = [toItem(msg(1)), pending('tmp-a'), pending('tmp-b')]
    const next = upsertMessage(list, msg(5, { clientId: 'tmp-a' }))
    expect(next.map((m) => m.key)).toEqual(['m-1', 'm-5', 'tmp-b'])
    expect(next[1].status).toBeUndefined()
  })
})

describe('mergeHistory', () => {
  it('keeps live and pending messages not in history', () => {
    const current = [toItem(msg(2)), toItem(msg(3)), pending('tmp-a')]
    const merged = mergeHistory([msg(1), msg(2)], current)
    expect(merged.map((m) => m.key)).toEqual(['m-1', 'm-2', 'm-3', 'tmp-a'])
  })
})

describe('newClientId', () => {
  it('is unique', () => {
    expect(newClientId()).not.toBe(newClientId())
  })
})
