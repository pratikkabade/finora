import React, { createContext, useContext, useEffect, useState } from 'react';

interface DarkModeContextType {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);
const LIGHT_THEME_COLOR = '#f8fafc';
const DARK_THEME_COLOR = '#030712';

const applyTheme = (isDarkMode: boolean) => {
    const themeColor = isDarkMode ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
    const themeColorMeta = document.getElementById('theme-color-meta');
    const themeColorLightMeta = document.getElementById('theme-color-light-meta');
    const themeColorDarkMeta = document.getElementById('theme-color-dark-meta');

    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';

    if (themeColorMeta) {
        themeColorMeta.setAttribute('content', themeColor);
    }

    if (themeColorLightMeta) {
        themeColorLightMeta.setAttribute('content', LIGHT_THEME_COLOR);
    }

    if (themeColorDarkMeta) {
        themeColorDarkMeta.setAttribute('content', DARK_THEME_COLOR);
    }

    document.documentElement.style.backgroundColor = themeColor;
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    document.body.style.backgroundColor = themeColor;
    document.body.style.colorScheme = isDarkMode ? 'dark' : 'light';
};

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        applyTheme(isDarkMode);
    }, [isDarkMode]);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleThemeChange = (event: MediaQueryListEvent) => {
            setIsDarkMode(event.matches);
        };

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleThemeChange);
            return () => mediaQuery.removeEventListener('change', handleThemeChange);
        }

        mediaQuery.addListener(handleThemeChange);
        return () => mediaQuery.removeListener(handleThemeChange);
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
    };

    return (
        <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
            {children}
        </DarkModeContext.Provider>
    );
};

export const useDarkMode = () => {
    const context = useContext(DarkModeContext);
    if (!context) {
        throw new Error('useDarkMode must be used within DarkModeProvider');
    }
    return context;
};
