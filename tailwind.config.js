/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./views/**/*.ejs",       // watch all EJS files in views
    "./public/**/*.html",     // if you have HTML files
    "./public/js/**/*.js"     // if you use JS files with Tailwind classes
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
