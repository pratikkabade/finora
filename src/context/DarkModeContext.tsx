import React, { createContext, useContext, useEffect, useState } from 'react';

interface DarkModeContextType {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });

    useEffect(() => {
        const themeColor = isDarkMode ? '#030712' : '#f8fafc';
        const themeColorMeta = document.querySelector('meta[name="theme-color"]');

        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', themeColor);
        }

        document.documentElement.style.backgroundColor = themeColor;
        document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
        document.body.style.backgroundColor = themeColor;
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
