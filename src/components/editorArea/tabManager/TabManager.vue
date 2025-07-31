<template>
  <div class="tab-manager">
    <div class="tab-list">
      <div
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{ active: tab.id === activeTabId, modified: tab.isModified }"
        @click="selectTab(tab.id)"
        @contextmenu.prevent="showContextMenu(tab.id, $event)"
      >
        <span class="tab-icon">{{ getFileIcon(tab.fileName) }}</span>
        <span class="tab-name">{{ tab.displayName }}</span>
        <span
          v-if="tab.isModified"
          class="modified-dot"
        >●</span>
        <button
          class="tab-close"
          @click.stop="closeTab(tab.id)"
        >
          ×
        </button>
      </div>
      
      <!-- 新しいタブボタン -->
      <button
        title="新しいファイル"
        class="new-tab-button"
        @click="createNewTab"
      >
        +
      </button>
    </div>
    
    <!-- コンテキストメニュー -->
    <div
      v-if="contextMenu.show"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
    >
      <button @click="closeOtherTabs">
        他のタブを閉じる
      </button>
      <button @click="closeAllTabs">
        すべて閉じる
      </button>
      <button @click="saveAllTabs">
        すべて保存
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits } from 'vue';

interface Tab {
  id: string;
  fileName: string;
  displayName: string;
  isModified: boolean;
  content?: string;
  language?: string;
}

interface Props {
  tabs: Tab[];
  activeTabId?: string;
}

interface Emits {
  (e: 'selectTab', tabId: string): void;
  (e: 'closeTab', tabId: string): void;
  (e: 'createNewTab'): void;
  (e: 'closeOtherTabs', tabId: string): void;
  (e: 'closeAllTabs'): void;
  (e: 'saveAllTabs'): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const contextMenu = ref({
  show: false,
  x: 0,
  y: 0,
  tabId: ''
});

function selectTab(tabId: string): void {
  emit('selectTab', tabId);
}

function closeTab(tabId: string): void {
  emit('closeTab', tabId);
}

function createNewTab(): void {
  emit('createNewTab');
}

function showContextMenu(tabId: string, event: MouseEvent): void {
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    tabId
  };
  
  // クリック外しで閉じる
  setTimeout(() => {
    document.addEventListener('click', hideContextMenu, { once: true });
  });
}

function hideContextMenu(): void {
  contextMenu.value.show = false;
}

function closeOtherTabs(): void {
  emit('closeOtherTabs', contextMenu.value.tabId);
  hideContextMenu();
}

function closeAllTabs(): void {
  emit('closeAllTabs');
  hideContextMenu();
}

function saveAllTabs(): void {
  emit('saveAllTabs');
  hideContextMenu();
}

function getFileIcon(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    'js': '📄',
    'ts': '📘',
    'vue': '💚',
    'md': '📝',
    'json': '📋',
    'css': '🎨',
    'html': '🌐',
    'txt': '📄'
  };
  return iconMap[ext || ''] || '📄';
}
</script>

<style lang="scss" scoped>
.tab-manager {
  position: relative;
  background: var(--tab-bar-bg);
  border-bottom: 1px solid var(--tab-bar-border);
  color: var(--text-color);
}

.tab-list {
  display: flex;
  align-items: center;
  overflow-x: auto;
  scrollbar-width: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--tab-bg);
  border-right: 1px solid var(--tab-border);
  cursor: pointer;
  user-select: none;
  min-width: 120px;
  max-width: 200px;
  position: relative;
  color: var(--text-color);
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--tab-hover-bg);
  }
  
  &.active {
    background: var(--tab-active-bg);
    border-bottom: 2px solid var(--tab-active-border);
  }
  
  &.modified {
    font-style: italic;
  }
}

.tab-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.tab-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: inherit;
}

.modified-dot {
  color: var(--modified-color);
  font-size: 10px;
  flex-shrink: 0;
}

.tab-close {
  display: none;
  width: 16px;
  height: 16px;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 2px;
  font-size: 12px;
  flex-shrink: 0;
  color: var(--text-muted);
  
  &:hover {
    background: var(--close-hover-bg);
    color: var(--text-color);
  }
}

.tab:hover .tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
}

.new-tab-button {
  padding: 8px 12px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--new-tab-color);
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--new-tab-hover-bg);
    color: var(--text-color);
  }
}

.context-menu {
  position: fixed;
  background: var(--modal-bg);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  box-shadow: 0 2px 8px var(--shadow);
  z-index: 1000;
  min-width: 150px;
  
  button {
    display: block;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-color);
    transition: background-color 0.2s ease;
    
    &:hover {
      background: var(--context-menu-hover);
    }
  }
}
</style>
