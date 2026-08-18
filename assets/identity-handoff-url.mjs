const DEFAULT_ZONEBUILDER_APP_URL = "https://scott-hertzog.github.io/zonebuilder-stage/";
const IDENTITY_HANDOFF_TOKEN_PARAM = "zb_handoff";

export function getSafeZoneBuilderLaunchUrl(candidate, appUrl = DEFAULT_ZONEBUILDER_APP_URL) {
  try {
    const base = new URL(appUrl);
    const url = new URL(String(candidate || ""));
    const token = String(url.searchParams.get(IDENTITY_HANDOFF_TOKEN_PARAM) || "");
    const paramNames = Array.from(url.searchParams.keys());
    if (
      url.origin !== base.origin
      || url.pathname !== base.pathname
      || url.hash
      || paramNames.length !== 1
      || paramNames[0] !== IDENTITY_HANDOFF_TOKEN_PARAM
      || !/^zbh_[A-Za-z0-9_-]{32,160}$/.test(token)
    ) return "";
    return url.toString();
  } catch (_) {
    return "";
  }
}

export { DEFAULT_ZONEBUILDER_APP_URL, IDENTITY_HANDOFF_TOKEN_PARAM };
