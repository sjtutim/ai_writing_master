<template>
  <div class="space-y-3">
    <div v-if="tasks.length > 0" class="relative">
      <input
        v-model="searchKeyword"
        type="text"
        placeholder="搜索历史记录..."
        class="input pl-9 pr-4 py-2 text-sm"
        @input="handleSearch"
      />
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <button
        v-if="searchKeyword"
        @click="clearSearch"
        class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <div v-if="loading && tasks.length === 0" class="text-center py-8">
      <div class="spinner w-6 h-6 mx-auto border-2 border-gray-200 border-t-indigo-600"></div>
      <p class="text-sm text-gray-500 mt-2">加载中...</p>
    </div>

    <TransitionGroup name="list" tag="ul" v-if="tasks.length > 0" class="space-y-3">
      <li
        v-for="task in tasks"
        :key="task.id"
        class="card p-4 hover:border-indigo-200 transition-all"
      >
        <div class="flex justify-between items-start gap-3">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-900 truncate">
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
          <div v-if="editingTaskId === task.id">
            <textarea
              v-model="editingContent"
              class="input w-full min-h-[120px] text-sm"
              placeholder="编辑内容..."
            ></textarea>
            <div class="flex items-center gap-2 mt-2">
              <button
                @click="saveEdit(task.id, task.outputs?.[0]?.id)"
                :disabled="savingId === task.id"
                class="btn btn-primary btn-sm"
              >
                {{ savingId === task.id ? '保存中...' : '保存' }}
              </button>
              <button
                @click="cancelEdit"
                :disabled="savingId === task.id"
                class="btn btn-secondary btn-sm"
              >
                取消
              </button>
            </div>
          </div>
          <div v-else>
            <div
              class="text-sm text-gray-600 whitespace-pre-wrap"
              :class="{ 'line-clamp-2': !expandedTaskIds.includes(task.id) }"
              @click.stop="toggleExpand(task.id)"
            >
              {{ task.outputs?.[0]?.content || '暂无内容' }}
            </div>
            <div v-if="task.outputs?.[0]?.content && task.outputs[0].content.length > 100" class="mt-2 flex items-center gap-2">
              <button
                @click.stop="toggleExpand(task.id)"
                class="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
              >
                {{ expandedTaskIds.includes(task.id) ? '收起' : '查看全部' }}
              </button>
              <button
                @click.stop="startEdit(task)"
                class="text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑
              </button>
              <button
                @click.stop="copyContent(task.outputs[0].content, task.id)"
                class="text-xs px-2 py-1 rounded transition-colors flex items-center gap-1"
                :class="copySuccessId === task.id ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'"
              >
                <svg v-if="copySuccessId !== task.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ copySuccessId === task.id ? '已复制' : '复制' }}
              </button>
            </div>
            <div v-else-if="task.outputs?.[0]?.content" class="mt-2 flex items-center gap-2">
              <button
                @click.stop="startEdit(task)"
                class="text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                编辑
              </button>
              <button
                @click.stop="copyContent(task.outputs[0].content, task.id)"
                class="text-xs px-2 py-1 rounded transition-colors flex items-center gap-1"
                :class="copySuccessId === task.id ? 'bg-green-100 text-green-700' : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'"
              >
                <svg v-if="copySuccessId !== task.id" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                {{ copySuccessId === task.id ? '已复制' : '复制' }}
              </button>
            </div>
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
                <div v-if="selectedTask.prompt?.name"><span class="text-gray-500">使用模板：</span>{{ selectedTask.prompt.name }}</div>
                <div v-if="selectedTask.style?.name"><span class="text-gray-500">使用风格：</span>{{ selectedTask.style.name }}</div>
              </div>
            </div>

            <div class="border border-gray-200 rounded-xl p-4">
              <h4 class="text-sm font-medium text-gray-700 mb-2">写作要求</h4>
              <p class="text-sm text-gray-900 whitespace-pre-wrap">{{ selectedTask.query }}</p>
            </div>

            <!-- 模板内容 -->
            <div v-if="selectedTask.outputs?.[0]?.metadata?.promptContent" class="border border-purple-200 rounded-xl p-4 bg-purple-50/50">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-purple-700">提示词模板内容</h4>
                <button
                  @click="toggleDetailExpand('prompt')"
                  class="text-xs text-purple-600 hover:text-purple-800"
                >
                  {{ detailExpandState.prompt ? '收起' : '展开' }}
                </button>
              </div>
              <p
                class="text-sm text-gray-700 whitespace-pre-wrap"
                :class="{ 'line-clamp-3': !detailExpandState.prompt }"
              >{{ selectedTask.outputs[0].metadata.promptContent }}</p>
            </div>

            <!-- 风格范文 -->
            <div v-if="selectedTask.outputs?.[0]?.metadata?.styleContent" class="border border-green-200 rounded-xl p-4 bg-green-50/50">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-green-700">写作风格范文</h4>
                <button
                  @click="toggleDetailExpand('style')"
                  class="text-xs text-green-600 hover:text-green-800"
                >
                  {{ detailExpandState.style ? '收起' : '展开' }}
                </button>
              </div>
              <p
                class="text-sm text-gray-700 whitespace-pre-wrap"
                :class="{ 'line-clamp-3': !detailExpandState.style }"
              >{{ selectedTask.outputs[0].metadata.styleContent }}</p>
            </div>

            <div v-if="selectedTask.outputs?.[0]?.content" class="border border-gray-200 rounded-xl p-4">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-sm font-medium text-gray-700">生成内容</h4>
                <span class="text-xs text-gray-500">{{ selectedTask.outputs[0].content.length }} 字</span>
              </div>
              <p class="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{{ selectedTask.outputs[0].content }}</p>
            </div>

            <div v-if="selectedTask.outputs?.[0]?.metadata?.retrievedChunks?.length" class="border border-gray-200 rounded-xl p-4">
              <h4 class="text-sm font-medium text-gray-700 mb-3">参考知识库内容 ({{ selectedTask.outputs[0]?.metadata?.retrievedChunks?.length }} 条)</h4>
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

