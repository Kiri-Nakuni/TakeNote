<template>
  <div class="search-panel">
    <div class="panel-header">
      <h4>{{ getUIString('sidebar.panels.search') }}</h4>
    </div>

    <div class="search-form">
      <div class="search-input-group">
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="getUIString('sidebar.search.placeholder')"
          class="search-input"
          @keyup.enter="performSearch"
        >
        <BaseButton 
          :disabled="!searchQuery.trim()"
          size="small"
          icon="🔍"
          :title="getUIString('sidebar.search.searchButton')"
          @click="performSearch"
        />
      </div>
      
      <div class="search-options">
        <label class="option-label">
          <input
            v-model="searchOptions.caseSensitive"
            type="checkbox"
          >
          {{ getUIString('sidebar.search.caseSensitive') }}
        </label>
        <label class="option-label">
          <input
            v-model="searchOptions.wholeWord"
            type="checkbox"
          >
          {{ getUIString('sidebar.search.wholeWord') }}
        </label>
        <label class="option-label">
          <input
            v-model="searchOptions.useRegex"
            type="checkbox"
          >
          {{ getUIString('sidebar.search.useRegex') }}
        </label>
      </div>
    </div>

    <div class="search-results">
      <div 
        v-if="searching" 
        class="searching"
      >
        {{ getUIString('common.loading') }}
      </div>
      
      <div 
        v-else-if="searchResults.length === 0 && hasSearched" 
        class="no-results"
      >
        {{ getUIString('sidebar.search.noResults') }}
      </div>

      <div 
        v-else-if="searchResults.length > 0" 
        class="results-list"
      >
        <div class="results-header">
          {{ getUIString('sidebar.search.resultsHeader') }}: {{ searchResults.length }}件
        </div>
        
        <div 
          v-for="result in searchResults" 
          :key="`${result.filePath}-${result.lineNumber}`"
          class="result-item"
          @click="openSearchResult(result)"
        >
          <div class="result-file">
            📋 {{ result.fileName }}
          </div>
          <div class="result-line">
            {{ getUIString('sidebar.search.linePrefix') }} {{ result.lineNumber }}: {{ result.content }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import BaseButton from '@/components/common/buttons/BaseButton.vue';
import { getUIString } from '@/composables/useUIStrings';

interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
}

interface SearchResult {
  filePath: string;
  fileName: string;
  lineNumber: number;
  content: string;
  matchPosition: {
    start: number;
    end: number;
  };
}

interface WindowSearchApi {
  file: {
    listNotesDirectory: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
    read: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
  };
}

interface Emits {
  (e: 'search-result', result: SearchResult): void;
}

const emit = defineEmits<Emits>();

const searchQuery = ref('');
const searching = ref(false);
const hasSearched = ref(false);
const searchResults = ref<SearchResult[]>([]);

const searchOptions = ref<SearchOptions>({
  caseSensitive: false,
  wholeWord: false,
  useRegex: false
});

async function performSearch(): Promise<void> {
  if (!searchQuery.value.trim()) {
    return;
  }

  try {
    searching.value = true;
    hasSearched.value = true;
    searchResults.value = [];

    const windowApi = (window as unknown as { api: WindowSearchApi }).api;
    
    // Notesディレクトリのファイル一覧を取得
    const filesResult = await windowApi.file.listNotesDirectory();
    if (!filesResult.success || !filesResult.data) {
      console.error('Failed to list files:', filesResult.error);
      return;
    }

    const files = filesResult.data as Array<{ path: string; name: string }>;
    const results: SearchResult[] = [];

    // 各ファイルを検索
    for (const file of files) {
      try {
        const readResult = await windowApi.file.read(file.path);
        if (!readResult.success || !readResult.data) {
          continue;
        }

        const content = readResult.data;
        const lines = content.split('\n');

        // 検索オプションに基づいて検索パターンを作成
        let searchPattern: RegExp;
        if (searchOptions.value.useRegex) {
          try {
            const flags = searchOptions.value.caseSensitive ? 'g' : 'gi';
            searchPattern = new RegExp(searchQuery.value, flags);
          } catch (error) {
            console.error('Invalid regex pattern:', error);
            continue;
          }
        } else {
          let pattern = searchQuery.value;
          if (!searchOptions.value.caseSensitive) {
            pattern = pattern.toLowerCase();
          }
          if (searchOptions.value.wholeWord) {
            pattern = `\\b${pattern}\\b`;
          }
          const flags = searchOptions.value.caseSensitive ? 'g' : 'gi';
          searchPattern = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
        }

        // 各行を検索
        lines.forEach((line, index) => {
          const matches = [...line.matchAll(searchPattern)];
          
          matches.forEach(match => {
            if (match.index !== undefined) {
              results.push({
                filePath: file.path,
                fileName: file.name,
                lineNumber: index + 1,
                content: line.trim(),
                matchPosition: {
                  start: match.index,
                  end: match.index + match[0].length
                }
              });
            }
          });
        });
      } catch (error) {
        console.error(`Error searching file ${file.path}:`, error);
      }
    }

    searchResults.value = results;
  } catch (error) {
    console.error('検索処理でエラーが発生しました:', error);
  } finally {
    searching.value = false;
  }
}

function openSearchResult(result: SearchResult): void {
  emit('search-result', result);
}
</script>

<style lang="scss" scoped>
.search-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--sidebar-bg);
  color: var(--text-color);
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--header-bg);
  
  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-color);
  }
}

.search-form {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--sidebar-bg);
}

.search-input-group {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  background-color: var(--input-bg);
  color: var(--text-color);
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-color-alpha);
  }

  &::placeholder {
    color: var(--text-muted);
  }
}

.search-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-color);
  background: var(--bg-color);
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s ease;
  color: var(--text-color);

  &:hover:not(:disabled) {
    background: var(--hover-bg);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.search-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-color);
  cursor: pointer;

  input[type="checkbox"] {
    margin: 0;
    accent-color: var(--accent-color);
  }

  &:hover {
    color: var(--accent-color);
  }
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  background-color: var(--sidebar-bg);
}

.searching,
.no-results {
  text-align: center;
  padding: 20px;
  color: var(--text-muted);
  font-size: 13px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.results-header {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border-color);
  margin-bottom: 8px;
  background-color: var(--header-bg);
  border-radius: 4px;
}

.result-item {
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-color);

  &:hover {
    background: var(--hover-bg);
  }
}

.result-file {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.result-line {
  font-size: 13px;
  color: var(--text-color);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
