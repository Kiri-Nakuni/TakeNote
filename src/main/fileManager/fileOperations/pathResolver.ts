import * as path from 'path';

export class PathResolver {
  private rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir);
  }

  // ルートディレクトリ基準の絶対パスを生成
  resolve(inputPath: string): string {
    // 既に絶対パスの場合はそのまま返す
    if (path.isAbsolute(inputPath)) {
      return path.resolve(inputPath);
    }
    // 相対パスの場合はrootDirと結合
    return path.join(this.rootDir, inputPath);
  }

  // パスがルートディレクトリ内かチェック（セキュリティ）
  isWithinRoot(targetPath: string): boolean {
    const resolved = path.resolve(targetPath);
    return resolved.startsWith(this.rootDir);
  }

  // パスの正規化
  normalize(inputPath: string): string {
    return path.normalize(inputPath);
  }

  // ファイル名とディレクトリパスを分離
  parse(filePath: string): path.ParsedPath {
    return path.parse(filePath);
  }

  // 相対パスを取得
  getRelativePath(targetPath: string): string {
    return path.relative(this.rootDir, targetPath);
  }

  // パスの安全性チェック（ディレクトリトラバーサル対策）
  validatePath(inputPath: string): boolean {
    // 絶対パスの場合は、そのパスが存在するかのみチェック
    if (path.isAbsolute(inputPath)) {
      return !inputPath.includes('..');
    }
    // 相対パスの場合は従来通りrootDir内かチェック
    const resolved = this.resolve(inputPath);
    return this.isWithinRoot(resolved) && !inputPath.includes('..');
  }
}