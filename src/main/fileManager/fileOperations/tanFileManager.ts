import * as path from 'path';
import AdmZip from 'adm-zip';
import { FileOperations } from './fileOperations';

/**
 * C++コンパイラオプション
 */
export interface CppCompilerOptions {
  standard: 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23';
  optimizationLevel: 'O0' | 'O1' | 'O2' | 'O3' | 'Os' | 'Ofast';
  warnings: string[];
  includePaths: string[];
  libraries: string[];
  defines: string[];
  additionalFlags?: string[];
}

/**
 * TANファイル形式の定義
 */
export interface TanFileStructure {
  meta: TanMetadata;
  version: string;
  mode: TanMode;
  hook: TanHook;
  mainFile: {
    name: string;
    content: string;
    extension: string;
  };
}

/**
 * TANファイルのメタデータ
 */
export interface TanMetadata {
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  modifiedAt: string;
  directoryStructure: DirectoryNode[];
  tags?: string[];
  compilerSettings?: CppCompilerOptions; // C++モード用のコンパイラ設定
}

/**
 * ディレクトリ構造のノード
 */
export interface DirectoryNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: DirectoryNode[];
  size?: number;
  modifiedAt?: string;
}

/**
 * TANファイルのモード
 */
export type TanMode = 'note' | 'cpp' | 'javascript' | 'typescript' | 'python' | 'java' | 'book' | 'presentation' | 'other';

/**
 * TANファイルのフック情報
 */
export interface TanHook {
  lineCount: number;
  keys: HookKey[];
  embeddingReferences?: EmbeddingReference[];
}

/**
 * フックキー
 */
export interface HookKey {
  lineNumber: number;
  key: string;
  description?: string;
  type: 'anchor' | 'reference' | 'import' | 'export';
}

/**
 * 埋め込み参照
 */
export interface EmbeddingReference {
  sourceFile: string;
  targetLine: number;
  hookKey: string;
  content: string;
}

/**
 * TANファイル管理クラス
 */
export class TanFileManager {
  private fileOperations: FileOperations;
  private rootDir: string;
  
  constructor(rootDir: string) {
    this.fileOperations = new FileOperations();
    this.rootDir = rootDir;
  }

  /**
   * ファイルパスのバリデーション
   */
  private validateFilePath(filePath: string): boolean {
    // 基本的なパスバリデーション
    if (!filePath || filePath.trim() === '') {
      return false;
    }
    
    // セキュリティ: パストラバーサル攻撃を防ぐ
    if (filePath.includes('..') || filePath.includes('//')) {
      return false;
    }
    
    return true;
  }

