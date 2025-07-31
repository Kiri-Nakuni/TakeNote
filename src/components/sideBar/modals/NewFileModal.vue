<template>
  <BaseModal 
    :visible="visible"
    title="新しいファイルを作成"
    @close="handleClose"
  >
    <div class="new-file-form">
      <div class="form-group">
        <label for="fileName">ファイル名</label>
        <FormInput
          id="fileName"
          v-model="fileName"
          placeholder="ファイル名を入力してください"
          :error="fileNameError"
          @keyup.enter="handleCreate"
        />
      </div>

      <div class="form-group">
        <label for="fileMode">モード</label>
        <select 
          id="fileMode"
          v-model="selectedMode"
          class="mode-select"
        >
          <option value="note">
            ノートモード (.md)
          </option>
          <!-- 将来的に他のモードを追加 -->
        </select>
      </div>

      <div class="form-group">
        <label for="fileDescription">説明（任意）</label>
        <textarea
          id="fileDescription"
          v-model="description"
          placeholder="ファイルの説明を入力してください"
          class="description-textarea"
          rows="3"
        />
      </div>

      <div class="form-actions">
        <BaseButton 
          variant="secondary"
          @click="handleClose"
        >
          キャンセル
        </BaseButton>
        <BaseButton 
          :disabled="!fileName.trim() || creating"
          variant="primary"
          @click="handleCreate"
        >
          {{ creating ? '作成中...' : '作成' }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseModal from '@/components/common/modals/BaseModal.vue';
import BaseButton from '@/components/common/buttons/BaseButton.vue';
import FormInput from '@/components/common/forms/FormInput.vue';

interface FileMode {
  id: string;
  name: string;
  extension: string;
}

interface TanFileData {
  meta: {
    title: string;
    description: string;
    createdAt: string;
    modifiedAt: string;
    directoryStructure: string[];
  };
  version: string;
  mode: string;
  mainFile: {
    name: string;
    content: string;
    extension: string;
  };
  hook: {
    lineCount: number;
    keys: string[];
  };
}

interface WindowTanApi {
  config: {
    getNotesDirectory: () => Promise<string>;
  };
  tan: {
    create: (filePath: string, tanFile: TanFileData) => Promise<{ success: boolean; error?: string }>;
  };
}

interface Props {
  visible: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'file-created', filePath: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const fileName = ref('');
const description = ref('');
const selectedMode = ref('note');
const creating = ref(false);
const fileNameError = ref('');

// ファイルモードの定義
const fileModes: Record<string, FileMode> = {
  note: {
    id: 'note',
    name: 'ノートモード',
    extension: 'md'
  }
  // 将来的に他のモードを追加
  // code: { id: 'code', name: 'コードモード', extension: 'txt' },
  // data: { id: 'data', name: 'データモード', extension: 'json' }
};

// モーダルが開かれたときにフィールドをリセット
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    resetForm();
  }
});

function resetForm(): void {
  fileName.value = '';
  description.value = '';
  selectedMode.value = 'note';
  creating.value = false;
  fileNameError.value = '';
}

function validateFileName(): boolean {
  const name = fileName.value.trim();
  
  if (!name) {
    fileNameError.value = 'ファイル名を入力してください';
    return false;
  }

  // ファイル名の無効な文字をチェック
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(name)) {
    fileNameError.value = 'ファイル名に使用できない文字が含まれています';
    return false;
  }

  fileNameError.value = '';
  return true;
}

async function handleCreate(): Promise<void> {
  if (!validateFileName()) {
    return;
  }

  try {
    creating.value = true;

    const windowApi = (window as unknown as { api: WindowTanApi }).api;
    
    // Notesディレクトリを取得
    const notesDir = await windowApi.config.getNotesDirectory();
    
    // .tanファイルのパスを作成
    const baseFileName = fileName.value.trim();
    const tanFilePath = `${notesDir}\\${baseFileName}.tan`;

    // 現在時刻
    const now = new Date().toISOString();
    
    // 選択されたモードの設定を取得
    const mode = fileModes[selectedMode.value];
    
    // TANファイルデータを作成
    const tanFileData: TanFileData = {
      meta: {
        title: baseFileName,
        description: description.value || `${mode.name}で作成されたファイル`,
        createdAt: now,
        modifiedAt: now,
        directoryStructure: []
      },
      version: '1.0.0',
      mode: selectedMode.value,
      mainFile: {
        name: `content.${mode.extension}`,
        content: '', // 空のコンテンツで開始
        extension: mode.extension
      },
      hook: {
        lineCount: 0,
        keys: []
      }
    };

    // TANファイルを作成
    const result = await windowApi.tan.create(tanFilePath, tanFileData);

    if (result.success) {
      emit('file-created', tanFilePath);
      handleClose();
    } else {
      console.error('TANファイル作成に失敗しました:', result.error);
      alert(`ファイル作成に失敗しました: ${result.error}`);
    }
  } catch (error) {
    console.error('ファイル作成でエラーが発生しました:', error);
    alert('ファイル作成でエラーが発生しました。');
  } finally {
    creating.value = false;
  }
}

function handleClose(): void {
  if (!creating.value) {
    emit('close');
  }
}
</script>

<style lang="scss" scoped>
.new-file-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 400px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color, #333);
}

.mode-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  font-size: 14px;
  background: var(--bg-color, #fff);
  color: var(--text-color, #333);
  
  &:focus {
    outline: none;
    border-color: var(--primary-color, #007acc);
    box-shadow: 0 0 0 2px var(--primary-color-alpha, rgba(0, 122, 204, 0.2));
  }
}

.description-textarea {
  padding: 8px 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  background: var(--bg-color, #fff);
  color: var(--text-color, #333);
  resize: vertical;
  min-height: 60px;
  
  &:focus {
    outline: none;
    border-color: var(--primary-color, #007acc);
    box-shadow: 0 0 0 2px var(--primary-color-alpha, rgba(0, 122, 204, 0.2));
  }

  &::placeholder {
    color: var(--text-muted, #666);
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color, #eee);
}
</style>
