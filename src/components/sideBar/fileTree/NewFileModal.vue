<template>
  <BaseModal 
    :visible="visible"
    title="新しいファイルを作成"
    @close="handleClose"
  >
    <div class="new-file-form">
      <div class="form-group">
        <label class="form-label">ファイル名</label>
        <input
          v-model="fileName"
          type="text"
          class="form-input"
          placeholder="ファイル名を入力してください"
          @keyup.enter="handleCreate"
        >
      </div>

      <div class="form-group">
        <label class="form-label">モード</label>
        <select
          v-model="selectedMode"
          class="form-select"
        >
          <option value="note">
            ノートモード (.md)
          </option>
          <!-- 将来的に他のモードを追加 -->
          <!-- <option value="code">コードモード (.js/.ts)</option> -->
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">説明（任意）</label>
        <textarea
          v-model="description"
          class="form-textarea"
          placeholder="ファイルの説明を入力してください"
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
          variant="primary"
          :disabled="!fileName.trim() || creating"
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

interface TanFileData {
  meta: {
    title: string;
    description: string;
    createdAt: string;
    modifiedAt: string;
    directoryStructure: unknown[];
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
    keys: unknown[];
  };
}

interface WindowNewFileApi {
  tan: {
    create: (filePath: string, tanFile: TanFileData) => Promise<{ success: boolean; error?: string }>;
  };
  config: {
    getNotesDirectory: () => Promise<string>;
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
const selectedMode = ref('note');
const description = ref('');
const creating = ref(false);

// モーダルが開かれた時にフォームをリセット
watch(() => props.visible, (visible) => {
  if (visible) {
    fileName.value = '';
    selectedMode.value = 'note';
    description.value = '';
    creating.value = false;
  }
});

function handleClose(): void {
  emit('close');
}

async function handleCreate(): Promise<void> {
  if (!fileName.value.trim()) {
    return;
  }

  try {
    creating.value = true;
    
    const windowApi = (window as unknown as { api: WindowNewFileApi }).api;
    
    // Notesディレクトリを取得
    const notesDir = await windowApi.config.getNotesDirectory();
    
    // ファイル名に .tan 拡張子を追加（まだない場合）
    let finalFileName = fileName.value.trim();
    if (!finalFileName.endsWith('.tan')) {
      finalFileName += '.tan';
    }
    
    const filePath = `${notesDir}\\${finalFileName}`;
    
    // モードに応じた拡張子を決定
    let mainFileExtension = 'md';
    switch (selectedMode.value) {
      case 'note':
        mainFileExtension = 'md';
        break;
      // 将来的に他のモードを追加
      // case 'code':
      //   mainFileExtension = 'js';
      //   break;
    }
    
    // TANファイルデータを作成
    const now = new Date().toISOString();
    const tanData: TanFileData = {
      meta: {
        title: fileName.value.trim(),
        description: description.value || `${selectedMode.value}モードで作成されたファイル`,
        createdAt: now,
        modifiedAt: now,
        directoryStructure: []
      },
      version: '1.0.0',
      mode: selectedMode.value,
      mainFile: {
        name: `content.${mainFileExtension}`,
        content: selectedMode.value === 'note' ? '# ' + fileName.value.trim() + '\n\n' : '',
        extension: mainFileExtension
      },
      hook: {
        lineCount: selectedMode.value === 'note' ? 2 : 1,
        keys: []
      }
    };
    
    // TANファイルを作成
    const result = await windowApi.tan.create(filePath, tanData);
    
    if (result.success) {
      console.log('TANファイルを作成しました:', filePath);
      emit('file-created', filePath);
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
</script>

<style lang="scss" scoped>
.new-file-form {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color, #333);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  font-size: 14px;
  color: var(--text-color, #333);
  background: var(--input-bg, #fff);
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: var(--primary-color, #007acc);
    box-shadow: 0 0 0 3px var(--primary-color-alpha, rgba(0, 122, 204, 0.1));
  }

  &::placeholder {
    color: var(--text-muted, #999);
  }
}

.form-textarea {
  resize: vertical;
  min-height: 60px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color, #eee);
}
</style>
