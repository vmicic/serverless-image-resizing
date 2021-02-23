/* eslint-disable arrow-body-style */
import Jimp from './jimp.min.js';
import { defaultConfigs } from './config';

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

const applyThumbConfig = async (base64Image) => {
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      const { width, height } = defaultConfigs.thumb;
      return image.cover(width, height);
    })
    .catch((err) => {
      console.log(err);
    });
};

const applySmallConfig = async (base64Image) => {
  return Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      const { width, height } = defaultConfigs.small;
      return image.contain(width, height);
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
    }

    if (config === 'small') {
      image = await applySmallConfig(base64Image);
    }

    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    return new Response(buffer, {
      headers: { 'content-type': 'image/jpeg' },
    });
  } catch (err) {
    console.log(err);
  }
}
