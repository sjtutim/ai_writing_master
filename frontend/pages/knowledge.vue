<template>
  <div class="flex h-[calc(100vh-4rem)]">
    <div class="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div class="p-4 border-b border-gray-100">
        <button
          @click="showCollectionModal = true"
          class="btn btn-primary w-full"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          新建知识库
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-3">
        <div
          @click="selectedCollection = null"
          :class="[
            'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all mb-1',
            selectedCollection === null ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
          ]"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span class="flex-1 text-sm font-medium">所有文档</span>
            <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{{ totalDocumentCount }}</span>
        </div>

        <div class="mt-4">
          <div class="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">知识库分类</div>
          <div v-if="collections.length === 0" class="px-3 py-2 text-sm text-gray-400 italic">
            暂无分类
          </div>
          <div
            v-for="collection in collections"
            :key="collection.id"
            @click="selectedCollection = collection.id"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all group',
              selectedCollection === collection.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50 text-gray-700'
            ]"
          >
            <div
              class="w-3 h-3 rounded-full flex-shrink-0"
              :style="{ backgroundColor: collection.color }"
            ></div>
            <span class="flex-1 text-sm font-medium truncate">{{ collection.name }}</span>
            <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{{ collection._count?.documents || 0 }}</span>
            <div class="hidden group-hover:flex items-center gap-1">
              <button
                @click.stop="editCollection(collection)"
                class="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                title="编辑"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
              <button
                @click.stop="deleteCollection(collection.id)"
                class="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                title="删除"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-1 flex flex-col overflow-hidden">
      <div class="bg-white border-b border-gray-200 px-6 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-xl font-semibold text-gray-900">{{ selectedCollectionName }}</h1>
            <p class="text-sm text-gray-500 mt-0.5">共 {{ totalDocumentCount }} 个文档</p>
          </div>
          <div class="flex items-center gap-4 flex-1 justify-end">
            <div class="relative w-72">
              <svg class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                v-model="searchKeyword"
                @input="handleSearch"
                type="text"
                placeholder="搜索文档标题..."
                class="w-full h-10 pl-10 pr-10 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white hover:bg-gray-100"
              />
              <button
                v-if="searchKeyword"
                @click="clearSearch"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div class="flex gap-3 flex-shrink-0 ml-6">
            <button
              @click="showPaste = true"
              class="btn btn-secondary"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              粘贴文本
            </button>
            <button
              @click="showFolderUpload = true"
              class="btn btn-secondary"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              上传目录
            </button>
            <button
              @click="showUpload = true"
              class="btn btn-primary"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              上传文档
            </button>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div v-if="loading" class="flex items-center justify-center py-20">
          <div class="spinner w-8 h-8 border-2 border-gray-200 border-t-indigo-600"></div>
        </div>
        <div v-else-if="documents.length === 0" class="empty-state">
          <svg class="empty-state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="empty-state-title">暂无文档</p>
          <p class="empty-state-description">点击上传按钮添加文档到 {{ selectedCollectionName }}</p>
        </div>
        <div v-else>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
            <div
              v-for="doc in documents"
              :key="doc.id"
              class="card p-5 hover:border-indigo-200 transition-all group"
            >
              <div class="flex items-start justify-between mb-3">
                <h3 class="text-base font-medium text-gray-900 truncate flex-1 pr-2">{{ doc.title }}</h3>
                <span
                  :class="['badge text-xs', statusBadgeClass(doc.status)]"
                >
                  {{ statusText(doc.status) }}
                </span>
              </div>
              <div class="text-xs text-gray-500 space-y-1 mb-4">
                <div class="flex items-center gap-2 flex-wrap">
                  <svg class="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{{ formatDate(doc.createdAt) }}</span>
                  <span
                    v-if="getCollectionById(doc.collectionId)"
                    class="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                    :style="{
                      backgroundColor: getCollectionById(doc.collectionId)?.color + '20',
                      color: getCollectionById(doc.collectionId)?.color
                    }"
                  >
                    <span
                      class="w-2 h-2 rounded-full"
                      :style="{ backgroundColor: getCollectionById(doc.collectionId)?.color }"
                    ></span>
                    {{ getCollectionById(doc.collectionId)?.name }}
                  </span>
                </div>
                <div v-if="doc.versions?.[0]?.chunks?.length" class="flex items-center gap-2">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  {{ doc.versions[0].chunks.length }} 个分块
                </div>
              </div>
              <div class="flex flex-wrap gap-1 pt-3 border-t border-gray-100">
                <button
                  v-if="doc.status === 'failed'"
                  @click="reprocessDoc(doc.id)"
                  class="btn btn-ghost btn-sm"
                >
                  重试
                </button>
                <button
                  v-if="doc.versions?.[0]?.mdPath"
                  @click="previewMd(doc.id)"
                  class="btn btn-ghost btn-sm"
                >
                  预览
                </button>
                <button
                  v-if="doc.versions?.[0]?.rawPath"
                  @click="downloadRaw(doc.id)"
                  class="btn btn-ghost btn-sm"
                >
                  下载原文
                </button>
                <button
                  @click="viewDoc(doc.id)"
                  class="btn btn-ghost btn-sm"
                >
                  详情
                </button>
                <button
                  @click="deleteDoc(doc.id)"
                  class="btn btn-ghost btn-sm text-red-600 hover:bg-red-50 ml-auto"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
          <div v-if="totalPages > 1" class="flex items-center justify-center gap-2">
            <button
              @click="currentPage--"
              :disabled="currentPage === 1"
              class="btn btn-secondary btn-sm"
            >
              上一页
            </button>
            <span class="text-sm text-gray-600">
              第 {{ currentPage }} / {{ totalPages }} 页，共 {{ totalDocuments }} 个文档
            </span>
            <button
              @click="currentPage++"
              :disabled="currentPage === totalPages"
              class="btn btn-secondary btn-sm"
            >
              下一页
            </button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showCollectionModal" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click="closeCollectionModal">
        <div class="absolute inset-0 bg-gray-900/50 modal-backdrop" @click="closeCollectionModal"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-md w-full" @click.stop>
          <div class="px-6 py-4 border-b border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900">
              {{ editingCollection ? '编辑知识库' : '新建知识库' }}
            </h3>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="label">名称</label>
              <input
                v-model="collectionForm.name"
                type="text"
                placeholder="输入知识库名称"
                class="input"
              />
            </div>
            <div>
              <label class="label">描述（可选）</label>
              <textarea
                v-model="collectionForm.description"
                rows="3"
                placeholder="描述该知识库的用途"
                class="input"
              ></textarea>
            </div>
            <div>
              <label class="label">标识颜色</label>
              <div class="flex gap-2">
                <div
                  v-for="color in presetColors"
                  :key="color"
                  @click="collectionForm.color = color"
                  :class="[
                    'w-8 h-8 rounded-full cursor-pointer transition-all',
                    collectionForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                  ]"
                  :style="{ backgroundColor: color }"
                ></div>
              </div>
            </div>
          </div>
          <div v-if="collectionError" class="px-6 py-2 text-sm text-red-600">{{ collectionError }}</div>
          <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button @click="closeCollectionModal" class="btn btn-secondary">取消</button>
            <button
              @click="saveCollection"
              :disabled="!collectionForm.name || savingCollection"
              class="btn btn-primary"
            >
              {{ savingCollection ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showUpload" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click="closeUploadModal">
        <div class="absolute inset-0 bg-gray-900/50 modal-backdrop" @click="closeUploadModal"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-md w-full" @click.stop>
          <div class="px-6 py-4 border-b border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900">上传文档</h3>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="label">知识库</label>
              <select v-model="uploadCollectionId" class="input">
                <option :value="null">不分类</option>
                <option v-for="col in collections" :key="col.id" :value="col.id">
                  {{ col.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="label">文档标题（可选）</label>
              <input
                v-model="uploadTitle"
                type="text"
                placeholder="留空则使用文件名"
                class="input"
              />
            </div>
            <div>
              <label class="label">选择文件</label>
              <input
                ref="fileInput"
                type="file"
                accept=".docx,.doc,.txt,.md,.markdown,.pdf"
                @change="handleFileSelect"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p class="text-xs text-gray-500 mt-1">支持 .docx, .doc, .txt, .md, .pdf 格式，单个文件最大 50MB</p>
            </div>
          </div>
          <div v-if="uploadError" class="px-6 py-2 text-sm text-red-600">{{ uploadError }}</div>
          <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button @click="closeUploadModal" class="btn btn-secondary">取消</button>
            <button
              @click="handleUpload"
              :disabled="!selectedFile || uploading"
              class="btn btn-primary"
            >
              {{ uploading ? '上传中...' : '上传' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showPaste" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click="closePasteModal">
        <div class="absolute inset-0 bg-gray-900/50 modal-backdrop" @click="closePasteModal"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full" @click.stop>
          <div class="px-6 py-4 border-b border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900">粘贴文本</h3>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="label">知识库</label>
              <select v-model="pasteCollectionId" class="input">
                <option :value="null">不分类</option>
                <option v-for="col in collections" :key="col.id" :value="col.id">
                  {{ col.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="label">文档标题</label>
              <input
                v-model="pasteTitle"
                type="text"
                placeholder="输入文档标题"
                class="input"
              />
            </div>
            <div>
              <label class="label">文本内容</label>
              <textarea
                v-model="pasteContent"
                rows="10"
                placeholder="粘贴或输入文本内容..."
                class="input"
              ></textarea>
            </div>
          </div>
          <div v-if="pasteError" class="px-6 py-2 text-sm text-red-600">{{ pasteError }}</div>
          <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button @click="closePasteModal" class="btn btn-secondary">取消</button>
            <button
              @click="handlePaste"
              :disabled="!pasteContent || pasting"
              class="btn btn-primary"
            >
              {{ pasting ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="showFolderUpload" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click="closeFolderUploadModal">
        <div class="absolute inset-0 bg-gray-900/50 modal-backdrop" @click="closeFolderUploadModal"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full" @click.stop>
          <div class="px-6 py-4 border-b border-gray-100">
            <h3 class="text-lg font-semibold text-gray-900">上传目录</h3>
          </div>
          <div class="p-6 space-y-4">
            <div>
              <label class="label">知识库</label>
              <select v-model="folderUploadCollectionId" class="input">
                <option :value="null">不分类</option>
                <option v-for="col in collections" :key="col.id" :value="col.id">
                  {{ col.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="label">选择目录</label>
              <input
                ref="folderInput"
                type="file"
                webkitdirectory
                directory
                multiple
                @change="handleFolderSelect"
                class="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
              <p class="text-xs text-gray-500 mt-1">支持 .docx, .doc, .txt, .md, .pdf 格式，单个文件最大 50MB</p>
            </div>
            <div v-if="folderFiles.length > 0" class="bg-gray-50 rounded-lg p-4">
              <div class="text-sm font-medium text-gray-900 mb-2">
                已选择 {{ folderFiles.length }} 个文件
              </div>
              <div class="max-h-40 overflow-y-auto space-y-1">
                <div
                  v-for="(file, index) in folderFiles"
                  :key="index"
                  class="text-xs text-gray-600 flex items-center gap-2"
                >
                  <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {{ file.name }}
                </div>
              </div>
            </div>
            <div v-if="folderUploading" class="bg-blue-50 rounded-lg p-4">
              <div class="flex items-center justify-between text-sm mb-2">
                <span class="font-medium text-blue-900">上传进度</span>
                <span class="text-blue-700">{{ folderUploadProgress.uploaded + folderUploadProgress.failed }} / {{ folderUploadProgress.total }}</span>
              </div>
              <div class="w-full bg-blue-200 rounded-full h-2 mb-2">
                <div
                  class="bg-blue-600 h-2 rounded-full transition-all"
                  :style="{ width: `${(folderUploadProgress.uploaded + folderUploadProgress.failed) / folderUploadProgress.total * 100}%` }"
                ></div>
              </div>
              <div class="flex gap-4 text-xs text-blue-700">
                <span>成功: {{ folderUploadProgress.uploaded }}</span>
                <span v-if="folderUploadProgress.failed > 0" class="text-red-600">失败: {{ folderUploadProgress.failed }}</span>
              </div>
            </div>
          </div>
          <div v-if="folderUploadError" class="px-6 py-2 text-sm text-red-600">{{ folderUploadError }}</div>
          <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
            <button @click="closeFolderUploadModal" :disabled="folderUploading" class="btn btn-secondary">
              {{ folderUploading ? '上传中...' : '取消' }}
            </button>
            <button
              @click="handleFolderUpload"
              :disabled="folderFiles.length === 0 || folderUploading"
              class="btn btn-primary"
            >
              {{ folderUploading ? `上传中 (${folderUploadProgress.uploaded + folderUploadProgress.failed}/${folderUploadProgress.total})` : '开始上传' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="selectedDoc" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click="selectedDoc = null">
        <div class="absolute inset-0 bg-gray-900/50 modal-backdrop" @click="selectedDoc = null"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" @click.stop>
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">{{ selectedDoc.title }}</h3>
            <button @click="selectedDoc = null" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-6">
            <div class="flex items-center gap-4 mb-4">
              <span class="badge" :class="statusBadgeClass(selectedDoc.status)">{{ statusText(selectedDoc.status) }}</span>
              <span class="text-sm text-gray-500">{{ formatDate(selectedDoc.createdAt) }}</span>
            </div>
            <div v-if="selectedDoc.versions?.[0]?.chunks?.length" class="space-y-4">
              <h4 class="font-medium text-gray-900">文档分块 ({{ selectedDoc.versions[0].chunks.length }} 个)</h4>
              <div class="space-y-3">
                <div
                  v-for="chunk in selectedDoc.versions[0].chunks"
                  :key="chunk.id"
                  class="p-4 bg-gray-50 rounded-xl text-sm"
                >
                  <p class="text-xs text-gray-500 mb-2">分块 {{ chunk.chunkIndex + 1 }}</p>
                  <p class="text-gray-700 whitespace-pre-wrap">{{ chunk.content }}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button @click="selectedDoc = null" class="btn btn-secondary">关闭</button>
          </div>
        </div>
      </div>

      <div v-if="showPreview" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click="showPreview = false">
        <div class="absolute inset-0 bg-gray-900/50 modal-backdrop" @click="showPreview = false"></div>
        <div class="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col" @click.stop>
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900">{{ previewTitle }}</h3>
            <button @click="showPreview = false" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="flex-1 overflow-y-auto p-6">
            <div v-if="previewLoading" class="flex items-center justify-center py-20">
              <div class="spinner w-8 h-8 border-2 border-gray-200 border-t-indigo-600"></div>
            </div>
            <pre v-else class="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded-xl">{{ previewContent }}</pre>
          </div>
          <div class="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button @click="showPreview = false" class="btn btn-secondary">关闭</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: 'auth',
})

interface Collection {
  id: string
  name: string
  description?: string
  color?: string
  _count?: {
    documents: number
  }
}

interface Document {
  id: string
  title: string
  status: string
  collectionId?: string | null
  createdAt: string
  versions?: Array<{
    rawPath?: string | null
    mdPath?: string | null
    chunks?: Array<{
      id: string
      chunkIndex: number
      content: string
    }>
  }>
}

const authStore = useAuthStore()
const config = useRuntimeConfig()

const loading = ref(true)
const collections = ref<Collection[]>([])
const documents = ref<Document[]>([])
const totalDocuments = ref(0)
const totalPages = ref(1)
const currentPage = ref(1)
const pageSize = 12
const selectedCollection = ref<string | null>(null)
const selectedDoc = ref<Document | null>(null)

const showCollectionModal = ref(false)
const editingCollection = ref<Collection | null>(null)
const collectionForm = ref({
  name: '',
  description: '',
  color: '#3B82F6',
})
const savingCollection = ref(false)
const collectionError = ref('')

const presetColors = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
]

const showUpload = ref(false)
const selectedFile = ref<File | null>(null)
const uploadTitle = ref('')
const uploadCollectionId = ref<string | null>(null)
const uploading = ref(false)
const uploadError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const showPaste = ref(false)
const pasteTitle = ref('')
const pasteContent = ref('')
const pasteCollectionId = ref<string | null>(null)
const pasting = ref(false)
const pasteError = ref('')

const showFolderUpload = ref(false)
const folderFiles = ref<File[]>([])
const folderUploadCollectionId = ref<string | null>(null)
const folderUploading = ref(false)
const folderUploadError = ref('')
const folderUploadProgress = ref({ total: 0, uploaded: 0, failed: 0 })
const folderInput = ref<HTMLInputElement | null>(null)

const showPreview = ref(false)
const previewContent = ref('')
const previewTitle = ref('')
const previewLoading = ref(false)
const searchKeyword = ref('')
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const selectedCollectionName = computed(() => {
  if (selectedCollection.value === null) return '所有文档'
  const col = collections.value.find(c => c.id === selectedCollection.value)
  return col ? col.name : '所有文档'
})

const totalDocumentCount = computed(() => totalDocuments.value)

const statusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '等待',
    processing: '处理中',
    ready: '就绪',
    failed: '失败',
  }
  return map[status] || status
}

const statusBadgeClass = (status: string) => {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    ready: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  }
  return map[status] || 'bg-gray-100 text-gray-700'
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

const getCollectionById = (collectionId: string | null) => {
  if (!collectionId) return null
  return collections.value.find(c => c.id === collectionId)
}

const handleSearch = () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchDocuments()
  }, 300)
}

const clearSearch = () => {
  searchKeyword.value = ''
  currentPage.value = 1
  fetchDocuments()
}

async function fetchCollections() {
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/collections`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    if (response.ok) {
      collections.value = await response.json()
    }
  } catch (error) {
    console.error('Failed to fetch collections:', error)
  }
}

async function fetchDocuments() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      pageSize: pageSize.toString(),
    })
    if (searchKeyword.value.trim()) {
      params.append('keyword', searchKeyword.value.trim())
    } else if (selectedCollection.value !== null) {
      params.append('collectionId', selectedCollection.value)
    }
    const response = await fetch(`${config.public.apiBaseUrl}/documents?${params}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    if (response.ok) {
      const data = await response.json()
      documents.value = data.documents
      totalDocuments.value = data.total
      totalPages.value = data.totalPages
    }
  } catch (error) {
    console.error('Failed to fetch documents:', error)
  } finally {
    loading.value = false
  }
}

function editCollection(collection: Collection) {
  editingCollection.value = collection
  collectionForm.value = {
    name: collection.name,
    description: collection.description || '',
    color: collection.color || '#3B82F6',
  }
  showCollectionModal.value = true
}

function closeCollectionModal() {
  showCollectionModal.value = false
  editingCollection.value = null
  collectionForm.value = { name: '', description: '', color: '#3B82F6' }
  collectionError.value = ''
}

async function saveCollection() {
  if (!collectionForm.value.name) return

  savingCollection.value = true
  collectionError.value = ''

  try {
    const url = editingCollection.value
      ? `${config.public.apiBaseUrl}/collections/${editingCollection.value.id}`
      : `${config.public.apiBaseUrl}/collections`

    const response = await fetch(url, {
      method: editingCollection.value ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(collectionForm.value),
    })

    if (response.ok) {
      closeCollectionModal()
      fetchCollections()
    } else {
      const data = await response.json()
      collectionError.value = data.error || '保存失败'
    }
  } catch (error: any) {
    collectionError.value = error.message || '保存失败'
  } finally {
    savingCollection.value = false
  }
}

async function deleteCollection(id: string) {
  if (!confirm('确定要删除这个知识库吗？属于该知识库的文档将变为未分类状态。')) return

  try {
    const response = await fetch(`${config.public.apiBaseUrl}/collections/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    if (response.ok) {
      if (selectedCollection.value === id) {
        selectedCollection.value = null
      }
      fetchCollections()
      fetchDocuments()
    }
  } catch (error) {
    console.error('Failed to delete collection:', error)
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files[0]) {
    selectedFile.value = input.files[0]
    uploadError.value = ''
  }
}

function closeUploadModal() {
  showUpload.value = false
  selectedFile.value = null
  uploadTitle.value = ''
  uploadCollectionId.value = selectedCollection.value
  uploadError.value = ''
  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

async function handleUpload() {
  if (!selectedFile.value) return

  uploading.value = true
  uploadError.value = ''

  try {
    const formData = new FormData()
    formData.append('file', selectedFile.value)
    if (uploadTitle.value) {
      formData.append('title', uploadTitle.value)
    }
    if (uploadCollectionId.value) {
      formData.append('collectionId', uploadCollectionId.value)
    }

    const response = await fetch(`${config.public.apiBaseUrl}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
      body: formData,
    })

    if (response.ok) {
      closeUploadModal()
      currentPage.value = 1
      fetchDocuments()
      fetchCollections()
    } else {
      const data = await response.json()
      uploadError.value = data.error || '上传失败'
    }
  } catch (error: any) {
    uploadError.value = error.message || '上传失败'
  } finally {
    uploading.value = false
  }
}

function closePasteModal() {
  showPaste.value = false
  pasteTitle.value = ''
  pasteContent.value = ''
  pasteCollectionId.value = selectedCollection.value
  pasteError.value = ''
}

async function handlePaste() {
  if (!pasteContent.value) return

  pasting.value = true
  pasteError.value = ''

  try {
    const response = await fetch(`${config.public.apiBaseUrl}/documents/paste`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify({
        title: pasteTitle.value,
        content: pasteContent.value,
        collectionId: pasteCollectionId.value,
      }),
    })

    if (response.ok) {
      closePasteModal()
      currentPage.value = 1
      fetchDocuments()
      fetchCollections()
    } else {
      const data = await response.json()
      pasteError.value = data.error || '保存失败'
    }
  } catch (error: any) {
    pasteError.value = error.message || '保存失败'
  } finally {
    pasting.value = false
  }
}

function handleFolderSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    const allowedExtensions = ['.docx', '.doc', '.txt', '.md', '.markdown', '.pdf']
    const files = Array.from(input.files).filter(file => {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      return allowedExtensions.includes(ext)
    })
    folderFiles.value = files
    folderUploadError.value = ''
  }
}

function closeFolderUploadModal() {
  if (folderUploading.value) return
  showFolderUpload.value = false
  folderFiles.value = []
  folderUploadCollectionId.value = selectedCollection.value
  folderUploadError.value = ''
  folderUploadProgress.value = { total: 0, uploaded: 0, failed: 0 }
  if (folderInput.value) {
    folderInput.value.value = ''
  }
}

async function handleFolderUpload() {
  if (folderFiles.value.length === 0) return

  folderUploading.value = true
  folderUploadError.value = ''
  folderUploadProgress.value = {
    total: folderFiles.value.length,
    uploaded: 0,
    failed: 0,
  }

  for (const file of folderFiles.value) {
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (folderUploadCollectionId.value) {
        formData.append('collectionId', folderUploadCollectionId.value)
      }

      const response = await fetch(`${config.public.apiBaseUrl}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
        body: formData,
      })

      if (response.ok) {
        folderUploadProgress.value.uploaded++
      } else {
        folderUploadProgress.value.failed++
      }
    } catch (error) {
      folderUploadProgress.value.failed++
    }
  }

  folderUploading.value = false

  if (folderUploadProgress.value.failed === 0) {
    closeFolderUploadModal()
    fetchDocuments()
    fetchCollections()
  } else {
    folderUploadError.value = `上传完成，成功 ${folderUploadProgress.value.uploaded} 个，失败 ${folderUploadProgress.value.failed} 个`
    fetchDocuments()
    fetchCollections()
  }
}

async function viewDoc(id: string) {
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/documents/${id}`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    if (response.ok) {
      selectedDoc.value = await response.json()
    }
  } catch (error) {
    console.error('Failed to fetch document:', error)
  }
}

async function deleteDoc(id: string) {
  if (!confirm('确定要删除这个文档吗？相关的原始文件和 Markdown 文件也将被删除。')) return

  try {
    const response = await fetch(`${config.public.apiBaseUrl}/documents/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    if (response.ok) {
      const prevTotal = totalDocuments.value
      fetchDocuments()
      fetchCollections()
      if (documents.value.length === 0 && currentPage.value > 1 && prevTotal > (currentPage.value - 1) * pageSize) {
        currentPage.value--
      }
    }
  } catch (error) {
    console.error('Failed to delete document:', error)
  }
}

async function reprocessDoc(id: string) {
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/documents/${id}/reprocess`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    if (response.ok) {
      fetchDocuments()
    }
  } catch (error) {
    console.error('Failed to reprocess document:', error)
  }
}

async function downloadRaw(id: string) {
  try {
    const response = await fetch(`${config.public.apiBaseUrl}/documents/${id}/download/raw`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    if (response.ok) {
      const data = await response.json()
      window.open(data.url, '_blank')
    }
  } catch (error) {
    console.error('Failed to download raw file:', error)
  }
}

async function previewMd(id: string) {
  previewLoading.value = true
  showPreview.value = true
  previewContent.value = ''
  previewTitle.value = ''

  try {
    const response = await fetch(`${config.public.apiBaseUrl}/documents/${id}/preview/md`, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    if (response.ok) {
      const data = await response.json()
      previewTitle.value = data.title
      previewContent.value = data.content
    } else {
      previewContent.value = '加载失败'
    }
  } catch (error) {
    console.error('Failed to preview md:', error)
    previewContent.value = '加载失败'
  } finally {
    previewLoading.value = false
  }
}

let pollInterval: ReturnType<typeof setInterval> | null = null

watch(selectedCollection, () => {
  currentPage.value = 1
  fetchDocuments()
})

watch(currentPage, () => {
  fetchDocuments()
})

watch(showUpload, (newVal) => {
  if (newVal) {
    uploadCollectionId.value = selectedCollection.value
  }
})

watch(showPaste, (newVal) => {
  if (newVal) {
    pasteCollectionId.value = selectedCollection.value
  }
})

watch(showFolderUpload, (newVal) => {
  if (newVal) {
    folderUploadCollectionId.value = selectedCollection.value
  }
})

onMounted(() => {
  authStore.loadFromStorage()
  fetchCollections()
  fetchDocuments()

  pollInterval = setInterval(() => {
    const hasProcessing = documents.value.some(d => d.status === 'processing' || d.status === 'pending')
    if (hasProcessing) {
      fetchDocuments()
    }
  }, 5000)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>
