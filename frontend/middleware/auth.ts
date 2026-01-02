import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to, from) => {
  const authStore = useAuthStore()

  // Load auth state from storage on client side
  if (import.meta.client) {
    authStore.loadFromStorage()
  }

  // Redirect to login if not authenticated
  if (!authStore.isAuthenticated) {
    return navigateTo('/login')
  }
})
