const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts and validates a YouTube video ID from a URL or raw ID string.
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - Raw 11-character video ID
 */
export function extractYouTubeVideoId(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const trimmed = input.trim();

  // If it's already an 11-char ID
  if (YOUTUBE_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  try {
    // Add protocol if missing for URL parsing
    const urlString = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;

    const parsedUrl = new URL(urlString);
    const hostname = parsedUrl.hostname.toLowerCase().replace(/^www\./, '');

    if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
      // /watch?v=ID
      if (parsedUrl.pathname === '/watch') {
        const v = parsedUrl.searchParams.get('v');
        if (v && YOUTUBE_ID_REGEX.test(v)) {
          return v;
        }
      }

      // /embed/ID, /v/ID, /shorts/ID
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      if (['embed', 'v', 'shorts'].includes(pathParts[0]) && pathParts[1]) {
        const id = pathParts[1].split('?')[0].split('&')[0];
        if (YOUTUBE_ID_REGEX.test(id)) {
          return id;
        }
      }
    } else if (hostname === 'youtu.be') {
      // youtu.be/ID
      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      if (pathParts[0]) {
        const id = pathParts[0].split('?')[0].split('&')[0];
        if (YOUTUBE_ID_REGEX.test(id)) {
          return id;
        }
      }
    }
  } catch {
    // If URL parsing fails, test regex fallback
  }

  // Regex fallback for non-standard query params
  const regexMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );

  if (regexMatch && regexMatch[1] && YOUTUBE_ID_REGEX.test(regexMatch[1])) {
    return regexMatch[1];
  }

  return null;
}

