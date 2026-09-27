<script setup>
import { computed, onMounted, ref } from 'vue'
import { api, imageUrl } from '../api'
import VariantSwitcher from '../components/VariantSwitcher.vue'
import PlaceholderCard from '../components/PlaceholderCard.vue'

const products = ref([])
const category = ref('全部')
const categories = computed(() => ['全部', ...new Set(products.value.map(item => item.category).filter(Boolean))])
const visibleProducts = computed(() =>
    category.value === '全部'
        ? products.value
        : products.value.filter(item => item.category === category.value))

onMounted(async () => {
    products.value = (await api.listProducts({ pageSize: 12 })).items || []
})
</script>

<template>
    <VariantSwitcher current="v2" />
    <section class="market-hero">
        <div class="market-title">
            <span>河北非遗数字市集 · 今日开集</span>
            <h1>把千年古建，装进今天的收藏清单</h1>
            <p>按市集逻辑组织商品，首屏突出活动、分类和快速选购，适合更接近真实电商的展示。</p>
            <div class="market-search">
                <i class="fa fa-search"></i>
                <input placeholder="搜索华塔、榫卯、城关或非遗手作">
                <button>搜索</button>
            </div>
        </div>
        <div class="market-banner">
            <img :src="'/images/003.jpg'" alt="非遗市集活动">
            <div><span>本周主题</span><strong>燕赵古建数字专题</strong><small>限时展示 12 件数字藏品</small></div>
        </div>
    </section>

    <section class="market-categories">
        <button v-for="item in categories" :key="item"
                :class="{ active: category === item }" @click="category = item">
            {{ item }}
        </button>
    </section>

    <section class="market-grid-section">
        <header>
            <div><span>MARKET SHELF</span><h2>正在展销</h2></div>
            <p>真实商品与运营位混排，后续可加入优惠券、直播和专题入口。</p>
        </header>
        <div class="market-grid">
            <article v-for="product in visibleProducts" :key="product.id" class="market-product">
                <div class="market-image">
                    <img :src="imageUrl(product.img)" :alt="product.name">
                    <span>{{ product.category }}</span>
                </div>
                <div class="market-info">
                    <small>华塔遗珍 · S01</small>
                    <h3>{{ product.name }}</h3>
                    <p>{{ product.subtitle || '数字建筑藏品' }}</p>
                    <div><strong>¥ {{ product.price }}</strong><span>库存 {{ product.stock }}</span></div>
                    <RouterLink :to="`/product/${product.id}`">立即选择规格</RouterLink>
                </div>
            </article>

            <article class="market-placeholder-place">
                <PlaceholderCard label="活动海报占位" note="适合放满减、专题、直播活动" :ratio="'3 / 4'" />
            </article>
            <article class="market-placeholder-wide">
                <PlaceholderCard label="首页运营横幅占位" note="可放传承人访谈、数字展或新品预告" :ratio="'16 / 7'" />
            </article>
            <article class="market-placeholder-place">
                <PlaceholderCard label="品牌故事占位" note="可替换为非遗工艺短视频或图集" :ratio="'3 / 4'" />
            </article>
        </div>
    </section>

    <section class="market-service">
        <article><i class="fa fa-certificate"></i><div><strong>数字确权</strong><span>下单后生成独立订单与收藏记录</span></div></article>
        <article><i class="fa fa-cube"></i><div><strong>规格独立库存</strong><span>每款规格拥有独立价格和库存</span></div></article>
        <article><i class="fa fa-truck"></i><div><strong>演示发货流程</strong><span>后台可完成发货与订单状态管理</span></div></article>
    </section>
</template>

