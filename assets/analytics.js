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

    const responseText = await response.text();
    let responseData = {};

    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch (error) {
        responseData = { rawResponse: responseText };
      }
    }

    if (!response.ok) {
      console.warn("[ZoneBuilder analytics] Request failed.", response.status, responseData);
      return {
        ok: false,
        httpStatus: response.status,
        ...responseData,
      };
    }

    return { ok: true, ...responseData };
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

export async function sendSignup({ name = "", email }, metadata = {}) {
  return postAnalyticsPayload({
    action: "signup",
    type: "signup",
    eventName: "waitlist_signup",
    name,
    email,
    metadata: buildMetadata(metadata),
  });
}

export async function resendWelcomeEmail(email, metadata = {}) {
  return postAnalyticsPayload({
    action: "resendWelcomeEmail",
    type: "resendWelcomeEmail",
    eventName: "welcome_email_resent_request",
    email,
    metadata: buildMetadata(metadata),
  });
}
