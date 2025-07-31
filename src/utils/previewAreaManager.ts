/**
 * プレビューエリア管理クラス
 */

export interface PreviewState {
  currentMode: 'markdown' | 'html' | 'pdf' | 'cpp' | 'text' | 'code';
  content: string;
  filePath: string | null;
  isLoading: boolean;
  error: string | null;
  scale: number;
  scrollPosition: { top: number; left: number };
}

export interface MarkdownPreviewOptions {
  highlightSyntax: boolean;
  enableMath: boolean;
  enableMermaid: boolean;
  sanitizeHtml: boolean;
  breaks: boolean;
  linkify: boolean;
  theme: 'github' | 'dark' | 'minimal';
}

export interface HtmlPreviewOptions {
  enableJavaScript: boolean;
  enableCss: boolean;
  sandboxMode: boolean;
  baseUrl: string | null;
}

export interface PdfPreviewOptions {
  scale: number;
  page: number;
  totalPages: number;
  fitToWidth: boolean;
  showControls: boolean;
}

export interface CppPreviewOptions {
  showCompilerOutput: boolean;
  showExecutionResult: boolean;
  autoExecute: boolean;
  inputData: string;
}

export class PreviewAreaManager {
  private static instance: PreviewAreaManager;
  private state: PreviewState;
  private markdownOptions: MarkdownPreviewOptions;
  private htmlOptions: HtmlPreviewOptions;
  private pdfOptions: PdfPreviewOptions;
  private cppOptions: CppPreviewOptions;
  private eventCallbacks: Map<string, ((data: unknown) => void)[]>;

  private constructor() {
    this.state = {
      currentMode: 'text',
      content: '',
      filePath: null,
      isLoading: false,
      error: null,
      scale: 1.0,
      scrollPosition: { top: 0, left: 0 }
    };

    this.markdownOptions = {
      highlightSyntax: true,
      enableMath: true,
      enableMermaid: true,
      sanitizeHtml: true,
      breaks: true,
      linkify: true,
      theme: 'github'
    };

    this.htmlOptions = {
      enableJavaScript: false,
      enableCss: true,
      sandboxMode: true,
      baseUrl: null
    };

    this.pdfOptions = {
      scale: 1.0,
      page: 1,
      totalPages: 1,
      fitToWidth: false,
      showControls: true
    };

    this.cppOptions = {
      showCompilerOutput: true,
      showExecutionResult: true,
      autoExecute: false,
      inputData: ''
    };

    this.eventCallbacks = new Map();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): PreviewAreaManager {
    if (!PreviewAreaManager.instance) {
      PreviewAreaManager.instance = new PreviewAreaManager();
    }
    return PreviewAreaManager.instance;
  }

  /**
   * プレビュー状態を取得
   */
  getState(): PreviewState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * 各種オプションを取得
   */
  getOptions(): Record<string, unknown> {
    return {
      markdown: JSON.parse(JSON.stringify(this.markdownOptions)),
      html: JSON.parse(JSON.stringify(this.htmlOptions)),
      pdf: JSON.parse(JSON.stringify(this.pdfOptions)),
      cpp: JSON.parse(JSON.stringify(this.cppOptions))
    };
  }

  /**
   * プレビューモードを設定
   */
  setMode(mode: PreviewState['currentMode']): void {
    if (this.state.currentMode !== mode) {
      this.state.currentMode = mode;
      this.state.error = null;
      this.emit('mode-changed', mode);
    }
  }

