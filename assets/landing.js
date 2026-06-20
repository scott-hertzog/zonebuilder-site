import { resendWelcomeEmail, sendSignup, trackEvent } from "./analytics.js?v=landing-static-7";

const ZONEBUILDER_APP_URL = "https://scott-hertzog.github.io/zonebuilder-pwa/";
// Keep this as waitlist_signup until the collector whitelist includes registration_submitted.
const REGISTRATION_EVENT_NAME = "waitlist_signup";
const ALPHA_REGISTERED_STORAGE_KEY = "zonebuilderAlphaRegistered";
const ALPHA_REGISTERED_EMAIL_KEY = "zonebuilderAlphaEmail";
const ALPHA_REGISTERED_NAME_KEY = "zonebuilderAlphaName";

const enterZoneButtons = document.querySelectorAll("[data-enter-zone]");
const registrationModal = document.querySelector("[data-registration-modal]");
const registrationForm = document.querySelector("[data-registration-form]");
const registrationNameInput = document.querySelector("#registration-name");
const registrationEmailInput = document.querySelector("#registration-email");
const registrationError = document.querySelector("[data-registration-error]");
const validationFields = document.querySelectorAll("[data-validation-field]");
const registrationCancelButtons = document.querySelectorAll("[data-registration-cancel]");
const registrationIntro = document.querySelector("[data-registration-intro]");
const registrationResult = document.querySelector("[data-registration-result]");
const registrationResultTitle = document.querySelector("[data-registration-result-title]");
const registrationResultMessage = document.querySelector("[data-registration-result-message]");
const launchButtons = document.querySelectorAll("[data-launch-zonebuilder]");
const resendButtons = document.querySelectorAll("[data-resend-welcome-email]");
const editRegistrationButtons = document.querySelectorAll("[data-edit-registration-email]");
const installTriggers = document.querySelectorAll("[data-install-trigger]");

let deferredInstallPrompt = null;
let previousFocus = null;

trackEvent("landing_page_view");

function getStoredRegistrationEmail() {
  try {
    return localStorage.getItem(ALPHA_REGISTERED_EMAIL_KEY) || "";
  } catch (error) {
    return "";
  }
}

function getStoredRegistrationName() {
  try {
    return localStorage.getItem(ALPHA_REGISTERED_NAME_KEY) || "";
  } catch (error) {
    return "";
  }
}

