/**
 * Emscripten C++コンパイラサービス
 * メインプロセスでC++コードをWASMにコンパイル
 */

import { exec, spawn } from 'child_process';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as tmp from 'tmp';
import { promisify } from 'util';
import { getBundledEmscriptenManager } from './bundledEmscriptenManager';

const execAsync = promisify(exec);

export interface EmscriptenConfig {
  emccPath?: string;
  tempDir?: string;
  maxCompileTimeMs: number;
  maxFileSizeKB: number;
}

export interface CompileOptions {
  standard: 'c++11' | 'c++14' | 'c++17' | 'c++20';
  optimization: 'O0' | 'O1' | 'O2' | 'O3';
  warnings: boolean;
  debug: boolean;
  includes?: string[];
  libraries?: string[];
}

export interface CompileResult {
  success: boolean;
  wasmPath?: string;
  jsPath?: string;
  wasmBinary?: string; // Base64エンコードされたWASMバイナリ
  errors?: string;
  warnings?: string;
  compileTimeMs: number;
}

export class EmscriptenService {
  private config: EmscriptenConfig;
  private tempDir: string;
  private bundledEmscriptenManager = getBundledEmscriptenManager();

  constructor(config: Partial<EmscriptenConfig> = {}) {
    this.config = {
      emccPath: config.emccPath || 'emcc',
      tempDir: config.tempDir || '',
      maxCompileTimeMs: config.maxCompileTimeMs || 30000,
      maxFileSizeKB: config.maxFileSizeKB || 100
    };
    
    // 一時ディレクトリの設定
    this.tempDir = config.tempDir || tmp.dirSync({ prefix: 'cpp-wasm-' }).name;
  }

  /**
   * Emscriptenの利用可能性をチェック
   */
  async checkEmscriptenAvailability(): Promise<boolean> {
    try {
      // まずバンドル版Emscriptenをチェック
      console.log('🔍 [Emscripten] Checking bundled version...');
      await this.bundledEmscriptenManager.initialize();
      
      if (this.bundledEmscriptenManager.isAvailable()) {
        const bundled = this.bundledEmscriptenManager.getBundledEmscripten();
        console.log(`✅ [Emscripten] Bundled available: ${bundled?.version} (${bundled?.platform})`);
        
        // バンドル版のemccパスを設定
        if (bundled?.emccPath) {
          this.config.emccPath = bundled.emccPath;
        }
        return true;
      }

      // バンドル版が利用できない場合でも、バンドル版のパスを直接試してみる
      console.log('⚠️ [Emscripten] Bundled detection failed, trying direct path access...');
      const bundled = this.bundledEmscriptenManager.getBundledEmscripten();
      
      if (bundled?.emccPath) {
        try {
          const { stdout } = await execAsync(`"${bundled.emccPath}" --version`);
          console.log(`✅ [Emscripten] Direct access successful: ${stdout.trim()}`);
          this.config.emccPath = bundled.emccPath;
          return true;
        } catch (directError) {
          console.warn('Direct path access also failed:', directError);
        }
      }

      // 最後の手段としてシステム版をチェック（開発環境でのフォールバック）
      console.log('💡 [Emscripten] Trying system version as fallback...');
      const { stdout } = await execAsync(`${this.config.emccPath} --version`);
      console.log('⚠️ [Emscripten] Using system version:', stdout.trim());
      return true;
    } catch (error) {
      console.warn('Emscripten not found:', error);
      return false;
    }
  }

  /**
   * C++コードをWASMにコンパイル
   */
  async compileToWasm(sourceCode: string, options: CompileOptions): Promise<CompileResult> {
    const startTime = Date.now();
    
    try {
      // ソースコードの事前検証
      this.validateSourceCode(sourceCode);
      
      // 一時ファイルの作成
      const tempFiles = await this.createTempFiles(sourceCode);
      
      // Emscriptenコマンドの構築
      const compileArgs = this.buildEmccArgs(tempFiles.source, tempFiles.output, options);
      
      // コンパイル実行
      const result = await this.executeCompilation(compileArgs);
      
      // 結果の処理
      const compileResult = await this.processCompileResult(tempFiles, result, startTime);
      
      // 一時ファイルのクリーンアップ - 成功時は実行後にクリーンアップするため、ここではスキップ
      if (!compileResult.success) {
        await this.cleanupTempFiles(tempFiles);
      } else {
        console.log('🔧 [Emscripten] コンパイル成功: ファイルを実行後まで保持します');
        console.log('🔧 [Emscripten] WASM Path:', tempFiles.wasm);
        console.log('🔧 [Emscripten] JS Path:', tempFiles.js);
      }
      
      return compileResult;
      
    } catch (error) {
      const compileTime = Date.now() - startTime;
      return {
        success: false,
        errors: `コンパイルエラー: ${error}`,
        compileTimeMs: compileTime
      };
    }
  }

