/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['ioredis'],
  images: {
    domains: ['flagcdn.com'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  env: {
    OPENSKY_API_URL: process.env.OPENSKY_API_URL,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
  },
  rewrites: async () => {
    return [
      {
        source: '/api/ws',
        destination: '/api/websocket',
      },
    ];
  },
};

export default nextConfig;