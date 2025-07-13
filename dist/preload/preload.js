"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const markdown_it_1 = __importDefault(require("markdown-it"));
const markdown_it_texmath_1 = __importDefault(require("markdown-it-texmath"));
const katex_1 = __importDefault(require("katex"));
const highlight_js_1 = __importDefault(require("highlight.js"));
// HTMLエスケープ用の関数を事前に取得しておきます。
const escapeHtml = new markdown_it_1.default().utils.escapeHtml;
/**
 * highlight.jsを使用してコードブロックをハイライトする関数。
 * @param str - ハイライト対象のコード文字列
 * @param lang - 言語名
 * @returns ハイライトされたHTML文字列
 */
const highlight = (str, lang) => {
    if (lang && highlight_js_1.default.getLanguage(lang)) {
        try {
            const highlightedValue = highlight_js_1.default.highlight(str, { language: lang, ignoreIllegals: true }).value;
            return `<pre class="hljs"><code>${highlightedValue}</code></pre>`;
        }
        catch (__) {
            // エラーが発生した場合は、フォールバックしてエスケープ処理を行う
        }
    }
    // 言語が未指定またはサポート外の場合、HTMLエスケープしてそのまま表示
    return `<pre class="hljs"><code>${escapeHtml(str)}</code></pre>`;
};
const md = new markdown_it_1.default({
    html: true,
    linkify: true,
    typographer: true,
    highlight,
});
md.use(markdown_it_texmath_1.default, {
    engine: katex_1.default,
    delimiters: 'dollars', // $...$ と $$...$$ を有効にする
    katexOptions: {
        throwOnError: false,
        strict: false,
        // trustに関数を指定し、コンテキストに基づいて動的に信頼するかを決定します。
        // これにより、セキュリティを大幅に向上させることができます。
        trust: (context) => {
            // 許可するクラス名のリスト
            const allowedClasses = ['reflectbox', 'scale-me'];
            // \htmlClassコマンドであり、かつクラス名が許可リストに含まれている場合のみ信頼する
            if (context.command === '\\htmlClass' && allowedClasses.includes(context.class)) {
                return true;
            }
            // \htmlDataコマンドは、動的スケーリングのために許可する
            if (context.command === '\\htmlData') {
                return true;
            }
            // それ以外のコマンドはすべて拒否する
            return false;
        },
        macros: {
            "\\reflectbox": "\\htmlClass{reflectbox}{#1}",
            // \scalebox*{<x-scale>}{<y-scale>}{<content>} (3引数版) と
            // \scalebox{<scale>}{<content>} (2引数版) を定義します。
            "\\scalebox": "\\@ifstar{\\scalebox@xyz}{\\scalebox@xy}",
            "\\scalebox@xyz": "\\htmlData{xscale=#1, yscale=#2}{#3}",
            "\\scalebox@xy": "\\htmlData{xscale=#1, yscale=#1}{#2}",
            "\\XeTeX": "\\textrm{\\html@mathml{X\\kern-.125em\\raisebox{-0.5ex}{\\reflectbox{E}}\\kern-.1667emT\\kern-.1667em\\raisebox{-.5ex}{E}\\kern-.125emX}{XeTeX}}"
        },
    },
});
// --- Dynamic Style Manager ---
// このモジュールは、レンダラープロセスで動的にCSSルールを追加・変更するための安全なAPIを提供します。
// style.cssファイルを直接変更するのではなく、<head>に専用の<style>タグを挿入して管理します。
const dynamicStyleManager = (() => {
    // <style>要素への参照を保持します。DOMの準備ができてから、最初の使用時に作成されます。
    let styleElement = null;
    // 現在のCSSルールをMapとして保持 { ".selector" => "full css rule text" }
    const rules = new Map();
    const updateStyleSheet = () => {
        // 最初のルール設定時に<style>要素をDOMに追加します
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'dynamic-styles';
            document.head.appendChild(styleElement);
        }
        styleElement.textContent = [...rules.values()].join('\n');
    };
    const createStyleString = (styles) => {
        return Object.entries(styles)
            .map(([prop, value]) => {
            const kebabCaseProp = prop.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
            return `${kebabCaseProp}: ${value};`;
        })
            .join(' ');
    };
    return {
        setRule: (selector, styles) => {
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
electron_1.contextBridge.exposeInMainWorld('markdown', {
    render: (markdownText) => md.render(markdownText),
});
electron_1.contextBridge.exposeInMainWorld('fs', {
    getFiles: (dirPath) => electron_1.ipcRenderer.invoke('get-files', dirPath),
    readFile: (filePath) => electron_1.ipcRenderer.invoke('read-file', filePath),
    writeFile: (filePath, content) => electron_1.ipcRenderer.invoke('write-file', filePath, content),
    createDirectory: (dirPath) => electron_1.ipcRenderer.invoke('create-directory', dirPath),
});
electron_1.contextBridge.exposeInMainWorld('appUtils', {
    logError: (error) => electron_1.ipcRenderer.send('log-error', error),
    exportLogs: () => electron_1.ipcRenderer.invoke('export-logs'),
    updateTitle: (filePath) => electron_1.ipcRenderer.send('update-title', filePath),
});
electron_1.contextBridge.exposeInMainWorld('styleManager', {
    setRule: (selector, styles) => dynamicStyleManager.setRule(selector, styles),
});
