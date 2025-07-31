<template>
  <BaseModal
    :visible="visible"
    :title="uiStrings.getString('config.title', 'Configuration')"
    :modal-class="'config-modal'"
    @close="$emit('close')"
  >
    <div class="config-container">
      <div class="config-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="{ active: activeTab === tab.id }"
          class="tab-button"
          @click="activeTab = tab.id"
        >
          {{ uiStrings.getString(`config.tabs.${tab.id}`, tab.label) }}
        </button>
      </div>

      <div class="config-panel">
        <!-- エディタ設定 -->
        <div
          v-if="activeTab === 'editor'"
          class="config-section"
        >
          <h3>エディタ設定</h3>
          
          <SettingsFormGroups
            v-model="localConfig"
            :show-file-settings="false"
            :show-display-settings="true"
            :show-search-settings="false"
            :show-editor-details="true"
            :show-general-settings="false"
            :show-section-titles="false"
            :show-browse-button="false"
          />
        </div>

        <!-- ファイル設定 -->
        <div
          v-if="activeTab === 'files'"
          class="config-section"
        >
          <h3>ファイル設定</h3>
          
          <SettingsFormGroups
            v-model="localConfig"
            :show-file-settings="true"
            :show-display-settings="false"
            :show-search-settings="false"
            :show-editor-details="false"
            :show-general-settings="false"
            :show-section-titles="false"
            :show-browse-button="false"
          />
        </div>

        <!-- 一般設定 -->
        <div
          v-if="activeTab === 'general'"
          class="config-section"
        >
          <h3>設定</h3>
          
          <SettingsFormGroups
            v-model="localConfig"
            :show-file-settings="false"
            :show-display-settings="false"
            :show-search-settings="true"
            :show-editor-details="false"
            :show-general-settings="true"
            :show-section-titles="true"
            :show-browse-button="false"
          />
        </div>
      </div>
    </div>

    <template #footer>
      <SettingsActions
        :has-changes="true"
        :saving="saving"
        :show-cancel="true"
        :modal-mode="true"
        reset-text="リセット"
        save-text="保存"
        @save="saveConfig"
        @reset="resetConfig"
        @cancel="$emit('close')"
      />
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import BaseModal from '@/components/common/modals/BaseModal.vue';
import SettingsFormGroups from '@/components/common/settings/SettingsFormGroups.vue';
import SettingsActions from '@/components/common/settings/SettingsActions.vue';
import UIStringManager from '@/utils/uiStringManager';
import { useSettings } from '@/composables/useSettings';
import type { AppSettings } from '@/types/settings';

// UI文字列管理
const uiStrings = UIStringManager.getInstance();

interface Props {
  visible: boolean;
  config?: AppSettings;
}

interface Emits {
  (e: 'close'): void;
  (e: 'config-updated', config: AppSettings): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 設定管理コンポーザブルを使用
const { settings: localConfig, saving, saveSettings: composableSaveSettings, resetSettings: composableResetSettings, initializeSettings } = useSettings();

const activeTab = ref('editor');

const tabs = [
  { id: 'editor', label: 'エディタ' },
  { id: 'files', label: 'ファイル' },
  { id: 'general', label: '設定' }
];

// propsが変更されたらローカル設定を更新
watch(() => props.config, (newConfig) => {
  if (newConfig) {
    initializeSettings(newConfig);
  }
}, { immediate: true });

// コンポーネント表示時に設定を初期化
onMounted(async () => {
  if (props.visible && props.config) {
    initializeSettings(props.config);
  }
});

async function saveConfig(): Promise<void> {
  const success = await composableSaveSettings();
  if (success) {
    emit('config-updated', localConfig.value);
    // 成功メッセージ表示後に少し待ってから閉じる
    setTimeout(() => {
      emit('close');
    }, 1500);
  }
}

async function resetConfig(): Promise<void> {
  await composableResetSettings();
}
</script>

<style lang="scss" scoped>
.config-container {
  display: flex;
  flex-direction: column;
  height: 500px;
}

.config-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-color, #ddd);
  margin-bottom: 20px;
}

.tab-button {
  padding: 12px 24px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 14px;
  color: var(--text-muted, #666);
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--text-color, #333);
    background: var(--hover-bg, #f8f9fa);
  }
  
  &.active {
    color: var(--primary-color, #007acc);
    border-bottom-color: var(--primary-color, #007acc);
  }
}

.config-panel {
  flex: 1;
  overflow-y: auto;
}

.config-section {
  h3 {
    margin: 0 0 20px 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-color, #333);
  }
}
</style>
