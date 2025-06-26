import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make .txt files work in Turbopack (next dev --turbo)
  turbopack: {
    rules: {
      "*.txt": {
        loaders: ["raw-loader"],
        as: "*.js"
      }
    }
  },
  // Make .txt files work in regular webpack (next build / start)
  webpack: (config) => {
    config.module.rules.push({
      test: /\.txt$/,
      type: "asset/source"
    });
    return config;
  }
};

export default nextConfig;
