const express = require('express');
const { z } = require('zod');
const service = require('./service');
const { asyncHandler } = require('../../middleware/async');
const { validate } = require('../../middleware/validate');
const { requireAuth } = require('../../middleware/auth');
const { sendSuccess } = require('../../shared/response');

const router = express.Router();
router.use(requireAuth);

router.get('/',
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.listCart(req.user.id))
    )
);

router.post('/items',
    validate({
        body: z.object({
            skuId: z.coerce.number().int().positive(),
            quantity: z.coerce.number().int().min(1).max(99).default(1)
        })
    }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.addToCart(req.user.id, req.body.skuId, req.body.quantity), { status: 201 })
    )
);

router.patch('/items/:id',
    validate({
        params: z.object({ id: z.coerce.number().int().positive() }),
        body: z.object({
            quantity: z.coerce.number().int().min(1).max(99).optional(),
            selected: z.boolean().optional()
        }).refine(body => body.quantity !== undefined || body.selected !== undefined, {
            message: '至少提供一个修改字段'
        })
    }),
    asyncHandler(async (req, res) => {
        const result = req.body.quantity !== undefined
            ? await service.updateQuantity(req.user.id, req.params.id, req.body.quantity)
            : await service.setSelected(req.user.id, req.params.id, req.body.selected);
        return sendSuccess(res, result);
    })
);

router.delete('/items/:id',
    validate({ params: z.object({ id: z.coerce.number().int().positive() }) }),
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.removeItem(req.user.id, req.params.id))
    )
);

router.delete('/',
    asyncHandler(async (req, res) =>
        sendSuccess(res, await service.clearCart(req.user.id))
    )
);

module.exports = router;
