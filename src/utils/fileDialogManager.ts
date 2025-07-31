/**
 * ファイル作成ダイアログ管理クラス
 */

export interface FileCreateData {
  fileName: string;
  mode: 'note' | 'cpp' | 'text' | 'markdown';
  description: string;
  template?: string;
  targetDirectory?: string;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FileMode {
  id: string;
  name: string;
  icon: string;
  extension: string;
  description: string;
  template?: string;
  isEnabled: boolean;
}

export class FileDialogManager {
  private static instance: FileDialogManager;
  private availableModes: FileMode[];
  private eventCallbacks: Map<string, ((data: unknown) => void)[]>;

  private constructor() {
    this.availableModes = [
      {
        id: 'note',
        name: 'Note モード',
        icon: '📝',
        extension: '.md',
        description: 'マークダウン形式のノートファイル',
        template: '# タイトル\n\n内容をここに記述してください...\n',
        isEnabled: true
      },
      {
        id: 'cpp',
        name: 'C++ モード',
        icon: '💻',
        extension: '.cpp',
        description: 'C++プログラムファイル',
        template: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
        isEnabled: true
      },
      {
        id: 'text',
        name: 'Text モード',
        icon: '📄',
        extension: '.txt',
        description: 'プレーンテキストファイル',
        template: '',
        isEnabled: true
      },
      {
        id: 'markdown',
        name: 'Markdown モード',
        icon: '📋',
        extension: '.md',
        description: 'マークダウンドキュメント',
        template: '# ドキュメントタイトル\n\n## 概要\n\n内容...\n',
        isEnabled: true
      }
    ];

    this.eventCallbacks = new Map();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): FileDialogManager {
    if (!FileDialogManager.instance) {
      FileDialogManager.instance = new FileDialogManager();
    }
    return FileDialogManager.instance;
  }

  /**
   * 利用可能なファイルモードを取得
   */
  getAvailableModes(): FileMode[] {
    return this.availableModes.filter(mode => mode.isEnabled);
  }

  /**
   * 特定のモードを取得
   */
  getMode(modeId: string): FileMode | null {
    return this.availableModes.find(mode => mode.id === modeId) || null;
  }

  /**
   * ファイル名の妥当性を検証
   */
  validateFileName(fileName: string): FileValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 空文字チェック
    if (!fileName.trim()) {
      errors.push('ファイル名を入力してください');
      return { isValid: false, errors, warnings };
    }

    // 長さチェック
    if (fileName.length > 255) {
      errors.push('ファイル名が長すぎます（255文字以内で入力してください）');
    }

    // 無効な文字チェック
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(fileName)) {
      errors.push('ファイル名に使用できない文字が含まれています: < > : " / \\ | ? *');
    }

    // 予約語チェック（Windows）
    const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;
    const nameWithoutExt = fileName.replace(/\.[^.]*$/, '');
    if (reservedNames.test(nameWithoutExt)) {
      errors.push('予約されたファイル名です');
    }

    // 先頭・末尾の空白チェック
    if (fileName !== fileName.trim()) {
      warnings.push('ファイル名の先頭または末尾に空白が含まれています');
    }

    // ピリオドで始まるファイル名の警告
    if (fileName.startsWith('.')) {
      warnings.push('隠しファイルとして作成されます');
    }

