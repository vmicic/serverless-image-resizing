import Jimp from './jimp.min.js';
import sjcl from './sjcl-1.0.8.min.js';
import { CONFIG_KV_EXPIRATION_SECONDS, CONFIG_AUTH_HEADER } from './constants';
import { processImage } from './imageFunctions';

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

const getCompleteConfig = (urlConfig, defaultConfig) => {
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

const invalidConfig = (config) => {
  if (!('o' in config || 'overlay' in config)) {
    return true;
  }
  return false;
};

const invalidSignature = (urlConfig, hashKey) => {
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

const getDefaultImageConfig = (config) => {
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

const requestConfig = async (identifier) => {
  const configUrl = `https://api.estatebud.com/v1/contentDelivery/${identifier}`;
  const responseJson = await fetch(configUrl, {
    headers: {
      Authorization: CONFIG_AUTH_HEADER,
    },
  }).then((response) => response.json());
  return responseJson;
};

const getImage = async (config, bucket, file) => {
  if ('storage_buckets' in config) {
    if (bucket in config.storage_buckets) {
      const aws = new aws4fetch.AwsClient({
        accessKeyId: config.storage_buckets[bucket].access.read.key,
        secretAccessKey: config.storage_buckets[bucket].access.read.secret,
        service: 's3',
      });
      const url = `https://${config.storage_buckets[bucket].host}/${bucket}/${file}`;
      const response = await aws.fetch(url);
      if (response.status === 404) {
        return undefined;
      }
      let base64Image = '';
      new Uint8Array(await response.arrayBuffer()).forEach((byte) => {
        base64Image += String.fromCharCode(byte);
      });
      base64Image = btoa(base64Image);
      return base64Image;
    }
  }
  return undefined;
};

const getUrlParams = (segments) => {
  const bucket = segments[4];
  const identifier = segments[5];
  const imageUrlConfig = segments[6];
  const file = segments[7];

  return {
    bucket,
    identifier,
    imageUrlConfig,
    file,
  };
};

const checkRequest = (request) => {
  let invalidRequest = false;
  let response;

  if (request.method !== 'GET') {
    invalidRequest = true;
    response = new Response('Expected GET method.', { status: 400 });

    return { invalidRequest, response };
  }

  const { url } = request;
  const segments = url.split('/');
  if (segments.length !== 8) {
    invalidRequest = true;
    response = new Response('Invalid url', { status: 400 });

    return { invalidRequest, response };
  }

  return { invalidRequest };
};

const getConfig = async (identifier) => {
  let config = JSON.parse(await CONFIG.get(identifier));
  if (config === null) {
    config = await requestConfig(identifier);
    await CONFIG.put('kM6', JSON.stringify(config), {
      expirationTtl: CONFIG_KV_EXPIRATION_SECONDS,
    });
  }

  return config;
};

async function handleRequest(request) {
  const { invalidRequest, response } = checkRequest(request);
  if (invalidRequest) {
    return response;
  }

  const segments = request.url.split('/');
  const { bucket, identifier, imageUrlConfig, file } = getUrlParams(segments);

  const config = await getConfig(identifier);
  if ('error' in config) {
    return new Response('Could not get default config.', { status: 400 });
  }
  const defaultImageConfig = getDefaultImageConfig(config);

  const base64Image = await getImage(config, bucket, file);
  if (base64Image === undefined) {
    return new Response('Could not get a requested picture from bucket.', {
      status: 404,
    });
  }

  const hashKey = config.query_secret;
  if (hashKey === undefined) {
    return new Response('Hash key is missing from config.', { status: 404 });
  }
  if (invalidSignature(imageUrlConfig, hashKey)) {
    return new Response('Signature in URL is invalid.');
  }

  const imageConfig = getCompleteConfig(imageUrlConfig, defaultImageConfig);
  if (invalidConfig(imageConfig)) {
    return new Response('Invalid image config.', { status: 400 });
  }

  const image = await processImage(imageUrlConfig, base64Image, imageConfig);
  if (image === undefined) {
    return new Response('Could not process image', { status: 400 });
  }
  const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
  return new Response(buffer, {
    headers: { 'content-type': 'image/jpeg' },
  });
}
