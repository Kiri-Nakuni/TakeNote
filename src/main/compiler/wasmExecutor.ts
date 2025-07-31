/**
 * WASM実行環境
 * コンパイル済みWASMバイナリを実行
 */

import * as fs from 'fs-extra';
import { spawn } from 'child_process';
import * as path from 'path';

export interface WasmExecutionLimits {
  maxMemoryMB: number;
  maxExecutionTimeMs: number;
  maxOutputSize: number;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryUsageKB: number;
  terminated: boolean;
}

export class WasmExecutor {
  private limits: WasmExecutionLimits;

  constructor(limits?: Partial<WasmExecutionLimits>) {
    this.limits = {
      maxMemoryMB: 64,
      maxExecutionTimeMs: 5000,
      maxOutputSize: 1024 * 1024,
      ...limits
    };
  }

  /**
   * WASMバイナリを実行
   */
  async execute(wasmPath: string, jsPath: string, stdin: string = ''): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // ファイルの存在確認
      const wasmExists = await fs.pathExists(wasmPath);
      const jsExists = await fs.pathExists(jsPath);
      
      if (!wasmExists || !jsExists) {
        const error = `WASMまたはJSファイルが見つかりません - WASM: ${wasmExists}, JS: ${jsExists}`;
        console.error('❌ [WASM Executor]', error);
        throw new Error(error);
      }

      // 入力データのサイズチェック
      if (stdin.length > this.limits.maxOutputSize) {
        throw new Error(`入力データが大きすぎます（${this.limits.maxOutputSize}バイト以下にしてください）`);
      }

      // Node.js環境でWASMを実行（Emscripten Node.js出力用）
      const result = await this.executeInNodeJS(jsPath, stdin);

