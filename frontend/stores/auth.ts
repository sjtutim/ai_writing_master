import { defineStore } from 'pinia'

interface User {
  id: string
  email: string
  name: string | null
  status: string
  roles: Array<{ id: string; name: string }>
  permissions: Array<{ code: string; name: string; type: string }>
}

interface AuthState {
  user: User | null
  token: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    hasPermission: (state) => (code: string) => {
      return state.user?.permissions.some((p) => p.code === code) ?? false
    },
  },

  actions: {
    setAuth(user: User, token: string) {
      this.user = user
      this.token = token
      if (import.meta.client) {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
      }
    },

    loadFromStorage() {
      if (import.meta.client) {
        const token = localStorage.getItem('token')
        const userStr = localStorage.getItem('user')
        if (token && userStr) {
          this.token = token
          this.user = JSON.parse(userStr)
        }
      }
    },

    logout() {
      this.user = null
      this.token = null
      if (import.meta.client) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      }
    },
  },
})
