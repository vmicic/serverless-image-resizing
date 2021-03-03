import Jimp from './jimp.min.js';
import sjcl from './sjcl-1.0.8.min.js';
import { expirationTtl } from './constants';

import {
  applyThumbConfig,
  applySmallConfig,
  applyMediumConfig,
  applyLargeConfig,
  applyHd10808Config,
} from './defaultConfigs';

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

const getOverlayPosition = (
  config,
  imageWidth,
  imageHeight,
  overlayWidth,
  overlayHeight,
) => {
  let overlayWidthPosition = 0;
  let overlayHeightPosition = 0;
  if ('ot' in config || 'overlay_top' in config) {
    overlayHeightPosition = config.ot ? +config.ot : +config.overlay_top;
  }

  if ('ob' in config || 'overlay_bottom' in config) {
    const overlayBottom = config.ob ? +config.ob : +config.overlay_bottom;
    overlayHeightPosition = imageHeight - overlayBottom - overlayHeight;
  }

  if ('ol' in config || 'overlay_left' in config) {
    overlayWidthPosition = config.ol ? +config.ol : +config.overlay_left;
  }

  if ('or' in config || 'overlay_right' in config) {
    const overlayRight = config.or ? +config.or : +config.overlay_right;
    overlayWidthPosition = imageWidth - overlayRight - overlayWidth;
  }
  return { overlayWidthPosition, overlayHeightPosition };
};

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

const applyUrlConfig = async (base64Image, config) => {
  let base64OverlayImage = '';
  if ('o' in config || 'overlay' in config) {
    let uri = config.o || config.overlay;
    uri = decodeURIComponent(uri);
    const overlayImageResponse = await fetch(uri);

    new Uint8Array(await overlayImageResponse.arrayBuffer()).forEach((byte) => {
      base64OverlayImage += String.fromCharCode(byte);
    });
    base64OverlayImage = btoa(base64OverlayImage);
  }

  const overlayImage = await Jimp.read(
    Buffer.from(base64OverlayImage, 'base64'),
  );
  if ('overlay_rotate' in config) {
    const rotationDegrees = +config.overlay_rotate;
    overlayImage.rotate(rotationDegrees);
  }
  const overlayWidth = overlayImage.bitmap.width;
  const overlayHeight = overlayImage.bitmap.height;

  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      if ('fit' in config) {
        const requestWidth = config.w ? +config.w : +config.width;
        const requestHeight = config.h ? +config.h : +config.height;
        if (config.fit === 'cover') {
          image.cover(requestWidth, requestHeight);
        }

        if (config.fit === 'contain') {
          image.contain(requestWidth, requestHeight);
        }

        if (config.fit === 'scale-down') {
          const originalWidth = image.bitmap.width;
          const originalHeight = image.bitmap.height;
          const newWidth =
            requestWidth > originalWidth ? originalWidth : requestWidth;
          const newHeight =
            requestHeight > originalHeight ? originalHeight : requestHeight;
          image.contain(newWidth, newHeight);
        }

        if (config.fit === 'crop') {
          const originalWidth = image.bitmap.width;
          const originalHeight = image.bitmap.height;
          if (originalWidth > requestWidth && originalHeight > requestHeight) {
            image.contain(requestWidth, requestHeight);
          } else {
            image.cover(requestWidth, requestHeight);
          }
        }

        if (config.fit === 'pad') {
          image.contain(requestWidth, requestHeight);
          image.background(0xffffffff);
        }
      } else {
        if ('w' in config || 'width' in config) {
          const width = config.w ? +config.w : +config.width;
          if ('h' in config || 'height' in config) {
            const height = +config.h || +config.height;
            image.resize(width, height);
          } else {
            image.resize(width, Jimp.AUTO);
          }
        }

        if ('h' in config || 'height' in config) {
          const height = config.h ? +config.h : +config.height;
          image.resize(Jimp.AUTO, height);
        }
      }
      if ('q' in config || 'quality' in config) {
        const quality = config.q ? +config.q : +config.quality;
        image.quality(quality);
      }

      if ('dpr' in config) {
        const ratio = +config.dpr;
        image.scale(ratio);
      }

      if ('o' in config || 'overlay' in config) {
        const overlay = config.o ? +config.o : +config.overyaly;
        if (overlay !== 'none') {
          const options = {};
          if ('oo' in config || 'overlay_opacity' in config) {
            const overlayOpacity = config.oo
              ? +config.oo
              : +config.overlay_opacity;
            options.opacitySource = overlayOpacity;
          }
          const imageWidth = image.bitmap.width;
          const imageHeight = image.bitmap.height;
          const {
            overlayWidthPosition,
            overlayHeightPosition,
          } = getOverlayPosition(
            config,
            imageWidth,
            imageHeight,
            overlayWidth,
            overlayHeight,
          );

          if ('overlay_repeat' in config) {
            const numberOfOverlaysWidth =
              Math.round(imageWidth / overlayWidth) + 1;
            const numberOfOverlaysHeight =
              Math.round(imageHeight / overlayHeight) + 1;

            let width = overlayWidthPosition;
            let height = overlayHeightPosition;

            if (config.overlay_repeat === 'true') {
              for (let i = 0; i <= numberOfOverlaysWidth; i += 1) {
                for (let j = 0; j <= numberOfOverlaysHeight; j += 1) {
                  image.composite(overlayImage, width, height, options);
                  height += overlayHeight;
                }
                height = overlayHeightPosition;
                width += overlayWidth;
              }
            } else if (config.overlay_repeat === 'x') {
              for (let i = 0; i < numberOfOverlaysWidth; i += 1) {
                image.composite(overlayImage, width, height, options);
                width += overlayWidth;
              }
            } else if (config.overlay_repeat === 'y') {
              for (let i = 0; i < numberOfOverlaysHeight; i += 1) {
                image.composite(overlayImage, width, height, options);
                height += overlayHeight;
              }
            }
          } else {
            image.composite(
              overlayImage,
              overlayWidthPosition,
              overlayHeightPosition,
              options,
            );
          }
        }
      }

      return image;
    })
    .catch((err) => {
      console.log(err);
    });
};

const processImage = async (imageUrlConfig, base64Image, config) => {
  let image;
  if (imageUrlConfig === 'thumb') {
    image = await applyThumbConfig(base64Image);
  } else if (imageUrlConfig === 'small') {
    image = await applySmallConfig(base64Image);
  } else if (imageUrlConfig === 'medium') {
    image = await applyMediumConfig(base64Image);
  } else if (imageUrlConfig === 'large') {
    image = await applyLargeConfig(base64Image);
  } else if (imageUrlConfig === 'hd1080') {
    image = await applyHd10808Config(base64Image);
  } else {
    image = await applyUrlConfig(base64Image, config);
  }

  return image;
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
  console.log(JSON.stringify(signature));
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
      Authorization: 'FmHQ863M0$f0MZqV?orn7q6hm&u&CP3IKMCUPKnsbD9MvXgkUK',
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
      expirationTtl,
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
  const defaultImageConfig = getDefaultImageConfig(config);
  const base64Image = await getImage(config, bucket, file);
  if (base64Image === undefined) {
    return new Response('Could not get a requested picture from bucket', {
      status: 400,
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
  const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
  return new Response(buffer, {
    headers: { 'content-type': 'image/jpeg' },
  });
}
