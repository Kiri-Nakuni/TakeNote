<template>
  <button
    :id="buttonId"
    ref="buttonRef"
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    :aria-label="ariaLabel"
    :aria-pressed="ariaPressed"
    :aria-busy="loading"
    :aria-describedby="ariaDescribedBy"
    @click="handleClick"
  >
    <span 
      v-if="icon"
      class="button-icon"
    >
      {{ icon }}
    </span>
    <span 
      v-if="$slots.default"
      class="button-text"
    >
      <slot />
    </span>
    <span 
      v-if="loading"
      class="button-loading"
      :aria-label="loadingText"
    >
      {{ loadingIcon }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, useSlots } from 'vue';
import UIStringManager from '@/utils/uiStringManager';
import type { ButtonVariant, ButtonSize } from '@/utils/buttonManager';

interface Props {
  variant?: ButtonVariant;
  size?: ButtonSize;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
  rounded?: boolean;
  shadow?: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean | 'mixed';
  ariaDescribedBy?: string;
  loadingIcon?: string;
  id?: string;
}

interface Emits {
  (e: 'click', event: MouseEvent): void;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'medium',
  type: 'button',
  disabled: false,
  loading: false,
  fullWidth: false,
  rounded: false,
  shadow: false,
  loadingIcon: '⏳'
});

const emit = defineEmits<Emits>();

const slots = useSlots();
const buttonRef = ref<HTMLButtonElement>();
// const buttonManager = ButtonManager.getInstance();
const uiStrings = new UIStringManager();

// ボタンIDの生成
const buttonId = computed(() => 
  props.id || `btn-${Math.random().toString(36).substr(2, 9)}`
);

// UIストリングの取得
const loadingText = computed(() => 
  uiStrings.getString('common.loading', 'Loading...')
);

// ボタンクラスの計算
const buttonClasses = computed(() => [
  'btn',
  `btn--${props.variant}`,
  `btn--${props.size}`,
  {
    'btn--disabled': props.disabled || props.loading,
    'btn--loading': props.loading,
    'btn--full-width': props.fullWidth,
    'btn--icon-only': props.icon && !slots.default,
    'btn--rounded': props.rounded,
    'btn--shadow': props.shadow
  }
]);

// イベントハンドラー
const handleClick = (event: MouseEvent): void => {
  if (props.disabled || props.loading) return;
  
  emit('click', event);
};

// コンポーネントのライフサイクル
onMounted(() => {
  // ボタンマネージャーへの登録は一旦コメントアウト
  // if (buttonRef.value) {
  //   buttonManager.registerButton(buttonId.value, {
  //     element: buttonRef.value,
  //     variant: props.variant,
  //     size: props.size,
  //     disabled: props.disabled || props.loading,
  //     loading: props.loading
  //   });
  // }
});

onUnmounted(() => {
  // buttonManager.unregisterButton(buttonId.value);
});
</script>

<style lang="scss" scoped>
@import '@/styles/components/BaseButton.scss';
</style>
