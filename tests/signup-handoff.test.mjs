import assert from "node:assert/strict";
import fs from "node:fs";
import { getSafeZoneBuilderLaunchUrl } from "../assets/identity-handoff-url.mjs";

const token = `zbh_${"a".repeat(64)}`;
const safe = getSafeZoneBuilderLaunchUrl(`https://scott-hertzog.github.io/zonebuilder-stage/?zb_handoff=${token}`);
assert.equal(safe, `https://scott-hertzog.github.io/zonebuilder-stage/?zb_handoff=${token}`);
assert.equal(getSafeZoneBuilderLaunchUrl("https://example.test/?zb_handoff=" + token), "");
assert.equal(getSafeZoneBuilderLaunchUrl(`https://scott-hertzog.github.io/zonebuilder-stage/?zb_handoff=${token}&email=tom@example.test`), "");
assert.equal(getSafeZoneBuilderLaunchUrl("https://scott-hertzog.github.io/zonebuilder-stage/?email=tom@example.test"), "");
assert.ok(!token.includes("tom"));

const landing = fs.readFileSync(new URL("../assets/landing.js", import.meta.url), "utf8");
assert.match(landing, /pendingZoneBuilderLaunchUrl = getSafeZoneBuilderLaunchUrl\(signupResult\.launchUrl\)/);
assert.match(landing, /pendingZoneBuilderLaunchUrl = getSafeZoneBuilderLaunchUrl\(resendResult\.launchUrl\)/);
assert.match(landing, /window\.location\.assign\(safeHandoffUrl \|\| ZONEBUILDER_APP_URL\)/);

console.log("site signup handoff tests passed");
