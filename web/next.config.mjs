import path from "path";

const nextConfig = {
  output: "standalone",
  experimental: {
    esmExternals: "loose",
  },
  webpack: (config) => {
    config.resolve.alias["@/assets"] = path.resolve(
      process.cwd(),
      "public/assets"
    );
    return config;
  },
};

export default nextConfig;
