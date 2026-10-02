import { screen } from "__support__/ui";

import {
  setup as baseSetup,
  ossRoutes,
  premiumRoutes,
  routeObjtoArray,
  upsellRoutes,
} from "./setup";

const setup = async ({ isAdmin = true, initialRoute = "" } = {}) => {
  return baseSetup({
    enterprisePlugins: undefined,
    hasTokenFeatures: false,
    isAdmin,
    initialRoute,
  });
};

const routes = routeObjtoArray(ossRoutes);
const notFoundRoutes = routeObjtoArray(premiumRoutes);
const upsells = routeObjtoArray(upsellRoutes);

describe("Admin Settings Routing - OSS", () => {
  it("renders the settings editor", async () => {
    await setup({ isAdmin: true });
    expect(
      await screen.findByTestId("admin-layout-content"),
    ).toBeInTheDocument();
  });

  describe("renders the OSS routes", () => {
    it.each(routes)(
      "renders the $name route",
      async ({ path, testPattern }) => {
        await setup({ isAdmin: true, initialRoute: path });
        expect(await screen.findByText(testPattern)).toBeInTheDocument();
      },
    );
  });

  describe("hides commercial upsells", () => {
    it.each(upsells)(
      "hides the upsell on the $name route",
      async ({ path }) => {
        await setup({ isAdmin: true, initialRoute: path });
        expect(
          screen.queryByText("Make Metabase look like you"),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole("link", { name: "Learn more" }),
        ).not.toBeInTheDocument();
      },
    );
  });

  describe("does not render the premium routes", () => {
    it("does not show the enterprise version of the license route", async () => {
      await setup({ isAdmin: true, initialRoute: "/license" });
      expect(
        screen.queryByText("Explore our paid plans"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Billing/)).not.toBeInTheDocument();
    });

    it.each(notFoundRoutes)(
      "should not find the $name enterprise route",
      async ({ path, testPattern }) => {
        await setup({ isAdmin: true, initialRoute: path });
        expect(screen.queryByText(testPattern)).not.toBeInTheDocument();
      },
    );
  });
});
