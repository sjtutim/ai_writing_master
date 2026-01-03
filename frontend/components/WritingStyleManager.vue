<template>
  <div class="space-y-6">
    <!-- Header with Add Button -->
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold text-gray-900">写作风格管理</h2>
      <button
        @click="openCreateModal"
        class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        新建风格
      </button>
    </div>

    <!-- Styles List -->
    <div class="bg-white shadow overflow-hidden sm:rounded-md">
      <ul role="list" class="divide-y divide-gray-200">
        <li v-for="style in styles" :key="style.id">
          <div class="block hover:bg-gray-50 px-4 py-4 sm:px-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center truncate">
                <p class="text-sm font-medium text-indigo-600 truncate">{{ style.name }}</p>
                <span
                  v-if="style.isPublic"
                  class="ml-2 flex-shrink-0 inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full"
                >
                  公开
                </span>
              </div>
              <div class="ml-2 flex flex-shrink-0 space-x-2">
                <button
                  @click="editStyle(style)"
                  class="text-gray-400 hover:text-indigo-600"
                  title="编辑"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="deleteStyle(style.id)"
                  class="text-gray-400 hover:text-red-600"
                  title="删除"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="mt-2">
              <p class="text-sm text-gray-500 line-clamp-2">{{ style.content }}</p>
            </div>
          </div>
        </li>
        <li v-if="styles.length === 0" class="px-4 py-8 text-center text-gray-500 text-sm">
          暂无写作风格，点击右上角新建
        </li>
      </ul>
    </div>

    <!-- Modal Form -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed z-50 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
        <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="showModal = false"></div>

          <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    {{ isEditing ? '编辑写作风格' : '新建写作风格' }}
                  </h3>
                  <div class="mt-4 space-y-4">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">风格名称</label>
                      <input
                        type="text"
                        v-model="form.name"
                        class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        placeholder="如：学术论文风格"
                      />
                    </div>
                    <div>
                      <label class="block text-sm font-medium text-gray-700 mb-1">风格范文/描述</label>
                      <textarea
                        v-model="form.content"
                        rows="12"
                        class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md font-mono"
                        placeholder="请粘贴一段具有代表性的范文，或者详细描述该风格的特点（如：语气、词汇偏好、句式结构等）..."
                      ></textarea>
                    </div>
                    <div class="flex items-center">
                      <input
                        id="isPublic"
                        type="checkbox"
                        v-model="form.isPublic"
                        class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label for="isPublic" class="ml-2 block text-sm text-gray-900">
                        设为公开
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                @click="saveStyle"
                :disabled="saving || !form.name || !form.content"
                class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {{ saving ? '保存中...' : '保存' }}
              </button>
              <button
                type="button"
                @click="showModal = false"
                class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
const { get, post, put, delete: del } = useApi()

interface WritingStyle {
  id: string
  name: string
  content: string
  isPublic: boolean
}

const emit = defineEmits(['style-selected'])

const styles = ref<WritingStyle[]>([])
const showModal = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  name: '',
  content: '',
  isPublic: false,
})

// 加载风格列表
async function loadStyles() {
  try {
    styles.value = await get<WritingStyle[]>('/writing-styles')
  } catch (error) {
    console.error('Failed to load styles:', error)
  }
}

// 打开创建模态框
function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  form.name = ''
  form.content = ''
  form.isPublic = false
  showModal.value = true
}

// 打开编辑模态框
function editStyle(style: WritingStyle) {
  isEditing.value = true
  editingId.value = style.id
  form.name = style.name
  form.content = style.content
  form.isPublic = style.isPublic
  showModal.value = true
}

// 保存风格
async function saveStyle() {
  if (!form.name || !form.content) return

  saving.value = true
  try {
    if (isEditing.value && editingId.value) {
      await put(`/writing-styles/${editingId.value}`, form)
    } else {
      await post('/writing-styles', form)
    }
    
    await loadStyles()
    showModal.value = false
    
    // 如果是新建，可能需要通知父组件选中（这里暂不处理，父组件会重载列表）
  } catch (error) {
    console.error('Failed to save style:', error)
    alert('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 删除风格
async function deleteStyle(id: string) {
  if (!confirm('确定要删除这个写作风格吗？')) return

  try {
    await del(`/api/writing-styles/${id}`)
    await loadStyles()
  } catch (error) {
    console.error('Failed to delete style:', error)
    alert('删除失败，请重试')
  }
}

onMounted(() => {
  loadStyles()
})
</script>
