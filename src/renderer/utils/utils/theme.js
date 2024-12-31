export const ThemeManager = {
    isDark() {
        const savedTheme = localStorage.getItem('app-theme-preference');
        if (savedTheme) {
            return savedTheme === 'dark';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    },

    setTheme(isDark) {
        const theme = isDark ? 'dark' : 'light';
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(theme);
        localStorage.setItem('app-theme-preference', theme);
    },

    initialize() {
        const isDark = this.isDark();
        this.setTheme(isDark);
        
        // Watch for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('app-theme-preference')) {
                this.setTheme(e.matches);
            }
        });
    }
}; 