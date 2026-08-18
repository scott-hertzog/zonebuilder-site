import assert from "node:assert/strict";

const stageBase = "https://scott-hertzog.github.io/zonebuilder-stage/";
const tokenUrl = (character) => `${stageBase}?zb_handoff=zbh_${character.repeat(64)}`;

class MemoryStorage {
  constructor(values = {}) {
    this.values = new Map(Object.entries(values));
  }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  dump() { return Object.fromEntries(this.values); }
}

class FakeElement {
  constructor({ text = "", value = "" } = {}) {
    this.textContent = text;
    this.value = value;
    this.hidden = false;
    this.disabled = false;
    this.listeners = new Map();
    this.attributes = new Map();
    this.classList = { add() {}, remove() {} };
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  async dispatch(type, event = {}) {
    event.target ||= this;
    await Promise.all((this.listeners.get(type) || []).map((listener) => listener(event)));
  }
  focus() {}
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  reset() {
    Object.values(this.formFields || {}).forEach((field) => { field.value = ""; });
  }
  querySelector(selector) { return this.formFields?.[selector] || null; }
}

function installLandingEnvironment({ remembered = false, responses = {} } = {}) {
  const enter = new FakeElement({ text: "Enter the Zone" });
  const modal = new FakeElement();
  modal.hidden = true;
  const form = new FakeElement();
  const nameInput = new FakeElement({ value: remembered ? "Remembered User" : "" });
  nameInput.id = "registration-name";
  const emailInput = new FakeElement({ value: remembered ? "remembered@example.test" : "" });
  emailInput.id = "registration-email";
  const submit = new FakeElement({ text: "Enter the Zone" });
  form.formFields = {
    'input[name="name"]': nameInput,
    'input[type="email"]': emailInput,
    'button[type="submit"]': submit,
  };
  const intro = new FakeElement();
  const result = new FakeElement();
  result.hidden = true;
  const title = new FakeElement();
  const message = new FakeElement();
  const error = new FakeElement();
  error.hidden = true;
  const launch = new FakeElement({ text: "Launch ZoneBuilder" });
  const resend = new FakeElement({ text: "Resend Welcome Email" });
  const forget = new FakeElement({ text: "Forget this browser" });
  const fieldErrors = {
    "registration-name": new FakeElement(),
    "registration-email": new FakeElement(),
  };
  const selectorMap = new Map([
    ["[data-registration-modal]", modal],
    ["[data-registration-form]", form],
    ["#registration-name", nameInput],
    ["#registration-email", emailInput],
    ["[data-registration-error]", error],
    ["[data-registration-intro]", intro],
    ["[data-registration-result]", result],
    ["[data-registration-result-title]", title],
    ["[data-registration-result-message]", message],
  ]);
  const listMap = new Map([
    ["[data-enter-zone]", [enter]],
    ["[data-validation-field]", [nameInput, emailInput]],
    ["[data-registration-cancel]", []],
    ["[data-launch-zonebuilder]", [launch]],
    ["[data-resend-welcome-email]", [resend]],
    ["[data-forget-registration]", [forget]],
    ["[data-install-trigger]", []],
  ]);
  const storage = new MemoryStorage(remembered ? {
    zonebuilderAlphaRegistered: "true",
    zonebuilderAlphaEmail: "remembered@example.test",
    zonebuilderAlphaName: "Remembered User",
  } : {});
  const assigned = [];
  const requests = [];
  const actionResponses = Object.fromEntries(
    Object.entries(responses).map(([action, values]) => [action, values.slice()])
  );

  globalThis.document = {
    activeElement: null,
    body: new FakeElement(),
    querySelector(selector) {
      const fieldMatch = selector.match(/^\[data-field-error-for="(.+)"\]$/);
      return fieldMatch ? fieldErrors[fieldMatch[1]] : selectorMap.get(selector) || null;
    },
    querySelectorAll(selector) { return listMap.get(selector) || []; },
  };
  globalThis.window = {
    location: { assign(url) { assigned.push(url); } },
    setTimeout(callback) { callback(); },
    addEventListener() {},
  };
  globalThis.localStorage = storage;
  globalThis.sessionStorage = new MemoryStorage();
  Object.defineProperty(globalThis, "navigator", {
    value: { userAgent: "ZoneBuilder local test" },
    configurable: true,
  });
  globalThis.fetch = async (_url, options) => {
    const payload = JSON.parse(options.body);
    requests.push(payload);
    const queue = actionResponses[payload.action || payload.type] || [];
    const response = queue.length ? queue.shift() : { ok: true, success: true };
    return {
      ok: true,
      status: 200,
      async text() { return JSON.stringify(response); },
    };
  };

  return {
    enter, modal, form, nameInput, emailInput, title, message, launch, resend,
    storage, assigned, requests,
  };
}

{
  const env = installLandingEnvironment({
    remembered: true,
    responses: {
      requestIdentityHandoff: [
        { ok: true, launchUrl: tokenUrl("a") },
        { ok: true, launchUrl: tokenUrl("b") },
        { ok: true, launchUrl: `https://example.test/?zb_handoff=zbh_${"c".repeat(64)}` },
        { ok: false, message: "unavailable" },
        { ok: true, launchUrl: tokenUrl("d") },
      ],
    },
  });
  await import(`../assets/landing.js?remembered=${Date.now()}`);

  await env.enter.dispatch("click");
  assert.equal(env.modal.hidden, false);
  assert.equal(env.title.textContent, "Welcome back");
  assert.match(env.message.textContent, /remembered@example\.test/);

  await env.launch.dispatch("click");
  await env.launch.dispatch("click");
  const handoffRequests = () => env.requests.filter((request) => request.action === "requestIdentityHandoff");
  assert.equal(handoffRequests().length, 2);
  assert.equal(handoffRequests()[0].email, "remembered@example.test");
  assert.deepEqual(env.assigned, [tokenUrl("a"), tokenUrl("b")]);
  assert(!JSON.stringify(env.storage.dump()).includes("zbh_"));

  await env.launch.dispatch("click");
  assert.equal(env.assigned.length, 2);
  assert.equal(env.title.textContent, "Secure launch unavailable");
  assert.equal(env.launch.disabled, false);

  await env.launch.dispatch("click");
  assert.equal(env.assigned.length, 2);
  assert.equal(env.title.textContent, "Secure launch unavailable");

  await env.launch.dispatch("click");
  assert.equal(handoffRequests().length, 5);
  assert.equal(env.assigned.at(-1), tokenUrl("d"));
  assert(!JSON.stringify(env.storage.dump()).includes("zbh_"));
}

{
  const env = installLandingEnvironment({
    responses: {
      signup: [{ ok: true, status: "new", launchUrl: tokenUrl("e") }],
      resendWelcomeEmail: [{ ok: true, status: "resent", launchUrl: tokenUrl("f") }],
    },
  });
  await import(`../assets/landing.js?signup=${Date.now()}`);

  await env.enter.dispatch("click");
  env.nameInput.value = "New User";
  env.emailInput.value = "new@example.test";
  await env.form.dispatch("submit", { preventDefault() {} });
  await env.launch.dispatch("click");
  assert.equal(env.assigned.at(-1), tokenUrl("e"));
  assert.equal(env.requests.filter((request) => request.action === "requestIdentityHandoff").length, 0);

  await env.resend.dispatch("click");
  await env.launch.dispatch("click");
  assert.equal(env.assigned.at(-1), tokenUrl("f"));
  assert.equal(env.requests.filter((request) => request.action === "requestIdentityHandoff").length, 0);
  assert(!JSON.stringify(env.storage.dump()).includes("zbh_"));
}

console.log("site remembered launch flow tests passed");
