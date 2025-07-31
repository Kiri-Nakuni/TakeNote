/**
 * C++ WASM コンパイラ IPC ハンドラー
 * レンダラープロセスからのC++コンパイル・実行要求を処理
 */

import { ipcMain } from 'electron';
import { EmscriptenService, getEmscriptenService, cleanupEmscriptenService } from '../compiler/emscriptenService';
import { WasmExecutor, getWasmExecutor, cleanupWasmExecutor } from '../compiler/wasmExecutor';

export interface CppCompileRequest {
  sourceCode: string;
  options: {
    standard: 'c++11' | 'c++14' | 'c++17' | 'c++20';
    optimization: 'O0' | 'O1' | 'O2' | 'O3';
    warnings: boolean;
    debug: boolean;
    includes?: string[];
    libraries?: string[];
  };
}

export interface CppExecuteRequest {
  wasmPath: string;
  jsPath: string;
  stdin: string;
}

export interface CppCompileResponse {
  success: boolean;
  wasmPath?: string;
  jsPath?: string;
  wasmBinary?: string; // Base64文字列
  errors?: string;
  warnings?: string;
  compileTimeMs: number;
}

export interface CppExecuteResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryUsageKB: number;
  terminated: boolean;
}

export class CppCompilerIPCHandler {
  private emscriptenService: EmscriptenService;
  private wasmExecutor: WasmExecutor;
  private isInitialized = false;

  constructor() {
    this.emscriptenService = getEmscriptenService({
      maxCompileTimeMs: 30000,
      maxFileSizeKB: 100
    });
    
    this.wasmExecutor = getWasmExecutor({
      maxMemoryMB: 64,
      maxExecutionTimeMs: 5000,
      maxOutputSize: 1024 * 1024
    });

    this.setupIPCHandlers();
  }

  /**
   * IPCハンドラーのセットアップ
   */
  private setupIPCHandlers(): void {
    // コンパイラの初期化チェック
    ipcMain.handle('cpp-compiler:check-availability', async () => {
      try {
        console.log('🔍 [IPC Handler] Emscripten利用可能性チェック開始');
        const isAvailable = await this.emscriptenService.checkEmscriptenAvailability();
        console.log('🔍 [IPC Handler] checkEmscriptenAvailability結果:', isAvailable);
        
        this.isInitialized = isAvailable;
        console.log('🔍 [IPC Handler] ハンドラー初期化状態:', this.isInitialized);
        
        // フロントエンドが期待する形式に合わせてレスポンスを構築
        const result = {
          success: true,
          available: isAvailable,
          bundled: true, // バンドル版を使用
          errors: isAvailable ? [] : ['Emscripten SDK not available']
        };
        
        console.log('🔍 [IPC Handler] レスポンス送信:', result);
        return result;
      } catch (error) {
        console.error('🔍 [IPC Handler] Emscripten利用可能性チェックエラー:', error);
        return { 
          success: false, 
          available: false, 
          bundled: false,
          errors: [`利用可能性チェックエラー: ${error}`]
        };
      }
    });

    // C++コードのコンパイル
    ipcMain.handle('cpp-compiler:compile', async (_, request: CppCompileRequest) => {
      console.log('🚀 [IPC Handler] cpp-compiler:compile ハンドラー開始');
      
      try {
        console.log('🔧 [IPC Handler] プレビューパネルからコンパイル開始');
        console.log('📝 [IPC Handler] リクエスト受信:', {
          sourceCodeLength: request?.sourceCode?.length || 0,
          hasOptions: !!request?.options,
          optionsKeys: request?.options ? Object.keys(request.options) : [],
          requestType: typeof request
        });
        
        if (!request) {
          console.error('❌ [IPC Handler] リクエストがnullまたはundefined');
          return {
            success: false,
            errors: 'リクエストが空です',
            compileTimeMs: 0
          } as CppCompileResponse;
        }
        
        console.log('📝 [IPC Handler] ソースコード:', request.sourceCode?.substring(0, 100) + (request.sourceCode?.length > 100 ? '...' : ''));
        console.log('⚙️ [IPC Handler] オプション:', JSON.stringify(request.options, null, 2));
        
        if (!this.isInitialized) {
          console.log('❌ Emscripten未初期化: モックコンパイルを実行');
          // Emscriptenが利用できない場合はモック実装にフォールバック
          return this.mockCompile(request);
        }

        console.log('🚀 Emscriptenコンパイル開始...');
        const result = await this.emscriptenService.compileToWasm(
          request.sourceCode,
          request.options
        );

        console.log('✅ コンパイル完了:', {
          success: result.success,
          hasWasmBinary: !!result.wasmBinary,
          wasmBinaryLength: result.wasmBinary?.length,
          errors: result.errors?.substring(0, 200) + (result.errors && result.errors.length > 200 ? '...' : result.errors || ''),
          warnings: result.warnings?.substring(0, 200) + (result.warnings && result.warnings.length > 200 ? '...' : result.warnings || '')
        });

        // Base64文字列のままIPCで送信（シリアライゼーション問題を回避）
        const response = {
          success: result.success,
          wasmPath: result.wasmPath,
          jsPath: result.jsPath,
          wasmBinary: result.wasmBinary, // Base64文字列
          errors: result.errors,
          warnings: result.warnings,
          compileTimeMs: result.compileTimeMs
        } as CppCompileResponse;
        
        console.log('✅ [IPC Handler] レスポンス送信準備完了:', {
          success: response.success,
          hasWasmBinary: !!response.wasmBinary,
          hasErrors: !!response.errors,
          hasWarnings: !!response.warnings
        });
        
        return response;

      } catch (error) {
        console.error('❌ [IPC Handler] IPC compile error:', error);
        if (error instanceof Error) {
          console.error('❌ [IPC Handler] エラースタック:', error.stack);
        }
        return {
          success: false,
          errors: `コンパイルエラー: ${error}`,
          compileTimeMs: 0
        } as CppCompileResponse;
      }
    });

    // WASMバイナリの実行
    ipcMain.handle('cpp-compiler:execute', async (_, request: CppExecuteRequest) => {
      try {
        console.log('▶️ [C++ Executor] WASM実行開始');
        console.log('📁 WASM Path:', request.wasmPath);
        console.log('📄 JS Path:', request.jsPath);
        console.log('⌨️ 標準入力:', request.stdin || '(empty)');
        
        if (!this.isInitialized) {
          console.log('❌ Emscripten未初期化: モック実行を実行');
          // Emscriptenが利用できない場合はモック実行
          return this.mockExecute(request);
        }

        console.log('🏃 WASM実行中...');
        const result = await this.wasmExecutor.execute(
          request.wasmPath,
          request.jsPath,
          request.stdin
        );

        console.log('✅ 実行完了:', {
          stdout: result.stdout.substring(0, 100) + (result.stdout.length > 100 ? '...' : ''),
          stderr: result.stderr.substring(0, 100) + (result.stderr.length > 100 ? '...' : ''),
          exitCode: result.exitCode,
          executionTimeMs: result.executionTimeMs,
          memoryUsageKB: result.memoryUsageKB,
          terminated: result.terminated
        });

        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          executionTimeMs: result.executionTimeMs,
          memoryUsageKB: result.memoryUsageKB,
          terminated: result.terminated
        } as CppExecuteResponse;

      } catch (error) {
        return {
          stdout: '',
          stderr: `実行エラー: ${error}`,
          exitCode: -1,
          executionTimeMs: 0,
          memoryUsageKB: 0,
          terminated: true
        } as CppExecuteResponse;
      }
    });

