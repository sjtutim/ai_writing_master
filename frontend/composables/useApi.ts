import { useAuthStore } from '~/stores/auth'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
}

export function useApi() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const baseUrl = config.public.apiBaseUrl

  async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (authStore.token) {
      requestHeaders['Authorization'] = `Bearer ${authStore.token}`
    }

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP error ${response.status}`)
    }

    return response.json()
  }

  return {
    get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
    post: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'POST', body }),
    put: <T>(endpoint: string, body: any) => request<T>(endpoint, { method: 'PUT', body }),
    delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  }
}
