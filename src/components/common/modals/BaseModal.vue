<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="overlayRef"
      :class="modalState.overlayClasses"
      :aria-hidden="!visible"
      :aria-modal="visible"
      role="dialog"
      :aria-labelledby="titleId"
      :aria-describedby="contentId"
      @click="handleOverlayClick"
      @keydown="handleKeyDown"
    >
      <div
        ref="modalRef"
        :class="modalState.modalClasses"
        :style="modalState.modalStyles"
        @click.stop
      >
        <div 
          v-if="showHeader"
          class="modal-header"
        >
          <h2 
            :id="titleId"
            class="modal-title"
          >
            {{ title }}
          </h2>
          <button
            v-if="showCloseButton"
            ref="closeButtonRef"
            class="modal-close-button"
            type="button"
            :aria-label="closeButtonLabel"
            @click="handleClose"
          >
            {{ closeIcon }}
          </button>
        </div>
        
        <div 
          :id="contentId"
          class="modal-content"
          :class="contentClasses"
        >
          <slot />
        </div>
        
        <div 
          v-if="$slots.footer || showDefaultFooter"
          class="modal-footer"
          :class="footerClasses"
        >
          <slot 
            name="footer"
            :close="handleClose"
            :confirm="handleConfirm"
          >
            <div 
              v-if="showDefaultFooter"
              class="modal-footer-buttons"
            >
              <BaseButton
                v-if="showCancelButton"
                variant="secondary"
                @click="handleCancel"
              >
                {{ cancelButtonText }}
              </BaseButton>
              <BaseButton
                v-if="showConfirmButton"
                :variant="confirmButtonVariant"
                :disabled="confirmDisabled"
                :loading="loading"
                @click="handleConfirm"
              >
                {{ confirmButtonText }}
              </BaseButton>
            </div>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { ModalManager } from '@/utils/modalManager';
import UIStringManager from '@/utils/uiStringManager';
import BaseButton from '@/components/common/buttons/BaseButton.vue';
import type { ModalSize, ModalVariant } from '@/utils/modalManager';

interface Props {
  visible: boolean;
  title: string;
  size?: ModalSize;
  variant?: ModalVariant;
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  showHeader?: boolean;
  showCloseButton?: boolean;
  showDefaultFooter?: boolean;
  showCancelButton?: boolean;
  showConfirmButton?: boolean;
  cancelButtonText?: string;
  confirmButtonText?: string;
  confirmButtonVariant?: 'primary' | 'secondary' | 'danger' | 'success';
  confirmDisabled?: boolean;
  loading?: boolean;
  persistent?: boolean;
  zIndex?: number;
  maxWidth?: string;
  maxHeight?: string;
  contentClasses?: string | object;
  footerClasses?: string | object;
  closeIcon?: string;
  id?: string;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  modalClass?: string | object;
}

interface Emits {
  (e: 'close'): void;
  (e: 'confirm'): void;
  (e: 'cancel'): void;
  (e: 'opened'): void;
  (e: 'closed'): void;
  (e: 'overlay-click'): void;
  (e: 'escape'): void;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  variant: 'default',
  closeOnOverlay: true,
  closeOnEscape: true,
  showHeader: true,
  showCloseButton: true,
  showDefaultFooter: false,
  showCancelButton: true,
  showConfirmButton: true,
  confirmButtonVariant: 'primary',
  confirmDisabled: false,
  loading: false,
  persistent: false,
  zIndex: 1000,
  closeIcon: '×',
  trapFocus: true,
  restoreFocus: true
});

const emit = defineEmits<Emits>();

const overlayRef = ref<HTMLElement>();
const modalRef = ref<HTMLElement>();
const closeButtonRef = ref<HTMLElement>();
const modalManager = ModalManager.getInstance();
const uiStrings = UIStringManager.getInstance();

// モーダルIDの生成
const modalId = computed(() => 
  props.id || `modal-${Math.random().toString(36).substr(2, 9)}`
);

// アクセシビリティ用ID
const titleId = computed(() => `${modalId.value}-title`);
const contentId = computed(() => `${modalId.value}-content`);

// UIストリングの取得
const closeButtonLabel = computed(() => 
  uiStrings.getString('common.close', 'Close')
);

const cancelButtonText = computed(() => 
  props.cancelButtonText || uiStrings.getString('common.cancel', 'Cancel')
);

const confirmButtonText = computed(() => 
  props.confirmButtonText || uiStrings.getString('common.confirm', 'Confirm')
);

// モーダル状態の管理
const modalState = computed(() => ({
  overlayClasses: [
    'modal-overlay',
    `modal-overlay--${props.variant}`,
    {
      'modal-overlay--persistent': props.persistent,
      'modal-overlay--loading': props.loading
    }
  ],
  modalClasses: [
    'modal',
    `modal--${props.size}`,
    `modal--${props.variant}`,
    {
      'modal--no-header': !props.showHeader,
      'modal--no-footer': !props.showDefaultFooter && !props.$slots?.footer,
      'modal--loading': props.loading
    },
    props.modalClass
  ],
  modalStyles: {
    zIndex: props.zIndex,
    maxWidth: props.maxWidth,
    maxHeight: props.maxHeight
  }
}));

// イベントハンドラー
const handleOverlayClick = (): void => {
  emit('overlay-click');
  
  if (props.closeOnOverlay && !props.persistent) {
    handleClose();
  }
};

const handleKeyDown = (event: KeyboardEvent): void => {
  if (event.key === 'Escape') {
    emit('escape');
    
    if (props.closeOnEscape && !props.persistent) {
      handleClose();
    }
  }
  
  // フォーカストラップ
  if (props.trapFocus && event.key === 'Tab') {
    modalManager.handleTabKey(modalId.value, event);
  }
};

const handleClose = (): void => {
  emit('close');
};

const handleConfirm = (): void => {
  if (!props.confirmDisabled && !props.loading) {
    emit('confirm');
  }
};

const handleCancel = (): void => {
  emit('cancel');
  handleClose();
};

// モーダルの表示/非表示を監視
watch(() => props.visible, async (newVisible) => {
  if (newVisible) {
    await nextTick();
    
    if (modalRef.value) {
      modalManager.openModal(modalId.value, {
        element: modalRef.value,
        trapFocus: props.trapFocus,
        restoreFocus: props.restoreFocus,
        size: props.size,
        variant: props.variant,
        persistent: props.persistent
      });
      
      emit('opened');
    }
  } else {
    modalManager.closeModal(modalId.value);
    emit('closed');
  }
});

// コンポーネントのライフサイクル
onMounted(() => {
  if (props.visible && modalRef.value) {
    modalManager.openModal(modalId.value, {
      element: modalRef.value,
      trapFocus: props.trapFocus,
      restoreFocus: props.restoreFocus,
      size: props.size,
      variant: props.variant,
      persistent: props.persistent
    });
  }
});

onUnmounted(() => {
  modalManager.closeModal(modalId.value);
});
</script>

<style lang="scss" scoped>
@import '@/styles/components/BaseModal.scss';
</style>
