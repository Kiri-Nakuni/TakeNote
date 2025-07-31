// statusBarCore.ts
// ステータスバーの状態管理とロジック

import { ref, computed } from 'vue';

export interface FileStats {
  totalLines: number;
  totalCharacters: number;
  selectedLines: number;
  selectedCharacters: number;
}

export interface CursorPosition {
  line: number;
  column: number;
}

export interface FileInfo {
  name: string;
  isModified: boolean;
  encoding: string;
  lineEnding: string;
  languageMode: string;
}

export class StatusBarCore {
  private fileInfo = ref<FileInfo>({
    name: '',
    isModified: false,
    encoding: 'UTF-8',
    lineEnding: 'LF',
    languageMode: 'Plain Text'
  });

  private fileStats = ref<FileStats>({
    totalLines: 1,
    totalCharacters: 0,
    selectedLines: 0,
    selectedCharacters: 0
  });

  private cursorPosition = ref<CursorPosition>({
    line: 1,
    column: 1
  });

  private selectedText = ref('');

  // 公開用の読み取り専用プロパティ
  readonly fileName = computed(() => this.fileInfo.value.name || '無題');
  readonly isModified = computed(() => this.fileInfo.value.isModified);
  readonly encoding = computed(() => this.fileInfo.value.encoding);
  readonly lineEnding = computed(() => this.fileInfo.value.lineEnding);
  readonly languageMode = computed(() => this.fileInfo.value.languageMode);
  readonly totalLines = computed(() => this.fileStats.value.totalLines);
  readonly totalCharacters = computed(() => this.fileStats.value.totalCharacters);
  readonly selectedLines = computed(() => this.fileStats.value.selectedLines);
  readonly selectedCharacters = computed(() => this.fileStats.value.selectedCharacters);
  readonly cursorLine = computed(() => this.cursorPosition.value.line);
  readonly cursorColumn = computed(() => this.cursorPosition.value.column);
  readonly hasSelection = computed(() => this.selectedText.value.length > 0);

  // ファイル情報の更新
  updateFileInfo(info: Partial<FileInfo>): void {
    this.fileInfo.value = { ...this.fileInfo.value, ...info };
  }

  // ファイル統計の更新
  updateFileStats(content: string): void {
    const lines = content.split('\n');
    this.fileStats.value = {
      totalLines: lines.length,
      totalCharacters: content.length,
      selectedLines: this.fileStats.value.selectedLines,
      selectedCharacters: this.fileStats.value.selectedCharacters
    };
  }

  // 選択テキストの更新
  updateSelection(selectedText: string): void {
    this.selectedText.value = selectedText;
    if (selectedText) {
      const lines = selectedText.split('\n');
      this.fileStats.value.selectedLines = lines.length;
      this.fileStats.value.selectedCharacters = selectedText.length;
    } else {
      this.fileStats.value.selectedLines = 0;
      this.fileStats.value.selectedCharacters = 0;
    }
  }

  // カーソル位置の更新
  updateCursorPosition(line: number, column: number): void {
    this.cursorPosition.value = { line, column };
  }

  // 言語モードの自動判定
  detectLanguageMode(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'vue': 'Vue',
      'md': 'Markdown',
      'json': 'JSON',
      'css': 'CSS',
      'scss': 'SCSS',
      'html': 'HTML',
      'txt': 'Plain Text'
    };
    return languageMap[ext || ''] || 'Plain Text';
  }

  // 修正状態の切り替え
  setModified(isModified: boolean): void {
    this.fileInfo.value.isModified = isModified;
  }

  // リセット（新しいファイル時）
  reset(): void {
    this.fileInfo.value = {
      name: '',
      isModified: false,
      encoding: 'UTF-8',
      lineEnding: 'LF',
      languageMode: 'Plain Text'
    };
    this.fileStats.value = {
      totalLines: 1,
      totalCharacters: 0,
      selectedLines: 0,
      selectedCharacters: 0
    };
    this.cursorPosition.value = { line: 1, column: 1 };
    this.selectedText.value = '';
  }
}

// インスタンスをエクスポート（シングルトン想定）
export const statusBarCore = new StatusBarCore();
