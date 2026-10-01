import { describe, it, expect } from "vitest";
import {
  isValidVersion,
  parseVersion,
  isFeatureEnabled,
  canAccessRoute,
  getRedirectForDisallowedRoute,
  getUserNav,
  getGuardNav,
  getAdminNav,
  VERSIONS,
} from "./versions";

describe("versions utility", () => {
  it("validates version identifiers correctly", () => {
    expect(isValidVersion("v1")).toBe(true);
    expect(isValidVersion("v2")).toBe(true);
    expect(isValidVersion("v3")).toBe(true);
    expect(isValidVersion("v0")).toBe(false);
    expect(isValidVersion("v4")).toBe(false);
    expect(isValidVersion("")).toBe(false);
    expect(isValidVersion(null)).toBe(false);
    expect(isValidVersion(undefined)).toBe(false);
  });

  it("parses version with fallback", () => {
    expect(parseVersion("v1")).toBe("v1");
    expect(parseVersion("v2")).toBe("v2");
    expect(parseVersion("v3")).toBe("v3");
    expect(parseVersion("other")).toBe("v3");
    expect(parseVersion("other", "v1")).toBe("v1");
  });

  it("enforces incremental feature matrix correctly", () => {
    // Version 1: QR, vehicles, infractions, users, notifications
    expect(isFeatureEnabled("v1", "qr")).toBe(true);
    expect(isFeatureEnabled("v1", "vehicles")).toBe(true);
    expect(isFeatureEnabled("v1", "infractions")).toBe(true);
    expect(isFeatureEnabled("v1", "users")).toBe(true);
    expect(isFeatureEnabled("v1", "notifications")).toBe(true);
    // Version 1 must NOT have access records or parking monitoring
    expect(isFeatureEnabled("v1", "access_records")).toBe(false);
    expect(isFeatureEnabled("v1", "parking_monitoring")).toBe(false);

    // Version 2: Version 1 + access records
    expect(isFeatureEnabled("v2", "qr")).toBe(true);
    expect(isFeatureEnabled("v2", "vehicles")).toBe(true);
    expect(isFeatureEnabled("v2", "infractions")).toBe(true);
    expect(isFeatureEnabled("v2", "access_records")).toBe(true);
    // Version 2 must NOT have parking monitoring
    expect(isFeatureEnabled("v2", "parking_monitoring")).toBe(false);

    // Version 3: Version 2 + parking monitoring (complete)
    expect(isFeatureEnabled("v3", "qr")).toBe(true);
    expect(isFeatureEnabled("v3", "vehicles")).toBe(true);
    expect(isFeatureEnabled("v3", "infractions")).toBe(true);
    expect(isFeatureEnabled("v3", "access_records")).toBe(true);
    expect(isFeatureEnabled("v3", "parking_monitoring")).toBe(true);
  });

  it("controls route access permissions per version", () => {
    // User access records route
    expect(canAccessRoute("v1", "/v1/user/access")).toBe(false);
    expect(canAccessRoute("v2", "/v2/user/access")).toBe(true);
    expect(canAccessRoute("v3", "/v3/user/access")).toBe(true);

    // Guard history route
    expect(canAccessRoute("v1", "/v1/guard/history")).toBe(false);
    expect(canAccessRoute("v2", "/v2/guard/history")).toBe(true);
    expect(canAccessRoute("v3", "/v3/guard/history")).toBe(true);

    // Guard parking occupancy route
    expect(canAccessRoute("v1", "/v1/guard/occupancy")).toBe(false);
    expect(canAccessRoute("v2", "/v2/guard/occupancy")).toBe(false);
    expect(canAccessRoute("v3", "/v3/guard/occupancy")).toBe(true);

    // Admin access route
    expect(canAccessRoute("v1", "/v1/admin/access")).toBe(false);
    expect(canAccessRoute("v2", "/v2/admin/access")).toBe(true);
    expect(canAccessRoute("v3", "/v3/admin/access")).toBe(true);

    // Admin parking blocks route
    expect(canAccessRoute("v1", "/v1/admin/parking")).toBe(false);
    expect(canAccessRoute("v2", "/v2/admin/parking")).toBe(false);
    expect(canAccessRoute("v3", "/v3/admin/parking")).toBe(true);

    // Common routes available in all versions
    expect(canAccessRoute("v1", "/v1/user/vehicles")).toBe(true);
    expect(canAccessRoute("v1", "/v1/user/qr")).toBe(true);
    expect(canAccessRoute("v1", "/v1/guard/infractions")).toBe(true);
    expect(canAccessRoute("v1", "/v1/admin/users")).toBe(true);
    expect(canAccessRoute("v1", "/v1/admin/vehicles")).toBe(true);
  });

  it("provides safe fallback redirects when switching versions", () => {
    // If switching from v3 parking to v1, fallback to admin dashboard
    expect(getRedirectForDisallowedRoute("v1", "/v3/admin/parking")).toBe("/v1/admin");
    // If switching from v3 guard occupancy to v2, fallback to guard home
    expect(getRedirectForDisallowedRoute("v2", "/v3/guard/occupancy")).toBe("/v2/guard");
    // If switching from v2 user access to v1, fallback to user home
    expect(getRedirectForDisallowedRoute("v1", "/v2/user/access")).toBe("/v1/user");
    // If target version allows the route, keep the route
    expect(getRedirectForDisallowedRoute("v2", "/v1/user/vehicles")).toBe("/v2/user/vehicles");
  });

  it("generates correct navbar items for User", () => {
    const v1UserNav = getUserNav("v1");
    expect(v1UserNav.some((item) => item.href.includes("/access"))).toBe(false);
    expect(v1UserNav.some((item) => item.href.includes("/qr"))).toBe(true);
    expect(v1UserNav.some((item) => item.href.includes("/vehicles"))).toBe(true);

    const v2UserNav = getUserNav("v2");
    expect(v2UserNav.some((item) => item.href.includes("/access"))).toBe(true);

    const v3UserNav = getUserNav("v3");
    expect(v3UserNav.some((item) => item.href.includes("/access"))).toBe(true);
  });

  it("generates correct navbar items for Guard", () => {
    const v1Guard = getGuardNav("v1")[0].items;
    expect(v1Guard.some((i) => i.href.includes("/history"))).toBe(false);
    expect(v1Guard.some((i) => i.href.includes("/occupancy"))).toBe(false);
    expect(v1Guard.some((i) => i.href.includes("/infractions"))).toBe(true);

    const v2Guard = getGuardNav("v2")[0].items;
    expect(v2Guard.some((i) => i.href.includes("/history"))).toBe(true);
    expect(v2Guard.some((i) => i.href.includes("/occupancy"))).toBe(false);

    const v3Guard = getGuardNav("v3")[0].items;
    expect(v3Guard.some((i) => i.href.includes("/history"))).toBe(true);
    expect(v3Guard.some((i) => i.href.includes("/occupancy"))).toBe(true);
  });

  it("generates correct navbar items for Admin", () => {
    const v1Admin = getAdminNav("v1")[0].items;
    expect(v1Admin.some((i) => i.href.includes("/access"))).toBe(false);
    expect(v1Admin.some((i) => i.href.includes("/parking"))).toBe(false);
    expect(v1Admin.some((i) => i.href.includes("/users"))).toBe(true);

    const v2Admin = getAdminNav("v2")[0].items;
    expect(v2Admin.some((i) => i.href.includes("/access"))).toBe(true);
    expect(v2Admin.some((i) => i.href.includes("/parking"))).toBe(false);

    const v3Admin = getAdminNav("v3")[0].items;
    expect(v3Admin.some((i) => i.href.includes("/access"))).toBe(true);
    expect(v3Admin.some((i) => i.href.includes("/parking"))).toBe(true);
  });
});
