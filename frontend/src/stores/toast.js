import { defineStore } from 'pinia'
import { ref } from 'vue'

// 全站提示。取代旧版 common.js 里那个单例 DOM 节点（同时只能显示一条，
// 快速连续操作时会互相覆盖）。
let seq = 0

export const useToastStore = defineStore('toast', () => {
    const items = ref([])

    function push(message, type = 'info', duration = 2600) {
        const id = ++seq
        items.value.push({ id, message, type })
        setTimeout(() => {
            items.value = items.value.filter(t => t.id !== id)
        }, duration)
    }

    const ok = (m) => push(m, 'info')
    const error = (m) => push(m, 'error')

    return { items, push, ok, error }
})
