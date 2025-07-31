/**
 * アプリケーション設定管理クラス
 */

export interface EditorConfig {
  theme: 'light' | 'dark' | 'auto';
  fontSize: number;
  fontFamily: string;
  wordWrap: boolean;
  lineNumbers: boolean;
}

export interface FilesConfig {
  defaultSaveLocation: string;
  autoSave: boolean;
  autoSaveInterval: number;
  maxRecentFiles: number;
}

export interface GeneralConfig {
  language: 'ja' | 'en';
  checkUpdates: boolean;
  telemetry: boolean;
  securityMode: 'secure' | 'developer';
}

export interface AppConfig {
  editor: EditorConfig;
  files: FilesConfig;
  general: GeneralConfig;
}

export class AppConfigManager {
  private static instance: AppConfigManager;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): AppConfigManager {
    if (!AppConfigManager.instance) {
      AppConfigManager.instance = new AppConfigManager();
    }
    return AppConfigManager.instance;
  }

  /**
   * デフォルト設定を取得
   */
  getDefaultConfig(): AppConfig {
    return {
      editor: {
        theme: 'auto',
        fontSize: 14,
        fontFamily: 'Consolas, Monaco, monospace',
        wordWrap: true,
        lineNumbers: true
      },
      files: {
        defaultSaveLocation: '',
        autoSave: true,
        autoSaveInterval: 30,
        maxRecentFiles: 10
      },
      general: {
        language: 'ja',
        checkUpdates: true,
        telemetry: false,
        securityMode: 'secure'
      }
    };
  }

  /**
   * 設定の妥当性を検証
   */
  validateConfig(config: AppConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // エディタ設定の検証
    if (config.editor.fontSize < 8 || config.editor.fontSize > 72) {
      errors.push('フォントサイズは8〜72の範囲で入力してください');
    }

    if (!config.editor.fontFamily.trim()) {
      errors.push('フォントファミリーを入力してください');
    }

    // ファイル設定の検証
    if (config.files.autoSaveInterval < 5) {
      errors.push('自動保存間隔は5秒以上に設定してください');
    }

    if (config.files.maxRecentFiles < 0 || config.files.maxRecentFiles > 100) {
      errors.push('最近のファイル保持数は0〜100の範囲で入力してください');
    }

    // 一般設定の検証
    if (!['ja', 'en'].includes(config.general.language)) {
      errors.push('無効な言語設定です');
    }

    if (!['secure', 'developer'].includes(config.general.securityMode)) {
      errors.push('無効なセキュリティモード設定です');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 設定をディープコピー
   */
  cloneConfig(config: AppConfig): AppConfig {
    return JSON.parse(JSON.stringify(config));
  }

  /**
   * 設定の差分を取得
   */
  getConfigDiff(oldConfig: AppConfig, newConfig: AppConfig): Partial<AppConfig> {
    const diff: Partial<AppConfig> = {};

    // エディタ設定の差分
    const editorDiff: Partial<EditorConfig> = {};
    Object.keys(newConfig.editor).forEach(key => {
      const editorKey = key as keyof EditorConfig;
      if (oldConfig.editor[editorKey] !== newConfig.editor[editorKey]) {
        (editorDiff as Record<string, unknown>)[editorKey] = newConfig.editor[editorKey];
      }
    });
    if (Object.keys(editorDiff).length > 0) {
      diff.editor = editorDiff;
    }

    // ファイル設定の差分
    const filesDiff: Partial<FilesConfig> = {};
    Object.keys(newConfig.files).forEach(key => {
      const filesKey = key as keyof FilesConfig;
      if (oldConfig.files[filesKey] !== newConfig.files[filesKey]) {
        (filesDiff as Record<string, unknown>)[filesKey] = newConfig.files[filesKey];
      }
    });
    if (Object.keys(filesDiff).length > 0) {
      diff.files = filesDiff;
    }

    // 一般設定の差分
    const generalDiff: Partial<GeneralConfig> = {};
    Object.keys(newConfig.general).forEach(key => {
      const generalKey = key as keyof GeneralConfig;
      if (oldConfig.general[generalKey] !== newConfig.general[generalKey]) {
        (generalDiff as Record<string, unknown>)[generalKey] = newConfig.general[generalKey];
      }
    });
    if (Object.keys(generalDiff).length > 0) {
      diff.general = generalDiff;
    }

    return diff;
  }

  /**
   * 設定をマージ
   */
  mergeConfig(baseConfig: AppConfig, updates: Partial<AppConfig>): AppConfig {
    const merged = this.cloneConfig(baseConfig);

    if (updates.editor) {
      Object.assign(merged.editor, updates.editor);
    }

    if (updates.files) {
      Object.assign(merged.files, updates.files);
    }

    if (updates.general) {
      Object.assign(merged.general, updates.general);
    }

    return merged;
  }

  /**
   * 設定をJSONに変換
   */
  configToJSON(config: AppConfig): string {
    return JSON.stringify(config, null, 2);
  }

  /**
   * JSONから設定を復元
   */
  configFromJSON(json: string): AppConfig {
    try {
      const parsed = JSON.parse(json);
      const defaultConfig = this.getDefaultConfig();
      return this.mergeConfig(defaultConfig, parsed);
    } catch (error) {
      console.error('Failed to parse config JSON:', error);
      return this.getDefaultConfig();
    }
  }

  /**
   * 設定をローカルストレージに保存
   */
  saveToLocalStorage(config: AppConfig, key: string = 'appConfig'): void {
    try {
      localStorage.setItem(key, this.configToJSON(config));
    } catch (error) {
      console.error('Failed to save config to localStorage:', error);
    }
  }

  /**
   * ローカルストレージから設定を読み込み
   */
  loadFromLocalStorage(key: string = 'appConfig'): AppConfig | null {
    try {
      const json = localStorage.getItem(key);
      return json ? this.configFromJSON(json) : null;
    } catch (error) {
      console.error('Failed to load config from localStorage:', error);
      return null;
    }
  }
}

/**
 * グローバルインスタンスを取得するヘルパー関数
 */
export function useAppConfigManager(): AppConfigManager {
  return AppConfigManager.getInstance();
}
