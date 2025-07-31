<template>
  <div class="syntax-highlight-editor-wrapper">
    <LineNumberDisplay 
      :content="modelValue"
      :current-line="currentLine"
    />
    <div class="syntax-highlight-editor">
      <!-- 隠しテキストエリア（実際の入力用） -->
      <textarea
        ref="hiddenTextarea"
        class="hidden-textarea"
        :value="modelValue"
        spellcheck="false"
        @input="onInput"
        @scroll="syncScroll"
        @keydown.tab.prevent="onTab"
        @keydown="onKeydown"
        @click="updateCurrentLine"
        @keyup="updateCurrentLine"
      />
      
      <!-- シンタックスハイライト表示用 -->
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div
        ref="highlightLayer"
        class="highlight-layer"
        v-html="sanitizedHighlightedCode"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { createHighlighter, type Highlighter } from 'shiki';
import DOMPurify from 'dompurify';
import LineNumberDisplay from '@/components/editorArea/codeEditor/LineNumberDisplay.vue';

interface Props {
  modelValue: string;
  language?: string;
  theme?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const hiddenTextarea = ref<HTMLTextAreaElement>();
const highlightLayer = ref<HTMLDivElement>();
const highlighter = ref<Highlighter>();
const currentLine = ref(1);

// Shikiハイライターの初期化
onMounted(async () => {
  try {
    console.log('Initializing syntax highlighter...');
    
    // セキュリティモードを確認
    let isDeveloperMode = false;
    
    if (window.api?.config) {
      const config = await window.api.config.get();
      isDeveloperMode = config.security.mode === 'developer' && config.security.allowWasm;
      console.log('Security config:', {
        mode: config.security.mode,
        allowWasm: config.security.allowWasm,
        allowCodeExecution: config.security.allowCodeExecution,
        isDeveloperMode
      });
    } else {
      console.warn('window.api.config not available');
    }
    
    if (!isDeveloperMode) {
      console.warn('Developer mode with WASM enabled is required for syntax highlighting');
      console.log('Current mode: Secure mode - using plain text editor for security');
      return;
    }

    console.log('Attempting to create highlighter...');
    highlighter.value = await createHighlighter({
      themes: [props.theme || 'github-light', 'github-dark'],
      langs: [props.language || 'javascript', 'typescript', 'cpp', 'python', 'java', 'markdown', 'json', 'css', 'html']
    });
    
    console.log('Syntax highlighter initialized successfully in developer mode');
  } catch (error) {
    console.error('Failed to initialize syntax highlighter:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
  }
});

// ハイライト済みコードの生成
const highlightedCode = computed(() => {
  if (!highlighter.value || !props.modelValue) {
    return '';
  }
  
  try {
    return highlighter.value.codeToHtml(props.modelValue, {
      lang: props.language || 'javascript',
      theme: props.theme || 'github-light'
    });
  } catch (error) {
    console.error('Syntax highlighting error:', error);
    return `<pre><code>${escapeHtml(props.modelValue)}</code></pre>`;
  }
});

// サニタイズされたハイライトコード
const sanitizedHighlightedCode = computed(() => {
  if (!highlightedCode.value) {
    return '';
  }
  
  return DOMPurify.sanitize(highlightedCode.value, {
    ALLOWED_TAGS: ['pre', 'code', 'span', 'div'],
    ALLOWED_ATTR: ['class', 'style']
  });
});

function onInput(e: Event): void {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value);
  nextTick(() => {
    syncScroll();
    updateCurrentLine();
  });
}

function onTab(e: KeyboardEvent): void {
  e.preventDefault();
  const textarea = e.target as HTMLTextAreaElement;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // 言語に応じたインデント設定
  const getIndentString = (language: string = 'javascript'): string => {
    switch (language) {
      case 'cpp':
        return '    '; // 4つのスペース
      case 'markdown':
        return '  '; // 2つのスペース
      case 'javascript':
      case 'typescript':
      case 'python':
      case 'java':
      case 'json':
      case 'css':
      case 'html':
      default:
        return '  '; // デフォルトは2つのスペース
    }
  };
  
  const indent = getIndentString(props.language);
  const value = textarea.value;
  const newValue = value.substring(0, start) + indent + value.substring(end);
  
  emit('update:modelValue', newValue);
  
  setTimeout(() => {
    textarea.selectionStart = textarea.selectionEnd = start + indent.length;
    updateCurrentLine();
  });
}

function onKeydown(): void {
  nextTick(() => {
    syncScroll();
    updateCurrentLine();
  });
}

function updateCurrentLine(): void {
  if (!hiddenTextarea.value) return;
  
  const textarea = hiddenTextarea.value;
  const cursorPosition = textarea.selectionStart;
  const textBeforeCursor = textarea.value.substring(0, cursorPosition);
  currentLine.value = textBeforeCursor.split('\n').length;
}

// スクロール同期
function syncScroll(): void {
  if (hiddenTextarea.value && highlightLayer.value) {
    highlightLayer.value.scrollTop = hiddenTextarea.value.scrollTop;
    highlightLayer.value.scrollLeft = hiddenTextarea.value.scrollLeft;
  }
}

// HTMLエスケープ関数
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
</script>

<style lang="scss" scoped>
.syntax-highlight-editor-wrapper {
  display: flex;
  height: 100%;
  width: 100%;
  background-color: var(--bg-color);
}

.syntax-highlight-editor {
  position: relative;
  flex: 1;
  overflow: hidden;
  background-color: var(--bg-color);
}

.hidden-textarea {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 1em;
  box-sizing: border-box;
  border: none;
  resize: none;
  font-family: var(--font-family-mono, 'Courier New', monospace);
  font-size: 14px;
  line-height: 1.5;
  background: transparent;
  color: transparent;
  caret-color: var(--text-color);
  outline: none;
  z-index: 2;
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.highlight-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 1em;
  box-sizing: border-box;
  font-family: var(--font-family-mono, 'Courier New', monospace);
  font-size: 14px;
  line-height: 1.5;
  overflow: auto;
  pointer-events: none;
  z-index: 1;
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: var(--bg-color);
}

:deep(.highlight-layer pre),
:deep(.highlight-layer code) {
  margin: 0;
  padding: 0;
  background: transparent !important;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: var(--font-family-mono, 'Courier New', monospace) !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
}

/* Shikiのスタイルをオーバーライド */
:deep(.shiki) {
  background-color: transparent !important;
  font-family: var(--font-family-mono, 'Courier New', monospace) !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
}

/* シンタックスハイライトの色は保持し、フォントを統一 */
:deep(.shiki code) {
  background-color: transparent !important;
  font-family: var(--font-family-mono, 'Courier New', monospace) !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
}

/* すべてのspan要素もフォントを統一 */
:deep(.shiki span) {
  font-family: var(--font-family-mono, 'Courier New', monospace) !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
}
</style>