import { ref, type Ref } from 'vue';
import uiStringsData from '@/constants/uiStrings.json';

interface UIStrings {
  app: {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    repository: string;
  };
  modals: {
    about: {
      title: string;
      appName: string;
      description: string;
      version: string;
      author: string;
      license: string;
      repository: string;
      electron: string;
      node: string;
      os: string;
      architecture: string;
      buttons: {
        close: string;
        viewLicense: string;
      };
    };
    license: {
      title: string;
      close: string;
    };
  };
  sidebar: {
    title: string;
    panels: {
      files: string;
      search: string;
      recent: string;
      settings: string;
    };
  };
  [key: string]: unknown;
}

const uiStrings: Ref<UIStrings> = ref(uiStringsData as UIStrings);

export function useUIStrings(): Ref<UIStrings> {
  return uiStrings;
}

export function getUIString(path: string): string {
  const keys = path.split('.');
  let value: unknown = uiStrings.value;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as Record<string, unknown>)[key];
    } else {
      return path; // フォールバック：パスをそのまま返す
    }
  }
  
  // テンプレート文字列の置換
  if (typeof value === 'string' && value.includes('{{')) {
    return value.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      return getUIString(path.trim());
    });
  }
  
  return typeof value === 'string' ? value : path;
}
