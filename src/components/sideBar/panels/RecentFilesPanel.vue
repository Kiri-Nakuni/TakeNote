<template>
  <div class="recent-files-panel">
    <div class="panel-header">
      <h4>最近のファイル</h4>
      <BaseButton 
        variant="ghost"
        size="small"
        icon="🗑️"
        title="履歴をクリア"
        @click="clearRecentFiles"
      />
    </div>

    <div class="recent-files-list">
      <div 
        v-if="loading" 
        class="loading"
      >
        読み込み中...
      </div>

      <div 
        v-else-if="recentFiles.length === 0" 
        class="no-files"
      >
        最近開いたファイルがありません
      </div>

      <div 
        v-else
        class="files-list"
      >
        <div 
          v-for="file in recentFiles" 
          :key="file.path"
          class="file-item"
          @click="openFile(file)"
        >
          <div class="file-info">
            <div class="file-name">
              📋 {{ file.name }}
            </div>
            <div class="file-meta">
              <span class="file-date">{{ formatDate(file.lastOpened) }}</span>
              <span class="file-path">{{ file.path }}</span>
            </div>
          </div>
          <BaseButton 
            variant="ghost"
            size="small"
            icon="✕"
            title="履歴から削除"
            @click.stop="removeFromRecent(file.path)"
          />
        </div>
      </div>
    </div>

    <div class="panel-footer">
      <BaseButton 
        variant="secondary"
        size="small"
        icon="🔄"
        @click="refreshRecentFiles"
      >
        更新
      </BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BaseButton from '@/components/common/buttons/BaseButton.vue';

interface RecentFile {
  path: string;
  name: string;
  lastOpened: Date;
  size: number;
}

interface WindowApi {
  config: {
    get: () => Promise<{
      recentFiles?: string[];
    }>;
    update: (updates: Record<string, unknown>) => Promise<unknown>;
  };
  file: {
    getInfo: (filePath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    exists: (filePath: string) => Promise<{ success: boolean; data?: boolean; error?: string }>;
  };
}

interface Emits {
  (e: 'open-file', filePath: string): void;
  (e: 'files-updated'): void;
}

const emit = defineEmits<Emits>();

const loading = ref(false);
const recentFiles = ref<RecentFile[]>([]);

onMounted(() => {
  loadRecentFiles();
});

async function loadRecentFiles(): Promise<void> {
  try {
    loading.value = true;
    
    // 設定から最近のファイル一覧を取得
    const windowApi = (window as unknown as { api: WindowApi }).api;
    const config = await windowApi.config.get();
    const recentFilePaths = config.recentFiles || [];
    
    // 各ファイルの詳細情報を取得
    const filePromises = recentFilePaths.map(async (filePath: string) => {
      try {
        // ファイル存在確認
        const existsResult = await windowApi.file.exists(filePath);
        if (!existsResult.success || !existsResult.data) {
          return null; // ファイルが存在しない場合はスキップ
        }

        // ファイル情報取得
        const infoResult = await windowApi.file.getInfo(filePath);
        if (!infoResult.success || !infoResult.data) {
          return null;
        }

        const fileInfo = infoResult.data as {
          name: string;
          size: number;
          modifiedAt: string;
        };

        return {
          path: filePath,
          name: fileInfo.name,
          lastOpened: new Date(fileInfo.modifiedAt),
          size: fileInfo.size
        };
      } catch (error) {
        console.error(`Failed to get info for file ${filePath}:`, error);
        return null;
      }
    });

    const results = await Promise.all(filePromises);
    recentFiles.value = results.filter(file => file !== null) as RecentFile[];
  } catch (error) {
    console.error('最近のファイル読み込みでエラーが発生しました:', error);
    // エラーの場合は空の配列を設定
    recentFiles.value = [];
  } finally {
    loading.value = false;
  }
}

async function refreshRecentFiles(): Promise<void> {
  await loadRecentFiles();
  emit('files-updated');
}

async function clearRecentFiles(): Promise<void> {
  if (!confirm('最近のファイル履歴をすべて削除しますか？')) {
    return;
  }

  try {
    const windowApi = (window as unknown as { api: WindowApi }).api;
    await windowApi.config.update({ recentFiles: [] });
    recentFiles.value = [];
    emit('files-updated');
  } catch (error) {
    console.error('履歴クリアでエラーが発生しました:', error);
    alert('履歴クリアでエラーが発生しました。');
  }
}

async function removeFromRecent(filePath: string): Promise<void> {
  try {
    const windowApi = (window as unknown as { api: WindowApi }).api;
    const config = await windowApi.config.get();
    const currentRecentFiles = config.recentFiles || [];
    const updatedRecentFiles = currentRecentFiles.filter(path => path !== filePath);
    
    await windowApi.config.update({ recentFiles: updatedRecentFiles });
    recentFiles.value = recentFiles.value.filter(file => file.path !== filePath);
    emit('files-updated');
  } catch (error) {
    console.error('履歴削除でエラーが発生しました:', error);
    alert('履歴削除でエラーが発生しました。');
  }
}

function openFile(file: RecentFile): void {
  emit('open-file', file.path);
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) {
    return 'たった今';
  } else if (minutes < 60) {
    return `${minutes}分前`;
  } else if (hours < 24) {
    return `${hours}時間前`;
  } else if (days < 7) {
    return `${days}日前`;
  } else {
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
</script>

<style lang="scss" scoped>
.recent-files-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--sidebar-bg);
  color: var(--text-color);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--header-bg);
  
  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-color);
  }
}

.clear-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  opacity: 0.7;
  transition: all 0.2s;
  color: var(--text-color);

  &:hover {
    opacity: 1;
    background: var(--hover-bg);
  }
}

.recent-files-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background-color: var(--sidebar-bg);
}

.loading,
.no-files {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 13px;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

  &:hover {
    background: var(--hover-bg);
  }
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 13px;
  color: var(--text-color);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-date {
  font-size: 11px;
  color: var(--text-muted);
}

.file-path {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.remove-btn {
  width: 20px;
  height: 20px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  opacity: 0;
  transition: all 0.2s;
  color: var(--text-muted);

  .file-item:hover & {
    opacity: 1;
  }

  &:hover {
    background: var(--danger-bg);
    color: var(--danger-color);
  }
}

.panel-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--border-color);
  background-color: var(--header-bg);
}

.refresh-btn {
  width: 100%;
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-color);
  transition: all 0.2s ease;

  &:hover {
    background: var(--hover-bg);
  }
}
</style>
