/**
 * UIストリング管理クラス
 * アプリケーション全体のUI文字列を一元管理し、国際化対応を提供
 */

import uiStrings from '@/constants/uiStrings.json';

export interface StringParameters {
  [key: string]: string | number;
}

export interface UIStrings {
  [key: string]: unknown;
}

export class UIStringManager {
  private static instance: UIStringManager;
  private strings: UIStrings;
  private currentLocale: string = 'ja';
  private fallbackLocale: string = 'en';

  private constructor() {
    this.strings = uiStrings;
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): UIStringManager {
    if (!UIStringManager.instance) {
      UIStringManager.instance = new UIStringManager();
    }
    return UIStringManager.instance;
  }

  /**
   * 指定されたキーの文字列を取得
   * @param key - ドット記法のキー (例: "common.save", "dialogs.createFile.title")
   * @param fallback - キーが見つからない場合のフォールバック文字列
   * @param parameters - 文字列内のパラメータを置換するオブジェクト
   * @returns 取得された文字列またはフォールバック
   */
  public getString(
    key: string, 
    fallback?: string, 
    parameters?: StringParameters
  ): string {
    let result = this.getNestedValue(this.strings, key, this.currentLocale);
    
    // 現在のロケールで見つからない場合、フォールバックロケールを試す
    if (result === undefined && this.currentLocale !== this.fallbackLocale) {
      result = this.getNestedValue(this.strings, key, this.fallbackLocale);
    }
    
    // まだ見つからない場合はフォールバックを使用
    if (result === undefined) {
      result = fallback || key;
    }
    
    // パラメータの置換
    if (parameters && typeof result === 'string') {
      result = this.replaceParameters(result, parameters);
    }
    
    return result;
  }

  /**
   * 複数の文字列を一度に取得
   * @param keys - キーの配列
   * @param parameters - 共通のパラメータ
   * @returns キーと文字列のマップ
   */
  public getStrings(
    keys: string[], 
    parameters?: StringParameters
  ): Record<string, string> {
    const result: Record<string, string> = {};
    
    keys.forEach(key => {
      result[key] = this.getString(key, undefined, parameters);
    });
    
    return result;
  }

  /**
   * 現在のロケールを設定
   * @param locale - ロケール文字列 (例: "ja", "en")
   */
  public setLocale(locale: string): void {
    this.currentLocale = locale;
  }

  /**
   * 現在のロケールを取得
   * @returns 現在のロケール
   */
  public getCurrentLocale(): string {
    return this.currentLocale;
  }

  /**
   * フォールバックロケールを設定
   * @param locale - フォールバックロケール
   */
  public setFallbackLocale(locale: string): void {
    this.fallbackLocale = locale;
  }

  /**
   * 利用可能なロケールの一覧を取得
   * @returns ロケールの配列
   */
  public getAvailableLocales(): string[] {
    if (typeof this.strings === 'object' && this.strings !== null) {
      return Object.keys(this.strings).filter(key => typeof this.strings[key] === 'object');
    }
    return ['ja', 'en'];
  }

  /**
   * 文字列データを動的に追加/更新
   * @param key - キー
   * @param value - 値（文字列または多言語オブジェクト）
   * @param locale - 特定のロケールのみ更新する場合
   */
  public addString(
    key: string, 
    value: string | Record<string, string>, 
    locale?: string
  ): void {
    if (locale) {
      this.setNestedValue(this.strings, `${locale}.${key}`, value);
    } else {
      this.setNestedValue(this.strings, key, value);
    }
  }

  /**
   * 名前空間を使用して文字列グループを追加
   * @param namespace - 名前空間
   * @param strings - 文字列オブジェクト
   * @param locale - 特定のロケール
   */
  public addNamespace(
    namespace: string, 
    strings: Record<string, unknown>, 
    locale?: string
  ): void {
    const targetKey = locale ? `${locale}.${namespace}` : namespace;
    this.setNestedValue(this.strings, targetKey, strings);
  }

