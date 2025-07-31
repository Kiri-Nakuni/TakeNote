<template>
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>{{ getUIString('sidebar.title') }}</h3>
      <div class="sidebar-controls">
        <button 
          class="control-btn"
          :class="{ active: activePanel === 'files' }"
          :title="getUIString('sidebar.panels.files')"
          @click="togglePanel('files')"
        >
          📁
        </button>
        <button 
          class="control-btn"
          :class="{ active: activePanel === 'search' }"
          :title="getUIString('sidebar.panels.search')"
          @click="togglePanel('search')"
        >
          🔍
        </button>
        <button 
          class="control-btn"
          :class="{ active: activePanel === 'recent' }"
          :title="getUIString('sidebar.panels.recent')"
          @click="togglePanel('recent')"
        >
          🕒
        </button>
        <button 
          class="control-btn"
          :class="{ active: activePanel === 'settings' }"
          :title="getUIString('sidebar.panels.settings')"
          @click="togglePanel('settings')"
        >
          ⚙️
        </button>
      </div>
    </div>

    <div class="sidebar-content">
      <!-- ファイルツリーパネル -->
      <FileTreePanel 
        v-if="activePanel === 'files'"
        @file-selected="handleFileSelected"
        @file-created="handleFileCreated"
        @file-opened="handleFileOpened"
      />

      <!-- 検索パネル -->
      <SearchPanel 
        v-if="activePanel === 'search'"
        @search-result="handleSearchResult"
      />

      <!-- 最近使用したファイルパネル -->
      <RecentFilesPanel 
        v-if="activePanel === 'recent'"
        @file-selected="handleFileSelected"
      />

      <!-- 設定パネル -->
      <SettingsPanel 
        v-if="activePanel === 'settings'"
        @settings-changed="handleSettingsChanged"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import FileTreePanel from './panels/FileTreePanel.vue';
import SearchPanel from './panels/SearchPanel.vue';
import RecentFilesPanel from './panels/RecentFilesPanel.vue';
import SettingsPanel from './panels/SettingsPanel.vue';
import { getUIString } from '@/composables/useUIStrings';

// 型定義
interface SearchResult {
  filePath: string;
  fileName: string;
  lineNumber: number;
  content: string;
  matchPosition: {
    start: number;
    end: number;
  };
}

interface Emits {
  (e: 'file-selected', filePath: string): void;
  (e: 'file-created', filePath: string): void;
  (e: 'file-opened', filePath: string, content: string, tanMode?: string): void;
  (e: 'search-result', result: SearchResult): void;
  (e: 'settings-changed', settings: Record<string, unknown>): void;
}

const emit = defineEmits<Emits>();

const activePanel = ref<'files' | 'search' | 'recent' | 'settings'>('files');

function togglePanel(panel: 'files' | 'search' | 'recent' | 'settings'): void {
  activePanel.value = panel;
}

function handleFileSelected(filePath: string): void {
  emit('file-selected', filePath);
}

function handleFileCreated(filePath: string): void {
  emit('file-created', filePath);
}

function handleFileOpened(filePath: string, content: string, tanMode?: string): void {
  emit('file-opened', filePath, content, tanMode);
}

function handleSearchResult(result: SearchResult): void {
  emit('search-result', result);
}

function handleSettingsChanged(settings: Record<string, unknown>): void {
  emit('settings-changed', settings);
}
</script>

<style lang="scss" scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 300px;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  color: var(--text-color);
}

.sidebar-header {
  padding: 12px 16px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    font-size: 14px;
    color: var(--text-color);
    font-weight: 600;
  }
}

.sidebar-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  color: var(--text-muted);

  &:hover {
    background: var(--hover-bg);
    color: var(--text-color);
  }

  &.active {
    background: var(--primary-color);
    color: white;
  }

  &:active {
    transform: translateY(1px);
  }
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
}
</style>
