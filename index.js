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
  console.log(JSON.stringify('Trying to get image from S3'));
  const response = await aws.fetch(imagePath);
  return response;
}
