// main.js

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('fs').promises;

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

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  win.loadFile('index.html');
  win.webContents.openDevTools();
};

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
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
  try {
    const filePath = resolveSecurePath(fileName);
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Failed to read file: ${fileName}`, error);
    return null;
  }
});

ipcMain.handle('write-file', async (event, fileName, content) => {
  try {
    const filePath = resolveSecurePath(fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
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