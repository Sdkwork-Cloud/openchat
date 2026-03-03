import { describe, expect, it } from "vitest";
import {
  routePageExportNames,
  routePageLoaders,
  type RoutePageKey,
} from "../router";

describe("router page loader contract", () => {
  it("resolves all lazy route page exports", async () => {
    const pageKeys = Object.keys(routePageLoaders) as RoutePageKey[];

    for (const pageKey of pageKeys) {
      const module = await routePageLoaders[pageKey]();
      const exportName = routePageExportNames[pageKey];

      expect(
        module[exportName],
        `${pageKey} should expose ${exportName}`,
      ).toBeDefined();
    }
  });
});
