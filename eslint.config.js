module.exports = {
  extends: ['next/core-web-vitals'],
  ignores: ['node_modules', '.next', 'dist'],
  rules: {
    '@next/next/no-html-link-for-pages': 'off',
  },
}
