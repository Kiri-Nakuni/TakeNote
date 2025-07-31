&lt;template&gt;
  &lt;BaseModal v-if="isVisible" @close="$emit('close')" title="C++ノートを作成"&gt;
    &lt;div class="cpp-create-modal"&gt;
      &lt;div class="form-group"&gt;
        &lt;label class="form-label"&gt;タイトル *&lt;/label&gt;
        &lt;FormInput
          v-model="formData.title"
          placeholder="C++ノートのタイトルを入力"
          :error="errors.title"
          required
        /&gt;
      &lt;/div&gt;

      &lt;div class="form-group"&gt;
        &lt;label class="form-label"&gt;説明&lt;/label&gt;
        &lt;textarea
          v-model="formData.description"
          class="form-textarea"
          placeholder="ノートの説明を入力（オプション）"
          rows="3"
        &gt;&lt;/textarea&gt;
      &lt;/div&gt;

      &lt;div class="form-group"&gt;
        &lt;label class="form-label"&gt;タグ&lt;/label&gt;
        &lt;FormInput
          v-model="tagsInput"
          placeholder="タグをカンマ区切りで入力（例: algorithm, practice, contest）"
        /&gt;
      &lt;/div&gt;

      &lt;div class="form-group"&gt;
        &lt;label class="form-label"&gt;コンパイラ設定&lt;/label&gt;
        &lt;div class="compiler-settings"&gt;
          &lt;div class="setting-row"&gt;
            &lt;label class="setting-label"&gt;C++標準:&lt;/label&gt;
            &lt;select v-model="formData.compilerOptions.standard" class="setting-select"&gt;
              &lt;option value="c++11"&gt;C++11&lt;/option&gt;
              &lt;option value="c++14"&gt;C++14&lt;/option&gt;
              &lt;option value="c++17"&gt;C++17&lt;/option&gt;
              &lt;option value="c++20"&gt;C++20&lt;/option&gt;
              &lt;option value="c++23"&gt;C++23&lt;/option&gt;
            &lt;/select&gt;
          &lt;/div&gt;
          
          &lt;div class="setting-row"&gt;
            &lt;label class="setting-label"&gt;最適化レベル:&lt;/label&gt;
            &lt;select v-model="formData.compilerOptions.optimizationLevel" class="setting-select"&gt;
              &lt;option value="O0"&gt;O0 (最適化なし)&lt;/option&gt;
              &lt;option value="O1"&gt;O1 (基本最適化)&lt;/option&gt;
              &lt;option value="O2"&gt;O2 (推奨)&lt;/option&gt;
              &lt;option value="O3"&gt;O3 (高度最適化)&lt;/option&gt;
              &lt;option value="Os"&gt;Os (サイズ最適化)&lt;/option&gt;
              &lt;option value="Ofast"&gt;Ofast (高速最適化)&lt;/option&gt;
            &lt;/select&gt;
          &lt;/div&gt;

          &lt;div class="setting-row"&gt;
            &lt;label class="setting-label"&gt;警告:&lt;/label&gt;
            &lt;div class="warning-checkboxes"&gt;
              &lt;label class="checkbox-label"&gt;
                &lt;input
                  type="checkbox"
                  :checked="formData.compilerOptions.warnings.includes('all')"
                  @change="toggleWarning('all')"
                &gt;
                -Wall
              &lt;/label&gt;
              &lt;label class="checkbox-label"&gt;
                &lt;input
                  type="checkbox"
                  :checked="formData.compilerOptions.warnings.includes('extra')"
                  @change="toggleWarning('extra')"
                &gt;
                -Wextra
              &lt;/label&gt;
              &lt;label class="checkbox-label"&gt;
                &lt;input
                  type="checkbox"
                  :checked="formData.compilerOptions.warnings.includes('error')"
                  @change="toggleWarning('error')"
                &gt;
                -Werror
              &lt;/label&gt;
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      &lt;div class="form-group"&gt;
        &lt;label class="form-label"&gt;初期コード&lt;/label&gt;
        &lt;textarea
          v-model="formData.initialCode"
          class="form-code-textarea"
          rows="8"
          spellcheck="false"
        &gt;&lt;/textarea&gt;
      &lt;/div&gt;

      &lt;div class="modal-actions"&gt;
        &lt;BaseButton variant="secondary" @click="$emit('close')"&gt;
          キャンセル
        &lt;/BaseButton&gt;
        &lt;BaseButton
          variant="primary"
          @click="createCppNote"
          :disabled="isCreating || !isValid"
        &gt;
          {{ isCreating ? '作成中...' : '作成' }}
        &lt;/BaseButton&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  &lt;/BaseModal&gt;
&lt;/template&gt;

&lt;script setup lang="ts"&gt;
import { ref, computed, watch } from 'vue';
import BaseModal from '@/components/common/modals/BaseModal.vue';
import BaseButton from '@/components/common/buttons/BaseButton.vue';
import FormInput from '@/components/common/forms/FormInput.vue';

interface Props {
  isVisible: boolean;
}

interface CppCompilerOptions {
  standard: 'c++11' | 'c++14' | 'c++17' | 'c++20' | 'c++23';
  optimizationLevel: 'O0' | 'O1' | 'O2' | 'O3' | 'Os' | 'Ofast';
  warnings: string[];
  includePaths: string[];
  libraries: string[];
  defines: string[];
  additionalFlags?: string[];
}

