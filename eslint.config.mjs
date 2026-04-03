import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettier,
  {
    files: ['src/**/*.{js,vue}'],
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'off'
    }
  },
  {
    ignores: ['dist/**', 'dist_electron/**', 'archive/**', 'node_modules/**', 'css/**']
  }
];
