const path = require('path');

module.exports = {
  webpack: (config) => {
    // Allow absolute imports from src/frontend (e.g. import 'services/api')
    config.resolve.modules = [
      path.resolve(__dirname, 'src/frontend'),
      'node_modules',
    ];

    return config;
  },

  jest: (config) => {
    // Jest absolute imports resolve from src/frontend
    config.modulePaths = [path.resolve(__dirname, 'src/frontend')];
    return config;
  },
};
