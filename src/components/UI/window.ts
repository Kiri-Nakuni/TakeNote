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
      // コンパイル後のJSファイルからの相対パスを構築します。
      // (dist/components/UI/window.js -> dist/preload/preload.js)
      preload: path.join(__dirname, '..', '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // 新しいパスのindex.htmlをロード
  mainWindow.loadFile('src/renderer/general/index.html');

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