/**
 * C++プログラム実行結果管理クラス
 */

export interface ExecutionResult {
  success: boolean;
  output: string;
  error: string;
  exitCode: number | null;
  executionTime: number | null; // ミリ秒
  memoryUsage: number | null; // KB
  compilationTime: number | null; // ミリ秒
}

export interface ExecutionStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageMemoryUsage: number;
}

export class CppExecutionManager {
  private results: ExecutionResult[] = [];
  private maxResults: number;

  constructor(maxResults: number = 100) {
    this.maxResults = maxResults;
  }

  /**
   * 実行結果を追加
   */
  addResult(result: ExecutionResult): void {
    this.results.push(result);

    // 最大保持数を超えた場合、古い結果を削除
    if (this.results.length > this.maxResults) {
      this.results.shift();
    }
  }

  /**
   * 最新の実行結果を取得
   */
  getLatestResult(): ExecutionResult | null {
    return this.results.length > 0 ? this.results[this.results.length - 1] : null;
  }

  /**
   * 全ての実行結果を取得
   */
  getAllResults(): readonly ExecutionResult[] {
    return Object.freeze([...this.results]);
  }

  /**
   * 成功した実行結果のみを取得
   */
  getSuccessfulResults(): readonly ExecutionResult[] {
    return Object.freeze(this.results.filter(result => result.success));
  }

  /**
   * 失敗した実行結果のみを取得
   */
  getFailedResults(): readonly ExecutionResult[] {
    return Object.freeze(this.results.filter(result => !result.success));
  }

  /**
   * 統計情報を取得
   */
  getStats(): ExecutionStats {
    const successful = this.getSuccessfulResults();
    const failed = this.getFailedResults();

    const executionTimes = this.results
      .map(r => r.executionTime)
      .filter((time): time is number => time !== null);

    const memoryUsages = this.results
      .map(r => r.memoryUsage)
      .filter((usage): usage is number => usage !== null);

    return {
      totalExecutions: this.results.length,
      successfulExecutions: successful.length,
      failedExecutions: failed.length,
      averageExecutionTime: executionTimes.length > 0 
        ? executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length 
        : 0,
      averageMemoryUsage: memoryUsages.length > 0 
        ? memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length 
        : 0
    };
  }

  /**
   * 結果をクリア
   */
  clear(): void {
    this.results = [];
  }

  /**
   * 結果をCSV形式で出力
   */
  toCSV(): string {
    const headers = ['success', 'exitCode', 'executionTime', 'memoryUsage', 'compilationTime', 'outputLength', 'errorLength'];
    const rows = this.results.map(result => [
      result.success.toString(),
      result.exitCode?.toString() || '',
      result.executionTime?.toString() || '',
      result.memoryUsage?.toString() || '',
      result.compilationTime?.toString() || '',
      result.output.length.toString(),
      result.error.length.toString()
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * 結果をJSON形式で出力
   */
  toJSON(): string {
    return JSON.stringify({
      results: this.results,
      stats: this.getStats()
    }, null, 2);
  }

  /**
   * パフォーマンス分析を実行
   */
  analyzePerformance(): {
    fastestExecution: ExecutionResult | null;
    slowestExecution: ExecutionResult | null;
    lowestMemoryUsage: ExecutionResult | null;
    highestMemoryUsage: ExecutionResult | null;
    recentTrend: 'improving' | 'degrading' | 'stable';
  } {
    const successful = this.getSuccessfulResults();

    if (successful.length === 0) {
      return {
        fastestExecution: null,
        slowestExecution: null,
        lowestMemoryUsage: null,
        highestMemoryUsage: null,
        recentTrend: 'stable'
      };
    }

    const withExecutionTime = successful.filter(r => r.executionTime !== null);
    const withMemoryUsage = successful.filter(r => r.memoryUsage !== null);

    const fastestExecution = withExecutionTime.reduce((fastest, current) => 
      (current.executionTime! < fastest.executionTime!) ? current : fastest
    );

    const slowestExecution = withExecutionTime.reduce((slowest, current) => 
      (current.executionTime! > slowest.executionTime!) ? current : slowest
    );

    const lowestMemoryUsage = withMemoryUsage.reduce((lowest, current) => 
      (current.memoryUsage! < lowest.memoryUsage!) ? current : lowest
    );

    const highestMemoryUsage = withMemoryUsage.reduce((highest, current) => 
      (current.memoryUsage! > highest.memoryUsage!) ? current : highest
    );

    // 最近の傾向を分析（最新10件）
    const recent = successful.slice(-10);
    let recentTrend: 'improving' | 'degrading' | 'stable' = 'stable';

    if (recent.length >= 5) {
      const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
      const secondHalf = recent.slice(Math.floor(recent.length / 2));

      const firstHalfAvg = firstHalf
        .map(r => r.executionTime)
        .filter((time): time is number => time !== null)
        .reduce((sum, time) => sum + time, 0) / firstHalf.length;

      const secondHalfAvg = secondHalf
        .map(r => r.executionTime)
        .filter((time): time is number => time !== null)
        .reduce((sum, time) => sum + time, 0) / secondHalf.length;

      if (secondHalfAvg < firstHalfAvg * 0.9) {
        recentTrend = 'improving';
      } else if (secondHalfAvg > firstHalfAvg * 1.1) {
        recentTrend = 'degrading';
      }
    }

    return {
      fastestExecution,
      slowestExecution,
      lowestMemoryUsage,
      highestMemoryUsage,
      recentTrend
    };
  }
}
