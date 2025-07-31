<template>
  <BaseModal
    :visible="isOpen"
    :title="uiStrings.modals.about.title"
    @close="handleClose"
  >
    <div class="about-content">
      <div class="app-icon">
        {{ appName.charAt(0) }}
      </div>
      <div class="app-name">
        {{ appName }}
      </div>
      <div class="app-version">
        {{ uiStrings.modals.about.version }} {{ appVersion }}
      </div>
      <div class="app-description">
        {{ appDescription }}
      </div>
      
      <div class="system-info">
        <div class="info-item">
          <span class="label">{{ uiStrings.modals.about.electron }}:</span>
          <span class="value">{{ electronVersion }}</span>
        </div>
        <div class="info-item">
          <span class="label">{{ uiStrings.modals.about.node }}:</span>
          <span class="value">{{ nodeVersion }}</span>
        </div>
        <div class="info-item">
          <span class="label">Chrome:</span>
          <span class="value">{{ chromeVersion }}</span>
        </div>
        <div class="info-item">
          <span class="label">{{ uiStrings.modals.about.author }}:</span>
          <span class="value">{{ appAuthor }}</span>
        </div>
        <div class="info-item">
          <span class="label">{{ uiStrings.modals.about.license }}:</span>
          <span class="value">{{ appLicense }}</span>
        </div>
      </div>
      
      <div class="action-buttons">
        <button 
          class="license-button"
          @click="handleViewLicense"
        >
          {{ uiStrings.modals.about.buttons.viewLicense }}
        </button>
        <button 
          class="close-button"
          @click="handleClose"
        >
          {{ uiStrings.modals.about.buttons.close }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import BaseModal from '@/components/common/modals/BaseModal.vue';
import { useUIStrings } from '@/composables/useUIStrings';

interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'view-license'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const uiStrings = useUIStrings();

// システム情報
const electronVersion = ref('');
const nodeVersion = ref('');
const chromeVersion = ref('');
const appVersion = ref('');

// アプリケーション情報（uiStringsから取得）
const appName = computed(() => uiStrings.value.app.name);
const appDescription = computed(() => uiStrings.value.app.description);
const appAuthor = computed(() => uiStrings.value.app.author);
const appLicense = computed(() => uiStrings.value.app.license);

onMounted(async () => {
  // システム情報を取得
  if (window.api?.system) {
    try {
      const systemInfo = await window.api.system.getVersions();
      electronVersion.value = systemInfo.electron;
      nodeVersion.value = systemInfo.node;
      chromeVersion.value = systemInfo.chrome;
      appVersion.value = systemInfo.app;
    } catch (error) {
      console.error('Failed to get system info:', error);
      // フォールバック
      electronVersion.value = 'Unknown';
      nodeVersion.value = 'Unknown';
      chromeVersion.value = 'Unknown';
      appVersion.value = uiStrings.value.app.version;
    }
  } else {
    // フォールバック
    appVersion.value = uiStrings.value.app.version;
  }
});

function handleClose(): void {
  emit('close');
}

function handleViewLicense(): void {
  emit('view-license');
}
</script>

<style lang="scss" scoped>
.about-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  min-width: 300px;
}

.app-icon {
  width: 64px;
  height: 64px;
  background: var(--primary-color);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 16px;
}

.app-name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-color);
}

.app-version {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.app-description {
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
  line-height: 1.4;
  margin-bottom: 20px;
}

.system-info {
  width: 100%;
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  padding: 2px 0;
  
  .label {
    font-weight: 500;
  }
  
  .value {
    font-family: var(--font-family-mono);
    color: var(--text-color);
  }
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.license-button,
.close-button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;
}

.license-button {
  background: var(--bg-secondary);
  color: var(--text-color);
  border: 1px solid var(--border-color);
  
  &:hover {
    background: var(--hover-bg);
  }
}

.close-button {
  background: var(--primary-color);
  color: white;
  
  &:hover {
    background: var(--primary-color-hover);
  }
}
</style>
