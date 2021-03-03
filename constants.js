const DEFAULT_CONFIGS = {
  thumb: {
    width: 398,
    height: 224,
  },
  small: {
    width: 796,
    height: 448,
  },
  medium: {
    width: 1138,
    height: 640,
  },
  large: {
    width: 1536,
    height: 864,
  },
  hd1080: {
    width: 1920,
    height: 1080,
  },
};

const CONFIG_KV_EXPIRATION_SECONDS = 43200;

const CONFIG_AUTH_HEADER = 'FmHQ863M0$f0MZqV?orn7q6hm&u&CP3IKMCUPKnsbD9MvXgkUK';

module.exports = {
  DEFAULT_CONFIGS,
  CONFIG_KV_EXPIRATION_SECONDS,
  CONFIG_AUTH_HEADER,
};
