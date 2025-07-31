/**
 * C++ WASM コンパイラインターフェース
 * Emscripten経由でC++コードをコンパイル・実行する
 * 
 * Emscripten未インストール時は適切なエラーメッセージを表示
 */

export interface CompilerOptions {
  standard: 'c++11' | 'c++14' | 'c++17' | 'c++20';
  optimization: 'O0' | 'O1' | 'O2' | 'O3';
  warnings: boolean;
  debug: boolean;
  includes?: string[];
  libraries?: string[];
}

export interface CompileResult {
  success: boolean;
  wasmBinary?: string | undefined; // Base64エンコードされたWASMバイナリ
  errors?: string | undefined;
  warnings?: string | undefined;
  compileTimeMs: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryUsageKB: number;
  terminated: boolean;
}

export interface WasmExecutionLimits {
  maxMemoryMB: number;
  maxExecutionTimeMs: number;
  maxOutputSize: number;
}

export class CppWasmCompiler {
  private isInitialized = false;
  private executionLimits: WasmExecutionLimits;
  private lastWasmPath: string = '';
  private lastJsPath: string = '';
  private useEmscripten = false;

  constructor(limits?: Partial<WasmExecutionLimits>) {
    this.executionLimits = {
      maxMemoryMB: 64,
      maxExecutionTimeMs: 5000,
      maxOutputSize: 1024 * 1024,
      ...limits
    };
  }

  /**
   * WASMコンパイラを初期化
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 [Frontend] C++ WASMコンパイラを初期化中...');
      
      // セキュリティチェック
      await this.validateSecuritySettings();
      
      // Emscriptenの利用可能性をチェック
      console.log('🔄 [Frontend] Emscripten利用可能性チェック中...');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const emscriptenCheck = await (window as any).api.cppCompiler.checkAvailability();
      console.log('🔍 [Frontend] Emscripten利用可能性チェック結果:', emscriptenCheck);
      
      this.useEmscripten = emscriptenCheck.success && emscriptenCheck.available;
      console.log('🔗 [Frontend] useEmscripten設定:', this.useEmscripten);
      
      if (this.useEmscripten) {
        console.log('✅ Emscripten利用可能: 実際のWASMコンパイルを使用します');
        if (emscriptenCheck.bundled) {
          console.log('📦 バンドル版Emscriptenを使用');
        } else {
          console.log('🔧 システムインストール版Emscriptenを使用');
        }
      } else {
        console.log('❌ Emscripten利用不可: インストールまたはセットアップが必要です');
        if (emscriptenCheck.bundled === false) {
          console.log('💡 npm run setup-emscripten を実行してバンドル版をセットアップできます');
        }
      }
      
      this.isInitialized = true;
      console.log('✅ [Frontend] C++ WASMコンパイラの初期化が完了しました');
    } catch (error) {
      console.error('❌ [Frontend] C++ WASMコンパイラの初期化に失敗:', error);
      // 初期化に失敗した場合はEmscripten未利用として処理
      this.useEmscripten = false;
      this.isInitialized = true;
      console.log('Emscripten未利用モードで初期化完了');
    }
  }

  /**
   * C++コードをコンパイル
   */
  async compile(sourceCode: string, options: CompilerOptions): Promise<CompileResult> {
    if (!this.isInitialized) {
      throw new Error('コンパイラが初期化されていません');
    }

    const startTime = performance.now();
    console.log('📝 [Frontend] C++コンパイル開始 - IPCリクエスト送信');
    
    try {
      // コードの事前検証
      this.validateSourceCode(sourceCode);
      
      if (this.useEmscripten) {
        // Emscriptenサービスを使用
        console.log('🔄 [Frontend] IPCリクエスト送信中...');
        console.log('📋 [Frontend] 送信するリクエスト:', {
          sourceCodeLength: sourceCode.length,
          options: JSON.stringify(options)
        });
        
        try {
          // optionsをプレーンオブジェクトに変換してシリアライゼーション問題を回避
          const serializedOptions = {
            standard: options.standard,
            optimization: options.optimization,
            warnings: options.warnings,
            debug: options.debug,
            includes: options.includes ? [...options.includes] : [],
            libraries: options.libraries ? [...options.libraries] : []
          };
          
          const request = {
            sourceCode: sourceCode,
            options: serializedOptions
          };
          
          console.log('📤 [Frontend] シリアライズ済みリクエスト送信...');
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const response = await (window as any).api.cppCompiler.compile(request);
          
          console.log('📦 [Frontend] IPCコンパイル応答受信:', {
            success: response.success,
            hasWasmBinary: !!response.wasmBinary,
            errors: response.errors ? 'あり' : 'なし',
            warnings: response.warnings ? 'あり' : 'なし'
          });
          
          if (!response.success) {
            console.error('📦 [Frontend] コンパイルエラー詳細:', response.errors);
          }
          if (response.warnings) {
            console.warn('📦 [Frontend] コンパイル警告:', response.warnings);
          }
          
          // パスを保存
          if (response.success && response.wasmPath && response.jsPath) {
            this.lastWasmPath = response.wasmPath;
            this.lastJsPath = response.jsPath;
          }
          
          return {
            success: response.success,
            wasmBinary: response.wasmBinary,
            errors: response.errors,
            warnings: response.warnings,
            compileTimeMs: response.compileTimeMs
          };
        } catch (ipcError) {
          console.error('❌ [Frontend] IPCリクエストエラー:', ipcError);
          throw ipcError;
        }
      } else {
        // Emscripten未利用時はエラー
        return {
          success: false,
          errors: this.getEmscriptenInstallationMessage(),
          compileTimeMs: Math.round(performance.now() - startTime)
        };
      }
    } catch (error) {
      const compileTime = performance.now() - startTime;
      return {
        success: false,
        errors: `コンパイルエラー: ${error}`,
        compileTimeMs: Math.round(compileTime)
      };
    }
  }

