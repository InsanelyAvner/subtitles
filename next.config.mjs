/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  outputFileTracingIncludes: {
    '/api/generate-subtitles': ['./node_modules/ffmpeg-static/**/*'],
  },
  // Skip API routes during static generation
  trailingSlash: false,
}

export default nextConfig
