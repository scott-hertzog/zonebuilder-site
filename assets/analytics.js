// Paste the deployed Apps Script Web App URL here for local and production testing.
export const ANALYTICS_ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbxnxKGRb4p46yPGGMLWOFY5hFCPYWoOl50I9fjOVMw3LtHis1g707R6GYwExf6FPXKHbA/exec";

const DEFAULT_METADATA = {
  source: "landing-page",
  environment: "alpha",
  page: "home",
};

function buildMetadata(metadata = {}) {
  return {
    ...DEFAULT_METADATA,
    userAgent: navigator.userAgent,
    ...metadata,
  };
}

async function postAnalyticsPayload(payload) {
  if (!ANALYTICS_ENDPOINT_URL) {
    console.warn("[ZoneBuilder analytics] Missing ANALYTICS_ENDPOINT_URL.");
    return { ok: false, skipped: true };
  }

  try {
    const response = await fetch(ANALYTICS_ENDPOINT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Analytics request failed with ${response.status}`);
    }

    return { ok: true };
  } catch (error) {
    console.warn("[ZoneBuilder analytics] Event failed.", error);
    return { ok: false, error };
  }
}

export async function trackEvent(eventName, metadata = {}) {
  return postAnalyticsPayload({
    type: "event",
    eventName,
    metadata: buildMetadata(metadata),
  });
}

export async function sendSignup(email, metadata = {}) {
  return postAnalyticsPayload({
    type: "signup",
    eventName: "waitlist_signup",
    email,
    metadata: buildMetadata(metadata),
  });
}
