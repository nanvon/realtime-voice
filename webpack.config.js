const path = require("path");
module.exports = {
  mode: 'production',
  // 入口
  entry: "./src/index.js",
  // 出口
  output: {
    // 打包文件夹
    publicPath: "dist",
    // 打包文件
    filename: "voice.js",
    // 设置对外暴露对象的全局名称
    library: "Voice",
    // 打包生成通过esm、commonjs、requirejs的语法引入
    libraryTarget: "umd",
  },
  // 配置webpack-dev-server
  devServer: {
    // 静态根目录
    contentBase: "www",
    // 端口号
    port: 8080,
  },
};