  /**
   * コンテンツを設定してプレビューを更新
   */
  async setContent(content: string, filePath?: string): Promise<void> {
    this.state.content = content;
    this.state.filePath = filePath || null;
    this.state.isLoading = true;
    this.state.error = null;

    this.emit('content-loading');

    try {
      await this.processContent();
      this.emit('content-updated', {
        content: this.state.content,
        mode: this.state.currentMode
      });
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('content-error', this.state.error);
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * ファイルタイプに基づいてモードを自動設定
   */
  setModeFromFile(filePath: string): void {
    const extension = this.getFileExtension(filePath);
    let mode: PreviewState['currentMode'] = 'text';

    switch (extension) {
      case 'md':
      case 'markdown':
        mode = 'markdown';
        break;
      case 'html':
      case 'htm':
        mode = 'html';
        break;
      case 'pdf':
        mode = 'pdf';
        break;
      case 'cpp':
      case 'c':
      case 'cc':
      case 'cxx':
        mode = 'cpp';
        break;
      case 'js':
      case 'ts':
      case 'json':
      case 'css':
      case 'py':
      case 'java':
        mode = 'code';
        break;
      default:
        mode = 'text';
    }

    this.setMode(mode);
  }

  /**
   * コンテンツを処理
   */
  private async processContent(): Promise<void> {
    switch (this.state.currentMode) {
      case 'markdown':
        await this.processMarkdown();
        break;
      case 'html':
        await this.processHtml();
        break;
      case 'pdf':
        await this.processPdf();
        break;
      case 'cpp':
        await this.processCpp();
        break;
      case 'code':
        await this.processCode();
        break;
      case 'text':
      default:
        // テキストモードは特別な処理不要
        break;
    }
  }

  /**
   * Markdownコンテンツを処理
   */
  private async processMarkdown(): Promise<void> {
    // 実際の実装では、marked.jsやmarkdown-itなどを使用
    // ここでは模擬実装
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (this.markdownOptions.highlightSyntax) {
      // シンタックスハイライト処理
    }
    
    if (this.markdownOptions.enableMath) {
      // 数式処理
    }
    
    if (this.markdownOptions.enableMermaid) {
      // Mermaid図表処理
    }
  }

  /**
   * HTMLコンテンツを処理
   */
  private async processHtml(): Promise<void> {
    if (this.htmlOptions.sandboxMode) {
      // HTMLをサンドボックス化
    }
    
    if (!this.htmlOptions.enableJavaScript) {
      // JavaScriptを除去
      this.state.content = this.state.content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
  }

  /**
   * PDFコンテンツを処理
   */
  private async processPdf(): Promise<void> {
    // PDF.jsなどを使用した処理
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  /**
   * C++コンテンツを処理
   */
  private async processCpp(): Promise<void> {
    // C++コンパイル・実行処理
    if (this.cppOptions.autoExecute) {
      // 自動実行
    }
  }

  /**
   * コードコンテンツを処理
   */
  private async processCode(): Promise<void> {
    // シンタックスハイライト処理
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * スケールを設定
   */
  setScale(scale: number): void {
    const clampedScale = Math.max(0.1, Math.min(5.0, scale));
    if (this.state.scale !== clampedScale) {
      this.state.scale = clampedScale;
      this.emit('scale-changed', clampedScale);
    }
  }

  /**
   * スクロール位置を更新
   */
  updateScrollPosition(top: number, left: number): void {
    this.state.scrollPosition = { top, left };
    this.emit('scroll-changed', this.state.scrollPosition);
  }

  /**
   * Markdownオプションを更新
   */
  updateMarkdownOptions(options: Partial<MarkdownPreviewOptions>): void {
    Object.assign(this.markdownOptions, options);
    if (this.state.currentMode === 'markdown') {
      this.setContent(this.state.content, this.state.filePath);
    }
    this.emit('markdown-options-changed', this.markdownOptions);
  }

  /**
   * HTMLオプションを更新
   */
  updateHtmlOptions(options: Partial<HtmlPreviewOptions>): void {
    Object.assign(this.htmlOptions, options);
    if (this.state.currentMode === 'html') {
      this.setContent(this.state.content, this.state.filePath);
    }
    this.emit('html-options-changed', this.htmlOptions);
  }

  /**
   * PDFオプションを更新
   */
  updatePdfOptions(options: Partial<PdfPreviewOptions>): void {
    Object.assign(this.pdfOptions, options);
    this.emit('pdf-options-changed', this.pdfOptions);
  }

  /**
   * C++オプションを更新
   */
  updateCppOptions(options: Partial<CppPreviewOptions>): void {
    Object.assign(this.cppOptions, options);
    this.emit('cpp-options-changed', this.cppOptions);
  }

  /**
   * PDFページを変更
   */
  changePdfPage(page: number): void {
    if (this.state.currentMode === 'pdf') {
      const clampedPage = Math.max(1, Math.min(this.pdfOptions.totalPages, page));
      this.pdfOptions.page = clampedPage;
      this.emit('pdf-page-changed', clampedPage);
    }
  }

  /**
   * プレビューをリフレッシュ
   */
  async refresh(): Promise<void> {
    if (this.state.content) {
      await this.setContent(this.state.content, this.state.filePath);
    }
  }

  /**
   * エラーをクリア
   */
  clearError(): void {
    this.state.error = null;
    this.emit('error-cleared');
  }

  /**
   * ファイル拡張子を取得
   */
  private getFileExtension(filePath: string): string {
    const parts = filePath.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * イベントリスナーを追加
   */
  on(event: string, callback: (data: unknown) => void): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }

  /**
   * イベントリスナーを削除
   */
  off(event: string, callback: (data: unknown) => void): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * イベントを発行
   */
  private emit(event: string, data?: unknown): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in preview event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 状態をリセット
   */
  reset(): void {
    this.state = {
      currentMode: 'text',
      content: '',
      filePath: null,
      isLoading: false,
      error: null,
      scale: 1.0,
      scrollPosition: { top: 0, left: 0 }
    };
    this.emit('reset');
  }
}
