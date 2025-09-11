module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./src"],
          extensions: [".ios.js", ".android.js", ".js", ".ts", ".tsx", ".json"],
          alias: {
            "@": "./src",
            "@actions/*": "./src/actions/*",
            "@infrastructure/*": "./src/infrastructure/*",
            "@domain/*": "./src/domain/*",
            "@presentation/*": "./src/presentation/*",
            "@store/*": "./src/presentation/store/*",
            "@styles/*": "./assets/styles/*",
            "@config/*": "./config/*",
          },
        },
      ],
      [
        "module:react-native-dotenv",
        {
          envName: "APP_ENV",
          moduleName: "@env",
          path: ".env",
        },
      ],
    ],
  };
};
