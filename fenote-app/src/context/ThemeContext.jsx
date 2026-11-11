import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => localStorage.getItem('fenote-dark-mode') === 'true');

  useEffect(() => {
    if (isDark) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    localStorage.setItem('fenote-dark-mode', isDark);
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(prev => !prev) }}>
      {children}
    </ThemeContext.Provider>
  );
};