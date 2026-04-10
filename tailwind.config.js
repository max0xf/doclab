/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/frontend/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Acronis UI Syntax colors
        primary: {
          DEFAULT: 'var(--acv-color-brand-primary)',
          50: 'var(--acv-color-status-info-primary)',
          100: 'var(--acv-color-status-info-tertiary)',
          500: 'var(--acv-color-brand-primary)',
          600: 'var(--acv-color-brand-primary)',
          700: 'var(--acv-color-link-hover)',
        },
        success: {
          DEFAULT: 'var(--acv-color-status-success-secondary)',
          light: 'var(--acv-color-status-success-primary)',
          dark: 'var(--acv-color-text-status-success)',
        },
        danger: {
          DEFAULT: 'var(--acv-color-status-danger-secondary)',
          light: 'var(--acv-color-status-danger-primary)',
          dark: 'var(--acv-color-text-status-danger)',
        },
        warning: {
          DEFAULT: 'var(--acv-color-status-warning-secondary)',
          light: 'var(--acv-color-status-warning-primary)',
          dark: 'var(--acv-color-text-status-warning)',
        },
        info: {
          DEFAULT: 'var(--acv-color-status-info-secondary)',
          light: 'var(--acv-color-status-info-primary)',
          dark: 'var(--acv-color-text-status-info)',
        },
        surface: {
          primary: 'var(--acv-color-surface-primary)',
          secondary: 'var(--acv-color-surface-secondary)',
        },
        text: {
          primary: 'var(--acv-color-text-primary)',
          secondary: 'var(--acv-color-text-secondary)',
          disabled: 'var(--acv-color-text-disabled)',
        },
        divider: {
          DEFAULT: 'var(--acv-color-divider-primary)',
          secondary: 'var(--acv-color-divider-secondary)',
        },
      },
      fontFamily: {
        sans: ['var(--acv-base-font-family-inter)'],
        mono: ['var(--acv-base-font-family-mono)'],
      },
      fontSize: {
        xs: 'var(--acv-base-font-size-10)',
        sm: 'var(--acv-base-font-size-12)',
        base: 'var(--acv-base-font-size-14)',
        lg: 'var(--acv-base-font-size-16)',
        xl: 'var(--acv-base-font-size-18)',
        '2xl': 'var(--acv-base-font-size-24)',
        '3xl': 'var(--acv-base-font-size-32)',
      },
      borderRadius: {
        sm: 'var(--acv-base-radius-02)',
        DEFAULT: 'var(--acv-base-radius-04)',
        md: 'var(--acv-base-radius-06)',
        lg: 'var(--acv-base-radius-08)',
        xl: 'var(--acv-base-radius-16)',
      },
      spacing: {
        '0.5': 'var(--acv-base-spacing-02)',
        '1': 'var(--acv-base-spacing-04)',
        '2': 'var(--acv-base-spacing-08)',
        '3': 'var(--acv-base-spacing-12)',
        '4': 'var(--acv-base-spacing-16)',
        '6': 'var(--acv-base-spacing-24)',
        '8': 'var(--acv-base-spacing-32)',
      },
    },
  },
  plugins: [],
};
