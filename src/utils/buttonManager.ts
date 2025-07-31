/**
 * ボタン管理クラス
 */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info' | 'ghost' | 'outline';
export type ButtonSize = 'small' | 'medium' | 'large' | 'xlarge';
export type ButtonType = 'button' | 'submit' | 'reset';

export interface ButtonConfig {
  variant: ButtonVariant;
  size: ButtonSize;
  type: ButtonType;
  disabled: boolean;
  loading: boolean;
  fullWidth: boolean;
  rounded: boolean;
  shadow: boolean;
  ripple: boolean;
}

export interface ButtonState {
  isPressed: boolean;
  isHovered: boolean;
  isFocused: boolean;
  clickCount: number;
  lastClickTime: number;
}

export interface ButtonMetrics {
  totalClicks: number;
  averageResponseTime: number;
  lastUsed: string;
  usageFrequency: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  id: string;
  timestamp: number;
}

export class ButtonManager {
  private static instance: ButtonManager;
  private buttonConfigs: Map<string, ButtonConfig>;
  private buttonStates: Map<string, ButtonState>;
  private buttonMetrics: Map<string, ButtonMetrics>;
  private rippleEffects: Map<string, RippleEffect[]>;
  private eventCallbacks: Map<string, ((data: unknown) => void)[]>;

  private constructor() {
    this.buttonConfigs = new Map();
    this.buttonStates = new Map();
    this.buttonMetrics = new Map();
    this.rippleEffects = new Map();
    this.eventCallbacks = new Map();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): ButtonManager {
    if (!ButtonManager.instance) {
      ButtonManager.instance = new ButtonManager();
    }
    return ButtonManager.instance;
  }

  /**
   * ボタンを登録
   */
  registerButton(buttonId: string, config: Partial<ButtonConfig>): void {
    const defaultConfig: ButtonConfig = {
      variant: 'secondary',
      size: 'medium',
      type: 'button',
      disabled: false,
      loading: false,
      fullWidth: false,
      rounded: false,
      shadow: false,
      ripple: true
    };

    this.buttonConfigs.set(buttonId, { ...defaultConfig, ...config });
    
    if (!this.buttonStates.has(buttonId)) {
      this.buttonStates.set(buttonId, {
        isPressed: false,
        isHovered: false,
        isFocused: false,
        clickCount: 0,
        lastClickTime: 0
      });
    }

    if (!this.buttonMetrics.has(buttonId)) {
      this.buttonMetrics.set(buttonId, {
        totalClicks: 0,
        averageResponseTime: 0,
        lastUsed: '',
        usageFrequency: 0
      });
    }

    this.rippleEffects.set(buttonId, []);

    this.emit('button-registered', { buttonId, config });
  }

  /**
   * ボタン設定を更新
   */
  updateButtonConfig(buttonId: string, updates: Partial<ButtonConfig>): void {
    const config = this.buttonConfigs.get(buttonId);
    if (!config) return;

    Object.assign(config, updates);
    this.emit('button-config-updated', { buttonId, config });
  }

  /**
   * ボタンクリックを処理
   */
  handleButtonClick(buttonId: string, event: MouseEvent): boolean {
    const config = this.buttonConfigs.get(buttonId);
    const state = this.buttonStates.get(buttonId);
    const metrics = this.buttonMetrics.get(buttonId);

    if (!config || !state || !metrics) return false;

    // 無効またはローディング中の場合はクリックを無視
    if (config.disabled || config.loading) {
      return false;
    }

    // ダブルクリック防止
    const now = Date.now();
    if (now - state.lastClickTime < 300) {
      return false;
    }

    // リップル効果の作成
    if (config.ripple) {
      this.createRipple(buttonId, event);
    }

    // 状態更新
    state.clickCount++;
    state.lastClickTime = now;
    state.isPressed = true;

    // メトリクス更新
    metrics.totalClicks++;
    metrics.lastUsed = new Date().toISOString();
    metrics.usageFrequency = this.calculateUsageFrequency(buttonId);

    // プレス状態のリセット
    setTimeout(() => {
      state.isPressed = false;
    }, 150);

    this.emit('button-clicked', { 
      buttonId, 
      event, 
      state: this.getButtonState(buttonId),
      metrics: this.getButtonMetrics(buttonId)
    });

    return true;
  }

