import { createApp } from 'vue'
import App from './App.vue'
import './assets/themes.css'

// テーマの早期初期化
async function initializeTheme(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    if (win.api?.config?.get) {
      const config = await win.api.config.get();
      const theme = config.editor?.theme || 'auto';
      
      const root = document.documentElement;
      if (theme === 'auto') {
        // システムテーマの場合は data-theme 属性を削除
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', theme);
      }
      
      // テーマ準備完了フラグを設定
      root.setAttribute('data-theme-ready', 'true');
    }
  } catch (error) {
    // エラーが発生してもアプリは起動する
    console.warn('テーマの早期初期化に失敗:', error);
    // フォールバックとして準備完了フラグだけ設定
    document.documentElement.setAttribute('data-theme-ready', 'true');
  }
}

// アプリ起動前にテーマを初期化
initializeTheme().then(() => {
  createApp(App).mount('#app');
});
