const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },

  allowedDevOrigins: [
    'localhost:3001',
    '127.0.0.1:3001',
    '*.app.github.dev',
    '127.0.0.1',
    'localhost',
  ],

  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3001',
        '127.0.0.1:3001',
        '*.app.github.dev',
      ],
    },
  },

  images: {
    unoptimized: true,
  },
}

export default nextConfig