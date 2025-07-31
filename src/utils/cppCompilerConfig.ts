/**
 * C++コンパイラ設定管理クラス
 */

export interface CompilerSettings {
  standard: 'c++11' | 'c++14' | 'c++17' | 'c++20';
  optimization: 'O0' | 'O1' | 'O2' | 'O3';
  warnings: boolean;
  debug: boolean;
}

export class CppCompilerConfig {
  private settings: CompilerSettings;

  constructor(initialSettings?: Partial<CompilerSettings>) {
    this.settings = {
      standard: 'c++17',
      optimization: 'O0',
      warnings: true,
      debug: true,
      ...initialSettings
    };
  }

  /**
   * 現在の設定を取得
   */
  getSettings(): CompilerSettings {
    return { ...this.settings };
  }

  /**
   * 設定を更新
   */
  updateSettings(updates: Partial<CompilerSettings>): void {
    this.settings = { ...this.settings, ...updates };
  }

  /**
   * コンパイラフラグを生成
   */
  generateCompilerFlags(): string[] {
    const flags: string[] = [];

    // C++標準
    flags.push(`-std=${this.settings.standard}`);

    // 最適化レベル
    flags.push(`-${this.settings.optimization}`);

    // 警告
    if (this.settings.warnings) {
      flags.push('-Wall', '-Wextra');
    }

    // デバッグ情報
    if (this.settings.debug) {
      flags.push('-g');
    }

    return flags;
  }

  /**
   * 設定をJSON形式で保存
   */
  toJSON(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * JSON形式から設定を復元
   */
  fromJSON(json: string): void {
    try {
      const parsed = JSON.parse(json);
      this.settings = { ...this.settings, ...parsed };
    } catch (error) {
      console.error('Failed to parse compiler settings JSON:', error);
    }
  }

  /**
   * デフォルト設定にリセット
   */
  reset(): void {
    this.settings = {
      standard: 'c++17',
      optimization: 'O0',
      warnings: true,
      debug: true
    };
  }

  /**
   * 設定の検証
   */
  validate(): boolean {
    const validStandards = ['c++11', 'c++14', 'c++17', 'c++20'];
    const validOptimizations = ['O0', 'O1', 'O2', 'O3'];

    return (
      validStandards.includes(this.settings.standard) &&
      validOptimizations.includes(this.settings.optimization) &&
      typeof this.settings.warnings === 'boolean' &&
      typeof this.settings.debug === 'boolean'
    );
  }
}
