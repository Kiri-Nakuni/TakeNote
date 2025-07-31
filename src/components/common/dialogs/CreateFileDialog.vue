<template>
  <BaseModal
    :visible="visible"
    :title="uiStrings.get('dialogs.createFile.title')"
    @close="handleClose"
  >
    <div class="create-file-dialog">
      <div class="form-group">
        <label class="form-label">
          {{ uiStrings.get('dialogs.createFile.labels.fileName') }}
          <span class="required">*</span>
        </label>
        <FormInput
          v-model="fileName"
          :placeholder="uiStrings.get('dialogs.createFile.placeholders.fileName')"
          :error="validation.errors[0]"
          @keyup.enter="handleCreate"
        />
      </div>

      <div class="form-group">
        <label class="form-label">
          {{ uiStrings.get('dialogs.createFile.labels.mode') }}
        </label>
        <select
          v-model="selectedMode"
          class="mode-select"
        >
          <option
            v-for="mode in availableModes"
            :key="mode.id"
            :value="mode.id"
          >
            {{ mode.icon }} {{ mode.name }} ({{ mode.extension }})
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">
          {{ uiStrings.get('dialogs.createFile.labels.description') }}
        </label>
        <FormInput
          v-model="description"
          :placeholder="uiStrings.get('dialogs.createFile.placeholders.description')"
        />
      </div>

      <!-- バリデーションメッセージ -->
      <div
        v-if="validation.errors.length > 0 || validation.warnings.length > 0"
        class="validation-messages"
      >
        <div
          v-if="validation.errors.length > 0"
          class="errors"
        >
          <div
            v-for="(error, index) in validation.errors"
            :key="`error-${index}`"
            class="error-item"
          >
            <span class="error-icon">⚠️</span>
            <span>{{ error }}</span>
          </div>
        </div>
        
        <div
          v-if="validation.warnings.length > 0"
          class="warnings"
        >
          <div
            v-for="(warning, index) in validation.warnings"
            :key="`warning-${index}`"
            class="warning-item"
          >
            <span class="warning-icon">💡</span>
            <span>{{ warning }}</span>
          </div>
        </div>
      </div>

      <!-- ファイルプレビュー -->
      <div
        v-if="showPreview && fileName.trim()"
        class="file-preview"
      >
        <div class="preview-header">
          <span class="preview-icon">📄</span>
          <span>{{ uiStrings.get('dialogs.createFile.preview.title') }}</span>
        </div>
        <div class="preview-info">
          <span class="info-label">{{ uiStrings.get('dialogs.createFile.preview.labels.fullName') }}:</span>
          <span class="info-value">{{ normalizedData.fileName }}</span>
          <span class="info-label">{{ uiStrings.get('dialogs.createFile.preview.labels.type') }}:</span>
          <span class="info-value">{{ selectedModeInfo?.name }}</span>
          <span class="info-label">{{ uiStrings.get('dialogs.createFile.preview.labels.size') }}:</span>
          <span class="info-value">{{ formatFileSize(estimatedSize) }}</span>
        </div>
      </div>

      <div class="dialog-actions">
        <BaseButton
          variant="secondary"
          class="action-button"
          @click="handleClose"
        >
          {{ uiStrings.get('dialogs.createFile.buttons.cancel') }}
        </BaseButton>
        <BaseButton
          variant="primary"
          class="action-button"
          :disabled="!canCreate"
          @click="handleCreate"
        >
          {{ uiStrings.get('dialogs.createFile.buttons.create') }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import BaseModal from '@/components/common/modals/BaseModal.vue';
import BaseButton from '@/components/common/buttons/BaseButton.vue';
import FormInput from '@/components/common/forms/FormInput.vue';
import { FileDialogManager, type FileCreateData } from '@/utils/fileDialogManager';
import UIStringManager from '@/utils/uiStringManager';

interface Emits {
  (e: 'create', data: FileCreateData): void;
  (e: 'close'): void;
}

const emit = defineEmits<Emits>();

const props = defineProps<{
  visible: boolean;
}>();

// 管理クラスのインスタンス
const fileDialogManager = FileDialogManager.getInstance();
const uiStrings = UIStringManager.getInstance();

// リアクティブデータ
const fileName = ref('');
const selectedMode = ref<FileCreateData['mode']>('note');
const description = ref('');
const showPreview = ref(true);

// 利用可能なモードを取得
const availableModes = computed(() => fileDialogManager.getAvailableModes());

// 選択されたモードの情報
const selectedModeInfo = computed(() => 
  fileDialogManager.getMode(selectedMode.value)
);

// 正規化されたデータ
const normalizedData = computed(() => 
  fileDialogManager.normalizeCreateData({
    fileName: fileName.value,
    mode: selectedMode.value,
    description: description.value
  })
);

// バリデーション結果
const validation = computed(() => 
  fileDialogManager.validateCreateData(normalizedData.value)
);

// 推定ファイルサイズ
const estimatedSize = computed(() => 
  fileDialogManager.estimateFileSize(normalizedData.value)
);

// 作成可能かどうか
const canCreate = computed(() => 
  fileName.value.trim() && validation.value.isValid
);

// ファイルサイズを人間が読みやすい形式でフォーマット
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ダイアログが開かれた時にフィールドをリセット
watch(() => props.visible, (visible) => {
  if (visible) {
    fileName.value = '';
    selectedMode.value = 'note';
    description.value = '';
  }
});

function handleCreate(): void {
  if (!canCreate.value) {
    return;
  }

  const createData = normalizedData.value;
  
  // 履歴に記録
  fileDialogManager.recordCreateHistory(createData);
  
  emit('create', createData);
}

function handleClose(): void {
  emit('close');
}

// コンポーネントマウント時の初期化
onMounted(() => {
  // イベントリスナーの設定など必要に応じて
});
</script>

<style lang="scss" scoped>
@import '@/styles/components/CreateFileDialog.scss';
</style>
