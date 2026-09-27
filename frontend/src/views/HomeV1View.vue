<script setup>
import { onMounted, ref } from 'vue'
import { api, imageUrl } from '../api'
import VariantSwitcher from '../components/VariantSwitcher.vue'
import PlaceholderCard from '../components/PlaceholderCard.vue'

const products = ref([])
const loading = ref(true)

onMounted(async () => {
    try {
        products.value = (await api.listProducts({ pageSize: 6 })).items || []
    } finally {
        loading.value = false
    }
})
</script>

<template>
    <VariantSwitcher current="v1" />
    <section class="curator-hero">
        <div class="curator-copy">
            <span class="curator-eyebrow">EXHIBITION 01 · HEBEI ARCHITECTURE</span>
            <h1>一座华塔，<br>如何变成<br>一段可收藏的历史？</h1>
            <p>以博物馆策展逻辑组织首页。先讲文化来源，再进入数字藏品，最后完成开盒和确权。</p>
            <div class="curator-actions">
                <button class="btn-reveal-all">进入本期展览</button>
                <RouterLink to="/search">查看全部藏品 →</RouterLink>
            </div>
        </div>
        <div class="curator-feature">
            <img :src="'/images/001.jpg'" alt="广惠寺华塔数字展品">
            <div class="feature-caption">
                <span>FEATURED EXHIBIT</span>
                <strong>广惠寺华塔 · 数字复刻</strong>
            </div>
        </div>
    </section>

    <section class="curator-intro">
        <span>01 / CURATORIAL NOTE</span>
        <h2>不是把商品堆在首页，而是把每一件藏品放回它的文化语境。</h2>
        <p>该方案适合答辩展示和品牌叙事，商品数量可以较少，但视觉层级更深。</p>
    </section>

    <section class="exhibit-section">
        <header>
            <div><span>02 / CURRENT EXHIBITS</span><h2>本期展品</h2></div>
            <p>横向滚动展示真实商品与占位内容，后续可扩展为策展专题。</p>
        </header>
        <div class="exhibit-track">
            <article v-for="(product, index) in products" :key="product.id" class="exhibit-item">
                <span class="exhibit-index">EX-{{ String(index + 1).padStart(2, '0') }}</span>
                <img :src="imageUrl(product.img)" :alt="product.name">
                <div>
                    <small>{{ product.category }}</small>
                    <h3>{{ product.name }}</h3>
                    <p>{{ product.subtitle || '数字建筑藏品 · 独立编号 · 可收藏' }}</p>
                    <RouterLink :to="`/product/${product.id}`">查看藏品 →</RouterLink>
                </div>
            </article>
            <article class="exhibit-item placeholder-item">
                <span class="exhibit-index">EX-07</span>
                <PlaceholderCard label="下一期专题占位" note="可放非遗工艺、建筑构件或传承人访谈" />
            </article>
            <article class="exhibit-item placeholder-item">
                <span class="exhibit-index">EX-08</span>
                <PlaceholderCard label="视频展品占位" note="后续可替换为 3D 模型、纪录片或 AR 预览" />
            </article>
        </div>
    </section>

    <section class="curator-footer">
        <div><span>03 / VISITOR FLOW</span><h2>参观路径</h2></div>
        <div class="visitor-steps">
            <article><strong>01</strong><h3>认识文化原型</h3><p>了解古建筑、榫卯和非遗工艺。</p></article>
            <article><strong>02</strong><h3>选择数字藏品</h3><p>按系列和规格浏览藏品。</p></article>
            <article><strong>03</strong><h3>完成数字确权</h3><p>生成订单与收藏记录。</p></article>
        </div>
    </section>
</template>

