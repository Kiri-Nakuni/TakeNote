// main.js

const { app, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('fs').promises;
const AdmZip = require('adm-zip');
const { createWindow, initializeWindowEvents } = require('./dist/components/UI/window.js');

// グローバルなエラーログ配列
const errorLogs = [];

// メインプロセスの未捕捉例外をキャッチ
process.on('uncaughtException', (error, origin) => {
  const logEntry = {
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
process.on('unhandledRejection', (reason, promise) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'main:unhandledRejection',
    reason: reason instanceof Error ? { message: reason.message, stack: reason.stack } : reason,
  };
  console.error('Unhandled Rejection:', logEntry);
  errorLogs.push(logEntry);
});

app.whenReady().then(() => {
  initializeWindowEvents(); // ウィンドウ関連のイベントを初期化
  createWindow();

  app.on('activate', () => {
    // macOSでDockアイコンがクリックされたときの処理
    // createWindowは内部でインスタンスの存在をチェックするため、そのまま呼び出してOK
    createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers ---

// レンダラープロセスからのエラーを記録
ipcMain.on('log-error', (event, error) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'rendererError',
    error: error,
  };
  console.error('Renderer Error:', logEntry);
  errorLogs.push(logEntry);
});

// ログをファイルにエクスポート
ipcMain.handle('export-logs', async () => {
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
  } catch (error) {
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

// Helper function to ensure file paths are secure and within the notes directory
const resolveSecurePath = (relativePath) => {
  if (typeof relativePath !== 'string') {
    throw new Error('Path must be a string.');
  }
  const absolutePath = path.join(notesDir, relativePath);
  // path.normalize to resolve '..' segments
  if (!path.normalize(absolutePath).startsWith(notesDir)) {
    throw new Error(`Access denied to path: ${relativePath}`);
  }
  return absolutePath;
};

// Ensure the notes directory exists on startup
(async () => {
  try {
    await fs.mkdir(notesDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create notes directory:', error);
  }
})();

ipcMain.handle('get-files', async (event, subDir = '') => {
  try {
    const targetDir = resolveSecurePath(subDir);
    const dirents = await fs.readdir(targetDir, { withFileTypes: true });
    const files = dirents.map(dirent => ({
      name: dirent.name,
      path: path.join(subDir, dirent.name).replace(/\\/g, '/'), // Use relative path and forward slashes
      isDirectory: dirent.isDirectory()
    }));
    return files;
  } catch (error) {
    console.error(`Failed to get files from '${subDir}':`, error);
    return [];
  }
});

ipcMain.handle('read-file', async (event, fileName) => {
  const filePath = resolveSecurePath(fileName);
  try {
    // ファイルをバッファとして読み込む
    const fileBuffer = await fs.readFile(filePath);
    try {
      // まずZIPアーカイブとして解釈を試みる
      const zip = new AdmZip(fileBuffer);
      const zipEntry = zip.getEntry('index.html');
      if (zipEntry) {
        // ZIP内にindex.htmlがあれば、その内容を返す
        return zipEntry.getData().toString('utf-8');
      }
      // ZIPだがindex.htmlがない場合（不正な形式）
      console.warn(`Archive "${fileName}" does not contain 'index.html'.`);
      return '';
    } catch (zipError) {
      // ZIPの解釈に失敗した場合、プレーンなHTMLファイルとして内容を返す
      // これにより、既存のファイルとの後方互換性が保たれる
      return fileBuffer.toString('utf-8');
    }
  } catch (error) {
    // fs.readFile自体が失敗した場合（ファイルが存在しないなど）
    if (error.code !== 'ENOENT') {
      console.error(`Failed to read file: ${fileName}`, error);
    }
    return null;
  }
});

ipcMain.handle('write-file', async (event, fileName, content) => {
  try {
    const filePath = resolveSecurePath(fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    // 新しいZIPアーカイブを作成
    const zip = new AdmZip();
    // ノートのコンテンツを 'index.html' としてZIPに追加
    zip.addFile('index.html', Buffer.from(content, 'utf-8'));

    // メタデータファイル .meta を作成してZIPに追加
    const metaData = { mode: 'note' };
    zip.addFile('.meta', Buffer.from(JSON.stringify(metaData), 'utf-8'));

    // バッファをディスクに書き込む
    await fs.writeFile(filePath, zip.toBuffer());
    return { success: true };
  } catch (error) {
    console.error(`Failed to write file: ${fileName}`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('create-directory', async (event, dirName) => {
  try {
    const dirPath = resolveSecurePath(dirName);
    await fs.mkdir(dirPath, { recursive: true });
    return { success: true };
  } catch (error) {
    console.error(`Failed to create directory: ${dirName}`, error);
    return { success: false, error: error.message };
  }
});