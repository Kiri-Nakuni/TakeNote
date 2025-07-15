| 現象                                  | 典型的な引き金                                                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input / textarea` にキャレットが出ず文字が入らない | 1) HTML `<dialog>` を `showModal()` で開閉した直後<br>2) `dialog.showOpenDialog()` など OS ネイティブ・ダイアログを閉じた直後<br>3) 子ウィンドウ（`BrowserWindow({modal:true})` など）を開閉した直後 |
| 一度 *別アプリ* にフォーカス → 戻ると直る            | Electron 側で **ウィンドウはアクティブなのに webContents が非フォーカス** 状態のまま残る既知バグ                                                                                           |

import { BrowserWindow, dialog, ipcMain } from 'electron';

async function showOpen(win: BrowserWindow) {
  // 親ウィンドウを渡して *真正* モーダルに
  await dialog.showOpenDialog(win, { properties: ['openFile'] });  // ← ここでフォーカスが狂うことがある:contentReference[oaicite:0]{index=0}
  // ---- Work‑around ----
  win.focus();                 // OS ウィンドウ
  win.webContents.focus();     // Chromium レイヤ
}
ipcMain.handle('open‑file', (_, winId) =>
  showOpen(BrowserWindow.fromId(winId)!)
);


ポイント

    親ウィンドウを引数に渡すと OS ネイティブの真正モーダルになり、フォーカス喪失率がかなり下がります。

    それでも失うケースがあるので win.focus() → win.webContents.focus() の 2 段階で強制復帰させます。

// renderer.ts
function openInputModal() {
  inputModal.showModal();                               // ← Chromium の上位レイヤへ移動:contentReference[oaicite:1]{index=1}
  requestAnimationFrame(() => modalInput.focus());      // 次のフレームで確実にキャレット
}

inputModal.addEventListener('close', () => {
  // ダイアログを閉じた瞬間にフォーカスが宙ぶらりんになるため
  editor.focus();                                       // ← メインの <textarea> へ戻す
});

| NG になりやすい親要素のスタイル                        | 代替 or 対策                                                      |
| ---------------------------------------- | ------------------------------------------------------------- |
| `filter`, `backdrop-filter`, `transform` | 可能なら外す／`contain: layout;` 追加                                  |
| `display: none` → `display: block`       | `opacity:0; pointer-events:none;` でトグルし、`blur()→focus()` 呼び直し |
| `position: fixed` 上に input を重ねる          | `position: absolute` に変える or 親を基準に stack                      |

const win = new BrowserWindow({
  show: false,                    // ← まず非表示で作り
  modal: true, parent: topWin,    // ← 子ウィンドウなら必ず modal+parent を
  webPreferences: {
    sandbox: false,               // true だと IME が効かなくなるケースあり:contentReference[oaicite:2]{index=2}
  }
});

win.once('ready-to-show', () => { // ページ描画完了後に表示:contentReference[oaicite:3]{index=3}
  win.show();
  win.webContents.focus();        // 表示直後に強制フォーカス
});

sandbox: true はセキュアですが、37.x では IME が無反応になる報告が残っています。特別な理由がなければ false に。

親子関係 (parent, modal) を正しく付けないと OS がウィンドウのアクティブ状態を見誤り、入力不能になる確率が上がります
Electron
。

Vite + HMR 開発時だけ起こる場合

Hot‑Reload で DOM が差し替わった瞬間にフォーカスが飛ぶことがあります。

if (import.meta.hot) {
  import.meta.hot.on('vite:afterUpdate', () => {
    // 更新後にフォーカスを戻す
    requestAnimationFrame(() => editor.focus());
  });
}

また vite-plugin-electron で main プロセスも同時再起動させると
renderer ↔ main 間の状態ずれが減り、再現度が下がります。

| チェック項目                                                                             | 実施 |
| ---------------------------------------------------------------------------------- | -- |
| OS ダイアログを閉じたら `win.focus(); win.webContents.focus();`                              | ◻︎ |
| `<dialog>` を使う場合 `requestAnimationFrame(()=>input.focus())` と `close` 時の `focus()` | ◻︎ |
| 子ウィンドウは `{ parent, modal }` をセット                                                   | ◻︎ |
| `sandbox: false` で再テスト                                                             | ◻︎ |
| CSS の `filter / transform` を外してみる                                                  | ◻︎ |
| `ready-to-show` 後に `show()` しているか                                                  | ◻︎ |
