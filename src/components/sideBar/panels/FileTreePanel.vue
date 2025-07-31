<template>
  <div class="file-tree-panel">
    <div class="panel-header">
      <h4>{{ getUIString('sidebar.panels.files') }}</h4>
      <div class="panel-actions">
        <BaseButton 
          variant="ghost"
          size="small"
          icon="📄"
          :title="getUIString('sidebar.fileTree.buttons.newFile')"
          @click="showNewFileModal"
        />
        <BaseButton 
          variant="ghost"
          size="small"
          icon="📁"
          :title="getUIString('sidebar.fileTree.buttons.newFolder')"
          @click="showNewFolderModal"
        />
        <BaseButton 
          variant="ghost"
          size="small"
          icon="📂"
          :title="getUIString('sidebar.fileTree.buttons.openFolder')"
          @click="openFolder"
        />
        <BaseButton 
          variant="ghost"
          size="small"
          icon="🔄"
          :title="getUIString('sidebar.fileTree.buttons.refresh')"
          @click="refreshFileList"
        />
      </div>
    </div>

    <div class="file-list-container">
      <div 
        v-if="loading" 
        class="loading"
      >
        {{ getUIString('sidebar.fileTree.loading') }}
      </div>
        
      <div 
        v-else-if="files.length === 0" 
        class="empty-state"
      >
        <p>{{ getUIString('sidebar.fileTree.empty') }}</p>
        <BaseButton 
          variant="primary"
          @click="showNewFileModal"
        >
          最初のファイルを作成
        </BaseButton>
      </div>

      <div 
        v-else 
        class="file-list"
      >
        <div 
          v-for="file in files" 
          :key="file.path"
          class="file-item"
          :class="{ 
            'selected': selectedFile?.path === file.path,
            'folder-selected': selectedFolder?.path === file.path,
            'is-folder': file.isDirectory,
            'expanded': file.isDirectory && expandedFolders.has(file.path)
          }"
          :style="{ paddingLeft: `${(file.depth || 0) * 16 + 8}px` }"
          @click="selectFile(file)"
          @dblclick="handleFileDoubleClick(file)"
        >
          <div class="file-info">
            <div class="file-icon">
              <span v-if="file.isDirectory">
                {{ expandedFolders.has(file.path) ? '📂' : '📁' }}
              </span>
              <span v-else>
                {{ getFileIcon(file.name) }}
              </span>
            </div>
            <div class="file-details">
              <div class="file-name">
                {{ file.name }}
              </div>
              <div
                v-if="!file.isDirectory"
                class="file-meta"
              >
                {{ formatFileSize(file.size) }} • {{ formatDate(file.modifiedAt) }}
              </div>
              <div
                v-else
                class="file-meta"
              >
                フォルダ • {{ formatDate(file.modifiedAt) }}
              </div>
            </div>
          </div>
          <div class="file-actions">
            <BaseButton 
              variant="ghost"
              size="small"
              icon="🗑️"
              title="削除"
              @click.stop="deleteFile(file.path)"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 新しいファイル作成モーダル -->
    <NewFileModal
      :is-visible="showModal"
      :selected-folder-path="selectedFolder?.path || undefined"
      @close="handleModalClose"
      @file-created="handleFileCreated"
    />
    
    <!-- 新しいフォルダ作成モーダル -->
    <NewFolderModal
      :is-visible="showFolderModal"
      @close="handleFolderModalClose"
      @folder-created="handleFolderCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import BaseButton from '@/components/common/buttons/BaseButton.vue';
import NewFileModal from '@/components/common/modals/NewFileModal.vue';
import NewFolderModal from '@/components/common/modals/NewFolderModal.vue';
import { getUIString } from '@/composables/useUIStrings';

// 型定義
interface TanFile {
  mainFile?: {
    content: string;
  };
  mode?: string;
}

