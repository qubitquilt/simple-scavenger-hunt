/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  webpack: (config, { isServer }) => {
    if (config.resolve.alias) {
      config.resolve.alias['@'] = path.resolve(__dirname);
    }
    return config;
  },
};

module.exports = nextConfig;