<template>
  <div class="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">写作工作台</h1>
      <p class="text-gray-500 mt-1">基于知识库的智能写作系统</p>
    </div>

    <!-- Tab Navigation -->
    <div class="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
        :class="
          activeTab === tab.id
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        "
      >
        {{ tab.name }}
      </button>
    </div>

    <!-- 写作工作台 -->
    <div v-show="activeTab === 'workspace'" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- 左侧：输入区 -->
      <div class="lg:col-span-2 space-y-6">
        <!-- 主输入卡片 -->
        <div class="card p-6">
          <div class="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 class="text-lg font-semibold text-gray-900">写作配置</h2>
              <p class="text-sm text-gray-500">设置参数以获得更好的生成效果</p>
            </div>
          </div>

          <!-- 选择提示词模板 -->
          <div class="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <label class="block text-sm font-semibold text-gray-800">
                提示词模板
              </label>
              <span class="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">可选</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="relative flex-1 min-w-0">
                <select
                  v-model="selectedPromptId"
                  class="input select-field"
                >
                  <option :value="null">不使用模板限制</option>
                  <option v-for="prompt in prompts" :key="prompt.id" :value="prompt.id">
                    {{ prompt.name }}
                  </option>
                </select>
                <svg class="select-caret" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <button
                @click="activeTab = 'prompts'"
                class="btn btn-secondary text-sm flex-shrink-0 whitespace-nowrap"
              >
                管理模板
              </button>
            </div>
            <div v-if="selectedPrompt" class="mt-2 text-xs text-gray-500 truncate">
              {{ selectedPrompt.content }}
            </div>
          </div>

          <!-- 写作主题 -->
          <div class="mb-6">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <label class="block text-sm font-semibold text-gray-800">
                重要的写作要求<span class="text-red-500">*</span>
              </label>
            </div>
            <textarea
              v-model="query"
              rows="4"
              class="input"
              :placeholder="selectedPrompt ? '已选择模板，请输入具体的写作需求...' : '请输入您想要创作的主题、大纲或核心观点...'"
            ></textarea>
          </div>

          <!-- 知识库选择区域 -->
          <div class="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <label class="block text-sm font-semibold text-gray-800">
                参考知识
              </label>
              <span class="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">可选</span>
            </div>

            <!-- Tab切换 -->
            <div class="flex border-b border-gray-200 mb-3">
              <button
                @click="knowledgeTab = 'basic'"
                class="px-3 py-1.5 text-xs font-medium transition-all duration-200 border-b-2 -mb-px"
                :class="knowledgeTab === 'basic'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                单一知识库
              </button>
              <button
                @click="knowledgeTab = 'advanced'"
                class="px-3 py-1.5 text-xs font-medium transition-all duration-200 border-b-2 -mb-px flex items-center gap-1"
                :class="knowledgeTab === 'advanced'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'"
              >
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                高级跨知识库查询
              </button>
            </div>

            <!-- 单一知识库选择 -->
            <div v-show="knowledgeTab === 'basic'">
              <div class="relative">
                <select
                  v-model="selectedCollectionId"
                  class="input select-field"
                >
                  <option :value="null">全部知识库</option>
                  <option v-for="collection in collections" :key="collection.id" :value="collection.id">
                    {{ collection.name }}
                  </option>
                </select>
                <svg class="select-caret" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <p class="text-xs text-gray-500 mt-2">
                使用向量搜索自动匹配相关知识
              </p>
            </div>

            <!-- 跨知识库（缓存） -->
            <div v-show="knowledgeTab === 'advanced'">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-600">已缓存</span>
                  <span
                    class="text-xs px-2 py-0.5 rounded-full font-semibold"
                    :class="cacheCount > 0 ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'"
                  >
                    {{ cacheCount }} 条
                  </span>
                </div>
                <div class="flex gap-2">
                  <button @click="openKnowledgeSearch" class="btn btn-primary btn-sm">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    搜索知识
                  </button>
                  <button
                    v-if="cacheCount > 0"
                    @click="clearCache"
                    class="btn btn-secondary btn-sm"
                  >
                    清空缓存
                  </button>
                </div>
              </div>
              <KnowledgeCachePanel
                :cached-chunks="cachedChunks"
                @remove-chunk="removeChunk"
              />
            </div>
          </div>

          <!-- 选择写作风格 -->
          <div class="mb-6 p-4 bg-green-50 rounded-xl border border-green-100">
            <div class="flex items-center gap-2 mb-3">
              <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <label class="block text-sm font-semibold text-gray-800">
                写作风格范文
              </label>
              <span class="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">可选</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="relative flex-1 min-w-0">
                <select
                  v-model="selectedStyleId"
                  class="input select-field"
                >
                  <option :value="null">无特定风格</option>
                  <option v-for="style in styles" :key="style.id" :value="style.id">
                    {{ style.name }}
                  </option>
                </select>
                <svg class="select-caret" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <button
                @click="activeTab = 'styles'"
                class="btn btn-secondary text-sm flex-shrink-0 whitespace-nowrap"
              >
                管理风格
              </button>
            </div>
          </div>

          <!-- 生成按钮 -->
          <button
            @click="handleGenerate"
            :disabled="!query || generating"
            class="btn btn-primary w-full py-3"
          >
            <template v-if="generating">
              <span class="spinner w-5 h-5 border-2 border-white/30 border-t-white"></span>
              生成中...
            </template>
            <template v-else>
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              开始生成
            </template>
          </button>
        </div>
      </div>

      <!-- 右侧：历史记录 -->
      <div class="card p-6 lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col">
        <h3 class="text-lg font-semibold text-gray-900 mb-4 flex-shrink-0">最近撰写记录</h3>
        <div class="flex-1 overflow-y-auto">
          <WritingHistory ref="historyRef" @reuse-task="reuseTask" @task-deleted="onTaskDeleted" />
        </div>
      </div>
    </div>

    <!-- 提示词模板管理 -->
    <div v-show="activeTab === 'prompts'" class="max-w-5xl">
      <div class="card p-6">
        <PromptTemplateManager @template-selected="onTemplateSelected" />
      </div>
    </div>

    <!-- 写作风格管理 -->
    <div v-show="activeTab === 'styles'" class="max-w-5xl">
      <div class="card p-6">
        <WritingStyleManager @style-selected="onStyleSelected" />
      </div>
    </div>

    <!-- 历史记录 -->
    <div v-show="activeTab === 'history'" class="max-w-5xl">
      <div class="card p-6">
        <WritingHistory ref="historyFullRef" @reuse-task="reuseTask" @task-deleted="onTaskDeleted" />
      </div>
    </div>

    <!-- 知识搜索模态框 -->
    <KnowledgeSearchModal
      v-model:visible="showKnowledgeSearch"
      :selected-collection-id="selectedCollectionId"
      @chunks-selected="addToCache"
    />

    <!-- 生成结果模态框 -->
    <GenerateResultModal
      v-model:visible="showResultModal"
      v-model:content="output"
      :generating="generating"
    />
  </div>
