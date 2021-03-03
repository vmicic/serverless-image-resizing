const defaultConfigs = {
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

const configKvExpirationSeconds = 120;

module.exports = {
  defaultConfigs,
  expirationTtl: configKvExpirationSeconds,
};
