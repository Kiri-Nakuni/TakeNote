import { app, shell, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import { readFileSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { createApplicationMenu } from './menu'
import { ConfigManager } from './config'
import { setupTanFileHandlers } from './ipc/tanFileHandlers'
import { setupFileHandlers } from './ipc/fileHandlers'
import { initializeCppCompilerHandler, cleanupCppCompilerHandler } from './ipc/cppCompilerHandlers'

let configManager: ConfigManager;

async function createWindow(): Promise<void> {
  // 設定を読み込み
  const config = configManager.getConfig();
  
  // セキュリティモードに基づいてwebPreferencesを設定
  const isDeveloperMode = config.security.mode === 'developer';
  
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: config.window.width,
    height: config.window.height,
    ...(config.window.x !== undefined && { x: config.window.x }),
    ...(config.window.y !== undefined && { y: config.window.y }),
    show: false,
    autoHideMenuBar: false, // ネイティブメニューバーを表示
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#1a1a1a', // ダークモード時の背景色
    // Linux固有の描画問題対策
    ...(process.platform === 'linux' && {
      icon: join(__dirname, '../../build/icon.png') // Linuxでのアイコン設定
    }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'), // ビルド時の拡張子を.mjsに修正
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true,
      // 開発者モードの場合はより緩いCSPを適用
      additionalArguments: isDeveloperMode ? ['--developer-mode'] : [],
      // webSecurityを開発者モードでは無効化（WASM実行のため）
      webSecurity: !isDeveloperMode,
      // Linux での描画問題対策
      ...(process.platform === 'linux' && {
        enableRemoteModule: false,
        allowRunningInsecureContent: false
      })
    }
  })

  // 最大化状態を復元
  if (config.window.maximized) {
    mainWindow.maximize();
  }

  // セキュリティモードに基づいてCSPを動的設定
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const isDeveloperMode = configManager.getConfig().security.mode === 'developer';
    
    if (details.responseHeaders) {
      if (isDeveloperMode) {
        // 開発者モードではWASM実行を許可するCSPを適用
        const cspValue = "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws: wss:;";
        details.responseHeaders['Content-Security-Policy'] = [cspValue];
      } else {
        // セキュアモードでは厳格なCSPを適用
        const cspValue = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' ws: wss:;";
        details.responseHeaders['Content-Security-Policy'] = [cspValue];
      }
      
      callback({ responseHeaders: details.responseHeaders });
    } else {
      callback({});
    }
  });

  // ネイティブメニューを作成
  createApplicationMenu(mainWindow);

  // ウィンドウの状態変更を監視
  const saveWindowState = async (): Promise<void> => {
    const bounds = mainWindow.getBounds();
    const maximized = mainWindow.isMaximized();
    await configManager.updateWindowState(bounds, maximized);
  };

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

// Linux固有の設定
if (process.platform === 'linux') {
  // GPU関連の問題対策
  app.commandLine.appendSwitch('--disable-gpu-sandbox');
  app.commandLine.appendSwitch('--disable-dev-shm-usage');
  app.commandLine.appendSwitch('--no-sandbox');
  
  // Wayland対応
  if (process.env.XDG_SESSION_TYPE === 'wayland') {
    app.commandLine.appendSwitch('--enable-features=UseOzonePlatform');
    app.commandLine.appendSwitch('--ozone-platform=wayland');
  }
}

