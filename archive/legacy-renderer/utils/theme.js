export const ThemeManager = {
    initialize() {
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.setTheme(savedTheme === 'dark');
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark);
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('theme')) {
                this.setTheme(e.matches);
            }
        });
    },

    isDark() {
        return document.documentElement.classList.contains('dark');
    },

    setTheme(isDark) {
        document.documentElement.classList.toggle('dark', isDark);
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('themechange', {
            detail: { isDark }
        }));
    },

    toggle() {
        const isDark = this.isDark();
        this.setTheme(!isDark);
        return !isDark;
    }
}; 