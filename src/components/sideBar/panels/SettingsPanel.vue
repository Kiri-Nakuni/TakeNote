<template>
  <div class="settings-panel">
    <div class="panel-header">
      <h4>設定</h4>
    </div>

    <div class="settings-content">
      <SettingsFormGroups
        v-model="settings"
        :show-file-settings="true"
        :show-display-settings="true"
        :show-search-settings="true"
        :show-editor-details="false"
        :show-general-settings="false"
        :show-section-titles="true"
        :show-browse-button="true"
        @browse-directory="browseSaveDirectory"
      />

      <div class="settings-section">
        <h5>その他</h5>
        
        <div class="setting-item">
          <BaseButton 
            variant="ghost"
            size="small"
            @click="openDetailedSettings"
          >
            詳細設定...
          </BaseButton>
        </div>
      </div>
    </div>

    <SettingsActions
      :has-changes="hasChanges"
      :saving="saving"
      @save="saveSettings"
      @reset="resetSettings"
    />

    <!-- 詳細設定モーダル -->
    <ConfigViewer 
      :visible="showDetailedSettings"
      :config="settings"
      @close="showDetailedSettings = false"
      @config-updated="handleConfigUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import BaseButton from '@/components/common/buttons/BaseButton.vue';
import ConfigViewer from '@/components/ConfigViewer.vue';
import SettingsFormGroups from '@/components/common/settings/SettingsFormGroups.vue';
import SettingsActions from '@/components/common/settings/SettingsActions.vue';
import { useTheme } from '@/composables/useTheme';
import { useSettings } from '@/composables/useSettings';
import type { AppSettings } from '@/types/settings';

// 設定管理コンポーザブルを使用
const { settings, hasChanges, saving, loadSettings, saveSettings: composableSaveSettings, resetSettings: composableResetSettings, updateSettings } = useSettings();

// 詳細設定モーダル関連
const showDetailedSettings = ref(false);

// テーマ管理
const { saveTheme } = useTheme();

onMounted(async () => {
  console.log('SettingsPanel mounted, loading settings...');
  await loadSettings();
  console.log('Current settings after load:', settings.value);
});

// 設定変更の監視
watch(settings, () => {
  // 自動保存が無効の場合は間隔設定も無効にする
  if (!settings.value.editor.autoSave) {
    settings.value.editor.autoSaveInterval = 30; // デフォルト値
  }
}, { deep: true });

// テーマ変更の監視 - 保存時のみ適用するように変更
// watch(() => settings.value.editor.theme, (newTheme) => {
//   setTheme(newTheme as ThemeMode);
// });

async function saveSettings(): Promise<void> {
  // 1. まず設定を保存
  const saveResult = await composableSaveSettings();
  
  // 2. 保存に成功した場合のみテーマを適用
  if (saveResult) {
    await saveTheme();
  }
}

async function resetSettings(): Promise<void> {
  await composableResetSettings();
}

async function browseSaveDirectory(): Promise<void> {
  try {
    // TODO: ディレクトリ選択ダイアログを実装
    console.log('フォルダ選択ダイアログを開く');
  } catch (error) {
    console.error('フォルダ選択でエラーが発生しました:', error);
  }
}

// 詳細設定モーダル関連のメソッド
function openDetailedSettings(): void {
  showDetailedSettings.value = true;
}

function handleConfigUpdated(config: AppSettings): void {
  console.log('詳細設定が更新されました:', config);
  // 詳細設定から基本設定を更新
  updateSettings(config);
}
</script>

<style lang="scss" scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-color);
  color: var(--text-color);
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  background: var(--header-bg);
  
  h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-color);
  }
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--bg-color);
}

.settings-section {
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }

  h5 {
    margin: 0 0 12px 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-color);
    border-bottom: 1px solid var(--border-light);
    padding-bottom: 4px;
  }
}

.setting-item {
  margin-bottom: 12px;
}
</style>
