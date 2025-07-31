<template>
  <div 
    ref="previewContainer"
    class="markdown-renderer"
  >
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div 
      class="markdown-content"
      v-html="renderedContent"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'
import texmath from 'markdown-it-texmath'
import katex from 'katex'
import { katexMacros } from '@/utils/katexMacros'
import { processDynamicHtml } from '@/utils/dynamicHtmlProcessor'
import 'katex/dist/katex.min.css'

interface Props {
  content: string
}

const props = defineProps<Props>()
const previewContainer = ref<HTMLElement>()

// KaTeXエンジンの設定
const katexEngine = {
  renderToString: (tex: string, options: { displayMode?: boolean } = {}) => {
    try {
      return katex.renderToString(tex, {
        displayMode: options.displayMode || false,
        throwOnError: false,
        macros: katexMacros,
        trust: true, // HTMLタグ埋め込み機能を有効化
        strict: false
      })
    } catch (error) {
      console.warn('KaTeX rendering error:', error, 'for:', tex)
      return `<span style="color: red;">Math Error: ${tex}</span>`
    }
  }
}

// MarkdownItの設定（改行コード一回で改行）
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: true // 改行コード一回で改行に設定
})

// texmathプラグインを設定
try {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  md.use(texmath as any, {
    engine: katexEngine,
    delimiters: 'dollars' // $...$ と $$...$$ を使用
  })
} catch (error) {
  console.warn('Failed to initialize texmath plugin:', error)
}

// Markdownをレンダリング
const renderedContent = computed(() => {
  if (!props.content) {
    return '<p class="no-content">コンテンツがありません</p>'
  }
  
  try {
    return md.render(props.content)
  } catch (error) {
    console.error('Markdown rendering error:', error)
    return `<p class="error">レンダリングエラー: ${error}</p>`
  }
})

// 動的HTML処理を適用
const applyDynamicProcessing = async (): Promise<void> => {
  await nextTick()
  if (previewContainer.value) {
    processDynamicHtml(previewContainer.value)
  }
}

// コンテンツが変更されたら動的処理を再実行
watch(() => props.content, () => {
  applyDynamicProcessing()
}, { flush: 'post' })

onMounted(() => {
  applyDynamicProcessing()
})
</script>

<style scoped>
.markdown-renderer {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden; /* 横方向のはみ出しを防ぐ */
  padding: 16px;
  background: white;
  /* 強固な幅制御 */
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.markdown-content {
  max-width: none;
  line-height: 1.6;
  color: #333;
  /* 大きな要素による幅の肥大化を防ぐ */
  overflow-x: hidden;
  word-wrap: break-word;
  /* 強固な幅制御 */
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  /* コンテナクエリ対応 */
  container-type: inline-size;
}

/* 全ての子要素に対する強固な幅制御 */
.markdown-content * {
  max-width: 100% !important;
  box-sizing: border-box !important;
}

/* KaTeX要素の特別な制御 */
.markdown-content .katex,
.markdown-content .katex-display,
.markdown-content :deep(.katex),
.markdown-content :deep(.katex-display) {
  max-width: 100% !important;
  overflow-x: auto !important;
  overflow-y: visible !important;
}

/* インライン数式要素の制御 */
.markdown-content :deep(span[data-x-scale]),
.markdown-content :deep(.active-rotate),
.markdown-content :deep(.enclosing) {
  max-width: 100% !important;
  overflow: visible !important;
  box-sizing: border-box !important;
}

/* マークダウンスタイリング */
.markdown-content h1 {
  font-size: 2em;
  margin: 0.67em 0;
  border-bottom: 2px solid #eee;
  padding-bottom: 0.3em;
}

.markdown-content h2 {
  font-size: 1.5em;
  margin: 0.83em 0;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.markdown-content h3 {
  font-size: 1.17em;
  margin: 1em 0;
}

.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  margin: 1.33em 0;
}

.markdown-content p {
  margin: 1em 0;
}

.markdown-content ul,
.markdown-content ol {
  margin: 1em 0;
  padding-left: 2em;
}

.markdown-content li {
  margin: 0.5em 0;
}

.markdown-content blockquote {
  margin: 1em 0;
  padding: 0 1em;
  border-left: 4px solid #ddd;
  color: #666;
}

.markdown-content code {
  background: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
}

.markdown-content pre {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
  margin: 1em 0;
}

.markdown-content pre code {
  background: none;
  padding: 0;
}

.markdown-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.markdown-content th,
.markdown-content td {
  border: 1px solid #ddd;
  padding: 8px 12px;
  text-align: left;
}

.markdown-content th {
  background: #f5f5f5;
  font-weight: bold;
}

.markdown-content a {
  color: #007acc;
  text-decoration: none;
}

.markdown-content a:hover {
  text-decoration: underline;
}

/* KaTeX数式のスタイリング */
.markdown-content .katex {
  font-size: 1.1em;
}

.markdown-content .katex-display {
  margin: 1em 0;
  text-align: center;
}

/* カスタムマクロ用のスタイル */
.markdown-content .reflectbox {
  display: inline-block;
  transform: scaleX(-1);
}

.markdown-content :deep(span[data-x-scale]) {
  position: relative;
  /* 大きなscalebox要素の幅制御 */
  max-width: 100%;
  overflow: visible;
  box-sizing: border-box;
}

/* 非常に大きなスケール（3倍以上）の場合の特別な制御 */
.markdown-content :deep(span[data-x-scale*="3"]),
.markdown-content :deep(span[data-x-scale*="4"]),
.markdown-content :deep(span[data-x-scale*="5"]),
.markdown-content :deep(span[data-x-scale*="6"]),
.markdown-content :deep(span[data-x-scale*="7"]),
.markdown-content :deep(span[data-x-scale*="8"]),
.markdown-content :deep(span[data-x-scale*="9"]),
.markdown-content :deep(span[data-x-scale="10"]) {
  display: block;
  width: fit-content;
  max-width: calc(100% - 32px); /* パディング考慮 */
  margin: 0.5em 0;
  text-align: center;
}

.markdown-content :deep(span[data-x-scale])::after {
  content: attr(data-x-scale) "×" attr(data-y-scale);
  position: absolute;
  top: -20px;
  left: 0;
  font-size: 10px;
  color: #666;
  background: rgba(255, 255, 255, 0.9);
  padding: 2px 4px;
  border-radius: 2px;
  border: 1px solid #ddd;
  z-index: 1000;
  pointer-events: none;
}

/* アクティブ回転アニメーション */
.markdown-content :deep(.active-rotate) {
  display: inline-block !important;
  transform-origin: center !important;
  animation: activeRotate linear infinite;
  /* 360度を角速度の絶対値で割って1回転の時間を計算 */
  animation-duration: calc(360s / var(--angular-velocity-abs, 360));
  /* 負の値の場合は逆方向に回転 */
  animation-direction: var(--animation-direction, normal);
}

@keyframes activeRotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* エラー表示 */
.no-content {
  color: #999;
  font-style: italic;
  text-align: center;
  padding: 2em;
}

.error {
  color: #d32f2f;
  background: #ffe6e6;
  padding: 1em;
  border-radius: 5px;
  border: 1px solid #d32f2f;
}
</style>
