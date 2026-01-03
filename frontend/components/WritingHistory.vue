<template>
  <div class="space-y-3">
    <div v-if="loading && tasks.length === 0" class="text-center py-8">
      <div class="spinner w-6 h-6 mx-auto border-2 border-gray-200 border-t-indigo-600"></div>
      <p class="text-sm text-gray-500 mt-2">加载中...</p>
    </div>

    <TransitionGroup name="list" tag="ul" v-if="tasks.length > 0" class="space-y-3">
      <li
        v-for="task in tasks"
        :key="task.id"
        class="card p-4 hover:border-indigo-200 transition-all cursor-pointer group"
        @click.prevent="$emit('reuse-task', task)"
      >
        <div class="flex justify-between items-start gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
              {{ task.query }}
            </p>
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <span class="text-xs text-gray-500">{{ formatDate(task.createdAt) }}</span>
              <span v-if="task.style?.name" class="badge badge-primary text-xs">
                {{ task.style.name }}
              </span>
              <span v-if="task.prompt?.name" class="badge badge-gray text-xs">
                {{ task.prompt.name }}
              </span>
              <span v-if="task.outputs?.[0]?.tokens" class="badge badge-success text-xs">
                {{ task.outputs[0].tokens }} tokens
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <button
              v-if="isAdmin"
              @click.stop="showDetail(task)"
              class="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="查看详情"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
            <button
              @click.stop="deleteTask(task.id)"
              :disabled="task.status === 'running' || task.status === 'pending'"
              class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="删除"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <span
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              :class="{
                'bg-green-100 text-green-700': task.status === 'succeeded',
                'bg-yellow-100 text-yellow-700': task.status === 'running' || task.status === 'pending',
                'bg-red-100 text-red-700': task.status === 'failed'
              }"
            >
              <span
                class="w-1.5 h-1.5 rounded-full mr-1.5"
                :class="{
                  'bg-green-500': task.status === 'succeeded',
                  'bg-yellow-500 animate-pulse': task.status === 'running' || task.status === 'pending',
                  'bg-red-500': task.status === 'failed'
                }"
              ></span>
              {{ getStatusText(task.status) }}
            </span>
          </div>
        </div>
        <div class="mt-3">
          <p
            class="text-sm text-gray-600 cursor-pointer hover:text-indigo-600 transition-colors"
            :class="{ 'line-clamp-2': !expandedTaskIds.includes(task.id) }"
            @click.stop="toggleExpand(task.id)"
          >
            {{ task.outputs?.[0]?.content || '暂无内容' }}
          </p>
          <div v-if="task.outputs?.[0]?.content && task.outputs[0].content.length > 100" class="mt-2 flex items-center gap-2">
            <button
              @click.stop="toggleExpand(task.id)"
              class="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
            >
              {{ expandedTaskIds.includes(task.id) ? '收起' : '查看全部' }}
            </button>
            <button
              v-if="expandedTaskIds.includes(task.id)"
              @click.stop="copyContent(task.outputs[0].content)"
              class="text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制
            </button>
          </div>
        </div>
      </li>
    </TransitionGroup>

    <div v-if="tasks.length === 0 && !loading" class="empty-state py-8">
      <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p class="empty-state-title">暂无历史记录</p>
      <p class="empty-state-description">您的写作生成记录将显示在这里</p>
    </div>

    <div v-if="total > pageSize" class="flex items-center justify-between pt-4 border-t border-gray-100">
      <span class="text-sm text-gray-500">共 {{ total }} 条</span>
      <div class="flex items-center gap-2">
        <button
          @click="changePage(page - 1)"
          :disabled="page <= 1"
          class="btn btn-secondary btn-sm"
        >
          上一页
        </button>
        <span class="text-sm text-gray-600 px-2">
          {{ page }} / {{ totalPage }}
        </span>
        <button
          @click="changePage(page + 1)"
          :disabled="page >= totalPage"
          class="btn btn-secondary btn-sm"
        >
          下一页
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="selectedTask" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click="selectedTask = null">
        <div class="absolute inset-0 bg-gray-900/50 modal-backdrop" @click="selectedTask = null"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" @click.stop>
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900">生成详情</h3>
            <button @click="selectedTask = null" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            <div class="bg-gray-50 rounded-xl p-4">
              <h4 class="text-sm font-medium text-gray-700 mb-3">基本信息</h4>
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="flex items-center gap-2">
                  <span class="text-gray-500">状态：</span>
                  <span
                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                    :class="{
                      'bg-green-100 text-green-700': selectedTask.status === 'succeeded',
                      'bg-yellow-100 text-yellow-700': selectedTask.status === 'running' || selectedTask.status === 'pending',
                      'bg-red-100 text-red-700': selectedTask.status === 'failed'
                    }"
                  >
                    {{ getStatusText(selectedTask.status) }}
                  </span>
                </div>
                <div><span class="text-gray-500">创建时间：</span>{{ formatFullDate(selectedTask.createdAt) }}</div>
                <div v-if="selectedTask.outputs?.[0]?.tokens"><span class="text-gray-500">Token：</span>{{ selectedTask.outputs[0].tokens }}</div>
              </div>
            </div>

            <div class="border border-gray-200 rounded-xl p-4">
              <h4 class="text-sm font-medium text-gray-700 mb-2">写作要求</h4>
              <p class="text-sm text-gray-900 whitespace-pre-wrap">{{ selectedTask.query }}</p>
            </div>

            <div v-if="selectedTask.outputs?.[0]?.content" class="border border-gray-200 rounded-xl p-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-700">生成内容</h4>
                <span class="text-xs text-gray-500">{{ selectedTask.outputs[0].content.length }} 字</span>
              </div>
              <p class="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{{ selectedTask.outputs[0].content }}</p>
            </div>

            <div v-if="selectedTask.outputs?.[0]?.metadata?.retrievedChunks?.length" class="border border-gray-200 rounded-xl p-4">
              <h4 class="text-sm font-medium text-gray-700 mb-3">单一知识库内容 ({{ selectedTask.outputs[0]?.metadata?.retrievedChunks?.length }} 条)</h4>
              <div class="space-y-3">
                <div v-for="(chunk, index) in selectedTask.outputs[0]?.metadata?.retrievedChunks || []" :key="index" class="bg-amber-50 rounded-lg p-3">
                  <p class="text-xs text-amber-600 mb-1">来源：{{ chunk.index }}</p>
                  <p class="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">{{ chunk.content }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button @click="selectedTask = null" class="btn btn-secondary">
              关闭
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const { get, delete: del } = useApi()
const authStore = useAuthStore()

const isAdmin = computed(() => {
  return authStore.user?.roles.some(r => r.name === 'admin') ?? false
})

interface WritingTask {
  id: string
  query: string
  status: string
  createdAt: string
  style?: { id: string; name: string }
  prompt?: { id: string; name: string }
  outputs?: {
    content: string
    tokens?: number
    metadata?: {
      systemPrompt?: string
      userPrompt?: string
      promptContent?: string
      styleContent?: string
      retrievedChunks?: { index: number; content: string }[]
      userQuery?: string
      kbScope?: any
      generatedAt?: string
    }
  }[]
  kbScope?: any
  styleId?: string
  promptId?: string
}

const emit = defineEmits(['reuse-task', 'task-deleted'])

const tasks = ref<WritingTask[]>([])
const loading = ref(false)
const selectedTask = ref<WritingTask | null>(null)
const page = ref(1)
const pageSize = 10
const total = ref(0)
const expandedTaskIds = ref<string[]>([])

const totalPage = computed(() => Math.ceil(total.value / pageSize))

function toggleExpand(taskId: string) {
  const index = expandedTaskIds.value.indexOf(taskId)
  if (index === -1) {
    expandedTaskIds.value.push(taskId)
  } else {
    expandedTaskIds.value.splice(index, 1)
  }
}

async function loadTasks() {
  loading.value = true
  try {
    const res = await get<{ tasks: WritingTask[]; total: number }>(`/api/writing-tasks?limit=${pageSize}&offset=${(page.value - 1) * pageSize}`)
    tasks.value = res.tasks
    total.value = res.total
  } catch (error) {
    console.error('Failed to load tasks:', error)
  } finally {
    loading.value = false
  }
}

function changePage(newPage: number) {
  page.value = newPage
  loadTasks()
}

async function copyContent(content: string) {
  try {
    await navigator.clipboard.writeText(content)
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}

async function deleteTask(id: string) {
  if (!confirm('确定要删除这条记录吗？')) return

  const previousLoading = loading.value
  try {
    loading.value = true
    await del(`/api/writing-tasks/${id}`)

    if (tasks.value.length <= 1 && page.value > 1) {
      page.value--
    }

    await loadTasks()
    emit('task-deleted', id)
  } catch (error: any) {
    console.error('Failed to delete task:', error)
    alert(`删除失败: ${error.message || '未知错误'}`)
    loading.value = previousLoading
  }
}

function showDetail(task: WritingTask) {
  selectedTask.value = task
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
}

function formatFullDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  })
}

function getStatusText(status: string) {
  const map: Record<string, string> = {
    pending: '等待中',
    running: '生成中',
    succeeded: '已完成',
    failed: '失败',
  }
  return map[status] || status
}

defineExpose({
  loadTasks,
})

onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
