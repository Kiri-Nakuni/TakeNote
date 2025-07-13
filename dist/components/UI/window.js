"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMainWindow = getMainWindow;
exports.createWindow = createWindow;
exports.initializeWindowEvents = initializeWindowEvents;
const electron_1 = require("electron");
const node_path_1 = __importDefault(require("node:path"));
// モジュールスコープでウィンドウインスタンスを保持
let mainWindow = null;
/**
 * メインウィンドウのインスタンスを取得します。
 * @returns {BrowserWindow | null} メインウィンドウのインスタンス、または存在しない場合はnull
 */
function getMainWindow() {
    return mainWindow;
}
/**
 * アプリケーションのメインウィンドウを作成し、表示します。
 * 既存のウィンドウがある場合は何もしません。
 */
function createWindow() {
    if (mainWindow) {
        return;
    }
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            // コンパイル後のJSファイルからの相対パスを構築します。
            // (dist/components/UI/window.js -> dist/preload/preload.js)
            preload: node_path_1.default.join(__dirname, '..', '..', 'preload', 'preload.js'),
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
function initializeWindowEvents() {
    // ウィンドウタイトルを更新するIPCハンドラ
    electron_1.ipcMain.on('update-title', (event, filePath) => {
        if (mainWindow) {
            if (filePath) {
                // .tan拡張子を削除し、パスを整形
                const titlePath = filePath.replace(/\.tan$/, '');
                mainWindow.setTitle(`take_note - ${titlePath}`);
            }
            else {
                // ファイルが開かれていない場合（新規ノートなど）
                mainWindow.setTitle('take_note - New Note');
            }
        }
    });
}
