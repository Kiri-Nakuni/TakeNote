import { configFileManager } from './fileManager/fileOperations/configFileManager';
import * as path from 'path';
import * as os from 'os';

export interface AppConfig {
  // セキュリティ設定
  security: {
    mode: 'secure' | 'developer'; // セキュアモード or 開発者モード
    allowWasm: boolean;
    allowCodeExecution: boolean;
  };
  
  // ウィンドウ設定
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    maximized: boolean;
  };
  
  // パネル設定
  panels: {
    sidebarWidth: number;
    sidebarVisible: boolean;
    previewVisible: boolean;
    editorFontSize: number;
    lineNumbers: boolean;
    wordWrap: boolean;
  };
  
  // エディタ設定
  editor: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: number;
    fontFamily?: string;
    tabSize: number;
    insertSpaces: boolean;
    autoSave: boolean;
    autoSaveInterval?: number;
    syntaxHighlighting: boolean;
    wordWrap?: boolean;
    lineNumbers?: boolean;
  };
  
  // 最近使用したファイル
  recentFiles: string[];
  
  // 最後に開いていたファイル
  lastOpenedFile?: string;
  
  // アプリケーション設定
  app: {
    version: string;
    lastOpened: string;
    language: 'ja' | 'en';
  };

  // ファイル管理設定
  files?: {
    defaultSaveLocation: string;
    maxRecentFiles: number;
    confirmDelete: boolean;
  };

  // 一般設定
  general?: {
    language: 'ja' | 'en';
    checkUpdates: boolean;
    telemetry: boolean;
    securityMode: 'secure' | 'developer';
  };
}

export const DEFAULT_CONFIG: AppConfig = {
  security: {
    mode: 'secure',
    allowWasm: false,
    allowCodeExecution: false
  },
  window: {
    width: 1200,
    height: 800,
    maximized: false
  },
  panels: {
    sidebarWidth: 300,
    sidebarVisible: true,
    previewVisible: true,
    editorFontSize: 14,
    lineNumbers: true,
    wordWrap: true
  },
  editor: {
    theme: 'light',
    fontSize: 14,
    tabSize: 2,
    insertSpaces: true,
    autoSave: true,
    syntaxHighlighting: true
  },
  recentFiles: [],
  app: {
    version: '0.0.0',
    lastOpened: new Date().toISOString(),
    language: 'ja'
  }
};

