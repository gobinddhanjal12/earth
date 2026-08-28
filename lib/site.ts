const FALLBACK_SITE_URL = "http://localhost:3000";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  const vercelProductionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProductionHost) {
    return `https://${vercelProductionHost.replace(/\/$/, "")}`;
  }

  const vercelPreviewHost = process.env.VERCEL_URL?.trim();
  if (vercelPreviewHost) {
    return `https://${vercelPreviewHost.replace(/\/$/, "")}`;
  }

  return FALLBACK_SITE_URL;
}

export const siteName = "The Living Planet";
export const siteTitle = "The Living Planet — An Interactive Earth Story";
export const siteDescription =
  "Explore Earth’s surface, interior, and atmosphere through an interactive Three.js journey.";
