<script setup>
import { ref, watch } from 'vue'
import AuthPanel from './AuthPanel.vue'

const props = defineProps({
    open: { type: Boolean, default: false },
    mode: { type: String, default: 'login' }
})
const emit = defineEmits(['close', 'update:mode'])

// 内部维护一份 mode，切换登录/注册时不必让父组件跟着改 prop
const inner = ref(props.mode)
watch(() => props.mode, (m) => { inner.value = m })

function switchMode(m) {
    inner.value = m
    emit('update:mode', m)
}
</script>

<template>
    <div v-if="open" class="ink-modal" @click.self="emit('close')">
        <div class="modal-box">
            <button class="modal-close" @click="emit('close')" aria-label="关闭">&times;</button>
            <AuthPanel
                :mode="inner"
                @success="emit('close')"
                @switch="switchMode"
            />
        </div>
    </div>
</template>
