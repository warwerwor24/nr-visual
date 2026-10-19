import { driveMedia } from '../src/lib/media.mjs';

export const recommendationVersion = 1;

export function savedRecommendationFrames(value, driveUrl) {
  const source = driveMedia(driveUrl);
  if (!source || !value || value.version !== recommendationVersion || value.sourceUrl !== source.open ||
      !Number.isFinite(value.duration) || value.duration <= 0 || !Array.isArray(value.frames) || value.frames.length > 6) return [];
  return value.frames.filter(frame => frame && Number.isFinite(frame.time) && frame.time >= 0 && frame.time < value.duration &&
    typeof frame.image?.asset?._ref === 'string' && /^image-[a-zA-Z0-9]+-\d+x\d+-(?:jpg|jpeg|png|webp)$/.test(frame.image.asset._ref));
}

export function recommendationPayload(driveUrl, duration, frames) {
  const source = driveMedia(driveUrl);
  if (!source || !Number.isFinite(duration) || duration <= 0 || !frames.length || frames.length > 6) throw new Error('Kandidat cover tidak valid.');
  const value = { _type: 'object', version: recommendationVersion, sourceUrl: source.open, duration, generatedAt: new Date().toISOString(),
    frames: frames.map((frame, index) => ({ _type: 'coverRecommendationFrame', _key: `frame-${index + 1}`, time: frame.time,
      image: { _type: 'image', asset: { _type: 'reference', _ref: frame.assetId } } })) };
  if (savedRecommendationFrames(value, driveUrl).length !== frames.length) throw new Error('Asset atau timestamp kandidat cover tidak valid.');
  return value;
}
