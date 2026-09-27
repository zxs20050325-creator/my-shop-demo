<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import Chart from 'chart.js/auto'

// 管理后台。
//
// 这个页面刻意不复用前台的青黛/鎏金风格 —— 后台是工作台，专业蓝更合适，
// 与前台视觉分开是有意的。
//
// 移植时从结构上消掉的一个问题：旧版 admin.html 全部用 innerHTML + 模板字符串
// 拼表格（`<td>${p.name}</td>`、`${log.username}`…），商品名或日志详情里塞一段
// <img src=x onerror=...> 就是一个存储型 XSS —— 而能进商品名的正是后台自己。
// Vue 的插值默认转义文本，这类问题在这里不可能再出现。

const router = useRouter()

const KEY_STORE = 'jiyi_admin_key'   // 沿用旧版的 sessionStorage 键名

const key = ref(sessionStorage.getItem(KEY_STORE) || '')
const pwd = ref('')
const loginError = ref('')
const logging = ref(false)

const stats = ref(null)
const usersData = ref(null)
const products = ref([])
const orders = ref([])
const loading = ref(false)
const notice = ref('')

let timer = null
let charts = {}

// 商品弹窗
const modalOpen = ref(false)
const form = reactive({ id: null, name: '', price: '', img: '/images/001.jpg', category: '非遗手作' })
const saving = ref(false)

// 图表用的 canvas
const trafficEl = ref(null)
const dailyUserEl = ref(null)
const actionEl = ref(null)
const productEl = ref(null)

const CATEGORIES = ['数字藏品', '文创周边', '数字画作', '典藏精品', '非遗手作']

const kpi = computed(() => (stats.value && stats.value.kpi) || { revenue: 0, visits: 0, orders: 0, activeUsers: 0 })
const chartsData = computed(() => (stats.value && stats.value.charts) || {})
const logs = computed(() => (stats.value && stats.value.logs) || [])

