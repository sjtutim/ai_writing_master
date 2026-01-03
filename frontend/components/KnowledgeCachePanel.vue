<template>
  <div>
    <div v-if="cachedChunks.length === 0" class="text-center py-8 text-gray-500">
      <svg class="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
      <p class="text-sm">暂无缓存的参考知识</p>
      <p class="text-xs text-gray-400 mt-1">点击"搜索知识"按钮添加</p>
    </div>

    <div v-else class="space-y-3 max-h-96 overflow-y-auto">
      <div
        v-for="chunk in cachedChunks"
        :key="chunk.id"
        class="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-blue-300 transition-colors"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h4 class="text-sm font-semibold text-gray-900 truncate">
                {{ chunk.documentTitle }}
              </h4>
              <span v-if="chunk.collectionName" class="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded flex-shrink-0">
                {{ chunk.collectionName }}
              </span>
            </div>
            <p class="text-sm text-gray-700 line-clamp-3">
              {{ chunk.content }}
            </p>
          </div>
          <button
            @click="$emit('remove-chunk', chunk.id)"
            class="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors p-1"
            title="移除"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface CachedChunk {
  id: string
  content: string
  documentTitle: string
  collectionName?: string | null
  addedAt: string
}

defineProps<{
  cachedChunks: CachedChunk[]
}>()

defineEmits<{
  'remove-chunk': [chunkId: string]
}>()
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
