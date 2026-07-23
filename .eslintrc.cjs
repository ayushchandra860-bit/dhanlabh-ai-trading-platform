module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: [
    'dist',
    'dist-electron',
    'release',
    'node_modules',
    '.venv',
    '*.cjs',
    // one-off root scripts, not part of the app
    'fix_*.js',
    'run-test*.js',
    'run-audit.js',
    'patch_*.js',
    'update_sre.js',
    'refactor_vm.js',
    'restore_de.js',
    'generate_engines.js',
    'check_methods.js',
    'debug_win.js',
    'fix_main.js',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    // Codebase currently relies on `any` in IPC bridges; keep as warning, not error
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // Legacy files still carry @ts-nocheck; removing it is a larger refactor
    '@typescript-eslint/ban-ts-comment': 'warn',
    'no-empty': ['warn', { allowEmptyCatch: true }],
  },
};