  /**
   * TANファイルを作成
   */
  async createTanFile(filePath: string, structure: TanFileStructure): Promise<void> {
    try {
      if (!this.validateFilePath(filePath)) {
        throw new Error(`Invalid file path: ${filePath}`);
      }

      const zip = new AdmZip();
      
      // .meta ファイルを追加
      zip.addFile('.meta', Buffer.from(JSON.stringify(structure.meta, null, 2), 'utf8'));
      
      // .version ファイルを追加
      zip.addFile('.version', Buffer.from(structure.version, 'utf8'));
      
      // .mode ファイルを追加
      zip.addFile('.mode', Buffer.from(structure.mode, 'utf8'));
      
      // .hook ファイルを追加
      zip.addFile('.hook', Buffer.from(JSON.stringify(structure.hook, null, 2), 'utf8'));
      
      // メインファイルを追加
      const mainFileName = `main.${structure.mainFile.extension}`;
      zip.addFile(mainFileName, Buffer.from(structure.mainFile.content, 'utf8'));
      
      // ZIPファイルとして保存（バイナリ形式）
      const zipBuffer = zip.toBuffer();
      this.fileOperations.writeBinaryFile(filePath, zipBuffer);
      
      console.log(`TAN file created: ${filePath}`);
    } catch (error) {
      console.error(`Failed to create TAN file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * TANファイルを読み込み
   */
  async readTanFile(filePath: string): Promise<TanFileStructure> {
    try {
      if (!this.validateFilePath(filePath)) {
        throw new Error(`Invalid file path: ${filePath}`);
      }

      if (!this.fileOperations.exists(filePath)) {
        throw new Error(`TAN file does not exist: ${filePath}`);
      }

      // バイナリファイルとして読み込んでZIPとして解析
      const zipBuffer = this.fileOperations.readBinaryFile(filePath);
      const zip = new AdmZip(zipBuffer);
      
      const entries = zip.getEntries();
      
      // 必須ファイルの存在確認
      const requiredFiles = ['.meta', '.version', '.mode', '.hook'];
      for (const requiredFile of requiredFiles) {
        if (!entries.find(entry => entry.entryName === requiredFile)) {
          throw new Error(`Required file ${requiredFile} not found in TAN file`);
        }
      }
      
      // ファイル内容を取得
      const metaEntry = zip.getEntry('.meta');
      const versionEntry = zip.getEntry('.version');
      const modeEntry = zip.getEntry('.mode');
      const hookEntry = zip.getEntry('.hook');
      
      if (!metaEntry || !versionEntry || !modeEntry || !hookEntry) {
        throw new Error('Failed to read required files from TAN archive');
      }
      
      const meta: TanMetadata = JSON.parse(metaEntry.getData().toString('utf8'));
      const version = versionEntry.getData().toString('utf8');
      const mode = modeEntry.getData().toString('utf8') as TanMode;
      const hook: TanHook = JSON.parse(hookEntry.getData().toString('utf8'));
      
      // メインファイルを検索
      const mainFileEntry = entries.find(entry => 
        entry.entryName.startsWith('main.') && 
        !entry.entryName.startsWith('.')
      );
      
      if (!mainFileEntry) {
        throw new Error('Main file not found in TAN archive');
      }
      
      const mainFileExtension = path.extname(mainFileEntry.entryName).substring(1);
      const mainFileContent = mainFileEntry.getData().toString('utf8');
      
      return {
        meta,
        version,
        mode,
        hook,
        mainFile: {
          name: mainFileEntry.entryName,
          content: mainFileContent,
          extension: mainFileExtension
        }
      };
    } catch (error) {
      console.error(`Failed to read TAN file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * TANファイルの情報のみを取得（高速）
   */
  async getTanFileInfo(filePath: string): Promise<{ meta: TanMetadata; version: string; mode: TanMode }> {
    try {
      if (!this.fileOperations.exists(filePath)) {
        throw new Error(`TAN file does not exist: ${filePath}`);
      }

      const base64Content = this.fileOperations.readFile(filePath);
      const zipBuffer = Buffer.from(base64Content, 'base64');
      const zip = new AdmZip(zipBuffer);
      
      const metaEntry = zip.getEntry('.meta');
      const versionEntry = zip.getEntry('.version');
      const modeEntry = zip.getEntry('.mode');
      
      if (!metaEntry || !versionEntry || !modeEntry) {
        throw new Error('Failed to read info files from TAN archive');
      }
      
      const meta: TanMetadata = JSON.parse(metaEntry.getData().toString('utf8'));
      const version = versionEntry.getData().toString('utf8');
      const mode = modeEntry.getData().toString('utf8') as TanMode;
      
      return { meta, version, mode };
    } catch (error) {
      console.error(`Failed to get TAN file info ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * TANファイルのメタデータを更新
   */
  async updateTanMetadata(filePath: string, newMeta: Partial<TanMetadata>): Promise<void> {
    try {
      const tanFile = await this.readTanFile(filePath);
      
      // メタデータを更新
      tanFile.meta = { ...tanFile.meta, ...newMeta };
      tanFile.meta.modifiedAt = new Date().toISOString();
      
      // ファイルを再作成
      await this.createTanFile(filePath, tanFile);
      
      console.log(`TAN file metadata updated: ${filePath}`);
    } catch (error) {
      console.error(`Failed to update TAN metadata ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * TANファイルのメインコンテンツを更新
   */
  async updateTanContent(filePath: string, newContent: string): Promise<void> {
    try {
      const tanFile = await this.readTanFile(filePath);
      
      // コンテンツを更新
      tanFile.mainFile.content = newContent;
      tanFile.meta.modifiedAt = new Date().toISOString();
      
      // フック情報を更新
      tanFile.hook = this.generateHookInfo(newContent);
      
      // ファイルを再作成
      await this.createTanFile(filePath, tanFile);
      
      console.log(`TAN file content updated: ${filePath}`);
    } catch (error) {
      console.error(`Failed to update TAN content ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * コンテンツからフック情報を生成
   */
  private generateHookInfo(content: string): TanHook {
    const lines = content.split('\n');
    const keys: HookKey[] = [];
    
    lines.forEach((line, index) => {
      // アンカーパターンの検索: <!-- @anchor:key -->
      const anchorMatch = line.match(/<!--\s*@anchor:(\w+)\s*-->/);
      if (anchorMatch) {
        keys.push({
          lineNumber: index + 1,
          key: anchorMatch[1],
          type: 'anchor',
          description: `Anchor at line ${index + 1}`
        });
      }
      
      // 参照パターンの検索: <!-- @ref:key -->
      const refMatch = line.match(/<!--\s*@ref:(\w+)\s*-->/);
      if (refMatch) {
        keys.push({
          lineNumber: index + 1,
          key: refMatch[1],
          type: 'reference',
          description: `Reference at line ${index + 1}`
        });
      }
      
      // インポートパターンの検索: <!-- @import:file -->
      const importMatch = line.match(/<!--\s*@import:(\w+)\s*-->/);
      if (importMatch) {
        keys.push({
          lineNumber: index + 1,
          key: importMatch[1],
          type: 'import',
          description: `Import at line ${index + 1}`
        });
      }
    });
    
    return {
      lineCount: lines.length,
      keys
    };
  }

  /**
   * TANファイルをテキストとしてエクスポート
   */
  async exportToText(filePath: string): Promise<string> {
    try {
      const tanFile = await this.readTanFile(filePath);
      
      let output = '';
      output += `# ${tanFile.meta.title}\n\n`;
      
      if (tanFile.meta.description) {
        output += `${tanFile.meta.description}\n\n`;
      }
      
      output += `**Mode:** ${tanFile.mode}\n`;
      output += `**Version:** ${tanFile.version}\n`;
      output += `**Created:** ${tanFile.meta.createdAt}\n`;
      output += `**Modified:** ${tanFile.meta.modifiedAt}\n\n`;
      
      if (tanFile.meta.tags && tanFile.meta.tags.length > 0) {
        output += `**Tags:** ${tanFile.meta.tags.join(', ')}\n\n`;
      }
      
      output += '---\n\n';
      output += tanFile.mainFile.content;
      
      return output;
    } catch (error) {
      console.error(`Failed to export TAN file to text ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * 指定されたモードに対応する拡張子を取得
   */
  static getExtensionForMode(mode: TanMode): string {
    const extensionMap: Record<TanMode, string> = {
      'note': 'md',
      'cpp': 'cpp',
      'javascript': 'js',
      'typescript': 'ts',
      'python': 'py',
      'java': 'java',
      'book': 'md',
      'presentation': 'md',
      'other': 'txt'
    };
    
    return extensionMap[mode] || 'txt';
  }

  /**
   * C++モード用のTANファイルを作成
   */
  async createCppModeTanFile(filePath: string, options: {
    title: string;
    description?: string;
    tags?: string[];
    compilerOptions?: CppCompilerOptions;
    initialCode?: string;
  }): Promise<void> {
    try {
      // デフォルトのC++コード
      const defaultCppCode = options.initialCode || `#include <iostream>
#include <vector>
#include <string>

using namespace std;

int main() {
    cout << "Hello, C++ World!" << endl;
    return 0;
}`;

      // デフォルトのコンパイラ設定
      const defaultCompilerOptions: CppCompilerOptions = {
        standard: 'c++17',
        optimizationLevel: 'O2',
        warnings: ['all', 'extra'],
        includePaths: [],
        libraries: [],
        defines: [],
        ...(options.compilerOptions || {})
      };

      // メタデータを作成
      const meta: TanMetadata = {
        title: options.title,
        description: options.description || '',
        createdAt: new Date().toISOString(),
        modifiedAt: new Date().toISOString(),
        tags: options.tags || [],
        directoryStructure: [{
          name: 'main.cpp',
          type: 'file',
          path: 'main.cpp'
        }]
      };

      // 空のフック（互換性のため）
      const hook: TanHook = {
        lineCount: defaultCppCode.split('\n').length,
        keys: [],
        embeddingReferences: []
      };

      // TANファイル構造を作成
      const tanStructure: TanFileStructure = {
        meta: {
          ...meta,
          compilerSettings: defaultCompilerOptions  // C++モード特有の設定
        },
        version: '1.0.0',
        mode: 'cpp',
        hook,
        mainFile: {
          name: 'main.cpp',
          content: defaultCppCode,
          extension: 'cpp'
        }
      };

      await this.createTanFile(filePath, tanStructure);
      console.log(`C++ mode TAN file created: ${filePath}`);
    } catch (error) {
      console.error(`Failed to create C++ mode TAN file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * C++モード用のTANファイルのコンパイラ設定を更新
   */
  async updateCppCompilerSettings(filePath: string, compilerOptions: CppCompilerOptions): Promise<void> {
    try {
      const tanFile = await this.readTanFile(filePath);
      
      if (tanFile.mode !== 'cpp') {
        throw new Error('File is not a C++ mode TAN file');
      }

      // メタデータのコンパイラ設定を更新
      tanFile.meta.compilerSettings = compilerOptions;
      tanFile.meta.modifiedAt = new Date().toISOString();

      await this.createTanFile(filePath, tanFile);
      console.log(`C++ compiler settings updated: ${filePath}`);
    } catch (error) {
      console.error(`Failed to update C++ compiler settings ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * TANファイルかどうかを判定
   */
  isTanFile(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.tan';
  }

  /**
   * TANファイルの拡張子を取得
   */
  static getTanExtension(): string {
    return '.tan';
  }
}

// インスタンスをエクスポート（シングルトン想定）
export const tanFileManager = new TanFileManager(process.cwd());