    // 日本語文字チェック（ASCII以外の文字）
    if (/[^\u0020-\u007E]/.test(fileName)) {
      warnings.push('ファイル名に日本語文字が含まれています');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * ファイル名に適切な拡張子を追加
   */
  addExtensionIfNeeded(fileName: string, mode: string): string {
    const modeInfo = this.getMode(mode);
    if (!modeInfo) return fileName;

    const extension = modeInfo.extension;
    
    // 既に適切な拡張子がある場合はそのまま
    if (fileName.toLowerCase().endsWith(extension.toLowerCase())) {
      return fileName;
    }

    // 他の拡張子がある場合は警告を出すが、そのまま使用
    if (fileName.includes('.')) {
      return fileName;
    }

    // 拡張子がない場合は追加
    return fileName + extension;
  }

  /**
   * ファイル作成データを検証
   */
  validateCreateData(data: FileCreateData): FileValidationResult {
    const fileNameValidation = this.validateFileName(data.fileName);
    
    if (!fileNameValidation.isValid) {
      return fileNameValidation;
    }

    const errors: string[] = [];
    const warnings: string[] = [...fileNameValidation.warnings];

    // モードの有効性チェック
    const mode = this.getMode(data.mode);
    if (!mode || !mode.isEnabled) {
      errors.push('選択されたモードは無効です');
    }

    // 説明文の長さチェック
    if (data.description && data.description.length > 1000) {
      warnings.push('説明文が長すぎます（1000文字以内を推奨）');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * ファイル作成用のテンプレートを取得
   */
  getFileTemplate(mode: string, fileName: string, description?: string): string {
    const modeInfo = this.getMode(mode);
    if (!modeInfo || !modeInfo.template) return '';

    let template = modeInfo.template;

    // テンプレート内の変数を置換
    const now = new Date();
    const replacements = {
      '{{fileName}}': fileName.replace(/\.[^.]*$/, ''), // 拡張子を除いたファイル名
      '{{description}}': description || '',
      '{{date}}': now.toLocaleDateString('ja-JP'),
      '{{time}}': now.toLocaleTimeString('ja-JP'),
      '{{year}}': now.getFullYear().toString(),
      '{{month}}': (now.getMonth() + 1).toString().padStart(2, '0'),
      '{{day}}': now.getDate().toString().padStart(2, '0')
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      template = template.replace(new RegExp(placeholder, 'g'), value);
    });

    return template;
  }

  /**
   * ファイル作成データを正規化
   */
  normalizeCreateData(data: Partial<FileCreateData>): FileCreateData {
    const fileName = data.fileName?.trim() || '';
    const mode = data.mode || 'text';
    const description = data.description?.trim() || '';

    return {
      fileName: this.addExtensionIfNeeded(fileName, mode),
      mode: mode as FileCreateData['mode'],
      description,
      template: this.getFileTemplate(mode, fileName, description),
      targetDirectory: data.targetDirectory || undefined
    };
  }

  /**
   * ファイルサイズの推定
   */
  estimateFileSize(data: FileCreateData): number {
    const template = data.template || '';
    const description = data.description || '';
    
    // UTF-8エンコーディングでのバイト数を概算
    return new Blob([template + description]).size;
  }

  /**
   * ファイル作成履歴を記録
   */
  recordCreateHistory(data: FileCreateData): void {
    try {
      const history = this.getCreateHistory();
      const record = {
        ...data,
        createdAt: new Date().toISOString()
      };
      
      history.unshift(record);
      
      // 最大100件まで保持
      if (history.length > 100) {
        history.splice(100);
      }
      
      localStorage.setItem('file_create_history', JSON.stringify(history));
      this.emit('history-updated', history);
    } catch (error) {
      console.warn('Failed to record create history:', error);
    }
  }

  /**
   * ファイル作成履歴を取得
   */
  getCreateHistory(): Array<FileCreateData & { createdAt: string }> {
    try {
      const stored = localStorage.getItem('file_create_history');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load create history:', error);
      return [];
    }
  }

  /**
   * 最近使用したファイル名を取得
   */
  getRecentFileNames(limit = 10): string[] {
    const history = this.getCreateHistory();
    const fileNames = new Set<string>();
    
    for (const record of history) {
      if (fileNames.size >= limit) break;
      fileNames.add(record.fileName);
    }
    
    return Array.from(fileNames);
  }

  /**
   * モードの有効/無効を切り替え
   */
  toggleModeEnabled(modeId: string, enabled: boolean): void {
    const mode = this.availableModes.find(m => m.id === modeId);
    if (mode) {
      mode.isEnabled = enabled;
      this.emit('modes-updated', this.getAvailableModes());
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
          console.error(`Error in file dialog event callback for ${event}:`, error);
        }
      });
    }
  }

  /**
   * データをリセット
   */
  reset(): void {
    // 履歴はリセットしない（ユーザーデータのため）
    this.emit('reset');
  }
}
