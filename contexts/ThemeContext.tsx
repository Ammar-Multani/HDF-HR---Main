import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { MD3LightTheme, MD3DarkTheme, Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define custom theme colors
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#3b5998',
    secondary: '#0EA5E9',
    tertiary: '#7C3AED',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    error: '#EF4444',
    onSurface: '#1F2937',
    onBackground: '#1F2937',
    onSurfaceVariant: '#64748B',
    text: '#000000',

  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#3B82F6',
    secondary: '#38BDF8',
    tertiary: '#8B5CF6',
    background: 'rgb(30, 30, 50)',
    surface: '#1E293B',
    error: '#F87171',
    onSurface: '#F1F5F9',
    onBackground: '#F1F5F9',
    onSurfaceVariant: '#94A3B8',
    text: '#FFFFFF',
  },
};

type ThemeType = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: typeof lightTheme | typeof darkTheme;
  themeType: ThemeType;
  setThemeType: (theme: ThemeType) => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const colorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>('system');
  
  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('themePreference');
        if (savedTheme) {
          setThemeType(savedTheme as ThemeType);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    
    loadTheme();
  }, []);
  
  const setThemeTypeAndSave = async (newTheme: ThemeType) => {
    setThemeType(newTheme);
    try {
      await AsyncStorage.setItem('themePreference', newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };
  
  // Determine if dark mode based on theme type and system preference
  const isDarkMode = 
    themeType === 'dark' || (themeType === 'system' && colorScheme === 'dark');
  
  // Select the appropriate theme object
  const theme = isDarkMode ? darkTheme : lightTheme;
  
  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeType,
        setThemeType: setThemeTypeAndSave,
        isDarkMode,
      }}
    >
      <PaperProvider theme={theme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
