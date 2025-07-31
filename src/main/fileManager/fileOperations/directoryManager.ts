import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export class DirectoryManager {
  private appDataDir: string;
  private rootDirName: string;

  constructor(rootDirName = 'TakeNoteFiles') {
    this.appDataDir = app.getPath('userData');
    this.rootDirName = rootDirName;
  }

  // アプリケーションのルートディレクトリパスを取得
  getRootDir(): string {
    return path.join(this.appDataDir, this.rootDirName);
  }

  // ディレクトリの存在確認
  exists(dirPath: string): boolean {
    return fs.existsSync(dirPath);
  }

  // ディレクトリを作成（再帰的）
  createDirectory(dirPath: string): void {
    if (!this.exists(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  // ルートディレクトリの初期化
  ensureRootDir(): void {
    const rootDir = this.getRootDir();
    this.createDirectory(rootDir);
  }

  // ディレクトリ内容の一覧取得
  listContents(dirPath: string): string[] {
    if (!this.exists(dirPath)) {
      throw new Error(`Directory does not exist: ${dirPath}`);
    }
    return fs.readdirSync(dirPath);
  }

  // ディレクトリ削除
  removeDirectory(dirPath: string): void {
    if (this.exists(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }
}