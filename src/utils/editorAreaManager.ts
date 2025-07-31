/**
 * エディタエリア管理クラス
 */

export interface TabInfo {
  id: string;
  title: string;
  filePath: string;
  isDirty: boolean;
  content: string;
  language: string;
  cursorPosition: { line: number; column: number };
  scrollPosition: { top: number; left: number };
}

export interface EditorLayoutState {
  activeTabId: string | null;
  tabs: TabInfo[];
  splitMode: 'none' | 'horizontal' | 'vertical';
  previewVisible: boolean;
  sidebarVisible: boolean;
  statusBarVisible: boolean;
}

export interface EditorSettings {
  theme: string;
  fontSize: number;
  lineHeight: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  indentSize: number;
  indentType: 'spaces' | 'tabs';
  autoSave: boolean;
  autoSaveDelay: number;
}

export class EditorAreaManager {
  private static instance: EditorAreaManager;
  private layoutState: EditorLayoutState;
  private settings: EditorSettings;
  private eventCallbacks: Map<string, ((data: unknown) => void)[]>;

  private constructor() {
    this.layoutState = {
      activeTabId: null,
      tabs: [],
      splitMode: 'none',
      previewVisible: true,
      sidebarVisible: true,
      statusBarVisible: true
    };

    this.settings = {
      theme: 'vs-dark',
      fontSize: 14,
      lineHeight: 1.5,
      wordWrap: true,
      lineNumbers: true,
      minimap: false,
      indentSize: 2,
      indentType: 'spaces',
      autoSave: true,
      autoSaveDelay: 1000
    };

    this.eventCallbacks = new Map();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): EditorAreaManager {
    if (!EditorAreaManager.instance) {
      EditorAreaManager.instance = new EditorAreaManager();
    }
    return EditorAreaManager.instance;
  }

  /**
   * レイアウト状態を取得
   */
  getLayoutState(): EditorLayoutState {
    return JSON.parse(JSON.stringify(this.layoutState));
  }

  /**
   * エディタ設定を取得
   */
  getSettings(): EditorSettings {
    return JSON.parse(JSON.stringify(this.settings));
  }

  /**
   * 新しいタブを作成
   */
  createTab(filePath: string, content: string = '', language: string = 'plaintext'): TabInfo {
    const tabId = this.generateTabId();
    const fileName = this.extractFileName(filePath);

    const newTab: TabInfo = {
      id: tabId,
      title: fileName,
      filePath,
      isDirty: false,
      content,
      language,
      cursorPosition: { line: 1, column: 1 },
      scrollPosition: { top: 0, left: 0 }
    };

    this.layoutState.tabs.push(newTab);
    this.setActiveTab(tabId);
    this.emit('tab-created', newTab);

    return newTab;
  }

  /**
   * タブを閉じる
   */
  closeTab(tabId: string): boolean {
    const tabIndex = this.layoutState.tabs.findIndex(tab => tab.id === tabId);
    if (tabIndex === -1) return false;

    const tab = this.layoutState.tabs[tabIndex];
    
    // 変更されたファイルの場合は確認
    if (tab.isDirty) {
      const shouldClose = confirm(`ファイル "${tab.title}" は変更されています。保存せずに閉じますか？`);
      if (!shouldClose) return false;
    }

    this.layoutState.tabs.splice(tabIndex, 1);

    // アクティブタブが閉じられた場合は次のタブをアクティブに
    if (this.layoutState.activeTabId === tabId) {
      if (this.layoutState.tabs.length > 0) {
        const nextIndex = Math.min(tabIndex, this.layoutState.tabs.length - 1);
        this.setActiveTab(this.layoutState.tabs[nextIndex].id);
      } else {
        this.layoutState.activeTabId = null;
      }
    }

    this.emit('tab-closed', { tabId, tab });
    return true;
  }

  /**
   * アクティブタブを設定
   */
  setActiveTab(tabId: string): boolean {
    const tab = this.layoutState.tabs.find(t => t.id === tabId);
    if (!tab) return false;

    this.layoutState.activeTabId = tabId;
    this.emit('active-tab-changed', tab);
    return true;
  }