  /**
   * ソースコードの検証
   */
  private validateSourceCode(code: string): void {
    // ファイルサイズチェック
    const sizeKB = Buffer.byteLength(code, 'utf8') / 1024;
    if (sizeKB > this.config.maxFileSizeKB) {
      throw new Error(`ソースコードが大きすぎます（${this.config.maxFileSizeKB}KB以下にしてください）`);
    }

    // 基本的なセキュリティチェック
    const forbiddenIncludes = [
      '#include <windows.h>',
      '#include <unistd.h>',
      '#include <sys/socket.h>',
      '#include <netinet/in.h>',
      'system(',
      'exec(',
      'popen(',
      '__asm__',
      'asm volatile'
    ];

    for (const forbidden of forbiddenIncludes) {
      if (code.includes(forbidden)) {
        throw new Error(`セキュリティ上の理由により使用できません: ${forbidden}`);
      }
    }

    // main関数の存在チェック
    if (!code.includes('int main') && !code.includes('void main')) {
      throw new Error('main関数が見つかりません');
    }
  }

  /**
   * 一時ファイルの作成
   */
  private async createTempFiles(sourceCode: string): Promise<{
    source: string;
    output: string;
    wasm: string;
    js: string;
  }> {
    const timestamp = Date.now();
    const baseName = `cpp_${timestamp}`;
    
    const files = {
      source: path.join(this.tempDir, `${baseName}.cpp`),
      output: path.join(this.tempDir, baseName),
      wasm: path.join(this.tempDir, `${baseName}.wasm`),
      js: path.join(this.tempDir, `${baseName}.js`)
    };

    // ソースファイルを書き込み
    await fs.writeFile(files.source, sourceCode, 'utf8');
    
    return files;
  }

  /**
   * Emscriptenコンパイルコマンドの構築
   */
  private buildEmccArgs(sourceFile: string, outputFile: string, options: CompileOptions): string[] {
    // バンドル版Emscriptenの場合は絶対パスを使用
    const emccCommand = this.bundledEmscriptenManager.isAvailable() 
      ? this.bundledEmscriptenManager.getEmccPath()
      : this.config.emccPath!;
      
    const args = [emccCommand];
    
    // ソースファイル
    args.push(sourceFile);
    
    // 出力ファイル
    args.push('-o', `${outputFile}.js`);
    
    // C++標準
    args.push(`-std=${options.standard}`);
    
    // 最適化レベル
    args.push(`-${options.optimization}`);
    
    // 警告
    if (options.warnings) {
      args.push('-Wall', '-Wextra');
    }
    
    // デバッグ情報
    if (options.debug) {
      args.push('-g');
    }
    
    // Emscripten固有のオプション
    args.push(
      '-sWASM=1',                    // WASMを出力
      '-sEXPORTED_RUNTIME_METHODS=[]', // ランタイムメソッドを制限
      '-sALLOW_MEMORY_GROWTH=1',     // メモリ拡張を許可
      '-sMODULARIZE=1',              // モジュール化
      '-sEXPORT_NAME=EmscriptenModule', // モジュール名
      '-sENVIRONMENT=node',          // Node.js環境用（バックエンド実行のため）
      '-sEXPORTED_FUNCTIONS=["_main"]', // main関数をエクスポート
      '-sFILESYSTEM=1',              // ファイルシステムを有効化（stdin/stdout用）
      '-sDISABLE_EXCEPTION_CATCHING=0', // 例外処理を有効化
      '-sNODEJS_CATCH_EXIT=0',       // Node.jsでの exit() 処理を有効化
      '-sFORCE_FILESYSTEM=1',        // ファイルシステムを強制的に有効化
      '-sINVOKE_RUN=1'               // main関数の自動実行を有効化
    );
    
    // C++標準ライブラリを明示的にリンク
    args.push('-lstdc++');
    
    console.log('🔧 [Emscripten] C++標準ライブラリリンクオプション追加');
    
    // 追加インクルードパス
    if (options.includes) {
      for (const include of options.includes) {
        args.push(`-I${include}`);
      }
    }
    
    // ライブラリ
    if (options.libraries) {
      for (const lib of options.libraries) {
        args.push(`-l${lib}`);
      }
    }
    
    return args;
  }

