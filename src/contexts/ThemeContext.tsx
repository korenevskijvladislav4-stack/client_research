import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConfigProvider, theme as antTheme, ThemeConfig } from 'antd';
import ruRU from 'antd/locale/ru_RU';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'research-crm-theme';

// Dark theme configuration
const darkTheme: ThemeConfig = {
  algorithm: antTheme.darkAlgorithm,
  token: {
    colorPrimary: '#818cf8',
    colorSuccess: '#34d399',
    colorWarning: '#fbbf24',
    colorError: '#f87171',
    colorInfo: '#60a5fa',
    borderRadius: 8,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    lineHeight: 1.5,
    colorBgLayout: '#0a0e27',
    colorBgContainer: '#1a1f3a',
    colorBgElevated: '#252b47',
    colorBorder: '#2d3555',
    colorBorderSecondary: '#1f2640',
    colorText: '#e2e8f0',
    colorTextSecondary: '#94a3b8',
    colorTextTertiary: '#64748b',
    colorFill: 'rgba(129, 140, 248, 0.1)',
    colorFillSecondary: 'rgba(129, 140, 248, 0.05)',
  },
  components: {
    Layout: {
      bodyBg: '#0a0e27',
      headerBg: '#0a0e27',
      siderBg: '#0f1629',
    },
    Card: {
      colorBgContainer: '#1a1f3a',
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    },
    Button: {
      borderRadius: 8,
      fontWeight: 500,
      controlHeight: 36,
    },
    Input: {
      borderRadius: 8,
      colorBgContainer: '#1a1f3a',
      colorBorder: '#2d3555',
      activeBorderColor: '#818cf8',
      hoverBorderColor: '#3d4566',
    },
    Select: {
      colorBgContainer: '#1a1f3a',
      colorBorder: '#2d3555',
      optionSelectedBg: 'rgba(129, 140, 248, 0.15)',
    },
    Table: {
      borderRadius: 12,
      colorBgContainer: '#1a1f3a',
      headerBg: '#252b47',
      headerColor: '#e2e8f0',
      rowHoverBg: 'rgba(129, 140, 248, 0.08)',
      borderColor: '#2d3555',
    },
    Menu: {
      itemBorderRadius: 8,
      itemMarginInline: 4,
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'rgba(0, 0, 0, 0.3)',
      itemSelectedBg: 'rgba(129, 140, 248, 0.15)',
      itemHoverBg: 'rgba(129, 140, 248, 0.08)',
      itemActiveBg: 'rgba(129, 140, 248, 0.2)',
      itemSelectedColor: '#818cf8',
    },
    Modal: {
      contentBg: '#1a1f3a',
      headerBg: '#1a1f3a',
      titleColor: '#e2e8f0',
      colorText: '#e2e8f0',
    },
    Drawer: {
      colorBgElevated: '#1a1f3a',
      colorText: '#e2e8f0',
    },
    Tooltip: {
      colorBgSpotlight: '#252b47',
      colorTextLightSolid: '#e2e8f0',
    },
    Divider: {
      colorSplit: '#2d3555',
    },
    Tag: {
      borderRadius: 6,
    },
  },
};

// Light theme configuration
const lightTheme: ThemeConfig = {
  algorithm: antTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#6366f1',
    colorSuccess: '#22c55e',
    colorWarning: '#eab308',
    colorError: '#ef4444',
    colorInfo: '#0ea5e9',
    borderRadius: 6,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    lineHeight: 1.5,
    colorBgLayout: '#f8fafc',
    colorBgContainer: '#ffffff',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',
  },
  components: {
    Layout: {
      bodyBg: '#f8fafc',
      headerBg: '#ffffff',
      siderBg: '#ffffff',
    },
    Card: {
      colorBgContainer: '#ffffff',
      borderRadius: 8,
    },
    Button: {
      borderRadius: 6,
      fontWeight: 500,
    },
    Input: {
      borderRadius: 6,
    },
    Table: {
      borderRadius: 8,
      headerBg: '#f1f5f9',
    },
    Menu: {
      itemBorderRadius: 6,
      itemMarginInline: 4,
      itemSelectedBg: '#f0f0f0',
      itemHoverBg: '#f5f5f5',
      itemActiveBg: '#e6e6e6',
    },
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as ThemeMode) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    // Update document background for smoother transitions
    document.body.style.backgroundColor = mode === 'dark' ? '#0a0e27' : '#f8fafc';
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const currentTheme = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setTheme }}>
      <ConfigProvider theme={currentTheme} locale={ruRU}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
