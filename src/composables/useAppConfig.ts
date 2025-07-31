import { ref, computed, type ComputedRef } from 'vue';

export interface AppConfig {
  layout: {
    sidebar: { visible: boolean };
    editor: { visible: boolean };
    preview: { visible: boolean };
    resizable: { enabled: boolean };
  };
  editor: {
    syntax: { highlighting: boolean };
    line: { numbers: boolean };
    word: { wrap: boolean };
    font: { size: number; family: string };
  };
  theme: {
    current: string;
    dark: string;
  };
  window: {
    width: number;
    height: number;
    maximized: boolean;
  };
}

const config = ref<AppConfig | null>(null);

export interface UseAppConfigReturn {
  config: ComputedRef<AppConfig | null>;
  isLoaded: ComputedRef<boolean>;
  sidebarVisible: ComputedRef<boolean>;
  editorVisible: ComputedRef<boolean>;
  previewVisible: ComputedRef<boolean>;
  resizableEnabled: ComputedRef<boolean>;
  syntaxHighlighting: ComputedRef<boolean>;
  lineNumbers: ComputedRef<boolean>;
  wordWrap: ComputedRef<boolean>;
  currentTheme: ComputedRef<string>;
  loadConfig: () => Promise<void>;
  updateConfig: (updates: Partial<AppConfig>) => Promise<void>;
  toggleSidebar: () => Promise<void>;
  togglePreview: () => Promise<void>;
  toggleResizable: () => Promise<void>;
  hideEditor: () => Promise<void>;
  showEditor: () => Promise<void>;
}

export function useAppConfig(): UseAppConfigReturn {
  const isLoaded = computed(() => config.value !== null);
  
  const sidebarVisible = computed(() => config.value?.layout.sidebar.visible ?? true);
  const editorVisible = computed(() => config.value?.layout.editor.visible ?? true);
  const previewVisible = computed(() => config.value?.layout.preview.visible ?? true);
  const resizableEnabled = computed(() => config.value?.layout.resizable.enabled ?? false);
  
  const syntaxHighlighting = computed(() => config.value?.editor.syntax.highlighting ?? true);
  const lineNumbers = computed(() => config.value?.editor.line.numbers ?? true);
  const wordWrap = computed(() => config.value?.editor.word.wrap ?? true);
  
  const currentTheme = computed(() => config.value?.theme.current ?? 'github-light');

  const loadConfig = async (): Promise<void> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).electron.ipcRenderer.invoke('config:get');
      config.value = result;
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  };

  const updateConfig = async (updates: Partial<AppConfig>): Promise<void> => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (window as any).electron.ipcRenderer.invoke('config:update', updates);
      config.value = result;
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  const toggleSidebar = async (): Promise<void> => {
    if (!config.value) return;
    await updateConfig({
      layout: {
        ...config.value.layout,
        sidebar: { visible: !config.value.layout.sidebar.visible }
      }
    });
  };

  const togglePreview = async (): Promise<void> => {
    if (!config.value) return;
    await updateConfig({
      layout: {
        ...config.value.layout,
        preview: { visible: !config.value.layout.preview.visible }
      }
    });
  };

  const toggleResizable = async (): Promise<void> => {
    if (!config.value) return;
    await updateConfig({
      layout: {
        ...config.value.layout,
        resizable: { enabled: !config.value.layout.resizable.enabled }
      }
    });
  };

  const hideEditor = async (): Promise<void> => {
    if (!config.value) return;
    await updateConfig({
      layout: {
        ...config.value.layout,
        editor: { visible: false }
      }
    });
  };

  const showEditor = async (): Promise<void> => {
    if (!config.value) return;
    await updateConfig({
      layout: {
        ...config.value.layout,
        editor: { visible: true }
      }
    });
  };

  return {
    config: computed(() => config.value),
    isLoaded,
    sidebarVisible,
    editorVisible,
    previewVisible,
    resizableEnabled,
    syntaxHighlighting,
    lineNumbers,
    wordWrap,
    currentTheme,
    loadConfig,
    updateConfig,
    toggleSidebar,
    togglePreview,
    toggleResizable,
    hideEditor,
    showEditor
  };
}
