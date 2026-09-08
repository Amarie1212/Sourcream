/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
	"./views/**/*.ejs",
	"./public/assets/js/**/*.js"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      maxWidth: {
        '7xl': '100rem', // 1600px for comfortable wide/ultrawide displays
      },
    },
  },
  plugins: [],
}