<template>
  <div 
    class="resizable-pane-container" 
    :class="{ 'resizable': resizable }"
  >
    <div 
      class="pane-left" 
      :style="{ width: `${leftWidth}px` }"
    >
      <slot name="left" />
    </div>
    
    <div 
      v-if="resizable"
      class="pane-resizer"
      @mousedown="startResize"
    >
      <div class="resizer-handle" />
    </div>
    
    <div 
      class="pane-right" 
      :style="{ width: `calc(100% - ${leftWidth + (resizable ? 4 : 0)}px)` }"
    >
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';

interface Props {
  resizable?: boolean;
  initialLeftWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
}

const props = withDefaults(defineProps<Props>(), {
  resizable: false,
  initialLeftWidth: 600,
  minLeftWidth: 200,
  minRightWidth: 200
});

const leftWidth = ref(props.initialLeftWidth);
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);

function startResize(e: MouseEvent): void {
  if (!props.resizable) return;
  
  isResizing.value = true;
  startX.value = e.clientX;
  startWidth.value = leftWidth.value;
  
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
}

function onMouseMove(e: MouseEvent): void {
  if (!isResizing.value) return;
  
  const deltaX = e.clientX - startX.value;
  const newWidth = startWidth.value + deltaX;
  const containerWidth = document.querySelector('.resizable-pane-container')?.clientWidth || 1200;
  
  const clampedWidth = Math.max(
    props.minLeftWidth,
    Math.min(newWidth, containerWidth - props.minRightWidth - 4)
  );
  
  leftWidth.value = clampedWidth;
}

function onMouseUp(): void {
  isResizing.value = false;
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);
});
</script>

<style lang="scss" scoped>
.resizable-pane-container {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.pane-left {
  height: 100%;
  overflow: hidden;
}

.pane-right {
  height: 100%;
  overflow: hidden;
  flex: 1;
}

.pane-resizer {
  width: 4px;
  height: 100%;
  background: var(--resizer-background, #e0e0e0);
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: var(--resizer-hover, #d0d0d0);
  }
  
  &:active {
    background: var(--resizer-active, #c0c0c0);
  }
}

.resizer-handle {
  width: 2px;
  height: 100%;
  background: var(--resizer-handle, #a0a0a0);
  border-radius: 1px;
}
</style>
