import { describe, expect, it } from 'vitest'
import { ApiError, imageUrl } from '../src/api'

describe('api helpers', () => {
    it('builds local image URLs', () => {
        expect(imageUrl('/images/001.jpg')).toBe('/images/001.jpg')
        expect(imageUrl('001.jpg')).toBe('/images/001.jpg')
    })

    it('keeps absolute image URLs', () => {
        expect(imageUrl('https://example.com/a.jpg')).toBe('https://example.com/a.jpg')
    })

    it('creates an ApiError with status and code', () => {
        const error = new ApiError('库存不足', 409, 'STOCK_NOT_ENOUGH')
        expect(error.status).toBe(409)
        expect(error.code).toBe('STOCK_NOT_ENOUGH')
    })
})
