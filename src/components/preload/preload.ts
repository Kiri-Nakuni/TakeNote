import { contextBridge, ipcRenderer } from 'electron';
import MarkdownIt from 'markdown-it';
import texmath from 'markdown-it-texmath';
import katex, { KatexOptions } from 'katex';
import hljs from 'highlight.js';
import { katexMacros } from '@/components/preload/katex/katexMacros';

// --- 型定義 ---

/** KaTeXのtrust関数に渡されるcontextオブジェクトの型 */
interface KatexTrustContext {
  command: string;
  class?: string;
  [key: string]: any; // その他のプロパティを許容
}

/** CSSスタイルを表現するオブジェクトの型 */
type StyleObject = Record<string, string | number>;

/** `get-files`から返されるファイル情報の型 (main.tsと共通) */
interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
}


// --- Markdown-it の初期化 ---

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight: (str: string, lang: string): string => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return (
          '<pre class="hljs"><code>' +
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
          '</code></pre>'
        );
      } catch (__) {
        // エラー時はフォールバック
      }
    }
    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  },
});
md.use(texmath, {
  engine: katex,
  delimiters: 'dollars' as const,
  katexOptions: {
    throwOnError: false,
    strict: false,
    trust: (context: KatexTrustContext): boolean => {
      const allowedClasses = ['reflectbox', 'scale-me'];
      if (context.command === '\\htmlClass' && context.class && allowedClasses.includes(context.class)) {
        return true;
      }
      if (context.command === '\\htmlData') {
        return true;
      }
      return false;
    },
    macros: katexMacros,
  } as KatexOptions, 
});


// --- Dynamic Style Manager ---

const dynamicStyleManager = (() => {
  let styleElement: HTMLStyleElement | null = null;
  const rules = new Map<string, string>();

  const updateStyleSheet = (): void => {
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'dynamic-styles';
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = [...rules.values()].join('\n');
  };

  const createStyleString = (styles: StyleObject): string => {
    return Object.entries(styles)
      .map(([prop, value]) => {
        const kebabCaseProp = prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
        return `${kebabCaseProp}: ${value};`;
      })
      .join(' ');
  };

  return {
    setRule: (selector: string, styles: StyleObject): void => {
      if (typeof selector !== 'string' || !selector.trim() || typeof styles !== 'object' || styles === null) {
        console.error('Invalid arguments for styleManager.setRule:', { selector, styles });
        return;
      }
      const styleString = createStyleString(styles);
      rules.set(selector, `${selector} { ${styleString} }`);
      updateStyleSheet();
    },
  };
})();


// --- Context Bridge ---

contextBridge.exposeInMainWorld('markdown', {
  render: (markdownText: string): string => md.render(markdownText),
});

contextBridge.exposeInMainWorld('fs', {
  getFiles: (dirPath?: string): Promise<FileInfo[]> => ipcRenderer.invoke('get-files', dirPath),
  readFile: (filePath: string): Promise<string | null> => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, content: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('write-file', filePath, content),
  createDirectory: (dirPath: string): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('create-directory', dirPath),
});

contextBridge.exposeInMainWorld('appUtils', {
  logError: (error: any): void => ipcRenderer.send('log-error', error),
  exportLogs: (): Promise<{ success: boolean; path?: string; error?: string }> => ipcRenderer.invoke('export-logs'),
  updateTitle: (filePath?: string): void => ipcRenderer.send('update-title', filePath),
});

contextBridge.exposeInMainWorld('styleManager', {
  setRule: (selector: string, styles: StyleObject): void => dynamicStyleManager.setRule(selector, styles),
});