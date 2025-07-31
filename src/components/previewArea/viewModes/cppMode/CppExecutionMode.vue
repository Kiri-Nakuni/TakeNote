<template>
  <div class="cpp-execution-mode">
    <!-- 上1/3: デバッグコンソール -->
    <div class="terminal-area">
      <div class="terminal-header">
        <h4>{{ uiStrings.getString('cpp.execution.title', 'C++実行環境') }}</h4>
        <div class="terminal-controls">
          <BaseButton 
            variant="ghost"
            size="small"
            icon="▶️"
            :title="uiStrings.getString('cpp.execution.buttons.run', '実行')"
            :disabled="isCompiling || isExecuting"
            @click="executeCode"
          >
            {{ uiStrings.getString('cpp.execution.buttons.run', '実行') }}
          </BaseButton>
          <BaseButton 
            variant="ghost"
            size="small"
            icon="🗑️"
            :title="uiStrings.getString('cpp.execution.buttons.clear', 'クリア')"
            @click="clearOutput"
          >
            {{ uiStrings.getString('cpp.execution.buttons.clear', 'クリア') }}
          </BaseButton>
          <BaseButton 
            variant="ghost"
            size="small"
            icon="⚙️"
            :title="uiStrings.getString('cpp.execution.buttons.options', 'オプション')"
            @click="showCompilerOptions = !showCompilerOptions"
          >
            {{ uiStrings.getString('cpp.execution.buttons.options', 'オプション') }}
          </BaseButton>
        </div>
      </div>
      
      <!-- コンパイラオプション -->
      <div 
        v-if="showCompilerOptions"
        class="compiler-options"
      >
        <div class="option-group">
          <label class="option-label">
            {{ uiStrings.getString('cpp.execution.labels.cppStandard', 'C++標準') }}:
            <select v-model="compilerSettings.standard">
              <option value="c++11">{{ uiStrings.getString('cpp.execution.options.standards.cpp11', 'C++11') }}</option>
              <option value="c++14">{{ uiStrings.getString('cpp.execution.options.standards.cpp14', 'C++14') }}</option>
              <option value="c++17">{{ uiStrings.getString('cpp.execution.options.standards.cpp17', 'C++17') }}</option>
              <option value="c++20">{{ uiStrings.getString('cpp.execution.options.standards.cpp20', 'C++20') }}</option>
            </select>
          </label>
          <label class="option-label">
            {{ uiStrings.getString('cpp.execution.labels.optimization', '最適化') }}:
            <select v-model="compilerSettings.optimization">
              <option value="O0">{{ uiStrings.getString('cpp.execution.options.optimization.O0', '最適化なし (O0)') }}</option>
              <option value="O1">{{ uiStrings.getString('cpp.execution.options.optimization.O1', '基本最適化 (O1)') }}</option>
              <option value="O2">{{ uiStrings.getString('cpp.execution.options.optimization.O2', '標準最適化 (O2)') }}</option>
              <option value="O3">{{ uiStrings.getString('cpp.execution.options.optimization.O3', '高度最適化 (O3)') }}</option>
            </select>
          </label>
        </div>
        <div class="option-group">
          <label class="option-label">
            <input 
              v-model="compilerSettings.warnings"
              type="checkbox"
            >
            {{ uiStrings.getString('cpp.execution.labels.warnings', '警告を有効にする') }}
          </label>
          <label class="option-label">
            <input 
              v-model="compilerSettings.debug"
              type="checkbox"
            >
            {{ uiStrings.getString('cpp.execution.labels.debug', 'デバッグ情報を含める') }}
          </label>
        </div>
      </div>

      <!-- ターミナル出力 -->
      <div class="terminal-output">
        <div
          v-for="(line, index) in terminalHistory.getHistory()"
          :key="index"
          class="terminal-line"
          :class="line.type"
        >
          <span class="line-prefix">{{ line.prefix }}</span>
          <span class="line-content">{{ line.content }}</span>
        </div>
        <div 
          v-if="isCompiling"
          class="terminal-line compiling"
        >
          <span class="line-prefix">🔄</span>
          <span class="line-content">{{ uiStrings.getString('cpp.execution.status.compiling', 'コンパイル中...') }}</span>
        </div>
        <div 
          v-if="isExecuting"
          class="terminal-line executing"
        >
          <span class="line-prefix">⚡</span>
          <span class="line-content">{{ uiStrings.getString('cpp.execution.status.executing', '実行中...') }}</span>
        </div>
      </div>
    </div>

    <!-- 中1/3: 標準入力エリア -->
    <div class="input-area">
      <div class="panel-header">
        <h5>{{ uiStrings.getString('cpp.execution.labels.standardInput', '標準入力') }}</h5>
        <BaseButton 
          variant="ghost"
          size="small"
          icon="📄"
          :title="uiStrings.getString('cpp.execution.buttons.sample', 'サンプル')"
          @click="loadSampleInput"
        >
          {{ uiStrings.getString('cpp.execution.buttons.sample', 'サンプル') }}
        </BaseButton>
      </div>
      <textarea
        v-model="standardInput"
        class="input-textarea"
        :placeholder="uiStrings.getString('cpp.execution.placeholders.input', 'プログラムへの入力をここに記入してください...')"
        :disabled="isExecuting"
      />
      <div class="input-info">
        <span>{{ uiStrings.getString('cpp.execution.status.lines', '行数: {count}', { count: standardInput.split('\n').length }) }}</span>
        <span>{{ uiStrings.getString('cpp.execution.status.characters', '文字数: {count}', { count: standardInput.length }) }}</span>
      </div>
    </div>

    <!-- 下1/3: 標準出力エリア -->
    <div class="output-area">
      <div class="panel-header">
        <h5>{{ uiStrings.getString('cpp.execution.labels.standardOutput', '標準出力') }}</h5>
        <div class="output-controls">
          <BaseButton 
            variant="ghost"
            size="small"
            icon="📋"
            :title="uiStrings.getString('cpp.execution.buttons.copy', 'コピー')"
            @click="copyOutput"
          >
            {{ uiStrings.getString('cpp.execution.buttons.copy', 'コピー') }}
          </BaseButton>
          <BaseButton 
            variant="ghost"
            size="small"
            icon="💾"
            :title="uiStrings.getString('cpp.execution.buttons.save', '保存')"
            @click="saveOutput"
          >
            {{ uiStrings.getString('cpp.execution.buttons.save', '保存') }}
          </BaseButton>
        </div>
      </div>
      
      <!-- 標準出力エリア -->
      <div class="output-content">
        <div
          v-if="!programOutput"
          class="output-placeholder"
        >
          {{ uiStrings.getString('cpp.execution.placeholders.output', 'プログラムの出力がここに表示されます...') }}
        </div>
        <div 
          v-if="programOutput"
          class="program-output"
        >
          <pre>{{ programOutput }}</pre>
        </div>
      </div>

      <!-- 実行統計情報 -->
      <div class="execution-stats">
        <div class="stats-row">
          <span v-if="executionTime !== null">
            {{ uiStrings.getString('cpp.execution.status.executionTime', '実行時間: {time}ms', { time: executionTime }) }}
          </span>
          <span v-if="compileTime !== null">
            {{ uiStrings.getString('cpp.execution.status.compileTime', 'コンパイル時間: {time}ms', { time: compileTime }) }}
          </span>
        </div>
        <div class="stats-row">
          <span v-if="memoryUsage !== null">
            {{ uiStrings.getString('cpp.execution.status.memoryUsage', 'メモリ使用量: {memory}KB', { memory: memoryUsage }) }}
          </span>
          <span v-if="programOutput">
            {{ uiStrings.getString('cpp.execution.status.outputLines', '出力行数: {count}', { count: programOutput.split('\n').length }) }}
          </span>
        </div>
        <div class="stats-row">
          <span 
            v-if="exitCode !== null" 
            :class="{ 
              'success': exitCode === 0, 
              'error': exitCode !== 0 
            }"
          >
            {{ uiStrings.getString('cpp.execution.status.exitCode', '終了コード: {code}', { code: exitCode }) }}
          </span>
          <span v-if="programOutput">
            {{ uiStrings.getString('cpp.execution.status.outputChars', '出力文字数: {count}', { count: programOutput.length }) }}
          </span>
        </div>
      </div>
    </div>

    <!-- エラー通知モーダル -->
    <div 
      v-if="showErrorModal"
      class="error-notification-modal"
      @click="closeErrorModal"
    >
      <div 
        class="error-modal-content"
        @click.stop
      >
        <div class="error-modal-header">
          <h3>{{ uiStrings.getString('cpp.execution.labels.errorOutput', '標準エラー出力') }}</h3>
          <button 
            class="close-button"
            @click="closeErrorModal"
          >
            ×
          </button>
        </div>
        <div class="error-modal-body">
          <pre>{{ errorOutput }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import BaseButton from '@/components/common/buttons/BaseButton.vue';
import { getCppCompiler, cleanupCppCompiler } from '@/utils/cppWasmCompiler';
import UIStringManager from '@/utils/uiStringManager';
import { CppCompilerConfig } from '@/utils/cppCompilerConfig';
import { TerminalHistory } from '@/utils/terminalHistory';

interface Props {
  code: string;
  fileName?: string;
}

const props = defineProps<Props>();

// UI文字列管理
const uiStrings = UIStringManager.getInstance();

// 状態管理クラスのインスタンス
const compilerConfig = new CppCompilerConfig();
const terminalHistory = new TerminalHistory();

// リアクティブな状態
const isCompiling = ref(false);
const isExecuting = ref(false);
const showCompilerOptions = ref(false);
const showErrorModal = ref(false);

// 入出力
const standardInput = ref('');
const programOutput = ref('');
const errorOutput = ref('');

// コンパイラ設定（リアクティブ）
const compilerSettings = ref(compilerConfig.getSettings());

// 実行統計
const executionTime = ref<number | null>(null);
const compileTime = ref<number | null>(null);
const memoryUsage = ref<number | null>(null);
const exitCode = ref<number | null>(null);

// WASM関連
let cppCompiler: ReturnType<typeof getCppCompiler> | null = null;

onMounted(async () => {
  await initializeWasmEnvironment();
  addTerminalLine('info', '💡', 'C++実行環境が初期化されました');
});

onUnmounted(() => {
  cleanup();
});

async function initializeWasmEnvironment(): Promise<void> {
  try {
    addTerminalLine('info', '🔄', 'WASMコンパイラを初期化中...');
    
    // 実際のWASMコンパイラを初期化
    cppCompiler = getCppCompiler({
      maxMemoryMB: 64,
      maxExecutionTimeMs: 5000,
      maxOutputSize: 1024 * 1024
    });
    
    await cppCompiler.initialize();
    
    addTerminalLine('success', '✅', 'WASMコンパイラが初期化されました');
  } catch (error) {
    console.error('WASM環境初期化エラー:', error);
    addTerminalLine('error', '❌', `初期化に失敗しました: ${error}`);
  }
}

async function executeCode(): Promise<void> {
  console.log('[Vue Component] Preview panel execution button clicked');
  console.log('[Vue Component] Code to compile:', props.code);
  console.log('[Vue Component] Code length:', props.code.length);
  
  if (!cppCompiler) {
    addTerminalLine('error', '❌', 'コンパイラが初期化されていません');
    return;
  }

  if (!props.code || props.code.trim() === '') {
    addTerminalLine('error', '❌', 'コンパイルするC++コードがありません');
    return;
  }

  try {
    clearExecutionResults();
    
    // コンパイル段階
    isCompiling.value = true;
    addTerminalLine('info', '🔨', 'C++コードをコンパイル中...');
    
    console.log('🔨 [Vue Component] コードをコンパイル開始');
    const compileStart = performance.now();
    
    let compileResult;
    try {
      compileResult = await cppCompiler.compile(props.code, compilerSettings.value);
      const compileEnd = performance.now();
      
      isCompiling.value = false;
      compileTime.value = compileResult.compileTimeMs || Math.round(compileEnd - compileStart);
      
      console.log('🔨 [Vue Component] コンパイル結果:', { success: compileResult.success, hasWasm: !!compileResult.wasmBinary });
      
      if (!compileResult.success) {
        console.log('🔨 [Vue Component] コンパイル失敗');
        addTerminalLine('error', '❌', `コンパイルエラー (${compileTime.value}ms)`);
        errorOutput.value = compileResult.errors || '';
        return;
      }
    } catch (compileError) {
      isCompiling.value = false;
      console.error('🔨 [Vue Component] コンパイル例外:', compileError);
      addTerminalLine('error', '❌', `コンパイル例外: ${compileError}`);
      return;
    }
    
    addTerminalLine('success', '✅', `コンパイル完了 (${compileTime.value}ms)`);
    
    // 実行段階
    if (compileResult.wasmBinary) {
      isExecuting.value = true;
      addTerminalLine('info', '⚡', 'プログラムを実行中...');
      
      console.log('🚀 [Vue Component] WASM実行開始');
      const executeResult = await cppCompiler.execute(compileResult.wasmBinary, standardInput.value);
      console.log('🏁 [Vue Component] WASM実行完了');
      
      isExecuting.value = false;
      executionTime.value = executeResult.executionTimeMs;
      
      programOutput.value = executeResult.stdout;
      errorOutput.value = executeResult.stderr;
      exitCode.value = executeResult.exitCode;
      memoryUsage.value = executeResult.memoryUsageKB;
      
      // エラー出力がある場合はモーダルを表示
      if (executeResult.stderr && executeResult.stderr.trim()) {
        showErrorModal.value = true;
      }
      
      if (executeResult.exitCode === 0) {
        addTerminalLine('success', '🎉', `実行完了 (${executionTime.value}ms)`);
      } else {
        addTerminalLine('error', '💥', `実行エラー (終了コード: ${executeResult.exitCode}, ${executionTime.value}ms)`);
      }
    }
    
  } catch (error) {
    isCompiling.value = false;
    isExecuting.value = false;
    console.error('🔥 [Vue Component] 実行エラー:', error);
    addTerminalLine('error', '💥', `実行に失敗しました: ${error}`);
  }
}

function addTerminalLine(type: 'info' | 'success' | 'error' | 'warning', prefix: string, content: string): void {
  terminalHistory.addLine(type, content, prefix);
}

function clearOutput(): void {
  terminalHistory.clear();
  clearExecutionResults();
}

function clearExecutionResults(): void {
  programOutput.value = '';
  errorOutput.value = '';
  executionTime.value = null;
  compileTime.value = null;
  memoryUsage.value = null;
  exitCode.value = null;
  showErrorModal.value = false;
}

function closeErrorModal(): void {
  showErrorModal.value = false;
}

function loadSampleInput(): void {
  standardInput.value = `5
1 2 3 4 5`;
  addTerminalLine('info', '📄', 'サンプル入力を読み込みました');
}

async function copyOutput(): Promise<void> {
  try {
    await navigator.clipboard.writeText(programOutput.value);
    addTerminalLine('success', '📋', '出力をクリップボードにコピーしました');
  } catch {
    addTerminalLine('error', '❌', 'コピーに失敗しました');
  }
}

async function saveOutput(): Promise<void> {
  try {
    const blob = new Blob([programOutput.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.fileName || 'output'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addTerminalLine('success', '💾', '出力を保存しました');
  } catch {
    addTerminalLine('error', '❌', '保存に失敗しました');
  }
}

function cleanup(): void {
  if (cppCompiler) {
    cppCompiler.cleanup();
    cppCompiler = null;
  }
  cleanupCppCompiler();
}
</script>

<style lang="scss" scoped>
@import '@/styles/components/cppExecutionMode.scss';
</style>
