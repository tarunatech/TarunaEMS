import { useEffect, useState } from 'react';

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'light';
  return localStorage.getItem('app-theme') || 'light';
};

const applyTheme = (theme) => {
  document.documentElement.classList.toggle('theme-dark', theme === 'dark');
  document.documentElement.setAttribute('data-theme', theme);
};

export const useTheme = () => {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return {
    isDark: theme === 'dark',
    theme,
    toggleTheme
  };
};