const props = defineProps&lt;Props&gt;();

const emit = defineEmits&lt;{
  close: [];
  created: [filePath: string];
}&gt;();

// フォームデータ
const formData = ref({
  title: '',
  description: '',
  compilerOptions: {
    standard: 'c++17' as const,
    optimizationLevel: 'O2' as const,
    warnings: ['all', 'extra'],
    includePaths: [],
    libraries: [],
    defines: [],
    additionalFlags: []
  } as CppCompilerOptions,
  initialCode: `#include &lt;iostream&gt;
#include &lt;vector&gt;
#include &lt;string&gt;

using namespace std;

int main() {
    cout &lt;&lt; "Hello, C++ World!" &lt;&lt; endl;
    return 0;
}`
});

const tagsInput = ref('');
const isCreating = ref(false);
const errors = ref&lt;Record&lt;string, string&gt;&gt;({});

// バリデーション
const isValid = computed(() =&gt; {
  return formData.value.title.trim().length &gt; 0;
});

// タグの処理
const tags = computed(() =&gt; {
  return tagsInput.value
    .split(',')
    .map(tag =&gt; tag.trim())
    .filter(tag =&gt; tag.length &gt; 0);
});

// 警告オプションの切り替え
function toggleWarning(warning: string) {
  const warnings = formData.value.compilerOptions.warnings;
  const index = warnings.indexOf(warning);
  
  if (index &gt; -1) {
    warnings.splice(index, 1);
  } else {
    warnings.push(warning);
  }
}

// バリデーション
watch(() =&gt; formData.value.title, (newTitle) =&gt; {
  if (newTitle.trim().length === 0) {
    errors.value.title = 'タイトルは必須です';
  } else {
    delete errors.value.title;
  }
});

// C++ノート作成
async function createCppNote() {
  if (!isValid.value) return;
  
  isCreating.value = true;
  
  try {
    // ファイル名を生成（タイトルから安全なファイル名を作成）
    const safeTitle = formData.value.title
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();
    
    // 保存ダイアログを表示
    const result = await window.api.tan.showSaveDialog(safeTitle);
    
    if (!result.success || result.data.canceled) {
      return;
    }
    
    const filePath = result.data.filePath;
    
    // C++モードのTANファイルを作成
    const createResult = await window.api.tan.createCppMode(filePath, {
      title: formData.value.title,
      description: formData.value.description || undefined,
      tags: tags.value.length &gt; 0 ? tags.value : undefined,
      compilerOptions: formData.value.compilerOptions,
      initialCode: formData.value.initialCode
    });
    
    if (createResult.success) {
      emit('created', filePath);
      emit('close');
      
      // フォームをリセット
      resetForm();
    } else {
      console.error('Failed to create C++ note:', createResult.error);
      // エラー処理
    }
  } catch (error) {
    console.error('Error creating C++ note:', error);
  } finally {
    isCreating.value = false;
  }
}

// フォームリセット
function resetForm() {
  formData.value.title = '';
  formData.value.description = '';
  formData.value.compilerOptions = {
    standard: 'c++17',
    optimizationLevel: 'O2',
    warnings: ['all', 'extra'],
    includePaths: [],
    libraries: [],
    defines: [],
    additionalFlags: []
  };
  formData.value.initialCode = `#include &lt;iostream&gt;
#include &lt;vector&gt;
#include &lt;string&gt;

using namespace std;

int main() {
    cout &lt;&lt; "Hello, C++ World!" &lt;&lt; endl;
    return 0;
}`;
  tagsInput.value = '';
  errors.value = {};
}

// モーダルが閉じられた時のリセット
watch(() =&gt; props.isVisible, (visible) =&gt; {
  if (!visible) {
    resetForm();
  }
});
&lt;/script&gt;

&lt;style scoped&gt;
.cpp-create-modal {
  max-width: 600px;
  padding: var(--spacing-lg);
}

.form-group {
  margin-bottom: var(--spacing-lg);
}

.form-label {
  display: block;
  margin-bottom: var(--spacing-sm);
  font-weight: 600;
  color: var(--text-primary);
}

.form-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: var(--font-sm);
  resize: vertical;
  transition: border-color 0.2s ease;
}

.form-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.form-code-textarea {
  width: 100%;
  padding: var(--spacing-sm);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: var(--font-sm);
  line-height: 1.4;
  resize: vertical;
  transition: border-color 0.2s ease;
}

.form-code-textarea:focus {
  outline: none;
  border-color: var(--accent-primary);
}

.compiler-settings {
  padding: var(--spacing-md);
  background: var(--bg-secondary);
  border-radius: var(--border-radius);
  border: 1px solid var(--border-secondary);
}

.setting-row {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-md);
  gap: var(--spacing-md);
}

.setting-row:last-child {
  margin-bottom: 0;
}

.setting-label {
  min-width: 120px;
  font-weight: 500;
  color: var(--text-secondary);
}

.setting-select {
  flex: 1;
  padding: var(--spacing-xs) var(--spacing-sm);
  border: 1px solid var(--border-primary);
  border-radius: var(--border-radius);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: var(--font-sm);
}

.warning-checkboxes {
  display: flex;
  gap: var(--spacing-md);
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-sm);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-secondary);
}
&lt;/style&gt;
