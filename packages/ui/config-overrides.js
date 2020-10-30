var GitRevisionPlugin = require('git-revision-webpack-plugin')

const findWebpackPlugin = (plugins, pluginName) =>
  plugins.find(plugin => plugin.constructor.name === pluginName);

const overrideProcessEnv = value => config => {
  const plugin = findWebpackPlugin(config.plugins, 'DefinePlugin');
  const processEnv = plugin.definitions['process.env'] || {};

  plugin.definitions['process.env'] = {
    ...processEnv,
    ...value,
  };

  return config;
};

module.exports = function override(config, env) {
    if (!config.plugins) {
        config.plugins = [];
    }
    const gitRevisionPlugin = new GitRevisionPlugin({
        branch: true
    })
    config.plugins.push(
        gitRevisionPlugin,
    );

    return config;
}