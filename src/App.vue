<template>
  <div class="app">
    <!-- ネイティブメニューバーを使用するため、カスタムメニューバーは削除 -->
    
    <div class="main-content">
      <!-- サイドバーエリア -->
      <Sidebar 
        @open-file="handleOpenFile"
        @new-file="handleNewFile"
        @search-result="handleSearchResult"
        @file-opened="handleFileOpened"
      />

      <!-- エディタエリア -->
      <EditorArea ref="editorAreaRef" />

      <!-- プレビューエリア -->
      <PreviewArea />
    </div>
    
    <!-- ライセンス表示モーダル -->
    <LicenseViewer 
      v-if="showLicenseViewer"
      @close="showLicenseViewer = false"
    />
    
    <!-- 設定画面モーダル -->
    <ConfigViewer 
      :visible="showConfigViewer"
      @close="showConfigViewer = false"
    />
    
    <!-- About画面モーダル -->
    <AboutWindow 
      :is-visible="showAboutWindow"
      @close="showAboutWindow = false"
    />
    
    <!-- アラート/確認ダイアログ（専用コンポーネント） -->
    <!-- アラート/確認ダイアログ -->
    <BaseModal
      :visible="modalState.isOpen"
      :title="modalState.title"
      :size="modalState.size"
      :show-close-button="modalState.showCloseButton"
      :close-on-overlay="modalState.closeOnOverlay"
      :close-on-escape="modalState.closeOnEscape"
      @close="handleModalClose"
    >
      <p>{{ modalState.content }}</p>
      <template #footer>
        <div class="modal-actions">
          <button
            v-if="modalState.isConfirm"
            class="btn btn-secondary"
            @click="handleModalCancel"
          >
            キャンセル
          </button>
          <button
            class="btn btn-primary"
            @click="handleModalConfirm"
          >
            {{ modalState.isConfirm ? 'OK' : '閉じる' }}
          </button>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive } from 'vue';
import EditorArea from '@/components/editorArea/EditorArea.vue';
import LicenseViewer from '@/components/license/LicenseViewer.vue';
import ConfigViewer from '@/components/ConfigViewer.vue';
import Sidebar from '@/components/sideBar/Sidebar.vue';
import PreviewArea from '@/components/previewArea/PreviewArea.vue';
import AboutWindow from '@/components/AboutWindow.vue';
import BaseModal from '@/components/common/modals/BaseModal.vue';
import { ModalManager } from '@/utils/modalManager';
import { useTheme } from '@/composables/useTheme';
import { useFontSize } from '@/composables/useFontSize';

// Window APIの型定義
interface WindowAPI {
  api: {
    onMenuAction: (handler: (action: string) => void) => void;
    removeMenuActionListener: () => void;
    config: {
      setLastOpenedFile: (filePath: string | null) => Promise<{ success: boolean; error?: string }>;
      getLastOpenedFile: () => Promise<{ success: boolean; data?: string; error?: string }>;
    };
    file: {
      exists: (filePath: string) => Promise<{ success: boolean; data?: boolean; error?: string }>;
      read: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
    };
    tan: {
      showSaveDialog: (title: string) => Promise<{ success: boolean; data: { canceled: boolean; filePath?: string } }>;
      create: (filePath: string, data: unknown) => Promise<{ success: boolean; error?: string }>;
      read: (filePath: string) => Promise<{ success: boolean; data?: TanFile; error?: string }>;
    };
  };
}

// 型定義
interface TanFile {
  mainFile?: {
    content: string;
  };
  mode?: string;
}

declare const window: Window & WindowAPI;

const showLicenseViewer = ref(false);
const showConfigViewer = ref(false);
const showAboutWindow = ref(false); // テスト用から元に戻す
const editorAreaRef = ref<InstanceType<typeof EditorArea> | null>(null);

// モーダル管理
const modalState = reactive({
  isOpen: false,
  title: '',
  content: '',
  type: 'default' as 'default' | 'warning' | 'error' | 'success',
  size: 'medium' as 'small' | 'medium' | 'large',
  showCloseButton: true,
  closeOnOverlay: true,
  closeOnEscape: true,
  isConfirm: false
});

let modalResolve: ((value: boolean) => void) | (() => boolean) | null = null;

// ModalManagerのイベントリスナー
const modalManager = ModalManager.getInstance();

// ModalManagerのイベントを監視
modalManager.on('alert', (data: unknown) => {
  console.log('App.vue: alert event received:', data);
  const alertData = data as { title?: string; message?: string; resolve?: () => void };
  modalState.isOpen = true;
  modalState.title = alertData.title || 'お知らせ';
  modalState.content = alertData.message || '';
  modalState.type = 'default';
  modalState.isConfirm = false;
  modalResolve = alertData.resolve ? () => {
    alertData.resolve?.();
    return true;
  } : null;
  console.log('App.vue: modal state updated:', modalState);
});

