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
  private defaultConfig: AppConfig;

  private constructor() {
    this.defaultConfig = {
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
    return JSON.parse(JSON.stringify(this.defaultConfig));
  }

  /**
   * 設定の検証
   */
  validateConfig(config: AppConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // エディタ設定の検証
    if (config.editor.fontSize < 8 || config.editor.fontSize > 72) {
      errors.push('フォントサイズは8〜72の範囲で入力してください');
    }

    if (!config.editor.fontFamily.trim()) {
      errors.push('フォントファミリーは必須です');
    }

    // ファイル設定の検証
    if (config.files.autoSave && config.files.autoSaveInterval < 5) {
      errors.push('自動保存間隔は5秒以上に設定してください');
    }

    if (config.files.maxRecentFiles < 0 || config.files.maxRecentFiles > 100) {
      errors.push('最近のファイル保持数は0〜100の範囲で設定してください');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 設定をマージ
   */
  mergeConfig(baseConfig: AppConfig, updates: Partial<AppConfig>): AppConfig {
    const merged = JSON.parse(JSON.stringify(baseConfig));

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
   * 設定をJSON形式で保存
   */
  configToJSON(config: AppConfig): string {
    return JSON.stringify(config, null, 2);
  }

  /**
   * JSON形式から設定を復元
   */
  configFromJSON(json: string): AppConfig | null {
    try {
      const parsed = JSON.parse(json);
      return this.mergeConfig(this.defaultConfig, parsed);
    } catch (error) {
      console.error('Failed to parse config JSON:', error);
      return null;
    }
  }

  /**
   * 設定のディープコピー
   */
  cloneConfig(config: AppConfig): AppConfig {
    return JSON.parse(JSON.stringify(config));
  }

  /**
   * 設定の比較
   */
  configsEqual(config1: AppConfig, config2: AppConfig): boolean {
    return JSON.stringify(config1) === JSON.stringify(config2);
  }

  /**
   * 設定を安全な値に正規化
   */
  normalizeConfig(config: Partial<AppConfig>): AppConfig {
    const normalized = this.getDefaultConfig();

    if (config.editor) {
      normalized.editor.theme = ['light', 'dark', 'auto'].includes(config.editor.theme as string) 
        ? config.editor.theme as EditorConfig['theme'] 
        : 'auto';
      
      normalized.editor.fontSize = Math.max(8, Math.min(72, config.editor.fontSize || 14));
      normalized.editor.fontFamily = config.editor.fontFamily?.trim() || normalized.editor.fontFamily;
      normalized.editor.wordWrap = Boolean(config.editor.wordWrap);
      normalized.editor.lineNumbers = Boolean(config.editor.lineNumbers);
    }

    if (config.files) {
      normalized.files.defaultSaveLocation = config.files.defaultSaveLocation || '';
      normalized.files.autoSave = Boolean(config.files.autoSave);
      normalized.files.autoSaveInterval = Math.max(5, config.files.autoSaveInterval || 30);
      normalized.files.maxRecentFiles = Math.max(0, Math.min(100, config.files.maxRecentFiles || 10));
    }

    if (config.general) {
      normalized.general.language = ['ja', 'en'].includes(config.general.language as string)
        ? config.general.language as GeneralConfig['language']
        : 'ja';
      
      normalized.general.checkUpdates = Boolean(config.general.checkUpdates);
      normalized.general.telemetry = Boolean(config.general.telemetry);
      
      normalized.general.securityMode = ['secure', 'developer'].includes(config.general.securityMode as string)
        ? config.general.securityMode as GeneralConfig['securityMode']
        : 'secure';
    }

    return normalized;
  }
}
