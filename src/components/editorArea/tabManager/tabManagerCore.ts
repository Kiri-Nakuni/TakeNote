// tabManagerCore.ts
// タブ管理の状態管理とロジック

import { ref, computed } from 'vue';

export interface Tab {
  id: string;
  fileName: string;
  displayName: string;
  isModified: boolean;
  content: string;
  language: string;
  filePath?: string | undefined;
  tanMode?: 'note' | 'cpp' | 'javascript' | 'typescript' | 'python' | 'java' | 'book' | 'presentation' | 'other' | undefined;
  cursorPosition?: { line: number; column: number };
  scrollPosition?: { top: number; left: number };
}

export class TabManagerCore {
  private tabs = ref<Tab[]>([]);
  private activeTabId = ref<string>('');
  private nextTabId = ref(1);

  // 公開用の読み取り専用プロパティ
  readonly tabList = computed(() => this.tabs.value);
  readonly activeTab = computed(() => 
    this.tabs.value.find(tab => tab.id === this.activeTabId.value)
  );
  readonly hasUnsavedChanges = computed(() =>
    this.tabs.value.some(tab => tab.isModified)
  );
  readonly tabCount = computed(() => this.tabs.value.length);

  // 新しいタブの作成
  createNewTab(fileName = '', content = '', filePath?: string, tanMode?: string): string {
    const id = `tab_${this.nextTabId.value++}`;
    const displayName = fileName || `無題${this.nextTabId.value - 1}`;
    
    const newTab: Tab = {
      id,
      fileName,
      displayName,
      isModified: false,
      content,
      language: this.detectLanguage(fileName),
      filePath,
      tanMode: tanMode as Tab['tanMode'],
      cursorPosition: { line: 1, column: 1 },
      scrollPosition: { top: 0, left: 0 }
    };

    this.tabs.value.push(newTab);
    this.activeTabId.value = id;
    
    return id;
  }

  // ファイルを開いてタブを作成
  openFile(fileName: string, content: string): string {
    // 既に開いているファイルがあるかチェック
    const existingTab = this.tabs.value.find(tab => tab.fileName === fileName);
    if (existingTab) {
      this.activeTabId.value = existingTab.id;
      return existingTab.id;
    }

    const id = `tab_${this.nextTabId.value++}`;
    const displayName = fileName.split('/').pop() || fileName;
    
    const newTab: Tab = {
      id,
      fileName,
      displayName,
      isModified: false,
      content,
      language: this.detectLanguage(fileName),
      cursorPosition: { line: 1, column: 1 },
      scrollPosition: { top: 0, left: 0 }
    };

    this.tabs.value.push(newTab);
    this.activeTabId.value = id;
    
    return id;
  }

  // タブの切り替え
  selectTab(tabId: string): boolean {
    const tab = this.tabs.value.find(t => t.id === tabId);
    if (tab) {
      this.activeTabId.value = tabId;
      return true;
    }
    return false;
  }

  // タブを閉じる
  closeTab(tabId: string): boolean {
    const index = this.tabs.value.findIndex(tab => tab.id === tabId);
    if (index === -1) return false;

    // 未保存の変更がある場合の処理は上位で行う
    this.tabs.value.splice(index, 1);

    // アクティブタブが閉じられた場合、隣のタブをアクティブにする
    if (this.activeTabId.value === tabId) {
      if (this.tabs.value.length > 0) {
        const nextIndex = Math.max(0, index - 1);
        this.activeTabId.value = this.tabs.value[nextIndex].id;
      } else {
        this.activeTabId.value = '';
      }
    }

    return true;
  }

  // 他のタブを閉じる
  closeOtherTabs(keepTabId: string): void {
    const keepTab = this.tabs.value.find(tab => tab.id === keepTabId);
    if (keepTab) {
      this.tabs.value = [keepTab];
      this.activeTabId.value = keepTabId;
    }
  }

  // すべてのタブを閉じる
  closeAllTabs(): void {
    this.tabs.value = [];
    this.activeTabId.value = '';
  }

  // タブの内容を更新
  updateTabContent(tabId: string, content: string): void {
    const tab = this.tabs.value.find(t => t.id === tabId);
    if (tab) {
      tab.content = content;
      tab.isModified = true;
    }
  }

  // タブの保存状態を更新
  markTabAsSaved(tabId: string): void {
    const tab = this.tabs.value.find(t => t.id === tabId);
    if (tab) {
      tab.isModified = false;
    }
  }

  // カーソル位置の保存
  saveCursorPosition(tabId: string, line: number, column: number): void {
    const tab = this.tabs.value.find(t => t.id === tabId);
    if (tab) {
      tab.cursorPosition = { line, column };
    }
  }

  // スクロール位置の保存
  saveScrollPosition(tabId: string, top: number, left: number): void {
    const tab = this.tabs.value.find(t => t.id === tabId);
    if (tab) {
      tab.scrollPosition = { top, left };
    }
  }

  // タブの順序を変更
  moveTab(fromIndex: number, toIndex: number): void {
    if (fromIndex >= 0 && fromIndex < this.tabs.value.length &&
        toIndex >= 0 && toIndex < this.tabs.value.length) {
      const tab = this.tabs.value.splice(fromIndex, 1)[0];
      this.tabs.value.splice(toIndex, 0, tab);
    }
  }

  // 言語の自動判定
  private detectLanguage(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'ts': 'typescript',
      'vue': 'vue',
      'md': 'markdown',
      'json': 'json',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'txt': 'plaintext'
    };
    return languageMap[ext || ''] || 'plaintext';
  }

  // 未保存のタブ一覧を取得
  getUnsavedTabs(): Tab[] {
    return this.tabs.value.filter(tab => tab.isModified);
  }

  // アクティブタブIDを取得
  getActiveTabId(): string {
    return this.activeTabId.value;
  }

  // タブを取得
  getTab(tabId: string): Tab | undefined {
    return this.tabs.value.find(tab => tab.id === tabId);
  }

  // すべてのタブを取得
  getAllTabs(): Tab[] {
    return [...this.tabs.value];
  }
}

// インスタンスをエクスポート（シングルトン想定）
export const tabManagerCore = new TabManagerCore();