modalManager.on('confirm', (data: unknown) => {
  const confirmData = data as { title?: string; message?: string; resolve?: (value: boolean) => void };
  modalState.isOpen = true;
  modalState.title = confirmData.title || '確認';
  modalState.content = confirmData.message || '';
  modalState.type = 'warning';
  modalState.isConfirm = true;
  modalResolve = confirmData.resolve || null;
});

// モーダルのイベントハンドラー
function handleModalClose(): void {
  modalState.isOpen = false;
  if (modalResolve) {
    const result = modalResolve(false);
    if (typeof result === 'boolean') {
      // confirm用
    } else {
      // alert用 - resolveが関数の場合は実行
      if (typeof modalResolve === 'function') {
        (modalResolve as () => boolean)();
      }
    }
    modalResolve = null;
  }
}

function handleModalConfirm(): void {
  modalState.isOpen = false;
  if (modalResolve) {
    const result = modalResolve(true);
    if (typeof result === 'boolean') {
      // confirm用
    } else {
      // alert用 - resolveが関数の場合は実行
      if (typeof modalResolve === 'function') {
        (modalResolve as () => boolean)();
      }
    }
    modalResolve = null;
  }
}

function handleModalCancel(): void {
  modalState.isOpen = false;
  if (modalResolve) {
    modalResolve(false);
    modalResolve = null;
  }
}

// テーマ管理を初期化
useTheme();

// フォントサイズ管理を初期化
const { initializeFontSize } = useFontSize();
initializeFontSize(); // デフォルトサイズ（medium）で初期化

// ファイル関連のイベントハンドラー
function handleOpenFile(filePath: string): void {
  console.log('ファイル選択:', filePath);
  // TODO: ファイル選択時の処理
}

function handleNewFile(): void {
  console.log('新しいファイル作成');
  // TODO: 新しいファイル作成時の処理
}

function handleSearchResult(results: unknown): void {
  console.log('検索結果:', results);
  // TODO: 検索結果表示の処理
}

function handleFileOpened(filePath: string, content: string, tanMode?: string): void {
  console.log('ファイル開く:', filePath, 'モード:', tanMode);
  if (editorAreaRef.value) {
    editorAreaRef.value.openFile(filePath, content, tanMode);
  }
  
  // 最後に開いたファイルとして記録
  saveLastOpenedFile(filePath);
}

// 最後に開いたファイルを保存
async function saveLastOpenedFile(filePath: string): Promise<void> {
  try {
    await (window as unknown as WindowAPI).api.config.setLastOpenedFile(filePath);
  } catch (error) {
    console.error('最後に開いたファイルの保存に失敗:', error);
  }
}

// アプリ起動時に最後に開いたファイルを復元
async function restoreLastOpenedFile(): Promise<void> {
  try {
    const result = await window.api.config.getLastOpenedFile();
    if (result.success && result.data) {
      const lastFilePath = result.data as string;
      
      // ファイルが存在するかチェック
      const fileExists = await window.api.file.exists(lastFilePath);
      if (fileExists.success && fileExists.data) {
        // ファイルを開く
        if (lastFilePath.endsWith('.tan')) {
          const tanResult = await window.api.tan.read(lastFilePath);
          if (tanResult.success && tanResult.data) {
            const tanFile = tanResult.data as TanFile;
            handleFileOpened(lastFilePath, tanFile.mainFile?.content || '', tanFile.mode);
          }
        } else {
          const fileResult = await window.api.file.read(lastFilePath);
          if (fileResult.success && fileResult.data) {
            handleFileOpened(lastFilePath, fileResult.data as string);
          }
        }
      } else {
        // ファイルが存在しない場合は設定をクリア
        await window.api.config.setLastOpenedFile(null);
      }
    }
  } catch (error) {
    console.error('最後に開いたファイルの復元に失敗:', error);
  }
}

// ネイティブメニューからのアクションを処理
async function handleMenuAction(action: string): Promise<void> {
  switch (action) {
    case 'show-licenses':
      showLicenseViewer.value = true;
      break;
    case 'about':
      // About画面を表示
      showAboutWindow.value = true;
      break;
    case 'new-file':
      // 新しいファイル作成の実装
      console.log('新しいファイルを作成');
      break;
    case 'open-file':
      // ファイルオープンダイアログの実装
      console.log('ファイルを開く');
      break;
    case 'save-file':
      // ファイル保存の実装
      await saveCurrentFile();
      break;
    case 'save-as':
      // 名前を付けて保存の実装
      await saveAsFile();
      break;
    case 'save-as-tan':
      // TANファイルとして保存
      await saveAsTanFile();
      break;
    case 'preferences':
      // 設定画面を表示
      showConfigViewer.value = true;
      break;
    default:
      console.log(`Unknown action: ${action}`);
  }
}

