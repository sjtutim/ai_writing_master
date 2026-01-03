import { useAuthStore } from '~/stores/auth'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  timeout?: number
  retries?: number
}

export function useApi() {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()

  const baseUrl = config.public.apiBaseUrl

  // 调试：输出配置信息
  if (import.meta.dev) {
    console.log('[useApi] Runtime config:', {
      baseUrl,
      fullConfig: config.public,
      envVar: import.meta.env.NUXT_PUBLIC_API_BASE_URL
    })
  }

  // 优化：添加超时控制
  async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number = 10000
  ): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      return response
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('请求超时，请检查网络连接')
      }
      throw error
    }
  }

  // 优化：添加请求重试机制
  async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = 10000,
      retries = 1
    } = options

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (authStore.token) {
      requestHeaders['Authorization'] = `Bearer ${authStore.token}`
    }

    const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint

    let lastError: Error | null = null

    // 重试逻辑
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetchWithTimeout(url, {
          method,
          headers: requestHeaders,
          body: body ? JSON.stringify(body) : undefined,
        }, timeout)

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(error.error || `HTTP error ${response.status}`)
        }

        return response.json()
      } catch (error: any) {
        lastError = error

        // 如果是最后一次尝试或不是网络错误，直接抛出
        if (attempt === retries || error.message.includes('HTTP error')) {
          throw error
        }

        // 等待后重试（指数退避）
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }

    throw lastError || new Error('请求失败')
  }

  return {
    get: <T>(endpoint: string, options?: Omit<ApiOptions, 'method' | 'body'>) =>
      request<T>(endpoint, { ...options, method: 'GET' }),
    post: <T>(endpoint: string, body: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
      request<T>(endpoint, { ...options, method: 'POST', body }),
    put: <T>(endpoint: string, body: any, options?: Omit<ApiOptions, 'method' | 'body'>) =>
      request<T>(endpoint, { ...options, method: 'PUT', body }),
    delete: <T>(endpoint: string, options?: Omit<ApiOptions, 'method' | 'body'>) =>
      request<T>(endpoint, { ...options, method: 'DELETE' }),
  }
}
