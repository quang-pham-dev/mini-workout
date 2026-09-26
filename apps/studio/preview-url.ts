const defaultPreviewUrl = 'http://localhost:4321';

export function parsePreviewUrl(value: string | undefined): URL {
  const configured = value?.trim() || defaultPreviewUrl;
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(configured)
    ? configured
    : `https://${configured}`;

  let previewUrl: URL;
  try {
    previewUrl = new URL(candidate);
  } catch (cause) {
    throw new Error('LANDING_PREVIEW_URL must be a valid HTTP URL.', {
      cause,
    });
  }

  if (previewUrl.protocol !== 'http:' && previewUrl.protocol !== 'https:') {
    throw new Error('LANDING_PREVIEW_URL must be a valid HTTP URL.');
  }

  return previewUrl;
}
