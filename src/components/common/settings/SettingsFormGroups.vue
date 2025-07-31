<template>
  <div class="settings-form-groups">
    <!-- ファイル設定 -->
    <div
      v-if="showFileSettings"
      class="settings-section"
    >
      <h5
        v-if="showSectionTitles"
        class="section-title"
      >
        ファイル設定
      </h5>
      
      <div class="setting-item">
        <label class="setting-label">
          保存フォルダ
        </label>
        <div class="setting-input-group">
          <div 
            class="save-location-display"
            :class="{ 'is-default': !modelValue.files.defaultSaveLocation }"
          >
            {{ modelValue.files.defaultSaveLocation || '<デフォルト>' }}
          </div>
          <BaseButton 
            v-if="showBrowseButton"
            variant="secondary"
            size="small"
            @click="$emit('browse-directory')"
          >
            参照
          </BaseButton>
        </div>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input
            :checked="modelValue.editor.autoSave"
            type="checkbox"
            @change="updateAutoSave(($event.target as HTMLInputElement).checked)"
          >
          自動保存を有効にする
        </label>
      </div>

      <div 
        v-if="modelValue.editor.autoSave"
        class="setting-item sub-setting"
      >
        <label class="setting-label">
          自動保存間隔（秒）
        </label>
        <input
          :value="modelValue.editor.autoSaveInterval"
          type="number"
          min="10"
          max="300"
          class="setting-input small"
          @input="updateAutoSaveInterval(parseInt(($event.target as HTMLInputElement).value))"
        >
      </div>

      <div class="setting-item">
        <label class="setting-label">
          最近のファイル履歴保持数
        </label>
        <input
          :value="modelValue.files.maxRecentFiles"
          type="number"
          min="5"
          max="50"
          class="setting-input small"
          @input="updateMaxRecentFiles(parseInt(($event.target as HTMLInputElement).value))"
        >
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input
            :checked="modelValue.files.confirmDelete"
            type="checkbox"
            @change="updateConfirmDelete(($event.target as HTMLInputElement).checked)"
          >
          ファイル削除時に確認
        </label>
      </div>
    </div>

    <!-- 表示設定 -->
    <div
      v-if="showDisplaySettings"
      class="settings-section"
    >
      <h5
        v-if="showSectionTitles"
        class="section-title"
      >
        表示設定
      </h5>
      
      <div class="setting-item">
        <label class="setting-label">
          テーマ
        </label>
        <select 
          :value="modelValue.editor.theme"
          class="setting-select"
          @change="updateTheme(($event.target as HTMLSelectElement).value)"
        >
          <option value="light">
            ライト
          </option>
          <option value="dark">
            ダーク
          </option>
          <option value="auto">
            システムに従う
          </option>
        </select>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          フォントサイズ
        </label>
        <select 
          :value="modelValue.display.fontSizeLevel"
          class="setting-select"
          @change="updateFontSizeLevel(($event.target as HTMLSelectElement).value)"
        >
          <option value="small">
            小
          </option>
          <option value="medium">
            中（デフォルト）
          </option>
          <option value="large">
            大
          </option>
        </select>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input
            :checked="modelValue.display.showLineNumbers"
            type="checkbox"
            @change="updateShowLineNumbers(($event.target as HTMLInputElement).checked)"
          >
          行番号を表示
        </label>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input
            :checked="modelValue.editor.wordWrap"
            type="checkbox"
            @change="updateWordWrap(($event.target as HTMLInputElement).checked)"
          >
          テキストの折り返し
        </label>
      </div>
    </div>

    <!-- 検索設定 -->
    <div
      v-if="showSearchSettings"
      class="settings-section"
    >
      <h5
        v-if="showSectionTitles"
        class="section-title"
      >
        検索設定
      </h5>
      
      <div class="setting-item">
        <label class="setting-label">
          最大検索結果数
        </label>
        <input
          :value="modelValue.search.maxSearchResults"
          type="number"
          min="10"
          max="1000"
          class="setting-input small"
          @input="updateMaxSearchResults(parseInt(($event.target as HTMLInputElement).value))"
        >
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input
            :checked="modelValue.search.searchHighlight"
            type="checkbox"
            @change="updateSearchHighlight(($event.target as HTMLInputElement).checked)"
          >
          検索結果をハイライト
        </label>
      </div>
    </div>

    <!-- エディタ詳細設定（ConfigViewer専用） -->
    <div
      v-if="showEditorDetails"
      class="settings-section"
    >
      <h5
        v-if="showSectionTitles"
        class="section-title"
      >
        エディタ詳細設定
      </h5>

      <div class="setting-item">
        <label class="setting-label">
          フォントファミリー
        </label>
        <input
          :value="modelValue.editor.fontFamily"
          type="text"
          class="setting-input"
          placeholder="例: Consolas, monospace"
          @input="updateFontFamily(($event.target as HTMLInputElement).value)"
        >
      </div>
    </div>

    <!-- 一般設定（ConfigViewer専用） -->
    <div
      v-if="showGeneralSettings"
      class="settings-section"
    >
      <h5
        v-if="showSectionTitles"
        class="section-title"
      >
        一般設定
      </h5>
      
      <div class="setting-item">
        <label class="setting-label">
          <input
            :checked="modelValue.general.checkUpdates"
            type="checkbox"
            @change="updateCheckUpdates(($event.target as HTMLInputElement).checked)"
          >
          起動時にアップデートを確認
        </label>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          <input
            :checked="modelValue.general.telemetry"
            type="checkbox"
            @change="updateTelemetry(($event.target as HTMLInputElement).checked)"
          >
          匿名使用統計の送信を許可
        </label>
      </div>

      <div class="setting-item">
        <label class="setting-label">
          セキュリティモード
        </label>
        <select 
          :value="modelValue.general.securityMode"
          class="setting-select"
          @change="updateSecurityMode(($event.target as HTMLSelectElement).value)"
        >
          <option value="secure">
            セキュアモード（推奨）
          </option>
          <option value="developer">
            デベロッパーモード（WASM実行許可）
          </option>
        </select>
        <p class="form-hint">
          デベロッパーモードでは、高度な機能のためのWASM実行が有効になります。<br>
          一般的な編集作業にはセキュアモードをお使いください。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/common/buttons/BaseButton.vue';
