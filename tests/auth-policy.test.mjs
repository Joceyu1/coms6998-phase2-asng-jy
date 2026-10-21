import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasGoogleIdentity,
  isSuperadminProfile,
} from "../src/lib/auth/policy.ts";
import {
  applicationOrigin,
  isSameOriginPost,
  safeAdminPath,
} from "../src/lib/auth/redirects.ts";

function googleUser(overrides = {}) {
  return {
    app_metadata: { provider: "google" },
    identities: [{ provider: "google" }],
    user_metadata: {},
    ...overrides,
  };
}

describe("Google identity policy", () => {
  it("accepts a server-verified Google provider with a Google identity", () => {
    assert.equal(hasGoogleIdentity(googleUser()), true);
  });

  it("never treats user-editable provider or superadmin claims as authorization", () => {
    const forged = googleUser({
      app_metadata: { provider: "email" },
      user_metadata: { provider: "google", is_superadmin: true },
    });
    assert.equal(hasGoogleIdentity(forged), false);
    assert.equal(isSuperadminProfile(forged, "admin-id"), false);
  });

  it("denies a Google provider without its verified identity", () => {
    for (const identities of [undefined, [], [{ provider: "github" }]]) {
      assert.equal(hasGoogleIdentity(googleUser({ identities })), false);
    }
  });

  it("denies another primary provider even when Google is linked", () => {
    for (const provider of [undefined, "email", "github"]) {
      assert.equal(
        hasGoogleIdentity(googleUser({ app_metadata: { provider } })),
        false,
      );
    }
  });
});

describe("database superadmin policy", () => {
  it("allows only the authenticated user's row with a boolean true flag", () => {
    assert.equal(
      isSuperadminProfile({ id: "admin-id", is_superadmin: true }, "admin-id"),
      true,
    );
  });

  it("fails closed for missing rows, missing flags, and truthy impostors", () => {
    for (const profile of [
      null,
      undefined,
      {},
      { id: "admin-id" },
      ...[false, null, undefined, "true", "TRUE", 1, {}, []].map((flag) => ({
        id: "admin-id",
        is_superadmin: flag,
      })),
    ]) {
      assert.equal(isSuperadminProfile(profile, "admin-id"), false);
    }
  });

  it("rejects another user's true superadmin flag", () => {
    assert.equal(
      isSuperadminProfile({ id: "another-user", is_superadmin: true }, "admin-id"),
      false,
    );
  });
});

describe("post-login destinations", () => {
  it("preserves nested admin routes and query parameters", () => {
    assert.equal(safeAdminPath("/admin"), "/admin");
    assert.equal(
      safeAdminPath("/admin/media/123?view=edit&page=2"),
      "/admin/media/123?view=edit&page=2",
    );
  });

  it("rejects external, protocol-relative, and backslash destinations", () => {
    for (const destination of [
      "https://evil.example/admin",
      "//evil.example/admin",
      "javascript:alert(1)",
      "/\\evil.example/admin",
      "/admin\\..\\login",
    ]) {
      assert.equal(safeAdminPath(destination), "/admin");
    }
  });

  it("rejects sibling routes and normalized traversal outside admin", () => {
    for (const destination of [
      "/administrator",
      "/admin/../login",
      "/admin/%2e%2e/login",
      "/admin/%2E%2E/%2E%2E/login",
      "/admin%2fsettings",
      "%2f%2fevil.example",
      null,
      undefined,
      123,
    ]) {
      assert.equal(safeAdminPath(destination), "/admin");
    }
  });
});

describe("login and logout request origin", () => {
  const destination = "https://admin.example/auth/login";

  it("accepts a POST with the exact application origin", () => {
    assert.equal(
      isSameOriginPost(
        new Request(destination, {
          method: "POST",
          headers: { Origin: "https://admin.example" },
        }),
      ),
      true,
    );
  });

  it("rejects absent, null, sibling, deceptive, and wrong-port origins", () => {
    for (const origin of [
      undefined,
      "null",
      "https://evil.example",
      "https://admin.example.evil.example",
      "https://admin.example:444",
      "http://admin.example",
    ]) {
      assert.equal(
        isSameOriginPost(
          new Request(destination, {
            method: "POST",
            headers: origin === undefined ? {} : { Origin: origin },
          }),
        ),
        false,
      );
    }
  });

  it("does not accept a forged forwarded header in place of Origin", () => {
    assert.equal(
      isSameOriginPost(
        new Request(destination, {
          method: "POST",
          headers: {
            Origin: "https://evil.example",
            "X-Forwarded-Host": "admin.example",
            "Sec-Fetch-Site": "same-origin",
          },
        }),
      ),
      false,
    );
  });

  it("rejects GET requests even with a matching origin", () => {
    assert.equal(
      isSameOriginPost(
        new Request(destination, {
          headers: { Origin: "https://admin.example" },
        }),
      ),
      false,
    );
  });

  it("uses the actual Host when Next normalizes request.url to localhost", () => {
    const request = new Request("http://localhost:3200/auth/login", {
      method: "POST",
      headers: {
        Host: "127.0.0.1:3200",
        Origin: "http://127.0.0.1:3200",
      },
    });
    assert.equal(applicationOrigin(request), "http://127.0.0.1:3200");
    assert.equal(isSameOriginPost(request), true);
    assert.equal(
      new URL("/auth/callback", applicationOrigin(request)).toString(),
      "http://127.0.0.1:3200/auth/callback",
    );
  });

  it("rejects the normalized localhost origin when actual Host is 127.0.0.1", () => {
    assert.equal(
      isSameOriginPost(new Request("http://localhost:3200/auth/login", {
        method: "POST",
        headers: { Host: "127.0.0.1:3200", Origin: "http://localhost:3200" },
      })),
      false,
    );
  });

  it("ignores forwarded host and protocol when calculating redirects and origin", () => {
    const headers = {
      Host: "127.0.0.1:3200",
      "X-Forwarded-Host": "evil.example",
      "X-Forwarded-Proto": "https",
      Forwarded: "host=evil.example;proto=https",
    };
    assert.equal(
      applicationOrigin(new Request("http://localhost:3200/auth/callback", { headers })),
      "http://127.0.0.1:3200",
    );
    assert.equal(
      isSameOriginPost(new Request("http://localhost:3200/auth/login", {
        method: "POST",
        headers: { ...headers, Origin: "https://evil.example" },
      })),
      false,
    );
  });

  it("fails closed for malformed actual Host instead of falling back to request.url", () => {
    for (const host of [
      "", "user@admin.example", "admin.example/elsewhere", "admin.example\\evil",
      "admin.example,evil.example", "admin.example?next=evil", "admin.example#fragment",
      "admin.example:65536", "admin.example:", "admin..example", "-admin.example",
    ]) {
      const request = new Request(destination, {
        method: "POST",
        headers: { Host: host, Origin: "https://admin.example" },
      });
      assert.equal(applicationOrigin(request), null, host);
      assert.equal(isSameOriginPost(request), false, host);
    }
  });

  it("preserves valid production and bracketed IPv6 hosts and ports", () => {
    assert.equal(
      applicationOrigin(new Request(destination, { headers: { Host: "admin.example:8443" } })),
      "https://admin.example:8443",
    );
    assert.equal(
      applicationOrigin(new Request("http://localhost/auth/login", { headers: { Host: "[::1]:3200" } })),
      "http://[::1]:3200",
    );
  });
});
