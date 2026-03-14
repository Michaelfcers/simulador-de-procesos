/** @type {import("prettier").Config} */
export default {
  // Plugins necesarios para Astro
  plugins: ['prettier-plugin-astro'],
  
  // Configuración de estilo
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
  bracketSpacing: true,
  arrowParens: 'always',

  // Configuración específica para archivos .astro
  overrides: [
    {
      files: '*.astro',
      options: {
        parser: 'astro',
      },
    },
  ],
};