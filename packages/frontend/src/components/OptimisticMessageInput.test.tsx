import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'
import OptimisticMessageInput from './OptimisticMessageInput'

jest.mock('../../socket', () => ({
  getSocket: () => ({
    emit: (_ev: string, _payload: any, cb: any) => cb({ ok: true, data: { id: 'srv_123', content: _payload.content, channelId: _payload.channelId, createdAt: new Date().toISOString(), author: { id: 'u1', name: 'User' } } })
  })
}))

test('optimistic send: calls onSent immediately then onConfirm on ack', async () => {
  const onSent = jest.fn()
  const onConfirm = jest.fn()
  const onFail = jest.fn()
  const { getByPlaceholderText, getByText } = render(
    <OptimisticMessageInput channelId="c1" user={{ id: 'u1', name: 'Me' }} onSent={onSent} onConfirm={onConfirm} onFail={onFail} />
  )

  const input = getByPlaceholderText('Message #general') as HTMLInputElement
  fireEvent.change(input, { target: { value: 'hello' } })
  fireEvent.click(getByText('Send'))

  expect(onSent).toHaveBeenCalledTimes(1)
  await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
  expect(onFail).toHaveBeenCalledTimes(0)
})