function hasStoredRegistration() {
  try {
    return localStorage.getItem(ALPHA_REGISTERED_STORAGE_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function storeRegistration(email, name = "") {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

  try {
    localStorage.setItem(ALPHA_REGISTERED_STORAGE_KEY, "true");
    localStorage.setItem(ALPHA_REGISTERED_EMAIL_KEY, normalizedEmail);
    if (normalizedName) {
      localStorage.setItem(ALPHA_REGISTERED_NAME_KEY, normalizedName);
    }
  } catch (error) {
    console.warn("[ZoneBuilder] Could not store registration state.", error);
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setRegistrationError(message) {
  if (!registrationError) {
    return;
  }

  registrationError.textContent = message;
  registrationError.hidden = false;
}

function getFieldError(input) {
  if (!input?.id) {
    return null;
  }

  return document.querySelector(`[data-field-error-for="${input.id}"]`);
}

function setFieldError(input, message) {
  const fieldError = getFieldError(input);

  if (fieldError) {
    fieldError.textContent = message;
    fieldError.hidden = false;
  }

  input?.setAttribute("aria-invalid", "true");
}

function clearFieldError(input) {
  const fieldError = getFieldError(input);

  if (fieldError) {
    fieldError.hidden = true;
  }

  input?.removeAttribute("aria-invalid");
}

function clearFieldErrors() {
  validationFields.forEach(clearFieldError);
}

function trackSignupValidationError(reason, metadata = {}) {
  return trackEvent(`signup_validation_error_${reason}`, {
    ...metadata,
    validationReason: reason,
  });
}

function buildSignupMetadata(metadata = {}, { name = "", email = "" } = {}) {
  return {
    ...metadata,
    form: metadata.form || "registration",
    name,
    email,
  };
}

function clearRegistrationError() {
  if (!registrationError) {
    return;
  }

  registrationError.hidden = true;
}

function showRegistrationForm() {
  if (registrationIntro) {
    registrationIntro.hidden = false;
  }

  if (registrationForm) {
    registrationForm.hidden = false;
  }

  if (registrationResult) {
    registrationResult.hidden = true;
  }

  clearRegistrationError();
  clearFieldErrors();
}

function showRegistrationFormForEmailUpdate() {
  showRegistrationForm();

  if (registrationEmailInput) {
    registrationEmailInput.value = getStoredRegistrationEmail();
    registrationEmailInput.focus();
  }
}

function showRegistrationResult({ title, message, canResend = false }) {
  if (registrationIntro) {
    registrationIntro.hidden = true;
  }

  if (registrationForm) {
    registrationForm.hidden = true;
  }

  if (registrationResultTitle) {
    registrationResultTitle.textContent = title;
  }

  if (registrationResultMessage) {
    registrationResultMessage.textContent = message;
  }

  resendButtons.forEach((button) => {
    button.hidden = !canResend;
  });

  if (registrationResult) {
    registrationResult.hidden = false;
  }
}

function openRegistrationModal() {
  if (!registrationModal) {
    return;
  }

  previousFocus = document.activeElement;
  registrationModal.hidden = false;
  document.body.classList.add("modal-open");

  if (hasStoredRegistration()) {
    showRegistrationResult({
      title: "Welcome back",
      message: "You can launch ZoneBuilder Alpha from here.",
      canResend: Boolean(getStoredRegistrationEmail()),
    });
  } else {
    showRegistrationForm();
  }

  window.setTimeout(() => {
    if (registrationForm?.hidden) {
      launchButtons[0]?.focus();
    } else {
      registrationNameInput?.focus();
    }
  }, 0);
}

function closeRegistrationModal() {
  if (!registrationModal) {
    return;
  }

  registrationModal.hidden = true;
  document.body.classList.remove("modal-open");
  clearRegistrationError();
  clearFieldErrors();

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

function getBackendValidationReason(result) {
  const reason = result?.reason || result?.code || result?.status || "";
  const normalizedReason = String(reason).toLowerCase();

  if (normalizedReason.includes("missing_name") || normalizedReason.includes("name_required")) {
    return "missing_name";
  }

  if (normalizedReason.includes("missing_email") || normalizedReason.includes("email_required")) {
    return "missing_email";
  }

  if (normalizedReason.includes("invalid_email")) {
    return "invalid_email";
  }

  return "";
}

function showBackendValidationError(reason) {
  if (reason === "missing_name") {
    setFieldError(registrationNameInput, "Please enter your name.");
    registrationNameInput?.focus();
    return true;
  }

  if (reason === "missing_email") {
    setFieldError(registrationEmailInput, "Please enter your email address.");
    registrationEmailInput?.focus();
    return true;
  }

  if (reason === "invalid_email") {
    setFieldError(registrationEmailInput, "Please enter a valid email address.");
    registrationEmailInput?.focus();
    return true;
  }

  return false;
}

async function submitRegistration(form, metadata = {}) {
  const nameInput = form.querySelector('input[name="name"]');
  const emailInput = form.querySelector('input[type="email"]');
  const name = nameInput?.value.trim() || "";
  const email = emailInput?.value.trim().toLowerCase();
  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton?.textContent;
  const signupMetadata = buildSignupMetadata(metadata, { name, email });
  let firstInvalidField = null;

  clearRegistrationError();
  clearFieldErrors();

  if (!name) {
    setFieldError(nameInput, "Please enter your name.");
    firstInvalidField = firstInvalidField || nameInput;
    void trackSignupValidationError("missing_name", signupMetadata);
  }

  if (!email) {
    setFieldError(emailInput, "Please enter your email address.");
    firstInvalidField = firstInvalidField || emailInput;
    void trackSignupValidationError("missing_email", signupMetadata);
  } else if (!isValidEmail(email)) {
    setFieldError(emailInput, "Please enter a valid email address.");
    firstInvalidField = firstInvalidField || emailInput;
    void trackSignupValidationError("invalid_email", signupMetadata);
  }

  if (firstInvalidField) {
    firstInvalidField.focus();
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Registering...";
  }

  const signupResult = await sendSignup({
    name,
    email,
  }, signupMetadata);

  if (signupResult.ok) {
    const responseStatus = signupResult.status || "new";
    const isKnownStatus = responseStatus === "new" || responseStatus === "existing";
    const status = responseStatus === "existing" ? "existing" : "new";
    const isExisting = status === "existing";

    await trackEvent(REGISTRATION_EVENT_NAME, {
      ...signupMetadata,
      signupStatus: responseStatus,
    });
    await trackEvent(isExisting ? "alpha_signup_existing" : "alpha_signup_new", {
      ...signupMetadata,
      signupStatus: responseStatus,
    });
    storeRegistration(email, name);
    form.reset();
    showRegistrationResult({
      title: isExisting
        ? "Welcome back"
        : isKnownStatus
          ? "Welcome to ZoneBuilder Alpha"
          : "Registration received",
      message: isExisting
        ? "You are already registered. Launch ZoneBuilder whenever you are ready."
        : isKnownStatus
          ? "We emailed you a direct launch link."
          : "You can launch ZoneBuilder Alpha. If your email does not arrive, resend the launch link.",
      canResend: true,
    });
  } else {
    const backendValidationReason = getBackendValidationReason(signupResult);

    if (showBackendValidationError(backendValidationReason)) {
      await trackSignupValidationError(backendValidationReason, {
        ...signupMetadata,
        validationSource: "backend",
      });
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
      return;
    }

    await trackEvent("signup_error", {
      ...signupMetadata,
      reason: signupResult.skipped ? "missing_endpoint" : "request_failed",
      signupStatus: signupResult.status || "unknown",
    });
    setRegistrationError("Registration could not be completed. You can try again in a moment.");
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
      location: "enter-zone",
      email: getStoredRegistrationEmail() || undefined,
    });
  });
});

launchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    void trackEvent("launch_button_clicked", {
      cta: button.textContent.trim(),
      location: "registration-modal",
      email: getStoredRegistrationEmail() || undefined,
      name: getStoredRegistrationName() || undefined,
    });
    launchZoneBuilder();
  });
});

