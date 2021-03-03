import Jimp from './jimp.min.js';
import { processImage, getImageFromBucket } from './imageFunctions';
import {
  getDefaultImageConfig,
  invalidSignature,
  getCompleteConfig,
  invalidConfig,
  getConfig,
} from './config';

addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});

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

const validateRequest = (request) => {
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

async function handleRequest(request) {
  const { invalidRequest, response } = validateRequest(request);
  if (invalidRequest) {
    return response;
  }

  const segments = request.url.split('/');
  const { bucket, identifier, imageUrlConfig, file } = getUrlParams(segments);

  const config = await getConfig(identifier);
  if ('error' in config) {
    return new Response('Could not get default config.', { status: 400 });
  }
  const defaultImageConfig = getDefaultImageConfig(config);
  const base64Image = await getImageFromBucket(config, bucket, file);
  if (base64Image === undefined) {
    return new Response('Could not get a requested picture from bucket.', {
      status: 404,
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
  if (image === undefined) {
    return new Response('Could not process image');
  }
  const buffer = await image.getBufferAsync(Jimp.MIME_JPEG);
  return new Response(buffer, {
    headers: { 'content-type': 'image/jpeg' },
  });
}
