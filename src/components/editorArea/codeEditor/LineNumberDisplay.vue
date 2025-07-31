<template>
  <div class="line-numbers">
    <div
      v-for="lineNumber in totalLines"
      :key="lineNumber"
      class="line-number"
      :class="{ active: lineNumber === currentLine }"
    >
      {{ lineNumber }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  content: string;
  currentLine?: number;
}

const props = defineProps<Props>();

// 実際の行数（改行文字で分割）
const totalLines = computed(() => {
  if (!props.content) return 1;
  return props.content.split('\n').length;
});
</script>

<style lang="scss" scoped>
.line-numbers {
  display: flex;
  flex-direction: column;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-color);
  padding: 1em 8px 1em 12px;
  font-family: var(--font-family-mono, 'Courier New', monospace);
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-muted);
  user-select: none;
  min-width: 40px;
  text-align: right;
}

.line-number {
  height: 21px; // line-height * font-size
  display: flex;
  align-items: center;
  justify-content: flex-end;
  
  &.active {
    color: var(--text-color);
    font-weight: bold;
  }
}
</style>