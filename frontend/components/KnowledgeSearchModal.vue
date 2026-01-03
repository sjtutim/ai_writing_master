<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <h2 class="text-xl font-bold text-gray-900">搜索参考知识</h2>
        <button
          @click="close"
          class="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-6 space-y-4 border-b border-gray-200">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">搜索关键词或问题</label>
          <input
            v-model="searchQuery"
            type="text"
            class="input"
            placeholder="例如：机器学习的基本概念"
            @keyup.enter="handleSearch"
          />
        </div>

        <div class="flex items-center gap-4">
          <div class="flex-1">
            <label class="block text-sm font-semibold text-gray-700 mb-2">知识库范围</label>
            <select v-model="selectedCollection" class="input">
              <option :value="null">全部知识库</option>
              <option
                v-for="collection in collections"
                :key="collection.id"
                :value="collection.id"
              >
                {{ collection.name }}
              </option>
            </select>
          </div>

          <div class="flex items-end">
            <button
              @click="handleSearch"
              :disabled="!searchQuery || searching"
              class="btn btn-primary"
              :class="{ 'opacity-50 cursor-not-allowed': !searchQuery || searching }"
            >
              <svg v-if="searching" class="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {{ searching ? '搜索中...' : '开始搜索' }}
            </button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="!searched && searchResults.length === 0" class="text-center py-12 text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p class="text-sm">输入关键词开始搜索</p>
        </div>

        <div v-else-if="searched && searchResults.length === 0" class="text-center py-12 text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm">未找到相关知识</p>
          <p class="text-xs text-gray-400 mt-1">尝试使用不同的关键词</p>
        </div>

        <div v-else class="space-y-3">
          <div class="flex items-center justify-between mb-4">
            <p class="text-sm text-gray-600">
              找到 <span class="font-semibold text-blue-600">{{ searchResults.length }}</span> 条相关知识
            </p>
            <button
              v-if="selectedChunks.length > 0"
              @click="toggleSelectAll"
              class="text-sm text-blue-600 hover:text-blue-700"
            >
              {{ selectedChunks.length === searchResults.length ? '取消全选' : '全选' }}
            </button>
          </div>

          <div
            v-for="result in searchResults"
            :key="result.id"
            class="border rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
            :class="{
              'border-blue-500 bg-blue-50': selectedChunks.includes(result.id),
              'border-gray-200': !selectedChunks.includes(result.id)
            }"
            @click="toggleSelection(result.id)"
          >
            <div class="flex items-start gap-3">
              <input
                type="checkbox"
                :checked="selectedChunks.includes(result.id)"
                class="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                @click.stop
                @change="toggleSelection(result.id)"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-2">
                  <h4 class="text-sm font-semibold text-gray-900 truncate">
                    {{ result.documentTitle }}
                  </h4>
                  <span v-if="result.collectionName" class="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded flex-shrink-0">
                    {{ result.collectionName }}
                  </span>
                  <span class="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded flex-shrink-0">
                    相似度: {{ (result.similarity * 100).toFixed(1) }}%
                  </span>
                </div>
                <p class="text-sm text-gray-700 line-clamp-4">
                  {{ result.content }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between p-6 border-t border-gray-200">
        <p class="text-sm text-gray-600">
          已选择 <span class="font-semibold text-blue-600">{{ selectedChunks.length }}</span> 条知识
        </p>
        <div class="flex gap-3">
          <button @click="close" class="btn btn-secondary">
            取消
          </button>
          <button
            @click="handleAddToCache"
            :disabled="selectedChunks.length === 0"
            class="btn btn-primary"
            :class="{ 'opacity-50 cursor-not-allowed': selectedChunks.length === 0 }"
          >
            添加到缓存 ({{ selectedChunks.length }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useApi } from '~/composables/useApi'

const { get, post } = useApi()

interface SearchResult {
  id: string
  content: string
  chunkIndex: number
  documentTitle: string
  collectionName: string | null
  similarity: number
}

interface Collection {
  id: string
  name: string
}

const props = defineProps<{
  visible: boolean
  selectedCollectionId?: string | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'chunks-selected': [chunkIds: string[]]
}>()

const searchQuery = ref('')
const selectedCollection = ref<string | null>(props.selectedCollectionId || null)
const searching = ref(false)
const searched = ref(false)
const searchResults = ref<SearchResult[]>([])
const selectedChunks = ref<string[]>([])
const collections = ref<Collection[]>([])

watch(() => props.selectedCollectionId, (newVal) => {
  selectedCollection.value = newVal || null
})

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadCollections()
  }
})

async function loadCollections() {
  try {
    collections.value = await get<Collection[]>('/api/collections')
  } catch (error) {
    console.error('Failed to load collections:', error)
  }
}

async function handleSearch() {
  if (!searchQuery.value) return

  searching.value = true
  searched.value = false

  try {
    const response = await post<{ chunks: SearchResult[]; total: number }>(
      '/api/writing-tasks/knowledge/search',
      {
        query: searchQuery.value,
        collectionId: selectedCollection.value,
        limit: 30,
      }
    )

    searchResults.value = response.chunks
    selectedChunks.value = []
    searched.value = true
  } catch (error: any) {
    console.error('Search error:', error)
    // 尝试获取后端返回的详细错误信息
    const errorMessage = error?.response?.data?.error || error?.message || '搜索失败，请重试'
    alert(errorMessage)
  } finally {
    searching.value = false
  }
}

function toggleSelection(chunkId: string) {
  const index = selectedChunks.value.indexOf(chunkId)
  if (index > -1) {
    selectedChunks.value.splice(index, 1)
  } else {
    selectedChunks.value.push(chunkId)
  }
}

function toggleSelectAll() {
  if (selectedChunks.value.length === searchResults.value.length) {
    selectedChunks.value = []
  } else {
    selectedChunks.value = searchResults.value.map(r => r.id)
  }
}

function handleAddToCache() {
  if (selectedChunks.value.length === 0) return
  emit('chunks-selected', selectedChunks.value)
  close()
}

function close() {
  emit('update:visible', false)
  setTimeout(() => {
    searchQuery.value = ''
    searchResults.value = []
    selectedChunks.value = []
    searched.value = false
  }, 300)
}
</script>

<style scoped>
.line-clamp-4 {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
