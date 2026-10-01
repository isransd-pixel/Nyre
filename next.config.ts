import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Los estados de cuenta en CSV pueden superar el límite de 1MB por defecto.
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
