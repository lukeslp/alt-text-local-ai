// Theme management module
export const ThemeManager = {
    STORAGE_KEY: 'app-theme-preference',
    DARK_CLASS: 'dark',

    // Initialize theme based on user preference, defaulting to light
    initialize() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);
        if (savedTheme) {
            this.setTheme(savedTheme === 'dark');
        } else {
            // Default to light mode
            this.setTheme(false);
        }

        // Listen for system theme changes only if user hasn't set a preference
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                this.setTheme(false); // Keep defaulting to light
            }
        });
    },

    // Set theme and update all necessary elements
    setTheme(isDark) {
        const root = document.documentElement;
        
        // Toggle dark class
        root.classList.toggle(this.DARK_CLASS, isDark);
        
        // Store preference
        localStorage.setItem(this.STORAGE_KEY, isDark ? 'dark' : 'light');
        
        // Update meta theme color for mobile browsers
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.content = isDark ? '#1a202c' : '#f7fafc';
        }
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('themechange', { 
            detail: { isDark, theme: isDark ? 'dark' : 'light' } 
        }));
    },

    // Toggle current theme
    toggle() {
        const isDark = this.isDark();
        this.setTheme(!isDark);
        return !isDark;
    },

    // Get current theme
    isDark() {
        return document.documentElement.classList.contains(this.DARK_CLASS);
    }
}; 