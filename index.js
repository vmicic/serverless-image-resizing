import Jimp from './jimp.min.js';

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});
/**
 * Respond with hello worker text
 * @param {Request} request
 */
async function handleRequest(request) {
  const aws = new aws4fetch.AwsClient({
    accessKeyId: 'AKIA3SDE3YZN27ULMYYJ',
    secretAccessKey: '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',
  });

  const imagePath =
    'https://vukasinsbucket.s3.eu-central-1.amazonaws.com/test.png';
  const response = await aws.fetch(imagePath);
  let base64 = '';
  new Uint8Array(await response.arrayBuffer()).forEach((byte) => {
    base64 += String.fromCharCode(byte);
  });
  base64 = btoa(base64);

  console.log(JSON.stringify('trying to read image'));
  const returnedImage = await Jimp.read(Buffer.from(base64, 'base64'))
    .then((image) => {
      console.log(image.bitmap.width);
      return image;
    })
    .catch((err) => {
      console.log(err);
    });
  const buffer = await returnedImage.getBufferAsync(Jimp.MIME_PNG);
  return new Response(buffer, {
    headers: { 'content-type': 'image/png' },
  });
}
