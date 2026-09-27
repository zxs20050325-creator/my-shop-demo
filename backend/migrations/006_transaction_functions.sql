-- ============================================================
-- 006 订单、库存、退款核心事务函数
-- 所有函数只授予 service_role
-- ============================================================

CREATE OR REPLACE FUNCTION create_order_from_cart(
    p_user_id         BIGINT,
    p_address_id      BIGINT,
    p_payment_method  TEXT DEFAULT 'wechat'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_address        user_addresses%ROWTYPE;
    v_order_id       BIGINT;
    v_order_no       TEXT;
    v_goods_cents    BIGINT := 0;
    v_item_count     INTEGER := 0;
    v_item           RECORD;
BEGIN
    SELECT *
      INTO v_address
      FROM user_addresses
     WHERE id = p_address_id
       AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ADDRESS_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    PERFORM 1
      FROM cart_items
     WHERE user_id = p_user_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'CART_EMPTY' USING ERRCODE = 'P0001';
    END IF;

    FOR v_item IN
        SELECT c.quantity,
               c.sku_id,
               s.product_id,
               s.price_cents,
               s.stock,
               s.active AS sku_active,
               s.spec_text,
               p.name AS product_name,
               p.cover_img,
               p.status AS product_status
          FROM cart_items c
          JOIN product_skus s ON s.id = c.sku_id
          JOIN products p ON p.id = s.product_id
         WHERE c.user_id = p_user_id
         ORDER BY s.id
         FOR UPDATE OF s
    LOOP
        IF v_item.product_status <> 1 OR v_item.sku_active <> 1 THEN
            RAISE EXCEPTION 'PRODUCT_OFF_SALE:%', v_item.product_name USING ERRCODE = 'P0001';
        END IF;
        IF v_item.stock < v_item.quantity THEN
            RAISE EXCEPTION 'STOCK_NOT_ENOUGH:%', v_item.product_name USING ERRCODE = 'P0001';
        END IF;

        v_goods_cents := v_goods_cents + (v_item.price_cents * v_item.quantity);
        v_item_count := v_item_count + v_item.quantity;
    END LOOP;

    v_order_no := 'JY' || to_char(NOW(), 'YYYYMMDD') || '-' ||
                  upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

    INSERT INTO orders (
        order_no, username, user_id, total, status, payment_status, payment_method,
        goods_amount_cents, discount_amount_cents, payable_amount_cents, paid_amount_cents,
        address, phone, receiver_name, receiver_phone,
        receiver_province, receiver_city, receiver_district, receiver_detail
    )
    VALUES (
        v_order_no,
        (SELECT username FROM users WHERE id = p_user_id),
        p_user_id,
        v_goods_cents / 100.0,
        '待付款',
        'unpaid',
        p_payment_method,
        v_goods_cents,
        0,
        v_goods_cents,
        0,
        concat_ws(' ', v_address.province, v_address.city, v_address.district, v_address.detail),
        v_address.phone,
        v_address.recipient,
        v_address.phone,
        v_address.province,
        v_address.city,
        v_address.district,
        v_address.detail
    )
    RETURNING id INTO v_order_id;

    INSERT INTO order_items (
        order_id, product_id, sku_id, name, product_name, sku_spec_text,
        img, product_img, price, price_cents, quantity, subtotal_cents
    )
    SELECT v_order_id,
           s.product_id,
           s.id,
           p.name,
           p.name,
           s.spec_text,
           COALESCE(NULLIF(p.cover_img, ''), p.img),
           COALESCE(NULLIF(p.cover_img, ''), p.img),
           s.price_cents / 100.0,
           s.price_cents,
           c.quantity,
           s.price_cents * c.quantity
      FROM cart_items c
      JOIN product_skus s ON s.id = c.sku_id
      JOIN products p ON p.id = s.product_id
     WHERE c.user_id = p_user_id;

    INSERT INTO inventory_logs (
        sku_id, order_id, change_quantity, before_stock, after_stock, reason, operator_id
    )
    SELECT s.id,
           v_order_id,
           -c.quantity,
           s.stock,
           s.stock - c.quantity,
           '订单占用库存',
           p_user_id
      FROM cart_items c
      JOIN product_skus s ON s.id = c.sku_id
     WHERE c.user_id = p_user_id;

    UPDATE product_skus s
       SET stock = s.stock - c.quantity
      FROM cart_items c
     WHERE c.user_id = p_user_id
       AND c.sku_id = s.id;

    DELETE FROM cart_items WHERE user_id = p_user_id;

    INSERT INTO order_status_logs (order_id, from_status, to_status, operator_id, operator_role, remark)
    VALUES (v_order_id, NULL, '待付款', p_user_id, 'user', '创建订单');

    INSERT INTO user_logs (username, action, product)
    VALUES (
        (SELECT username FROM users WHERE id = p_user_id),
        '创建订单',
        v_order_no
    );

    RETURN jsonb_build_object(
        'id', v_order_id,
        'orderNo', v_order_no,
        'totalCents', v_goods_cents,
        'itemCount', v_item_count,
        'status', '待付款'
    );
END;
$$;

CREATE OR REPLACE FUNCTION demo_pay_order(
    p_order_id  BIGINT,
    p_user_id   BIGINT,
    p_method    TEXT DEFAULT 'wechat'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order orders%ROWTYPE;
    v_transaction_no TEXT;
BEGIN
    SELECT * INTO v_order
      FROM orders
     WHERE id = p_order_id
       AND user_id = p_user_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;
    IF v_order.status <> '待付款' THEN
        RAISE EXCEPTION 'ORDER_STATUS_INVALID' USING ERRCODE = 'P0001';
    END IF;

    v_transaction_no := 'DEMO' || to_char(NOW(), 'YYYYMMDDHH24MISS') ||
                        upper(substr(md5(random()::text), 1, 8));

    UPDATE orders
       SET status = '待发货',
           payment_status = 'paid',
           payment_method = p_method,
           paid_amount_cents = payable_amount_cents,
           paid_at = NOW()
     WHERE id = p_order_id;

    INSERT INTO payment_records (order_id, user_id, method, amount_cents, transaction_no, status)
    VALUES (p_order_id, p_user_id, p_method, v_order.payable_amount_cents, v_transaction_no, 'success');

    INSERT INTO order_status_logs (order_id, from_status, to_status, operator_id, operator_role, remark)
    VALUES (p_order_id, '待付款', '待发货', p_user_id, 'user', '演示支付成功');

    INSERT INTO user_logs (username, action, product)
    VALUES (
        (SELECT username FROM users WHERE id = p_user_id),
        '支付',
        v_order.order_no
    );

    RETURN jsonb_build_object(
        'orderId', p_order_id,
        'status', '待发货',
        'transactionNo', v_transaction_no
    );
END;
$$;

CREATE OR REPLACE FUNCTION cancel_unpaid_order(
    p_order_id  BIGINT,
    p_user_id   BIGINT,
    p_reason    TEXT DEFAULT '用户取消'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order orders%ROWTYPE;
BEGIN
    SELECT * INTO v_order
      FROM orders
     WHERE id = p_order_id
       AND user_id = p_user_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;
    IF v_order.status <> '待付款' THEN
        RAISE EXCEPTION 'ONLY_UNPAID_CAN_CANCEL' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO inventory_logs (
        sku_id, order_id, change_quantity, before_stock, after_stock, reason, operator_id
    )
    SELECT s.id,
           p_order_id,
           oi.quantity,
           s.stock,
           s.stock + oi.quantity,
           '取消未付款订单恢复库存',
           p_user_id
      FROM order_items oi
      JOIN product_skus s ON s.id = oi.sku_id
     WHERE oi.order_id = p_order_id;

    UPDATE product_skus s
       SET stock = s.stock + oi.quantity
      FROM order_items oi
     WHERE oi.order_id = p_order_id
       AND oi.sku_id = s.id;

    UPDATE orders
       SET status = '已取消',
           payment_status = 'unpaid',
           cancel_reason = p_reason,
           cancelled_at = NOW()
     WHERE id = p_order_id;

    INSERT INTO order_status_logs (order_id, from_status, to_status, operator_id, operator_role, remark)
    VALUES (p_order_id, '待付款', '已取消', p_user_id, 'user', p_reason);

    RETURN jsonb_build_object('orderId', p_order_id, 'status', '已取消');
END;
$$;

CREATE OR REPLACE FUNCTION admin_update_order_status(
    p_order_id   BIGINT,
    p_new_status TEXT,
    p_operator   BIGINT,
    p_remark     TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order orders%ROWTYPE;
BEGIN
    SELECT * INTO v_order
      FROM orders
     WHERE id = p_order_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    IF NOT (
        (v_order.status = '待付款' AND p_new_status IN ('待发货', '已取消')) OR
        (v_order.status = '待发货' AND p_new_status IN ('已发货', '已取消')) OR
        (v_order.status = '已发货' AND p_new_status IN ('已完成', '已取消'))
    ) THEN
        RAISE EXCEPTION 'ORDER_STATUS_TRANSITION_INVALID:%->%', v_order.status, p_new_status
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE orders
       SET status = p_new_status,
           shipped_at = CASE WHEN p_new_status = '已发货' THEN NOW() ELSE shipped_at END,
           completed_at = CASE WHEN p_new_status = '已完成' THEN NOW() ELSE completed_at END,
           cancelled_at = CASE WHEN p_new_status = '已取消' THEN NOW() ELSE cancelled_at END,
           cancel_reason = CASE WHEN p_new_status = '已取消' THEN p_remark ELSE cancel_reason END
     WHERE id = p_order_id;

    INSERT INTO order_status_logs (order_id, from_status, to_status, operator_id, operator_role, remark)
    VALUES (p_order_id, v_order.status, p_new_status, p_operator, 'admin', p_remark);

    RETURN jsonb_build_object('orderId', p_order_id, 'status', p_new_status);
END;
$$;

CREATE OR REPLACE FUNCTION request_order_refund(
    p_order_id BIGINT,
    p_user_id  BIGINT,
    p_reason   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order orders%ROWTYPE;
    v_refund_id BIGINT;
BEGIN
    SELECT * INTO v_order
      FROM orders
     WHERE id = p_order_id
       AND user_id = p_user_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;
    IF v_order.payment_status NOT IN ('paid', 'refund_rejected') THEN
        RAISE EXCEPTION 'ORDER_NOT_PAID' USING ERRCODE = 'P0001';
    END IF;
    IF v_order.status NOT IN ('待发货', '已发货') THEN
        RAISE EXCEPTION 'ORDER_STATUS_NOT_REFUNDABLE' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (
        SELECT 1 FROM refund_requests
         WHERE order_id = p_order_id
           AND status = '待处理'
    ) THEN
        RAISE EXCEPTION 'REFUND_ALREADY_REQUESTED' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO refund_requests (order_id, user_id, reason, amount_cents, status)
    VALUES (p_order_id, p_user_id, p_reason, v_order.paid_amount_cents, '待处理')
    RETURNING id INTO v_refund_id;

    UPDATE orders
       SET payment_status = 'refund_requested'
     WHERE id = p_order_id;

    INSERT INTO order_status_logs (order_id, from_status, to_status, operator_id, operator_role, remark)
    VALUES (p_order_id, v_order.status, v_order.status, p_user_id, 'user', '申请退款：' || p_reason);

    RETURN jsonb_build_object('refundId', v_refund_id, 'status', '待处理');
END;
$$;

CREATE OR REPLACE FUNCTION handle_order_refund(
    p_refund_id  BIGINT,
    p_admin_id   BIGINT,
    p_approve    BOOLEAN,
    p_note       TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_refund refund_requests%ROWTYPE;
    v_order orders%ROWTYPE;
BEGIN
    SELECT * INTO v_refund
      FROM refund_requests
     WHERE id = p_refund_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'REFUND_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;
    IF v_refund.status <> '待处理' THEN
        RAISE EXCEPTION 'REFUND_STATUS_INVALID' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_order
      FROM orders
     WHERE id = v_refund.order_id
     FOR UPDATE;

    IF p_approve THEN
        IF v_order.status = '待发货' THEN
            INSERT INTO inventory_logs (
                sku_id, order_id, change_quantity, before_stock, after_stock, reason, operator_id
            )
            SELECT s.id,
                   v_order.id,
                   oi.quantity,
                   s.stock,
                   s.stock + oi.quantity,
                   '退款同意恢复库存',
                   p_admin_id
              FROM order_items oi
              JOIN product_skus s ON s.id = oi.sku_id
             WHERE oi.order_id = v_order.id;

            UPDATE product_skus s
               SET stock = s.stock + oi.quantity
              FROM order_items oi
             WHERE oi.order_id = v_order.id
               AND oi.sku_id = s.id;
        END IF;

        UPDATE refund_requests
           SET status = '已同意',
               admin_note = p_note,
               handled_by = p_admin_id,
               handled_at = NOW()
         WHERE id = p_refund_id;

        UPDATE orders
           SET payment_status = 'refunded',
               status = '已取消',
               cancel_reason = '退款同意：' || p_note,
               cancelled_at = NOW()
         WHERE id = v_order.id;

        UPDATE payment_records
           SET status = 'refunded'
         WHERE order_id = v_order.id
           AND status = 'success';

        INSERT INTO order_status_logs (order_id, from_status, to_status, operator_id, operator_role, remark)
        VALUES (v_order.id, v_order.status, '已取消', p_admin_id, 'admin', '退款同意：' || p_note);
    ELSE
        UPDATE refund_requests
           SET status = '已拒绝',
               admin_note = p_note,
               handled_by = p_admin_id,
               handled_at = NOW()
         WHERE id = p_refund_id;

        UPDATE orders
           SET payment_status = 'refund_rejected'
         WHERE id = v_order.id;

        INSERT INTO order_status_logs (order_id, from_status, to_status, operator_id, operator_role, remark)
        VALUES (v_order.id, v_order.status, v_order.status, p_admin_id, 'admin', '退款拒绝：' || p_note);
    END IF;

    RETURN jsonb_build_object(
        'refundId', p_refund_id,
        'status', CASE WHEN p_approve THEN '已同意' ELSE '已拒绝' END
    );
END;
$$;

CREATE OR REPLACE FUNCTION adjust_sku_stock(
    p_sku_id      BIGINT,
    p_new_stock   INTEGER,
    p_admin_id    BIGINT,
    p_reason      TEXT DEFAULT '管理员调整库存'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_before INTEGER;
BEGIN
    IF p_new_stock < 0 THEN
        RAISE EXCEPTION 'STOCK_INVALID' USING ERRCODE = 'P0001';
    END IF;

    SELECT stock INTO v_before
      FROM product_skus
     WHERE id = p_sku_id
     FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SKU_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO inventory_logs (
        sku_id, change_quantity, before_stock, after_stock, reason, operator_id
    )
    VALUES (p_sku_id, p_new_stock - v_before, v_before, p_new_stock, p_reason, p_admin_id);

    UPDATE product_skus
       SET stock = p_new_stock
     WHERE id = p_sku_id;

    RETURN jsonb_build_object('skuId', p_sku_id, 'stock', p_new_stock);
END;
$$;

GRANT EXECUTE ON FUNCTION create_order_from_cart(BIGINT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION demo_pay_order(BIGINT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION cancel_unpaid_order(BIGINT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION admin_update_order_status(BIGINT, TEXT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION request_order_refund(BIGINT, BIGINT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION handle_order_refund(BIGINT, BIGINT, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION adjust_sku_stock(BIGINT, INTEGER, BIGINT, TEXT) TO service_role;
