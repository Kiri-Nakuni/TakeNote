import { Menu, app, BrowserWindow } from 'electron';

export function createApplicationMenu(mainWindow: BrowserWindow): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'ファイル',
      submenu: [
        {
          label: '新しいファイル',
          accelerator: 'Ctrl+N',
          click: () => {
            mainWindow.webContents.send('menu-action', 'new-file');
          }
        },
        {
          label: 'ファイルを開く',
          accelerator: 'Ctrl+O',
          click: () => {
            mainWindow.webContents.send('menu-action', 'open-file');
          }
        },
        { type: 'separator' },
        {
          label: '保存',
          accelerator: 'Ctrl+S',
          click: () => {
            mainWindow.webContents.send('menu-action', 'save-file');
          }
        },
        {
          label: '名前を付けて保存',
          accelerator: 'Ctrl+Shift+S',
          click: () => {
            mainWindow.webContents.send('menu-action', 'save-as');
          }
        },
        { type: 'separator' },
        {
          label: '終了',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '編集',
      submenu: [
        {
          label: '元に戻す',
          accelerator: 'Ctrl+Z',
          role: 'undo'
        },
        {
          label: 'やり直し',
          accelerator: 'Ctrl+Y',
          role: 'redo'
        },
        { type: 'separator' },
        {
          label: 'カット',
          accelerator: 'Ctrl+X',
          role: 'cut'
        },
        {
          label: 'コピー',
          accelerator: 'Ctrl+C',
          role: 'copy'
        },
        {
          label: '貼り付け',
          accelerator: 'Ctrl+V',
          role: 'paste'
        },
        {
          label: 'すべて選択',
          accelerator: 'Ctrl+A',
          role: 'selectAll'
        }
      ]
    },
    {
      label: '表示',
      submenu: [
        {
          label: 'ズームイン',
          accelerator: 'Ctrl+Plus',
          role: 'zoomIn'
        },
        {
          label: 'ズームアウト',
          accelerator: 'Ctrl+-',
          role: 'zoomOut'
        },
        {
          label: 'リセット',
          accelerator: 'Ctrl+0',
          role: 'resetZoom'
        },
        { type: 'separator' },
        {
          label: 'フルスクリーン',
          accelerator: 'F11',
          role: 'togglefullscreen'
        },
        {
          label: '開発者ツール',
          accelerator: 'F12',
          role: 'toggleDevTools'
        }
      ]
    },
    {
      label: 'ヘルプ',
      submenu: [
        {
          label: 'ライセンス情報',
          click: () => {
            mainWindow.webContents.send('menu-action', 'show-licenses');
          }
        },
        {
          label: 'バージョン情報',
          click: () => {
            mainWindow.webContents.send('menu-action', 'about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
