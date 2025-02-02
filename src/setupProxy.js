const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/jars',
    createProxyMiddleware({
      target: 'https://165.232.124.244',
      changeOrigin: true,
      secure: false,
    })
  );
};