  /**
   * タブのコンテンツを更新
   */
  updateTabContent(tabId: string, content: string): boolean {
    const tab = this.layoutState.tabs.find(t => t.id === tabId);
    if (!tab) return false;

    const wasClean = !tab.isDirty;
    tab.content = content;
    tab.isDirty = true;

    this.emit('tab-content-changed', { tab, wasClean });
    return true;
  }

  /**
   * タブを保存済みとしてマーク
   */
  markTabSaved(tabId: string): boolean {
    const tab = this.layoutState.tabs.find(t => t.id === tabId);
    if (!tab) return false;

    tab.isDirty = false;
    this.emit('tab-saved', tab);
    return true;
  }

  /**
   * カーソル位置を更新
   */
  updateCursorPosition(tabId: string, line: number, column: number): boolean {
    const tab = this.layoutState.tabs.find(t => t.id === tabId);
    if (!tab) return false;

    tab.cursorPosition = { line, column };
    this.emit('cursor-position-changed', { tabId, line, column });
    return true;
  }

  /**
   * スクロール位置を更新
   */
  updateScrollPosition(tabId: string, top: number, left: number): boolean {
    const tab = this.layoutState.tabs.find(t => t.id === tabId);
    if (!tab) return false;

    tab.scrollPosition = { top, left };
    return true;
  }

  /**
   * 分割モードを設定
   */
  setSplitMode(mode: EditorLayoutState['splitMode']): void {
    this.layoutState.splitMode = mode;
    this.emit('split-mode-changed', mode);
  }

  /**
   * パネルの表示/非表示を切り替え
   */
  togglePanel(panel: 'preview' | 'sidebar' | 'statusBar'): void {
    switch (panel) {
      case 'preview':
        this.layoutState.previewVisible = !this.layoutState.previewVisible;
        break;
      case 'sidebar':
        this.layoutState.sidebarVisible = !this.layoutState.sidebarVisible;
        break;
      case 'statusBar':
        this.layoutState.statusBarVisible = !this.layoutState.statusBarVisible;
        break;
    }
    this.emit('panel-toggled', { panel, visible: this.layoutState[`${panel}Visible`] });
  }

  /**
   * エディタ設定を更新
   */
  updateSettings(updates: Partial<EditorSettings>): void {
    Object.assign(this.settings, updates);
    this.emit('settings-changed', this.settings);
  }

  /**
   * 全ての変更されたタブを取得
   */
  getDirtyTabs(): TabInfo[] {
    return this.layoutState.tabs.filter(tab => tab.isDirty);
  }

  /**
   * アクティブタブを取得
   */
  getActiveTab(): TabInfo | null {
    if (!this.layoutState.activeTabId) return null;
    return this.layoutState.tabs.find(tab => tab.id === this.layoutState.activeTabId) || null;
  }

  /**
   * 特定のファイルパスのタブを検索
   */
  findTabByPath(filePath: string): TabInfo | null {
    return this.layoutState.tabs.find(tab => tab.filePath === filePath) || null;
  }

  /**
   * 全てのタブを閉じる
   */
  closeAllTabs(): boolean {
    const dirtyTabs = this.getDirtyTabs();
    if (dirtyTabs.length > 0) {
      const shouldClose = confirm(`${dirtyTabs.length}個のファイルが変更されています。保存せずに全て閉じますか？`);
      if (!shouldClose) return false;
    }

    this.layoutState.tabs = [];
    this.layoutState.activeTabId = null;
    this.emit('all-tabs-closed');
    return true;
  }

  /**
   * タブIDを生成
   */
  private generateTabId(): string {
    return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * ファイルパスからファイル名を抽出
   */
  private extractFileName(filePath: string): string {
    if (!filePath) return 'Untitled';
    const parts = filePath.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'Untitled';
  }

  /**
   * イベントリスナーを追加
   */
  on(event: string, callback: (data: unknown) => void): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  /**
   * イベントリスナーを削除
   */
  off(event: string, callback: (data: unknown) => void): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * イベントを発行
   */
  private emit(event: string, data?: unknown): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.layoutState = {
      activeTabId: null,
      tabs: [],
      splitMode: 'none',
      previewVisible: true,
      sidebarVisible: true,
      statusBarVisible: true
    };
    this.emit('reset');
  }
}
