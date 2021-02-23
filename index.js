import Jimp from './jimp.min.js';
import { defaultConfigs } from './config';

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

const applyThumbConfig = async (base64Image) => {
  const returnImage = await Jimp.read(Buffer.from(base64Image, 'base64'))
    .then((image) => {
      console.log(JSON.stringify('Sucessfully read image'));
      const { width, height } = defaultConfigs.thumb;
      return image.cover(width, height);
    })
    .catch((err) => {
      console.log(err);
    });
  return returnImage;
};

async function handleRequest(request) {
  console.log(JSON.stringify('got request'));
  try {
    // eslint-disable-next-line no-undef
    const aws = new aws4fetch.AwsClient({
      accessKeyId: 'AKIA3SDE3YZN27ULMYYJ',
      secretAccessKey: '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',
    });

    const imagePath =
      'https://vukasinsbucket.s3.eu-central-1.amazonaws.com/test.png';
    const response = await aws.fetch(imagePath);
    let base64Image = '';
    new Uint8Array(await response.arrayBuffer()).forEach((byte) => {
      base64Image += String.fromCharCode(byte);
    });
    base64Image = btoa(base64Image);

    let image;
    const segments = request.url.split('/');
    console.log(JSON.stringify('checking if default config matches'));
    if (segments[5] === 'thumb') {
      console.log(JSON.stringify('Applying thumb config'));
      try {
        image = await applyThumbConfig(base64Image);
      } catch (err) {
        console.log(err);
      }
    }

    const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
    return new Response(buffer, {
      headers: { 'content-type': 'image/png' },
    });
  } catch (err) {
    console.log(err);
  }
}
