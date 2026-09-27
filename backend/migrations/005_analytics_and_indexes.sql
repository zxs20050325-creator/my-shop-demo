-- ============================================================
-- 005 商品搜索、分类、KPI
-- 交易 KPI 只从 orders/order_items 计算，user_logs 仅用于流量行为
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_logs_created_id ON user_logs(created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION search_products_v2(
    p_q          TEXT DEFAULT '',
    p_category   TEXT DEFAULT '',
    p_sort       TEXT DEFAULT 'default',
    p_page       INTEGER DEFAULT 1,
    p_size       INTEGER DEFAULT 12
)
RETURNS TABLE(items JSONB, total BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH filtered AS (
        SELECT p.*,
               c.name AS category_name,
               COALESCE(MIN(s.price_cents) FILTER (WHERE s.active = 1), 0)::BIGINT AS min_price_cents,
               COALESCE(SUM(s.stock) FILTER (WHERE s.active = 1), 0)::INTEGER AS total_stock
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          LEFT JOIN product_skus s ON s.product_id = p.id
         WHERE p.status = 1
           AND EXISTS (
               SELECT 1
                 FROM product_skus sellable
                WHERE sellable.product_id = p.id
                  AND sellable.active = 1
           )
           AND (COALESCE(p_category, '') = '' OR c.name = p_category)
           AND (
               COALESCE(p_q, '') = ''
               OR p.name ILIKE '%' || p_q || '%'
               OR COALESCE(p.subtitle, '') ILIKE '%' || p_q || '%'
               OR COALESCE(p.description, '') ILIKE '%' || p_q || '%'
           )
         GROUP BY p.id, c.name
    ),
    page_rows AS (
        SELECT *,
               ROW_NUMBER() OVER (
                   ORDER BY
                       CASE WHEN p_sort = 'price_asc' THEN min_price_cents END ASC,
                       CASE WHEN p_sort = 'price_desc' THEN min_price_cents END DESC,
                       CASE WHEN p_sort = 'newest' THEN created_at END DESC,
                       sort_order ASC,
                       id ASC
               ) AS rn
          FROM filtered
    ),
    paged AS (
        SELECT * FROM page_rows
         ORDER BY rn
         OFFSET GREATEST((COALESCE(p_page, 1) - 1) * COALESCE(p_size, 12), 0)
         LIMIT COALESCE(p_size, 12)
    )
    SELECT
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'name', p.name,
                    'subtitle', p.subtitle,
                    'description', p.description,
                    'img', COALESCE(NULLIF(p.cover_img, ''), p.img),
                    'category', COALESCE(p.category_name, p.category),
                    'priceCents', p.min_price_cents,
                    'stock', p.total_stock,
                    'salesCount', p.sales_count,
                    'status', p.status
                )
                ORDER BY p.rn
            ),
            '[]'::jsonb
        ),
        (SELECT COUNT(*) FROM filtered)
      FROM paged p;
$$;

CREATE OR REPLACE FUNCTION get_categories_v2()
RETURNS TABLE(category TEXT, cnt BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(c.name, p.category) AS category, COUNT(*)::BIGINT AS cnt
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.status = 1
     GROUP BY COALESCE(c.name, p.category)
     ORDER BY cnt DESC, category ASC;
$$;

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
         WHERE payment_status IN ('paid', 'refund_requested')
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
          LEFT JOIN paid_orders o ON o.paid_at::date = d.day
         GROUP BY d.day
         ORDER BY d.day
    ),
    top_products AS (
        SELECT oi.product_name AS name,
               SUM(oi.quantity)::BIGINT AS sales
          FROM order_items oi
          JOIN paid_orders o ON o.id = oi.order_id
         GROUP BY oi.product_name
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

GRANT EXECUTE ON FUNCTION search_products_v2(TEXT, TEXT, TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_categories_v2() TO service_role;
GRANT EXECUTE ON FUNCTION get_admin_dashboard() TO service_role;
