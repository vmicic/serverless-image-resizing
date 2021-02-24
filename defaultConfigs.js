/* eslint-disable no-undef */
/* eslint-disable arrow-body-style */
import { defaultConfigs } from './configConstants';

export const applyThumbConfig = async (base64Image) => {
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      const { width, height } = defaultConfigs.thumb;
      return image.cover(width, height);
    })
    .catch((err) => {
      console.log(err);
    });
};

export const applySmallConfig = async (base64Image) => {
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      const { width, height } = defaultConfigs.small;
      return image.contain(width, height);
    })
    .catch((err) => {
      console.log(err);
    });
};

export const applyMediumConfig = async (base64Image) => {
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      const { width, height } = defaultConfigs.medium;
      return image.contain(width, height);
    })
    .catch((err) => {
      console.log(err);
    });
};

export const applyLargeConfig = async (base64Image) => {
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      const { width, height } = defaultConfigs.large;
      return image.contain(width, height);
    })
    .catch((err) => {
      console.log(err);
    });
};

export const applyHd10808Config = async (base64Image) => {
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      const { width, height } = defaultConfigs.hd1080;
      return image.contain(width, height);
    })
    .catch((err) => {
      console.log(err);
    });
};
