<template>
  <BaseModal
    :visible="isVisible"
    :title="modalData.title"
    :show-default-footer="true"
    :show-cancel-button="modalData.type === 'confirm'"
    :show-confirm-button="true"
    :confirm-button-text="modalData.type === 'confirm' ? 'OK' : 'OK'"
    :cancel-button-text="'キャンセル'"
    :confirm-button-variant="getButtonVariant(modalData.displayType)"
    @close="handleClose"
    @confirm="handleConfirm"
    @cancel="handleCancel"
  >
    <div class="alert-content">
      <div 
        v-if="modalData.displayType"
        class="alert-icon"
      >
        <span :class="getIconClass(modalData.displayType)">{{ getIcon(modalData.displayType) }}</span>
      </div>
      <div class="alert-message">
        {{ modalData.message }}
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import BaseModal from './BaseModal.vue';
import { ModalManager } from '@/utils/modalManager';

interface ModalData {
  message: string;
  title: string;
  type: 'alert' | 'confirm';
  displayType: 'info' | 'warning' | 'error' | 'success';
}

const isVisible = ref(false);
const modalData = ref<ModalData>({
  message: '',
  title: '',
  type: 'alert',
  displayType: 'info'
});

let currentResolve: ((value?: boolean | void) => void) | null = null;

const modalManager = ModalManager.getInstance();

const handleAlertEvent = (data: unknown): void => {
  const alertEvent = data as { message: string; title: string; type: 'info' | 'warning' | 'error' | 'success'; resolve: () => void };
  console.log('Alert event received:', alertEvent);
  modalData.value = {
    message: alertEvent.message,
    title: alertEvent.title,
    type: 'alert',
    displayType: alertEvent.type
  };
  currentResolve = alertEvent.resolve;
  isVisible.value = true;
};

const handleConfirmEvent = (data: unknown): void => {
  const confirmEvent = data as { message: string; title: string; resolve: (value: boolean) => void };
  console.log('Confirm event received:', confirmEvent);
  modalData.value = {
    message: confirmEvent.message,
    title: confirmEvent.title,
    type: 'confirm',
    displayType: 'info'
  };
  currentResolve = confirmEvent.resolve;
  isVisible.value = true;
};

const handleClose = (): void => {
  isVisible.value = false;
  if (currentResolve) {
    if (modalData.value.type === 'confirm') {
      (currentResolve as (value: boolean) => void)(false);
    } else {
      (currentResolve as () => void)();
    }
    currentResolve = null;
  }
};

const handleConfirm = (): void => {
  isVisible.value = false;
  if (currentResolve) {
    if (modalData.value.type === 'confirm') {
      (currentResolve as (value: boolean) => void)(true);
    } else {
      (currentResolve as () => void)();
    }
    currentResolve = null;
  }
};

const handleCancel = (): void => {
  isVisible.value = false;
  if (currentResolve && modalData.value.type === 'confirm') {
    (currentResolve as (value: boolean) => void)(false);
    currentResolve = null;
  }
};

const getButtonVariant = (type: string): 'primary' | 'secondary' | 'danger' | 'success' => {
  switch (type) {
    case 'error':
      return 'danger';
    case 'success':
      return 'success';
    case 'warning':
      return 'secondary';
    default:
      return 'primary';
  }
};

const getIconClass = (type: string): string => {
  switch (type) {
    case 'error':
      return 'alert-icon--error';
    case 'success':
      return 'alert-icon--success';
    case 'warning':
      return 'alert-icon--warning';
    default:
      return 'alert-icon--info';
  }
};

const getIcon = (type: string): string => {
  switch (type) {
    case 'error':
      return '✗';
    case 'success':
      return '✓';
    case 'warning':
      return '⚠';
    default:
      return 'ℹ';
  }
};

onMounted(() => {
  console.log('AlertModal mounted, registering event listeners');
  modalManager.on('alert', handleAlertEvent);
  modalManager.on('confirm', handleConfirmEvent);
});

onUnmounted(() => {
  console.log('AlertModal unmounted, removing event listeners');
  modalManager.off('alert', handleAlertEvent);
  modalManager.off('confirm', handleConfirmEvent);
});
</script>

<style lang="scss" scoped>
.alert-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  min-height: 40px;
}

.alert-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: bold;
  
  &--info {
    background-color: #e3f2fd;
    color: #1976d2;
  }
  
  &--success {
    background-color: #e8f5e8;
    color: #2e7d32;
  }
  
  &--warning {
    background-color: #fff3e0;
    color: #f57c00;
  }
  
  &--error {
    background-color: #ffebee;
    color: #d32f2f;
  }
}

.alert-message {
  flex: 1;
  line-height: 1.5;
  color: var(--text-color);
  word-wrap: break-word;
}
</style>
