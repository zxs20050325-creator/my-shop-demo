import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
    hashPassword,
    verifyPassword,
    hashToken,
    centsFromYuan,
    yuanFromCents
} = require('../src/shared/security')

describe('security helpers', () => {
    it('hashes and verifies passwords without storing plaintext', () => {
        const stored = hashPassword('demo123456')
        expect(stored).not.toContain('demo123456')
        expect(verifyPassword(stored, 'demo123456')).toBe(true)
        expect(verifyPassword(stored, 'wrong-password')).toBe(false)
    })

    it('hashes refresh tokens deterministically', () => {
        const token = 'refresh-token'
        expect(hashToken(token)).toBe(hashToken(token))
        expect(hashToken(token)).not.toBe(token)
    })

    it('converts yuan and cents safely', () => {
        expect(centsFromYuan(19.9)).toBe(1990)
        expect(yuanFromCents(1990)).toBe(19.9)
    })
})
