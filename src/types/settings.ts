// 設定関連の型定義とデフォルト値

export type ThemeMode = 'light' | 'dark' | 'auto';
export type FontSize = 'small' | 'medium' | 'large';
export type SecurityMode = 'secure' | 'developer';

// エディタ設定
export interface EditorSettings {
  theme: ThemeMode;
  fontSize: number;
  fontFamily: string;
  wordWrap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
}

// ファイル設定
export interface FileSettings {
  defaultSaveLocation: string;
  maxRecentFiles: number;
  confirmDelete: boolean;
}

// 一般設定
export interface GeneralSettings {
  language: string;
  checkUpdates: boolean;
  telemetry: boolean;
  securityMode: SecurityMode;
}

// 表示設定
export interface DisplaySettings {
  showLineNumbers: boolean;
  fontSizeLevel: FontSize;
}

// 検索設定
export interface SearchSettings {
  maxSearchResults: number;
  searchHighlight: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

// 統合設定インターフェース
export interface AppSettings {
  editor: EditorSettings;
  files: FileSettings;
  general: GeneralSettings;
  display: DisplaySettings;
  search: SearchSettings;
}

// デフォルト設定値
export const defaultSettings: AppSettings = {
  editor: {
    theme: 'auto',
    fontSize: 14,
    fontFamily: 'Consolas, Monaco, monospace',
    wordWrap: true,
    lineNumbers: true,
    autoSave: true,
    autoSaveInterval: 30
  },
  files: {
    defaultSaveLocation: '',
    maxRecentFiles: 10,
    confirmDelete: true
  },
  general: {
    language: 'ja',
    checkUpdates: true,
    telemetry: false,
    securityMode: 'secure'
  },
  display: {
    showLineNumbers: true,
    fontSizeLevel: 'medium'
  },
  search: {
    maxSearchResults: 100,
    searchHighlight: true,
    caseSensitive: false,
    wholeWord: false,
    useRegex: false
  }
};

// 設定変換ユーティリティ
export class SettingsConverter {
  // 古い設定形式から新しい形式に変換
  static fromLegacyConfig(config: Record<string, unknown>): AppSettings {
    const editor = config.editor as Record<string, unknown> || {};
    const files = config.files as Record<string, unknown> || {};
    const general = config.general as Record<string, unknown> || {};
    const display = config.display as Record<string, unknown> || {};
    const search = config.search as Record<string, unknown> || {};

    return {
      editor: {
        theme: (editor.theme as ThemeMode) || defaultSettings.editor.theme,
        fontSize: (editor.fontSize as number) || defaultSettings.editor.fontSize,
        fontFamily: (editor.fontFamily as string) || defaultSettings.editor.fontFamily,
        wordWrap: (editor.wordWrap as boolean) ?? defaultSettings.editor.wordWrap,
        lineNumbers: (editor.lineNumbers as boolean) ?? defaultSettings.editor.lineNumbers,
        autoSave: (editor.autoSave as boolean) ?? defaultSettings.editor.autoSave,
        autoSaveInterval: (editor.autoSaveInterval as number) || defaultSettings.editor.autoSaveInterval
      },
      files: {
        defaultSaveLocation: (files.defaultSaveLocation as string) || '',
        maxRecentFiles: (files.maxRecentFiles as number) || defaultSettings.files.maxRecentFiles,
        confirmDelete: (files.confirmDelete as boolean) ?? defaultSettings.files.confirmDelete
      },
      general: {
        language: (general.language as string) || defaultSettings.general.language,
        checkUpdates: (general.checkUpdates as boolean) ?? defaultSettings.general.checkUpdates,
        telemetry: (general.telemetry as boolean) ?? defaultSettings.general.telemetry,
        securityMode: (general.securityMode as SecurityMode) || defaultSettings.general.securityMode
      },
      display: {
        showLineNumbers: (display.showLineNumbers as boolean) ?? defaultSettings.display.showLineNumbers,
        fontSizeLevel: (display.fontSizeLevel as FontSize) || defaultSettings.display.fontSizeLevel
      },
      search: {
        maxSearchResults: (search.maxSearchResults as number) || defaultSettings.search.maxSearchResults,
        searchHighlight: (search.searchHighlight as boolean) ?? defaultSettings.search.searchHighlight,
        caseSensitive: (search.caseSensitive as boolean) ?? defaultSettings.search.caseSensitive,
        wholeWord: (search.wholeWord as boolean) ?? defaultSettings.search.wholeWord,
        useRegex: (search.useRegex as boolean) ?? defaultSettings.search.useRegex
      }
    };
  }

  // 新しい設定形式から古い形式に変換（後方互換性のため）
  static toLegacyConfig(settings: AppSettings): Record<string, unknown> {
    return {
      editor: {
        theme: settings.editor.theme,
        fontSize: settings.editor.fontSize,
        fontFamily: settings.editor.fontFamily,
        wordWrap: settings.editor.wordWrap,
        lineNumbers: settings.editor.lineNumbers,
        autoSave: settings.editor.autoSave,
        autoSaveInterval: settings.editor.autoSaveInterval
      },
      files: {
        defaultSaveLocation: settings.files.defaultSaveLocation,
        maxRecentFiles: settings.files.maxRecentFiles,
        confirmDelete: settings.files.confirmDelete
      },
      general: {
        language: settings.general.language,
        checkUpdates: settings.general.checkUpdates,
        telemetry: settings.general.telemetry,
        securityMode: settings.general.securityMode
      }
    };
  }

  // フォントサイズレベルを数値に変換
  static fontSizeLevelToNumber(level: FontSize): number {
    switch (level) {
      case 'small': return 12;
      case 'medium': return 14;
      case 'large': return 18;
      default: return 14;
    }
  }

  // 数値をフォントサイズレベルに変換
  static numberToFontSizeLevel(size: number): FontSize {
    if (size <= 12) return 'small';
    if (size >= 18) return 'large';
    return 'medium';
  }
}
