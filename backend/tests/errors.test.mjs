import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { DatabaseError } = require('../src/shared/errors')
const { normalizeError } = require('../src/middleware/error')

describe('error normalization', () => {
    it('maps stock errors to a 409 response', () => {
        const normalized = normalizeError(new DatabaseError('RPC failed: STOCK_NOT_ENOUGH:商品A'))
        expect(normalized.status).toBe(409)
        expect(normalized.code).toBe('STOCK_NOT_ENOUGH')
        expect(normalized.message).toBe('商品库存不足')
    })
})
