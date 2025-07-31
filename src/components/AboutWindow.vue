<template>
  <BaseModal
    :visible="isVisible"
    :title="getUIString('modals.about.title')"
    size="medium"
    :modal-class="'about-modal'"
    @close="$emit('close')"
  >
    <div class="about-container">
      <div class="app-info">
        <div class="app-icon">
          <div class="icon-placeholder">
            📝
          </div>
        </div>
        <h3 class="app-name">
          {{ getUIString('app.name') }}
        </h3>
        <p class="app-version">
          {{ getUIString('modals.about.version') }} {{ getUIString('app.version') }}
        </p>
        <p class="app-description">
          {{ getUIString('app.description') }}
        </p>
      </div>
      
      <div class="system-info">
        <h4>{{ getUIString('modals.about.systemInfo') }}</h4>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">{{ getUIString('modals.about.electron') }}:</span>
            <span class="info-value">{{ systemVersions.electron }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ getUIString('modals.about.node') }}:</span>
            <span class="info-value">{{ systemVersions.node }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ getUIString('modals.about.vite') }}:</span>
            <span class="info-value">{{ systemVersions.vite }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <BaseButton
        variant="secondary"
        @click="$emit('close')"
      >
        {{ getUIString('modals.about.buttons.close') }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, onMounted, defineEmits, defineProps } from 'vue'
import BaseModal from '@/components/common/modals/BaseModal.vue'
import BaseButton from '@/components/common/buttons/BaseButton.vue'
import { getUIString } from '@/composables/useUIStrings'

interface Props {
  isVisible: boolean
}

defineProps<Props>()
defineEmits<{
  close: []
}>()

const systemVersions = ref({
  electron: '',
  node: '',
  vite: ''
})

onMounted(async () => {
  try {
    const versions = await window.api.system.getVersions()
    systemVersions.value = versions
  } catch (error) {
    console.error('Failed to get system versions:', error)
  }
})
</script>

<style scoped>
.about-container {
  padding: 1.5rem;
  min-height: 400px;
}

.app-info {
  text-align: center;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
}

.app-icon {
  margin-bottom: 1rem;
}

.icon-placeholder {
  font-size: 3rem;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  background: linear-gradient(135deg, var(--primary-color), var(--accent-color));
  border-radius: 20px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.app-name {
  margin: 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-color-primary);
}

.app-version {
  margin: 0.5rem 0;
  font-size: 1rem;
  color: var(--text-color-secondary);
  font-weight: 500;
}

.app-description {
  margin: 0.5rem 0;
  color: var(--text-color-secondary);
  line-height: 1.5;
}

.system-info h4 {
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-color-primary);
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: var(--background-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.info-label {
  font-weight: 500;
  color: var(--text-color-secondary);
}

.info-value {
  font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
  font-size: 0.875rem;
  color: var(--text-color-primary);
  background: var(--background-primary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid var(--border-color-light);
}

/* ダークテーマ対応 */
@media (prefers-color-scheme: dark) {
  .icon-placeholder {
    background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  }
}
</style>