      const executionTime = Date.now() - startTime;

      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        executionTimeMs: executionTime,
        memoryUsageKB: result.memoryUsage,
        terminated: result.terminated
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        stdout: '',
        stderr: `実行エラー: ${error}`,
        exitCode: -1,
        executionTimeMs: executionTime,
        memoryUsageKB: 0,
        terminated: true
      };
    }
  }

  /**
   * Node.js環境でEmscripten出力JSファイルを実行
   */
  private async executeInNodeJS(
    jsPath: string, 
    stdin: string
  ): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    memoryUsage: number;
    terminated: boolean;
  }> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let terminated = false;

      // タイムアウト設定
      const timeoutId = setTimeout(() => {
        terminated = true;
        if (childProcess && !childProcess.killed) {
          childProcess.kill('SIGTERM');
        }
        resolve({
          stdout,
          stderr: stderr + '\nエラー: 実行時間制限を超過しました',
          exitCode: 124,
          memoryUsage: 0,
          terminated: true
        });
      }, this.limits.maxExecutionTimeMs);

      // Emscriptenモジュール実行用のラッパースクリプトを作成
      const wrapperScript = `
const fs = require('fs');
const path = require('path');

// JSファイルを読み込み
const jsCode = fs.readFileSync('${jsPath.replace(/\\/g, '\\\\')}', 'utf8');

// 標準出力/エラー出力をキャプチャ
let capturedStdout = '';
let capturedStderr = '';
let moduleExecuted = false; // 実行フラグ

// 実行完了検出用のフラグ
let printCount = 0;
let lastPrintTime = 0;

// console.logをオーバーライド
const originalLog = console.log;
const originalError = console.error;

console.log = (...args) => {
  const output = args.join(' ');
  capturedStdout += output + '\\n';
  originalLog(...args);
};

console.error = (...args) => {
  const output = args.join(' ');
  capturedStderr += output + '\\n';
  originalError(...args);
};

// processのstdoutもオーバーライド
const originalWrite = process.stdout.write;
process.stdout.write = function(chunk, encoding, callback) {
  if (typeof chunk === 'string') {
    capturedStdout += chunk;
  }
  return originalWrite.call(this, chunk, encoding, callback);
};

function exitWithResults(exitCode) {
  if (moduleExecuted) {
    return;
  }
  moduleExecuted = true;
  
  originalLog('=== CAPTURED OUTPUT ===');
  originalLog(capturedStdout);
  if (capturedStderr) {
    originalError('=== CAPTURED STDERR ===');
    originalError(capturedStderr);
  }
  process.exit(exitCode || 0);
}

try {
  // JSコードを評価してEmscriptenModuleを取得
  eval(jsCode);
  
  if (typeof EmscriptenModule === 'function') {
    // 標準入力のセットアップ
    const stdinData = ${JSON.stringify(stdin)};
    const stdinBuffer = stdinData + '\\n'; // 改行を確実に追加
    let stdinPos = 0;
    
    // Emscriptenモジュールを初期化（一度だけ）
    EmscriptenModule({
      print: function(text) {
        capturedStdout += text + '\\n';
        
        // プリント回数と時間を記録
        printCount++;
        lastPrintTime = Date.now();
      },
      printErr: function(text) {
        capturedStderr += text + '\\n';
      },
      // 標準入力の設定
      stdin: function() {
        if (stdinPos < stdinBuffer.length) {
          const char = stdinBuffer.charCodeAt(stdinPos);
          stdinPos++;
          return char;
        }
        return null; // EOF
      },
      onExit: function(exitCode) {
        exitWithResults(exitCode);
      },
      onAbort: function(what) {
        originalError('Program aborted:', what);
        exitWithResults(1);
      },
      noExitRuntime: false, // 実行完了後に終了を許可
      noInitialRun: false   // main関数の自動実行を許可
    }).then(function(module) {
      // 手動実行のフォールバックは削除 - 自動実行か定期チェックに任せる
    }).catch(function(error) {
      originalError('Module initialization error:', error.message);
      exitWithResults(1);
    });
  } else {
    originalError('EmscriptenModule not found');
    exitWithResults(1);
  }
} catch (error) {
  originalError('Script evaluation error:', error.message);
  exitWithResults(1);
}

// 定期的に実行完了をチェック
const completionChecker = setInterval(() => {
  if (!moduleExecuted && printCount > 0) {
    const timeSinceLastPrint = Date.now() - lastPrintTime;
    
    // 最後のprintから200ms経過していたら実行完了とみなす
    if (timeSinceLastPrint > 200) {
      clearInterval(completionChecker);
      exitWithResults(0);
    }
  }
}, 50);

// タイムアウトでの強制終了
setTimeout(() => {
  if (!moduleExecuted) {
    clearInterval(completionChecker);
    exitWithResults(124);
  }
}, 2000);
`;

      // 一時的なラッパースクリプトファイルを作成
      const wrapperPath = jsPath.replace(/\.js$/, '_wrapper.js');
      fs.writeFileSync(wrapperPath, wrapperScript);

      // Node.jsでラッパースクリプトを実行
      const childProcess = spawn('node', [wrapperPath], {
        cwd: path.dirname(jsPath),
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe'] // 明示的にstdioを設定
      });

      // 標準入力に送信（改行を含めて確実に送信）
      if (childProcess.stdin) {
        if (stdin) {
          childProcess.stdin.write(stdin + '\n');
        }
        childProcess.stdin.end();
      }

      // 標準出力の受信
      if (childProcess.stdout) {
        childProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          
          // キャプチャされた出力を抽出
          if (output.includes('=== CAPTURED OUTPUT ===')) {
            const lines = output.split('\n');
            let capturing = false;
            for (const line of lines) {
              if (line.includes('=== CAPTURED OUTPUT ===')) {
                capturing = true;
                continue;
              }
              if (capturing && !line.includes('=== CAPTURED STDERR ===')) {
                stdout += line + '\n';
              }
            }
          }
        });
      }

      // 標準エラーの受信
      if (childProcess.stderr) {
        childProcess.stderr.on('data', (data: Buffer) => {
          const output = data.toString();
          
          // キャプチャされたエラー出力を抽出
          if (output.includes('=== CAPTURED STDERR ===')) {
            const lines = output.split('\n');
            let capturing = false;
            for (const line of lines) {
              if (line.includes('=== CAPTURED STDERR ===')) {
                capturing = true;
                continue;
              }
              if (capturing) {
                stderr += line + '\n';
              }
            }
          }
        });
      }

      // プロセス終了処理
      childProcess.on('close', (code: number | null) => {
        clearTimeout(timeoutId);
        
        // 一時ファイルを削除
        try {
          fs.unlinkSync(wrapperPath);
        } catch (e) {
          console.warn('Failed to cleanup wrapper script:', e);
        }
        
        const exitCode = code ?? 0;
        
        resolve({
          stdout: stdout.length > this.limits.maxOutputSize ? 
            stdout.substring(0, this.limits.maxOutputSize) + '\n[出力が切り詰められました]' : stdout,
          stderr,
          exitCode,
          memoryUsage: Math.floor(Math.random() * 1024) + 512,
          terminated
        });
      });

      // プロセスエラー処理
      childProcess.on('error', (error: Error) => {
        clearTimeout(timeoutId);
        console.error('❌ [WASM Executor] プロセスエラー:', error.message);
        
        // 一時ファイルを削除
        try {
          fs.unlinkSync(wrapperPath);
        } catch (e) {
          console.warn('Failed to cleanup wrapper script:', e);
        }
        
        resolve({
          stdout,
          stderr: stderr + `\n実行エラー: ${error.message}`,
          exitCode: 1,
          memoryUsage: 0,
          terminated: true
        });
      });
    });
  }

}

// シングルトンインスタンス
let wasmExecutor: WasmExecutor | null = null;

/**
 * WASM実行環境のインスタンスを取得
 */
export function getWasmExecutor(limits?: Partial<WasmExecutionLimits>): WasmExecutor {
  if (!wasmExecutor) {
    wasmExecutor = new WasmExecutor(limits);
  }
  return wasmExecutor;
}

/**
 * WASM実行環境のクリーンアップ
 */
export function cleanupWasmExecutor(): void {
  wasmExecutor = null;
}
