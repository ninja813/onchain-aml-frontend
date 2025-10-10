module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Disable source maps in production
      if (process.env.NODE_ENV === 'production') {
        webpackConfig.devtool = false;
      }
      
      // Ignore source map warnings
      webpackConfig.ignoreWarnings = [
        /Failed to parse source map/,
        /ENOENT: no such file or directory/,
        /@reown\/appkit/
      ];
      
      // Add module rules to handle source map issues
      webpackConfig.module.rules.push({
        test: /\.js$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: [
          /node_modules\/@reown\/appkit/,
          /node_modules\/@walletconnect/
        ]
      });
      
      return webpackConfig;
    },
  },
};