// Window API の型定義
declare global {
  interface Window {
    api: {
      file: {
        listNotesDirectory: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
        listFolderContents: (folderPath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
        create: (filePath: string, content?: string) => Promise<{ success: boolean; data?: string; error?: string }>;
        createInFolder: (folderPath: string, fileName: string, content?: string) => Promise<{ success: boolean; data?: string; error?: string }>;
        createFolder: (folderName: string) => Promise<{ success: boolean; data?: string; error?: string }>;
        delete: (filePath: string) => Promise<{ success: boolean; error?: string }>;
        showSaveDialog: (defaultName?: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
        showOpenDialog: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
        read: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
      };
      tan: {
        read: (filePath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
      };
    };
  }
}

interface FileItem {
  path: string;
  name: string;
  size: number;
  modifiedAt: Date | string;
  isDirectory: boolean;
  depth?: number; // 階層の深さ
  parentPath?: string; // 親フォルダのパス
}

interface Emits {
  (e: 'file-selected', filePath: string): void;
  (e: 'file-created', filePath: string): void;
  (e: 'file-opened', filePath: string, content: string, tanMode?: string): void;
}

const emit = defineEmits<Emits>();

const files = ref<FileItem[]>([]);
const loading = ref(false);
const showModal = ref(false);
const showFolderModal = ref(false);
const selectedFile = ref<FileItem | null>(null);
const selectedFolder = ref<FileItem | null>(null);
const expandedFolders = ref<Set<string>>(new Set());
const folderContents = ref<Map<string, FileItem[]>>(new Map());

onMounted(() => {
  loadFileList();
  
  // Escキーのイベントリスナーを追加
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  // イベントリスナーを削除
  document.removeEventListener('keydown', handleKeyDown);
});

// キーボードイベントハンドラ
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && selectedFolder.value) {
    selectedFolder.value = null;
  }
}

// フォルダ機能
function showNewFolderModal(): void {
  // IME問題対策：モーダル表示前にフォーカスを外す
  if (document.activeElement && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  // 少し遅延させてモーダルを表示
  setTimeout(() => {
    showFolderModal.value = true;
  }, 50);
}

// フォルダの内容を読み込んで表示に追加
async function loadFolderContents(folder: FileItem): Promise<void> {
  try {
    console.log('Loading folder contents for:', folder.path);
    console.log('window.api.file:', window.api.file);
    
    const result = await window.api.file.listFolderContents(folder.path);
    console.log('Folder contents result:', result);
    
    if (!result.success) {
      console.error('フォルダの内容の読み込みに失敗しました:', result.error);
      return;
    }
    
    const folderChildren = result.data as unknown[];
    
    // 現在のフォルダの位置を見つける
    const folderIndex = files.value.findIndex(f => f.path === folder.path);
    if (folderIndex === -1) return;
    
    // 子要素にdepthとparentPathを設定
    const childItems: FileItem[] = folderChildren.map((child: unknown) => ({
      ...(child as FileItem),
      depth: (folder.depth || 0) + 1,
      parentPath: folder.path
    }));
    
    // フォルダの直後に子要素を挿入
    files.value.splice(folderIndex + 1, 0, ...childItems);
    
    // folderContentsマップに保存
    folderContents.value.set(folder.path, childItems);
  } catch (error) {
    console.error('フォルダの内容の読み込みに失敗しました:', error);
  }
}

// フォルダの子要素を表示から削除
function removeChildrenFromDisplay(folderPath: string): void {
  const children = folderContents.value.get(folderPath);
  if (!children) return;
  
  // 子要素とその子要素も再帰的に削除
  children.forEach(child => {
    if (child.isDirectory && expandedFolders.value.has(child.path)) {
      removeChildrenFromDisplay(child.path);
      expandedFolders.value.delete(child.path);
    }
  });
  
  // files配列から子要素を削除
  files.value = files.value.filter(file => !children.some(child => child.path === file.path));
  
  // folderContentsマップからも削除
  folderContents.value.delete(folderPath);
}

function handleFileDoubleClick(file: FileItem): void {
  if (file.isDirectory) {
    // フォルダの場合：展開状態を切り替えて選択状態にする
    if (expandedFolders.value.has(file.path)) {
      // 折りたたみ
      expandedFolders.value.delete(file.path);
      removeChildrenFromDisplay(file.path);
    } else {
      // 展開
      expandedFolders.value.add(file.path);
      loadFolderContents(file);
    }
    selectedFolder.value = file;
  } else {
    // ファイルの場合：開く
    openFile(file);
  }
}

function selectFile(file: FileItem): void {
  if (file.isDirectory) {
    // フォルダを選択
    selectedFolder.value = file;
    selectedFile.value = null;
  } else {
    // ファイルを選択
    selectedFile.value = file;
    selectedFolder.value = null;
    emit('file-selected', file.path);
  }
}

// モーダル関連の関数
function showNewFileModal(): void {
  // IME問題対策：モーダル表示前にフォーカスを外す
  if (document.activeElement && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  // 少し遅延させてモーダルを表示
  setTimeout(() => {
    showModal.value = true;
  }, 50);
}

function handleModalClose(): void {
  showModal.value = false;
}

function handleFolderModalClose(): void {
  showFolderModal.value = false;
}

async function handleFileCreated(filePath: string): Promise<void> {
  showModal.value = false;
  emit('file-created', filePath);
  await loadFileList();
}

async function handleFolderCreated(): Promise<void> {
  showFolderModal.value = false;
  await loadFileList();
}

async function loadFileList(): Promise<void> {
  try {
    loading.value = true;
    
    // 実際のAPI呼び出しでNotesディレクトリのファイル一覧を取得
    const result = await window.api.file.listNotesDirectory();
    
    if (result.success && result.data) {
      files.value = (result.data as FileItem[]).map(file => ({
        ...file,
        modifiedAt: new Date(file.modifiedAt)
      }));
    } else {
      console.error('Failed to load file list:', result.error);
      files.value = [];
    }
  } catch (error) {
    console.error('ファイル一覧の読み込みでエラーが発生しました:', error);
    files.value = [];
  } finally {
    loading.value = false;
  }
}

async function deleteFile(filePath: string): Promise<void> {
  if (!confirm('このファイルを削除しますか？')) {
    return;
  }

  try {
    const result = await window.api.file.delete(filePath);
    
    if (result.success) {
      console.log('ファイルを削除しました:', filePath);
      
      // ファイル一覧を更新
      await loadFileList();
    } else {
      console.error('ファイル削除に失敗しました:', result.error);
      alert(`ファイル削除に失敗しました: ${result.error}`);
    }
  } catch (error) {
    console.error('ファイル削除でエラーが発生しました:', error);
    alert('ファイル削除でエラーが発生しました。');
  }
}

async function openFolder(): Promise<void> {
  try {
    // ファイル選択ダイアログを表示
    const result = await window.api.file.showOpenDialog();
    
    if (result.success && result.data && !(result.data as { canceled: boolean }).canceled) {
      const filePaths = (result.data as { filePaths: string[] }).filePaths;
      
      if (filePaths && filePaths.length > 0) {
        // 選択されたファイルを開く
        emit('file-selected', filePaths[0]);
      }
    }
  } catch (error) {
    console.error('ファイルを開く際にエラーが発生しました:', error);
    alert('ファイルを開く際にエラーが発生しました。');
  }
}

async function refreshFileList(): Promise<void> {
  await loadFileList();
}

async function openFile(file: FileItem): Promise<void> {
  try {
    // TANファイルかどうかチェック
    if (file.name.endsWith('.tan')) {
      const result = await window.api.tan.read(file.path);
      if (result.success && result.data) {
        const tanFile = result.data as TanFile;
        emit('file-opened', file.path, tanFile.mainFile?.content || '', tanFile.mode);
      } else {
        console.error('TANファイルの読み込みに失敗:', result.error);
        alert(`ファイルの読み込みに失敗しました: ${result.error}`);
      }
    } else {
      // 通常のファイル読み込み
      const result = await window.api.file.read(file.path);
      if (result.success && result.data) {
        emit('file-opened', file.path, result.data as string);
      } else {
        console.error('ファイルの読み込みに失敗:', result.error);
        alert(`ファイルの読み込みに失敗しました: ${result.error}`);
      }
    }
  } catch (error) {
    console.error('ファイル読み込みエラー:', error);
    alert('ファイル読み込み中にエラーが発生しました');
  }
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    'md': '📝',
    'txt': '📄',
    'tan': '📋',
    'js': '📄',
    'ts': '📘',
    'vue': '💚',
    'json': '📋',
    'css': '🎨',
    'html': '🌐'
  };
  return iconMap[ext || ''] || '📄';
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  
  return dateObj.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
</script>

<style lang="scss" scoped>
.file-tree-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--sidebar-bg);
  color: var(--text-color);
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--header-bg);
  
  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-color);
  }
}

.panel-actions {
  display: flex;
  gap: 4px;
}

.file-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background-color: var(--sidebar-bg);
}

.loading {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  
  p {
    margin-bottom: 16px;
    font-size: 13px;
  }
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-color);
  border: 1px solid transparent;
  
  &:hover {
    background: var(--hover-bg);
    
    .file-actions {
      opacity: 1;
    }
  }
  
  &.selected {
    background: var(--accent-bg);
    border: 1px solid var(--accent-border);
    color: var(--accent-text);
  }
  
  &.folder-selected {
    background: var(--accent-bg-alt);
    border: 1px solid var(--accent-border-alt);
    color: var(--accent-text);
  }
  
  &.is-folder {
    font-weight: 500;
    
    .file-icon {
      font-size: 18px;
    }
  }
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.file-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.file-details {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  color: var(--text-color);
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  gap: 4px;
}

.file-actions {
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}

/* 階層表示のスタイル */
.file-item.expanded {
  background-color: var(--hover-bg);
}

.file-item .file-icon {
  transition: transform 0.2s ease;
}

/* 子要素の視覚的区別 */
.file-item[style*="padding-left"] {
  border-left: 1px solid var(--border-color);
  margin-left: 8px;
}
</style>