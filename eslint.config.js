export default [
  { ignores: ["dist", "src/**/*.ts", "src/**/*.tsx", "supabase/**/*.ts"] },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
    rules: {},
  },
];
