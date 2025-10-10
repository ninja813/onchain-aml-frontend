module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Disable source maps in production
      if (env === 'production') {
        webpackConfig.devtool = false;
      }
      
      // Suppress source map warnings
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /Source map error/,
        /ENOENT.*source map/
      ];
      
      return webpackConfig;
    },
  },
};