app.whenReady().then(async () => {
  // 設定管理システムを初期化
  configManager = ConfigManager.getInstance();
  await configManager.initialize();
  
  // 最終起動時刻を更新（設定ファイルの読み込み後に実行）
  await configManager.updateLastOpened();

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // 設定関連のIPC
  ipcMain.handle('config:get', () => {
    return configManager.getConfig();
  });

  // 起動時設定取得（プリロード用）
  ipcMain.handle('config:get-security-mode', () => {
    const config = configManager.getConfig();
    return {
      mode: config.security.mode,
      allowWasm: config.security.allowWasm,
      allowCodeExecution: config.security.allowCodeExecution
    };
  });

  ipcMain.handle('config:update', async (_, updates) => {
    configManager.updateConfig(updates);
    await configManager.saveConfig();
    return configManager.getConfig();
  });

  ipcMain.handle('config:set-security-mode', async (_, mode: 'secure' | 'developer') => {
    await configManager.setSecurityMode(mode);
    return configManager.getConfig();
  });

  ipcMain.handle('config:add-recent-file', async (_, filePath: string) => {
    await configManager.addRecentFile(filePath);
    return configManager.getConfig();
  });

  ipcMain.handle('config:update-panel-width', async (_, panel: 'sidebar', width: number) => {
    await configManager.updatePanelWidth(panel, width);
    return configManager.getConfig();
  });

  // ノート保存パス取得
  ipcMain.handle('config:get-notes-directory', () => {
    return configManager.getNotesDirectory();
  });

  ipcMain.handle('config:get-note-path', (_, fileName: string) => {
    return configManager.getNotePath(fileName);
  });

  // 最後に開いたファイル管理
  ipcMain.handle('config:set-last-opened-file', async (_, filePath: string | null) => {
    try {
      await configManager.setLastOpenedFile(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('config:get-last-opened-file', () => {
    try {
      const lastFile = configManager.getLastOpenedFile();
      return { success: true, data: lastFile };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // アプリケーション制御
  ipcMain.handle('app:restart', () => {
    app.relaunch();
    app.exit();
  });

  ipcMain.handle('app:quit', () => {
    app.quit();
  });

  // TANファイル関連のIPCハンドラーを設定
  setupTanFileHandlers();
  
  // 一般的なファイル操作のIPCハンドラーを設定
  setupFileHandlers();

  // C++コンパイラ関連のIPCハンドラーを設定
  initializeCppCompilerHandler();

  // ウィンドウテーマの設定
  ipcMain.handle('app:setWindowTheme', async (_event, theme: 'light' | 'dark') => {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((window) => {
      window.setBackgroundColor(theme === 'dark' ? '#1a1a1a' : '#ffffff');
      
      // WindowsでnativeThemeを使用してメニューバーを暗く
      if (process.platform === 'win32') {
        nativeTheme.themeSource = theme;
        // Windowsタイトルバーのテーマを設定
        try {
          window.setTitleBarOverlay({
            color: theme === 'dark' ? '#1a1a1a' : '#ffffff',
            symbolColor: theme === 'dark' ? '#ffffff' : '#000000',
            height: 30
          });
        } catch {
          // フォールバック: 一部のElectronバージョンでサポートされていない場合
          console.log('setTitleBarOverlay not supported');
        }
      }
    });
    
    // macOSでダークメニューバーを有効にする
    if (process.platform === 'darwin') {
      nativeTheme.themeSource = theme;
      app.dock?.setIcon(join(__dirname, '../../build/icon.png'));
    }
    
    return true;
  });

  // システム情報取得
  ipcMain.handle('system:getVersions', () => {
    let viteVersion = 'unknown';
    try {
      const packageJsonPath = join(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const rawVersion = packageJson.devDependencies?.vite || 'unknown';
      // キャレットや他の範囲指定文字を除去
      viteVersion = rawVersion.replace(/^[\^~>=<]/, '');
    } catch (error) {
      console.error('Failed to read package.json:', error);
    }
    
    return {
      electron: process.versions.electron,
      node: process.versions.node,
      vite: viteVersion
    };
  });

  // ライセンス情報取得
  ipcMain.handle('license:getPackageLicenses', async () => {
    try {
      // package.jsonから依存関係を読み取って基本的なライセンス情報を提供
      const packageJsonPath = join(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      // 主要なパッケージのライセンス情報を手動で定義
      const licenseInfo: Record<string, { licenseType: string; repository: string }> = {
        'vue': {
          licenseType: 'MIT',
          repository: 'https://github.com/vuejs/core'
        },
        'electron': {
          licenseType: 'MIT',
          repository: 'https://github.com/electron/electron'
        },
        'vite': {
          licenseType: 'MIT',
          repository: 'https://github.com/vitejs/vite'
        },
        'shiki': {
          licenseType: 'MIT',
          repository: 'https://github.com/shikijs/shiki'
        },
        'dompurify': {
          licenseType: 'Apache-2.0 OR MPL-2.0',
          repository: 'https://github.com/cure53/DOMPurify'
        },
        'katex': {
          licenseType: 'MIT',
          repository: 'https://github.com/KaTeX/KaTeX'
        },
        'markdown-it': {
          licenseType: 'MIT',
          repository: 'https://github.com/markdown-it/markdown-it'
        },
        'sass': {
          licenseType: 'MIT',
          repository: 'https://github.com/sass/dart-sass'
        },
        'emscripten': {
          licenseType: 'MIT',
          repository: 'https://github.com/emscripten-core/emscripten'
        }
      };
      
      const licenses = [];
      for (const [name, info] of Object.entries(licenseInfo)) {
        if (dependencies[name]) {
          const version = dependencies[name].replace(/^[\^~>=<]/, '');
          licenses.push({
            name,
            version,
            licenseType: info.licenseType,
            repository: info.repository,
            licenseFile: ''
          });
        }
      }
      
      // バンドル版Emscripten SDKの情報を追加
      try {
        const bundledEmscriptenManager = await import('./compiler/bundledEmscriptenManager');
        const manager = bundledEmscriptenManager.BundledEmscriptenManager.getInstance();
        await manager.initialize();
        
        if (manager.isAvailable()) {
          const bundledInfo = manager.getBundledEmscripten();
          if (bundledInfo) {
            licenses.push({
              name: 'Emscripten SDK (Bundled)',
              version: bundledInfo.version || '3.1.51',
              licenseType: 'MIT / University of Illinois/NCSA Open Source License',
              repository: 'https://github.com/emscripten-core/emsdk',
              licenseFile: 'Bundled with application'
            });
          }
        }
      } catch (error) {
        console.warn('Could not load bundled Emscripten information:', error);
      }
      
      return licenses;
    } catch (error) {
      console.error('Failed to get license information:', error);
      return [];
    }
  });

  await createWindow()

  // ダークテーマの設定（macOSでメニューバーが暗くなるようにする）
  if (process.platform === 'darwin') {
    // ダークテーマを使用
    app.dock?.setIcon(join(__dirname, '../../build/icon.png'))
  }

  app.on('activate', async function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) await createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  // C++コンパイラリソースのクリーンアップ
  await cleanupCppCompilerHandler();
  
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