</template>

<script setup lang="ts">
import WritingStyleManager from '~/components/WritingStyleManager.vue'
import PromptTemplateManager from '~/components/PromptTemplateManager.vue'
import WritingHistory from '~/components/WritingHistory.vue'
import KnowledgeCachePanel from '~/components/KnowledgeCachePanel.vue'
import KnowledgeSearchModal from '~/components/KnowledgeSearchModal.vue'
import GenerateResultModal from '~/components/GenerateResultModal.vue'

definePageMeta({
  middleware: 'auth',
})

const { get, post, delete: del } = useApi()
const config = useRuntimeConfig()

interface Collection {
  id: string
  name: string
}

interface WritingStyle {
  id: string
  name: string
}

interface PromptTemplate {
  id: string
  name: string
  content: string
  category?: string | null
}

interface WritingTask {
  id: string
  query: string
  promptId?: string
  styleId?: string
  kbScope?: any
}

const tabs = [
  { id: 'workspace', name: '写作工作台' },
  { id: 'prompts', name: '模板管理' },
  { id: 'styles', name: '风格管理' },
  { id: 'history', name: '历史记录' },
]

const activeTab = ref('workspace')
const query = ref('')
const output = ref('')
const generating = ref(false)
const selectedCollectionId = ref<string | null>(null)
const selectedPromptId = ref<string | null>(null)
const selectedStyleId = ref<string | null>(null)
const collections = ref<Collection[]>([])
const styles = ref<WritingStyle[]>([])
const prompts = ref<PromptTemplate[]>([])
const historyRef = ref<InstanceType<typeof WritingHistory> | null>(null)
const historyFullRef = ref<InstanceType<typeof WritingHistory> | null>(null)

const knowledgeTab = ref<'advanced' | 'basic'>('basic')
const showKnowledgeSearch = ref(false)
const cachedChunks = ref<CachedChunk[]>([])
const cacheCount = computed(() => cachedChunks.value.length)
const showResultModal = ref(false)

interface CachedChunk {
  id: string
  content: string
  documentTitle: string
  collectionName?: string | null
  addedAt: string
}

async function loadCollections() {
  try {
    collections.value = await get<Collection[]>('/api/collections')
  } catch (error) {
    console.error('Failed to load collections:', error)
  }
}

async function loadStyles() {
  try {
    styles.value = await get<WritingStyle[]>('/api/writing-styles')
  } catch (error) {
    console.error('Failed to load writing styles:', error)
  }
}

