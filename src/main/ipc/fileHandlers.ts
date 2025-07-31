import { ipcMain, dialog, BrowserWindow } from 'electron';
import { fileManagerCore } from '../fileManager/fileOperations/fileManagerCore';
import { tanFileManager } from '../fileManager';
import type { TanFileStructure } from '../fileManager/fileOperations/tanFileManager';
import { ConfigManager } from '../config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ファイル操作関連のIPCハンドラー
 */
export function setupFileHandlers(): void {
  // Notesディレクトリのファイル一覧取得
  ipcMain.handle('file:listNotesDirectory', async () => {
    try {
      const configManager = ConfigManager.getInstance();
      const notesDir = configManager.getNotesDirectory();
      
      // ディレクトリが存在しない場合は作成
      if (!fs.existsSync(notesDir)) {
        fs.mkdirSync(notesDir, { recursive: true });
        return { success: true, data: [] };
      }

      const files = fs.readdirSync(notesDir);
      const fileList = files.map(fileName => {
        const filePath = path.join(notesDir, fileName);
        const stats = fs.statSync(filePath);
        
        return {
          path: filePath,
          name: fileName,
          size: stats.size,
          modifiedAt: stats.mtime.toISOString(),
          isDirectory: stats.isDirectory()
        };
      }); // ディレクトリも含める
      
      return { success: true, data: fileList };
    } catch (error) {
      console.error('Failed to list notes directory:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // フォルダの中身を取得
  ipcMain.handle('file:listFolderContents', async (_event, folderPath: string) => {
    try {
      if (!fs.existsSync(folderPath)) {
        return { success: false, error: 'Folder not found' };
      }

      const stats = fs.statSync(folderPath);
      if (!stats.isDirectory()) {
        return { success: false, error: 'Path is not a directory' };
      }

      const files = fs.readdirSync(folderPath);
      const fileList = files.map(fileName => {
        const filePath = path.join(folderPath, fileName);
        const fileStats = fs.statSync(filePath);
        
        return {
          path: filePath,
          name: fileName,
          size: fileStats.size,
          modifiedAt: fileStats.mtime.toISOString(),
          isDirectory: fileStats.isDirectory()
        };
      });
      
      return { success: true, data: fileList };
    } catch (error) {
      console.error('Failed to list folder contents:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ファイル情報取得
  ipcMain.handle('file:getInfo', async (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      const stats = fs.statSync(filePath);
      const fileInfo = {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        modifiedAt: stats.mtime.toISOString(),
        createdAt: stats.birthtime.toISOString(),
        isDirectory: stats.isDirectory()
      };
      
      return { success: true, data: fileInfo };
    } catch (error) {
      console.error('Failed to get file info:', error);
      return { success: false, error: (error as Error).message };
    }
  });
  // ファイル読み込み
  ipcMain.handle('file:read', async (_event, filePath: string) => {
    try {
      const content = fileManagerCore.readFile(filePath);
      return { success: true, data: content };
    } catch (error) {
      console.error('Failed to read file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ファイル書き込み
  ipcMain.handle('file:write', async (_event, filePath: string, content: string) => {
    try {
      fileManagerCore.writeFile(filePath, content);
      return { success: true };
    } catch (error) {
      console.error('Failed to write file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ファイル作成
  ipcMain.handle('file:create', async (_event, filePath: string, content = '') => {
    try {
      const fullPath = fileManagerCore.createFile(filePath, content);
      return { success: true, data: fullPath };
    } catch (error) {
      console.error('Failed to create file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // フォルダ内でのファイル作成
  ipcMain.handle('file:createInFolder', async (_event, folderPath: string, fileName: string, content = '') => {
    try {
      const configManager = ConfigManager.getInstance();
      const notesDir = configManager.getNotesDirectory();
      const fullFolderPath = path.join(notesDir, folderPath);
      
      // フォルダが存在するかチェック
      if (!fs.existsSync(fullFolderPath)) {
        return { success: false, error: 'フォルダが存在しません。' };
      }
      
      // FileManagerCoreの新しいメソッドを使用
      const createdFilePath = fileManagerCore.createFileInFolder(fullFolderPath, fileName, content);
      return { success: true, data: createdFilePath };
    } catch (error) {
      console.error('Failed to create file in folder:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // フォルダ作成
  ipcMain.handle('file:createFolder', async (_event, folderName: string) => {
    try {
      const configManager = ConfigManager.getInstance();
      const notesDir = configManager.getNotesDirectory();
      const folderPath = path.join(notesDir, folderName);
      
      // フォルダが既に存在するかチェック
      if (fs.existsSync(folderPath)) {
        return { success: false, error: 'フォルダは既に存在します。' };
      }
      
      // フォルダを作成
      fs.mkdirSync(folderPath, { recursive: true });
      return { success: true, data: folderPath };
    } catch (error) {
      console.error('Failed to create folder:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ファイル削除
  ipcMain.handle('file:delete', async (_event, filePath: string) => {
    try {
      fileManagerCore.deleteFile(filePath);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ファイル存在確認
  ipcMain.handle('file:exists', async (_event, filePath: string) => {
    try {
      const exists = fs.existsSync(filePath);
      return { success: true, data: exists };
    } catch (error) {
      console.error('Failed to check file existence:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ファイルオープンダイアログ
  ipcMain.handle('file:showOpenDialog', async (_event, filters?: { name: string; extensions: string[] }[]) => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (!focusedWindow) {
        return { success: false, error: 'No focused window available' };
      }
      
      const defaultFilters = [
        { name: 'テキストファイル', extensions: ['txt', 'md'] },
        { name: 'TANファイル', extensions: ['tan'] },
        { name: 'すべてのファイル', extensions: ['*'] }
      ];

      const result = await dialog.showOpenDialog(focusedWindow, {
        title: 'ファイルを開く',
        filters: filters || defaultFilters,
        properties: ['openFile']
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to show open dialog:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ファイル保存ダイアログ
  ipcMain.handle('file:showSaveDialog', async (_event, defaultName?: string, filters?: { name: string; extensions: string[] }[]) => {
    try {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (!focusedWindow) {
        return { success: false, error: 'No focused window available' };
      }
      
      const defaultFilters = [
        { name: 'Markdownファイル', extensions: ['md'] },
        { name: 'TANファイル', extensions: ['tan'] },
        { name: 'テキストファイル', extensions: ['txt'] },
        { name: 'すべてのファイル', extensions: ['*'] }
      ];

      const result = await dialog.showSaveDialog(focusedWindow, {
        title: 'ファイルを保存',
        defaultPath: defaultName || 'untitled.md',
        filters: filters || defaultFilters
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to show save dialog:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // TANファイル作成・保存
  ipcMain.handle('tan:save', async (_event, tanData: TanFileStructure, savePath?: string) => {
    try {
      let filePath = savePath;
      
      // 保存パスが指定されていない場合、ダイアログを表示
      if (!filePath) {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (!focusedWindow) {
          throw new Error('アクティブなウィンドウが見つかりません');
        }

        const result = await dialog.showSaveDialog(focusedWindow, {
          title: 'TANファイルとして保存',
          defaultPath: `${tanData.meta.title || 'Untitled'}.tan`,
          filters: [
            { name: 'TANファイル', extensions: ['tan'] },
            { name: 'すべてのファイル', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return { success: false, error: 'ユーザーによってキャンセルされました' };
        }

        filePath = result.filePath;
      }

      // .tan拡張子が付いていない場合は追加
      if (!filePath.endsWith('.tan')) {
        filePath = filePath + '.tan';
      }

      // TANファイルを作成・保存
      await tanFileManager.createTanFile(filePath, tanData);
      
      return { success: true, data: filePath };
    } catch (error) {
      console.error('Failed to save TAN file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // TANファイル読み込み
  ipcMain.handle('tan:load', async (_event, filePath: string) => {
    try {
      const tanData = await tanFileManager.readTanFile(filePath);
      return { success: true, data: tanData };
    } catch (error) {
      console.error('Failed to load TAN file:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // ノートモードでTAN保存（既存のコンテンツから）
  ipcMain.handle('tan:saveFromNote', async (_event, title: string, content: string, savePath?: string) => {
    try {
      // 既存のコンテンツからTANファイル構造を作成
      const now = new Date().toISOString();
      const tanData: TanFileStructure = {
        meta: {
          title: title || 'Untitled Note',
          description: `自動生成されたTANファイル: ${new Date().toLocaleString()}`,
          createdAt: now,
          modifiedAt: now,
          directoryStructure: []
        },
        version: '1.0.0',
        mode: 'note',
        mainFile: {
          name: 'content.md',
          content: content,
          extension: 'md'
        },
        hook: {
          lineCount: content.split('\n').length,
          keys: []
        }
      };

      let filePath = savePath;
      
      // 保存パスが指定されていない場合、ダイアログを表示
      if (!filePath) {
        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (!focusedWindow) {
          throw new Error('アクティブなウィンドウが見つかりません');
        }

        const result = await dialog.showSaveDialog(focusedWindow, {
          title: 'TANファイルとして保存',
          defaultPath: `${tanData.meta.title}.tan`,
          filters: [
            { name: 'TANファイル', extensions: ['tan'] },
            { name: 'すべてのファイル', extensions: ['*'] },
          ],
        });

        if (result.canceled || !result.filePath) {
          return { success: false, error: 'ユーザーによってキャンセルされました' };
        }

        filePath = result.filePath;
      }

      // .tan拡張子が付いていない場合は追加
      if (!filePath.endsWith('.tan')) {
        filePath = filePath + '.tan';
      }

      // TANファイルを作成・保存
      await tanFileManager.createTanFile(filePath, tanData);

      return { success: true, data: filePath };
    } catch (error) {
      console.error('Failed to save note as TAN file:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}
