module.exports = {
  root: true,
  env: {
    browser: true,
    webextensions: true,
    es2021: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module'
  },
  globals: {
    chrome: 'readonly'
  },
  rules: {
    semi: ['error', 'always'],
    indent: 'off',
    'space-before-function-paren': 'off',
    'comma-dangle': ['error', 'never'],
    'promise/param-names': 'off'
  },
  overrides: [
    {
      files: ['tests/**/*.test.js', 'tests/**/*.spec.js', 'tests/**/*.js'],
      env: {
        jest: true
      }
    }
  ]
};
