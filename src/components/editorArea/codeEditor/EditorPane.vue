<template>
  <div
    ref="editorPaneRef"
    class="editor-pane"
  >
    <!-- エディタ切り替えボタン -->
    <div class="editor-toolbar">
      <button 
        class="highlight-toggle"
        :class="{ active: useSyntaxHighlight }"
        @click="toggleSyntaxHighlight"
      >
        {{ useSyntaxHighlight ? uiStrings.getString('editor.buttons.syntaxHighlight.on', '構文強調表示: ON') : uiStrings.getString('editor.buttons.syntaxHighlight.off', '構文強調表示: OFF') }}
      </button>
      
      <!-- 言語選択 -->
      <select 
        v-if="useSyntaxHighlight"
        v-model="selectedLanguage"
        class="language-select"
      >
        <option value="javascript">
          {{ uiStrings.getString('editor.languages.javascript', 'JavaScript') }}
        </option>
        <option value="typescript">
          {{ uiStrings.getString('editor.languages.typescript', 'TypeScript') }}
        </option>
        <option value="cpp">
          {{ uiStrings.getString('editor.languages.cpp', 'C++') }}
        </option>
        <option value="python">
          {{ uiStrings.getString('editor.languages.python', 'Python') }}
        </option>
        <option value="java">
          {{ uiStrings.getString('editor.languages.java', 'Java') }}
        </option>
        <option value="markdown">
          {{ uiStrings.getString('editor.languages.markdown', 'Markdown') }}
        </option>
        <option value="json">
          {{ uiStrings.getString('editor.languages.json', 'JSON') }}
        </option>
        <option value="css">
          {{ uiStrings.getString('editor.languages.css', 'CSS') }}
        </option>
        <option value="html">
          {{ uiStrings.getString('editor.languages.html', 'HTML') }}
        </option>
      </select>
      
      <!-- ファイル情報表示 -->
      <div 
        v-if="props.filePath"
        class="file-info"
      >
        <span class="file-name">{{ getFileName(props.filePath) }}</span>
        <span 
          v-if="props.tanMode"
          class="tan-mode"
        >{{ getTanModeLabel(props.tanMode) }}</span>
      </div>
    </div>
    
    <!-- エディタ本体 -->
    <div class="editor-container">
      <SyntaxHighlightEditor
        v-if="useSyntaxHighlight"
        v-model="modelValue"
        :language="selectedLanguage"
        :theme="theme"
      />
      <PlainTextEditor
        v-else
        v-model="modelValue"
        :language="selectedLanguage"
      />
    </div>
    <!-- ステータスバー（ウィンドウ幅600px以下で非表示） -->
    <StatusBar v-if="showStatusBar" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import PlainTextEditor from '@/components/editorArea/codeEditor/PlainTextEditor.vue';
import SyntaxHighlightEditor from '@/components/editorArea/codeEditor/SyntaxHighlightEditor.vue';
import StatusBar from '@/components/editorArea/statusBar/StatusBar.vue';
import UIStringManager from '@/utils/uiStringManager';
// ステータスバー表示制御（EditorPaneの横幅で判定）
import { nextTick } from 'vue';

// UI文字列管理
const uiStrings = UIStringManager.getInstance();

const showStatusBar = ref(true);
const editorPaneRef = ref<HTMLElement | null>(null);
const STATUSBAR_MIN_WIDTH = 500; // 500px以下で非表示
function updateShowStatusBar(): void {
  nextTick(() => {
    if (editorPaneRef.value) {
      showStatusBar.value = editorPaneRef.value.offsetWidth > STATUSBAR_MIN_WIDTH;
    }
  });
}
onMounted(() => {
  updateShowStatusBar();
  window.addEventListener('resize', updateShowStatusBar);
});
onUnmounted(() => {
  window.removeEventListener('resize', updateShowStatusBar);
});

const props = defineProps<{
  modelValue: string;
  filePath?: string | undefined;
  tanMode?: 'note' | 'cpp' | 'javascript' | 'typescript' | 'python' | 'java' | 'book' | 'presentation' | 'other' | undefined;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const useSyntaxHighlight = ref(true);
const selectedLanguage = ref('javascript');
const theme = ref('github-light');

// 設定からシンタックスハイライトの初期状態を取得
onMounted(async () => {
  try {
    if (window.api?.config) {
      const configResponse = await window.api.config.get();
      const config = configResponse as Record<string, unknown>;
      const editorConfig = config.editor as Record<string, unknown> | undefined;
      useSyntaxHighlight.value = editorConfig?.syntaxHighlighting as boolean ?? true;
      theme.value = editorConfig?.theme === 'dark' ? 'github-dark' : 'github-light';
    }
  } catch (error) {
    console.warn('Failed to load editor config:', error);
  }
});

const modelValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value)
});

function toggleSyntaxHighlight(): void {
  useSyntaxHighlight.value = !useSyntaxHighlight.value;
}

// TANモードに基づく自動言語選択
watch(() => props.tanMode, (newMode) => {
  if (newMode) {
    const language = mapTanModeToLanguage(newMode)
    selectedLanguage.value = language
    useSyntaxHighlight.value = language !== 'markdown'
  }
}, { immediate: true })

// ユーティリティ関数
function getFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath
}

function getTanModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    note: 'ノート',
    cpp: 'C++',
    javascript: 'JavaScript', 
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    book: '本',
    presentation: 'プレゼンテーション',
    other: 'その他'
  }
  return labels[mode] || mode
}

function mapTanModeToLanguage(mode: string): string {
  const modeToLanguage: Record<string, string> = {
    note: 'markdown',
    book: 'markdown', 
    presentation: 'markdown',
    cpp: 'cpp',
    javascript: 'javascript',
    typescript: 'typescript',
    python: 'python',
    java: 'java',
    other: 'markdown'
  }
  return modeToLanguage[mode] || 'markdown'
}
</script>

<style lang="scss" scoped>
.editor-pane {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-color);
  color: var(--text-color);
  border-right: 1px solid var(--border-color);
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.highlight-toggle {
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--input-bg);
  color: var(--text-color);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
  
  &.active {
    background: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }
  
  &:hover:not(.active) {
    background: var(--hover-bg);
  }
}

.language-select {
  padding: 4px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  background: var(--input-bg);
  color: var(--text-color);
  
  &:focus {
    outline: none;
    border-color: var(--focus-color);
    box-shadow: 0 0 0 2px var(--primary-alpha);
  }

  option {
    background: var(--input-bg);
    color: var(--text-color);
  }
}

.file-info {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  
  .file-name {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
  }
  
  .tan-mode {
    font-size: 11px;
    color: var(--primary-color);
    background: var(--primary-alpha);
    padding: 2px 6px;
    border-radius: 3px;
    border: 1px solid var(--primary-color);
    opacity: 0.8;
  }
}

.editor-container {
  flex: 1;
  overflow: hidden;
  background: var(--bg-color);
}
</style>