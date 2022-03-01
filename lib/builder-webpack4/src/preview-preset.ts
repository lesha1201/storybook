import webpackConfig from './preview/iframe-webpack.config';

export const webpack = async (_: any, options: any) => webpackConfig(options);

export const entries = async (_: any, options: any) => {
  const result: string[] = [];

  result.push(...(await options.presets.apply('previewEntries', [], options)));

  if (options.configType === 'DEVELOPMENT') {
    // Suppress informational messages when --quiet is specified. webpack-hot-middleware's quiet
    // parameter would also suppress warnings.
    result.push(
      `${require.resolve(`webpack-hot-middleware/client`)}?reload=true&quiet=false&noInfo=${
        options.quiet
      }`
    );
  }

  return result;
};