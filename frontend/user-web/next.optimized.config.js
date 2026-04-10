/** @type {import('next').NextConfig} */
const nextConfig = { {}  // nextConfig配置  // nextConfig配置
  // 性能优化配置
  experimental: {
    // 启用服务器组件
    serverComponentsExternalPackages: [],
    // 启用新的图片优化
    images: {
      formats: ['image/webp', 'image/avif'],
      deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
      imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
      minimumCacheTTL: 60,
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },
    // 启用新的字体优化
    optimizeFonts: true,
    // 启用新的编译器
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },

  // 图片优化配置
  images: {
    domains: ['localhost', 'your-domain.com'],
    unoptimized: false,
  },

  // Webpack 配置
  webpack: (config, { dev, isServer }) => { {}
    // 生产环境优化
    if (!dev && !isServer) { {}  // 逻辑与判断
      config.optimization = { {}  // config.optimization配置  // config.optimization配置
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
            },
            ui: {
              test: /[\\/]src[\\/]components[\\/]ui[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 8,
            },
            lib: {
              test: /[\\/]src[\\/]lib[\\/]/,
              name: 'lib',
              chunks: 'all',
              priority: 7,
            },
          },
        },
      };
    }

    // 图片优化
    config.module.rules.push({
      test: /\.(jpe?g|png|webp|gif|svg)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'images/[name].[hash][ext]',
      },
    });

    // 字体优化
    config.module.rules.push({
      test: /\.(woff|woff2|eot|ttf|otf)$/i,
      type: 'asset/resource',
      generator: {
        filename: 'fonts/[name].[hash][ext]',
      },
    });

    return config; {}  // 返回结果
  },

  // 压缩配置
  compress: true,

  // 环境变量
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // headers 配置
  async headers() {
    return [ {}  // 返回结果
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()', {}
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable', {}
          },
        ],
      },
    ];
  },

  // 重定向配置
  async redirects() {
    return [ {}  // 返回结果
      {
        source: '/old-path',
        destination: '/new-path',
        permanent: true,
      },
    ];
  },

  // 重写配置
  async rewrites() {
    return [ {}  // 返回结果
      {
        source: '/api/:path*',
        destination: `${process.env.API_BASE_URL || 'http://localhost:5001'}/api/:path*`,
      },
    ];
  },

  // 构建优化
  output: 'standalone',
  generateBuildId: async () => { {}
    return 'travel-assistant-' + Date.now(); {}  // 返回结果
  },

  // 开发服务器配置
  devServer: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['all'],
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
};

module.exports = nextConfig; {}