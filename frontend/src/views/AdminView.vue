<script setup>
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import Chart from 'chart.js/auto'
import { api, imageUrl } from '../api'
import { useUserStore } from '../stores/user'
import { useToastStore } from '../stores/toast'

const router = useRouter()
const user = useUserStore()
const toast = useToastStore()

const activeTab = ref('dashboard')
const loading = ref(false)
const loginForm = reactive({ username: '', password: '' })
const dashboard = ref(null)
const products = ref([])
const orders = ref([])
const refunds = ref([])
const users = ref([])
const logs = ref([])

const revenueEl = ref(null)
const statusEl = ref(null)
const productsEl = ref(null)
const categoryEl = ref(null)
const usersEl = ref(null)
const inventoryEl = ref(null)
const dateRange = ref(30)
const adminSearch = ref('')
const orderDrawer = ref(false)
const selectedOrder = ref(null)
const orderDrawerLoading = ref(false)
const refundReview = ref(null)
const refundNote = ref('')
const refundBusy = ref(false)
let charts = {}

const productModal = ref(false)
const editingProductId = ref(null)
const productForm = reactive({
    name: '',
    subtitle: '',
    description: '',
    category: '非遗手作',
    coverImg: '/images/001.jpg',
    status: 1,
    skuCode: '',
    specText: '默认规格',
    priceCents: 0,
    stock: 0
})

const isAdmin = computed(() => user.isAdmin)
const menuGroups = [
    {
        label: '数据',
        items: [
            { id: 'dashboard', label: '数据总览', icon: 'fa-dashboard' },
            { id: 'users', label: '用户管理', icon: 'fa-users' }
        ]
    },
    {
        label: '商品',
        items: [
            { id: 'products', label: '商品与库存', icon: 'fa-cubes' }
        ]
    },
    {
        label: '交易',
        items: [
            { id: 'orders', label: '订单管理', icon: 'fa-file-text-o' },
            { id: 'refunds', label: '退款审核', icon: 'fa-undo' }
        ]
    },
    {
        label: '系统',
        items: [
            { id: 'logs', label: '行为日志', icon: 'fa-list-alt' }
        ]
    }
]
const filteredTrend = computed(() => {
    const trend = dashboard.value?.trend || []
    return trend.slice(Math.max(0, trend.length - dateRange.value))
})
const avgOrderValue = computed(() => {
    const kpi = dashboard.value?.kpi || {}
    return kpi.orders ? Number(kpi.revenue || 0) / Number(kpi.orders) : 0
})
const orderStatusStats = computed(() => {
    const statuses = ['待付款', '待发货', '已发货', '已完成', '已取消']
    return statuses.map(status => ({
        status,
        count: orders.value.filter(order => order.status === status).length
    }))
})
const categoryStats = computed(() => {
    const productMap = new Map(products.value.map(product => [Number(product.id), product]))
    const stats = new Map()
    orders.value.forEach(order => {
        ;(order.items || []).forEach(item => {
            const category = productMap.get(Number(item.productId))?.category || '其他'
            const current = stats.get(category) || { amount: 0, quantity: 0 }
            current.amount += Number(item.subtotal || 0)
            current.quantity += Number(item.quantity || 0)
            stats.set(category, current)
        })
    })
    const values = [...stats.entries()].map(([category, value]) => ({ category, ...value }))
    if (values.length) return values

    const fallback = new Map()
    for (const item of dashboard.value?.topProducts || []) {
        const product = products.value.find(product => product.name === item.name)
        const category = product?.category || '其他'
        fallback.set(category, (fallback.get(category) || 0) + Number(item.sales || 0))
    }
    return [...fallback.entries()].map(([category, amount]) => ({
        category,
        amount,
        quantity: amount
    }))
})
const userTrend = computed(() => {
    const days = 30
    const labels = []
    const values = []
    for (let offset = days - 1; offset >= 0; offset -= 1) {
        const date = new Date()
        date.setHours(0, 0, 0, 0)
        date.setDate(date.getDate() - offset)
        const key = date.toISOString().slice(0, 10)
        labels.push(`${date.getMonth() + 1}-${date.getDate()}`)
        values.push(users.value.filter(item =>
            String(item.createdAt || '').slice(0, 10) === key).length)
    }
    return { labels, values }
})
const inventoryItems = computed(() =>
    products.value.flatMap(product =>
        (product.skus || []).map(sku => ({
            productName: product.name,
            specText: sku.specText,
            stock: sku.stock
        }))
    ).sort((a, b) => a.stock - b.stock).slice(0, 10))
const searchText = computed(() => adminSearch.value.trim().toLowerCase())
const filteredProducts = computed(() => {
    if (!searchText.value) return products.value
    return products.value.filter(product =>
        [product.name, product.category, product.subtitle]
            .some(value => String(value || '').toLowerCase().includes(searchText.value)))
})
const filteredOrders = computed(() => {
    if (!searchText.value) return orders.value
    return orders.value.filter(order =>
        [order.orderNo, order.username, order.status, order.receiverPhone]
            .some(value => String(value || '').toLowerCase().includes(searchText.value)))
})
const filteredRefunds = computed(() => {
    if (!searchText.value) return refunds.value
    return refunds.value.filter(refund =>
        [refund.orderNo, refund.reason, refund.status]
            .some(value => String(value || '').toLowerCase().includes(searchText.value)))
})
const filteredUsers = computed(() => {
    if (!searchText.value) return users.value
    return users.value.filter(item =>
        [item.username, item.nickname, item.phone, item.role]
            .some(value => String(value || '').toLowerCase().includes(searchText.value)))
})
const currentTabLabel = computed(() =>
    menuGroups.flatMap(group => group.items)
        .find(item => item.id === activeTab.value)?.label || '数据总览')