    // リソースクリーンアップ
    ipcMain.handle('cpp-compiler:cleanup', async () => {
      try {
        await cleanupEmscriptenService();
        cleanupWasmExecutor();
        this.isInitialized = false;
        return { success: true };
      } catch (error) {
        return { success: false, error: `クリーンアップエラー: ${error}` };
      }
    });
  }

  /**
   * モックコンパイル（Emscripten未利用時）
   */
  private async mockCompile(request: CppCompileRequest): Promise<CppCompileResponse> {
    console.log('🎭 [Mock Compiler] Emscripten未利用 - モックコンパイル実行');
    
    // 簡単な構文チェック
    if (!request.sourceCode.includes('int main')) {
      return {
        success: false,
        errors: 'エラー: main関数が見つかりません\nint main() { ... } を定義してください',
        compileTimeMs: 100
      };
    }

    if (request.sourceCode.includes('syntax_error')) {
      return {
        success: false,
        errors: 'エラー: 構文エラーが検出されました',
        compileTimeMs: 150
      };
    }

    // モック成功レスポンス
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const warnings = request.options.warnings ? '警告: 未使用変数があります' : undefined;
    
    const response: CppCompileResponse = {
      success: true,
      wasmBinary: btoa(String.fromCharCode(0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)), // WASMマジックナンバーをBase64化
      compileTimeMs: 300
    };
    
    if (warnings) {
      response.warnings = warnings;
    }
    
    console.log('✅ [Mock Compiler] モックコンパイル完了 - 成功をシミュレート');
    return response;
  }

  /**
   * モック実行（Emscripten未利用時）
   */
  private async mockExecute(request: CppExecuteRequest): Promise<CppExecuteResponse> {
    console.log('🎭 [Mock Executor] Emscripten未利用 - モック実行開始');
    
    // 簡単な出力シミュレーション
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 100));
    
    let output = 'Hello, World!\n';
    if (request.stdin.trim()) {
      output += `入力された値: ${request.stdin.trim()}\n`;
    }
    output += '注意: これはモック実行です。実際のWASM実行ではありません。\n';
    
    console.log('✅ [Mock Executor] モック実行完了 - Hello Worldを出力');
    
    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      executionTimeMs: Math.floor(Math.random() * 200) + 100,
      memoryUsageKB: Math.floor(Math.random() * 1024) + 512,
      terminated: false
    };
  }

  /**
   * リソースクリーンアップ
   */
  async cleanup(): Promise<void> {
    try {
      await cleanupEmscriptenService();
      cleanupWasmExecutor();
      this.isInitialized = false;
    } catch (error) {
      console.error('C++コンパイラハンドラーのクリーンアップエラー:', error);
    }
  }
}

// シングルトンインスタンス
let cppCompilerHandler: CppCompilerIPCHandler | null = null;

/**
 * C++コンパイラIPCハンドラーの初期化
 */
export function initializeCppCompilerHandler(): CppCompilerIPCHandler {
  if (!cppCompilerHandler) {
    cppCompilerHandler = new CppCompilerIPCHandler();
  }
  return cppCompilerHandler;
}

/**
 * C++コンパイラIPCハンドラーのクリーンアップ
 */
export async function cleanupCppCompilerHandler(): Promise<void> {
  if (cppCompilerHandler) {
    await cppCompilerHandler.cleanup();
    cppCompilerHandler = null;
  }
}
