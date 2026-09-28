-- ============================================================
-- 007 修复历史订单时间与后台图表数据源
-- ============================================================

UPDATE orders
   SET paid_at = COALESCE(paid_at, created_at)
 WHERE payment_status IN ('paid', 'refund_requested')
   AND paid_at IS NULL;

CREATE OR REPLACE FUNCTION get_admin_dashboard()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH paid_orders AS (
        SELECT *
          FROM orders
         WHERE payment_status IN ('paid', 'refund_requested', 'refund_rejected')
           AND status <> '已取消'
    ),
    days AS (
        SELECT generate_series(
            CURRENT_DATE - INTERVAL '29 days',
            CURRENT_DATE,
            INTERVAL '1 day'
        )::date AS day
    ),
    daily AS (
        SELECT d.day,
               COALESCE(COUNT(o.id), 0)::INTEGER AS orders,
               COALESCE(SUM(o.paid_amount_cents), 0)::BIGINT AS revenue_cents
          FROM days d
          LEFT JOIN paid_orders o
            ON COALESCE(o.paid_at, o.created_at)::date = d.day
         GROUP BY d.day
         ORDER BY d.day
    ),
    order_products AS (
        SELECT oi.product_name AS name,
               SUM(oi.quantity)::BIGINT AS sales
          FROM order_items oi
          JOIN paid_orders o ON o.id = oi.order_id
         GROUP BY oi.product_name
    ),
    log_products AS (
        SELECT product AS name,
               COUNT(*)::BIGINT AS sales
          FROM user_logs
         WHERE product IS NOT NULL
           AND product <> ''
           AND product NOT IN ('首页', '订单结算', 'admin')
           AND product NOT LIKE '%详情页%'
           AND product NOT LIKE '%登录%'
           AND product NOT LIKE '%注册%'
           AND product NOT LIKE '%购物车%'
           AND product NOT LIKE '%收藏夹%'
           AND product NOT LIKE '%支付%'
           AND product NOT LIKE '%管理%'
         GROUP BY product
    ),
    top_products AS (
        SELECT name, SUM(sales)::BIGINT AS sales
          FROM (
              SELECT name, sales FROM order_products
              UNION ALL
              SELECT name, sales
                FROM log_products lp
               WHERE NOT EXISTS (SELECT 1 FROM order_products)
          ) combined
         GROUP BY name
         ORDER BY sales DESC
         LIMIT 8
    )
    SELECT jsonb_build_object(
        'kpi', jsonb_build_object(
            'revenueCents', COALESCE((SELECT SUM(paid_amount_cents) FROM paid_orders), 0),
            'orders', COALESCE((SELECT COUNT(*) FROM paid_orders), 0),
            'visits', COALESCE((SELECT COUNT(*) FROM user_logs), 0),
            'activeUsers', COALESCE((SELECT COUNT(DISTINCT user_id) FROM paid_orders), 0),
            'pendingShipment', COALESCE((SELECT COUNT(*) FROM orders WHERE status = '待发货'), 0),
            'pendingRefunds', COALESCE((SELECT COUNT(*) FROM refund_requests WHERE status = '待处理'), 0)
        ),
        'trend', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'date', to_char(day, 'MM-DD'),
                'orders', orders,
                'revenueCents', revenue_cents
            ))
            FROM daily
        ), '[]'::jsonb),
        'topProducts', COALESCE((
            SELECT jsonb_agg(jsonb_build_object('name', name, 'sales', sales))
            FROM top_products
        ), '[]'::jsonb)
    );
$$;

GRANT EXECUTE ON FUNCTION get_admin_dashboard() TO service_role;
