<template>
  <div class="min-h-screen flex">
    <!-- Left side - Branding -->
    <div class="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 relative overflow-hidden">
      <!-- Decorative elements -->
      <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div class="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <!-- Content -->
      <div class="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white">
        <div class="flex items-center gap-3 mb-8">
          <div class="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <span class="text-2xl font-bold">AI Writing Master</span>
        </div>
        <h1 class="text-4xl xl:text-5xl font-bold leading-tight mb-6">
          智能写作助手
        </h1>
        <p class="text-lg text-white/80 mb-8 max-w-md">
          基于 RAG 技术的本地化智能写作系统，让您的创作更加高效、专业。
        </p>
        <div class="flex items-center gap-4 text-sm text-white/70">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>知识库管理</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>智能写作</span>
          </div>
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>模板风格</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right side - Login form -->
    <div class="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
      <div class="w-full max-w-md">
        <!-- Mobile logo -->
        <div class="lg:hidden flex items-center justify-center gap-3 mb-8">
          <div class="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <span class="text-xl font-bold text-gray-900">AI4Write</span>
        </div>

        <div class="card p-8">
          <div class="text-center mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-2">欢迎回来</h2>
            <p class="text-gray-500">请登录您的账户以继续</p>
          </div>

          <div v-if="error" class="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm">
            {{ error }}
          </div>

          <form @submit.prevent="handleSubmit" class="space-y-6">
            <div>
              <label for="email" class="label">邮箱地址</label>
              <input
                id="email"
                v-model="email"
                type="email"
                required
                class="input mt-2 py-3 px-4"
                placeholder="请输入邮箱地址"
                autocomplete="email"
              />
            </div>

            <div>
              <label for="password" class="label">密码</label>
              <input
                id="password"
                v-model="password"
                type="password"
                required
                class="input mt-2 py-3 px-4"
                placeholder="请输入密码"
                autocomplete="current-password"
              />
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="btn btn-primary w-full py-3"
            >
              <span v-if="loading" class="spinner"></span>
              <span v-else>登录</span>
            </button>
          </form>
        </div>

        <p class="mt-8 text-center text-sm text-gray-400">
          本地化 RAG 智能写作系统
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: false,
})

const authStore = useAuthStore()
const router = useRouter()
const api = useApi()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

const handleSubmit = async () => {
  error.value = ''
  loading.value = true

  try {
    const response = await api.post<{ user: any; token: string }>('/auth/login', {
      email: email.value,
      password: password.value,
    })
    authStore.setAuth(response.user, response.token)
    router.push('/dashboard')
  } catch (e: any) {
    error.value = e.message || '登录失败，请检查邮箱和密码'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  authStore.loadFromStorage()
  if (authStore.isAuthenticated) {
    router.push('/dashboard')
  }
})
</script>

<style scoped>
.animate-blob {
  animation: blob 7s infinite;
}

.animation-delay-2000 {
  animation-delay: 2s;
}

.animation-delay-4000 {
  animation-delay: 4s;
}

@keyframes blob {
  0% {
    transform: translate(0px, 0px) scale(1);
  }
  33% {
    transform: translate(30px, -50px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
  100% {
    transform: translate(0px, 0px) scale(1);
  }
}
</style>