  /**
   * 文字列の存在確認
   * @param key - チェックするキー
   * @param locale - チェックするロケール（省略時は現在のロケール）
   * @returns 存在する場合true
   */
  public hasString(key: string, locale?: string): boolean {
    const checkLocale = locale || this.currentLocale;
    const value = this.getNestedValue(this.strings, key, checkLocale);
    return value !== undefined;
  }

  /**
   * 文字列をフォーマット（sprintf風）
   * @param template - テンプレート文字列
   * @param args - 引数配列
   * @returns フォーマットされた文字列
   */
  public formatString(template: string, ...args: unknown[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index) => {
      const argIndex = parseInt(index, 10);
      return args[argIndex] !== undefined ? String(args[argIndex]) : match;
    });
  }

  /**
   * 複数形対応の文字列取得
   * @param key - ベースキー
   * @param count - 数量
   * @param parameters - パラメータ
   * @returns 適切な複数形の文字列
   */
  public getPlural(
    key: string, 
    count: number, 
    parameters?: StringParameters
  ): string {
    const params = { ...parameters, count };
    
    // 日本語の場合は複数形なし
    if (this.currentLocale === 'ja') {
      return this.getString(key, undefined, params);
    }
    
    // 英語などの場合
    const pluralKey = count === 1 ? `${key}.one` : `${key}.other`;
    let result = this.getString(pluralKey);
    
    if (result === pluralKey) {
      // 複数形キーが見つからない場合、ベースキーを使用
      result = this.getString(key, undefined, params);
    } else if (parameters) {
      result = this.replaceParameters(result, params);
    }
    
    return result;
  }

  /**
   * ネストされたオブジェクトから値を取得
   * @private
   */
  private getNestedValue(
    obj: Record<string, unknown>, 
    path: string, 
    locale?: string
  ): string | undefined {
    const fullPath = locale ? `${locale}.${path}` : path;
    const keys = fullPath.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return typeof current === 'string' ? current : undefined;
  }

  /**
   * ネストされたオブジェクトに値を設定
   * @private
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  /**
   * 文字列内のパラメータを置換
   * @private
   */
  private replaceParameters(
    template: string, 
    parameters: StringParameters
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return parameters[key] !== undefined ? String(parameters[key]) : match;
    });
  }

  /**
   * デバッグ用：現在の文字列データをログ出力
   */
  public debugStrings(): void {
    console.log('Current UI Strings:', this.strings);
    console.log('Current Locale:', this.currentLocale);
    console.log('Available Locales:', this.getAvailableLocales());
  }

  /**
   * 文字列データをJSONとしてエクスポート
   * @param locale - 特定のロケールのみエクスポートする場合
   * @returns JSON文字列
   */
  public exportStrings(locale?: string): string {
    const data = locale ? 
      { [locale]: this.strings[locale] } : 
      this.strings;
    
    return JSON.stringify(data, null, 2);
  }

  /**
   * 文字列データをJSONからインポート
   * @param jsonData - JSON文字列
   * @param merge - 既存データとマージするかどうか
   */
  public importStrings(jsonData: string, merge: boolean = true): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (merge) {
        this.strings = { ...this.strings, ...data };
      } else {
        this.strings = data;
      }
    } catch (error) {
      console.error('Failed to import strings:', error);
    }
  }

  /**
   * 文字列の変更を監視するためのコールバック
   */
  private changeCallbacks: Array<(key: string, value: string) => void> = [];

  /**
   * 文字列変更の監視を追加
   * @param callback - 変更時に呼び出されるコールバック
   */
  public onStringChange(callback: (key: string, value: string) => void): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * 文字列変更の監視を削除
   * @param callback - 削除するコールバック
   */
  public offStringChange(callback: (key: string, value: string) => void): void {
    const index = this.changeCallbacks.indexOf(callback);
    if (index > -1) {
      this.changeCallbacks.splice(index, 1);
    }
  }

  /**
   * 文字列変更を通知
   * @private
   */
  private notifyStringChange(key: string, value: string): void {
    this.changeCallbacks.forEach(callback => {
      try {
        callback(key, value);
      } catch (error) {
        console.error('Error in string change callback:', error);
      }
    });
  }
}

// デフォルトエクスポート
export default UIStringManager;
