<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div class="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div class="flex items-center gap-3">
          <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 class="text-xl font-bold text-gray-900">生成结果</h2>
          <span v-if="generating" class="text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded-full flex items-center gap-2">
            <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            生成中...
          </span>
        </div>
        <button
          @click="close"
          :disabled="generating"
          class="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6">
        <div v-if="!content && !generating" class="text-center py-16 text-gray-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-sm">正在准备生成...</p>
        </div>

        <div v-else class="prose max-w-none">
          <div v-if="isEditing">
            <textarea
              v-model="editingContent"
              class="input font-sans min-h-[400px] w-full"
              placeholder="编辑生成的内容..."
            ></textarea>
          </div>
          <div v-else class="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <pre class="whitespace-pre-wrap font-sans text-gray-800 leading-relaxed">{{ content }}</pre>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
        <div class="flex gap-2">
          <button
            v-if="!isEditing && content"
            @click="startEdit"
            class="btn btn-secondary"
            :disabled="generating"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            编辑
          </button>
          <button
            v-if="isEditing"
            @click="saveEdit"
            class="btn btn-primary"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            保存
          </button>
          <button
            v-if="isEditing"
            @click="cancelEdit"
            class="btn btn-secondary"
          >
            取消
          </button>
          <button
            v-if="!isEditing && content"
            @click="copyToClipboard"
            class="btn btn-secondary"
            :disabled="generating"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            {{ copySuccess ? '已复制' : '复制' }}
          </button>
        </div>
        <button
          @click="close"
          class="btn btn-primary"
          :disabled="generating"
        >
          关闭
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  content: string
  generating: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:content': [value: string]
}>()

const isEditing = ref(false)
const editingContent = ref('')
const copySuccess = ref(false)

watch(() => props.visible, (newVal) => {
  if (!newVal) {
    isEditing.value = false
    editingContent.value = ''
    copySuccess.value = false
  }
})

function startEdit() {
  editingContent.value = props.content
  isEditing.value = true
}

function saveEdit() {
  emit('update:content', editingContent.value)
  isEditing.value = false
}

function cancelEdit() {
  editingContent.value = ''
  isEditing.value = false
}

async function copyToClipboard() {
  try {
    await navigator.clipboard.writeText(props.content)
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy:', error)
    alert('复制失败，请手动复制')
  }
}

function close() {
  if (props.generating) return
  emit('update:visible', false)
}
</script>
