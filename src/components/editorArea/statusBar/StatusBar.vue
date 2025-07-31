<template>
  <div class="status-bar">
    <!-- 左側：ファイル情報 -->
    <div class="status-left">
      <span class="file-name">{{ fileName || '無題' }}</span>
      <span
        v-if="isModified"
        class="modified-indicator"
      >●</span>
      <span class="encoding">{{ encoding }}</span>
      <span class="line-ending">{{ lineEnding }}</span>
    </div>

    <!-- 中央：統計情報 -->
    <div class="status-center">
      <span class="file-stats">
        {{ totalLines }}行 {{ totalCharacters }}文字
      </span>
      <span
        v-if="selectedText"
        class="selection-stats"
      >
        (選択: {{ selectedLines }}行 {{ selectedCharacters }}文字)
      </span>
    </div>

    <!-- 右側：カーソル位置・言語 -->
    <div class="status-right">
      <span class="cursor-position">
        行 {{ cursorLine }}, 列 {{ cursorColumn }}
      </span>
      <span class="language-mode">{{ languageMode }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">

interface Props {
  fileName?: string;
  isModified?: boolean;
  encoding?: string;
  lineEnding?: string;
  totalLines?: number;
  totalCharacters?: number;
  selectedText?: string;
  selectedLines?: number;
  selectedCharacters?: number;
  cursorLine?: number;
  cursorColumn?: number;
  languageMode?: string;
}

withDefaults(defineProps<Props>(), {
  fileName: '',
  isModified: false,
  encoding: 'UTF-8',
  lineEnding: 'LF',
  totalLines: 1,
  totalCharacters: 0,
  selectedText: '',
  selectedLines: 0,
  selectedCharacters: 0,
  cursorLine: 1,
  cursorColumn: 1,
  languageMode: 'Plain Text'
});
</script>

<style lang="scss" scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px;
  background: var(--status-bar-bg);
  color: var(--status-bar-text);
  font-size: 12px;
  height: 24px;
  border-top: 1px solid var(--border-color);
  user-select: none;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-name {
  font-weight: 500;
  color: var(--status-bar-text);
}

.modified-indicator {
  color: var(--accent-color);
  font-weight: bold;
}

.encoding,
.line-ending {
  padding: 2px 6px;
  background: var(--status-badge-bg);
  border-radius: 3px;
  font-size: 11px;
  color: var(--status-bar-text);
}

.file-stats,
.selection-stats {
  opacity: 0.9;
  color: var(--status-bar-text);
}

.cursor-position {
  font-family: var(--font-family-mono, 'Courier New', monospace);
  color: var(--status-bar-text);
}

.language-mode {
  padding: 2px 8px;
  background: var(--status-badge-bg);
  border-radius: 3px;
  cursor: pointer;
  color: var(--status-bar-text);
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--status-badge-hover);
  }
}
</style>
