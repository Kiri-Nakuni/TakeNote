const { contextBridge, ipcRenderer } = require('electron');
const MarkdownIt = require('markdown-it');
const markdownItKatex = require("@vscode/markdown-it-katex").default;
const hljs = require('highlight.js');

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
               hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
               '</code></pre>';
      } catch (__) {}
    }

    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
});

md.use(markdownItKatex, {
  // KaTeXのパースエラーが発生しても例外をスローせず、
  // プレビュー上にエラーメッセージを表示するようにします。
  throwOnError: false
});

contextBridge.exposeInMainWorld('markdown', {
  render: (markdownText) => md.render(markdownText)
});

contextBridge.exposeInMainWorld('fs', {
  getFiles: (dirPath) => ipcRenderer.invoke('get-files', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),
  createDirectory: (dirPath) => ipcRenderer.invoke('create-directory', dirPath),
});

contextBridge.exposeInMainWorld('appUtils', {
  logError: (error) => ipcRenderer.send('log-error', error),
  exportLogs: () => ipcRenderer.invoke('export-logs'),
});