editRegistrationButtons.forEach((button) => {
  button.addEventListener("click", showRegistrationFormForEmailUpdate);
});

resendButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const email = (getStoredRegistrationEmail() || registrationEmailInput?.value.trim() || "").toLowerCase();

    if (!email) {
      setRegistrationError("Enter your email again to resend the launch link.");
      showRegistrationForm();
      return;
    }

    if (!isValidEmail(email)) {
      setRegistrationError("Enter a valid email address.");
      showRegistrationFormForEmailUpdate();
      return;
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Resending...";

    await trackEvent("welcome_email_resent_request", {
      location: "modal",
      email,
    });

    const resendResult = await resendWelcomeEmail(email, {
      location: "modal",
      email,
    });

    if (resendResult.ok) {
      showRegistrationResult({
        title: "Launch link resent.",
        message: "Check your inbox for the ZoneBuilder Alpha launch link.",
        canResend: true,
      });
    } else {
      showRegistrationResult({
        title: "Could not resend yet",
        message: resendResult.message || "Please sign up first, then request another launch link.",
        canResend: false,
      });
    }

    button.disabled = false;
    button.textContent = originalText;
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

validationFields.forEach((field) => {
  field.addEventListener("input", () => {
    clearFieldError(field);
    clearRegistrationError();
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
