<template>
  <BaseModal
    :visible="isVisible"
    title="新しいフォルダ"
    @close="handleClose"
  >
    <form @submit.prevent="handleSubmit">
      <FormInput
        v-model="folderName"
        label="フォルダ名"
        placeholder="フォルダ名を入力してください"
        :required="true"
        :error="error"
        @input="clearError"
      />
      
      <div class="form-actions">
        <BaseButton
          type="button"
          variant="secondary"
          @click="handleClose"
        >
          キャンセル
        </BaseButton>
        <BaseButton
          type="submit"
          variant="primary"
          :disabled="!folderName.trim() || isCreating"
        >
          {{ isCreating ? '作成中...' : '作成' }}
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import BaseModal from './BaseModal.vue';
import BaseButton from '../buttons/BaseButton.vue';
import FormInput from '../forms/FormInput.vue';

interface Props {
  isVisible: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'folder-created', folderPath: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const folderName = ref('');
const error = ref('');
const isCreating = ref(false);

// モーダルが開かれた時にフォームをリセット
watch(() => props.isVisible, (visible) => {
  if (visible) {
    // IME問題対策：まず全てのフォーカスを外す
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    folderName.value = '';
    error.value = '';
    isCreating.value = false;
    
    // フォーカス管理を改善
    setTimeout(() => {
      const folderNameInput = document.getElementById('folderName');
      if (folderNameInput) {
        folderNameInput.focus();
      }
    }, 100);
  }
});

function clearError(): void {
  error.value = '';
}

function handleClose(): void {
  emit('close');
}

async function handleSubmit(): Promise<void> {
  if (!folderName.value.trim()) {
    error.value = 'フォルダ名を入力してください。';
    return;
  }

  // フォルダ名の検証
  const invalidChars = /[<>:"/\\|?*]/;
  if (invalidChars.test(folderName.value)) {
    error.value = 'フォルダ名に使用できない文字が含まれています。';
    return;
  }

  try {
    isCreating.value = true;
    
    // フォルダ作成のAPI呼び出し
    const result = await window.api.file.createFolder(folderName.value.trim());
    
    if (result.success) {
      emit('folder-created', result.data as string);
      handleClose();
    } else {
      error.value = result.error || 'フォルダの作成に失敗しました。';
    }
  } catch (err) {
    console.error('フォルダ作成エラー:', err);
    error.value = 'フォルダの作成中にエラーが発生しました。';
  } finally {
    isCreating.value = false;
  }
}
</script>

<style scoped>
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}
</style>