function openTab(tabId) {
    activeTab.value = tabId
    if (tabId === 'users') loadUsers()
    if (tabId === 'logs') loadLogs()
}

async function login() {
    try {
        await user.login(loginForm)
        if (!user.isAdmin) {
            toast.error('该账号不是管理员')
            await user.logout()
            return
        }
        await loadAll()
    } catch (e) {
        toast.error(e.message)
    }
}

async function logout() {
    await user.logout()
    router.push('/')
}

async function loadDashboard() {
    dashboard.value = await api.admin.dashboard()
}

async function loadProducts() {
    const result = await api.admin.products({ pageSize: 100 })
    products.value = result.items || []
}

async function loadOrders() {
    const result = await api.admin.orders({ pageSize: 100 })
    orders.value = result.items || []
}

async function loadRefunds() {
    const result = await api.admin.refunds({ pageSize: 100 })
    refunds.value = result.items || []
}

async function loadUsers() {
    users.value = (await api.admin.users()).items || []
}

async function loadLogs() {
    logs.value = (await api.admin.logs(300)).items || []
}

async function loadAll() {
    loading.value = true
    let success = false
    try {
        await Promise.all([loadDashboard(), loadProducts(), loadOrders(), loadRefunds(), loadUsers()])
        success = true
    } catch (e) {
        toast.error(e.message)
    } finally {
        loading.value = false
    }
    if (success) {
        await nextTick()
        renderCharts()
    }
}

function destroyCharts() {
    Object.values(charts).forEach(chart => chart.destroy())
    charts = {}
}

function renderCharts() {
    if (!dashboard.value || !revenueEl.value) return
    destroyCharts()
    Chart.defaults.font.family = "'Noto Serif SC', serif"
    Chart.defaults.color = '#6b7772'

    const trend = filteredTrend.value
    charts.revenue = new Chart(revenueEl.value, {
        type: 'line',
        data: {
            labels: trend.map(item => item.date),
            datasets: [
                {
                    label: '成交额（元）',
                    data: trend.map(item => item.revenue),
                    borderColor: '#31544d',
                    backgroundColor: 'rgba(49,84,77,.12)',
                    fill: true,
                    tension: .35,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: '订单数',
                    data: trend.map(item => item.orders),
                    borderColor: '#c1a268',
                    backgroundColor: 'transparent',
                    tension: .35,
                    pointRadius: 0,
                    yAxisID: 'orders'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } },
            scales: {
                x: { grid: { display: false } },
                y: { beginAtZero: true, grid: { color: '#ece8e0' } },
                orders: {
                    beginAtZero: true,
                    position: 'right',
                    grid: { display: false },
                    ticks: { precision: 0 }
                }
            }
        }
    })

    charts.status = new Chart(statusEl.value, {
        type: 'doughnut',
        data: {
            labels: orderStatusStats.value.map(item => item.status),
            datasets: [{
                data: orderStatusStats.value.map(item => item.count),
                backgroundColor: ['#c1a268', '#4f7fa8', '#4b8b80', '#568a68', '#aab0ad'],
                borderWidth: 0,
                hoverOffset: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 14 } } }
        }
    })

    const top = dashboard.value.topProducts || []
    charts.products = new Chart(productsEl.value, {
        type: 'bar',
        data: {
            labels: top.map(item => item.name),
            datasets: [{
                label: '销量',
                data: top.map(item => item.sales),
                backgroundColor: '#4b8b80',
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: '#ece8e0' } },
                y: { grid: { display: false } }
            }
        }
    })

    const categories = categoryStats.value
    charts.category = new Chart(categoryEl.value, {
        type: 'doughnut',
        data: {
            labels: categories.map(item => item.category),
            datasets: [{
                data: categories.map(item => item.amount),
                backgroundColor: ['#31544d', '#c1a268', '#4f7fa8', '#b85048', '#6f8f72'],
                borderWidth: 0,
                hoverOffset: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '58%',
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12 } } }
        }
    })

    charts.users = new Chart(usersEl.value, {
        type: 'bar',
        data: {
            labels: userTrend.value.labels,
            datasets: [{
                label: '新增用户',
                data: userTrend.value.values,
                backgroundColor: 'rgba(79,127,168,.72)',
                borderRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
                y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#ece8e0' } }
            }
        }
    })

    charts.inventory = new Chart(inventoryEl.value, {
        type: 'bar',
        data: {
            labels: inventoryItems.value.map(item => `${item.productName} · ${item.specText}`),
            datasets: [{
                label: '库存',
                data: inventoryItems.value.map(item => item.stock),
                backgroundColor: inventoryItems.value.map(item =>
                    item.stock <= 5 ? '#b85048' : '#c1a268'),
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: '#ece8e0' } },
                y: { grid: { display: false } }
            }
        }
    })
}

function openProduct(product = null) {
    editingProductId.value = product?.id || null
    Object.assign(productForm, {
        name: product?.name || '',
        subtitle: product?.subtitle || '',
        description: product?.description || '',
        category: product?.category || '非遗手作',
        coverImg: product?.img || '/images/001.jpg',
        status: product?.status ?? 1,
        skuCode: product?.skus?.[0]?.skuCode || '',
        specText: product?.skus?.[0]?.specText || '默认规格',
        priceCents: product?.priceCents || 0,
        stock: product?.skus?.[0]?.stock || 0
    })
    productModal.value = true
}

