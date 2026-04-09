import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettier,
  {
    // Renderer process (browser environment)
    files: ['src/**/*.{js,vue}'],
    ignores: ['src/main/**', 'src/preload/**'],
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        TextDecoder: 'readonly',
        setTimeout: 'readonly',
        confirm: 'readonly',
        getComputedStyle: 'readonly',
        matchMedia: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off',
      'vue/first-attribute-linebreak': 'off',
      'vue/attributes-order': 'off'
    }
  },
  {
    // Main + preload process (Node.js environment)
    files: ['src/main/**/*.js', 'src/preload/**/*.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-useless-catch': 'warn'
    }
  },
  {
    ignores: ['dist/**', 'dist_electron/**', 'archive/**', 'node_modules/**', 'css/**', 'scripts/**']
  }
];
