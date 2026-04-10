/** @type {import('tailwindcss').Config} */
module.exports = { 
  // 内容源
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  
  // 主题配置
  theme: {
    extend: {
      // 颜色系统
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        coral: {
          DEFAULT: '#FF6B6B',
          50: '#fff0f0',
          100: '#ffe0e0',
          200: '#ffc2c2',
          300: '#ffa3a3',
          400: '#ff8585',
          500: '#ff6b6b',
          600: '#ff3333',
          700: '#ff0000',
          800: '#cc0000',
          900: '#990000',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        accent: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#ec4899',
          600: '#db2777',
          700: '#be185d',
          800: '#9d174d',
          900: '#831843',
          950: '#500724',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
      },
      
      // 字体系统
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Playfair Display', 'serif'],
      },
      
      // 字体大小
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '3.5rem' }],
        '6xl': ['3.75rem', { lineHeight: '4rem' }],
        '7xl': ['4.5rem', { lineHeight: '4.5rem' }],
        '8xl': ['6rem', { lineHeight: '5rem' }],
        '9xl': ['8rem', { lineHeight: '6rem' }],
      },
      
      // 间距
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '96': '24rem',
        '128': '32rem',
      },
      
      // 圆角
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      
      // 阴影
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        'none': '0 0 0 0 rgba(0, 0, 0, 0)',
      },
      
      // 动画
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-in',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin': 'spin 1s linear infinite',
        'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      
      // 关键帧
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideOut: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        ping: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
      
      // 过渡
      transition: {
        'all': 'all 0.3s ease',
        'colors': 'color 0.3s ease',
        'bg-colors': 'background-color 0.3s ease',
        'border-colors': 'border-color 0.3s ease',
        'opacity': 'opacity 0.3s ease',
        'shadow': 'box-shadow 0.3s ease',
        'transform': 'transform 0.3s ease',
      },
      
      // 变换
      transform: {
        'scale-95': 'scale(0.95)',
        'scale-100': 'scale(1)',
        'scale-105': 'scale(1.05)',
        'scale-110': 'scale(1.1)',
        'scale-125': 'scale(1.25)',
        'scale-150': 'scale(1.5)',
      },
      
      // 混合模式
      mixBlendMode: {
        'multiply': 'multiply',
        'screen': 'screen',
        'overlay': 'overlay',
        'darken': 'darken',
        'lighten': 'lighten',
        'color-dodge': 'color-dodge',
        'color-burn': 'color-burn',
        'hard-light': 'hard-light',
        'soft-light': 'soft-light',
        'difference': 'difference',
        'exclusion': 'exclusion',
        'hue': 'hue',
        'saturation': 'saturation',
        'color': 'color',
        'luminosity': 'luminosity',
      },
      
      // 滤镜
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      
      // 渐变
      gradient: {
        'to-r': 'to right',
        'to-l': 'to left',
        'to-t': 'to top',
        'to-b': 'to bottom',
        'to-tr': 'to top right',
        'to-tl': 'to top left',
        'to-br': 'to bottom right',
        'to-bl': 'to bottom left',
      },
      
      // 断点
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
      },
    },
  },
  
  // 插件
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/line-clamp'),
  ],
  
  // 核心插件
  corePlugins: {
    // 启用/禁用某些核心插件
    preflight: true,
    container: true,
    accessibility: true,
    // 禁用一些不需要的插件
    // aspectRatio: false,
    // lineClamp: false,
    // typography: false,
  },
  
  // 预设
  presets: [],
  
  // 变体
  variants: {
    extend: {
      // 响应式变体
      'responsive': ['responsive'],
      'hover': ['hover', 'focus'],
      'focus': ['focus-visible', 'focus'],
      'active': ['active'],
      'group-hover': ['group-hover'],
      'aria-disabled': ['aria-disabled'],
      'aria-checked': ['aria-checked'],
      'aria-expanded': ['aria-expanded'],
      'aria-pressed': ['aria-pressed'],
      'aria-selected': ['aria-selected'],
      'aria-invalid': ['aria-invalid'],
      'disabled': ['disabled'],
      'read-only': ['read-only'],
      'checked': ['checked'],
      'indeterminate': ['indeterminate'],
      'default': ['default'],
      'first': ['first'],
      'last': ['last'],
      'odd': ['odd'],
      'even': ['even'],
      'visited': ['visited'],
      'target': ['target'],
      'empty': ['empty'],
      'enabled': ['enabled'],
      'disabled': ['disabled'],
      'required': ['required'],
      'optional': ['optional'],
      'in-range': ['in-range'],
      'out-of-range': ['out-of-range'],
      'placeholder-shown': ['placeholder-shown'],
      'autofill': ['autofill'],
      'current': ['current'],
      'past': ['past'],
      'future': ['future'],
      'open': ['open'],
      'closed': ['closed'],
      'rtl': ['rtl'],
      'ltr': ['ltr'],
      'inverted': ['inverted'],
      'inset': ['inset'],
      'full': ['full'],
      'partial': ['partial'],
      'complete': ['complete'],
      'incomplete': ['incomplete'],
      'valid': ['valid'],
      'invalid': ['invalid'],
      'loading': ['loading'],
      'loaded': ['loaded'],
      'idle': ['idle'],
      'busy': ['busy'],
      'success': ['success'],
      'warning': ['warning'],
      'error': ['error'],
      'info': ['info'],
    },
  },
  
  // 重要级别
  important: false,
  
  // 安全模式
  safelist: [],
  
  // 暗色模式
  darkMode: 'class',
  
  // 未来配置
  future: {
    // 启用新的 JIT 编译器
    // purgeLayers: true,
    // disableColorUtilities: true,
  },
}