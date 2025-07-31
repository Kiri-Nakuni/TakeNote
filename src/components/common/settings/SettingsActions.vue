<template>
  <div :class="['settings-actions', { 'modal-mode': modalMode }]">
    <BaseButton 
      v-if="showReset"
      variant="ghost"
      @click="handleReset"
    >
      {{ resetText }}
    </BaseButton>
    <BaseButton 
      v-if="showCancel"
      variant="secondary"
      @click="handleCancel"
    >
      {{ cancelText }}
    </BaseButton>
    <BaseButton 
      :disabled="!hasChanges"
      :loading="saving"
      variant="primary"
      @click="handleSave"
    >
      {{ saveText }}
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/common/buttons/BaseButton.vue';

interface Props {
  hasChanges: boolean;
  saving: boolean;
  showReset?: boolean;
  showCancel?: boolean;
  saveText?: string;
  resetText?: string;
  cancelText?: string;
  modalMode?: boolean;
}

interface Emits {
  (e: 'save'): void;
  (e: 'reset'): void;
  (e: 'cancel'): void;
}

withDefaults(defineProps<Props>(), {
  showReset: true,
  showCancel: false,
  saveText: '設定を保存',
  resetText: 'デフォルトに戻す',
  cancelText: 'キャンセル',
  modalMode: false
});

const emit = defineEmits<Emits>();

function handleSave(): void {
  emit('save');
}

function handleReset(): void {
  emit('reset');
}

function handleCancel(): void {
  emit('cancel');
}
</script>

<style lang="scss" scoped>
.settings-actions {
  padding: 16px;
  border-top: 1px solid var(--border-color);
  display: flex;
  gap: 8px;
  background: var(--footer-bg);
  
  &.modal-mode {
    padding: 0;
    border-top: none;
    background: transparent;
    justify-content: flex-end;
  }
}
</style>