  /**
   * コンパイルの実行
   */
  private executeCompilation(args: string[]): Promise<{ stdout: string; stderr: string; success: boolean }> {
    return new Promise((resolve) => {
      const [command, ...commandArgs] = args;
      console.log('=== Emscripten Compilation Debug ===');
      console.log('Command:', command);
      console.log('Args:', commandArgs.join(' '));
      
      // バンドル版Emscriptenの環境変数を取得
      const bundledEnv = this.bundledEmscriptenManager.isAvailable() 
        ? this.bundledEmscriptenManager.getEnvironmentVariables()
        : {};
      
      console.log('Environment variables:', bundledEnv);
      
      const env: NodeJS.ProcessEnv = {
        ...process.env,
        ...bundledEnv
      };
      
      // Windowsの場合は cmd.exe を使用して .bat ファイルを実行
      let actualCommand: string;
      let actualArgs: string[];
      
      if (process.platform === 'win32' && command.endsWith('.bat')) {
        console.log('Windows detected: Using cmd.exe to execute .bat file');
        actualCommand = 'cmd.exe';
        actualArgs = ['/c', command, ...commandArgs];
      } else {
        actualCommand = command;
        actualArgs = commandArgs;
      }
      
      console.log('Actual command:', actualCommand);
      console.log('Actual args:', actualArgs.join(' '));
      
      const childProcess = spawn(actualCommand, actualArgs, {
        timeout: this.config.maxCompileTimeMs,
        env
      });
      
      let stdout = '';
      let stderr = '';
      
      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data: string) => {
          console.log('STDOUT:', data.toString());
          stdout += data;
        });
      }
      
      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data: string) => {
          console.log('STDERR:', data.toString());
          stderr += data;
        });
      }
      
      childProcess.on('close', (code: number | null) => {
        console.log('Process closed with code:', code);
        console.log('Final stdout:', stdout);
        console.log('Final stderr:', stderr);
        resolve({
          stdout,
          stderr,
          success: code === 0
        });
      });
      
      childProcess.on('error', (error: Error) => {
        console.log('Process error:', error.message);
        resolve({
          stdout,
          stderr: stderr + error.message,
          success: false
        });
      });
    });
  }

  /**
   * コンパイル結果の処理
   */
  private async processCompileResult(
    tempFiles: { source: string; output: string; wasm: string; js: string },
    result: { stdout: string; stderr: string; success: boolean },
    startTime: number
  ): Promise<CompileResult> {
    const compileTime = Date.now() - startTime;
    
    if (!result.success) {
      return {
        success: false,
        errors: result.stderr || 'コンパイルに失敗しました',
        ...(result.stdout && { warnings: result.stdout }),
        compileTimeMs: compileTime
      };
    }
    
    // WASMファイルの確認
    try {
      console.log('🔍 [Emscripten] 生成ファイル確認開始');
      console.log('🔍 [Emscripten] 期待するWASM Path:', tempFiles.wasm);
      console.log('🔍 [Emscripten] 期待するJS Path:', tempFiles.js);
      
      const wasmExists = await fs.pathExists(tempFiles.wasm);
      const jsExists = await fs.pathExists(tempFiles.js);
      
      console.log('🔍 [Emscripten] WASM exists:', wasmExists);
      console.log('🔍 [Emscripten] JS exists:', jsExists);
      
      if (!wasmExists || !jsExists) {
        console.error('❌ [Emscripten] ファイル生成失敗 - WASM:', wasmExists, 'JS:', jsExists);
        return {
          success: false,
          errors: `WASMまたはJSファイルの生成に失敗しました - WASM: ${wasmExists}, JS: ${jsExists}`,
          compileTimeMs: compileTime
        };
      }
      
      console.log('✅ [Emscripten] ファイル生成成功');
      
      // WASMバイナリを読み込み
      const wasmBinary = await fs.readFile(tempFiles.wasm);
      
      return {
        success: true,
        wasmPath: tempFiles.wasm,
        jsPath: tempFiles.js,
        wasmBinary: wasmBinary.toString('base64'), // Base64エンコードしてIPCで送信可能にする
        ...(result.stderr && { warnings: result.stderr }),
        compileTimeMs: compileTime
      };
      
    } catch (error) {
      return {
        success: false,
        errors: `結果処理エラー: ${error}`,
        compileTimeMs: compileTime
      };
    }
  }

  /**
   * 一時ファイルのクリーンアップ
   */
  private async cleanupTempFiles(tempFiles: { source: string; output: string; wasm: string; js: string }): Promise<void> {
    try {
      const filesToClean = [
        tempFiles.source,
        tempFiles.wasm,
        tempFiles.js
      ];
      
      for (const file of filesToClean) {
        if (await fs.pathExists(file)) {
          await fs.remove(file);
        }
      }
    } catch (error) {
      console.warn('一時ファイルのクリーンアップに失敗:', error);
    }
  }

  /**
   * サービスのクリーンアップ
   */
  async cleanup(): Promise<void> {
    try {
      if (await fs.pathExists(this.tempDir)) {
        await fs.remove(this.tempDir);
      }
    } catch (error) {
      console.warn('一時ディレクトリのクリーンアップに失敗:', error);
    }
  }
}

// シングルトンインスタンス
let emscriptenService: EmscriptenService | null = null;

/**
 * Emscriptenサービスのインスタンスを取得
 */
export function getEmscriptenService(config?: Partial<EmscriptenConfig>): EmscriptenService {
  if (!emscriptenService) {
    emscriptenService = new EmscriptenService(config);
  }
  return emscriptenService;
}

/**
 * Emscriptenサービスのクリーンアップ
 */
export async function cleanupEmscriptenService(): Promise<void> {
  if (emscriptenService) {
    await emscriptenService.cleanup();
    emscriptenService = null;
  }
}