// ファイル保存関数
async function saveCurrentFile(): Promise<void> {
  try {
    console.log('現在のファイルを保存中...');
    if (editorAreaRef.value && typeof editorAreaRef.value.saveCurrentFile === 'function') {
      const saved = await editorAreaRef.value.saveCurrentFile();
      if (saved) {
        console.log('ファイルが正常に保存されました');
      } else {
        console.log('保存するファイルがありません');
      }
    } else {
      console.log('EditorAreaが利用できません');
    }
  } catch (error) {
    console.error('ファイル保存エラー:', error);
    alert(`保存に失敗しました: ${error}`);
  }
}

// 名前を付けて保存
async function saveAsFile(): Promise<void> {
  try {
    console.log('名前を付けて保存中...');
    // TODO: ファイル保存ダイアログを表示して保存
  } catch (error) {
    console.error('ファイル保存エラー:', error);
  }
}

// TANファイルとして保存
async function saveAsTanFile(): Promise<void> {
  try {
    if (!window.api) {
      console.error('APIが利用できません');
      return;
    }

    // TODO: 現在の編集内容を取得
    const title = 'Sample Note'; // 実際にはエディタから取得
    const content = 'サンプルコンテンツ\n\nこれはテストです。'; // 実際にはエディタから取得

    // TANファイル構造を作成
    const now = new Date().toISOString();
    const tanData = {
      meta: {
        title: title,
        description: `自動生成されたTANファイル: ${new Date().toLocaleString()}`,
        createdAt: now,
        modifiedAt: now,
        directoryStructure: []
      },
      version: '1.0.0',
      mode: 'note',
      mainFile: {
        name: 'content.md',
        content: content,
        extension: 'md'
      },
      hook: {
        lineCount: content.split('\n').length,
        keys: []
      }
    };

    // TANファイル保存ダイアログを表示
    const dialogResult = await window.api.tan.showSaveDialog(title);
    
    if (dialogResult.success && !dialogResult.data.canceled && dialogResult.data.filePath) {
      const filePath = dialogResult.data.filePath;
      
      // TANファイルを作成
      const createResult = await window.api.tan.create(filePath, tanData);
      
      if (createResult.success) {
        console.log('TANファイルが保存されました:', filePath);
        alert(`TANファイルが保存されました: ${filePath}`);
      } else {
        console.error('TANファイル作成エラー:', createResult.error);
        alert(`保存エラー: ${createResult.error}`);
      }
    } else {
      console.log('保存がキャンセルされました');
    }
  } catch (error) {
    console.error('TANファイル保存エラー:', error);
    alert(`保存エラー: ${error}`);
  }
}

onMounted(() => {
  // メニューアクションの受信を開始
  if (window.api && typeof window.api.onMenuAction === 'function') {
    window.api.onMenuAction(handleMenuAction);
  } else {
    // preloadが動作していない場合の代替手段
    // メニューからの直接的なグローバル関数呼び出しに対応
    (window as Window & { handleMenuAction?: typeof handleMenuAction }).handleMenuAction = handleMenuAction;
  }
  
  // 最後に開いたファイルを復元
  restoreLastOpenedFile();
});

// アプリ終了時に現在のファイルを最後に開いたファイルとして保存
async function saveCurrentFileAsLast(): Promise<void> {
  try {
    if (editorAreaRef.value) {
      const currentFilePath = editorAreaRef.value.getCurrentFilePath();
      if (currentFilePath) {
        await window.api.config.setLastOpenedFile(currentFilePath);
      } else {
        // 開いているファイルがない場合は設定をクリア
        await window.api.config.setLastOpenedFile(null);
      }
    }
  } catch (error) {
    console.error('現在のファイル保存に失敗:', error);
  }
}

onUnmounted(() => {
  // アプリ終了時に現在のファイルを保存
  saveCurrentFileAsLast();
  // メニューアクション受信を停止
  if (window.api) {
    window.api.removeMenuActionListener();
  }
  
  // アプリ終了時に現在のファイルを記録
  saveCurrentFileAsLast();
});
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-color);
  color: var(--text-color);
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.preview-area {
  flex: 1;
  background: var(--bg-color);
  display: flex;
  flex-direction: column;
}

.preview-header {
  padding: 12px 16px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
}

.preview-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-color);
}

.preview-content {
  flex: 1;
  padding: 16px;
  font-size: 14px;
  color: var(--text-muted);
}

.preview-content p {
  margin: 8px 0;
}

/* モーダル用スタイル */
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 80px;
}

.btn-primary {
  background: var(--accent-color, #007acc);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover, #005a9e);
}

.btn-secondary {
  background: var(--border-color, #d1d5db);
  color: var(--text-color, #374151);
}

.btn-secondary:hover {
  background: var(--border-hover, #9ca3af);
}
</style>

<style>
/* グローバルテーマをインポート */
@import '@/assets/themes.css';
</style>
