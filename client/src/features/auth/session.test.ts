import { describe, expect, it } from 'vitest'
import { decodeToken, isExpired, tokenExpiresAt } from './session'

// tao JWT gia (chi can phan payload) de test giai ma
function fakeJwt(payload: object): string {
  const json = new TextEncoder().encode(JSON.stringify(payload))
  const b64 = btoa(String.fromCharCode(...json))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${b64}.signature`
}

describe('session', () => {
  it('giai ma payload JWT ke ca ky tu unicode', () => {
    const token = fakeJwt({ sub: 7, email: 'tùng@example.com', exp: 2_000_000_000 })
    expect(decodeToken(token)).toMatchObject({ sub: 7, email: 'tùng@example.com' })
    expect(tokenExpiresAt(token)).toBe(2_000_000_000_000)
  })

  it('tra null voi token hong', () => {
    expect(decodeToken('khong-phai-jwt')).toBeNull()
    expect(decodeToken('a.b.c')).toBeNull()
  })

  it('kiem tra het han', () => {
    expect(isExpired({ sub: 1, email: 'a', exp: 100 }, 101_000)).toBe(true)
    expect(isExpired({ sub: 1, email: 'a', exp: 100 }, 99_000)).toBe(false)
    expect(isExpired({ sub: 1, email: 'a' })).toBe(false)
  })
})