<style scoped>
.curator-hero { min-height: 760px; display: grid; grid-template-columns: .9fr 1.1fr; background: #f0ede6; }
.curator-copy { display: flex; flex-direction: column; justify-content: center; padding: 90px 70px 90px 90px; }
.curator-eyebrow { color: var(--c-cinnabar, #a83a32); font-family: var(--f-mono); font-size: 10px; letter-spacing: 2px; }
.curator-copy h1 { margin: 22px 0 26px; font-size: clamp(44px, 4.5vw, 72px); line-height: 1.12; }
.curator-copy p { max-width: 520px; color: var(--c-ink-soft); line-height: 2; }
.curator-actions { display: flex; align-items: center; gap: 22px; margin-top: 34px; }
.curator-actions a { font-size: 12px; border-bottom: 1px solid var(--c-primary); }
.curator-feature { position: relative; min-height: 760px; overflow: hidden; background: #111; }
.curator-feature img { width: 100%; height: 100%; object-fit: cover; opacity: .86; }
.curator-feature::after { content: ""; position: absolute; inset: 24px; border: 1px solid rgba(255,255,255,.35); }
.feature-caption { position: absolute; left: 50px; bottom: 48px; z-index: 2; color: #fff; display: grid; gap: 7px; }
.feature-caption span { color: #e7d4a8; font-family: var(--f-mono); font-size: 9px; letter-spacing: 2px; }
.feature-caption strong { font-size: 20px; }
.curator-intro { display: grid; grid-template-columns: 170px 1fr .6fr; gap: 40px; padding: 80px 90px; }
.curator-intro > span, .exhibit-section header span, .curator-footer span { color: var(--c-cinnabar, #a83a32); font-family: var(--f-mono); font-size: 10px; letter-spacing: 2px; }
.curator-intro h2 { max-width: 780px; font-size: 34px; line-height: 1.5; }
.curator-intro p { color: var(--c-ink-soft); line-height: 1.9; }
.exhibit-section { padding: 70px 0 80px 90px; background: #fff; overflow: hidden; }
.exhibit-section header { display: flex; justify-content: space-between; align-items: end; gap: 30px; padding-right: 90px; margin-bottom: 34px; }
.exhibit-section h2 { margin-top: 8px; font-size: 38px; }
.exhibit-section header p { max-width: 420px; color: var(--c-ink-soft); line-height: 1.8; }
.exhibit-track { display: flex; gap: 20px; overflow-x: auto; padding: 8px 90px 24px 0; scrollbar-width: thin; }
.exhibit-item { flex: 0 0 340px; position: relative; }
.exhibit-item img, .placeholder-item :deep(.placeholder-card) { width: 100%; height: 420px; object-fit: cover; }
.exhibit-index { position: absolute; top: 12px; left: 12px; z-index: 2; padding: 5px 8px; background: rgba(18,35,31,.78); color: #fff; font-family: var(--f-mono); font-size: 9px; }
.exhibit-item > div:not(.placeholder-card) { padding: 20px 0; }
.exhibit-item small { color: var(--c-ink-soft); }
.exhibit-item h3 { margin: 8px 0; font-size: 20px; }
.exhibit-item p { color: var(--c-ink-soft); font-size: 12px; line-height: 1.7; }
.exhibit-item a { display: inline-block; margin-top: 12px; font-size: 11px; border-bottom: 1px solid var(--c-primary); }
.curator-footer { display: grid; grid-template-columns: 260px 1fr; gap: 50px; padding: 80px 90px; color: #fff; background: var(--c-primary); }
.curator-footer h2 { margin-top: 10px; font-size: 38px; }
.visitor-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.visitor-steps article { padding: 26px; border: 1px solid rgba(255,255,255,.14); }
.visitor-steps strong { color: #e7d4a8; font-family: var(--f-mono); }
.visitor-steps h3 { margin: 28px 0 10px; }
.visitor-steps p { color: rgba(255,255,255,.6); font-size: 12px; line-height: 1.8; }
@media (max-width: 1000px) {
    .curator-hero, .curator-intro, .curator-footer { grid-template-columns: 1fr; }
    .curator-copy { padding: 60px 24px; }
    .curator-feature { min-height: 520px; }
    .curator-intro { padding: 52px 24px; gap: 18px; }
    .exhibit-section { padding-left: 24px; }
    .exhibit-section header { padding-right: 24px; align-items: flex-start; flex-direction: column; }
    .curator-footer { padding: 54px 24px; }
    .visitor-steps { grid-template-columns: 1fr; }
}
</style>
