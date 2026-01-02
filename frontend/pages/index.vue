<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">写作高手</h1>
      <p class="text-gray-600 mb-8">本地化RAG智能写作系统</p>
      <NuxtLink
        to="/login"
        class="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700"
      >
        开始使用
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

onMounted(() => {
  authStore.loadFromStorage()
  if (authStore.isAuthenticated) {
    router.push('/dashboard')
  }
})
</script>
