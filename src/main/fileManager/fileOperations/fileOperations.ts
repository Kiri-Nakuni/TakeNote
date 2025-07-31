import * as fs from 'fs';
import * as path from 'path';

export class FileOperations {
  // ファイルの存在確認
  exists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  // ファイル作成
createFile(filePath: string, content = ''): void {
    fs.writeFileSync(filePath, content, 'utf8');
}

// カリー化されたファイル作成メソッド
createFileInFolder = (folderPath: string) => (fileName: string, content = ''): void => {
    const filePath = `${folderPath}/${fileName}`;
    this.createFile(filePath, content);
}

  // ファイル読み込み
  readFile(filePath: string): string {
    if (!this.exists(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
  }

  // ファイル書き込み
  writeFile(filePath: string, content: string): void {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  // バイナリファイル読み込み
  readBinaryFile(filePath: string): Buffer {
    if (!this.exists(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    return fs.readFileSync(filePath);
  }

  // バイナリファイル書き込み
  writeBinaryFile(filePath: string, buffer: Buffer): void {
    // ディレクトリが存在しない場合は作成
    const dirPath = path.dirname(filePath);
    if (!this.exists(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);
  }

  // ファイル削除
  deleteFile(filePath: string): void {
    console.log('Attempting to delete file:', filePath);
    if (this.exists(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('File deleted successfully:', filePath);
      } catch (error) {
        console.error('Failed to delete file:', error);
        throw error;
      }
    } else {
      console.log('File does not exist:', filePath);
    }
  }

  // ファイル移動
  moveFile(sourcePath: string, targetPath: string): void {
    if (!this.exists(sourcePath)) {
      throw new Error(`Source file does not exist: ${sourcePath}`);
    }
    fs.renameSync(sourcePath, targetPath);
  }

  // ファイルコピー
  copyFile(sourcePath: string, targetPath: string): void {
    if (!this.exists(sourcePath)) {
      throw new Error(`Source file does not exist: ${sourcePath}`);
    }
    fs.copyFileSync(sourcePath, targetPath);
  }

  // ファイル情報取得
  getFileStats(filePath: string): fs.Stats {
    if (!this.exists(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    return fs.statSync(filePath);
  }

  // ファイル存在確認のエイリアス
  fileExists(filePath: string): boolean {
    return this.exists(filePath);
  }

  // ディレクトリ内のファイル一覧を取得
  listFiles(dirPath: string): string[] {
    if (!this.exists(dirPath)) {
      throw new Error(`Directory does not exist: ${dirPath}`);
    }
    return fs.readdirSync(dirPath);
  }

  // ディレクトリ内のファイルを再帰的に取得
  listFilesRecursive(dirPath: string): string[] {
    const files: string[] = [];
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = `${dirPath}/${item}`;
      const stats = fs.statSync(itemPath);
      
      if (stats.isFile()) {
        files.push(item);
      } else if (stats.isDirectory()) {
        const subFiles = this.listFilesRecursive(itemPath);
        files.push(...subFiles.map(f => `${item}/${f}`));
      }
    }
    
    return files;
  }
}