// 旧版 formatBeijingTime 是「先手动 +8 小时，再用本地时区格式化」——
// 浏览器在 UTC+8 时等于加了 16 小时，时间全错。现在直接指定时区格式化，
// 无论浏览器在哪个时区都是对的。
function fmtTime(t) {
    if (!t) return ''
    const d = new Date(t)
    if (isNaN(d)) return String(t)
    return d.toLocaleString('zh-CN', {
        timeZone: 'Asia/Shanghai',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).replace(/\//g, '-')
}
function fmtDate(t) {
    if (!t) return '—'
    const d = new Date(t)
    if (isNaN(d)) return String(t).slice(0, 10)
    return d.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

// ---- 鉴权 ----
async function handleLogin() {
    if (!pwd.value) { loginError.value = '请输入口令'; return }
    logging.value = true
    loginError.value = ''
    try {
        await api.adminLogin(pwd.value)
        key.value = pwd.value
        sessionStorage.setItem(KEY_STORE, key.value)
        pwd.value = ''
        await start()
    } catch (e) {
        loginError.value = e.status === 401 ? '口令错误，请重试' : (e.message || '登录失败')
    } finally {
        logging.value = false
    }
}

function logoutAdmin() {
    // 必须把 Key 从内存里清掉 —— 旧版只 removeItem 了 sessionStorage，
    // 变量 adminKey 还留着，同页面内仍能继续调接口。
    key.value = ''
    sessionStorage.removeItem(KEY_STORE)
    stopTimer()
    router.push('/')
}

// 401 说明 key 失效了，退回到登录门
function onUnauthorized() {
    key.value = ''
    sessionStorage.removeItem(KEY_STORE)
    stopTimer()
}

// ---- 数据 ----
async function updateDashboard() {
    try {
        stats.value = await api.adminStats(key.value)
    } catch (e) {
        if (e.status === 401) onUnauthorized()
        else console.error('更新失败', e)
    }
}

async function fetchUsersData() {
    try {
        usersData.value = await api.adminUsersData(key.value)
    } catch (e) {
        if (e.status === 401) onUnauthorized()
    }
}

async function loadProducts() {
    try {
        const d = await api.adminProducts(key.value)
        products.value = d.items || []
    } catch (e) {
        if (e.status === 401) onUnauthorized()
    }
}

async function loadOrders() {
    try {
        const d = await api.adminOrders(key.value)
        orders.value = d.orders || []
    } catch (e) {
        if (e.status === 401) onUnauthorized()
    }
}

async function refreshAll() {
    loading.value = true
    await Promise.all([updateDashboard(), fetchUsersData(), loadProducts(), loadOrders()])
    loading.value = false
}

// ---- 商品管理 ----
function openProductModal(p = null) {
    form.id = p ? p.id : null
    form.name = p ? p.name : ''
    form.price = p ? p.price : ''
    form.img = p ? p.img : '/images/001.jpg'
    form.category = p ? p.category : '非遗手作'
    modalOpen.value = true
}

function closeProductModal() { modalOpen.value = false }

async function saveProduct() {
    if (!form.name.trim()) { alert('请输入商品名称'); return }
    const payload = {
        name: form.name.trim(),
        price: Number(form.price) || 0,
        img: form.img,
        category: form.category
    }
    saving.value = true
    try {
        if (form.id) await api.adminUpdateProduct(key.value, form.id, payload)
        else await api.adminCreateProduct(key.value, payload)
        closeProductModal()
        await loadProducts()
        flash(form.id ? '商品已更新' : '商品已新增')
    } catch (e) {
        if (e.status === 401) onUnauthorized()
        else alert('保存失败：' + e.message)
    } finally {
        saving.value = false
    }
}

async function toggleProduct(p) {
    try {
        await api.adminToggleProduct(key.value, p.id, p.active ? 0 : 1)
        await loadProducts()
        flash(p.active ? '已下架' : '已上架')
    } catch (e) {
        if (e.status === 401) onUnauthorized()
    }
}

async function deleteProduct(p) {
    if (!confirm(`确定删除「${p.name}」？此操作不可恢复。\n\n（历史订单里的商品快照不受影响）`)) return
    try {
        await api.adminDeleteProduct(key.value, p.id)
        await loadProducts()
        flash('商品已删除')
    } catch (e) {
        if (e.status === 401) onUnauthorized()
    }
}

// ---- 导出 ----
function download(filename, csv) {
    // ﻿ 是 BOM，Excel 打开中文 CSV 才不乱码
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
}

// CSV 里字段可能含逗号/引号，必须转义，否则导出的表格会错列
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

function exportLogs() {
    if (!logs.value.length) return alert('暂无数据可导出')
    const rows = logs.value.map(r => [r.time, r.username, r.action, r.product].map(csvCell).join(','))
    download(`Logs_${Date.now()}.csv`, 'Time,User,Action,Product\n' + rows.join('\n'))
}

function exportOrders() {
    if (!orders.value.length) return alert('暂无订单可导出')
    const rows = orders.value.map(o =>
        [o.order_no || o.id, o.username, o.total, o.status, o.created_at].map(csvCell).join(','))
    download(`Orders_${Date.now()}.csv`, '订单号,用户,金额,状态,时间\n' + rows.join('\n'))
}

function flash(msg) {
    notice.value = msg
    setTimeout(() => { if (notice.value === msg) notice.value = '' }, 2200)
}

// ---- 图表 ----
function buildCharts() {
    const grid = '#e2e8f0'
    Chart.defaults.font.family = "'Noto Sans SC', system-ui, sans-serif"
    Chart.defaults.color = '#64748b'

    charts.traffic = new Chart(trafficEl.value, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: '访问量', data: [],
                borderColor: '#2563eb', backgroundColor: 'rgba(37, 99, 235, 0.08)',
                borderWidth: 2, fill: true, tension: 0.35, pointRadius: 0, pointHoverRadius: 5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8, color: '#94a3b8' } },
                y: { beginAtZero: true, grid: { color: grid }, ticks: { color: '#94a3b8' } }
            }
        }
    })

    charts.dailyUser = new Chart(dailyUserEl.value, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: '活跃用户', data: [], backgroundColor: '#6366f1',
                borderRadius: 4, barThickness: 'flex', maxBarThickness: 26
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false }, ticks: { maxTicksLimit: 8, color: '#94a3b8' } },
                y: { beginAtZero: true, ticks: { stepSize: 1, color: '#94a3b8' }, grid: { color: grid } }
            }
        }
    })

    charts.action = new Chart(actionEl.value, {
        type: 'doughnut',
        data: {
            labels: ['浏览', '加购', '支付', '其他'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#2563eb', '#16a34a', '#d97706', '#94a3b8'],
                borderWidth: 0, hoverOffset: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '68%',
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } } }
        }
    })

    charts.product = new Chart(productEl.value, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{ label: '热度', data: [], backgroundColor: '#0ea5e9', borderRadius: 4 }]
        },
        options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { beginAtZero: true, grid: { color: grid }, ticks: { color: '#94a3b8' } },
                y: { grid: { display: false }, ticks: { color: '#334155' } }
            }
        }
    })
}

