import { screen, waitFor } from "__support__/ui";

import {
  setup as baseSetup,
  enterpriseRoutes,
  ossRoutes,
  premiumRoutes,
  routeObjtoArray,
  upsellRoutes,
} from "./setup";

const setup = async ({
  isAdmin = true,
  initialRoute = "",
  features = {},
} = {}) => {
  await baseSetup({
    hasTokenFeatures: true,
    isAdmin,
    features,
    initialRoute,
    enterprisePlugins: "*", // means all enterprise plugins
  });
};

const routes = routeObjtoArray({
  ...ossRoutes,
  ...premiumRoutes,
  ...upsellRoutes,
  ...enterpriseRoutes, // includes the license route
  cloud: { path: "skip", testPattern: /nope/ },
  // `ossRoutes.remoteSync` expects OSS/Starter upsell copy; this suite enables all features (incl. remote_sync), so assert the real settings UI instead.
  remoteSync: { path: "/remote-sync", testPattern: /Set up remote sync/i },
}).filter(({ path }) => path !== "skip" && path !== "/license");

describe("Admin Settings Routing - Enterprise with all features", () => {
  it("renders the settings editor", async () => {
    await setup({ isAdmin: true });
    expect(
      await screen.findByTestId("admin-layout-content"),
    ).toBeInTheDocument();
  });

  describe("renders all the routes", () => {
    it.each(routes)(
      "renders the $name route",
      async ({ path, testPattern, role }) => {
        await setup({ isAdmin: true, initialRoute: path });
        await waitFor(() => {
          expect(
            role
              ? screen.getByRole(role, { name: testPattern })
              : screen.getByText(testPattern),
          ).toBeInTheDocument();
        });
      },
    );
  });

  it("hides the direct license route", async () => {
    await setup({ isAdmin: true, initialRoute: "/license" });
    expect(
      screen.queryByRole("heading", { name: /License/i }),
    ).not.toBeInTheDocument();
  });

  it("should hide the cloud upsell without hosting", async () => {
    await setup({
      initialRoute: "/cloud",
      features: { hosting: false },
    });
    expect(
      screen.queryByText("Migrate to Metabase Cloud"),
    ).not.toBeInTheDocument();
  });

  it("hides cloud settings even when hosting is enabled", async () => {
    await setup({
      initialRoute: "/cloud",
      features: { hosting: true },
    });
    expect(screen.queryByText("Cloud settings")).not.toBeInTheDocument();
  });
});
