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

const getOverlayPosition = (
  config,
  imageWidth,
  imageHeight,
  overlayWidth,
  overlayHeight,
) => {
  let width = 0;
  let height = 0;
  if ('ot' in config || 'overlay_top' in config) {
    height = config.ot ? +config.ot : +config.overlay_top;
  }

  if ('ob' in config || 'overlay_bottom' in config) {
    const overlayBottom = config.ob ? +config.ob : +config.overlay_bottom;
    height = imageHeight - overlayBottom - overlayHeight;
  }

  if ('ol' in config || 'overlay_left' in config) {
    width = config.ol ? +config.ol : +config.overlay_left;
  }

  if ('or' in config || 'overlay_right' in config) {
    const overlayRight = config.or ? +config.or : +config.overlay_right;
    width = imageWidth - overlayRight - overlayWidth;
  }
  return { width, height };
};

const applyUrlConfig = async (urlConfig, base64Image) => {
  const configParts = urlConfig.split(',');
  const config = {};
  configParts.forEach((part) => {
    const keyValue = part.split('=');
    const key = keyValue[0];
    const value = keyValue[1];
    config[key] = value;
  });

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
  const overylayWidth = overlayImage.bitmap.width;
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
          const { width, height } = getOverlayPosition(
            config,
            image.bitmap.width,
            image.bitmap.height,
            overylayWidth,
            overlayHeight,
          );
          image.composite(overlayImage, width, height, options);
        }
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

    const overlayImageResponse = await fetch(
      'https://p1.hiclipart.com/preview/318/447/663/alienware-invader-icons-small-sample-package-alienware-invader-icon-17-png-icon.jpg',
    );

    let base64OverlayImage = '';
    new Uint8Array(await overlayImageResponse.arrayBuffer()).forEach((byte) => {
      base64OverlayImage += String.fromCharCode(byte);
    });
    base64OverlayImage = btoa(base64OverlayImage);

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
