<template>
  <div class="plain-text-editor-wrapper">
    <LineNumberDisplay 
      :content="modelValue"
      :current-line="currentLine"
    />
    <textarea
      ref="textareaRef"
      class="plain-text-editor"
      :value="modelValue"
      spellcheck="false"
      placeholder="テキストを入力してください..."
      @input="onInput"
      @keydown.tab.prevent="onTab"
      @keydown="onKeydown"
      @scroll="onScroll"
      @click="updateCurrentLine"
      @keyup="updateCurrentLine"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import LineNumberDisplay from '@/components/editorArea/codeEditor/LineNumberDisplay.vue';

interface Props {
  modelValue: string;
  language?: string;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const textareaRef = ref<HTMLTextAreaElement>();
const currentLine = ref(1);

function onInput(e: Event): void {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value);
  nextTick(() => updateCurrentLine());
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
  nextTick(() => updateCurrentLine());
}

function onScroll(): void {
  // スクロール同期などの処理があれば追加
}

function updateCurrentLine(): void {
  if (!textareaRef.value) return;
  
  const textarea = textareaRef.value;
  const cursorPosition = textarea.selectionStart;
  const textBeforeCursor = textarea.value.substring(0, cursorPosition);
  currentLine.value = textBeforeCursor.split('\n').length;
}
</script>

<style lang="scss" scoped>
.plain-text-editor-wrapper {
  display: flex;
  height: 100%;
  width: 100%;
}

.plain-text-editor {
  flex: 1;
  padding: 1em;
  box-sizing: border-box;
  overflow-y: auto;
  border: none;
  resize: none;
  font-family: var(--font-family-mono, 'Courier New', monospace);
  font-size: 14px;
  line-height: 1.5;
  background-color: var(--bg-color);
  color: var(--text-color);
  outline: none;
  white-space: pre-wrap; /* 改行を保持し、必要に応じて折り返し */
  word-wrap: break-word; /* 長い単語も強制改行 */

  &::placeholder {
    color: var(--text-muted);
  }

  &:focus {
    background-color: var(--bg-color);
  }
}
</style>