<style scoped>
.market-hero { display: grid; grid-template-columns: 1fr 1fr; gap: 34px; padding: 46px 70px 60px; }
.market-title { display: flex; flex-direction: column; justify-content: center; padding-right: 40px; }
.market-title > span, .market-grid-section header span { color: var(--c-cinnabar, #a83a32); font-family: var(--f-mono); font-size: 10px; letter-spacing: 2px; }
.market-title h1 { margin: 18px 0; font-size: clamp(38px, 4vw, 62px); line-height: 1.18; }
.market-title p { max-width: 600px; color: var(--c-ink-soft); line-height: 1.9; }
.market-search { display: flex; align-items: center; gap: 12px; max-width: 620px; margin-top: 28px; padding: 9px 9px 9px 16px; background: #fff; border: 1px solid var(--c-grid); box-shadow: 8px 8px 0 rgba(193,162,104,.16); }
.market-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; }
.market-search button { padding: 11px 18px; border: 0; background: var(--c-primary); color: #fff; }
.market-banner { position: relative; min-height: 460px; overflow: hidden; background: #111; }
.market-banner img { width: 100%; height: 100%; object-fit: cover; opacity: .82; }
.market-banner > div { position: absolute; left: 28px; right: 28px; bottom: 28px; display: grid; gap: 7px; padding: 20px; color: #fff; background: rgba(18,35,31,.76); backdrop-filter: blur(10px); }
.market-banner span { color: #e7d4a8; font-size: 10px; }
.market-banner strong { font-size: 22px; }
.market-banner small { color: rgba(255,255,255,.62); }
.market-categories { display: flex; gap: 10px; padding: 0 70px 30px; overflow-x: auto; }
.market-categories button { padding: 10px 18px; border: 1px solid var(--c-grid); background: #fff; white-space: nowrap; }
.market-categories button.active { border-color: var(--c-primary); background: var(--c-primary); color: #fff; }
.market-grid-section { padding: 60px 70px 80px; background: #fff; }
.market-grid-section header { display: flex; justify-content: space-between; align-items: end; gap: 30px; margin-bottom: 30px; }
.market-grid-section h2 { margin-top: 8px; font-size: 38px; }
.market-grid-section header p { max-width: 420px; color: var(--c-ink-soft); line-height: 1.8; }
.market-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; align-items: start; }
.market-product { background: #fff; border: 1px solid var(--c-grid); transition: .2s ease; }
.market-product:hover { transform: translateY(-5px); box-shadow: 10px 12px 0 rgba(193,162,104,.18); }
.market-image { position: relative; aspect-ratio: 4/5; overflow: hidden; background: #eee; }
.market-image img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s ease; }
.market-product:hover .market-image img { transform: scale(1.05); }
.market-image span { position: absolute; top: 10px; left: 10px; padding: 5px 8px; background: rgba(18,35,31,.8); color: #fff; font-size: 9px; }
.market-info { padding: 16px; }
.market-info small { color: var(--c-ink-soft); font-size: 9px; }
.market-info h3 { margin: 8px 0 6px; font-size: 17px; }
.market-info p { min-height: 36px; color: var(--c-ink-soft); font-size: 11px; line-height: 1.6; }
.market-info > div { display: flex; justify-content: space-between; align-items: baseline; margin: 12px 0; }
.market-info strong { color: var(--c-danger); font-size: 20px; }
.market-info > div span { color: var(--c-ink-soft); font-size: 10px; }
.market-info a { display: block; padding: 10px; text-align: center; background: var(--c-primary); color: #fff; font-size: 11px; }
.market-placeholder-place { grid-column: span 1; }
.market-placeholder-wide { grid-column: span 2; }
.market-service { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--c-grid); }
.market-service article { display: flex; gap: 16px; padding: 28px 34px; background: var(--c-bg); }
.market-service i { color: var(--c-accent); font-size: 24px; }
.market-service strong, .market-service span { display: block; }
.market-service span { margin-top: 7px; color: var(--c-ink-soft); font-size: 11px; }
@media (max-width: 1100px) {
    .market-hero { grid-template-columns: 1fr; padding: 36px 24px; }
    .market-categories { padding-inline: 24px; }
    .market-grid-section { padding: 48px 24px; }
    .market-grid { grid-template-columns: repeat(2, 1fr); }
    .market-service { grid-template-columns: 1fr; }
}
@media (max-width: 650px) {
    .market-grid { grid-template-columns: 1fr; }
    .market-placeholder-wide { grid-column: span 1; }
    .market-grid-section header { align-items: flex-start; flex-direction: column; }
}
</style>
