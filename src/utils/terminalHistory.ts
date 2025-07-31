/**
 * ターミナル履歴管理クラス
 */

export interface TerminalLine {
  type: 'info' | 'success' | 'error' | 'warning' | 'compiling' | 'executing';
  prefix: string;
  content: string;
  timestamp: number;
}

export class TerminalHistory {
  private history: TerminalLine[] = [];
  private maxLines: number;

  constructor(maxLines: number = 1000) {
    this.maxLines = maxLines;
  }

  /**
   * ログ行を追加
   */
  addLine(type: TerminalLine['type'], content: string, prefix?: string): void {
    const line: TerminalLine = {
      type,
      prefix: prefix || this.getDefaultPrefix(type),
      content,
      timestamp: Date.now()
    };

    this.history.push(line);

    // 最大行数を超えた場合、古い行を削除
    if (this.history.length > this.maxLines) {
      this.history.shift();
    }
  }

  /**
   * 成功メッセージを追加
   */
  addSuccess(content: string): void {
    this.addLine('success', content);
  }

  /**
   * エラーメッセージを追加
   */
  addError(content: string): void {
    this.addLine('error', content);
  }

  /**
   * 情報メッセージを追加
   */
  addInfo(content: string): void {
    this.addLine('info', content);
  }

  /**
   * 警告メッセージを追加
   */
  addWarning(content: string): void {
    this.addLine('warning', content);
  }

  /**
   * コンパイル中メッセージを追加
   */
  addCompiling(content: string = 'コンパイル中...'): void {
    this.addLine('compiling', content);
  }

  /**
   * 実行中メッセージを追加
   */
  addExecuting(content: string = '実行中...'): void {
    this.addLine('executing', content);
  }

  /**
   * 履歴をクリア
   */
  clear(): void {
    this.history = [];
  }

  /**
   * 全ての履歴を取得
   */
  getHistory(): readonly TerminalLine[] {
    return Object.freeze([...this.history]);
  }

  /**
   * 特定のタイプの履歴のみを取得
   */
  getHistoryByType(type: TerminalLine['type']): readonly TerminalLine[] {
    return Object.freeze(this.history.filter(line => line.type === type));
  }

  /**
   * 最新のN行を取得
   */
  getLatest(count: number): readonly TerminalLine[] {
    return Object.freeze(this.history.slice(-count));
  }

  /**
   * 履歴をテキスト形式で出力
   */
  toText(): string {
    return this.history
      .map(line => `[${new Date(line.timestamp).toLocaleTimeString()}] ${line.prefix} ${line.content}`)
      .join('\n');
  }

  /**
   * 履歴をJSON形式で出力
   */
  toJSON(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * デフォルトのプレフィックスを取得
   */
  private getDefaultPrefix(type: TerminalLine['type']): string {
    const prefixMap: Record<TerminalLine['type'], string> = {
      info: 'ℹ️',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      compiling: '🔄',
      executing: '⚡'
    };

    return prefixMap[type] || 'ℹ️';
  }

  /**
   * 履歴の統計情報を取得
   */
  getStats(): {
    total: number;
    byType: Record<TerminalLine['type'], number>;
    oldest: number | null;
    newest: number | null;
  } {
    const byType: Record<TerminalLine['type'], number> = {
      info: 0,
      success: 0,
      error: 0,
      warning: 0,
      compiling: 0,
      executing: 0
    };

    this.history.forEach(line => {
      byType[line.type]++;
    });

    return {
      total: this.history.length,
      byType,
      oldest: this.history.length > 0 ? this.history[0].timestamp : null,
      newest: this.history.length > 0 ? this.history[this.history.length - 1].timestamp : null
    };
  }
}
