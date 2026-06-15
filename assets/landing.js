import { sendSignup, trackEvent } from "./analytics.js";

const ZONEBUILDER_APP_URL = "https://scott-hertzog.github.io/zonebuilder-pwa/";
// Keep this as waitlist_signup until the collector whitelist includes registration_submitted.
const REGISTRATION_EVENT_NAME = "waitlist_signup";

const enterZoneButtons = document.querySelectorAll("[data-enter-zone]");
const registrationModal = document.querySelector("[data-registration-modal]");
const registrationForm = document.querySelector("[data-registration-form]");
const registrationEmailInput = document.querySelector("#registration-email");
const registrationError = document.querySelector("[data-registration-error]");
const registrationCancelButtons = document.querySelectorAll("[data-registration-cancel]");
const installTriggers = document.querySelectorAll("[data-install-trigger]");

let deferredInstallPrompt = null;
let previousFocus = null;

trackEvent("landing_page_view");

function openRegistrationModal() {
  if (!registrationModal) {
    return;
  }

  previousFocus = document.activeElement;
  registrationModal.hidden = false;
  document.body.classList.add("modal-open");
  if (registrationError) {
    registrationError.hidden = true;
  }

  window.setTimeout(() => {
    registrationEmailInput?.focus();
  }, 0);
}

function closeRegistrationModal() {
  if (!registrationModal) {
    return;
  }

  registrationModal.hidden = true;
  document.body.classList.remove("modal-open");
  if (registrationError) {
    registrationError.hidden = true;
  }

  if (previousFocus && typeof previousFocus.focus === "function") {
    previousFocus.focus();
  }
}

function launchZoneBuilder() {
  if (!ZONEBUILDER_APP_URL) {
    console.warn("[ZoneBuilder] Missing ZONEBUILDER_APP_URL.");
    return;
  }

  window.location.assign(ZONEBUILDER_APP_URL);
}

async function submitRegistration(form, metadata = {}) {
  const emailInput = form.querySelector('input[type="email"]');
  const email = emailInput?.value.trim();
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton?.textContent;

  if (!email) {
    if (registrationError && form.classList.contains("registration-form")) {
      registrationError.hidden = false;
    }
    emailInput?.focus();
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Registering...";
  }

  const signupResult = await sendSignup(email, {
    ...metadata,
    form: metadata.form || "registration",
  });

  if (signupResult.ok) {
    await trackEvent(REGISTRATION_EVENT_NAME, {
      ...metadata,
      form: metadata.form || "registration",
    });
    form.reset();
    closeRegistrationModal();
    launchZoneBuilder();
  }

  if (submitButton) {
    submitButton.disabled = false;
    submitButton.textContent = originalButtonText;
  }
}

enterZoneButtons.forEach((button) => {
  button.addEventListener("click", () => {
    openRegistrationModal();
    void trackEvent("install_button_clicked", {
      cta: button.textContent.trim(),
    });
  });
});

registrationCancelButtons.forEach((button) => {
  button.addEventListener("click", closeRegistrationModal);
});

registrationModal?.addEventListener("click", (event) => {
  if (event.target === registrationModal) {
    closeRegistrationModal();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !registrationModal?.hidden) {
    closeRegistrationModal();
  }
});

registrationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  await submitRegistration(registrationForm, {
    location: "modal",
  });
});

window.addEventListener("beforeinstallprompt", (event) => {
  deferredInstallPrompt = event;
  trackEvent("install_prompt_shown");
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  trackEvent("install_completed", {
    method: "appinstalled",
  });
});

installTriggers.forEach((button) => {
  button.addEventListener("click", async () => {
    await trackEvent("install_button_clicked");

    if (!deferredInstallPrompt) {
      return;
    }

    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;

    if (choice?.outcome === "accepted") {
      trackEvent("install_completed", {
        method: "native_prompt",
      });
    }

    deferredInstallPrompt = null;
  });
});
