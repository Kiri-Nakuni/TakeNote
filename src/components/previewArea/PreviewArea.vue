<template>
  <div class="preview-area">
    <div class="preview-header">
      <h3>プレビュー</h3>
      <div 
        v-if="activeTab"
        class="preview-info"
      >
        <span class="file-name">{{ activeTab.displayName }}</span>
        <span 
          v-if="activeTab.tanMode"
          class="mode-badge"
        >{{ getModeLabel(activeTab.tanMode) }}</span>
      </div>
    </div>
    
    <div class="preview-content">
      <!-- Note modeの場合はMarkdownレンダリング -->
      <MarkdownRenderer 
        v-if="activeTab && activeTab.tanMode === 'note'"
        :content="activeTab.content"
      />
      
      <!-- C++ modeの場合はC++実行環境 -->
      <CppExecutionMode 
        v-else-if="activeTab && activeTab.tanMode === 'cpp'"
        :code="activeTab.content"
        :file-name="activeTab.displayName"
      />
      
      <!-- その他のモードまたはファイルがない場合 -->
      <div 
        v-else
        class="placeholder-content"
      >
        <div v-if="!activeTab">
          <p>プレビューするファイルがありません</p>
          <p>サイドバーからファイルを開いてください</p>
        </div>
        <div v-else>
          <p>プレビューエリア（将来実装）</p>
          <p><strong>現在のモード:</strong> {{ getModeLabel(activeTab.tanMode || 'other') }}</p>
          <div class="future-features">
            <h4>今後実装予定の機能:</h4>
            <ul>
              <li v-if="activeTab.tanMode === 'javascript'">
                JavaScriptコード実行結果
              </li>
              <li v-if="activeTab.tanMode === 'typescript'">
                TypeScriptコード検証
              </li>
              <li v-if="activeTab.tanMode === 'python'">
                Pythonコード実行結果
              </li>
              <li v-if="activeTab.tanMode === 'java'">
                Javaコードプレビュー
              </li>
              <li v-if="activeTab.tanMode === 'book'">
                書籍レイアウトプレビュー
              </li>
              <li v-if="activeTab.tanMode === 'presentation'">
                プレゼンテーションスライドプレビュー
              </li>
              <li v-if="!activeTab.tanMode || activeTab.tanMode === 'other'">
                汎用プレビュー
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { tabManagerCore } from '@/components/editorArea/tabManager/tabManagerCore'
import MarkdownRenderer from './markdownRenderer/MarkdownRenderer.vue'
import CppExecutionMode from './viewModes/cppMode/CppExecutionMode.vue'

// アクティブなタブを取得
const activeTab = computed(() => tabManagerCore.activeTab.value)

// モードラベルを取得
function getModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    note: 'ノート',
    cpp: 'C++',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    book: '本',
    presentation: 'プレゼンテーション',
    other: 'その他'
  }
  return labels[mode] || mode
}
</script>

<style scoped>
.preview-area {
  flex: 1;
  background: var(--preview-bg);
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--border-color);
}

.preview-header {
  padding: 12px 16px;
  background: var(--preview-header-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.preview-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-color);
}

.preview-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.file-name {
  color: var(--text-secondary);
  font-weight: 500;
}

.mode-badge {
  background: var(--accent-color);
  color: var(--bg-color);
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.preview-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.placeholder-content {
  flex: 1;
  padding: 16px;
  font-size: 14px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.placeholder-content p {
  margin: 8px 0;
}

.future-features {
  margin-top: 24px;
  text-align: left;
  max-width: 300px;
}

.future-features h4 {
  margin: 0 0 12px 0;
  color: var(--text-color);
  font-size: 14px;
}

.future-features ul {
  margin: 0;
  padding-left: 20px;
}

.future-features li {
  margin: 4px 0;
  font-size: 13px;
}
</style>
