/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure environment variables are available on the server
  serverRuntimeConfig: {
    openaiApiKey: process.env.OPENAI_API_KEY,
  },
  // Environment variables available on both server and client
  publicRuntimeConfig: {
    // Add any public config here
  },
};

module.exports = nextConfig;
