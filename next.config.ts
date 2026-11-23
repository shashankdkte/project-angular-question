import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Question content is prerendered from the build-time content index
  // (see scripts/build-content-index.ts), so the classic static model fits:
  // generateStaticParams + force-static. Cache Components is intentionally off.
  cacheComponents: false,
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
