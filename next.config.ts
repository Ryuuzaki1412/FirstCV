import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Allow up to 5MB uploads in Server Actions (default is 1MB). Used by /upload.
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
