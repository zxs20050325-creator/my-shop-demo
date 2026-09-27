<script setup>
import { onMounted } from 'vue'
import ProductExplorer from '../components/ProductExplorer.vue'
import { api } from '../api'

function scrollToShop() {
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => api.track('浏览主页'))
</script>

<template>
    <section class="hero-section">
        <div class="hero-tower-portal">
            <div class="hero-tower-img"></div>
            <div class="scan-beam"></div>
        </div>
        <div class="hero-text-box">
            <span class="hero-kicker">DIGITAL HERITAGE COLLECTION</span>
            <h1>以广惠寺华塔<br>为例：<br>将河北古建筑<br>数字化复刻</h1>
            <p>我们以正定古城广惠寺华塔为例，进行毫米级数字化 AR 重构。开启盲盒，寻找属于你的历史遗珍。</p>
            <button class="btn-reveal-all" @click="scrollToShop">揭开全系列惊喜</button>
        </div>
    </section>

    <section class="page-section" id="shop" style="border-top:1.5px solid var(--c-grid)">
        <div class="page-head">
            <h2>华塔遗珍 · 藏品全集</h2>
            <span class="en">SERIES COLLECTION // S01</span>
            <div class="rule"></div>
        </div>
        <ProductExplorer :page-size="12" empty-text="藏品正在整理中" />
    </section>
</template>

<style scoped>
.hero-section { min-height: 88vh; padding: 40px 80px; display: flex; align-items: center; overflow: hidden; }
.hero-tower-portal { width: 56%; height: 78vh; position: relative; overflow: hidden; border: 1.5px solid var(--c-primary); box-shadow: 40px 40px 0 rgba(193,162,104,.12); background: #dce4df; }
.hero-tower-img { width: 100%; height: 100%; background: url('/images/001.jpg') center/cover no-repeat; opacity: .85; transform: scale(1.08); }
.scan-beam { position: absolute; inset-inline: 0; height: 20%; background: linear-gradient(transparent,rgba(193,162,104,.4),transparent); animation: scanLoop 4.5s linear infinite; }
@keyframes scanLoop { from { top: -100%; } to { top: 250%; } }
.hero-text-box { width: 44%; padding-left: 70px; }
.hero-kicker { display: block; color: var(--c-accent); letter-spacing: 6px; margin-bottom: 22px; }
.hero-text-box h1 { font-size: 58px; line-height: 1.15; margin-bottom: 26px; }
.hero-text-box p { line-height: 2; opacity: .72; margin-bottom: 34px; }
@media (max-width: 1100px) {
    .hero-section { flex-direction: column; padding: 40px 24px; gap: 40px; }
    .hero-tower-portal { width: 100%; height: 380px; }
    .hero-text-box { width: 100%; padding-left: 0; }
    .hero-text-box h1 { font-size: 38px; }
}
</style>
