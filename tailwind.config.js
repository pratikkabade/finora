/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            backgroundColor: {
                'glass': 'rgba(255, 255, 255, 0.1)',
                'glass-dark': 'rgba(0, 0, 0, 0.05)',
            },
            backdropBlur: {
                'xl': '20px',
                '2xl': '30px',
            },
            screens: {
                'xs': '375px',
            },
        },
    },
    plugins: [],
}