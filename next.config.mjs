const appMode = process.env.NEXT_PUBLIC_APP_MODE === "hosted" ? "hosted" : "static";

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(appMode === "static"
    ? {
        output: "export",
        trailingSlash: true
      }
    : {}),
  turbopack: {
    root: process.cwd()
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