async function loadPrompts() {
  try {
    prompts.value = await get<PromptTemplate[]>('/api/prompt-templates')
  } catch (error) {
    console.error('Failed to load prompts:', error)
  }
}

async function loadCache() {
  try {
    const data = await get<{ chunks: CachedChunk[]; count: number }>('/api/writing-tasks/knowledge/cache')
    cachedChunks.value = data.chunks
  } catch (error) {
    console.error('Failed to load cache:', error)
  }
}

async function addToCache(chunkIds: string[]) {
  try {
    await post('/api/writing-tasks/knowledge/cache', { chunkIds })
    await loadCache()
  } catch (error) {
    console.error('Failed to add to cache:', error)
    alert('添加到缓存失败，请重试')
  }
}

async function removeChunk(chunkId: string) {
  try {
    await del(`/api/writing-tasks/knowledge/cache/${chunkId}`)
    await loadCache()
  } catch (error) {
    console.error('Failed to remove chunk:', error)
    alert('移除失败，请重试')
  }
}

async function clearCache() {
  if (!confirm('确定要清空所有缓存的知识吗？')) {
    return
  }
  try {
    await del('/api/writing-tasks/knowledge/cache')
    cachedChunks.value = []
  } catch (error) {
    console.error('Failed to clear cache:', error)
    alert('清空缓存失败，请重试')
  }
}

function openKnowledgeSearch() {
  showKnowledgeSearch.value = true
}

const selectedPrompt = computed(() => {
  return prompts.value.find(p => p.id === selectedPromptId.value) || null
})

async function handleGenerate() {
  if (!query.value) return

  generating.value = true
  output.value = ''
  showResultModal.value = true

  const payload: any = {
    query: query.value,
  }

  if (selectedStyleId.value) {
    payload.styleId = selectedStyleId.value
  }

  if (selectedPromptId.value) {
    payload.promptId = selectedPromptId.value
  }

  // 根据知识库模式决定使用哪种方式
  if (knowledgeTab.value === 'advanced') {
    // 高级跨知识库模式：使用缓存的chunk IDs
    if (cachedChunks.value.length > 0) {
      payload.cachedChunkIds = cachedChunks.value.map(c => c.id)
    }
  } else {
    // 单一知识库模式
    if (selectedCollectionId.value) {
      payload.kbScope = {
        collectionIds: [selectedCollectionId.value],
      }
    }
  }

  const token = localStorage.getItem('token')
  const baseUrl = config.public.apiBaseUrl

  try {
    const response = await fetch(`${baseUrl}/api/writing-tasks/generate/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error('请求失败')
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('无法读取响应流')
    }

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))

            if (data.type === 'task') {
            } else if (data.type === 'chunk') {
              output.value += data.content
            } else if (data.type === 'done') {
              generating.value = false
              if (historyRef.value) {
                historyRef.value.loadTasks()
              }
              if (historyFullRef.value) {
                historyFullRef.value.loadTasks()
              }
              return
            } else if (data.type === 'error') {
              throw new Error(data.error || '生成失败')
            }
          } catch (e) {
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Generation error:', error)
    output.value = `生成失败：${error.message || '未知错误'}`
  } finally {
    generating.value = false
  }
}

function reuseTask(task: WritingTask) {
  query.value = task.query
  selectedPromptId.value = task.promptId || null
  selectedStyleId.value = task.styleId || null
  if (task.kbScope?.collectionIds?.length > 0) {
    selectedCollectionId.value = task.kbScope.collectionIds[0]
  }
  activeTab.value = 'workspace'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onTaskDeleted() {
  if (historyRef.value) {
    historyRef.value.loadTasks()
  }
  if (historyFullRef.value) {
    historyFullRef.value.loadTasks()
  }
}

function onStyleSelected(styleId: string | null) {
  selectedStyleId.value = styleId
}

function onTemplateSelected(template: PromptTemplate) {
  selectedPromptId.value = template.id
  activeTab.value = 'workspace'
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  loadCollections()
  loadStyles()
  loadPrompts()
  loadCache()
})

watch(activeTab, (newTab) => {
  if (newTab === 'prompts') {
    loadPrompts()
  } else if (newTab === 'styles') {
    loadStyles()
  } else if (newTab === 'history' && historyFullRef.value) {
    historyFullRef.value.loadTasks()
  }
})
</script>

<style scoped>
.select-field {
  @apply pr-10 cursor-pointer font-medium bg-white;
  /* 隐藏原生下拉箭头 */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  background-image: none;
}

/* 针对IE的隐藏箭头 */
.select-field::-ms-expand {
  display: none;
}

.select-caret {
  @apply pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 transition-colors;
}

/* 鼠标悬停时箭头变色 */
.relative:hover .select-caret {
  @apply text-indigo-500;
}
</style>
