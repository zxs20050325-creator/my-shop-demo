<script setup>
defineProps({
    label: { type: String, default: '内容占位' },
    note: { type: String, default: '后续替换为商品图、活动图或专题内容' },
    dark: { type: Boolean, default: false },
    ratio: { type: String, default: '4 / 5' }
})
</script>

<template>
    <div class="placeholder-card" :class="{ dark }" :style="{ aspectRatio: ratio }">
        <div class="placeholder-mark">
            <span></span><span></span><span></span>
        </div>
        <strong>{{ label }}</strong>
        <p>{{ note }}</p>
    </div>
</template>

<style scoped>
.placeholder-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 20px;
    text-align: center;
    color: var(--c-ink-soft);
    background:
        linear-gradient(135deg, rgba(193,162,104,.1), rgba(47,72,66,.03)),
        repeating-linear-gradient(-45deg, transparent 0 8px, rgba(47,72,66,.025) 8px 9px);
    border: 1px dashed rgba(47,72,66,.35);
}
.placeholder-card.dark {
    color: rgba(255,255,255,.55);
    background:
        linear-gradient(135deg, rgba(193,162,104,.12), rgba(255,255,255,.02)),
        repeating-linear-gradient(-45deg, transparent 0 8px, rgba(255,255,255,.025) 8px 9px);
    border-color: rgba(255,255,255,.22);
}
.placeholder-mark { display: flex; gap: 6px; margin-bottom: 4px; }
.placeholder-mark span { width: 7px; height: 7px; transform: rotate(45deg); background: var(--c-accent); opacity: .55; }
.placeholder-card strong { font-size: 14px; }
.placeholder-card p { max-width: 220px; font-size: 11px; line-height: 1.7; }
</style>
