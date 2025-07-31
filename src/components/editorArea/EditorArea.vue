<template>
  <div class="editor-area">
    <!-- タブマネージャー -->
    <TabManager
      :tabs="tabManagerCore.tabList.value"
      :active-tab-id="tabManagerCore.getActiveTabId()"
      @select-tab="handleSelectTab"
      @close-tab="handleCloseTab"
      @create-new-tab="handleCreateNewTab"
      @close-other-tabs="handleCloseOtherTabs"
      @close-all-tabs="handleCloseAllTabs"
      @save-all-tabs="handleSaveAllTabs"
    />

    <!-- エディタペイン -->
    <div class="editor-content">
      <EditorPane
        v-if="currentTab"
        v-model="currentTab.content"
        :file-path="currentTab.filePath"
        :tan-mode="currentTab.tanMode"
        @update:model-value="handleContentUpdate"
      />
      <div
        v-else
        class="no-tab-message"
      >
        <p>新しいファイルを作成するか、既存のファイルを開いてください。</p>
        <button @click="handleCreateNewTab">
          新しいファイル
        </button>
      </div>
    </div>

    <!-- ステータスバーはEditorPane.vue側で制御・表示されるため、ここからは削除 -->
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted } from 'vue';
import TabManager from '@/components/editorArea/tabManager/TabManager.vue';
import EditorPane from '@/components/editorArea/codeEditor/EditorPane.vue';

import { tabManagerCore } from '@/components/editorArea/tabManager/tabManagerCore';
import { statusBarCore } from '@/components/editorArea/statusBar/statusBarCore';

// Window API型定義
interface WindowAPI {
  api: {
    tan: {
      updateContent: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
    };
    file: {
      write: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
    };
  };
}

interface Props {
  onFileOpened?: (filePath: string, content: string, tanMode?: string) => void;
}

interface Emits {
  (e: 'file-opened', filePath: string, content: string, tanMode?: string): void;
}

defineProps<Props>();
defineEmits<Emits>();

// 現在のタブ
const currentTab = computed(() => tabManagerCore.activeTab.value);

// ファイル開く機能
function openFileInEditor(filePath: string, content: string, tanMode?: string): void {
  const fileName = filePath.split(/[/\\]/).pop() || filePath;
  const tabId = tabManagerCore.createNewTab(fileName, content, filePath, tanMode);
  tabManagerCore.selectTab(tabId);
}

// 外部からファイル開くイベントを受信
defineExpose({
  openFile: openFileInEditor,
  getCurrentFilePath: () => {
    const activeTab = tabManagerCore.activeTab.value;
    return activeTab?.filePath || null;
  },
  getCurrentFileContent: () => {
    const activeTab = tabManagerCore.activeTab.value;
    return activeTab?.content || '';
  },
  getCurrentTab: () => {
    return tabManagerCore.activeTab.value;
  },
  saveCurrentFile: async () => {
    const activeTab = tabManagerCore.activeTab.value;
    if (activeTab && activeTab.filePath) {
      try {
        // TANファイルかどうかを確認
        if (activeTab.filePath.endsWith('.tan')) {
          // TANファイルの場合は、TANファイルの更新機能を使用
          await (window as unknown as WindowAPI).api.tan.updateContent(activeTab.filePath, activeTab.content);
        } else {
          // 通常のファイルの場合
          await (window as unknown as WindowAPI).api.file.write(activeTab.filePath, activeTab.content);
        }
        // 保存済みとしてマーク
        tabManagerCore.markTabAsSaved(activeTab.id);
        return true;
      } catch (error) {
        console.error('ファイル保存エラー:', error);
        return false;
      }
    }
    return false;
  }
});

// タブ選択
function handleSelectTab(tabId: string): void {
  tabManagerCore.selectTab(tabId);
  updateStatusBar();
}

// タブを閉じる
function handleCloseTab(tabId: string): void {
  tabManagerCore.closeTab(tabId);
  updateStatusBar();
}

// 新しいタブ作成
function handleCreateNewTab(): void {
  tabManagerCore.createNewTab();
  updateStatusBar();
}

// 他のタブを閉じる
function handleCloseOtherTabs(tabId: string): void {
  tabManagerCore.closeOtherTabs(tabId);
  updateStatusBar();
}

// すべてのタブを閉じる
function handleCloseAllTabs(): void {
  tabManagerCore.closeAllTabs();
  updateStatusBar();
}

// すべて保存
function handleSaveAllTabs(): void {
  // TODO: 実際の保存処理を実装
  const unsavedTabs = tabManagerCore.getUnsavedTabs();
  unsavedTabs.forEach(tab => {
    tabManagerCore.markTabAsSaved(tab.id);
  });
  updateStatusBar();
}

// コンテンツ更新
function handleContentUpdate(content: string): void {
  const activeTabId = tabManagerCore.getActiveTabId();
  if (activeTabId) {
    tabManagerCore.updateTabContent(activeTabId, content);
    updateStatusBar();
  }
}

// ステータスバーの更新
function updateStatusBar(): void {
  const activeTab = tabManagerCore.activeTab.value;
  if (activeTab) {
    statusBarCore.updateFileInfo({
      name: activeTab.displayName,
      isModified: activeTab.isModified,
      languageMode: activeTab.language
    });
    statusBarCore.updateFileStats(activeTab.content);
    
    if (activeTab.cursorPosition) {
      statusBarCore.updateCursorPosition(
        activeTab.cursorPosition.line,
        activeTab.cursorPosition.column
      );
    }
  } else {
    statusBarCore.reset();
  }
}

// アクティブタブが変更された時のステータスバー更新
watch(currentTab, () => {
  updateStatusBar();
});

// 初期化時にデフォルトタブを作成
onMounted(() => {
  if (tabManagerCore.tabCount.value === 0) {
    handleCreateNewTab();
  }
  updateStatusBar();
});
</script>

<style lang="scss" scoped>
.editor-area {
  display: flex;
  flex-direction: column;
  width: calc((100vw - 300px) / 2);
  height: 100vh;
  border-right: 1px solid var(--border-color);
  background: var(--bg-color);
}

.editor-content {
  flex: 1;
  overflow: hidden;
}

.no-tab-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 2rem;
  color: var(--text-muted);
  text-align: center;

  p {
    margin-bottom: 1rem;
    font-size: 16px;
  }

  button {
    padding: 8px 16px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--bg-secondary);
    color: var(--text-color);
    cursor: pointer;
    transition: background-color 0.2s ease;
    
    &:hover {
      background: var(--hover-bg);
    }
  }
}
</style>
