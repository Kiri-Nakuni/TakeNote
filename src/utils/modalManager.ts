/**
 * モーダル管理クラス
 */

export type ModalSize = 'small' | 'medium' | 'large' | 'fullscreen';
export type ModalVariant = 'default' | 'info' | 'warning' | 'error' | 'confirm' | 'custom';

export interface ModalState {
  isOpen: boolean;
  title: string;
  content: string;
  type: ModalVariant;
  size: ModalSize;
  closeOnOverlay: boolean;
  closeOnEscape: boolean;
  showCloseButton: boolean;
  zIndex: number;
}

export interface ModalOptions {
  title?: string;
  content?: string;
  type?: ModalVariant;
  size?: ModalSize;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  customClass?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export interface FocusableElement {
  element: HTMLElement;
  tabIndex: number;
}

export class ModalManager {
  private static instance: ModalManager;
  private modalStack: ModalState[];
  private focusStack: HTMLElement[];
  private eventCallbacks: Map<string, ((data: unknown) => void)[]>;
  private baseZIndex: number;

  private constructor() {
    this.modalStack = [];
    this.focusStack = [];
    this.eventCallbacks = new Map();
    this.baseZIndex = 1000;
    
    // グローバルイベントリスナーを設定
    this.setupGlobalEventListeners();
  }

  static getInstance(): ModalManager {
    if (!ModalManager.instance) {
      ModalManager.instance = new ModalManager();
    }
    return ModalManager.instance;
  }

  /**
   * モーダルを開く
   */
  openModal(options: ModalOptions): string {
    const modalId = this.generateModalId();
    
    // 現在のフォーカス要素を保存
    if (document.activeElement instanceof HTMLElement) {
      this.focusStack.push(document.activeElement);
    }

    const modalState: ModalState = {
      isOpen: true,
      title: options.title || '',
      content: options.content || '',
      type: options.type || 'custom',
      size: options.size || 'medium',
      closeOnOverlay: options.closeOnOverlay ?? true,
      closeOnEscape: options.closeOnEscape ?? true,
      showCloseButton: options.showCloseButton ?? true,
      zIndex: this.baseZIndex + this.modalStack.length
    };

    this.modalStack.push(modalState);
    
    // Body要素のスクロールを無効化
    this.disableBodyScroll();
    
    this.emit('modal-opened', { modalId, state: modalState });
    
    return modalId;
  }

  /**
   * モーダルを閉じる
   */
  closeModal(modalId?: string): void {
    if (this.modalStack.length === 0) return;

    // 最上位のモーダルを閉じる
    const closedModal = this.modalStack.pop();
    
    // すべてのモーダルが閉じられた場合
    if (this.modalStack.length === 0) {
      this.enableBodyScroll();
      this.restoreFocus();
    }

    this.emit('modal-closed', { modalId, state: closedModal });
  }

  /**
   * すべてのモーダルを閉じる
   */
  closeAllModals(): void {
    const closedModals = [...this.modalStack];
    this.modalStack = [];
    this.enableBodyScroll();
    this.restoreFocus();
    this.emit('all-modals-closed', closedModals);
  }

  /**
   * 現在のモーダル状態を取得
   */
  getCurrentModal(): ModalState | null {
    return this.modalStack.length > 0 
      ? this.modalStack[this.modalStack.length - 1] 
      : null;
  }

  /**
   * モーダルが開いているかチェック
   */
  hasOpenModals(): boolean {
    return this.modalStack.length > 0;
  }

  /**
   * モーダルのz-indexを取得
   */
  getModalZIndex(): number {
    return this.baseZIndex + this.modalStack.length;
  }

  /**
   * フォーカストラップを設定
   */
  setupFocusTrap(modalElement: HTMLElement): (() => void) {
    const focusableElements = this.getFocusableElements(modalElement);
    
    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0].element;
    const lastElement = focusableElements[focusableElements.length - 1].element;

    // 初期フォーカス設定
    setTimeout(() => {
      firstElement.focus();
    }, 100);

