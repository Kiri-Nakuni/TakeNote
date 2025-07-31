<template>
  <BaseModal
    :visible="isVisible"
    title="新しいファイルを作成"
    @close="close"
  >
    <form
      class="new-file-form"
      @submit.prevent="createFile"
    >
      <div class="form-group">
        <label for="fileName">
          ファイル名
        </label>
        <FormInput
          id="fileName"
          v-model="fileName"
          placeholder="ファイル名を入力してください"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="mode">
          モード
        </label>
        <select
          id="mode"
          v-model="selectedMode"
          class="mode-select"
        >
          <option value="note">
            ノートモード
          </option>
          <option value="cpp">
            C++
          </option>
          <option value="javascript">
            JavaScript
          </option>
          <option value="typescript">
            TypeScript
          </option>
          <option value="python">
            Python
          </option>
          <option value="java">
            Java
          </option>
          <option value="book">
            本
          </option>
          <option value="presentation">
            プレゼンテーション
          </option>
          <option value="other">
            その他
          </option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="description">
          説明（任意）
        </label>
        <textarea
          id="description"
          ref="descriptionRef"
          v-model="description"
          placeholder="ファイルの説明を入力してください"
          rows="3"
          @focus="handleTextareaFocus"
          @blur="handleTextareaBlur"
        />
      </div>
      
      <div class="form-actions">
        <BaseButton
          type="button"
          variant="secondary"
          @click="close"
        >
          キャンセル
        </BaseButton>
        <BaseButton
          type="submit"
          variant="primary"
          :disabled="!fileName.trim() || isCreating"
        >
          {{ isCreating ? '作成中...' : '作成' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import BaseButton from '../buttons/BaseButton.vue'
import FormInput from '../forms/FormInput.vue'

interface Props {
  isVisible: boolean
  selectedFolderPath?: string
}

interface Emits {
  (e: 'close'): void
  (e: 'fileCreated', filePath: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// フォーム状態
const fileName = ref('')
const selectedMode = ref<'note' | 'cpp' | 'javascript' | 'typescript' | 'python' | 'java' | 'book' | 'presentation' | 'other'>('note')
const description = ref('')
const isCreating = ref(false)
const descriptionRef = ref<HTMLTextAreaElement>()

// モーダルが表示されるたびにフォームをリセット
watch(() => props.isVisible, (newValue) => {
  if (newValue) {
    // IME問題対策：まず全てのフォーカスを外す
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    resetForm()
    
    // フォーカス管理を改善
    setTimeout(() => {
      const fileNameInput = document.getElementById('fileName');
      if (fileNameInput) {
        fileNameInput.focus();
      }
    }, 100);
  }
})

function resetForm(): void {
  fileName.value = ''
  selectedMode.value = 'note'
  description.value = ''
  isCreating.value = false
}

function close(): void {
  emit('close')
}

// IME問題の対処
function handleTextareaFocus(event: FocusEvent): void {
  const target = event.target as HTMLTextAreaElement
  // フォーカス時にテキストエリアを再度フォーカス
  setTimeout(() => {
    target.focus()
  }, 0)
}

function handleTextareaBlur(): void {
  // 特に何もしない（CSSで対処）
}

async function createFile(): Promise<void> {
  if (!fileName.value.trim() || isCreating.value) return
  
  isCreating.value = true
  
  try {
    // ファイル名に .tan 拡張子を追加（ない場合）
    const finalFileName = fileName.value.endsWith('.tan') 
      ? fileName.value 
      : `${fileName.value}.tan`
    
    let result;
    if (selectedMode.value === 'cpp') {
      // C++モードの場合は専用のAPIを使用
      const cppOptions = {
        title: fileName.value.replace(/\.tan$/, ''),
        description: description.value || '',
        tags: [],
        initialCode: getInitialContent('cpp'),
        compilerOptions: {
          standard: 'c++17' as const,
          optimizationLevel: 'O2' as const,
          warnings: ['all', 'extra'],
          includePaths: [],
          libraries: [],
          defines: []
        }
      };
      
      if (props.selectedFolderPath) {
        const fullPath = `${props.selectedFolderPath}/${finalFileName}`;
        // @ts-ignore - C++モード用API
        result = await window.api.tan.createCppMode(fullPath, cppOptions);
      } else {
        // @ts-ignore - C++モード用API
        result = await window.api.tan.createCppMode(finalFileName, cppOptions);
      }
    } else {
      // その他のモードは従来通り
      const initialContent = getInitialContent(selectedMode.value);
      
      // TANファイル構造を作成
      const tanStructure = {
        meta: {
          title: fileName.value.replace(/\.tan$/, ''),
          description: description.value || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          author: 'User',
          tags: []
        },
        version: '1.0.0',
        mode: selectedMode.value,
        hook: {
          beforeSave: null,
          afterSave: null,
          beforeLoad: null,
          afterLoad: null
        },
        mainFile: {
          content: initialContent,
          extension: getFileExtension(selectedMode.value)
        }
      };
      
      // ファイルを作成
      if (props.selectedFolderPath) {
        // 選択されたフォルダ内にファイルを作成
        const fullPath = `${props.selectedFolderPath}/${finalFileName}`;
        // @ts-ignore - type definition issue
        result = await window.api.tan.create(fullPath, tanStructure);
      } else {
        // ルートディレクトリにファイルを作成
        // @ts-ignore - type definition issue
        result = await window.api.tan.create(finalFileName, tanStructure);
      }
    }
    
    if (result.success) {
      emit('fileCreated', finalFileName);
      close();
    } else {
      console.error('ファイル作成に失敗しました:', result.error);
      alert(`ファイル作成に失敗しました: ${result.error}`);
    }
  } catch (error) {
    console.error('ファイル作成エラー:', error);
    alert('ファイル作成中にエラーが発生しました');
  } finally {
    isCreating.value = false;
  }
}

function getFileExtension(mode: string): string {
  switch (mode) {
    case 'cpp': return 'cpp'
    case 'javascript': return 'js'
    case 'typescript': return 'ts'
    case 'python': return 'py'
    case 'java': return 'java'
    default: return 'md'
  }
}

function getInitialContent(mode: string): string {
  switch (mode) {
    case 'note':
      return '# 新しいノート\n\nここに内容を記述してください。'
    case 'cpp':
      return '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}'
    case 'javascript':
      return '// JavaScript ファイル\nconsole.log("Hello, World!");'
    case 'typescript':
      return '// TypeScript ファイル\nconst message: string = "Hello, World!";\nconsole.log(message);'
    case 'python':
      return '# Python ファイル\nprint("Hello, World!")'
    case 'java':
      return 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}'
    case 'book':
      return '# 本のタイトル\n\n## 第1章\n\nここに内容を記述してください。'
    case 'presentation':
      return '# プレゼンテーションタイトル\n\n## スライド 1\n\nここに内容を記述してください。'
    default:
      return ''
  }
}
</script>

<style scoped>
.new-file-form {
  max-width: 500px;
  width: 100%;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--text-primary);
}

.mode-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
}

.mode-select:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-color-alpha);
}

textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.875rem;
  resize: vertical;
  min-height: 60px;
  ime-mode: auto;
}

textarea:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-color-alpha);
  ime-mode: active;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
}
</style>
