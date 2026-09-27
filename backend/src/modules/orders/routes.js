const express = require('express');
const { z } = require('zod');
const service = require('./service');
const { asyncHandler } = require('../../middleware/async');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { sendSuccess } = require('../../shared/response');

const router = express.Router();
router.use(requireAuth);

router.post('/',
    validate({
        body: z.object({
            addressId: z.coerce.number().int().positive(),
            paymentMethod: z.enum(['wechat', 'digital']).default('wechat')
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.createOrder(req.user.id, req.body), { status: 201 })
    )
);

router.get('/',
    validate({
        query: z.object({
            status: z.enum(['待付款', '待发货', '已发货', '已完成', '已取消']).optional(),
            page: z.coerce.number().int().positive().default(1),
            pageSize: z.coerce.number().int().min(1).max(50).default(20)
        })
    }),
    asyncHandler(async (req, res) => {
        const result = await service.listOrders(req.user.id, req.query);
        return sendSuccess(res, { items: result.items }, {
            meta: { total: result.total, page: result.page, pageSize: result.pageSize }
        });
    })
);

router.get('/refunds',
    validate({
        query: z.object({
            page: z.coerce.number().int().positive().default(1),
            pageSize: z.coerce.number().int().min(1).max(50).default(20)
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.listRefunds(req.user.id, req.query))
    )
);

router.get('/:id',
    validate({ params: z.object({ id: z.coerce.number().int().positive() }) }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.getOrder(req.user.id, req.params.id))
    )
);

router.post('/:id/demo-pay',
    validate({
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: z.object({ method: z.enum(['wechat', 'digital']).default('wechat') })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.payOrder(req.user.id, req.params.id, req.body.method))
    )
);

router.post('/:id/cancel',
    validate({
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: z.object({ reason: z.string().trim().max(120).optional().default('用户取消') })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.cancelOrder(req.user.id, req.params.id, req.body.reason))
    )
);

router.post('/:id/refunds',
    validate({
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: z.object({ reason: z.string().trim().min(2, '请填写退款原因').max(200) })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.requestRefund(req.user.id, req.params.id, req.body.reason), { status: 201 })
    )
);

module.exports = router;