  /**
   * コンパイル済みWASMバイナリを実行
   */
  async execute(wasmBinary: Uint8Array | string, stdin: string = ''): Promise<ExecutionResult> {
    const startTime = performance.now();
    console.log('▶️ [Frontend] WASM実行開始 - IPCリクエスト送信');
    
    try {
      // 実行時制限チェック
      this.validateExecutionLimits(stdin);
      
      // Base64文字列の場合はUint8Arrayに変換
      let binaryData: Uint8Array;
      if (typeof wasmBinary === 'string') {
        // Base64デコード
        const binaryString = atob(wasmBinary);
        binaryData = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          binaryData[i] = binaryString.charCodeAt(i);
        }
      } else {
        binaryData = wasmBinary;
      }
      
      if (this.useEmscripten && this.lastWasmPath && this.lastJsPath) {
        // Emscriptenサービスを使用
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (window as any).api.cppCompiler.execute({
          wasmPath: this.lastWasmPath,
          jsPath: this.lastJsPath,
          stdin
        });
        
        console.log('🏃 [Frontend] IPC実行応答受信:', {
          stdout: response.stdout.substring(0, 50) + (response.stdout.length > 50 ? '...' : ''),
          exitCode: response.exitCode,
          executionTimeMs: response.executionTimeMs
        });
        
        return {
          stdout: response.stdout,
          stderr: response.stderr,
          exitCode: response.exitCode,
          executionTimeMs: response.executionTimeMs,
          memoryUsageKB: response.memoryUsageKB,
          terminated: response.terminated
        };
      } else {
        console.log('❌ [Frontend] Emscripten未利用または未初期化');
        // Emscripten未利用時はエラー
        return {
          stdout: '',
          stderr: this.getEmscriptenInstallationMessage(),
          exitCode: -1,
          executionTimeMs: Math.round(performance.now() - startTime),
          memoryUsageKB: 0,
          terminated: true
        };
      }
    } catch (error) {
      const executionTime = performance.now() - startTime;
      return {
        stdout: '',
        stderr: `実行エラー: ${error}`,
        exitCode: -1,
        executionTimeMs: Math.round(executionTime),
        memoryUsageKB: 0,
        terminated: true
      };
    }
  }

  /**
   * リソースのクリーンアップ
   */
  async cleanup(): Promise<void> {
    try {
      if (this.useEmscripten) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (window as any).api.cppCompiler.cleanup();
      }
      this.isInitialized = false;
      this.lastWasmPath = '';
      this.lastJsPath = '';
    } catch (error) {
      console.error('クリーンアップエラー:', error);
    }
  }

  /**
   * 初期化状態の確認
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  // プライベートメソッド

  private async validateSecuritySettings(): Promise<void> {
    console.log('セキュリティ設定を確認中...');
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const securityConfig = await (window as any).api.config.get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isDeveloperMode = (securityConfig as any).security?.mode === 'developer';
      
      if (!isDeveloperMode) {
        console.warn('C++実行にはデベロッパーモードが推奨されます');
      }
    } catch (error) {
      console.warn('セキュリティ設定の確認に失敗:', error);
    }
  }

  private validateSourceCode(code: string): void {
    // 基本的なセキュリティチェック
    const forbiddenIncludes = [
      '#include <windows.h>',
      '#include <unistd.h>',
      '#include <sys/socket.h>',
      '#include <sys/types.h>',
      '#include <netinet/in.h>',
      'system(',
      'exec(',
      'popen('
    ];

    for (const forbidden of forbiddenIncludes) {
      if (code.includes(forbidden)) {
        throw new Error(`セキュリティ上の理由により使用できません: ${forbidden}`);
      }
    }

    // コードサイズチェック
    if (code.length > 100000) { // 100KB制限
      throw new Error('ソースコードが大きすぎます（100KB以下にしてください）');
    }
  }

  private validateExecutionLimits(stdin: string): void {
    if (stdin.length > this.executionLimits.maxOutputSize) {
      throw new Error(`入力データが大きすぎます（${this.executionLimits.maxOutputSize}バイト以下にしてください）`);
    }
  }

  /**
   * Emscriptenインストールガイドメッセージを生成
   */
  private getEmscriptenInstallationMessage(): string {
    return `❌ Emscripten C++コンパイラが利用できません

� セットアップ方法（推奨）:
npm run setup-emscripten

このコマンドで自動的にEmscriptenがセットアップされ、アプリケーションにバンドルされます。

�📋 手動インストール手順:

1. Emscripten SDKをインストール:
   git clone https://github.com/emscripten-core/emsdk.git
   cd emsdk
   ./emsdk install latest
   ./emsdk activate latest

2. 環境変数を設定:
   Windows: emsdk_env.bat
   Linux/Mac: source ./emsdk_env.sh

3. アプリケーションを再起動

📖 詳細: https://emscripten.org/docs/getting_started/downloads.html

💡 ヒント: 
- バンドル版を使用すると、ユーザーにEmscriptenのインストールを求める必要がありません
- 開発者モードが有効であることも確認してください`;
  }
}

// シングルトンインスタンス
let compilerInstance: CppWasmCompiler | null = null;

/**
 * グローバルC++コンパイラインスタンスを取得
 */
export function getCppCompiler(limits?: Partial<WasmExecutionLimits>): CppWasmCompiler {
  if (!compilerInstance) {
    compilerInstance = new CppWasmCompiler(limits);
  }
  return compilerInstance;
}

/**
 * C++コンパイラのクリーンアップ
 */
export async function cleanupCppCompiler(): Promise<void> {
  if (compilerInstance) {
    await compilerInstance.cleanup();
    compilerInstance = null;
  }
}
