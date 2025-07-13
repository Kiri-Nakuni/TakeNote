# take_note

Chromiumベースの(主に自分用の)ノートアプリです。

## API
### CSSカスタム機能
このAPIを使用すると、アプリケーションのスタイルを動的に追加・変更できます。
レンダラープロセス（開発者ツールなど）から以下の関数を呼び出すことで、CSSルールを操作します。

#### `window.styleManager.setRule(selector, styles)`
指定されたセレクタにスタイルを適用します。セレクタが既に存在する場合はルールを上書きし、存在しない場合は新しく作成します。

- **引数:**
  - `selector` (`string`): スタイルを適用するCSSセレクタ（例: `.my-class`, `#my-id`）。
  - `styles` (`object`): CSSプロパティをキー、値をバリューとするオブジェクト。プロパティ名はCSS標準のケバブケース (`background-color`) またはJavaScriptのキャメルケース (`backgroundColor`) のどちらでも指定可能です。

- **使用例:**

  **例1: 新しいクラス `.dynamic-highlight` を定義する**
  ```javascript
  window.styleManager.setRule('.dynamic-highlight', {
    backgroundColor: 'yellow',
    border: '1px solid orange',
    padding: '0 4px',
    borderRadius: '3px'
  });
  ```

  **例2: 既存のクラス `.enclosing` のスタイルを上書きする**
  ```javascript
  window.styleManager.setRule('.enclosing', {
    backgroundColor: 'rgba(100, 200, 255, 0.2)', // 背景色を薄い青に変更
    outline: '1px solid rgba(100, 200, 255, 0.8)'
  });
  ```