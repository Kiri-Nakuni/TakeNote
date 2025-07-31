import { app } from 'electron';
import { join, dirname } from 'path';
import { promises as fs } from 'fs';
import { FileOperations } from './fileOperations';
import { PathResolver } from './pathResolver';

/**
 * 設定ファイル専用のファイル管理クラス
 * AppDataディレクトリ配下の設定ファイルを管理
 */
export class ConfigFileManager {
  private fileOperations: FileOperations;
  private pathResolver: PathResolver;
  private configDir: string;

  constructor() {
    this.configDir = join(app.getPath('userData'), 'config');
    this.fileOperations = new FileOperations();
    this.pathResolver = new PathResolver(this.configDir);
  }

  /**
   * 設定ディレクトリを初期化
   */
  async initializeConfigDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      console.log('Config directory initialized at:', this.configDir);
    } catch (error) {
      console.error('Failed to initialize config directory:', error);
      throw error;
    }
  }

  /**
   * 設定ファイルを読み込み
   */
  async readConfigFile(fileName: string): Promise<string> {
    try {
      if (!this.pathResolver.validatePath(fileName)) {
        throw new Error(`Invalid config file path: ${fileName}`);
      }
      
      const configPath = this.pathResolver.resolve(fileName);
      return this.fileOperations.readFile(configPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log(`Config file ${fileName} not found`);
        throw new Error(`Config file not found: ${fileName}`);
      }
      console.error(`Error reading config file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * 設定ファイルを書き込み
   */
  async writeConfigFile(fileName: string, content: string): Promise<void> {
    try {
      if (!this.pathResolver.validatePath(fileName)) {
        throw new Error(`Invalid config file path: ${fileName}`);
      }

      const configPath = this.pathResolver.resolve(fileName);
      
      // ディレクトリが存在しない場合は作成
      await fs.mkdir(dirname(configPath), { recursive: true });
      
      this.fileOperations.writeFile(configPath, content);
      console.log(`Config file saved: ${fileName}`);
    } catch (error) {
      console.error(`Failed to save config file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * 設定ファイルが存在するかチェック
   */
  configFileExists(fileName: string): boolean {
    try {
      if (!this.pathResolver.validatePath(fileName)) {
        return false;
      }
      
      const configPath = this.pathResolver.resolve(fileName);
      return this.fileOperations.fileExists(configPath);
    } catch (error) {
      console.error(`Error checking config file existence ${fileName}:`, error);
      return false;
    }
  }

  /**
   * 設定ファイルを削除
   */
  async deleteConfigFile(fileName: string): Promise<void> {
    try {
      if (!this.pathResolver.validatePath(fileName)) {
        throw new Error(`Invalid config file path: ${fileName}`);
      }
      
      const configPath = this.pathResolver.resolve(fileName);
      this.fileOperations.deleteFile(configPath);
      console.log(`Config file deleted: ${fileName}`);
    } catch (error) {
      console.error(`Failed to delete config file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * 設定ディレクトリ内のファイル一覧を取得
   */
  listConfigFiles(): string[] {
    try {
      const files = this.fileOperations.listFiles(this.configDir);
      return files.filter((file: string) => file.endsWith('.json'));
    } catch (error) {
      console.error('Error listing config files:', error);
      return [];
    }
  }

  /**
   * 設定ディレクトリのパスを取得
   */
  getConfigDirectory(): string {
    return this.configDir;
  }

  /**
   * 設定ファイルの完全パスを取得
   */
  getConfigFilePath(fileName: string): string {
    return this.pathResolver.resolve(fileName);
  }

  /**
   * バックアップファイルを作成
   */
  async createBackup(fileName: string): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${fileName}.backup.${timestamp}`;
      
      const originalContent = await this.readConfigFile(fileName);
      await this.writeConfigFile(backupFileName, originalContent);
      
      console.log(`Backup created: ${backupFileName}`);
      return backupFileName;
    } catch (error) {
      console.error(`Failed to create backup for ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * 古いバックアップファイルをクリーンアップ（最新10個を保持）
   */
  async cleanupBackups(fileName: string): Promise<void> {
    try {
      const allFiles = this.listConfigFiles();
      const backupFiles = allFiles
        .filter(file => file.startsWith(`${fileName}.backup.`))
        .sort()
        .reverse(); // 新しい順にソート

      // 10個を超える古いバックアップを削除
      if (backupFiles.length > 10) {
        const filesToDelete = backupFiles.slice(10);
        for (const file of filesToDelete) {
          await this.deleteConfigFile(file);
        }
        console.log(`Cleaned up ${filesToDelete.length} old backup files`);
      }
    } catch (error) {
      console.error('Error cleaning up backup files:', error);
    }
  }
}

// インスタンスをエクスポート（シングルトン想定）
export const configFileManager = new ConfigFileManager();
