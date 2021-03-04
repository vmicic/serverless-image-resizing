/* eslint-disable */
import Jimp from './jimp.min.js';
import {
  applyThumbConfig,
  applySmallConfig,
  applyMediumConfig,
  applyLargeConfig,
  applyHd10808Config,
} from './defaultConfigs';

export const getImageFromBucket = async (config, bucket, file) => {
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

export const getOverlayPosition = (
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

const applyConfig = async (base64Image, config) => {
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
        } else if ('h' in config || 'height' in config) {
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
      return undefined;
    });
};

export const processImage = async (imageUrlConfig, base64Image, config) => {
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
    image = await applyConfig(base64Image, config);
  }

  return image;
};
