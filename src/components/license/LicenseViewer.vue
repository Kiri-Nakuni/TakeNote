<template>
  <BaseModal
    :visible="visible"
    :title="getUIString('modals.license.title')"
    :modal-class="'license-modal large'"
    @close="$emit('close')"
  >
    <div class="license-container">
      <div class="app-info">
        <h3>{{ getUIString('app.name') }}</h3>
        <p>{{ getUIString('modals.license.labels.version') }}: {{ getUIString('app.version') }}</p>
        <p>{{ getUIString('modals.license.appDescription') }}</p>
      </div>
      
      <div
        v-if="loading"
        class="loading"
      >
        {{ getUIString('common.loading') }}
      </div>
      
      <div
        v-else
        class="license-list"
      >
        <div 
          v-for="license in licenses" 
          :key="license.name"
          class="license-item"
        >
          <h4>{{ license.name }} v{{ license.version }}</h4>
          <p class="license-type">
            {{ getUIString('modals.license.labels.licenseType') }}: {{ license.licenseType }}
          </p>
          <p
            v-if="license.repository"
            class="license-url"
          >
            <a 
              :href="license.repository" 
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ license.repository }}
            </a>
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton
        variant="primary"
        @click="$emit('close')"
      >
        {{ getUIString('modals.license.close') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import BaseModal from '@/components/common/modals/BaseModal.vue';
import BaseButton from '@/components/common/buttons/BaseButton.vue';
import { getUIString } from '@/composables/useUIStrings';

interface Props {
  visible?: boolean;
}

interface License {
  name: string;
  version: string;
  licenseType: string;
  repository: string;
  licenseFile: string;
}

withDefaults(defineProps<Props>(), {
  visible: true
});

defineEmits<{
  (e: 'close'): void;
}>();

const licenses = ref<License[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const licenseData = await window.api.license.getPackageLicenses();
    licenses.value = licenseData;
  } catch (error) {
    console.error('Failed to load license information:', error);
  } finally {
    loading.value = false;
  }
});
</script>

<style lang="scss" scoped>
.license-viewer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.license-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--border-color, #ddd);
  background: var(--header-bg, #f8f9fa);

  h2 {
    margin: 0;
    color: var(--text-color, #333);
  }
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-color, #333);
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;

  &:hover {
    background: var(--hover-bg, #e9ecef);
  }
}

.license-content {
  background: var(--bg-color, white);
  border-radius: 8px;
  width: 90vw;
  max-width: 800px;
  height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-info {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color, #ddd);
  background: var(--secondary-bg, #f8f9fa);

  h3 {
    margin: 0 0 0.5rem 0;
    color: var(--primary-color, #007acc);
  }

  p {
    margin: 0.25rem 0;
    color: var(--text-muted, #666);
  }
}

.license-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--text-muted, #666);
}

.license-item {
  margin-bottom: 2rem;
  padding: 1rem;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  background: var(--item-bg, #fafafa);

  h4 {
    margin: 0 0 0.5rem 0;
    color: var(--primary-color, #007acc);
    font-size: 16px;
  }

  .license-type {
    margin: 0.25rem 0;
    font-weight: 500;
    color: var(--text-color, #333);
  }

  .license-url {
    margin: 0.5rem 0 1rem 0;

    a {
      color: var(--link-color, #007acc);
      text-decoration: none;
      font-size: 14px;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .license-text {
    pre {
      background: var(--code-bg, #f6f8fa);
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.4;
      color: var(--code-text, #333);
      white-space: pre-wrap;
      word-wrap: break-word;
      
      // ダークモード対応
      [data-theme="dark"] & {
        background: var(--code-bg-dark, #1e1e1e);
        color: var(--code-text-dark, #d4d4d4);
        border: 1px solid var(--border-color-dark, #404040);
      }
    }
  }
}

// ダークモード用の追加スタイル
[data-theme="dark"] .license-container {
  .app-info {
    background: var(--secondary-bg-dark, #2d2d2d);
    border-bottom-color: var(--border-color-dark, #404040);
    color: var(--text-color-dark, #e0e0e0);
    
    h3 {
      color: var(--text-color-dark, #e0e0e0);
    }
    
    p {
      color: var(--text-secondary-dark, #b0b0b0);
    }
  }
  
  .license-section {
    border-color: var(--border-color-dark, #404040);
    
    h4 {
      color: var(--text-color-dark, #e0e0e0);
    }
  }
  
  .license-item {
    border-color: var(--border-color-dark, #404040);
    background: var(--item-bg-dark, #2d2d2d);
  }
  
  .package-name {
    color: var(--primary-color-dark, #4fc3f7);
  }
  
  .license-type {
    color: var(--text-color-dark, #e0e0e0);
  }
  
  .license-url a {
    color: var(--link-color-dark, #4fc3f7);
    
    &:hover {
      color: var(--link-hover-dark, #81d4fa);
    }
  }
}
</style>
