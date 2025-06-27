import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.alias["@"] = "./src";
    return config;
  },
};

export default nextConfig;
