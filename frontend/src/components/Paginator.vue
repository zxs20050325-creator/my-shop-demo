<script setup>
import { computed } from 'vue'

// 旧版的页码是写死的 [1, 2]（index.html 的 renderPaginator），
// 后端也忽略 ?page= 一次性返回全部商品 —— 于是管理员新增第 13 个商品后，
// 它在前台永远不出现。现在页数由服务端返回的 total 真实算出来。

const props = defineProps({
    page: { type: Number, required: true },
    pageSize: { type: Number, default: 12 },
    total: { type: Number, default: 0 }
})
const emit = defineEmits(['change'])

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

// 页码过多时收窄成「1 … 4 5 6 … 20」的形式
const pages = computed(() => {
    const n = pageCount.value
    const cur = props.page
    if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1)

    const out = [1]
    const from = Math.max(2, cur - 1)
    const to = Math.min(n - 1, cur + 1)
    if (from > 2) out.push('…')
    for (let i = from; i <= to; i++) out.push(i)
    if (to < n - 1) out.push('…')
    out.push(n)
    return out
})

function go(p) {
    if (p < 1 || p > pageCount.value || p === props.page) return
    emit('change', p)
}
</script>

<template>
    <div class="paginator" v-if="pageCount > 1">
        <button class="page-node" :disabled="page <= 1" @click="go(page - 1)" title="上一页">
            <i class="fa fa-angle-left"></i>
        </button>

        <template v-for="(p, i) in pages" :key="p + '-' + i">
            <span v-if="p === '…'" class="page-info">…</span>
            <button
                v-else
                class="page-node"
                :class="{ active: p === page }"
                @click="go(p)"
            >{{ p }}</button>
        </template>

        <button class="page-node" :disabled="page >= pageCount" @click="go(page + 1)" title="下一页">
            <i class="fa fa-angle-right"></i>
        </button>

        <span class="page-info">共 {{ total }} 件 · 第 {{ page }}/{{ pageCount }} 页</span>
    </div>
</template>