export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;
  private configFileName: string;

  private constructor() {
    this.configFileName = 'app-config.json';
    this.config = { ...DEFAULT_CONFIG };
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public async initialize(): Promise<void> {
    try {
      // configディレクトリを初期化
      await configFileManager.initializeConfigDirectory();
      
      // 設定ファイルを読み込み
      await this.loadConfig();
    } catch (error) {
      console.error('Failed to initialize config:', error);
      // エラーの場合はデフォルト設定を使用
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  /**
   * 最終起動時刻を更新
   */
  public async updateLastOpened(): Promise<void> {
    try {
      this.config.app.lastOpened = new Date().toISOString();
      await this.saveConfig();
    } catch (error) {
      console.error('Failed to update last opened timestamp:', error);
    }
  }

  public async loadConfig(): Promise<void> {
    try {
      const configData = await configFileManager.readConfigFile(this.configFileName);
      const loadedConfig = JSON.parse(configData);
      
      // デフォルト設定とマージ（新しい設定項目に対応）
      this.config = this.mergeWithDefaults(loadedConfig);
      
      // セキュリティ設定の不整合をチェックして修正
      this.fixSecurityModeInconsistency();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.config = { ...DEFAULT_CONFIG };
        // 初回起動時のみデフォルト設定を保存
        await this.saveConfig();
      } else {
        console.error('Error loading config:', error);
        // 読み込みエラーの場合は既存の設定を保持
      }
    }
  }

  public async saveConfig(): Promise<void> {
    try {
      const configData = JSON.stringify(this.config, null, 2);
      
      //console.log('=== SAVING CONFIG ===');
      //console.log('Current config being saved:');
      //console.log('Editor theme:', this.config.editor.theme);
      //console.log('Editor fontSize:', this.config.editor.fontSize);
      //console.log('Editor fontFamily:', this.config.editor.fontFamily);
      //console.log('Editor wordWrap:', this.config.editor.wordWrap);
      //console.log('Editor lineNumbers:', this.config.editor.lineNumbers);
      //console.log('Editor autoSaveInterval:', this.config.editor.autoSaveInterval);
      //console.log('Full config JSON:');
      //console.log(configData);
      //console.log('=== END CONFIG ===');
      
      await configFileManager.writeConfigFile(this.configFileName, configData);
      //console.log('Config saved successfully');
    } catch (error) {
      console.error('Failed to save config:', error);
    }
  }

  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<AppConfig>): void {
    // 深いマージを先に実行（シャローコピーで上書きされる前に）
    if (updates.security) {
      this.config.security = { ...this.config.security, ...updates.security };
    }
    if (updates.window) {
      this.config.window = { ...this.config.window, ...updates.window };
    }
    if (updates.panels) {
      this.config.panels = { ...this.config.panels, ...updates.panels };
    }
    if (updates.editor) {
      this.config.editor = { ...this.config.editor, ...updates.editor };
    }
    if (updates.app) {
      this.config.app = { ...this.config.app, ...updates.app };
    }
    if (updates.recentFiles) {
      this.config.recentFiles = [...updates.recentFiles];
    }
    if (updates.lastOpenedFile !== undefined) {
      this.config.lastOpenedFile = updates.lastOpenedFile;
    }
    
    // 残りのプロパティはシャローコピーで更新
    const remainingUpdates = { ...updates };
    delete remainingUpdates.security;
    delete remainingUpdates.window;
    delete remainingUpdates.panels;
    delete remainingUpdates.editor;
    delete remainingUpdates.app;
    delete remainingUpdates.recentFiles;
    delete remainingUpdates.lastOpenedFile;
    
    this.config = { ...this.config, ...remainingUpdates };
  }

  // 最後に開いたファイルを設定
  public async setLastOpenedFile(filePath: string | null): Promise<void> {
    if (filePath) {
      this.config.lastOpenedFile = filePath;
    } else {
      delete this.config.lastOpenedFile;
    }
    await this.saveConfig();
  }

  // 最後に開いたファイルを取得
  public getLastOpenedFile(): string | undefined {
    return this.config.lastOpenedFile;
  }

  /**
   * セキュリティモード設定の不整合を修正
   * security.mode と general.securityMode の間に不整合がある場合、general.securityMode を優先
   */
  private fixSecurityModeInconsistency(): void {
    const securityMode = this.config.security?.mode;
    const generalSecurityMode = this.config.general?.securityMode;
    
    // general.securityMode が存在し、security.mode と異なる場合は統一
    if (generalSecurityMode && securityMode !== generalSecurityMode) {
      this.config.security.mode = generalSecurityMode;
      this.config.security.allowWasm = generalSecurityMode === 'developer';
      this.config.security.allowCodeExecution = generalSecurityMode === 'developer';
    }
  }

  public async setSecurityMode(mode: 'secure' | 'developer'): Promise<void> {
    this.config.security.mode = mode;
    this.config.security.allowWasm = mode === 'developer';
    this.config.security.allowCodeExecution = mode === 'developer';
    
    // general.securityMode も同期
    if (this.config.general) {
      this.config.general.securityMode = mode;
    }
    
    await this.saveConfig();
  }

  public async updateWindowState(bounds: Electron.Rectangle, maximized: boolean): Promise<void> {
    this.config.window = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      maximized
    };
    await this.saveConfig();
  }

  public async updatePanelWidth(panel: 'sidebar', width: number): Promise<void> {
    if (panel === 'sidebar') {
      this.config.panels.sidebarWidth = width;
      await this.saveConfig();
    }
  }

  public async addRecentFile(filePath: string): Promise<void> {
    // 既存のファイルを削除
    this.config.recentFiles = this.config.recentFiles.filter(f => f !== filePath);
    
    // 先頭に追加
    this.config.recentFiles.unshift(filePath);
    
    // 最大10件まで保持
    if (this.config.recentFiles.length > 10) {
      this.config.recentFiles = this.config.recentFiles.slice(0, 10);
    }
    
    await this.saveConfig();
  }

  private mergeWithDefaults(loadedConfig: Partial<AppConfig>): AppConfig {
    const result: AppConfig = { ...DEFAULT_CONFIG };
    
    // 各プロパティを個別にマージ
    if (loadedConfig.security) {
      result.security = { ...DEFAULT_CONFIG.security, ...loadedConfig.security };
    }
    if (loadedConfig.window) {
      result.window = { ...DEFAULT_CONFIG.window, ...loadedConfig.window };
    }
    if (loadedConfig.panels) {
      result.panels = { ...DEFAULT_CONFIG.panels, ...loadedConfig.panels };
    }
    if (loadedConfig.editor) {
      result.editor = { ...DEFAULT_CONFIG.editor, ...loadedConfig.editor };
    }
    if (loadedConfig.app) {
      result.app = { ...DEFAULT_CONFIG.app, ...loadedConfig.app };
    }
    if (loadedConfig.recentFiles) {
      result.recentFiles = [...loadedConfig.recentFiles];
    }
    if (loadedConfig.lastOpenedFile !== undefined) {
      result.lastOpenedFile = loadedConfig.lastOpenedFile;
    }
    if (loadedConfig.files) {
      result.files = { ...loadedConfig.files };
    }
    if (loadedConfig.general) {
      result.general = { ...loadedConfig.general };
    }
    
    return result;
  }

  public getConfigPath(): string {
    return configFileManager.getConfigFilePath(this.configFileName);
  }

  public getConfigDir(): string {
    return configFileManager.getConfigDirectory();
  }

  /**
   * ノート保存用のディレクトリパスを取得
   * OS別の適切なアプリケーションデータディレクトリを使用
   */
  public getNotesDirectory(): string {
    let appDataPath: string;
    
    switch (process.platform) {
      case 'win32':
        // Windows: %APPDATA%\take_note\Notes
        appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
        break;
      case 'darwin':
        // macOS: ~/Library/Application Support/take_note/Notes
        appDataPath = path.join(os.homedir(), 'Library', 'Application Support');
        break;
      case 'linux':
      default:
        // Linux: ~/.config/take_note/Notes または $XDG_CONFIG_HOME/take_note/Notes
        appDataPath = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
        break;
    }
    
    return path.join(appDataPath, 'take_note', 'Notes');
  }

  /**
   * 指定されたファイル名でノートの完全パスを取得
   */
  public getNotePath(fileName: string): string {
    return path.join(this.getNotesDirectory(), fileName);
  }
}
