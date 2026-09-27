const express = require('express');
const { z } = require('zod');
const service = require('./service');
const { asyncHandler } = require('../../middleware/async');
const { validate } = require('../../middleware/validate');
const { sendSuccess } = require('../../shared/response');

const router = express.Router();

router.get('/products',
    validate({
        query: z.object({
            q: z.string().trim().max(80).optional().default(''),
            category: z.string().trim().max(60).optional().default(''),
            sort: z.enum(['default', 'price_asc', 'price_desc', 'newest']).optional().default('default'),
            page: z.coerce.number().int().positive().optional().default(1),
            pageSize: z.coerce.number().int().min(1).max(60).optional().default(12)
        })
    }),
    asyncHandler(async (req, res) => {
        const result = await service.listProducts(req.query);
        return sendSuccess(res, { items: result.items }, {
            meta: { total: result.total, page: result.page, pageSize: result.pageSize }
        });
    })
);

router.get('/products/:id',
    validate({ params: z.object({ id: z.coerce.number().int().positive() }) }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.getProduct(req.params.id))
    )
);

router.get('/categories',
    asyncHandler(async (_req, res) =>
        sendSuccess(res, { items: await service.listCategories() })
    )
);

router.get('/users/:username/public',
    validate({
        params: z.object({
            username: z.string().trim().min(1).max(32)
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.getPublicUser(req.params.username))
    )
);

router.post('/track',
    validate({
        body: z.object({
            action: z.string().trim().min(1).max(60),
            product: z.string().trim().max(120).optional().default('')
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.track(req.user, req.body.action, req.body.product))
    )
);

module.exports = router;
