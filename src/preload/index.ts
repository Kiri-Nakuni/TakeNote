import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 設定の型定義
interface AppConfig {
  security: {
    mode: 'secure' | 'developer';
    allowWasm: boolean;
    allowCodeExecution: boolean;
  };
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    maximized: boolean;
  };
  panels: {
    sidebarWidth: number;
    sidebarVisible: boolean;
    previewVisible: boolean;
    editorFontSize: number;
    lineNumbers: boolean;
    wordWrap: boolean;
  };
  editor: {
    theme: 'light' | 'dark';
    fontSize: number;
    tabSize: number;
    insertSpaces: boolean;
    autoSave: boolean;
    syntaxHighlighting: boolean;
  };
  recentFiles: string[];
  app: {
    version: string;
    lastOpened: string;
    language: 'ja' | 'en';
  };
}

// Custom APIs for renderer
const api = {
  // メニューアクションを受信
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu-action', (_event, action) => {
      callback(action);
    });
  },
  
  // メニューアクション受信を停止
  removeMenuActionListener: () => {
    ipcRenderer.removeAllListeners('menu-action');
  },

  // 設定管理
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    update: (updates: Record<string, unknown>) => ipcRenderer.invoke('config:update', updates),
    getNotesDirectory: () => ipcRenderer.invoke('config:get-notes-directory'),
    setLastOpenedFile: (filePath: string | null) => ipcRenderer.invoke('config:set-last-opened-file', filePath),
    getLastOpenedFile: () => ipcRenderer.invoke('config:get-last-opened-file')
  },

  // セキュリティモード情報
  security: {
    isDeveloperMode: () => {
      // 起動引数からdeveloper-modeフラグを確認
      return process.argv.includes('--developer-mode');
    }
  },

  // アプリケーション制御
  app: {
    restart: () => ipcRenderer.invoke('app:restart'),
    quit: () => ipcRenderer.invoke('app:quit')
  },

    // ファイル操作
  file: {
    read: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    write: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
    create: (filePath: string, content?: string) => ipcRenderer.invoke('file:create', filePath, content),
    createFolder: (folderName: string) => ipcRenderer.invoke('file:createFolder', folderName),
    createInFolder: (folderName: string, fileName: string, content?: string) => ipcRenderer.invoke('file:createInFolder', folderName, fileName, content),
    delete: (filePath: string) => ipcRenderer.invoke('file:delete', filePath),
    exists: (filePath: string) => ipcRenderer.invoke('file:exists', filePath),
    getInfo: (filePath: string) => ipcRenderer.invoke('file:getInfo', filePath),
    listNotesDirectory: () => ipcRenderer.invoke('file:listNotesDirectory'),
    listFolderContents: (folderPath: string) => ipcRenderer.invoke('file:listFolderContents', folderPath),
    showOpenDialog: (filters?: { name: string; extensions: string[] }[]) => ipcRenderer.invoke('file:showOpenDialog', filters),
    showSaveDialog: (defaultName?: string, filters?: { name: string; extensions: string[] }[]) => ipcRenderer.invoke('file:showSaveDialog', defaultName, filters)
  },

  // TANファイル管理
  tan: {
    create: (filePath: string, tanFile: Record<string, unknown>) => ipcRenderer.invoke('tan:create', filePath, tanFile),
    read: (filePath: string) => ipcRenderer.invoke('tan:read', filePath),
    getInfo: (filePath: string) => ipcRenderer.invoke('tan:getInfo', filePath),
    updateMetadata: (filePath: string, metadata: Record<string, unknown>) => ipcRenderer.invoke('tan:updateMetadata', filePath, metadata),
    updateContent: (filePath: string, content: string) => ipcRenderer.invoke('tan:updateContent', filePath, content),
    exportToText: (filePath: string) => ipcRenderer.invoke('tan:exportToText', filePath),
    isTanFile: (filePath: string) => ipcRenderer.invoke('tan:isTanFile', filePath),
    showOpenDialog: () => ipcRenderer.invoke('tan:showOpenDialog'),
    showSaveDialog: (defaultName?: string) => ipcRenderer.invoke('tan:showSaveDialog', defaultName),
    createCppMode: (filePath: string, options: {
      title: string;
      description?: string;
      tags?: string[];
      compilerOptions?: Record<string, unknown>;
      initialCode?: string;
    }) => ipcRenderer.invoke('tan:createCppMode', filePath, options),
    updateCppCompilerSettings: (filePath: string, compilerOptions: Record<string, unknown>) => ipcRenderer.invoke('tan:updateCppCompilerSettings', filePath, compilerOptions)
  },

  // C++コンパイラ
  cppCompiler: {
    checkAvailability: () => ipcRenderer.invoke('cpp-compiler:check-availability'),
    compile: (request: {
      sourceCode: string;
      options: {
        standard: 'c++11' | 'c++14' | 'c++17' | 'c++20';
        optimization: 'O0' | 'O1' | 'O2' | 'O3';
        warnings: boolean;
        debug: boolean;
        includes?: string[];
        libraries?: string[];
      };
    }) => ipcRenderer.invoke('cpp-compiler:compile', request),
    execute: (request: {
      wasmPath: string;
      jsPath: string;
      stdin: string;
    }) => ipcRenderer.invoke('cpp-compiler:execute', request),
    cleanup: () => ipcRenderer.invoke('cpp-compiler:cleanup')
  },

  // システム情報
  system: {
    getVersions: () => ipcRenderer.invoke('system:getVersions')
  },

  // ライセンス情報
  license: {
    getPackageLicenses: () => ipcRenderer.invoke('license:getPackageLicenses')
  },

  // アプリケーション
  appTheme: {
    setWindowTheme: (theme: 'light' | 'dark') => ipcRenderer.invoke('app:setWindowTheme', theme)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('Failed to expose APIs:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
