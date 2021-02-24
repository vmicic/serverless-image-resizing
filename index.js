import Jimp from './jimp.min.js';
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

const applyUrlConfig = async (urlConfig, base64Image) => {
  const configParts = urlConfig.split(',');
  const config = {};
  configParts.forEach((part) => {
    const keyValue = part.split('=');
    const key = keyValue[0];
    const value = keyValue[1];
    config[key] = value;
  });

  console.log(JSON.stringify(config));
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      if ('fit' in config) {
        const requestWidth = +config.w || +config.width;
        const requestHeight = +config.h || +config.height;
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
          const width = +config.w || +config.width;
          if ('h' in config || 'height' in config) {
            const height = +config.h || +config.height;
            image.resize(width, height);
          } else {
            image.resize(width, Jimp.AUTO);
          }
        }

        if ('h' in config || 'height' in config) {
          const height = +config.h || +config.height;
          image.resize(Jimp.AUTO, height);
        }
      }
      if ('q' in config || 'quality' in config) {
        const quality = +config.q || +config.quality;
        image.quality(quality);
      }

      if ('dpr' in config) {
        const ratio = +config.dpr;
        image.scale(ratio);
      }

      return image;
    })
    .catch((err) => {
      console.log(err);
    });
};

async function handleRequest(request) {
  try {
    // eslint-disable-next-line no-undef
    const aws = new aws4fetch.AwsClient({
      accessKeyId: 'AKIA3SDE3YZN27ULMYYJ',
      secretAccessKey: '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',
    });

    const imagePath =
      'https://vukasinsbucket.s3.eu-central-1.amazonaws.com/squarenumbers.jpg';
    const response = await aws.fetch(imagePath);
    let base64Image = '';
    new Uint8Array(await response.arrayBuffer()).forEach((byte) => {
      base64Image += String.fromCharCode(byte);
    });
    base64Image = btoa(base64Image);

    let image;
    const segments = request.url.split('/');

    const config = segments[5];
    if (config === 'thumb') {
      image = await applyThumbConfig(base64Image);
    } else if (config === 'small') {
      image = await applySmallConfig(base64Image);
    } else if (config === 'medium') {
      image = await applyMediumConfig(base64Image);
    } else if (config === 'large') {
      image = await applyLargeConfig(base64Image);
    } else if (config === 'hd1080') {
      image = await applyHd10808Config(base64Image);
    } else {
      image = await applyUrlConfig(config, base64Image);
    }

    // return new Response('hello');

    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    return new Response(buffer, {
      headers: { 'content-type': 'image/jpeg' },
    });
  } catch (err) {
    console.log(err);
  }
}