import type { AppSettings } from '@/types/settings';

interface Props {
  modelValue: AppSettings;
  showFileSettings?: boolean;
  showDisplaySettings?: boolean;
  showSearchSettings?: boolean;
  showEditorDetails?: boolean;
  showGeneralSettings?: boolean;
  showSectionTitles?: boolean;
  showBrowseButton?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: AppSettings): void;
  (e: 'browse-directory'): void;
}

const props = withDefaults(defineProps<Props>(), {
  showFileSettings: true,
  showDisplaySettings: true,
  showSearchSettings: true,
  showEditorDetails: false,
  showGeneralSettings: false,
  showSectionTitles: true,
  showBrowseButton: true,
});

const emit = defineEmits<Emits>();

// 更新用のヘルパー関数
function updateSettings(updates: {
  editor?: Partial<AppSettings['editor']>;
  files?: Partial<AppSettings['files']>;
  display?: Partial<AppSettings['display']>;
  search?: Partial<AppSettings['search']>;
  general?: Partial<AppSettings['general']>;
}): void {
  const newValue = {
    ...props.modelValue,
    editor: {
      ...props.modelValue.editor,
      ...updates.editor,
    },
    files: {
      ...props.modelValue.files,
      ...updates.files,
    },
    display: {
      ...props.modelValue.display,
      ...updates.display,
    },
    search: {
      ...props.modelValue.search,
      ...updates.search,
    },
    general: {
      ...props.modelValue.general,
      ...updates.general,
    },
  };
  emit('update:modelValue', newValue);
}

// ファイル設定
function updateAutoSave(value: boolean): void {
  updateSettings({ editor: { autoSave: value } });
}

function updateAutoSaveInterval(value: number): void {
  updateSettings({ editor: { autoSaveInterval: value } });
}

function updateMaxRecentFiles(value: number): void {
  updateSettings({ files: { maxRecentFiles: value } });
}

function updateConfirmDelete(value: boolean): void {
  updateSettings({ files: { confirmDelete: value } });
}

// 表示設定
function updateTheme(value: string): void {
  updateSettings({ editor: { theme: value as 'light' | 'dark' | 'auto' } });
}

function updateFontSizeLevel(value: string): void {
  updateSettings({ display: { fontSizeLevel: value as 'small' | 'medium' | 'large' } });
}

function updateShowLineNumbers(value: boolean): void {
  updateSettings({ display: { showLineNumbers: value } });
}

function updateWordWrap(value: boolean): void {
  updateSettings({ editor: { wordWrap: value } });
}

// 検索設定
function updateMaxSearchResults(value: number): void {
  updateSettings({ search: { maxSearchResults: value } });
}

function updateSearchHighlight(value: boolean): void {
  updateSettings({ search: { searchHighlight: value } });
}

// エディタ詳細設定
function updateFontFamily(value: string): void {
  updateSettings({ editor: { fontFamily: value } });
}

// 一般設定
function updateCheckUpdates(value: boolean): void {
  updateSettings({ general: { checkUpdates: value } });
}

function updateTelemetry(value: boolean): void {
  updateSettings({ general: { telemetry: value } });
}

function updateSecurityMode(value: string): void {
  updateSettings({ general: { securityMode: value as 'secure' | 'developer' } });
}
</script>

<style lang="scss" scoped>
.settings-form-groups {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-section {
  .section-title {
    margin: 0 0 12px 0;
    font-size: var(--app-font-size-small);
    font-weight: 600;
    color: var(--text-color);
    border-bottom: 1px solid var(--border-light);
    padding-bottom: 4px;
  }
}

.setting-item {
  margin-bottom: 12px;

  &.sub-setting {
    margin-left: 20px;
    margin-top: 8px;
  }
}

.setting-label {
  display: block;
  font-size: var(--app-font-size-small);
  color: var(--text-color);
  margin-bottom: 4px;
  cursor: pointer;

  input[type="checkbox"] {
    margin-right: 8px;
    margin-bottom: 0;
    accent-color: var(--primary-color);
  }
}

.setting-input-group {
  display: flex;
  gap: 4px;
}

.setting-input {
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: var(--app-font-size-small);
  outline: none;
  background: var(--input-bg);
  color: var(--text-color);

  &:focus {
    border-color: var(--focus-color);
    box-shadow: 0 0 0 2px var(--primary-alpha);
  }

  &.small {
    width: 80px;
  }

  &:not(.small) {
    flex: 1;
  }
}

.setting-select {
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: var(--app-font-size-small);
  background: var(--input-bg);
  color: var(--text-color);
  outline: none;
  width: 100%;

  &:focus {
    border-color: var(--focus-color);
    box-shadow: 0 0 0 2px var(--primary-alpha);
  }

  option {
    background: var(--input-bg);
    color: var(--text-color);
  }
}

.save-location-display {
  padding: 6px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  background: var(--input-bg);
  color: var(--text-color);
  min-height: 20px;
  flex: 1;
  
  &.is-default {
    color: var(--text-muted, #999);
    font-style: italic;
  }
}

.form-hint {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted, #666);
  line-height: 1.4;
}

.font-size-control {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .unit {
    font-size: 12px;
    color: var(--text-muted, #666);
  }
}
</style>
