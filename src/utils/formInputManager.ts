/**
 * フォーム入力管理クラス
 */

export type FormInputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'search' | 'file' | 'date' | 'time' | 'datetime-local';
export type FormInputSize = 'small' | 'medium' | 'large';
export type ValidationState = 'none' | 'pending' | 'valid' | 'invalid';
export type FormatterFunction = (value: string) => string;

export interface FormFieldState {
  value: string | number;
  isValid: boolean;
  isDirty: boolean;
  isTouched: boolean;
  errors: string[];
  warnings: string[];
}

export interface ValidationRule {
  name: string;
  message: string;
  validator: (value: string | number) => boolean;
}

export interface FormInputConfig {
  type: FormInputType;
  label?: string;
  placeholder?: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  size: FormInputSize;
  rows?: number;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  validationRules: ValidationRule[];
}

export interface FormatterConfig {
  type: 'phone' | 'currency' | 'percentage' | 'date' | 'time' | 'custom';
  customFormatter?: (value: string) => string;
  customParser?: (value: string) => string | number;
}

export class FormInputManager {
  private static instance: FormInputManager;
  private fieldStates: Map<string, FormFieldState>;
  private fieldConfigs: Map<string, FormInputConfig>;
  private eventCallbacks: Map<string, ((data: unknown) => void)[]>;

  private constructor() {
    this.fieldStates = new Map();
    this.fieldConfigs = new Map();
    this.eventCallbacks = new Map();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): FormInputManager {
    if (!FormInputManager.instance) {
      FormInputManager.instance = new FormInputManager();
    }
    return FormInputManager.instance;
  }

  /**
   * フィールドを登録
   */
  registerField(fieldId: string, config: Partial<FormInputConfig>): void {
    const defaultConfig: FormInputConfig = {
      type: 'text',
      required: false,
      disabled: false,
      readonly: false,
      size: 'medium',
      validationRules: []
    };

    this.fieldConfigs.set(fieldId, { ...defaultConfig, ...config });
    
    if (!this.fieldStates.has(fieldId)) {
      this.fieldStates.set(fieldId, {
        value: '',
        isValid: true,
        isDirty: false,
        isTouched: false,
        errors: [],
        warnings: []
      });
    }

    this.emit('field-registered', { fieldId, config });
  }

  /**
   * フィールド値を更新
   */
  updateFieldValue(fieldId: string, value: string | number): void {
    const state = this.fieldStates.get(fieldId);
    if (!state) return;

    const oldValue = state.value;
    state.value = value;
    state.isDirty = true;

    // バリデーション実行
    this.validateField(fieldId);

    this.emit('field-value-changed', { 
      fieldId, 
      value, 
      oldValue, 
      state: this.getFieldState(fieldId) 
    });
  }

  /**
   * フィールドのタッチ状態を設定
   */
  setFieldTouched(fieldId: string, touched = true): void {
    const state = this.fieldStates.get(fieldId);
    if (!state) return;

    state.isTouched = touched;
    this.emit('field-touched', { fieldId, touched });
  }

  /**
   * フィールドのバリデーション
   */
  validateField(fieldId: string): boolean {
    const state = this.fieldStates.get(fieldId);
    const config = this.fieldConfigs.get(fieldId);
    if (!state || !config) return false;

    const errors: string[] = [];
    const warnings: string[] = [];
    const value = state.value;

    // 必須チェック
    if (config.required && (!value || value.toString().trim() === '')) {
      errors.push('この項目は必須です');
    }

    // 型別バリデーション
    if (value && value.toString().trim()) {
      switch (config.type) {
        case 'email':
          if (!this.isValidEmail(value.toString())) {
            errors.push('有効なメールアドレスを入力してください');
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            errors.push('有効な数値を入力してください');
          } else {
            if (config.min !== undefined && value < config.min) {
              errors.push(`${config.min}以上の値を入力してください`);
            }
            if (config.max !== undefined && value > config.max) {
              errors.push(`${config.max}以下の値を入力してください`);
            }
          }
          break;
        case 'tel':
          if (!this.isValidPhoneNumber(value.toString())) {
            warnings.push('電話番号の形式を確認してください');
          }
          break;
        case 'url':
          if (!this.isValidUrl(value.toString())) {
            errors.push('有効なURLを入力してください');
          }
          break;
      }

      // 文字数チェック
      const stringValue = value.toString();
      if (config.minLength && stringValue.length < config.minLength) {
        errors.push(`${config.minLength}文字以上で入力してください`);
      }
      if (config.maxLength && stringValue.length > config.maxLength) {
        errors.push(`${config.maxLength}文字以内で入力してください`);
      }

      // パターンチェック
      if (config.pattern && !config.pattern.test(stringValue)) {
        errors.push('入力形式が正しくありません');
      }

      // カスタムバリデーション
      config.validationRules.forEach(rule => {
        if (!rule.validator(value)) {
          errors.push(rule.message);
        }
      });
    }

    state.errors = errors;
    state.warnings = warnings;
    state.isValid = errors.length === 0;

    this.emit('field-validated', { 
      fieldId, 
      isValid: state.isValid, 
      errors, 
      warnings 
    });

    return state.isValid;
  }

