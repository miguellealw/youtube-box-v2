import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 2592000,
    deviceSizes: [640, 1080, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      { hostname: "i.ytimg.com" },
      { hostname: "yt3.ggpht.com" },
      { hostname: "yt3.googleusercontent.com" },
    ],
  },
}

export default nextConfig
