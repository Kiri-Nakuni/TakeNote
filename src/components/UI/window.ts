import { BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';

// モジュールスコープでウィンドウインスタンスを保持
let mainWindow: BrowserWindow | null = null;

/**
 * メインウィンドウのインスタンスを取得します。
 * @returns {BrowserWindow | null} メインウィンドウのインスタンス、または存在しない場合はnull
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * アプリケーションのメインウィンドウを作成し、表示します。
 * 既存のウィンドウがある場合は何もしません。
 */
export function createWindow(): void {
  if (mainWindow) {
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Viteはpreload.tsをdist-electron/preload.jsに出力します。
      // main.jsもdist-electron/main.jsに出力されるため、__dirnameはdist-electronを指します。
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // Vite DEV server URL.
  // vite-plugin-electronが開発時にこの環境変数を設定します。
  const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
  
  if (VITE_DEV_SERVER_URL) {
    // 開発時はVite開発サーバーのURLを読み込みます。
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // 本番時はビルドされたindex.htmlを読み込みます。
    // __dirname は `dist-electron` を指し、index.html はプロジェクトルートからビルドされて `dist` に配置されます。
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // ウィンドウが閉じられたときの処理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * ウィンドウ関連のIPCハンドラを初期化します。
 */
export function initializeWindowEvents(): void {
  // ウィンドウタイトルを更新するIPCハンドラ
  ipcMain.on('update-title', (event, filePath: string | null) => {
    if (mainWindow) {
      if (filePath) {
        // .tan拡張子を削除し、パスを整形
        const titlePath = filePath.replace(/\.tan$/, '');
        mainWindow.setTitle(`take_note - ${titlePath}`);
      } else {
        // ファイルが開かれていない場合（新規ノートなど）
        mainWindow.setTitle('take_note - New Note');
      }
    }
  });
}