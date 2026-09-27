const express = require('express');
const { z } = require('zod');
const service = require('./service');
const { asyncHandler } = require('../../middleware/async');
const { validate } = require('../../middleware/validate');
const { requireAuth, requireAdmin } = require('../../middleware/auth');
const { sendSuccess } = require('../../shared/response');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const statusSchema = z.enum(['待付款', '待发货', '已发货', '已完成', '已取消']);
const skuCreateSchema = z.object({
    skuCode: z.string().trim().min(2).max(60),
    specValues: z.record(z.string(), z.string()).optional().default({}),
    specText: z.string().trim().min(1).max(80).default('默认规格'),
    priceCents: z.coerce.number().int().min(0),
    stock: z.coerce.number().int().min(0).max(999999).default(0),
    active: z.coerce.number().int().min(0).max(1).default(1)
});

router.get('/dashboard',
    asyncHandler(async (_req, res) => sendSuccess(res, await service.dashboard()))
);

router.get('/products',
    validate({
        query: z.object({
            page: z.coerce.number().int().positive().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).default(60)
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.listProducts(req.query))
    )
);

router.post('/products',
    validate({
        body: z.object({
            name: z.string().trim().min(1).max(100),
            subtitle: z.string().trim().max(160).optional().default(''),
            description: z.string().trim().max(2000).optional().default(''),
            category: z.string().trim().min(1).max(50),
            coverImg: z.string().trim().min(1).max(300),
            status: z.coerce.number().int().min(0).max(1).default(1),
            sku: skuCreateSchema
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, { product: await service.createProduct(req.body) }, { status: 201 })
    )
);

router.put('/products/:id',
    validate({
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: z.object({
            name: z.string().trim().min(1).max(100).optional(),
            subtitle: z.string().trim().max(160).optional(),
            description: z.string().trim().max(2000).optional(),
            category: z.string().trim().min(1).max(50).optional(),
            coverImg: z.string().trim().min(1).max(300).optional(),
            status: z.coerce.number().int().min(0).max(1).optional()
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, { product: await service.updateProduct(req.params.id, req.body) })
    )
);

router.post('/products/:id/skus',
    validate({
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: skuCreateSchema
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, { sku: await service.createSku(req.params.id, req.body) }, { status: 201 })
    )
);

router.put('/skus/:id',
    validate({
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: skuCreateSchema.partial()
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, { sku: await service.updateSku(req.params.id, req.body) })
    )
);

router.post('/skus/:id/stock',
    validate({
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: z.object({
            stock: z.coerce.number().int().min(0).max(999999),
            reason: z.string().trim().max(120).optional().default('管理员调整库存')
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.adjustStock(
            req.params.id,
            req.body.stock,
            req.user.id,
            req.body.reason
        ))
    )
);

router.get('/orders',
    validate({
        query: z.object({
            status: statusSchema.optional(),
            page: z.coerce.number().int().positive().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).default(30)
        })
    }),
    asyncHandler(async (req, res) => {
        const result = await service.listOrders(req.query);
        return sendSuccess(res, { items: result.items }, { meta: { total: result.total } });
    })
);

router.get('/orders/:id',
    validate({ params: z.object({ id: z.coerce.number().int().positive() }) }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.getOrder(req.params.id))
    )
);

router.patch('/orders/:id/status',
    validate({
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: z.object({
            status: statusSchema,
            remark: z.string().trim().max(120).optional().default('')
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.updateOrderStatus(
            req.params.id,
            req.body.status,
            req.user.id,
            req.body.remark
        ))
    )
);

router.get('/refunds',
    validate({
        query: z.object({
            status: z.enum(['待处理', '已同意', '已拒绝', '已撤销']).optional(),
            page: z.coerce.number().int().positive().default(1),
            pageSize: z.coerce.number().int().min(1).max(100).default(30)
        })
    }),
    asyncHandler(async (req, res) => {
        const result = await service.listRefunds(req.query);
        return sendSuccess(res, { items: result.items }, { meta: { total: result.total } });
    })
);

router.patch('/refunds/:id',
    validate({
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: z.object({
            approve: z.boolean(),
            note: z.string().trim().max(200).optional().default('')
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.handleRefund(
            req.params.id,
            req.user.id,
            req.body.approve,
            req.body.note
        ))
    )
);

router.get('/users',
    asyncHandler(async (_req, res) =>
        sendSuccess(res, { items: await service.listUsers() })
    )
);

router.get('/logs',
    validate({
        query: z.object({
            limit: z.coerce.number().int().min(1).max(1000).default(200)
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, { items: await service.listLogs(req.query.limit) })
    )
);

router.delete('/logs',
    asyncHandler(async (_req, res) =>
        sendSuccess(res, await service.clearLogs())
    )
);

module.exports = router;
