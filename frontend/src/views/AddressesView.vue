<script setup>
import { onMounted, reactive, ref } from 'vue'
import { api } from '../api'
import { useToastStore } from '../stores/toast'

const toast = useToastStore()
const addresses = ref([])
const loading = ref(true)
const editingId = ref(null)
const form = reactive({
    recipient: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    detail: '',
    isDefault: false
})

async function load() {
    loading.value = true
    try {
        const result = await api.users.listAddresses()
        addresses.value = result.items || []
    } catch (e) {
        toast.error(e.message)
    } finally {
        loading.value = false
    }
}

function resetForm() {
    editingId.value = null
    Object.assign(form, {
        recipient: '',
        phone: '',
        province: '',
        city: '',
        district: '',
        detail: '',
        isDefault: false
    })
}

function edit(address) {
    editingId.value = address.id
    Object.assign(form, {
        recipient: address.recipient,
        phone: address.phone,
        province: address.province,
        city: address.city,
        district: address.district,
        detail: address.detail,
        isDefault: address.is_default
    })
}

async function save() {
    try {
        if (editingId.value) {
            await api.users.updateAddress(editingId.value, form)
        } else {
            await api.users.createAddress(form)
        }
        toast.ok('地址已保存')
        resetForm()
        await load()
    } catch (e) {
        toast.error(e.message)
    }
}

async function setDefault(id) {
    await api.users.setDefaultAddress(id)
    await load()
}

async function remove(id) {
    if (!window.confirm('确定删除该地址？')) return
    await api.users.deleteAddress(id)
    await load()
}

onMounted(load)
</script>

<template>
    <section class="page-section">
        <div class="page-head">
            <h2>收货地址</h2>
            <span class="en">ADDRESS BOOK</span>
            <div class="rule"></div>
        </div>

        <div class="address-grid">
            <div class="address-list">
                <div v-if="loading" class="loading-line">正在读取地址…</div>
                <div v-else-if="!addresses.length" class="empty-state"><h3>还没有地址</h3></div>
                <article v-for="address in addresses" :key="address.id" class="address-card">
                    <header>
                        <strong>{{ address.recipient }} · {{ address.phone }}</strong>
                        <span v-if="address.is_default">默认</span>
                    </header>
                    <p>{{ address.province }} {{ address.city }} {{ address.district }} {{ address.detail }}</p>
                    <footer>
                        <button v-if="!address.is_default" class="btn-outline btn-sm" @click="setDefault(address.id)">设为默认</button>
                        <button class="btn-outline btn-sm" @click="edit(address)">编辑</button>
                        <button class="btn-danger-outline btn-sm" @click="remove(address.id)">删除</button>
                    </footer>
                </article>
            </div>

            <form class="address-form" @submit.prevent="save">
                <h3>{{ editingId ? '编辑地址' : '新增地址' }}</h3>
                <input v-model="form.recipient" class="ink-field" placeholder="收货人" required>
                <input v-model="form.phone" class="ink-field" placeholder="手机号" maxlength="11" required>
                <input v-model="form.province" class="ink-field" placeholder="省份">
                <input v-model="form.city" class="ink-field" placeholder="城市">
                <input v-model="form.district" class="ink-field" placeholder="区县">
                <textarea v-model="form.detail" class="ink-field" rows="3" placeholder="详细地址" required></textarea>
                <label class="default-check"><input v-model="form.isDefault" type="checkbox"> 设为默认地址</label>
                <button class="btn-reveal-all" type="submit">{{ editingId ? '保存修改' : '添加地址' }}</button>
                <button v-if="editingId" class="btn-outline" type="button" @click="resetForm">取消编辑</button>
            </form>
        </div>
    </section>
</template>

<style scoped>
.address-grid { display: grid; grid-template-columns: 1fr 360px; gap: 40px; align-items: start; }
.address-list { display: grid; gap: 14px; }
.address-card { background: #fff; border: 1px solid var(--c-grid); padding: 18px; }
.address-card header, .address-card footer { display: flex; justify-content: space-between; gap: 10px; }
.address-card header span { color: var(--c-primary); }
.address-card p { margin: 12px 0; color: var(--c-ink-soft); }
.address-form { display: grid; gap: 10px; background: #fff; border: 1px solid var(--c-grid); padding: 22px; }
.address-form .ink-field { margin: 0; }
.default-check { font-size: 12px; }
.loading-line { padding: 50px; text-align: center; }
@media (max-width: 900px) { .address-grid { grid-template-columns: 1fr; } }
</style>