    // Tab キーでのフォーカス循環
    const handleTabKey = (e: KeyboardEvent): void => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    modalElement.addEventListener('keydown', handleTabKey);
    
    // クリーンアップ用の関数を返す
    return () => {
      modalElement.removeEventListener('keydown', handleTabKey);
    };
  }

  /**
   * Tabキーのハンドリング
   */
  handleTabKey(modalId: string, event: KeyboardEvent): void {
    const modal = document.querySelector(`[id*="${modalId}"]`) as HTMLElement;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'input, textarea, select, button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * フォーカス可能な要素を取得
   */
  private getFocusableElements(container: HTMLElement): FocusableElement[] {
    const selectors = [
      'input:not([disabled]):not([type="hidden"])',
      'textarea:not([disabled])',
      'select:not([disabled])',
      'button:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      'a[href]:not([disabled])',
      '[contenteditable]:not([disabled])'
    ];

    const elements = container.querySelectorAll(selectors.join(', '));
    
    return Array.from(elements)
      .filter(el => this.isElementVisible(el as HTMLElement))
      .map(el => ({
        element: el as HTMLElement,
        tabIndex: parseInt((el as HTMLElement).getAttribute('tabindex') || '0')
      }))
      .sort((a, b) => {
        if (a.tabIndex === b.tabIndex) return 0;
        if (a.tabIndex === 0) return 1;
        if (b.tabIndex === 0) return -1;
        return a.tabIndex - b.tabIndex;
      });
  }

  /**
   * 要素が表示されているかチェック
   */
  private isElementVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  /**
   * Bodyスクロールを無効化
   */
  private disableBodyScroll(): void {
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollBarWidth}px`;
  }

  /**
   * Bodyスクロールを有効化
   */
  private enableBodyScroll(): void {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  /**
   * フォーカスを復元
   */
  private restoreFocus(): void {
    const lastFocusedElement = this.focusStack.pop();
    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      setTimeout(() => {
        lastFocusedElement.focus();
      }, 100);
    }
  }

  /**
   * グローバルイベントリスナーを設定
   */
  private setupGlobalEventListeners(): void {
    // Escape キーでモーダルを閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const currentModal = this.getCurrentModal();
        if (currentModal && currentModal.closeOnEscape) {
          this.closeModal();
        }
      }
    });

    // ブラウザバック対応
    window.addEventListener('popstate', () => {
      if (this.hasOpenModals()) {
        this.closeAllModals();
      }
    });
  }

  /**
   * モーダルIDを生成
   */
  private generateModalId(): string {
    return `modal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 確認ダイアログを表示
   */
  confirm(message: string, title = '確認'): Promise<boolean> {
    console.log('ModalManager.confirm called:', { message, title });
    return new Promise((resolve) => {
      // AlertModalコンポーネント用のイベントを発行
      this.emit('confirm', {
        message,
        title,
        resolve: (result: boolean) => {
          console.log('Confirm resolved with:', result);
          resolve(result);
        }
      });
    });
  }

  /**
   * アラートダイアログを表示
   */
  alert(message: string, title = 'お知らせ', type: 'info' | 'warning' | 'error' | 'success' = 'info'): Promise<void> {
    console.log('ModalManager.alert called:', { message, title, type });
    return new Promise((resolve) => {
      // AlertModalコンポーネント用のイベントを発行
      this.emit('alert', {
        message,
        title,
        type,
        resolve: () => {
          console.log('Alert resolved');
          resolve();
        }
      });
    });
  }

  /**
   * モーダルサイズを変更
   */
  resizeModal(size: ModalState['size']): void {
    const currentModal = this.getCurrentModal();
    if (currentModal) {
      currentModal.size = size;
      this.emit('modal-resized', { size });
    }
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
          console.error(`Error in modal event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * データをリセット
   */
  reset(): void {
    this.closeAllModals();
    this.focusStack = [];
    this.emit('reset');
  }
}

// デフォルトエクスポート
export default ModalManager;
