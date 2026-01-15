import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // パフォーマンス最適化
  experimental: {
    optimizePackageImports: ["recharts", "lucide-react"],
  },
  // バンドル分析の有効化（開発時のみ）
  ...(process.env.ANALYZE === "true" && {
    webpack: (config: { plugins: unknown[] }) => {
      config.plugins.push(new (require("webpack-bundle-analyzer").BundleAnalyzerPlugin)());
      return config;
    },
  }),
};

export default nextConfig;
