/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { node: true, es2020: true },
  parserOptions: { ecmaVersion: 2020, sourceType: "module" },
  ignorePatterns: ["dist", "node_modules"],
  rules: {}
};
