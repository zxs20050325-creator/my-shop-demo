import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const request = require('supertest')
const app = require('../src/app')

describe('health endpoint', () => {
    it('returns a normalized success response', async () => {
        const response = await request(app).get('/health')
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
        expect(response.body.data.status).toBe('ok')
        expect(response.body.requestId).toBeTruthy()
    })
})
