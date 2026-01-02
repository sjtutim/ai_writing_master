<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-xl font-bold text-gray-900">提示词模板管理</h2>
      <button
        @click="openCreateModal"
        class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        新建模板
      </button>
    </div>

    <div class="bg-white shadow overflow-hidden sm:rounded-md">
      <ul role="list" class="divide-y divide-gray-200">
        <li v-for="template in templates" :key="template.id">
          <div class="block hover:bg-gray-50 px-4 py-4 sm:px-6">
            <div class="flex items-center justify-between">
              <div class="flex items-center truncate">
                <p class="text-sm font-medium text-indigo-600 truncate">{{ template.name }}</p>
                <span
                  v-if="template.category"
                  class="ml-2 flex-shrink-0 inline-block px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full"
                >
                  {{ template.category }}
                </span>
                <span
                  v-if="template.isPublic"
                  class="ml-2 flex-shrink-0 inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full"
                >
                  公开
                </span>
              </div>
              <div class="ml-2 flex flex-shrink-0 space-x-2">
                <button
                  @click="useTemplate(template)"
                  class="text-gray-400 hover:text-green-600"
                  title="使用"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button
                  @click="editTemplate(template)"
                  class="text-gray-400 hover:text-indigo-600"
                  title="编辑"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  @click="deleteTemplate(template.id)"
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
              <p class="text-sm text-gray-500 line-clamp-3">{{ template.content }}</p>
            </div>
          </div>
        </li>
        <li v-if="templates.length === 0" class="px-4 py-8 text-center text-gray-500 text-sm">
          暂无提示词模板，点击右上角新建
        </li>
      </ul>
    </div>

    <div v-if="showModal" class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" @click="showModal = false"></div>

        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {{ isEditing ? '编辑提示词模板' : '新建提示词模板' }}
                </h3>
                <div class="mt-4 space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">模板名称</label>
                    <input
                      type="text"
                      v-model="form.name"
                      class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="如：技术文档写作模板"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">分类</label>
                    <input
                      type="text"
                      v-model="form.category"
                      class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="如：技术写作、医学写作（可选）"
                    />
                  </div>
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">提示词内容</label>
                    <textarea
                      v-model="form.content"
                      rows="8"
                      class="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      placeholder="请输入提示词模板内容，支持变量替换：&#10;- {query}：用户输入的写作主题&#10;- {context}：检索到的参考内容&#10;- {style}：选择的写作风格内容"
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
              @click="saveTemplate"
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
  </div>
</template>

<script setup lang="ts">
const { get, post, put, delete: del } = useApi()

interface PromptTemplate {
  id: string
  name: string
  content: string
  category?: string | null
  isPublic: boolean
}

const emit = defineEmits(['template-selected'])

const templates = ref<PromptTemplate[]>([])
const showModal = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

const form = reactive({
  name: '',
  content: '',
  category: '',
  isPublic: false,
})

async function loadTemplates() {
  try {
    templates.value = await get<PromptTemplate[]>('/api/prompt-templates')
  } catch (error) {
    console.error('Failed to load templates:', error)
  }
}

function openCreateModal() {
  isEditing.value = false
  editingId.value = null
  form.name = ''
  form.content = ''
  form.category = ''
  form.isPublic = false
  showModal.value = true
}

function editTemplate(template: PromptTemplate) {
  isEditing.value = true
  editingId.value = template.id
  form.name = template.name
  form.content = template.content
  form.category = template.category || ''
  form.isPublic = template.isPublic
  showModal.value = true
}

function useTemplate(template: PromptTemplate) {
  emit('template-selected', template)
}

async function saveTemplate() {
  if (!form.name || !form.content) return

  saving.value = true
  try {
    if (isEditing.value && editingId.value) {
      await put(`/api/prompt-templates/${editingId.value}`, form)
    } else {
      await post('/api/prompt-templates', form)
    }

    await loadTemplates()
    showModal.value = false
  } catch (error) {
    console.error('Failed to save template:', error)
    alert('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

async function deleteTemplate(id: string) {
  if (!confirm('确定要删除这个提示词模板吗？')) return

  try {
    await del(`/api/prompt-templates/${id}`)
    await loadTemplates()
  } catch (error) {
    console.error('Failed to delete template:', error)
    alert('删除失败，请重试')
  }
}

onMounted(() => {
  loadTemplates()
})
</script>
