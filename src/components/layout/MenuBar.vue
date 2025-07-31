<template>
  <div class="menu-bar">
    <div class="menu-items">
      <div 
        v-for="menu in menus" 
        :key="menu.name"
        class="menu-item"
        @click="toggleMenu(menu.name)"
      >
        {{ menu.name }}
        <div 
          v-if="activeMenu === menu.name" 
          class="dropdown-menu"
          @click.stop
        >
          <div 
            v-for="item in menu.items" 
            :key="item.label"
            class="dropdown-item"
            @click="handleMenuAction(item.action)"
          >
            {{ item.label }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- ライセンス表示モーダル -->
    <LicenseViewer 
      v-if="showLicenseViewer"
      @close="showLicenseViewer = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import LicenseViewer from '@/components/license/LicenseViewer.vue';

interface MenuItem {
  label: string;
  action: string;
}

interface Menu {
  name: string;
  items: MenuItem[];
}

const activeMenu = ref<string | null>(null);
const showLicenseViewer = ref(false);

const menus = ref<Menu[]>([
  {
    name: 'ファイル',
    items: [
      { label: '新しいファイル', action: 'new-file' },
      { label: 'ファイルを開く', action: 'open-file' },
      { label: '保存', action: 'save-file' },
      { label: '名前を付けて保存', action: 'save-as' },
      { label: '終了', action: 'quit' }
    ]
  },
  {
    name: '編集',
    items: [
      { label: '元に戻す', action: 'undo' },
      { label: 'やり直し', action: 'redo' },
      { label: 'カット', action: 'cut' },
      { label: 'コピー', action: 'copy' },
      { label: '貼り付け', action: 'paste' },
      { label: 'すべて選択', action: 'select-all' }
    ]
  },
  {
    name: '表示',
    items: [
      { label: 'ズームイン', action: 'zoom-in' },
      { label: 'ズームアウト', action: 'zoom-out' },
      { label: 'リセット', action: 'zoom-reset' },
      { label: 'フルスクリーン', action: 'fullscreen' }
    ]
  },
  {
    name: 'ヘルプ',
    items: [
      { label: 'ライセンス情報', action: 'show-licenses' },
      { label: 'バージョン情報', action: 'about' }
    ]
  }
]);

function toggleMenu(menuName: string): void {
  activeMenu.value = activeMenu.value === menuName ? null : menuName;
}

function handleMenuAction(action: string): void {
  switch (action) {
    case 'show-licenses':
      showLicenseViewer.value = true;
      break;
    case 'about':
      // バージョン情報表示の実装
      alert('TakeNote Dev v0.0.0\n軽量なテキストエディタ');
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
      console.log('ファイルを保存');
      break;
    case 'save-as':
      // 名前を付けて保存の実装
      console.log('名前を付けて保存');
      break;
    case 'quit':
      // アプリケーション終了
      window.close();
      break;
    case 'undo':
      document.execCommand('undo');
      break;
    case 'redo':
      document.execCommand('redo');
      break;
    case 'cut':
      document.execCommand('cut');
      break;
    case 'copy':
      document.execCommand('copy');
      break;
    case 'paste':
      document.execCommand('paste');
      break;
    case 'select-all':
      document.execCommand('selectAll');
      break;
    case 'zoom-in':
      // ズームイン実装
      console.log('ズームイン');
      break;
    case 'zoom-out':
      // ズームアウト実装
      console.log('ズームアウト');
      break;
    case 'zoom-reset':
      // ズームリセット実装
      console.log('ズームリセット');
      break;
    case 'fullscreen':
      // フルスクリーン切り替え実装
      console.log('フルスクリーン切り替え');
      break;
    default:
      console.log(`Unknown action: ${action}`);
  }
  
  // メニューを閉じる
  activeMenu.value = null;
}

function closeMenus(): void {
  activeMenu.value = null;
}

onMounted(() => {
  document.addEventListener('click', closeMenus);
});

onUnmounted(() => {
  document.removeEventListener('click', closeMenus);
});
</script>

<style lang="scss" scoped>
.menu-bar {
  display: flex;
  background: var(--menu-bar-bg, #f8f9fa);
  border-bottom: 1px solid var(--border-color, #ddd);
  height: 32px;
  align-items: center;
  padding: 0 8px;
  user-select: none;
  position: relative;
  z-index: 1000;
}

.menu-items {
  display: flex;
  gap: 4px;
}

.menu-item {
  position: relative;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 14px;
  color: var(--menu-text, #333);
  
  &:hover {
    background: var(--menu-hover-bg, #e9ecef);
  }
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  min-width: 180px;
  background: var(--dropdown-bg, white);
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1001;
}

.dropdown-item {
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: var(--dropdown-text, #333);
  
  &:hover {
    background: var(--dropdown-hover-bg, #f8f9fa);
  }
  
  &:first-child {
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;
  }
  
  &:last-child {
    border-bottom-left-radius: 4px;
    border-bottom-right-radius: 4px;
  }
}
</style>
