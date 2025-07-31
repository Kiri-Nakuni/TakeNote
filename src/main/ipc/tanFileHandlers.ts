import { ipcMain, dialog, BrowserWindow } from 'electron';
import { tanFileManager } from '../fileManager';
import type { TanFileStructure, TanMetadata, CppCompilerOptions } from '../fileManager';
import { ConfigManager } from '../config';
import * as path from 'path';

/**
 * TANファイル関連のIPCハンドラー
 */
export function setupTanFileHandlers(): void {
  // TANファイル作成
  ipcMain.handle('tan:create', async (_event, filePath: string, tanFile: TanFileStructure) => {
    try {
      const configManager = ConfigManager.getInstance();
      
      // 相対パスの場合はNotesディレクトリをベースにした絶対パスを作成
      let absolutePath = filePath;
      if (!path.isAbsolute(filePath)) {
        const notesDir = configManager.getNotesDirectory();
        absolutePath = path.join(notesDir, filePath);
      }
      
      await tanFileManager.createTanFile(absolutePath, tanFile);
      return { success: true };
    } catch (error) {
      console.error('Failed to create TAN file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // TANファイル読み込み
  ipcMain.handle('tan:read', async (_event, filePath: string) => {
    try {
      const tanFile = await tanFileManager.readTanFile(filePath);
      return { success: true, data: tanFile };
    } catch (error) {
      console.error('Failed to read TAN file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // TANファイル情報取得
  ipcMain.handle('tan:getInfo', async (_event, filePath: string) => {
    try {
      const info = await tanFileManager.getTanFileInfo(filePath);
      return { success: true, data: info };
    } catch (error) {
      console.error('Failed to get TAN file info:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // TANファイルメタデータ更新
  ipcMain.handle('tan:updateMetadata', async (_event, filePath: string, metadata: Partial<TanMetadata>) => {
    try {
      await tanFileManager.updateTanMetadata(filePath, metadata);
      return { success: true };
    } catch (error) {
      console.error('Failed to update TAN metadata:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // TANファイルコンテンツ更新
  ipcMain.handle('tan:updateContent', async (_event, filePath: string, content: string) => {
    try {
      await tanFileManager.updateTanContent(filePath, content);
      return { success: true };
    } catch (error) {
      console.error('Failed to update TAN content:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // TANファイルをテキストでエクスポート
  ipcMain.handle('tan:exportToText', async (_event, filePath: string) => {
    try {
      const textContent = await tanFileManager.exportToText(filePath);
      return { success: true, data: textContent };
    } catch (error) {
      console.error('Failed to export TAN file to text:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // TANファイルかどうかの判定
  ipcMain.handle('tan:isTanFile', async (_event, filePath: string) => {
    try {
      const isTan = tanFileManager.isTanFile(filePath);
      return { success: true, data: isTan };
    } catch (error) {
      console.error('Failed to check if file is TAN:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // TANファイル用のファイルダイアログ
  ipcMain.handle('tan:showOpenDialog', async () => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (!focusedWindow) {
        return { success: false, error: 'No focused window available' };
      }
      
      const result = await dialog.showOpenDialog(focusedWindow, {
        title: 'TANファイルを開く',
        filters: [
          { name: 'TANファイル', extensions: ['tan'] },
          { name: 'すべてのファイル', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to show open dialog:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // TANファイル保存用のファイルダイアログ
  ipcMain.handle('tan:showSaveDialog', async (_event, defaultName?: string) => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (!focusedWindow) {
        return { success: false, error: 'No focused window available' };
      }
      
      // Notesディレクトリをデフォルト保存先に設定
      const configManager = ConfigManager.getInstance();
      const fileName = defaultName ? `${defaultName}.tan` : 'untitled.tan';
      const defaultPath = configManager.getNotePath(fileName);
      
      const result = await dialog.showSaveDialog(focusedWindow, {
        title: 'TANファイルを保存',
        defaultPath: defaultPath,
        filters: [
          { name: 'TANファイル', extensions: ['tan'] },
          { name: 'すべてのファイル', extensions: ['*'] }
        ]
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to show save dialog:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // C++モード用TANファイル作成
  ipcMain.handle('tan:createCppMode', async (_event, filePath: string, options: {
    title: string;
    description?: string;
    tags?: string[];
    compilerOptions?: CppCompilerOptions;
    initialCode?: string;
  }) => {
    try {
      const configManager = ConfigManager.getInstance();
      
      // 相対パスの場合はNotesディレクトリをベースにした絶対パスを作成
      let absolutePath = filePath;
      if (!path.isAbsolute(filePath)) {
        const notesDir = configManager.getNotesDirectory();
        absolutePath = path.join(notesDir, filePath);
      }
      
      await tanFileManager.createCppModeTanFile(absolutePath, options);
      return { success: true };
    } catch (error) {
      console.error('Failed to create C++ mode TAN file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // C++モード用コンパイラ設定更新
  ipcMain.handle('tan:updateCppCompilerSettings', async (_event, filePath: string, compilerOptions: CppCompilerOptions) => {
    try {
      await tanFileManager.updateCppCompilerSettings(filePath, compilerOptions);
      return { success: true };
    } catch (error) {
      console.error('Failed to update C++ compiler settings:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}