const { get, put, delete: del } = useApi()
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
    id: string
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
const detailExpandState = ref<{ prompt: boolean; style: boolean }>({ prompt: false, style: false })
const searchKeyword = ref('')
const copySuccessId = ref<string | null>(null)
const editingTaskId = ref<string | null>(null)
const editingContent = ref('')
const savingId = ref<string | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const totalPage = computed(() => Math.ceil(total.value / pageSize))

function toggleDetailExpand(type: 'prompt' | 'style') {
  detailExpandState.value[type] = !detailExpandState.value[type]
}

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
    const params = new URLSearchParams({
      limit: pageSize.toString(),
      offset: ((page.value - 1) * pageSize).toString(),
    })
    if (searchKeyword.value.trim()) {
      params.append('keyword', searchKeyword.value.trim())
    }
    const res = await get<{ tasks: WritingTask[]; total: number }>(`/writing-tasks?${params}`)
    tasks.value = res.tasks
    total.value = res.total
  } catch (error) {
    console.error('Failed to load tasks:', error)
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    page.value = 1
    loadTasks()
  }, 300)
}

function clearSearch() {
  searchKeyword.value = ''
  page.value = 1
  loadTasks()
}

function changePage(newPage: number) {
  page.value = newPage
  loadTasks()
}

async function copyContent(content: string, taskId: string) {
  try {
    await navigator.clipboard.writeText(content)
    copySuccessId.value = taskId
    setTimeout(() => {
      copySuccessId.value = null
    }, 2000)
  } catch (error) {
    console.error('Failed to copy:', error)
    alert('复制失败，请重试')
  }
}

function startEdit(task: WritingTask) {
  editingTaskId.value = task.id
  editingContent.value = task.outputs?.[0]?.content || ''
  if (!expandedTaskIds.value.includes(task.id)) {
    expandedTaskIds.value.push(task.id)
  }
}

function cancelEdit() {
  editingTaskId.value = null
  editingContent.value = ''
}

async function saveEdit(taskId: string, outputId: string) {
  savingId.value = taskId
  try {
    await put(`/writing-tasks/outputs/${outputId}`, { content: editingContent.value })
    editingTaskId.value = null
    await loadTasks()
  } catch (error) {
    console.error('Failed to save:', error)
    alert('保存失败，请重试')
  } finally {
    savingId.value = null
  }
}

async function deleteTask(id: string) {
  if (!confirm('确定要删除这条记录吗？')) return

  const previousLoading = loading.value
  try {
    loading.value = true
    await del(`/writing-tasks/${id}`)

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
