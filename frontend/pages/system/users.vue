<template>
  <div class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
    <div class="px-4 py-6 sm:px-0">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-2xl font-semibold text-gray-900">用户管理</h1>
        <button
          @click="showCreateModal = true"
          class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm"
        >
          新增用户
        </button>
      </div>

      <div class="bg-white shadow rounded-lg overflow-hidden">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用户
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                角色
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建时间
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="user in users" :key="user.id">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span class="text-indigo-600 font-medium">{{ user.email[0].toUpperCase() }}</span>
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900">{{ user.name || '未命名' }}</div>
                    <div class="text-sm text-gray-500">{{ user.email }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  :class="[
                    'px-2 py-1 text-xs font-semibold rounded-full',
                    user.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  ]"
                >
                  {{ user.status === 'active' ? '启用' : '禁用' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  v-for="role in user.roles"
                  :key="role.id"
                  class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mr-1"
                >
                  {{ role.name === 'admin' ? '管理员' : '普通用户' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ formatDate(user.createdAt) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  @click="openEditModal(user)"
                  class="text-indigo-600 hover:text-indigo-900 mr-3"
                >
                  编辑
                </button>
                <button
                  @click="openResetPasswordModal(user)"
                  class="text-gray-600 hover:text-gray-900 mr-3"
                >
                  重置密码
                </button>
                <button
                  @click="deleteUser(user.id)"
                  class="text-red-600 hover:text-red-900"
                >
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="users.length === 0" class="text-center py-12 text-gray-500">
          暂无用户数据
        </div>
      </div>
    </div>

    <!-- Create/Edit User Modal -->
    <div v-if="showCreateModal || showEditModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">
          {{ showEditModal ? '编辑用户' : '新增用户' }}
        </h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
            <input
              v-model="userForm.email"
              type="email"
              :disabled="showEditModal"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">姓名</label>
            <input
              v-model="userForm.name"
              type="text"
              placeholder="输入用户姓名"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">角色</label>
            <select
              v-model="userForm.roleId"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">选择角色</option>
              <option v-for="role in roles" :key="role.id" :value="role.id">
                {{ role.name === 'admin' ? '管理员' : '普通用户' }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">状态</label>
            <select
              v-model="userForm.status"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="active">启用</option>
              <option value="disabled">禁用</option>
            </select>
          </div>
          <div v-if="!showEditModal">
            <label class="block text-sm font-medium text-gray-700 mb-2">密码</label>
            <input
              v-model="userForm.password"
              type="password"
              placeholder="输入初始密码"
              class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <div v-if="formError" class="mt-4 text-red-500 text-sm">{{ formError }}</div>
        <div class="flex justify-end gap-2 mt-6">
          <button
            @click="closeModal"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            取消
          </button>
          <button
            @click="saveUser"
            :disabled="saving"
            class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reset Password Modal -->
    <div v-if="showResetPasswordModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-medium text-gray-900 mb-4">重置密码</h3>
        <p class="text-gray-500 mb-4">将为用户 <strong>{{ resetPasswordUser?.email }}</strong> 重置密码</p>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">新密码</label>
          <input
            v-model="resetPasswordForm.newPassword"
            type="password"
            placeholder="输入新密码"
            class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div v-if="resetPasswordError" class="mt-4 text-red-500 text-sm">{{ resetPasswordError }}</div>
        <div class="flex justify-end gap-2 mt-6">
          <button
            @click="showResetPasswordModal = false"
            class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
          >
            取消
          </button>
          <button
            @click="resetPassword"
            :disabled="resetPasswordSaving || !resetPasswordForm.newPassword"
            class="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ resetPasswordSaving ? '重置中...' : '重置密码' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
})

interface Role {
  id: string
  name: string
  description?: string
}

interface User {
  id: string
  email: string
  name?: string | null
  status: string
  createdAt: string
  roles: Role[]
}

const authStore = useAuthStore()
const config = useRuntimeConfig()

const users = ref<User[]>([])
const roles = ref<Role[]>([])
const loading = ref(true)

// Modal states
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showResetPasswordModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingUserId = ref<string | null>(null)

const userForm = ref({
  email: '',
  name: '',
  roleId: '',
  status: 'active',
  password: '',
})

const resetPasswordUser = ref<User | null>(null)
const resetPasswordForm = ref({
  newPassword: '',
})
const resetPasswordSaving = ref(false)
const resetPasswordError = ref('')

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const fetchUsers = async () => {
  loading.value = true
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/users`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    })
    if (response.ok) {
      users.value = await response.json()
    }
  } catch (error) {
    console.error('Failed to fetch users:', error)
  } finally {
    loading.value = false
  }
}

const fetchRoles = async () => {
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/users/meta/roles`, {
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    })
    if (response.ok) {
      roles.value = await response.json()
    }
  } catch (error) {
    console.error('Failed to fetch roles:', error)
  }
}

const closeModal = () => {
  showCreateModal.value = false
  showEditModal.value = false
  formError.value = ''
  editingUserId.value = null
  userForm.value = {
    email: '',
    name: '',
    roleId: '',
    status: 'active',
    password: '',
  }
}

const openEditModal = (user: User) => {
  editingUserId.value = user.id
  userForm.value = {
    email: user.email,
    name: user.name || '',
    roleId: user.roles[0]?.id || '',
    status: user.status,
    password: '',
  }
  showEditModal.value = true
}

const openResetPasswordModal = (user: User) => {
  resetPasswordUser.value = user
  resetPasswordForm.value.newPassword = ''
  resetPasswordError.value = ''
  showResetPasswordModal.value = true
}

const saveUser = async () => {
  formError.value = ''
  saving.value = true

  try {
    if (showEditModal.value) {
      const response = await fetch(`${config.public.apiBaseUrl}/users/${editingUserId.value}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({
          name: userForm.value.name,
          status: userForm.value.status,
          roleId: userForm.value.roleId,
        }),
      })

      if (response.ok) {
        closeModal()
        fetchUsers()
      } else {
        const data = await response.json()
        formError.value = data.error || '保存失败'
      }
    } else {
      const response = await fetch(`${config.public.apiBaseUrl}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.token}`,
        },
        body: JSON.stringify({
          email: userForm.value.email,
          password: userForm.value.password,
          name: userForm.value.name,
          roleId: userForm.value.roleId,
          status: userForm.value.status,
        }),
      })

      if (response.ok) {
        closeModal()
        fetchUsers()
      } else {
        const data = await response.json()
        formError.value = data.error || '保存失败'
      }
    }
  } catch (error: any) {
    formError.value = error.message || '保存失败'
  } finally {
    saving.value = false
  }
}

const resetPassword = async () => {
  if (!resetPasswordUser.value) return

  resetPasswordError.value = ''
  resetPasswordSaving.value = true

  try {
    const response = await fetch(`${config.public.apiBaseUrl}/users/${resetPasswordUser.value.id}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({
        password: resetPasswordForm.value.newPassword,
      }),
    })

    if (response.ok) {
      showResetPasswordModal.value = false
      alert('密码重置成功')
    } else {
      const data = await response.json()
      resetPasswordError.value = data.error || '重置失败'
    }
  } catch (error: any) {
    resetPasswordError.value = error.message || '重置失败'
  } finally {
    resetPasswordSaving.value = false
  }
}

const deleteUser = async (id: string) => {
  if (!confirm('确定要删除该用户吗？此操作不可恢复。')) return

  try {
    const response = await fetch(`${config.public.apiBaseUrl}/users/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${authStore.token}`,
      },
    })

    if (response.ok) {
      fetchUsers()
    } else {
      const data = await response.json()
      alert(data.error || '删除失败')
    }
  } catch (error) {
    console.error('Failed to delete user:', error)
  }
}

onMounted(() => {
  fetchUsers()
  fetchRoles()
})
</script>