  /**
   * ボタンのホバー状態を設定
   */
  setButtonHovered(buttonId: string, hovered: boolean): void {
    const state = this.buttonStates.get(buttonId);
    if (!state) return;

    state.isHovered = hovered;
    this.emit('button-hover-changed', { buttonId, hovered });
  }

  /**
   * ボタンのフォーカス状態を設定
   */
  setButtonFocused(buttonId: string, focused: boolean): void {
    const state = this.buttonStates.get(buttonId);
    if (!state) return;

    state.isFocused = focused;
    this.emit('button-focus-changed', { buttonId, focused });
  }

  /**
   * リップル効果を作成
   */
  private createRipple(buttonId: string, event: MouseEvent): void {
    const ripples = this.rippleEffects.get(buttonId);
    if (!ripples) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const ripple: RippleEffect = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      id: `ripple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    ripples.push(ripple);

    // 古いリップル効果を削除
    setTimeout(() => {
      const index = ripples.findIndex(r => r.id === ripple.id);
      if (index > -1) {
        ripples.splice(index, 1);
      }
    }, 600);

    this.emit('ripple-created', { buttonId, ripple });
  }

  /**
   * 使用頻度を計算
   */
  private calculateUsageFrequency(buttonId: string): number {
    const metrics = this.buttonMetrics.get(buttonId);
    if (!metrics || !metrics.lastUsed) return 0;

    const lastUsed = new Date(metrics.lastUsed);
    const daysSinceLastUse = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);
    
    // 使用頻度は過去30日間の平均クリック数
    return Math.max(0, metrics.totalClicks / Math.max(1, daysSinceLastUse));
  }

  /**
   * ボタンのCSSクラスを生成
   */
  generateButtonClasses(buttonId: string, additionalClasses: string[] = []): string[] {
    const config = this.buttonConfigs.get(buttonId);
    const state = this.buttonStates.get(buttonId);
    
    if (!config || !state) return additionalClasses;

    const classes = [
      'btn',
      `btn--${config.variant}`,
      `btn--${config.size}`,
      ...additionalClasses
    ];

    if (config.disabled || config.loading) {
      classes.push('btn--disabled');
    }

    if (config.loading) {
      classes.push('btn--loading');
    }

    if (config.fullWidth) {
      classes.push('btn--full-width');
    }

    if (config.rounded) {
      classes.push('btn--rounded');
    }

    if (config.shadow) {
      classes.push('btn--shadow');
    }

    if (state.isPressed) {
      classes.push('btn--pressed');
    }

    if (state.isHovered) {
      classes.push('btn--hovered');
    }

    if (state.isFocused) {
      classes.push('btn--focused');
    }

    return classes;
  }

  /**
   * ボタンのARIA属性を生成
   */
  generateAriaAttributes(buttonId: string): Record<string, string | boolean> {
    const config = this.buttonConfigs.get(buttonId);
    const state = this.buttonStates.get(buttonId);

    if (!config || !state) return {};

    const attributes: Record<string, string | boolean> = {
      'aria-disabled': config.disabled,
      'aria-pressed': state.isPressed
    };

    if (config.loading) {
      attributes['aria-busy'] = true;
      attributes['aria-label'] = '読み込み中...';
    }

    return attributes;
  }

  /**
   * ボタン状態を取得
   */
  getButtonState(buttonId: string): ButtonState | null {
    const state = this.buttonStates.get(buttonId);
    return state ? { ...state } : null;
  }

  /**
   * ボタン設定を取得
   */
  getButtonConfig(buttonId: string): ButtonConfig | null {
    const config = this.buttonConfigs.get(buttonId);
    return config ? { ...config } : null;
  }

  /**
   * ボタンメトリクスを取得
   */
  getButtonMetrics(buttonId: string): ButtonMetrics | null {
    const metrics = this.buttonMetrics.get(buttonId);
    return metrics ? { ...metrics } : null;
  }

  /**
   * アクティブなリップル効果を取得
   */
  getActiveRipples(buttonId: string): RippleEffect[] {
    return this.rippleEffects.get(buttonId) || [];
  }

  /**
   * ボタンを無効化
   */
  disableButton(buttonId: string): void {
    this.updateButtonConfig(buttonId, { disabled: true });
  }

  /**
   * ボタンを有効化
   */
  enableButton(buttonId: string): void {
    this.updateButtonConfig(buttonId, { disabled: false });
  }

  /**
   * ローディング状態を設定
   */
  setButtonLoading(buttonId: string, loading: boolean): void {
    this.updateButtonConfig(buttonId, { loading });
  }

  /**
   * 全ボタンの使用統計を取得
   */
  getAllButtonStats(): Record<string, ButtonMetrics> {
    const stats: Record<string, ButtonMetrics> = {};
    
    this.buttonMetrics.forEach((metrics, buttonId) => {
      stats[buttonId] = { ...metrics };
    });

    return stats;
  }

  /**
   * 最も使用されているボタンを取得
   */
  getMostUsedButtons(limit = 10): Array<{ buttonId: string; metrics: ButtonMetrics }> {
    const entries = Array.from(this.buttonMetrics.entries())
      .map(([buttonId, metrics]) => ({ buttonId, metrics }))
      .sort((a, b) => b.metrics.totalClicks - a.metrics.totalClicks)
      .slice(0, limit);

    return entries;
  }

  /**
   * ボタンメトリクスをリセット
   */
  resetButtonMetrics(buttonId: string): void {
    const metrics = this.buttonMetrics.get(buttonId);
    if (!metrics) return;

    metrics.totalClicks = 0;
    metrics.averageResponseTime = 0;
    metrics.lastUsed = '';
    metrics.usageFrequency = 0;

    this.emit('button-metrics-reset', { buttonId });
  }

  /**
   * ボタンの登録を解除
   */
  unregisterButton(buttonId: string): void {
    this.buttonConfigs.delete(buttonId);
    this.buttonStates.delete(buttonId);
    this.buttonMetrics.delete(buttonId);
    this.rippleEffects.delete(buttonId);

    this.emit('button-unregistered', { buttonId });
  }

  /**
   * キーボードアクセシビリティのサポート
   */
  handleKeyDown(buttonId: string, event: KeyboardEvent): boolean {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      return this.handleButtonClick(buttonId, event as unknown as MouseEvent);
    }
    return false;
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
          console.error(`Error in button event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * ボタンのプレス状態を確認
   */
  public isPressed(buttonId: string): boolean {
    const state = this.buttonStates.get(buttonId);
    return state ? state.isPressed : false;
  }

  /**
   * ボタンのプレス状態を設定
   */
  public setPressed(buttonId: string, pressed: boolean): void {
    const state = this.buttonStates.get(buttonId);
    if (state) {
      state.isPressed = pressed;
      this.emit('stateChanged', { buttonId, state });
    }
  }

  /**
   * リップルエフェクトを作成
   */
  public createRippleEffect(element: HTMLElement, event: MouseEvent): void {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';

    element.appendChild(ripple);

    // アニメーション終了後に削除
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  /**
   * ボタンクリックを追跡
   */
  public trackButtonClick(buttonId: string, metadata?: Record<string, unknown>): void {
    const metrics = this.buttonMetrics.get(buttonId);
    if (metrics) {
      metrics.totalClicks++;
      metrics.lastUsed = new Date().toISOString();
      metrics.usageFrequency = this.calculateUsageFrequency(buttonId);
      
      this.emit('buttonTracked', { buttonId, metrics, metadata });
    }
  }

  /**
   * ボタンクリックをハンドル
   */
  public handleClick(buttonId: string, event: MouseEvent): void {
    const config = this.buttonConfigs.get(buttonId);
    const state = this.buttonStates.get(buttonId);
    
    if (!config || !state || config.disabled || config.loading) {
      return;
    }

    const startTime = performance.now();
    
    // メトリクスの更新
    const metrics = this.buttonMetrics.get(buttonId);
    if (metrics) {
      const responseTime = performance.now() - startTime;
      metrics.averageResponseTime = 
        (metrics.averageResponseTime * metrics.totalClicks + responseTime) / 
        (metrics.totalClicks + 1);
    }

    state.clickCount++;
    state.lastClickTime = Date.now();

    this.emit('click', { buttonId, event, config, state });
  }

  /**
   * データをリセット
   */
  reset(): void {
    this.buttonConfigs.clear();
    this.buttonStates.clear();
    this.buttonMetrics.clear();
    this.rippleEffects.clear();
    this.emit('reset');
  }
}
