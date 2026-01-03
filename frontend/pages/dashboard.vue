<template>
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">仪表盘</h1>
      <p class="text-gray-500 mt-1">欢迎回来，{{ authStore.user?.name || authStore.user?.email }}</p>
    </div>

    <!-- System Status Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div
        v-for="(status, service) in healthData?.services"
        :key="service"
        class="card p-5"
      >
        <div class="flex items-center justify-between mb-3">
          <div
            class="w-10 h-10 rounded-lg flex items-center justify-center"
            :class="status ? 'bg-green-100' : 'bg-red-100'"
          >
            <svg v-if="status" class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span
            class="text-xs font-medium px-2 py-1 rounded-full"
            :class="status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'"
          >
            {{ status ? '正常' : '异常' }}
          </span>
        </div>
        <h3 class="text-sm font-medium text-gray-900">{{ serviceNames[service] || service }}</h3>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="mb-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">快捷入口</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <NuxtLink
          to="/knowledge"
          class="card p-5 card-clickable group"
        >
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">知识库</h3>
              <p class="text-sm text-gray-500">管理文档</p>
            </div>
          </div>
        </NuxtLink>

        <NuxtLink
          to="/writing"
          class="card p-5 card-clickable group"
        >
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">写作</h3>
              <p class="text-sm text-gray-500">开始创作</p>
            </div>
          </div>
        </NuxtLink>

        <NuxtLink
          v-if="authStore.hasPermission('prompts:manage')"
          to="/writing?tab=prompts"
          class="card p-5 card-clickable group"
        >
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">模板</h3>
              <p class="text-sm text-gray-500">编辑模板</p>
            </div>
          </div>
        </NuxtLink>

        <NuxtLink
          v-if="authStore.hasPermission('system:users')"
          to="/system/users"
          class="card p-5 card-clickable group"
        >
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">系统</h3>
              <p class="text-sm text-gray-500">用户管理</p>
            </div>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Loading/Error State -->
    <div v-if="loading" class="card p-12 text-center">
      <div class="spinner w-8 h-8 mx-auto mb-4 border-2 border-gray-200 border-t-indigo-600"></div>
      <p class="text-gray-500">正在加载系统状态...</p>
    </div>

    <div v-else-if="healthError" class="card p-12 text-center">
      <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p class="text-gray-900 font-medium mb-2">无法连接服务器</p>
      <p class="text-gray-500 text-sm">{{ healthError }}</p>
      <button @click="retryFetch" class="btn btn-primary mt-4">
        重试
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
})

const authStore = useAuthStore()
const api = useApi()

const loading = ref(true)
const healthError = ref('')
const healthData = ref<{ status: string; services: Record<string, boolean> } | null>(null)

const serviceNames: Record<string, string> = {
  database: '数据库',
  minio: '文件存储',
  embedding: '向量服务',
  llm: 'AI模型',
}

async function fetchHealth() {
  loading.value = true
  healthError.value = ''
  try {
    healthData.value = await api.get('/health')
  } catch (e: any) {
    healthError.value = e.message || '获取状态失败'
  } finally {
    loading.value = false
  }
}

function retryFetch() {
  fetchHealth()
}

onMounted(() => {
  authStore.loadFromStorage()
  fetchHealth()
})
</script>