function syncCharts() {
    const c = chartsData.value

    if (c.dateLabels) {
        charts.traffic.data.labels = c.dateLabels
        charts.traffic.data.datasets[0].data = c.dailyTraffic || []
        charts.traffic.update()

        charts.dailyUser.data.labels = c.dateLabels
        charts.dailyUser.data.datasets[0].data = c.dailyActiveUsers || []
        charts.dailyUser.update()
    }

    if (c.actionDistribution) {
        charts.action.data.datasets[0].data = c.actionDistribution
        charts.action.update()
    }

    if (c.topProducts) {
        charts.product.data.labels = c.topProducts.map(p => String(p[0]).substring(0, 8) + '..')
        charts.product.data.datasets[0].data = c.topProducts.map(p => p[1])
        charts.product.update()
    }
}

function destroyCharts() {
    Object.values(charts).forEach(c => { try { c.destroy() } catch { /* 已销毁 */ } })
    charts = {}
}

// ---- 轮询 ----
function startTimer() {
    stopTimer()
    timer = setInterval(async () => {
        await updateDashboard()
        syncCharts()
    }, 5000)
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

async function start() {
    loading.value = true
    await nextTick()
    if (!charts.traffic) buildCharts()

    await Promise.all([updateDashboard(), fetchUsersData(), loadProducts(), loadOrders()])
    syncCharts()
    loading.value = false

    startTimer()
}

onMounted(() => { if (key.value) start() })

// 离开页面必须停掉轮询、销毁图表实例，否则会持续打接口且泄漏 canvas
onBeforeUnmount(() => { stopTimer(); destroyCharts() })
</script>

<template>
    <div class="admin-root">
        <!-- 登录门 -->
        <div v-if="!key" class="login-overlay">
            <div class="login-card">
                <div class="login-logo">冀</div>
                <h2>管理后台登录</h2>
                <span class="login-sub">ADMINISTRATOR ACCESS</span>
                <input v-model="pwd" type="password" placeholder="请输入管理员口令"
                       @keydown.enter="handleLogin">
                <div class="login-error">{{ loginError }}</div>
                <button class="login-btn" :disabled="logging" @click="handleLogin">
                    {{ logging ? '验证中…' : '登 录' }}
                </button>
                <RouterLink class="login-back" to="/">← 返回前台商城</RouterLink>
            </div>
        </div>

        <template v-else>
            <!-- 侧边栏 -->
            <aside class="sidebar">
                <div class="brand">
                    <div class="brand-logo">冀</div>
                    <div>
                        <div class="brand-name">冀遗筑梦</div>
                        <div class="brand-sub">管理后台</div>
                    </div>
                </div>
                <nav class="menu">
                    <div class="menu-label">导航</div>
                    <a class="menu-item active" href="#top"><i class="fa fa-tachometer"></i> 数据总览</a>
                    <a class="menu-item" href="#products-section"><i class="fa fa-cube"></i> 商品管理</a>
                    <a class="menu-item" href="#orders-section"><i class="fa fa-shopping-cart"></i> 订单管理</a>
                    <a class="menu-item" href="#users-section"><i class="fa fa-users"></i> 用户管理</a>
                    <a class="menu-item" href="#log-section"><i class="fa fa-list-alt"></i> 实时日志</a>
                </nav>
                <div class="sidebar-footer">
                    <RouterLink class="menu-item" to="/"><i class="fa fa-home"></i> 返回前台</RouterLink>
                    <a class="menu-item" @click="logoutAdmin"><i class="fa fa-sign-out"></i> 退出登录</a>
                </div>
            </aside>

            <!-- 主内容 -->
            <div class="main-content" id="top">
                <header class="topbar">
                    <div>
                        <h1>数据总览</h1>
                        <p class="breadcrumb">冀遗筑梦 · 管理后台 / 数据总览</p>
                    </div>
                    <div class="topbar-right">
                        <span class="live-badge"><span class="dot"></span> 数据实时更新</span>
                        <span class="admin-badge"><i class="fa fa-shield"></i> 管理员</span>
                    </div>
                </header>

                <!-- KPI -->
                <section class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-icon blue"><i class="fa fa-cny"></i></div>
                        <div>
                            <div class="kpi-label">总营收</div>
                            <div class="kpi-value">¥{{ Number(kpi.revenue).toLocaleString() }}</div>
                            <div class="kpi-foot">累计成交金额</div>
                        </div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-icon teal"><i class="fa fa-eye"></i></div>
                        <div>
                            <div class="kpi-label">访问量</div>
                            <div class="kpi-value">{{ Number(kpi.visits).toLocaleString() }}</div>
                            <div class="kpi-foot">累计浏览行为</div>
                        </div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-icon green"><i class="fa fa-file-text-o"></i></div>
                        <div>
                            <div class="kpi-label">成交订单</div>
                            <div class="kpi-value">{{ Number(kpi.orders).toLocaleString() }}</div>
                            <div class="kpi-foot">已支付订单数</div>
                        </div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-icon purple"><i class="fa fa-users"></i></div>
                        <div>
                            <div class="kpi-label">活跃用户</div>
                            <div class="kpi-value">{{ Number(kpi.activeUsers).toLocaleString() }}</div>
                            <div class="kpi-foot">去重用户数</div>
                        </div>
                    </div>
                </section>

                <!-- 图表 -->
                <section class="charts-grid">
                    <div class="panel">
                        <div class="panel-head">
                            <div>
                                <div class="panel-title">每日流量趋势</div>
                                <div class="panel-desc">Page Views / 访问量</div>
                            </div>
                        </div>
                        <div class="chart-box"><canvas ref="trafficEl"></canvas></div>
                    </div>
                    <div class="panel">
                        <div class="panel-head">
                            <div>
                                <div class="panel-title">每日活跃用户</div>
                                <div class="panel-desc">Active Users / 去重访客</div>
                            </div>
                        </div>
                        <div class="chart-box"><canvas ref="dailyUserEl"></canvas></div>
                    </div>
                    <div class="panel">
                        <div class="panel-head">
                            <div>
                                <div class="panel-title">用户行为分布</div>
                                <div class="panel-desc">Behavior Distribution</div>
                            </div>
                        </div>
                        <div class="chart-box"><canvas ref="actionEl"></canvas></div>
                    </div>
                    <div class="panel">
                        <div class="panel-head">
                            <div>
                                <div class="panel-title">热门商品 TOP5</div>
                                <div class="panel-desc">Top Products</div>
                            </div>
                        </div>
                        <div class="chart-box"><canvas ref="productEl"></canvas></div>
                    </div>
                </section>

                <!-- 实时日志 -->
                <section class="panel table-panel" id="log-section">
                    <div class="panel-head">
                        <div>
                            <div class="panel-title">实时交互日志</div>
                            <div class="panel-desc">Live Logs / 用户行为记录（最多显示 15 条）</div>
                        </div>
                        <button class="btn" @click="exportLogs"><i class="fa fa-download"></i> 导出 CSV</button>
                    </div>
                    <div class="table-scroll">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th width="20%">时间</th>
                                    <th width="16%">用户</th>
                                    <th width="16%">行为</th>
                                    <th>详情</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(log, i) in logs.slice(0, 15)" :key="i">
                                    <td class="muted">{{ fmtTime(log.time) }}</td>
                                    <td class="strong">{{ log.username }}</td>
                                    <td>
                                        <span class="badge" :class="log.action.includes('支付') ? 'b-pay'
                                            : (log.action.includes('加入') ? 'b-cart' : 'b-view')">
                                            {{ log.action }}
                                        </span>
                                    </td>
                                    <td>{{ log.product || '-' }}</td>
                                </tr>
                                <tr v-if="!logs.length"><td colspan="4" class="empty-hint">暂无数据</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- 商品管理 -->
                <section class="panel table-panel" id="products-section">
                    <div class="panel-head">
                        <div>
                            <div class="panel-title">商品管理</div>
                            <div class="panel-desc">Product Management / 商品增删改与上下架</div>
                        </div>
                        <button class="btn btn-primary" @click="openProductModal()">
                            <i class="fa fa-plus"></i> 新增商品
                        </button>
                    </div>
                    <div class="table-scroll">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>商品名称</th>
                                    <th>价格</th>
                                    <th>分类</th>
                                    <th>状态</th>
                                    <th style="text-align:right">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="p in products" :key="p.id">
                                    <td class="muted">#{{ p.id }}</td>
                                    <td class="strong">{{ p.name }}</td>
                                    <td>¥{{ p.price }}</td>
                                    <td>{{ p.category }}</td>
                                    <td>
                                        <span class="badge" :class="p.active ? 'tag-on' : 'tag-off'">
                                            {{ p.active ? '上架中' : '已下架' }}
                                        </span>
                                    </td>
                                    <td class="actions">
                                        <button class="btn btn-sm" @click="openProductModal(p)">编辑</button>
                                        <button class="btn btn-sm" @click="toggleProduct(p)">
                                            {{ p.active ? '下架' : '上架' }}
                                        </button>
                                        <button class="btn btn-sm danger" @click="deleteProduct(p)">删除</button>
                                    </td>
                                </tr>
                                <tr v-if="!products.length"><td colspan="6" class="empty-hint">暂无商品</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- 订单管理 -->
                <section class="panel table-panel" id="orders-section">
                    <div class="panel-head">
                        <div>
                            <div class="panel-title">订单管理</div>
                            <div class="panel-desc">Order Management / 交易明细</div>
                        </div>
                        <button class="btn" @click="exportOrders"><i class="fa fa-download"></i> 导出 CSV</button>
                    </div>
                    <div class="table-scroll">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>订单号</th>
                                    <th>用户</th>
                                    <th>金额</th>
                                    <th>状态</th>
                                    <th>商品</th>
                                    <th>下单时间</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="o in orders" :key="o.id">
                                    <td class="muted">{{ o.order_no || ('#' + o.id) }}</td>
                                    <td class="strong">{{ o.username }}</td>
                                    <td class="money">¥{{ o.total }}</td>
                                    <td><span class="badge b-view">{{ o.status || '待发货' }}</span></td>
                                    <td class="muted">
                                        {{ (o.items || []).length ? `${(o.items || []).length} 种 / ${o.items.reduce((s, it) => s + (Number(it.quantity) || 1), 0)} 件` : '—' }}
                                    </td>
                                    <td class="muted">{{ fmtTime(o.created_at) }}</td>
                                </tr>
                                <tr v-if="!orders.length"><td colspan="6" class="empty-hint">暂无订单</td></tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <!-- 用户管理 -->
                <section class="panel table-panel" id="users-section">
                    <div class="panel-head">
                        <div>
                            <div class="panel-title">用户管理</div>
                            <div class="panel-desc">User Management / 注册用户列表</div>
                        </div>
                    </div>
                    <div class="table-scroll">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>用户名</th>
                                    <th>注册时间</th>
                                    <th>购物车</th>
                                    <th>收藏</th>
                                    <th>最近活动</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="u in (usersData && usersData.users) || []" :key="u.username">
                                    <td class="strong">{{ u.username }}</td>
                                    <td>{{ fmtDate(u.created_at) }}</td>
                                    <td>{{ ((usersData.carts || []).filter(i => i.username === u.username)).length }}</td>
                                    <td>{{ ((usersData.favorites || []).filter(i => i.username === u.username)).length }}</td>
                                    <td class="muted">{{ ((usersData.logs || []).find(i => i.username === u.username) || {}).action || '无活动' }}</td>
                                </tr>
                                <tr v-if="!usersData || !usersData.users || !usersData.users.length">
                                    <td colspan="5" class="empty-hint">暂无数据</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <!-- 商品编辑弹窗 -->
            <div class="product-modal" :style="{ display: modalOpen ? 'flex' : 'none' }">
                <div class="product-modal-card">
                    <div class="modal-head">
                        <h3>{{ form.id ? '编辑商品' : '新增商品' }}</h3>
                        <span class="modal-close" @click="closeProductModal">&times;</span>
                    </div>
                    <div class="form-field">
                        <label>商品名称</label>
                        <input v-model="form.name" type="text" placeholder="请输入商品名称">
                    </div>
                    <div class="form-field">
                        <label>价格（元）</label>
                        <input v-model="form.price" type="number" placeholder="0" min="0" step="0.01">
                    </div>
                    <div class="form-field">
                        <label>图片路径</label>
                        <input v-model="form.img" type="text" placeholder="/images/001.jpg">
                    </div>
                    <div class="form-field">
                        <label>分类</label>
                        <select v-model="form.category">
                            <option v-for="c in CATEGORIES" :key="c">{{ c }}</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button class="btn" @click="closeProductModal">取消</button>
                        <button class="btn btn-primary" :disabled="saving" @click="saveProduct">
                            {{ saving ? '保存中…' : '保存' }}
                        </button>
                    </div>
                </div>
            </div>

            <div class="notification" :class="{ show: !!notice }">{{ notice }}</div>
        </template>
    </div>
</template>

<style scoped>
/* 后台自成一套视觉：深石板蓝 + 专业蓝，与前台青黛/鎏金分开是有意的 */
.admin-root {
    --primary: #1e293b;
    --accent: #2563eb;
    --accent-soft: #eff6ff;
    --bg: #f1f5f9;
    --card: #ffffff;
    --border: #e2e8f0;
    --text: #0f172a;
    --muted: #64748b;
    --danger: #dc2626;
    --sidebar-width: 240px;

    background: var(--bg);
    color: var(--text);
    font-family: 'Noto Sans SC', system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: 14px;
    display: flex;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
    position: relative;
    z-index: 10;
}
.admin-root a { text-decoration: none; color: inherit; }
.admin-root input, .admin-root select, .admin-root button { font-family: inherit; }

/* 侧边栏 */
.sidebar {
    width: var(--sidebar-width);
    background: var(--primary); color: #cbd5e1;
    display: flex; flex-direction: column;
    position: fixed; top: 0; left: 0; bottom: 0; z-index: 1000;
}
.brand { display: flex; align-items: center; gap: 12px; padding: 22px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); }
.brand-logo {
    width: 38px; height: 38px; background: var(--accent); color: #fff; border-radius: 8px;
    display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; flex-shrink: 0;
}
.brand-name { color: #fff; font-size: 16px; font-weight: 700; letter-spacing: 1px; }
.brand-sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }

