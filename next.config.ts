import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    '192.168.137.1',
    '192.168.1.88',
    '192.168.*.*',
    '172.*.*.*',
    'localhost',
    '127.0.0.1',
  ],
  devIndicators: false,
};

export default nextConfig;