  /**
   * フィールド状態を取得
   */
  getFieldState(fieldId: string): FormFieldState | null {
    const state = this.fieldStates.get(fieldId);
    return state ? { ...state } : null;
  }

  /**
   * フィールド設定を取得
   */
  getFieldConfig(fieldId: string): FormInputConfig | null {
    const config = this.fieldConfigs.get(fieldId);
    return config ? { ...config } : null;
  }

  /**
   * 値をフォーマット
   */
  formatValue(value: string | number, formatter: FormatterConfig): string {
    const stringValue = value.toString();

    switch (formatter.type) {
      case 'phone':
        return this.formatPhoneNumber(stringValue);
      case 'currency':
        return this.formatCurrency(typeof value === 'number' ? value : parseFloat(stringValue));
      case 'percentage':
        return this.formatPercentage(typeof value === 'number' ? value : parseFloat(stringValue));
      case 'date':
        return this.formatDate(stringValue);
      case 'time':
        return this.formatTime(stringValue);
      case 'custom':
        return formatter.customFormatter ? formatter.customFormatter(stringValue) : stringValue;
      default:
        return stringValue;
    }
  }

  /**
   * フォーマットされた値をパース
   */
  parseValue(formattedValue: string, formatter: FormatterConfig): string | number {
    switch (formatter.type) {
      case 'phone':
        return this.parsePhoneNumber(formattedValue);
      case 'currency':
        return this.parseCurrency(formattedValue);
      case 'percentage':
        return this.parsePercentage(formattedValue);
      case 'custom':
        return formatter.customParser ? formatter.customParser(formattedValue) : formattedValue;
      default:
        return formattedValue;
    }
  }

  // バリデーション用プライベートメソッド
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^[\d\-+() ]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // フォーマッター用プライベートメソッド
  private formatPhoneNumber(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  }

