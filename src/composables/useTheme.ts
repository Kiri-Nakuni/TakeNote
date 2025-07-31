import { ref, onMounted } from 'vue';

export type ThemeMode = 'light' | 'dark' | 'auto';

// Window API型定義
interface WindowAPI {
  api: {
    config: {
      get: () => Promise<Record<string, unknown>>;
      update: (config: Record<string, unknown>) => Promise<void>;
    };
    appTheme?: {
      setWindowTheme?: (theme: string) => void;
    };
  };
}

const currentTheme = ref<ThemeMode>('auto');
const isDark = ref(false);

export function useTheme(): {
  currentTheme: typeof currentTheme;
  isDark: typeof isDark;
  setTheme: (theme: ThemeMode) => void;
  loadTheme: () => Promise<void>;
  saveTheme: () => Promise<void>;
  applyTheme: (theme: ThemeMode) => void;
  setupSystemThemeListener: () => () => void;
} {
  const applyTheme = (theme: ThemeMode): void => {
    const root = document.documentElement;
    
    if (theme === 'auto') {
      // システム設定に従う
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.removeAttribute('data-theme');
      isDark.value = prefersDark;
    } else {
      root.setAttribute('data-theme', theme);
      isDark.value = theme === 'dark';
    }
    
    // テーマが適用されたことを示すフラグを設定
    // これによりindex.htmlのシステムテーマが有効になる
    root.setAttribute('data-theme-ready', 'true');
    
    // ウィンドウフレームの色を更新
    updateWindowFrame(isDark.value);
  };

  const updateWindowFrame = (dark: boolean): void => {
    try {
      // Electronのウィンドウフレーム色を更新
      const win = window as unknown as WindowAPI;
      if (win.api?.appTheme?.setWindowTheme) {
        win.api.appTheme.setWindowTheme(dark ? 'dark' : 'light');
      }
    } catch (error) {
      console.warn('ウィンドウフレーム色の更新に失敗:', error);
    }
  };

  const setTheme = (theme: ThemeMode): void => {
    currentTheme.value = theme;
    applyTheme(theme);
    // 注意: ここでは保存しない（明示的なsaveTheme呼び出しでのみ保存）
  };

  const saveTheme = async (): Promise<void> => {
    // 現在の設定から最新のテーマ値を取得して保存
    try {
      const win = window as unknown as WindowAPI;
      if (win.api?.config) {
        // 最新の設定を取得
        const currentConfig = await win.api.config.get();
        const editorConfig = currentConfig.editor as Record<string, unknown> | undefined;
        const themeToSave = editorConfig?.theme as ThemeMode;
        
        console.log(`Saving theme from settings: ${themeToSave}`);
        
        // テーマを適用
        currentTheme.value = themeToSave;
        applyTheme(themeToSave);
        
        console.log(`Theme applied and saved: ${themeToSave}`);
      }
    } catch (error) {
      console.warn('テーマ設定の保存に失敗:', error);
      throw error;
    }
  };

  const loadTheme = async (): Promise<void> => {
    try {
      const win = window as unknown as WindowAPI;
      if (win.api?.config?.get) {
        const config = await win.api.config.get();
        const editorConfig = config.editor as Record<string, unknown> | undefined;
        const savedTheme = editorConfig?.theme as ThemeMode;
        if (savedTheme) {
          currentTheme.value = savedTheme;
        }
      }
    } catch (error) {
      console.warn('テーマ設定の読み込みに失敗:', error);
    }
    
    // applyThemeのみ実行（保存はしない）
    applyTheme(currentTheme.value);
  };

  // システムテーマ変更の監視
  const setupSystemThemeListener = (): (() => void) => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (): void => {
      if (currentTheme.value === 'auto') {
        applyTheme('auto');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  };

  onMounted(() => {
    loadTheme();
    setupSystemThemeListener();
  });

  // 注意: 自動的なwatch監視を削除
  // テーマ変更は明示的なsetTheme呼び出しでのみ適用される

  return {
    currentTheme,
    isDark,
    setTheme,
    loadTheme,
    saveTheme,
    applyTheme,
    setupSystemThemeListener
  };
}
