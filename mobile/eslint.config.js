// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // NativeWind drops Pressable style callbacks on Android; use <Press> instead.
    rules: {
      'no-restricted-syntax': ['error', {
        selector: "JSXOpeningElement[name.name='Pressable'] > JSXAttribute[name.name='style'] > JSXExpressionContainer > ArrowFunctionExpression",
        message: 'Pressable style callbacks are ignored on Android with NativeWind. Use <Press> from @/components/Press.',
      }],
    },
  },
]);
