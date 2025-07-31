import { DirectoryManager } from './directoryManager';
import { FileOperations } from './fileOperations';
import { PathResolver } from './pathResolver';
import { FileSystemWatcher } from './fileSystemWatcher';
import type { FileChangeEvent } from './fileSystemWatcher';

export class FileManagerCore {
  private directoryManager: DirectoryManager;
  private fileOperations: FileOperations;
  private pathResolver: PathResolver;
  private fileWatcher: FileSystemWatcher;
  private rootDir: string;

  constructor() {
    this.directoryManager = new DirectoryManager();
    this.fileOperations = new FileOperations();
    this.rootDir = this.directoryManager.getRootDir();
    this.pathResolver = new PathResolver(this.rootDir);
    this.fileWatcher = new FileSystemWatcher();
    
    this.initialize();
  }

  private initialize(): void {
    this.directoryManager.ensureRootDir();
    this.fileWatcher.watchDirectory(this.rootDir);
  }

  // ルート配下のファイル・ディレクトリ一覧を取得
  listRootContents(): string[] {
    return this.directoryManager.listContents(this.rootDir);
  }

  // ファイル作成
  createFile(name: string, content = ''): string {
    if (!this.pathResolver.validatePath(name)) {
      throw new Error('Invalid file path');
    }
    const filePath = this.pathResolver.resolve(name);
    this.fileOperations.createFile(filePath, content);
    return filePath;
  }

  // フォルダ内でのファイル作成
  createFileInFolder(folderPath: string, fileName: string, content = ''): string {
    const createFileInThisFolder = this.fileOperations.createFileInFolder(folderPath);
    createFileInThisFolder(fileName, content);
    const fullPath = `${folderPath}/${fileName}`;
    return fullPath;
  }

  // ファイル削除
  deleteFile(name: string): void {
    if (!this.pathResolver.validatePath(name)) {
      throw new Error('Invalid file path');
    }
    const filePath = this.pathResolver.resolve(name);
    console.log('Deleting file - input:', name, 'resolved path:', filePath);
    this.fileOperations.deleteFile(filePath);
  }

  // ファイル読み込み
  readFile(name: string): string {
    if (!this.pathResolver.validatePath(name)) {
      throw new Error('Invalid file path');
    }
    const filePath = this.pathResolver.resolve(name);
    return this.fileOperations.readFile(filePath);
  }

  // ファイル書き込み
  writeFile(name: string, content: string): void {
    if (!this.pathResolver.validatePath(name)) {
      throw new Error('Invalid file path');
    }
    const filePath = this.pathResolver.resolve(name);
    this.fileOperations.writeFile(filePath, content);
  }

  // ファイル変更イベントの監視
  onFileChange(callback: (event: FileChangeEvent) => void): void {
    this.fileWatcher.on('fileChange', callback);
  }

  // リソースの解放
  cleanup(): void {
    this.fileWatcher.unwatchAll();
  }

  // ルートディレクトリパスの取得
  getRootDirectory(): string {
    return this.rootDir;
  }
}

// インスタンスをエクスポート（シングルトン想定）
export const fileManagerCore = new FileManagerCore();