  private parsePhoneNumber(formatted: string): string {
    return formatted.replace(/\D/g, '');
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount);
  }

  private parseCurrency(formatted: string): number {
    return parseFloat(formatted.replace(/[^\d.-]/g, '')) || 0;
  }

  private formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  private parsePercentage(formatted: string): number {
    return parseFloat(formatted.replace('%', '')) / 100 || 0;
  }

  private formatDate(date: string): string {
    if (!date) return '';
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) return date;
    return parsedDate.toLocaleDateString('ja-JP');
  }

  private formatTime(time: string): string {
    if (!time) return '';
    const parsedTime = new Date(`2000-01-01T${time}`);
    if (isNaN(parsedTime.getTime())) return time;
    return parsedTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * フィールドをリセット
   */
  resetField(fieldId: string): void {
    const state = this.fieldStates.get(fieldId);
    if (!state) return;

    state.value = '';
    state.isValid = true;
    state.isDirty = false;
    state.isTouched = false;
    state.errors = [];
    state.warnings = [];

    this.emit('field-reset', { fieldId });
  }

  /**
   * すべてのフィールドをリセット
   */
  resetAllFields(): void {
    this.fieldStates.forEach((_, fieldId) => {
      this.resetField(fieldId);
    });
    this.emit('all-fields-reset');
  }

  /**
   * フィールドの登録を解除
   */
  unregisterField(fieldId: string): void {
    this.fieldStates.delete(fieldId);
    this.fieldConfigs.delete(fieldId);
    this.emit('field-unregistered', { fieldId });
  }

  /**
   * バリデーションルールを追加
   */
  addValidationRule(fieldId: string, rule: ValidationRule): void {
    const config = this.fieldConfigs.get(fieldId);
    if (!config) return;

    config.validationRules.push(rule);
    this.validateField(fieldId);
  }

  /**
   * バリデーションルールを削除
   */
  removeValidationRule(fieldId: string, ruleName: string): void {
    const config = this.fieldConfigs.get(fieldId);
    if (!config) return;

    config.validationRules = config.validationRules.filter(rule => rule.name !== ruleName);
    this.validateField(fieldId);
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
          console.error(`Error in form input event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * 値をフォーマット（オーバーロード版）
   */
  public formatValue(fieldId: string, value: string): string {
    const config = this.fieldConfigs.get(fieldId);
    if (!config || !config.formatter) {
      return value;
    }
    
    if (typeof config.formatter === 'function') {
      return config.formatter(value);
    }
    
    return this.formatValue(value, config.formatter as FormatterConfig);
  }

  /**
   * バリデーション状態に応じたアイコンを取得
   */
  public getValidationIcon(state: ValidationState): string {
    switch (state) {
      case 'valid':
        return '✓';
      case 'invalid':
        return '✗';
      case 'pending':
        return '⏳';
      default:
        return '';
    }
  }

  /**
   * フィールドのフォーカス状態を設定
   */
  public setFieldFocus(fieldId: string, focused: boolean): void {
    const state = this.fieldStates.get(fieldId);
    if (state) {
      if (focused) {
        state.isTouched = true;
      }
      this.emit('focusChanged', { fieldId, focused, state });
    }
  }

  /**
   * 数値入力の特殊キー処理
   */
  public handleNumberInput(event: KeyboardEvent): void {
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
      'Home', 'End'
    ];

    const target = event.target as HTMLInputElement;
    const value = target.value;
    const key = event.key;

    // 許可されたキーはそのまま通す
    if (allowedKeys.includes(key)) {
      return;
    }

    // 数字は常に許可
    if (/\d/.test(key)) {
      return;
    }

    // 小数点（.）の処理
    if (key === '.' && !value.includes('.')) {
      return;
    }

    // マイナス記号（-）の処理（先頭のみ）
    if (key === '-' && value === '' && target.selectionStart === 0) {
      return;
    }

    // それ以外は阻止
    event.preventDefault();
  }

  /**
   * フィールドのバリデーション（オーバーロード版）
   */
  public validateField(fieldId: string, value?: string): string | null {
    const state = this.fieldStates.get(fieldId);
    const config = this.fieldConfigs.get(fieldId);
    
    if (!state || !config) {
      return 'フィールドが見つかりません';
    }

    const checkValue = value !== undefined ? value : String(state.value);
    
    // 必須チェック
    if (config.required && (!checkValue || checkValue.trim() === '')) {
      return 'この項目は必須です';
    }

    // カスタムバリデータ
    if (config.validator && typeof config.validator === 'function') {
      try {
        const result = config.validator(checkValue);
        if (typeof result === 'string') {
          return result; // エラーメッセージ
        }
        if (!result) {
          return 'バリデーションエラー';
        }
      } catch {
        return 'バリデーション処理でエラーが発生しました';
      }
    }

    // 型別バリデーション
    if (checkValue && checkValue.trim()) {
      switch (config.type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(checkValue)) {
            return 'メールアドレスの形式が正しくありません';
          }
          break;
        case 'tel':
          if (!/^[\d\-+() ]+$/.test(checkValue)) {
            return '電話番号の形式が正しくありません';
          }
          break;
        case 'url':
          try {
            new URL(checkValue);
          } catch {
            return 'URLの形式が正しくありません';
          }
          break;
        case 'number':
          if (isNaN(Number(checkValue))) {
            return '数値を入力してください';
          }
          break;
      }

      // 長さのチェック
      if (config.minLength && checkValue.length < config.minLength) {
        return `${config.minLength}文字以上入力してください`;
      }
      
      if (config.maxLength && checkValue.length > config.maxLength) {
        return `${config.maxLength}文字以下で入力してください`;
      }
    }

    return null; // エラーなし
  }

  /**
   * データをリセット
   */
  reset(): void {
    this.fieldStates.clear();
    this.fieldConfigs.clear();
    this.emit('reset');
  }
}