async function saveProduct() {
    try {
        const payload = {
            name: productForm.name,
            subtitle: productForm.subtitle,
            description: productForm.description,
            category: productForm.category,
            coverImg: productForm.coverImg,
            status: productForm.status
        }
        if (editingProductId.value) {
            await api.admin.updateProduct(editingProductId.value, payload)
            const firstSku = products.value.find(item => item.id === editingProductId.value)?.skus?.[0]
            if (firstSku) {
                await api.admin.updateSku(firstSku.id, {
                    skuCode: productForm.skuCode || firstSku.skuCode,
                    specText: productForm.specText,
                    priceCents: Number(productForm.priceCents)
                })
                await api.admin.adjustStock(firstSku.id, Number(productForm.stock))
            }
            toast.ok('商品已更新')
        } else {
            await api.admin.createProduct({
                ...payload,
                sku: {
                    skuCode: productForm.skuCode || `P${Date.now()}-DEFAULT`,
                    specText: productForm.specText,
                    priceCents: Number(productForm.priceCents),
                    stock: Number(productForm.stock)
                }
            })
            toast.ok('商品已新增')
        }
        productModal.value = false
        await Promise.all([loadProducts(), loadDashboard()])
        await nextTick()
        renderCharts()
    } catch (e) {
        toast.error(e.message)
    }
}

async function toggleProduct(product) {
    await api.admin.updateProduct(product.id, { status: product.status ? 0 : 1 })
    await loadProducts()
    await nextTick()
    renderCharts()
}

async function adjustStock(sku) {
    const value = window.prompt(`设置「${sku.specText}」库存`, String(sku.stock))
    if (value === null) return
    const stock = Number(value)
    if (!Number.isInteger(stock) || stock < 0) return toast.error('库存必须是非负整数')
    await api.admin.adjustStock(sku.id, stock)
    toast.ok('库存已更新')
    await loadProducts()
    await nextTick()
    renderCharts()
}

async function updateOrderStatus(order) {
    await api.admin.updateOrderStatus(order.id, order.status, '管理员更新')
    toast.ok('订单状态已更新')
    await Promise.all([loadOrders(), loadDashboard()])
    await nextTick()
    renderCharts()
}

async function handleRefund(refund, approve) {
    refundReview.value = { refund, approve }
    refundNote.value = approve ? '审核通过' : ''
}

async function submitRefundReview() {
    if (!refundReview.value) return
    refundBusy.value = true
    const { refund, approve } = refundReview.value
    try {
        await api.admin.handleRefund(refund.id, approve, refundNote.value)
        toast.ok(approve ? '退款已同意' : '退款已拒绝')
        refundReview.value = null
        await Promise.all([loadRefunds(), loadOrders(), loadDashboard()])
        await nextTick()
        renderCharts()
    } finally {
        refundBusy.value = false
    }
}

async function openOrderDrawer(order) {
    orderDrawer.value = true
    orderDrawerLoading.value = true
    selectedOrder.value = null
    try {
        selectedOrder.value = await api.admin.order(order.id)
    } catch (e) {
        toast.error(e.message)
        orderDrawer.value = false
    } finally {
        orderDrawerLoading.value = false
    }
}

function exportDashboard() {
    exportCsv('dashboard-summary.csv', [
        ['指标', '数值'],
        ['成交额', dashboard.value?.kpi?.revenue || 0],
        ['成交订单', dashboard.value?.kpi?.orders || 0],
        ['待发货', dashboard.value?.kpi?.pendingShipment || 0],
        ['待处理退款', dashboard.value?.kpi?.pendingRefunds || 0],
        ['活跃用户', dashboard.value?.kpi?.activeUsers || 0]
    ])
}

function exportCsv(filename, rows) {
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
}

function exportOrders() {
    exportCsv('orders.csv', [
        ['订单号', '用户', '金额', '状态', '时间'],
        ...orders.value.map(order => [order.orderNo, order.username, order.amount, order.status, order.createdAt])
    ])
}

function exportLogs() {
    exportCsv('logs.csv', [
        ['时间', '用户', '行为', '对象'],
        ...logs.value.map(log => [log.time, log.username, log.action, log.product])
    ])
}

async function clearLogs() {
    if (!window.confirm('确定清空行为日志？订单交易 KPI 不受影响。')) return
    await api.admin.clearLogs()
    await Promise.all([loadLogs(), loadDashboard()])
}

onMounted(async () => {
    await user.bootstrap()
    if (isAdmin.value) await loadAll()
})
</script>

