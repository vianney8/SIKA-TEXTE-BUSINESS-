// The selected replacement is bundled into the Vite public directory for Render.
// Change the version when replacing that file so browsers request the new media.
export const BUNDLED_DEMO_VIDEO_URL = "/promo.mp4?v=510ce88fa030";
export const LEGACY_DEMO_VIDEO_URL =
  "/api/media/demo-video/f31d0d57-d8b4-4111-ba98-0a6aa30e98de.mp4";

export function resolveDemoVideoSource(source?: string | null): string {
  if (!source || source === "/promo.mp4" || source === LEGACY_DEMO_VIDEO_URL) {
    return BUNDLED_DEMO_VIDEO_URL;
  }
  // A different administrator-selected video must remain the selected video.
  return source;
}
