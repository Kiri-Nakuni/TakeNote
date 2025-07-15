// main.ts
import { app, ipcMain, dialog, BrowserWindow, IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import path from 'node:path';
import fs from 'fs/promises';
import AdmZip from 'adm-zip';

// `window.ts` は `src` ディレクトリ内にあるため、パスを修正してインポートします。
import { createWindow, initializeWindowEvents } from '@/components/UI/window';


// --- 型定義 ---

/** エラー情報の型 */
interface ErrorInfo {
  message: string;
  stack?: string;
}

/** ログエントリの型 */
interface LogEntry {
  timestamp: string;
  type: 'main:uncaughtException' | 'main:unhandledRejection' | 'rendererError';
  origin?: string;
  reason?: ErrorInfo | any;
  error?: ErrorInfo | any;
}

/** `get-files` が返すファイル情報の型 */
interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
}

/** IPCハンドラの成功時の戻り値の型 */
type SuccessResult<T = {}> = { success: true } & T;
/** IPCハンドラのエラー時の戻り値の型 */
type ErrorResult = { success: false; error: string };
/** IPCハンドラの汎用的な戻り値の型 */
type HandlerResult<T = {}> = Promise<SuccessResult<T> | ErrorResult>;


// --- グローバル変数 ---

/** グローバルなエラーログ配列 */
const errorLogs: LogEntry[] = [];


// --- プロセスのエラーハンドリング ---

// メインプロセスの未捕捉例外をキャッチ
process.on('uncaughtException', (error: Error, origin: string) => {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'main:uncaughtException',
    origin: origin,
    error: {
      message: error.message,
      stack: error.stack,
    },
  };
  console.error('Uncaught Exception:', logEntry);
  errorLogs.push(logEntry);
});

// メインプロセスの未処理のPromiseリジェクションをキャッチ
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'main:unhandledRejection',
    reason: reason instanceof Error ? { message: reason.message, stack: reason.stack } : reason,
  };
  console.error('Unhandled Rejection:', logEntry);
  errorLogs.push(logEntry);
});


// --- アプリケーションライフサイクル ---

app.whenReady().then(() => {
  initializeWindowEvents(); // ウィンドウ関連のイベントを初期化
  createWindow();

  app.on('activate', () => {
    // macOSでDockアイコンがクリックされたときにウィンドウがなければ再作成する
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


// --- IPC Handlers ---

// レンダラープロセスからのエラーを記録
ipcMain.on('log-error', (event: IpcMainEvent, error: any) => {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    type: 'rendererError',
    error: error,
  };
  console.error('Renderer Error:', logEntry);
  errorLogs.push(logEntry);
});

// ログをファイルにエクスポート
ipcMain.handle('export-logs', async (): HandlerResult<{ path: string }> => {
  const date = new Date();
  const yy = date.getFullYear().toString().slice(-2);
  const mm = (date.getMonth() + 1).toString().padStart(2, '0');
  const dd = date.getDate().toString().padStart(2, '0');
  const fileName = `${yy}${mm}${dd}.log`;
  const logFilePath = path.join(app.getPath('userData'), fileName);

  try {
    const logContent = JSON.stringify(errorLogs, null, 2);
    await fs.writeFile(logFilePath, logContent, 'utf-8');
    dialog.showMessageBox({
      type: 'info',
      title: 'ログ出力成功',
      message: 'エラーログをファイルに出力しました。',
      detail: `パス: ${logFilePath}`
    });
    return { success: true, path: logFilePath };
  } catch (error: any) {
    console.error('Failed to export logs:', error);
    dialog.showMessageBox({
      type: 'error',
      title: 'ログ出力失敗',
      message: 'エラーログの出力に失敗しました。',
      detail: error.message
    });
    return { success: false, error: error.message };
  }
});


// --- File System API Handlers ---

const notesDir = path.join(app.getPath('userData'), 'Notes');

/** 指定された相対パスがNotesディレクトリ内にあることを保証し、絶対パスを返す */
const resolveSecurePath = (relativePath: string): string => {
  const absolutePath = path.join(notesDir, relativePath);
  // '..' などによるディレクトリトラバーサルを防ぐ
  if (!path.normalize(absolutePath).startsWith(notesDir)) {
    throw new Error(`Access denied to path: ${relativePath}`);
  }
  return absolutePath;
};

// 起動時にNotesディレクトリの存在を確認・作成する
(async () => {
  try {
    await fs.mkdir(notesDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create notes directory:', error);
  }
})();

// ファイル・ディレクトリの一覧を取得
ipcMain.handle('get-files', async (event: IpcMainInvokeEvent, subDir: string = ''): Promise<FileInfo[]> => {
  try {
    const targetDir = resolveSecurePath(subDir);
    const dirents = await fs.readdir(targetDir, { withFileTypes: true });
    const files: FileInfo[] = dirents.map(dirent => ({
      name: dirent.name,
      path: path.join(subDir, dirent.name).replace(/\\/g, '/'),
      isDirectory: dirent.isDirectory()
    }));
    return files;
  } catch (error) {
    console.error(`Failed to get files from '${subDir}':`, error);
    return [];
  }
});

// ファイルを読み込む（ZIP形式とプレーンテキストの両対応）
ipcMain.handle('read-file', async (event: IpcMainInvokeEvent, fileName: string): Promise<string | null> => {
  try {
    const filePath = resolveSecurePath(fileName);
    const fileBuffer = await fs.readFile(filePath);

    try {
      // ZIPアーカイブとして解釈を試みる
      const zip = new AdmZip(fileBuffer);
      const zipEntry = zip.getEntry('index.md');
      if (zipEntry) {
        return zipEntry.getData().toString('utf-8');
      }
      console.warn(`Archive "${fileName}" does not contain 'index.md'.`);
      return '';
    } catch (zipError) {
      // ZIPでなければプレーンテキストとして解釈（後方互換性）
      return fileBuffer.toString('utf-8');
    }
  } catch (error: any) {
    if (error.code !== 'ENOENT') { // ENOENT = File Not Found
      console.error(`Failed to read file: ${fileName}`, error);
    }
    return null;
  }
});

// ファイルを書き込む（ZIP形式で保存）
ipcMain.handle('write-file', async (event: IpcMainInvokeEvent, fileName: string, content: string): HandlerResult => {
  try {
    const filePath = resolveSecurePath(fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const zip = new AdmZip();
    zip.addFile('index.md', Buffer.from(content, 'utf-8'));
    
    const metaData = { mode: 'note' };
    zip.addFile('.meta', Buffer.from(JSON.stringify(metaData), 'utf-8'));

    await fs.writeFile(filePath, zip.toBuffer());
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to write file: ${fileName}`, error);
    return { success: false, error: error.message };
  }
});

// ディレクトリを作成
ipcMain.handle('create-directory', async (event: IpcMainInvokeEvent, dirName: string): HandlerResult => {
  try {
    const dirPath = resolveSecurePath(dirName);
    await fs.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to create directory: ${dirName}`, error);
    return { success: false, error: error.message };
  }
});