// このファイルは、preload.tsでcontextBridge経由で公開されたAPIの型を定義します。
// これにより、レンダラープロセス（.tsファイル）で `window.xxx` のように
// APIを呼び出す際に、TypeScriptの型チェックと自動補完が機能するようになります。

/// <reference types="vite/client" />
interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
}

declare global {
  interface Window {
    markdown: {
      render: (markdownText: string) => string;
    };
    fs: {
      getFiles: (dirPath?: string) => Promise<FileInfo[]>;
      readFile: (filePath: string) => Promise<string | null>;
      writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
      createDirectory: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
    };
    appUtils: {
      logError: (error: any) => void;
      exportLogs: () => Promise<{ success: boolean; path?: string; error?: string }>;
      updateTitle: (filePath: string | null) => void;
    };
    styleManager: {
      setRule: (selector: string, styles: Record<string, string | number>) => void;
    };
  }

  // Mermaid.jsの型定義（グローバルに存在するため）
  const mermaid: {
    initialize: (options: any) => void;
    render: (id: string, graphDefinition: string) => Promise<{ svg: string; bindFunctions?: (element: Element) => void }>;
  };
}

// エクスポートするものが何もないことを示すため、空のexportを追加します。
// これにより、このファイルがモジュールとして扱われることが保証されます。
export {};