import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../services/database';
import { UserProfile } from '../types';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'amoled';
  accentColor: 'blue' | 'purple' | 'orange' | 'green';
  privacyMode: boolean;
  chartStyle: 'detailed' | 'minimal';
  setTheme: (theme: 'light' | 'dark' | 'amoled') => Promise<void>;
  setAccentColor: (color: 'blue' | 'purple' | 'orange' | 'green') => Promise<void>;
  setChartStyle: (style: 'detailed' | 'minimal') => Promise<void>;
  setPrivacyMode: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  accentColor: 'blue',
  privacyMode: false,
  chartStyle: 'detailed',
  setTheme: async () => {},
  setAccentColor: async () => {},
  setChartStyle: async () => {},
  setPrivacyMode: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark' | 'amoled'>('dark');
  const [accentColor, setAccentColorState] = useState<'blue' | 'purple' | 'orange' | 'green'>('blue');
  const [chartStyle, setChartStyleState] = useState<'detailed' | 'minimal'>('detailed');
  const [privacyMode, setPrivacyModeState] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      // 1. Load Local Preferences (Instant Load)
      const savedPrivacy = localStorage.getItem('fincontrol_privacy');
      const savedTheme = localStorage.getItem('fincontrol_theme');
      const savedAccent = localStorage.getItem('fincontrol_accent');
      const savedChartStyle = localStorage.getItem('fincontrol_chart_style');

      if (savedPrivacy) setPrivacyModeState(JSON.parse(savedPrivacy));
      
      let currentTheme = (savedTheme as 'light' | 'dark' | 'amoled') || 'dark';
      let currentAccent = (savedAccent as 'blue' | 'purple' | 'orange' | 'green') || 'blue';
      let currentChartStyle = (savedChartStyle as 'detailed' | 'minimal') || 'detailed';

      // Apply immediately
      setThemeState(currentTheme);
      setAccentColorState(currentAccent);
      setChartStyleState(currentChartStyle);
      applyDOMTheme(currentTheme, currentAccent);

      // 2. Load Remote Preferences (Sync with DB)
      try {
        const profile = await db.getUserProfile();
        if (profile) {
          let hasUpdates = false;
          // Sync Theme/Accent
          if (profile.theme !== currentTheme || profile.accent_color !== currentAccent || profile.chart_style !== currentChartStyle) {
             setThemeState(profile.theme);
             setAccentColorState(profile.accent_color);
             setChartStyleState(profile.chart_style || 'detailed');
             
             applyDOMTheme(profile.theme, profile.accent_color);
             
             localStorage.setItem('fincontrol_theme', profile.theme);
             localStorage.setItem('fincontrol_accent', profile.accent_color);
             localStorage.setItem('fincontrol_chart_style', profile.chart_style || 'detailed');
          }
        }
      } catch (error) {
        console.error("Erro ao sincronizar tema:", error);
      }
    };
    loadSettings();
  }, []);

  const applyDOMTheme = (t: string, c: string) => {
    const root = document.documentElement;
    
    // 1. Apply Mode & Background Colors via CSS Variables
    root.classList.remove('dark', 'amoled');
    
    if (t === 'amoled') {
      root.classList.add('dark', 'amoled');
      // Set to absolute black
      root.style.setProperty('--bg-dark', '#000000');
      root.style.setProperty('--surface-dark', '#000000'); // Cards also black or very dark
    } else if (t === 'dark') {
      root.classList.add('dark');
      // Set to standard dark blue/grey
      root.style.setProperty('--bg-dark', '#101622');
      root.style.setProperty('--surface-dark', '#192233');
    } else {
      // Light mode defaults handle themselves via Tailwind classes
      root.style.removeProperty('--bg-dark');
      root.style.removeProperty('--surface-dark');
    }

    // 2. Apply Accent
    const colorMap = {
      blue: { primary: '19 91 236', dark: '14 69 181' }, // #135bec
      purple: { primary: '147 51 234', dark: '126 34 206' }, // #9333ea
      orange: { primary: '249 115 22', dark: '234 88 12' }, // #f97316
      green: { primary: '22 163 74', dark: '21 128 61' }, // #16a34a
    };

    const selected = colorMap[c as keyof typeof colorMap] || colorMap.blue;
    root.style.setProperty('--color-primary', selected.primary);
    root.style.setProperty('--color-primary-dark', selected.dark);
  };

  const setTheme = async (newTheme: 'light' | 'dark' | 'amoled') => {
    setThemeState(newTheme);
    applyDOMTheme(newTheme, accentColor);
    localStorage.setItem('fincontrol_theme', newTheme);
    await db.updateUserProfile({ theme: newTheme });
  };

  const setAccentColor = async (newColor: 'blue' | 'purple' | 'orange' | 'green') => {
    setAccentColorState(newColor);
    applyDOMTheme(theme, newColor);
    localStorage.setItem('fincontrol_accent', newColor);
    await db.updateUserProfile({ accent_color: newColor });
  };

  const setChartStyle = async (newStyle: 'detailed' | 'minimal') => {
    setChartStyleState(newStyle);
    localStorage.setItem('fincontrol_chart_style', newStyle);
    await db.updateUserProfile({ chart_style: newStyle });
  };

  const setPrivacyMode = (enabled: boolean) => {
    setPrivacyModeState(enabled);
    localStorage.setItem('fincontrol_privacy', JSON.stringify(enabled));
  };

  return (
    <ThemeContext.Provider value={{ theme, accentColor, privacyMode, chartStyle, setTheme, setAccentColor, setChartStyle, setPrivacyMode }}>
      {children}
    </ThemeContext.Provider>
  );
};
