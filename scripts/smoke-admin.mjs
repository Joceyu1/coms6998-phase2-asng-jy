import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { resourceKeys } from "../src/lib/admin/resource-registry.ts";

const base = new URL(process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000");
const localConfig = existsSync(".env.local") ? parseEnv(readFileSync(".env.local", "utf8")) : {};
const configuredSupabaseUrl = localConfig.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.ok(["http:", "https:"].includes(base.protocol));
const request = (path, options = {}) => fetch(new URL(path, base), { redirect: "manual", ...options });
let checks = 0;
function pass(message) { checks += 1; console.log(`PASS ${message}`); }

const login = await request("/login");
assert.equal(login.status, 200);
const html = await login.text();
assert.ok(html.includes("Continue with Google") && html.includes("Welcome to Prism"));
pass("public login renders Google sign-in");

const testId = "22d08406-af74-4e95-8bd8-0fa24ffde26a";
const protectedPaths = ["/admin", "/admin/profiles", "/admin/ratings", "/admin/media", "/admin/media/new", `/admin/media/${testId}`, `/admin/media/${testId}/edit`, "/admin/private.svg", "/admin/prompt-chain-mix", "/admin/images", "/admin/images/new", `/admin/images/${testId}`, `/admin/images/${testId}/edit`, ...resourceKeys.flatMap((key) => [`/admin/${key}`, `/admin/${key}/new`, `/admin/${key}/${testId}`, `/admin/${key}/${testId}/edit`])];
for (const path of protectedPaths) {
  const response = await request(path);
  assert.equal(response.status, 307, path);
  const location = new URL(response.headers.get("location"), base);
  assert.equal(location.origin, base.origin); assert.equal(location.pathname, "/login");
  assert.ok(response.headers.get("cache-control")?.includes("no-store"));
  pass(`anonymous ${path} is redirected before rendering`);
}

for (const path of ["/auth/login", "/auth/signout"]) {
  for (const origin of [undefined, "https://attacker.invalid"]) {
    const response = await request(path, { method: "POST", headers: origin ? { Origin: origin } : {} });
    assert.equal(response.status, 403); pass(`${path} rejects ${origin ? "cross-origin" : "missing-origin"} POST`);
  }
  assert.equal((await request(path)).status, 405); pass(`${path} rejects GET`);
}

const callback = await request("/auth/callback");
assert.equal(callback.status, 303);
assert.equal(new URL(callback.headers.get("location"), base).pathname, "/login");
pass("callback without authorization code fails closed");

const oauth = await request("/auth/login", { method: "POST", headers: { Origin: base.origin, "Content-Type": "application/x-www-form-urlencoded" }, body: "next=%2F%2Fevil.invalid" });
assert.equal(oauth.status, 303);
const oauthLocation = new URL(oauth.headers.get("location"), base);
if (oauthLocation.origin === base.origin) {
  assert.equal(oauthLocation.pathname, "/login");
  assert.ok(["google_disabled", "configuration", "oauth_unavailable"].includes(oauthLocation.searchParams.get("error")));
  pass(`OAuth unavailable state is handled safely (${oauthLocation.searchParams.get("error")}); live OAuth remains unverified`);
} else {
  const configured = new URL(configuredSupabaseUrl);
  assert.equal(oauthLocation.origin, configured.origin);
  assert.equal(oauthLocation.pathname, "/auth/v1/authorize");
  assert.equal(oauthLocation.searchParams.get("provider"), "google");
  const returnTo = new URL(oauthLocation.searchParams.get("redirect_to"));
  assert.equal(returnTo.origin, base.origin); assert.equal(returnTo.pathname, "/auth/callback");
  assert.equal(returnTo.search, "", "OAuth callback must match the exact Supabase allowlist URL without a query string");
  assert.equal(returnTo.hash, "");
  pass("OAuth starts with Google and a safe application callback; browser sign-in remains unverified");
}

if (configuredSupabaseUrl) {
  const ref = new URL(configuredSupabaseUrl).hostname.split(".")[0];
  const fake = { access_token: "forged-token", refresh_token: "forged-refresh", expires_at: Math.floor(Date.now() / 1000) + 3600, user: { id: "22d08406-af74-4e95-8bd8-0fa24ffde26a", app_metadata: { provider: "google" }, user_metadata: { is_superadmin: true }, identities: [{ provider: "google" }] } };
  const cookie = `sb-${ref}-auth-token=base64-${Buffer.from(JSON.stringify(fake)).toString("base64url")}`;
  const response = await request("/admin", { headers: { Cookie: cookie } });
  assert.equal(response.status, 307);
  assert.equal(new URL(response.headers.get("location"), base).pathname, "/login");
  pass("forged browser session and role metadata do not grant access");
}

console.log(`${checks} HTTP checks passed. Authenticated CRUD still requires approved database setup and a real Google superadmin.`);
