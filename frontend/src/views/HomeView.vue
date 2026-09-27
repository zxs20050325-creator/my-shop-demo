<script setup>
import { onMounted } from 'vue'
import ProductExplorer from '../components/ProductExplorer.vue'
import { api } from '../api'
import { useUserStore } from '../stores/user'

const user = useUserStore()

function scrollToShop() {
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
    // 埋点：与旧版 index.html 写的是同一个 action 字符串，后台统计口径不变
    api.track(user.username || '游客', '浏览主页', '').catch(() => {})
})
</script>

<template>
    <!-- Hero：华塔巨幕 -->
    <section class="hero-section">
        <div class="hero-tower-portal">
            <div class="hero-tower-img"></div>
            <div class="scan-beam"></div>
        </div>

        <div class="hero-text-box">
            <span class="hero-kicker">DIGITAL HERITAGE COLLECTION</span>
            <h1>以广惠寺华塔<br>为例：<br>将河北古建筑<br>数字化复刻</h1>
            <p>
                我们以正定古城广惠寺华塔为例，进行毫米级数字化 AR 重构。
                通过数字解构，让沉睡千年的石刻艺术在指尖重现温热。
                开启盲盒，寻找属于你的历史遗珍。
            </p>
            <button class="btn-reveal-all" @click="scrollToShop">揭开全系列惊喜</button>
        </div>
    </section>

    <!-- 商城主体 -->
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
.hero-section {
    min-height: 88vh; padding: 40px 80px;
    display: flex; align-items: center; gap: 0; overflow: hidden; position: relative;
}
.hero-tower-portal {
    width: 56%; height: 78vh; position: relative; overflow: hidden;
    border: 1.5px solid var(--c-primary);
    box-shadow: 40px 40px 0 rgba(193, 162, 104, 0.12);
    transition: 0.8s var(--trans-smooth); background: #000;
}
.hero-tower-portal:hover { transform: scale(1.02); box-shadow: 55px 55px 0 rgba(193, 162, 104, 0.2); }

.hero-tower-img {
    width: 100%; height: 100%; object-fit: cover;
    transform: scale(1.1); transition: 2.5s var(--trans-smooth);
    opacity: 0.85; filter: contrast(1.1);
    background: url('https://img.zcool.cn/community/016ca55d57b4c6a801214814d94b7e.jpg@1280w_1l_2o_100sh.jpg') center/cover no-repeat;
}
.hero-tower-portal:hover .hero-tower-img { transform: scale(1.2) rotate(0.5deg); opacity: 1; }

.scan-beam {
    position: absolute; top: -100%; left: 0; width: 100%; height: 20%;
    background: linear-gradient(to bottom, transparent, rgba(193, 162, 104, 0.4), transparent);
    animation: scanLoop 4.5s linear infinite; pointer-events: none; z-index: 5;
}
@keyframes scanLoop { 0% { top: -100%; } 100% { top: 250%; } }

.hero-text-box { width: 44%; padding-left: 70px; z-index: 10; }
.hero-kicker {
    font-family: var(--f-mono); color: var(--c-accent); font-weight: 900;
    letter-spacing: 6px; display: block; margin-bottom: 22px; font-size: 12px;
}
.hero-text-box h1 { font-size: 58px; line-height: 1.15; font-weight: 900; margin-bottom: 26px; }
.hero-text-box p { font-size: 15px; line-height: 2; opacity: 0.7; margin-bottom: 38px; max-width: 460px; }

@media (max-width: 1100px) {
    .hero-section { flex-direction: column; padding: 40px 24px; gap: 40px; }
    .hero-tower-portal { width: 100%; height: 380px; }
    .hero-text-box { width: 100%; padding-left: 0; }
    .hero-text-box h1 { font-size: 38px; }
}
</style>
