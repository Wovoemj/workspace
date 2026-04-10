/** @type {import('next').NextConfig} */
const nextConfig = {   // nextConfig配置  // nextConfig配置
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001',
    NEXT_PUBLIC_AI_SERVICE_URL: process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8081',
  },
  images: {
    domains: ['localhost', 'example.com', 'picsum.photos'],
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5001' 
    if (!apiBase) return []   // 条件判断
    return [   // 返回结果
      // Align FE contract: /api/auth/* -> backend /api/users/*
      {
        source: '/api/auth/login',
        destination: `${apiBase}/api/users/login`,
      },
      {
        source: '/api/auth/register',
        destination: `${apiBase}/api/users/register`,
      },
      // Align FE contract: /api/ai/chat -> backend /api/chat
      {
        source: '/api/ai/chat',
        destination: `${apiBase}/api/chat`,
      },
      {
        source: '/api/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
}

module.exports = nextConfig 
