import { ref, watch, readonly, type Ref } from 'vue';
import type { FontSize } from '@/types/settings';
import { SettingsConverter } from '@/types/settings';

interface UseFontSizeReturn {
  currentFontSize: Readonly<Ref<FontSize>>;
  setFontSizeLevel: (level: FontSize) => void;
  initializeFontSize: (level?: FontSize) => void;
  applyFontSizeToApp: (level: FontSize) => void;
}

// アプリケーション全体のフォントサイズを管理するコンポーザブル
export function useFontSize(): UseFontSizeReturn {
  const currentFontSize = ref<FontSize>('medium');

  // フォントサイズレベルを設定
  function setFontSizeLevel(level: FontSize): void {
    currentFontSize.value = level;
    applyFontSizeToApp(level);
  }

  // アプリケーション全体にフォントサイズを適用
  function applyFontSizeToApp(level: FontSize): void {
    const fontSize = SettingsConverter.fontSizeLevelToNumber(level);
    
    // CSS カスタムプロパティを設定
    const root = document.documentElement;
    
    // 基本フォントサイズ
    root.style.setProperty('--app-font-size', `${fontSize}px`);
    
    // 相対的なフォントサイズを設定（基本サイズに基づく）
    const smallSize = Math.max(10, Math.round(fontSize * 0.85));
    const largeSize = Math.round(fontSize * 1.15);
    const xlargeSize = Math.round(fontSize * 1.3);
    
    root.style.setProperty('--app-font-size-small', `${smallSize}px`);
    root.style.setProperty('--app-font-size-large', `${largeSize}px`);
    root.style.setProperty('--app-font-size-xlarge', `${xlargeSize}px`);
    
    // エディタ用のフォントサイズも設定
    root.style.setProperty('--editor-font-size', `${fontSize}px`);
    
    console.log(`フォントサイズレベル "${level}" (${fontSize}px) をアプリケーションに適用しました`);
    console.log(`相対サイズ - 小: ${smallSize}px, 大: ${largeSize}px, 特大: ${xlargeSize}px`);
  }

  // 設定変更の監視
  watch(currentFontSize, (newLevel) => {
    applyFontSizeToApp(newLevel);
  });

  // 初期化時にデフォルト設定を適用
  function initializeFontSize(level: FontSize = 'medium'): void {
    setFontSizeLevel(level);
  }

  return {
    currentFontSize: readonly(currentFontSize),
    setFontSizeLevel,
    initializeFontSize,
    applyFontSizeToApp
  };
}
