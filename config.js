import { CONFIG_AUTH_HEADER, CONFIG_KV_EXPIRATION_SECONDS } from './constants';
import sjcl from './sjcl-1.0.8.min.js';

export const getCompleteConfig = (urlConfig, defaultConfig) => {
  const configParts = urlConfig.split(',');
  const config = { ...defaultConfig };
  configParts.forEach((part) => {
    const keyValue = part.split('=');
    const key = keyValue[0];
    const value = keyValue[1];
    config[key] = value;
  });
  return config;
};

export const invalidConfig = (config) => {
  if (!('o' in config || 'overlay' in config)) {
    return true;
  }
  return false;
};

export const invalidSignature = (urlConfig, hashKey) => {
  const decodedUrl = decodeURIComponent(urlConfig);
  const configSegments = decodedUrl.split(',');
  let urlWithoutSignature = '';
  let signature;
  configSegments.forEach((segment) => {
    const keyValue = segment.split('=');
    const [key, value] = keyValue;
    if (key !== 's') {
      if (urlWithoutSignature === '') {
        urlWithoutSignature = segment;
      } else {
        urlWithoutSignature = `${urlWithoutSignature},${segment}`;
      }
    } else {
      signature = value;
    }
  });
  // eslint-disable-next-line new-cap
  const hmac = new sjcl.misc.hmac(sjcl.codec.utf8String.toBits(hashKey));
  const configHash = sjcl.codec.hex.fromBits(hmac.encrypt(urlWithoutSignature));
  if (configHash === signature) {
    return false;
  }
  return true;
};

export const getDefaultImageConfig = (config) => {
  const defaultImageConfig = {};
  if ('defaults' in config) {
    if ('overlay' in config.defaults) {
      Object.entries(config.defaults.overlay).forEach((entry) => {
        const [key, value] = entry;
        if (key === 'url') {
          defaultImageConfig['o'] = value;
        } else {
          defaultImageConfig[`overlay_${key}`] = value;
        }
      });
    }
  }

  Object.entries(config.defaults).forEach((entry) => {
    const [key, value] = entry;
    if (key !== 'overlay') {
      defaultImageConfig[key] = value;
    }
  });

  return defaultImageConfig;
};

export const requestConfig = async (identifier) => {
  const configUrl = `https://api.estatebud.com/v1/contentDelivery/${identifier}`;
  const responseJson = await fetch(configUrl, {
    headers: {
      Authorization: CONFIG_AUTH_HEADER,
    },
  }).then((response) => response.json());
  return responseJson;
};

export const getConfig = async (identifier) => {
  let config = JSON.parse(await CONFIG.get(identifier));
  if (config === null) {
    config = await requestConfig(identifier);
    await CONFIG.put('kM6', JSON.stringify(config), {
      expirationTtl: CONFIG_KV_EXPIRATION_SECONDS,
    });
  }

  return config;
};
