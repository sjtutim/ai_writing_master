<template>
  <div class="min-h-screen bg-gray-50 font-sans">
    <nav v-if="authStore.isAuthenticated" class="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <!-- Logo -->
            <NuxtLink to="/dashboard" class="flex items-center gap-3 group mr-8">
              <div class="relative w-9 h-9 flex items-center justify-center">
                <div class="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl opacity-20 group-hover:opacity-100 group-hover:rotate-6 transition-all duration-300"></div>
                <div class="absolute inset-0.5 bg-white rounded-[10px] flex items-center justify-center">
                   <svg class="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </div>
              <span class="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 group-hover:from-indigo-600 group-hover:to-purple-600 transition-all duration-300 hidden sm:block tracking-tight font-display">
                AI4Write
              </span>
            </NuxtLink>

            <!-- Navigation -->
            <div class="hidden sm:flex sm:space-x-1">
              <NuxtLink
                to="/dashboard"
                class="nav-link"
                active-class="nav-link-active"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                仪表盘
              </NuxtLink>
              <NuxtLink
                to="/knowledge"
                class="nav-link"
                active-class="nav-link-active"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                知识库
              </NuxtLink>
              <NuxtLink
                to="/writing"
                class="nav-link"
                active-class="nav-link-active"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                写作工作台
              </NuxtLink>
              <NuxtLink
                v-if="authStore.hasPermission('system:users')"
                to="/system/users"
                class="nav-link"
                active-class="nav-link-active"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                系统管理
              </NuxtLink>
            </div>
          </div>

          <!-- Right side -->
          <div class="flex items-center gap-4">
            <!-- User menu -->
            <div class="flex items-center gap-3">
              <div class="hidden sm:block text-right">
                <p class="text-sm font-medium text-gray-700">{{ authStore.user?.name || authStore.user?.email }}</p>
                <p class="text-xs text-gray-500">{{ authStore.user?.roles?.[0]?.name === 'admin' ? '管理员' : '用户' }}</p>
              </div>
              <div class="w-9 h-9 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            <!-- Change password -->
            <button
              @click="openChangePasswordModal"
              class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="修改密码"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.5 10.5V7a4.5 4.5 0 00-9 0v3.5m-.75 0h10.5a.75.75 0 01.75.75v6a.75.75 0 01-.75.75H6.75a.75.75 0 01-.75-.75v-6a.75.75 0 01.75-.75z" />
              </svg>
            </button>

            <!-- Logout button -->
            <button
              @click="handleLogout"
              class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="退出登录"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      <div class="sm:hidden border-t border-gray-100">
        <div class="flex justify-around py-2">
          <NuxtLink to="/dashboard" class="flex flex-col items-center py-1 px-3 text-xs" active-class="text-indigo-600">
            <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            仪表盘
          </NuxtLink>
          <NuxtLink to="/knowledge" class="flex flex-col items-center py-1 px-3 text-xs" active-class="text-indigo-600">
            <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            知识库
          </NuxtLink>
          <NuxtLink to="/writing" class="flex flex-col items-center py-1 px-3 text-xs" active-class="text-indigo-600">
            <svg class="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            写作
          </NuxtLink>
        </div>
      </div>
    </nav>

    <!-- Change Password Modal -->
    <div
      v-if="showChangePasswordModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm px-4"
    >
      <div class="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
        <h3 class="text-lg font-semibold text-gray-900 mb-1">修改密码</h3>
        <p class="text-sm text-gray-500 mb-4">请输入当前密码并设置新密码</p>

        <form class="space-y-4" @submit.prevent="submitChangePassword">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">当前密码</label>
            <input
              v-model="changePasswordForm.currentPassword"
              type="password"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="输入当前密码"
              autocomplete="current-password"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">新密码</label>
            <input
              v-model="changePasswordForm.newPassword"
              type="password"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="至少 6 位字符"
              autocomplete="new-password"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">确认新密码</label>
            <input
              v-model="changePasswordForm.confirmPassword"
              type="password"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="再次输入新密码"
              autocomplete="new-password"
            />
          </div>

          <div v-if="changePasswordError" class="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
            {{ changePasswordError }}
          </div>
          <div v-if="changePasswordSuccess" class="p-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">
            {{ changePasswordSuccess }}
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="closeChangePasswordModal"
              class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              取消
            </button>
            <button
              type="submit"
              :disabled="changingPassword"
              class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-60"
            >
              {{ changingPassword ? '保存中...' : '保存修改' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <main class="animate-fade-in">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const api = useApi()

const showChangePasswordModal = ref(false)
const changingPassword = ref(false)
const changePasswordError = ref('')
const changePasswordSuccess = ref('')
const changePasswordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const resetChangePasswordForm = () => {
  changePasswordForm.currentPassword = ''
  changePasswordForm.newPassword = ''
  changePasswordForm.confirmPassword = ''
}

const openChangePasswordModal = () => {
  resetChangePasswordForm()
  changePasswordError.value = ''
  changePasswordSuccess.value = ''
  showChangePasswordModal.value = true
}

const closeChangePasswordModal = () => {
  showChangePasswordModal.value = false
  changePasswordError.value = ''
  changePasswordSuccess.value = ''
}

const submitChangePassword = async () => {
  changePasswordError.value = ''
  changePasswordSuccess.value = ''

  if (!changePasswordForm.currentPassword || !changePasswordForm.newPassword || !changePasswordForm.confirmPassword) {
    changePasswordError.value = '请完整填写所有字段'
    return
  }

  if (changePasswordForm.newPassword.length < 6) {
    changePasswordError.value = '新密码长度至少为 6 位'
    return
  }

  if (changePasswordForm.newPassword !== changePasswordForm.confirmPassword) {
    changePasswordError.value = '两次输入的新密码不一致'
    return
  }

  changingPassword.value = true
  try {
    const response = await api.post<{ message: string }>('/auth/change-password', {
      currentPassword: changePasswordForm.currentPassword,
      newPassword: changePasswordForm.newPassword,
    })
    changePasswordSuccess.value = response.message || '密码修改成功'
    resetChangePasswordForm()
    setTimeout(() => closeChangePasswordModal(), 800)
  } catch (error: any) {
    changePasswordError.value = error.message || '修改失败，请重试'
  } finally {
    changingPassword.value = false
  }
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.nav-link {
  @apply flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all duration-200;
}

.nav-link-active {
  @apply bg-indigo-50 text-indigo-600;
}

.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
