/* eslint-disable arrow-body-style */
import { DEFAULT_CONFIGS } from './constants';

export const applyThumbConfig = async (base64Image) => {
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      const { width, height } = DEFAULT_CONFIGS.thumb;
      return image.cover(width, height);
    })
    .catch((err) => {
      return undefined;
    });
};

export const applySmallConfig = async (base64Image) => {
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      const { width, height } = DEFAULT_CONFIGS.small;
      return image.contain(width, height);
    })
    .catch((err) => {
      return undefined;
    });
};

export const applyMediumConfig = async (base64Image) => {
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      const { width, height } = DEFAULT_CONFIGS.medium;
      return image.contain(width, height);
    })
    .catch((err) => {
      return undefined;
    });
};

export const applyLargeConfig = async (base64Image) => {
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      const { width, height } = DEFAULT_CONFIGS.large;
      return image.contain(width, height);
    })
    .catch((err) => {
      return undefined;
    });
};

export const applyHd10808Config = async (base64Image) => {
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      const { width, height } = DEFAULT_CONFIGS.hd1080;
      return image.contain(width, height);
    })
    .catch((err) => {
      return undefined;
    });
};
