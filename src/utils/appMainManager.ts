/**
 * アプリケーションメイン管理クラス
 */

export interface WindowState {
  isMaximized: boolean;
  isFullscreen: boolean;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface AppState {
  isInitialized: boolean;
  currentWorkspace: string | null;
  recentWorkspaces: string[];
  windowState: WindowState;
  activeView: 'editor' | 'config' | 'license';
}

export class AppMainManager {
  private static instance: AppMainManager;
  private state: AppState;
  private eventListeners: Map<string, ((...args: unknown[]) => void)[]>;

  private constructor() {
    this.state = {
      isInitialized: false,
      currentWorkspace: null,
      recentWorkspaces: [],
      windowState: {
        isMaximized: false,
        isFullscreen: false,
        bounds: { x: 0, y: 0, width: 1200, height: 800 }
      },
      activeView: 'editor'
    };
    this.eventListeners = new Map();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): AppMainManager {
    if (!AppMainManager.instance) {
      AppMainManager.instance = new AppMainManager();
    }
    return AppMainManager.instance;
  }

  /**
   * アプリケーション状態を取得
   */
  getState(): AppState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * アプリケーションを初期化
   */
  async initialize(): Promise<void> {
    try {
      // 設定読み込み
      await this.loadState();
      
      // イベントリスナー設定
      this.setupEventListeners();
      
      this.state.isInitialized = true;
      this.emit('initialized', this.state);
    } catch (error) {
      console.error('App initialization failed:', error);
      throw error;
    }
  }

  /**
   * ワークスペースを開く
   */
  async openWorkspace(path: string): Promise<void> {
    if (this.state.currentWorkspace !== path) {
      this.state.currentWorkspace = path;
      this.addToRecentWorkspaces(path);
      this.emit('workspace-changed', path);
    }
  }

  /**
   * 最近のワークスペースに追加
   */
  private addToRecentWorkspaces(path: string): void {
    const filtered = this.state.recentWorkspaces.filter(p => p !== path);
    this.state.recentWorkspaces = [path, ...filtered].slice(0, 10);
  }

  /**
   * アクティブビューを変更
   */
  setActiveView(view: AppState['activeView']): void {
    if (this.state.activeView !== view) {
      this.state.activeView = view;
      this.emit('view-changed', view);
    }
  }

  /**
   * ウィンドウ状態を更新
   */
  updateWindowState(updates: Partial<WindowState>): void {
    Object.assign(this.state.windowState, updates);
    this.emit('window-state-changed', this.state.windowState);
  }

  /**
   * アプリケーション終了処理
   */
  async shutdown(): Promise<void> {
    try {
      await this.saveState();
      this.emit('shutdown');
    } catch (error) {
      console.error('App shutdown failed:', error);
    }
  }

  /**
   * 状態の保存
   */
  private async saveState(): Promise<void> {
    const stateToSave = {
      currentWorkspace: this.state.currentWorkspace,
      recentWorkspaces: this.state.recentWorkspaces,
      windowState: this.state.windowState,
      activeView: this.state.activeView
    };

    try {
      localStorage.setItem('appState', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save app state:', error);
    }
  }

  /**
   * 状態の読み込み
   */
  private async loadState(): Promise<void> {
    try {
      const saved = localStorage.getItem('appState');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(this.state, parsed);
      }
    } catch (error) {
      console.warn('Failed to load app state:', error);
    }
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // ウィンドウイベント
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });

    // キーボードショートカット
    window.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });
  }

  /**
   * キーボードイベントの処理
   */
  private handleKeydown(e: KeyboardEvent): void {
    const isCtrl = e.ctrlKey || e.metaKey;
    
    if (isCtrl) {
      switch (e.key) {
        case 'n':
          e.preventDefault();
          this.emit('new-file');
          break;
        case 'o':
          e.preventDefault();
          this.emit('open-file');
          break;
        case 's':
          e.preventDefault();
          this.emit('save-file');
          break;
        case 'q':
          e.preventDefault();
          this.emit('quit-app');
          break;
        case ',':
          e.preventDefault();
          this.setActiveView('config');
          break;
      }
    }

    if (e.key === 'F11') {
      e.preventDefault();
      this.emit('toggle-fullscreen');
    }
  }

  /**
   * イベントリスナーを追加
   */
  on(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * イベントリスナーを削除
   */
  off(event: string, callback: (...args: unknown[]) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * イベントを発行
   */
  private emit(event: string, data?: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * アプリケーション情報を取得
   */
  getAppInfo(): { version: string; platform: string; arch: string } {
    return {
      version: process.env.npm_package_version || '1.0.0',
      platform: process.platform,
      arch: process.arch
    };
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): object {
    return {
      state: this.state,
      eventListeners: Array.from(this.eventListeners.keys()),
      appInfo: this.getAppInfo(),
      timestamp: new Date().toISOString()
    };
  }
}
