import { ref, computed, watch, type Ref, type ComputedRef } from 'vue';
import type { AppSettings } from '@/types/settings';
import { defaultSettings, SettingsConverter } from '@/types/settings';
import { ModalManager } from '@/utils/modalManager';
import { useFontSize } from '@/composables/useFontSize';

interface WindowSettingsApi {
  config: {
    get: () => Promise<Record<string, unknown>>;
    update: (updates: Record<string, unknown>) => Promise<unknown>;
    getNotesDirectory: () => Promise<string>;
  };
}

interface UseSettingsReturn {
  settings: Ref<AppSettings>;
  originalSettings: Ref<AppSettings>;
  saving: Ref<boolean>;
  hasChanges: ComputedRef<boolean>;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<boolean>;
  resetSettings: () => Promise<void>;
  updateSettings: (newSettings: AppSettings) => void;
  initializeSettings: (initialSettings?: AppSettings) => void;
}

export function useSettings(): UseSettingsReturn {
  const settings = ref<AppSettings>({ ...defaultSettings });
  const originalSettings = ref<AppSettings>({ ...defaultSettings });
  const saving = ref(false);

  // テーマとフォントサイズ管理
  const { setFontSizeLevel } = useFontSize();

  const hasChanges = computed(() => {
    return JSON.stringify(settings.value) !== JSON.stringify(originalSettings.value);
  });

  // 設定変更の監視
  watch(settings, () => {
    // 自動保存が無効の場合は間隔設定も無効にする
    if (!settings.value.editor.autoSave) {
      settings.value.editor.autoSaveInterval = defaultSettings.editor.autoSaveInterval;
    }
  }, { deep: true });

  // テーマとフォントサイズの変更を監視
  // テーマ適用は明示的な保存時のみ行うため、自動適用を削除
  // watch(() => settings.value.editor.theme, (newTheme) => {
  //   console.log('Theme changed to:', newTheme);
  //   setTheme(newTheme as ThemeMode);
  // }, { immediate: true });

  watch(() => settings.value.display.fontSizeLevel, (newFontSize) => {
    console.log('Font size level changed to:', newFontSize);
    setFontSizeLevel(newFontSize);
  }, { immediate: true });

  async function loadSettings(): Promise<void> {
    try {
      const windowApi = (window as unknown as { api: WindowSettingsApi }).api;
      
      // 設定を取得
      const config = await windowApi.config.get();
      console.log('Raw config from main process:', config);
      
      // 新しい設定形式に変換
      settings.value = SettingsConverter.fromLegacyConfig(config);
      console.log('Converted settings:', settings.value);
      
      // Notesディレクトリを取得
      try {
        const notesDir = await windowApi.config.getNotesDirectory();
        if (notesDir) {
          settings.value.files.defaultSaveLocation = notesDir;
        }
      } catch (error) {
        console.error('Notesディレクトリの取得に失敗しました:', error);
        settings.value.files.defaultSaveLocation = 'エラー: ディレクトリを取得できません';
      }
      
      originalSettings.value = JSON.parse(JSON.stringify(settings.value));
      
      // 読み込み後にフォントサイズのみ適用（テーマは明示的保存時のみ）
      console.log('Applying font size:', settings.value.display.fontSizeLevel);
      setFontSizeLevel(settings.value.display.fontSizeLevel);
    } catch (error) {
      console.error('設定読み込みでエラーが発生しました:', error);
      // エラーの場合はデフォルト設定を使用
      settings.value = { ...defaultSettings };
      originalSettings.value = JSON.parse(JSON.stringify(settings.value));
      
      // デフォルト設定のフォントサイズのみ適用（テーマは明示的保存時のみ）
      setFontSizeLevel(defaultSettings.display.fontSizeLevel);
    }
  }

  async function saveSettings(): Promise<boolean> {
    try {
      saving.value = true;
      
      // 設定の検証
      if (settings.value.editor.fontSize < 8 || settings.value.editor.fontSize > 72) {
        const modalManager = ModalManager.getInstance();
        await modalManager.alert('フォントサイズは8〜72の範囲で入力してください', '入力エラー', 'warning');
        saving.value = false;
        return false;
      }
      
      if (settings.value.editor.autoSaveInterval < 5) {
        const modalManager = ModalManager.getInstance();
        await modalManager.alert('自動保存間隔は5秒以上に設定してください', '入力エラー', 'warning');
        saving.value = false;
        return false;
      }

      const windowApi = (window as unknown as { api: WindowSettingsApi }).api;
      
      // 新しい設定形式を古い形式に変換
      const configUpdates = SettingsConverter.toLegacyConfig(settings.value);
      
      await windowApi.config.update(configUpdates);
      
      // 成功したら現在の設定を保存済み設定として記録
      originalSettings.value = JSON.parse(JSON.stringify(settings.value));
      
      // 保存状態をリセット（モーダル表示前に）
      saving.value = false;
      
      // モーダルで成功メッセージを表示
      const modalManager = ModalManager.getInstance();
      await modalManager.alert('設定が保存されました', '保存完了', 'info');
      
      return true;
    } catch (error) {
      console.error('設定保存でエラーが発生しました:', error);
      saving.value = false;
      const modalManager = ModalManager.getInstance();
      await modalManager.alert('設定の保存に失敗しました', 'エラー', 'error');
      return false;
    }
  }

  async function resetSettings(): Promise<void> {
    const modalManager = ModalManager.getInstance();
    const confirmed = await modalManager.confirm('設定をデフォルトに戻しますか？', '設定リセット');
    
    if (confirmed) {
      settings.value = { ...defaultSettings };
    }
  }

  function updateSettings(newSettings: AppSettings): void {
    settings.value = { ...newSettings };
  }

  function initializeSettings(initialSettings?: AppSettings): void {
    if (initialSettings) {
      console.log('Initializing with provided settings:', initialSettings);
      settings.value = JSON.parse(JSON.stringify(initialSettings));
      originalSettings.value = JSON.parse(JSON.stringify(initialSettings));
      
      // フォントサイズのみ即座に適用（テーマは明示的保存時のみ）
      setFontSizeLevel(initialSettings.display.fontSizeLevel);
    } else {
      console.log('Loading settings from main process...');
      loadSettings();
    }
  }

  return {
    settings,
    originalSettings,
    saving,
    hasChanges,
    loadSettings,
    saveSettings,
    resetSettings,
    updateSettings,
    initializeSettings,
  };
}
