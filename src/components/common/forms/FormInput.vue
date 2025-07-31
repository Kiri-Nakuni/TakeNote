<template>
  <div 
    :class="fieldClasses"
  >
    <label 
      v-if="label"
      :for="fieldId"
      :class="labelClasses"
    >
      {{ label }}
    </label>
    
    <div class="form-input-wrapper">
      <input
        v-if="type !== 'textarea'"
        :id="fieldId"
        ref="inputRef"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :autocomplete="autocomplete"
        :maxlength="maxlength"
        :minlength="minlength"
        :class="inputClasses"
        :aria-label="ariaLabel"
        :aria-invalid="!!error"
        :aria-describedby="ariaDescribedBy"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      >
      
      <textarea
        v-else
        :id="fieldId"
        ref="textareaRef"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :rows="rows"
        :maxlength="maxlength"
        :minlength="minlength"
        :class="inputClasses"
        :aria-label="ariaLabel"
        :aria-invalid="!!error"
        :aria-describedby="ariaDescribedBy"
        @input="handleInput"
        @blur="handleBlur"
        @focus="handleFocus"
      />
      
      <span 
        v-if="icon"
        class="form-icon"
      >
        {{ icon }}
      </span>
    </div>
    
    <div 
      v-if="showCounter && maxlength"
      class="form-counter"
    >
      {{ characterCount }} / {{ maxlength }}
    </div>
    
    <div 
      v-if="error"
      class="form-error-message"
      role="alert"
    >
      {{ error }}
    </div>
    
    <div 
      v-if="hint && !error"
      class="form-help-text"
    >
      {{ hint }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import type { FormInputType, FormInputSize } from '@/utils/formInputManager';

interface Props {
  modelValue: string | number;
  type?: FormInputType;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  error?: string;
  hint?: string;
  icon?: string;
  rows?: number;
  size?: FormInputSize;
  autocomplete?: string;
  maxlength?: number;
  minlength?: number;
  showCounter?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  id?: string;
  inline?: boolean;
  compact?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string | number): void;
  (e: 'blur', event: FocusEvent): void;
  (e: 'focus', event: FocusEvent): void;
  (e: 'change', value: string | number): void;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  required: false,
  disabled: false,
  readonly: false,
  rows: 3,
  size: 'medium',
  showCounter: false,
  inline: false,
  compact: false
});

const emit = defineEmits<Emits>();

const inputRef = ref<HTMLInputElement>();
const textareaRef = ref<HTMLTextAreaElement>();
// const formInputManager = FormInputManager.getInstance();
// const uiStrings = UIStringManager.getInstance();

// フィールドIDの生成
const fieldId = computed(() => 
  props.id || `field-${Math.random().toString(36).substr(2, 9)}`
);

// 文字数カウント
const characterCount = computed(() => String(props.modelValue).length);

// クラスの計算
const fieldClasses = computed(() => [
  'form-input-group',
  `form-input-group--${props.size}`,
  {
    'form-input-group--error': props.error,
    'form-input-group--disabled': props.disabled,
    'form-input-group--readonly': props.readonly,
    'form-input-group--inline': props.inline,
    'form-input-group--compact': props.compact,
    'form-input-group--required': props.required
  }
]);

const labelClasses = computed(() => [
  'form-label',
  `form-label--${props.size}`,
  {
    'form-label--required': props.required,
    'form-label--error': props.error
  }
]);

const inputClasses = computed(() => [
  'form-input',
  `form-input--${props.size}`,
  `form-input--${props.type}`,
  {
    'form-input--error': props.error,
    'form-input--disabled': props.disabled,
    'form-input--readonly': props.readonly,
    'form-input--with-icon': props.icon,
    'form-input--textarea': props.type === 'textarea'
  }
]);

// イベントハンドラー
const handleInput = (event: Event): void => {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement;
  let value: string | number = target.value;
  
  // 型変換
  if (props.type === 'number' && value !== '') {
    value = Number(value);
  }
  
  emit('update:modelValue', value);
  emit('change', value);
};

const handleBlur = (event: FocusEvent): void => {
  emit('blur', event);
};

const handleFocus = (event: FocusEvent): void => {
  emit('focus', event);
};

// フォーカス制御
const focus = (): void => {
  const element = inputRef.value || textareaRef.value;
  if (element) {
    element.focus();
  }
};

const blur = (): void => {
  const element = inputRef.value || textareaRef.value;
  if (element) {
    element.blur();
  }
};

// 外部からのアクセス用
defineExpose({
  focus,
  blur
});

// コンポーネントのライフサイクル
onMounted(() => {
  // フォームインプットマネージャーへの登録は一旦コメントアウト
  // const element = inputRef.value || textareaRef.value;
  // if (element) {
  //   formInputManager.registerField(fieldId.value, {
  //     element,
  //     type: props.type,
  //     required: props.required
  //   });
  // }
});

onUnmounted(() => {
  // formInputManager.unregisterField(fieldId.value);
});
</script>

<style lang="scss" scoped>
@import '@/styles/components/FormInput.scss';
</style>