<template>
    <div class="admin-root">
        <section v-if="!isAdmin" class="admin-login">
            <div class="login-card">
                <div class="login-logo">冀</div>
                <h1>管理后台</h1>
                <p>请使用管理员账号登录</p>
                <input v-model="loginForm.username" class="admin-input" placeholder="管理员用户名">
                <input v-model="loginForm.password" class="admin-input" type="password" placeholder="密码"
                       @keyup.enter="login">
                <button class="admin-btn primary" @click="login">登录</button>
                <RouterLink to="/">返回前台</RouterLink>
            </div>
        </section>

        <template v-else>
            <aside class="admin-side">
                <div class="brand">
                    <span class="brand-seal">冀</span>
                    <div><strong>冀遗筑梦</strong><small>数字文化运营台</small></div>
                </div>
                <nav class="admin-nav">
                    <div v-for="group in menuGroups" :key="group.label" class="nav-group">
                        <span class="nav-group-label">{{ group.label }}</span>
                        <button v-for="item in group.items" :key="item.id"
                                :class="{ active: activeTab === item.id }"
                                @click="openTab(item.id)">
                            <i class="fa" :class="item.icon"></i>
                            <span>{{ item.label }}</span>
                        </button>
                    </div>
                </nav>
                <div class="admin-side-user">
                    <span>{{ (user.user?.nickname || user.username || '管').slice(0, 1) }}</span>
                    <div><strong>{{ user.user?.nickname || user.username }}</strong><small>管理员</small></div>
                    <button @click="logout" title="退出登录"><i class="fa fa-sign-out"></i></button>
                </div>
            </aside>

            <main class="admin-main">
                <header class="admin-header">
                    <div>
                        <span class="admin-kicker">运营台 / {{ currentTabLabel }}</span>
                        <h1>{{ currentTabLabel }}</h1>
                        <p>商品、库存、订单、退款与用户数据统一管理</p>
                    </div>
                    <div class="admin-header-actions">
                        <label class="admin-search">
                            <i class="fa fa-search"></i>
                            <input v-model="adminSearch" placeholder="搜索商品、订单或用户">
                        </label>
                        <div class="range-switch compact-range">
                            <button v-for="range in [7, 14, 30]" :key="range"
                                    :class="{ active: dateRange === range }"
                                    @click="dateRange = range; nextTick(renderCharts)">
                                {{ range }} 天
                            </button>
                        </div>
                        <button class="admin-btn" @click="exportDashboard"><i class="fa fa-download"></i> 导出</button>
                        <button class="admin-btn" @click="loadAll"><i class="fa fa-refresh"></i> 刷新数据</button>
                    </div>
                </header>

                <div v-if="loading" class="admin-loading">正在加载数据…</div>

                <template v-else>
                    <section v-if="activeTab === 'dashboard'" class="tab-panel dashboard-panel">
                        <div class="dashboard-head">
                            <div>
                                <span class="admin-kicker">BUSINESS OVERVIEW</span>
                                <h2>交易数据总览</h2>
                            </div>
                        </div>
                        <div class="kpi-grid kpi-grid-six">
                            <article><i class="fa fa-line-chart"></i><span>成交额</span><strong>¥ {{ dashboard?.kpi?.revenue?.toFixed(2) || '0.00' }}</strong><small>已支付有效订单</small></article>
                            <article><i class="fa fa-file-text-o"></i><span>成交订单</span><strong>{{ dashboard?.kpi?.orders || 0 }}</strong><small>累计完成支付</small></article>
                            <article><i class="fa fa-calculator"></i><span>客单价</span><strong>¥ {{ avgOrderValue.toFixed(2) }}</strong><small>成交额 / 订单数</small></article>
                            <article class="warning"><i class="fa fa-truck"></i><span>待发货</span><strong>{{ dashboard?.kpi?.pendingShipment || 0 }}</strong><small>需要安排发货</small></article>
                            <article class="danger"><i class="fa fa-undo"></i><span>待处理退款</span><strong>{{ dashboard?.kpi?.pendingRefunds || 0 }}</strong><small>等待管理员审核</small></article>
                            <article><i class="fa fa-users"></i><span>活跃用户</span><strong>{{ dashboard?.kpi?.activeUsers || 0 }}</strong><small>有成交行为的用户</small></article>
                        </div>
                        <div class="analytics-grid">
                            <div class="chart-card chart-wide">
                                <div class="chart-head"><div><h3>成交趋势</h3><p>近 {{ dateRange }} 日成交额与订单数</p></div><span>LINE</span></div>
                                <div class="chart-canvas"><canvas ref="revenueEl"></canvas></div>
                            </div>
                            <div class="chart-card">
                                <div class="chart-head"><div><h3>订单状态</h3><p>当前订单分布</p></div><span>DOUGHNUT</span></div>
                                <div class="chart-canvas"><canvas ref="statusEl"></canvas></div>
                            </div>
                            <div class="chart-card chart-wide">
                                <div class="chart-head"><div><h3>商品销量排行</h3><p>订单销量数据，历史明细缺失时使用浏览热度</p></div><span>BAR</span></div>
                                <div class="chart-canvas"><canvas ref="productsEl"></canvas></div>
                            </div>
                            <div class="chart-card">
                                <div class="chart-head"><div><h3>分类销售占比</h3><p>按订单金额统计</p></div><span>SHARE</span></div>
                                <div class="chart-canvas"><canvas ref="categoryEl"></canvas></div>
                            </div>
                            <div class="chart-card">
                                <div class="chart-head"><div><h3>用户注册趋势</h3><p>近 30 日新增用户</p></div><span>GROWTH</span></div>
                                <div class="chart-canvas"><canvas ref="usersEl"></canvas></div>
                            </div>
                            <div class="chart-card">
                                <div class="chart-head"><div><h3>库存概览</h3><p>库存最低的 10 个 SKU</p></div><span>STOCK</span></div>
                                <div class="chart-canvas"><canvas ref="inventoryEl"></canvas></div>
                                <p v-if="!inventoryItems.length" class="chart-empty-note">当前没有 SKU 库存数据</p>
                            </div>
                        </div>
                    </section>

                    <section v-if="activeTab === 'products'" class="tab-panel">
                        <div class="panel-head">
                            <h2>商品与库存</h2>
                            <button class="admin-btn primary" @click="openProduct()">新增商品</button>
                        </div>
                        <table class="admin-table">
                            <thead><tr><th>商品</th><th>分类</th><th>价格</th><th>总库存</th><th>状态</th><th>SKU</th><th>操作</th></tr></thead>
                            <tbody>
                                <tr v-for="product in filteredProducts" :key="product.id">
                                    <td><img class="tiny-img" :src="imageUrl(product.img)"><span>{{ product.name }}</span></td>
                                    <td>{{ product.category }}</td>
                                    <td>¥ {{ product.price.toFixed(2) }}</td>
                                    <td>{{ product.stock }}</td>
                                    <td>{{ product.status ? '在售' : '下架' }}</td>
                                    <td>
                                        <button v-for="sku in product.skus" :key="sku.id" class="sku-chip"
                                                @click="adjustStock(sku)">
                                            {{ sku.specText }} / {{ sku.stock }}
                                        </button>
                                    </td>
                                    <td>
                                        <button class="admin-btn small" @click="openProduct(product)">编辑</button>
                                        <button class="admin-btn small danger" @click="toggleProduct(product)">
                                            {{ product.status ? '下架' : '上架' }}
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section v-if="activeTab === 'orders'" class="tab-panel">
                        <div class="panel-head"><h2>订单管理</h2><button class="admin-btn" @click="exportOrders">导出 CSV</button></div>
                        <table class="admin-table">
                            <thead><tr><th>订单号</th><th>用户</th><th>金额</th><th>支付</th><th>状态</th><th>收货信息</th><th>时间</th><th>操作</th></tr></thead>
                            <tbody>
                                <tr v-for="order in filteredOrders" :key="order.id">
                                    <td>{{ order.orderNo }}</td>
                                    <td>{{ order.username }}</td>
                                    <td>¥ {{ order.amount.toFixed(2) }}</td>
                                    <td>{{ order.paymentStatus }}</td>
                                    <td>
                                        <select v-model="order.status" class="admin-select" @change="updateOrderStatus(order)">
                                            <option>待付款</option><option>待发货</option><option>已发货</option>
                                            <option>已完成</option><option>已取消</option>
                                        </select>
                                    </td>
                                    <td>{{ order.receiverPhone }}<br>{{ order.receiverAddress }}</td>
                                    <td>{{ new Date(order.createdAt).toLocaleString('zh-CN') }}</td>
                                    <td><button class="admin-btn small" @click="openOrderDrawer(order)">详情</button></td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section v-if="activeTab === 'refunds'" class="tab-panel">
                        <h2>退款审核</h2>
                        <table class="admin-table">
                            <thead><tr><th>订单号</th><th>原因</th><th>金额</th><th>状态</th><th>申请时间</th><th>操作</th></tr></thead>
                            <tbody>
                                <tr v-for="refund in filteredRefunds" :key="refund.id">
                                    <td>{{ refund.orderNo }}</td>
                                    <td>{{ refund.reason }}</td>
                                    <td>¥ {{ refund.amount.toFixed(2) }}</td>
                                    <td>{{ refund.status }}</td>
                                    <td>{{ new Date(refund.appliedAt).toLocaleString('zh-CN') }}</td>
                                    <td v-if="refund.status === '待处理'">
                                        <button class="admin-btn small" @click="handleRefund(refund, true)">同意</button>
                                        <button class="admin-btn small danger" @click="handleRefund(refund, false)">拒绝</button>
                                    </td>
                                    <td v-else>{{ refund.adminNote }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section v-if="activeTab === 'users'" class="tab-panel">
                        <h2>用户管理</h2>
                        <table class="admin-table">
                            <thead><tr><th>用户</th><th>昵称</th><th>手机号</th><th>角色</th><th>状态</th><th>订单数</th><th>注册时间</th></tr></thead>
                            <tbody>
                                <tr v-for="item in filteredUsers" :key="item.id">
                                    <td>{{ item.username }}</td><td>{{ item.nickname }}</td><td>{{ item.phone || '—' }}</td>
                                    <td>{{ item.role }}</td><td>{{ item.status ? '正常' : '停用' }}</td>
                                    <td>{{ item.orderCount }}</td><td>{{ new Date(item.createdAt).toLocaleDateString('zh-CN') }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section v-if="activeTab === 'logs'" class="tab-panel">
                        <div class="panel-head">
                            <h2>行为日志</h2>
                            <div><button class="admin-btn" @click="exportLogs">导出 CSV</button>
                                <button class="admin-btn danger" @click="clearLogs">清空日志</button></div>
                        </div>
                        <table class="admin-table">
                            <thead><tr><th>时间</th><th>用户</th><th>行为</th><th>对象</th></tr></thead>
                            <tbody><tr v-for="log in logs" :key="log.id"><td>{{ new Date(log.time).toLocaleString('zh-CN') }}</td><td>{{ log.username }}</td><td>{{ log.action }}</td><td>{{ log.product }}</td></tr></tbody>
                        </table>
                    </section>
                </template>
            </main>

            <div v-if="orderDrawer" class="admin-drawer-mask" @click.self="orderDrawer = false">
                <aside class="admin-drawer">
                    <header>
                        <div><span class="admin-kicker">ORDER DETAIL</span><h2>订单详情</h2></div>
                        <button @click="orderDrawer = false"><i class="fa fa-times"></i></button>
                    </header>
                    <div v-if="orderDrawerLoading" class="admin-loading">正在读取订单…</div>
                    <template v-else-if="selectedOrder">
                        <div class="drawer-summary">
                            <div><span>订单号</span><strong>{{ selectedOrder.orderNo }}</strong></div>
                            <div><span>用户</span><strong>{{ selectedOrder.username }}</strong></div>
                            <div><span>状态</span><strong>{{ selectedOrder.status }}</strong></div>
                            <div><span>金额</span><strong>¥ {{ selectedOrder.amount.toFixed(2) }}</strong></div>
                        </div>
                        <h3>商品明细</h3>
                        <div class="drawer-items">
                            <article v-for="item in selectedOrder.items" :key="item.id">
                                <img :src="imageUrl(item.img)" :alt="item.name">
                                <div><strong>{{ item.name }}</strong><small>{{ item.specText }} · × {{ item.quantity }}</small></div>
                                <span>¥ {{ item.subtotal.toFixed(2) }}</span>
                            </article>
                        </div>
                        <h3>收货信息</h3>
                        <div class="drawer-info">
                            <p>{{ selectedOrder.receiver.name }} · {{ selectedOrder.receiver.phone }}</p>
                            <p>{{ selectedOrder.receiver.province }} {{ selectedOrder.receiver.city }} {{ selectedOrder.receiver.district }} {{ selectedOrder.receiver.detail }}</p>
                        </div>
                    </template>
                </aside>
            </div>

            <div v-if="refundReview" class="modal-mask" @click.self="refundReview = null">
                <form class="product-modal refund-review" @submit.prevent="submitRefundReview">
                    <span class="admin-kicker">REFUND REVIEW</span>
                    <h2>{{ refundReview.approve ? '同意退款' : '拒绝退款' }}</h2>
                    <div class="drawer-summary">
                        <div><span>订单号</span><strong>{{ refundReview.refund.orderNo }}</strong></div>
                        <div><span>退款金额</span><strong>¥ {{ refundReview.refund.amount.toFixed(2) }}</strong></div>
                        <div><span>申请原因</span><strong>{{ refundReview.refund.reason }}</strong></div>
                    </div>
                    <textarea v-model="refundNote" class="admin-input" rows="3"
                              :placeholder="refundReview.approve ? '同意备注' : '拒绝原因'"></textarea>
                    <div class="modal-actions">
                        <button class="admin-btn" type="button" @click="refundReview = null">取消</button>
                        <button class="admin-btn primary" type="submit" :disabled="refundBusy">
                            {{ refundBusy ? '处理中…' : '确认处理' }}
                        </button>
                    </div>
                </form>
            </div>

            <div v-if="productModal" class="modal-mask" @click.self="productModal = false">
                <form class="product-modal" @submit.prevent="saveProduct">
                    <h2>{{ editingProductId ? '编辑商品' : '新增商品' }}</h2>
                    <input v-model="productForm.name" class="admin-input" placeholder="商品名称" required>
                    <input v-model="productForm.subtitle" class="admin-input" placeholder="副标题">
                    <textarea v-model="productForm.description" class="admin-input" rows="3" placeholder="商品描述"></textarea>
                    <input v-model="productForm.category" class="admin-input" placeholder="分类">
                    <input v-model="productForm.coverImg" class="admin-input" placeholder="/images/001.jpg">
                    <div class="form-row">
                        <input v-model="productForm.skuCode" class="admin-input" placeholder="SKU 编码">
                        <input v-model="productForm.specText" class="admin-input" placeholder="规格名称">
                    </div>
                    <div class="form-row">
                        <input v-model.number="productForm.priceCents" class="admin-input" type="number" min="0" placeholder="价格（分）">
                        <input v-model.number="productForm.stock" class="admin-input" type="number" min="0" placeholder="库存">
                    </div>
                    <label><input v-model.number="productForm.status" type="checkbox" :true-value="1" :false-value="0"> 上架销售</label>
                    <div class="modal-actions">
                        <button class="admin-btn" type="button" @click="productModal = false">取消</button>
                        <button class="admin-btn primary" type="submit">保存</button>
                    </div>
                </form>
            </div>
        </template>
    </div>
</template>

<style scoped>
.admin-root { min-height: 100vh; background: #f5f7fb; color: #0f172a; display: flex; }
.admin-login { min-height: 100vh; width: 100%; display: grid; place-items: center; background: linear-gradient(135deg,#edf3f8,#dbe8f5); }
.login-card { width: 380px; background: #fff; border-radius: 14px; padding: 36px; display: grid; gap: 14px; text-align: center; }
.login-logo { width: 62px; height: 62px; margin: 0 auto; display: grid; place-items: center; background: #2563eb; color: #fff; border-radius: 14px; font-size: 32px; }
.admin-side { width: 220px; background: #eef3f8; color: #475569; padding: 18px 12px; position: sticky; top: 0; height: 100vh; display: flex; flex-direction: column; gap: 6px; border-right: 1px solid #dbe3ec; }
.brand { display: flex; align-items: center; gap: 10px; padding: 14px 10px 26px; color: #0f172a; }
.brand span { width: 38px; height: 38px; display: grid; place-items: center; background: #2563eb; border-radius: 9px; }
.admin-side button { border: 0; background: none; color: #475569; padding: 12px 14px; text-align: left; border-radius: 8px; cursor: pointer; }
.admin-side button.active, .admin-side button:hover { background: #2563eb; color: #fff; }
.admin-side .bottom { margin-top: auto; }
.admin-main { flex: 1; min-width: 0; padding: 28px 32px; }
.admin-main > header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.admin-main h1 { font-size: 24px; }
.admin-main p { color: #64748b; margin-top: 6px; }
.tab-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; }
.kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 18px; }
.kpi-grid article { border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; }
.kpi-grid span { color: #64748b; font-size: 12px; }
.kpi-grid strong { display: block; font-size: 26px; margin-top: 8px; }
.chart-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; }
.chart-card { height: 330px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; }
.chart-card canvas { max-height: 260px; }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.admin-table { width: 100%; border-collapse: collapse; }
.admin-table th, .admin-table td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
.admin-table th { background: #f8fafc; color: #64748b; font-size: 12px; }
.tiny-img { width: 44px; height: 44px; object-fit: cover; vertical-align: middle; margin-right: 10px; }
.admin-btn { border: 1px solid #cbd5e1; background: #fff; border-radius: 7px; padding: 8px 13px; cursor: pointer; margin-left: 6px; }
.admin-btn.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
.admin-btn.danger { color: #dc2626; }
.admin-btn.small { padding: 5px 9px; font-size: 12px; }
.admin-input, .admin-select { width: 100%; border: 1px solid #cbd5e1; border-radius: 7px; padding: 10px 12px; background: #fff; }
.sku-chip { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 20px; padding: 5px 9px; margin: 2px; font-size: 11px; }
.admin-loading { padding: 80px; text-align: center; color: #64748b; }
.modal-mask { position: fixed; inset: 0; background: rgba(15,23,42,.55); display: grid; place-items: center; z-index: 1000; }
.product-modal { width: 560px; max-width: 92vw; background: #fff; border-radius: 14px; padding: 26px; display: grid; gap: 12px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
@media (max-width: 900px) { .admin-root { flex-direction: column; } .admin-side { width: auto; height: auto; position: static; } .kpi-grid, .chart-grid { grid-template-columns: 1fr; } .admin-main { padding: 18px; } }

/* 2026 admin operations console */
.admin-root { background: #f5f3ef; color: var(--c-primary); }
.admin-side {
    width: 236px;
    padding: 18px 12px;
    background: #fbfaf7;
    color: var(--c-ink-soft);
    border-right: 1px solid var(--c-grid);
    gap: 0;
}
.brand {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 8px 24px;
    color: var(--c-primary);
}
.brand .brand-seal {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    display: grid;
    place-items: center;
    border-radius: 4px;
    background: #a33b32;
    color: #fff;
    font-family: var(--f-art);
    font-size: 24px;
    box-shadow: 4px 4px 0 rgba(193,162,104,.28);
}
.brand strong, .brand small { display: block; }
.brand strong { font-size: 15px; letter-spacing: 1px; }
.brand small { margin-top: 4px; color: var(--c-ink-soft); font-size: 9px; }
.admin-nav { flex: 1; overflow-y: auto; padding: 4px 0; }
.nav-group { margin-bottom: 18px; }
.nav-group-label {
    display: block;
    padding: 5px 12px 7px;
    color: #a19b90;
    font-family: var(--f-mono);
    font-size: 8px;
    letter-spacing: 1.5px;
}
.admin-side .admin-nav button {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 10px 12px;
    border: 0;
    border-left: 3px solid transparent;
    border-radius: 0 6px 6px 0;
    background: transparent;
    color: var(--c-ink-soft);
    font-size: 12px;
}
.admin-side .admin-nav button i { width: 16px; text-align: center; color: #9b7a38; }
.admin-side .admin-nav button:hover { background: rgba(193,162,104,.1); color: var(--c-primary); }
.admin-side .admin-nav button.active {
    border-left-color: #c1a268;
    background: rgba(49,84,77,.09);
    color: var(--c-primary);
    font-weight: 800;
}
.admin-side-user {
    display: grid;
    grid-template-columns: 36px 1fr 30px;
    align-items: center;
    gap: 9px;
    padding: 12px 8px 2px;
    border-top: 1px solid var(--c-grid);
}
.admin-side-user > span {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--c-primary);
    color: #fff;
    font-family: var(--f-art);
}
.admin-side-user strong, .admin-side-user small { display: block; }
.admin-side-user strong { font-size: 11px; }
.admin-side-user small { margin-top: 3px; color: var(--c-ink-soft); font-size: 8px; }
.admin-side-user button { width: 28px; height: 28px; padding: 0; border: 0; background: transparent; color: var(--c-danger); }
.admin-main { padding: 28px 32px 54px; background: #f5f3ef; }
.admin-header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 22px; }
.admin-kicker { color: #9b7a38; font-family: var(--f-mono); font-size: 9px; letter-spacing: 1.5px; }
.admin-header h1 { margin: 6px 0 4px; font-size: 28px; }
.admin-header p { margin: 0; color: var(--c-ink-soft); font-size: 12px; }
.admin-header-actions { display: flex; align-items: center; gap: 10px; }
.range-switch { display: flex; gap: 4px; padding: 4px; background: #fff; border: 1px solid var(--c-grid); border-radius: 6px; }
.range-switch button { padding: 7px 10px; border: 0; border-radius: 4px; background: transparent; color: var(--c-ink-soft); font-size: 10px; }
.range-switch button.active { background: var(--c-primary); color: #fff; }
.admin-btn {
    border: 1px solid rgba(47,72,66,.2);
    border-radius: 6px;
    background: #fff;
    color: var(--c-primary);
    padding: 9px 13px;
}
.admin-btn.primary { background: var(--c-primary); border-color: var(--c-primary); color: #fff; }
.admin-btn.danger { color: var(--c-danger); }
.dashboard-panel { padding: 0; border: 0; border-radius: 0; background: transparent; }
.dashboard-head { margin-bottom: 16px; }
.dashboard-head h2 { margin-top: 6px; font-size: 20px; }
.kpi-grid-six { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.kpi-grid article {
    position: relative;
    padding: 18px;
    border: 1px solid var(--c-grid);
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 8px 22px rgba(31,52,47,.045);
}
.kpi-grid article > i {
    position: absolute;
    right: 16px;
    top: 16px;
    color: #c1a268;
    font-size: 18px;
}
.kpi-grid article span, .kpi-grid article small, .kpi-grid article strong { display: block; }
.kpi-grid article span { color: var(--c-ink-soft); font-size: 10px; }
.kpi-grid article strong { margin: 10px 0 7px; font-size: 25px; }
.kpi-grid article small { color: #a19b90; font-size: 9px; }
.kpi-grid article.warning strong { color: #a9772c; }
.kpi-grid article.danger strong { color: var(--c-danger); }
.analytics-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}
.chart-card {
    height: auto;
    min-height: 330px;
    padding: 18px;
    border: 1px solid var(--c-grid);
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 8px 22px rgba(31,52,47,.045);
}
.chart-card.chart-wide { grid-column: span 2; }
.chart-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 14px; }
.chart-head h3 { font-size: 15px; }
.chart-head p { margin-top: 5px; color: var(--c-ink-soft); font-size: 9px; }
.chart-head > span { color: #b8b1a5; font-family: var(--f-mono); font-size: 8px; letter-spacing: 1px; }
.chart-canvas { position: relative; height: 250px; }
.chart-canvas canvas { width: 100% !important; height: 100% !important; }
.chart-empty-note { margin-top: 8px; color: var(--c-ink-soft); font-size: 10px; }
.admin-root { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; }
.admin-root h1, .admin-root h2, .admin-root h3 { font-family: var(--f-serif); }
.admin-header-actions { flex-wrap: wrap; justify-content: flex-end; }
.admin-search {
    min-width: 240px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 12px;
    border: 1px solid var(--c-grid);
    border-radius: 6px;
    background: #fff;
}
.admin-search i { color: #9b7a38; }
.admin-search input { width: 100%; border: 0; outline: 0; background: transparent; color: var(--c-primary); font-size: 12px; }
.admin-drawer-mask {
    position: fixed;
    inset: 0;
    z-index: 1200;
    display: flex;
    justify-content: flex-end;
    background: rgba(31,52,47,.32);
    backdrop-filter: blur(5px);
}
.admin-drawer {
    width: 480px;
    max-width: 94vw;
    height: 100%;
    overflow-y: auto;
    padding: 26px;
    background: #fbfaf7;
    border-left: 1px solid var(--c-grid);
    box-shadow: -16px 0 42px rgba(31,52,47,.12);
}
.admin-drawer > header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 22px; }
.admin-drawer h2 { margin-top: 5px; }
.admin-drawer header button { width: 34px; height: 34px; border: 1px solid var(--c-grid); background: #fff; color: var(--c-primary); }
.drawer-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 22px; }
.drawer-summary > div { padding: 12px; border: 1px solid var(--c-grid); background: #fff; }
.drawer-summary span, .drawer-summary strong { display: block; }
.drawer-summary span { color: var(--c-ink-soft); font-size: 9px; }
.drawer-summary strong { margin-top: 6px; font-size: 12px; word-break: break-all; }
.admin-drawer h3 { margin: 22px 0 10px; font-size: 14px; }
.drawer-items { display: grid; gap: 8px; }
.drawer-items article { display: grid; grid-template-columns: 52px 1fr auto; align-items: center; gap: 10px; padding: 10px; background: #fff; border: 1px solid var(--c-grid); }
.drawer-items img { width: 52px; height: 52px; object-fit: cover; }
.drawer-items strong, .drawer-items small { display: block; }
.drawer-items small { margin-top: 4px; color: var(--c-ink-soft); font-size: 9px; }
.drawer-items article > span { color: #8b682c; font-family: var(--f-mono); font-size: 11px; }
.drawer-info { padding: 14px; background: #fff; border: 1px solid var(--c-grid); color: var(--c-ink-soft); font-size: 11px; line-height: 1.8; }
.refund-review { gap: 16px; }
.refund-review .drawer-summary { grid-template-columns: 1fr; margin-bottom: 0; }
.tab-panel:not(.dashboard-panel) {
    border: 1px solid var(--c-grid);
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 8px 22px rgba(31,52,47,.045);
}
@media (max-width: 1100px) {
    .kpi-grid-six { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .analytics-grid { grid-template-columns: 1fr; }
    .chart-card.chart-wide { grid-column: span 1; }
}
@media (max-width: 760px) {
    .admin-root { flex-direction: column; }
    .admin-side { width: auto; height: auto; position: static; }
    .admin-nav { display: flex; gap: 8px; overflow-x: auto; }
    .nav-group { min-width: 150px; margin-bottom: 0; }
    .admin-main { padding: 18px; }
    .admin-header { align-items: flex-start; flex-direction: column; }
    .kpi-grid-six { grid-template-columns: 1fr; }
}
</style>