.menu { flex: 1; padding: 16px 12px; }
.menu-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; padding: 8px 12px; }
.menu-item {
    display: flex; align-items: center; gap: 12px; padding: 11px 14px; margin: 2px 0;
    border-radius: 8px; color: #cbd5e1; cursor: pointer; font-size: 14px; transition: all 0.15s ease;
}
.menu-item i { width: 18px; text-align: center; font-size: 15px; }
.menu-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
.menu-item.active { background: var(--accent); color: #fff; font-weight: 500; }
.sidebar-footer { padding: 12px; border-top: 1px solid rgba(255,255,255,0.08); }

/* 主内容 */
.main-content { flex: 1; margin-left: var(--sidebar-width); padding: 0 32px 48px; max-width: 1560px; }
.topbar {
    position: sticky; top: 0; z-index: 900;
    background: rgba(255,255,255,0.92); backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border);
    margin: 0 -32px 28px; padding: 20px 40px;
    display: flex; justify-content: space-between; align-items: center;
}
.topbar h1 { font-size: 20px; font-weight: 700; }
.breadcrumb { font-size: 12px; color: var(--muted); margin-top: 4px; }
.topbar-right { display: flex; align-items: center; gap: 14px; }
.live-badge {
    display: flex; align-items: center; gap: 7px; background: #ecfdf5; color: #047857;
    font-size: 12px; font-weight: 500; padding: 6px 12px; border-radius: 20px;
}
.live-badge .dot { width: 7px; height: 7px; background: #10b981; border-radius: 50%; animation: pulse 1.8s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
.admin-badge {
    background: var(--primary); color: #fff; font-size: 12px; padding: 6px 14px;
    border-radius: 20px; display: flex; align-items: center; gap: 7px;
}

/* KPI */
.kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 24px; }
.kpi-card {
    background: var(--card); border: 1px solid var(--border); border-radius: 12px;
    padding: 22px; display: flex; align-items: center; gap: 16px;
    transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.kpi-card:hover { box-shadow: 0 6px 20px rgba(15,23,42,0.06); transform: translateY(-2px); }
.kpi-icon {
    width: 48px; height: 48px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 20px;
}
.kpi-icon.blue   { background: #eff6ff; color: #2563eb; }
.kpi-icon.teal   { background: #ecfeff; color: #0891b2; }
.kpi-icon.green  { background: #ecfdf5; color: #059669; }
.kpi-icon.purple { background: #eef2ff; color: #6366f1; }
.kpi-label { font-size: 12px; color: var(--muted); margin-bottom: 6px; }
.kpi-value { font-size: 26px; font-weight: 700; line-height: 1; letter-spacing: -0.5px; }
.kpi-foot { font-size: 11px; color: #94a3b8; margin-top: 7px; }

/* 图表 */
.charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 24px; }
.panel { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 22px; }
.chart-box { height: 320px; position: relative; }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.panel-title { font-size: 15px; font-weight: 600; }
.panel-desc { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* 表格 */
.table-panel { margin-bottom: 24px; }
.table-scroll { overflow-x: auto; }
.btn {
    display: inline-flex; align-items: center; gap: 7px; background: #fff;
    border: 1px solid var(--border); color: var(--text); padding: 8px 16px;
    border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s ease;
}
.btn:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
.btn:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-primary { background: var(--accent); border-color: var(--accent); color: #fff; }
.btn-primary:hover { background: #1d4ed8; color: #fff; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table thead th {
    text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: var(--muted);
    background: #f8fafc; border-bottom: 1px solid var(--border);
    text-transform: uppercase; letter-spacing: 0.3px; white-space: nowrap;
}
.data-table tbody td { padding: 13px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; }
.data-table tbody tr:hover { background: #f8fafc; }
.data-table tbody tr:last-child td { border-bottom: none; }
.data-table .muted { color: #94a3b8; }
.data-table .strong { font-weight: 600; color: #0f172a; }
.data-table .money { font-weight: 700; color: #059669; }
.data-table .actions { text-align: right; white-space: nowrap; }
.data-table .actions .btn + .btn { margin-left: 6px; }

.badge { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 500; }
.b-pay  { color: #059669; background: #ecfdf5; }
.b-cart { color: #b45309; background: #fffbeb; }
.b-view { color: #2563eb; background: #eff6ff; }
.tag-on  { color: #059669; background: #ecfdf5; }
.tag-off { color: #64748b; background: #f1f5f9; }

.empty-hint { text-align: center; padding: 40px; color: #94a3b8; font-size: 13px; }

.notification {
    position: fixed; top: 20px; right: 20px; padding: 14px 22px;
    background: var(--primary); color: #fff; transform: translateX(120%); transition: 0.4s;
    z-index: 20000; border-radius: 10px; box-shadow: 0 8px 24px rgba(15,23,42,0.2);
}
.notification.show { transform: translateX(0); }

/* 登录门 */
.login-overlay {
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.85);
    display: flex; align-items: center; justify-content: center; z-index: 99999;
}
.login-card {
    background: #fff; padding: 44px 40px; width: 380px; max-width: 92vw;
    border-radius: 14px; text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,0.3);
}
.login-logo {
    width: 52px; height: 52px; background: var(--accent); color: #fff; margin: 0 auto 18px;
    border-radius: 12px; display: flex; align-items: center; justify-content: center;
    font-size: 26px; font-weight: 700;
}
.login-card h2 { font-size: 19px; color: var(--text); margin-bottom: 6px; }
.login-sub { display: block; font-size: 12px; color: var(--muted); margin-bottom: 26px; letter-spacing: 1px; }
.login-card input {
    width: 100%; padding: 13px 16px; border: 1px solid var(--border); border-radius: 8px;
    font-size: 14px; text-align: center; outline: none; box-sizing: border-box;
}
.login-card input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
.login-error { min-height: 20px; color: var(--danger); font-size: 12px; margin: 10px 0 4px; }
.login-btn {
    width: 100%; padding: 13px; background: var(--accent); color: #fff; border: none;
    font-size: 14px; font-weight: 600; cursor: pointer; border-radius: 8px; margin-top: 8px;
    transition: background 0.15s ease;
}
.login-btn:hover { background: #1d4ed8; }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.login-back { display: inline-block; margin-top: 18px; font-size: 13px; color: var(--muted); }
.login-back:hover { color: var(--accent); }

/* 商品弹窗 */
.product-modal {
    position: fixed; inset: 0; background: rgba(15, 23, 42, 0.55);
    align-items: center; justify-content: center; z-index: 99998;
}
.product-modal-card {
    background: #fff; border-radius: 14px; width: 460px; max-width: 92vw; padding: 26px 28px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.25);
}
.modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.modal-head h3 { font-size: 17px; font-weight: 600; }
.modal-close { font-size: 24px; color: #94a3b8; cursor: pointer; line-height: 1; }
.modal-close:hover { color: var(--text); }
.form-field { margin-bottom: 16px; }
.form-field label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 6px; }
.form-field input, .form-field select {
    width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: 8px;
    font-size: 14px; outline: none; box-sizing: border-box; background: #fff;
}
.form-field input:focus, .form-field select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 22px; }
.btn-sm { padding: 5px 11px; font-size: 12px; border-radius: 6px; }
.btn-sm.danger { color: var(--danger); }
.btn-sm.danger:hover { background: #fef2f2; border-color: var(--danger); color: var(--danger); }

@media (max-width: 1024px) {
    .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    .charts-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
    .sidebar { display: none; }
    .main-content { margin-left: 0; padding: 0 16px 40px; }
    .kpi-grid { grid-template-columns: 1fr; }
    .topbar { margin: 0 -16px 20px; padding: 16px; }
}
</style>
