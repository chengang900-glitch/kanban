import userEvent from "@testing-library/user-event";
import { Route } from "react-router";

import { mockSettings } from "__support__/settings";
import { renderWithProviders, screen, waitFor, within } from "__support__/ui";
import {
  createMockAdminAppState,
  createMockAdminState,
} from "metabase/redux/store/mocks";
import {
  createMockTokenFeatures,
  createMockUser,
} from "metabase-types/api/mocks";

import { AppSwitcher } from "./AppSwitcher";

const USER = createMockUser();

const REGULAR_ITEMS = [
  USER.first_name as string,
  USER.email,
  "Help",
  "Sign out",
];
const ADMIN_ITEMS = [...REGULAR_ITEMS, "Main app", "Admin"];
const HOSTED_ITEMS = [...ADMIN_ITEMS];

const WITH_DATA_STUDIO = [...ADMIN_ITEMS, "Data studio"];

const adminNavItem = {
  name: `People`,
  path: "/admin/people",
  key: "people",
} as const;

async function setup({
  isAdmin = false,
  isHosted = false,
}: {
  isAdmin?: boolean;
  isHosted?: boolean;
} = {}) {
  const settings = mockSettings({
    "is-hosted?": isHosted,
    "token-features": createMockTokenFeatures(),
  });

  const admin = createMockAdminState({
    app: createMockAdminAppState({
      paths: isAdmin ? [adminNavItem] : [],
    }),
  });

  renderWithProviders(
    <>
      <Route path="/" component={AppSwitcher} />
      <Route path="/admin" component={AppSwitcher} />
      <Route path="/data-studio" component={AppSwitcher} />
    </>,
    {
      withRouter: true,
      storeInitialState: {
        admin,
        settings,
        currentUser: { ...USER, is_superuser: isAdmin },
      },
    },
  );

  await openProfileLink();
}

async function setupHosted(opts = {}) {
  return setup({ ...opts, isHosted: true });
}

describe("ProfileLink", () => {
  it("should render standard links", async () => {
    await setup();

    // Should always render a profile link
    expect(
      await screen.findByText(USER.first_name as string),
    ).toBeInTheDocument();
    expect(await screen.findByText(USER.email)).toBeInTheDocument();

    //Should render a help submenu
    expect(
      await screen.findByRole("menuitem", { name: "Help" }),
    ).toBeInTheDocument();

    // Should render logout
    expect(
      await screen.findByRole("menuitem", { name: "Sign out" }),
    ).toBeInTheDocument();
  });

  describe("self-hosted", () => {
    it("should show the proper set of items for normal users", async () => {
      await setup({ isAdmin: false });

      REGULAR_ITEMS.forEach((title) => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
      expect(screen.queryByText("Admin settings")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("img", { name: /mode/i }),
      ).not.toBeInTheDocument();

      expect(screen.getByTestId("app-switcher-target")).toHaveTextContent("TT");
    });

    it("should show the proper set of items for admin users", async () => {
      await setup({ isAdmin: true });

      ADMIN_ITEMS.forEach((title) => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });

      expect(
        await within(screen.getByTestId("app-switcher-target")).findByRole(
          "img",
          { name: /mode/ },
        ),
      ).toBeInTheDocument();
    });
  });

  describe("current app", () => {
    it("should update it's apps section as you navigate", async () => {
      await setup({ isAdmin: true });

      await assertActiveApp("main");

      await userEvent.click(await getAdminMenuItem());
      await openProfileLink();
      await waitFor(() => assertActiveApp("admin"));

      await userEvent.click(await getDataStudioMenuItem());
      await openProfileLink();
      await assertActiveApp("data-studio");

      await userEvent.click(await getMainAppMenuItem());
      await openProfileLink();
      await assertActiveApp("main");
    });
  });

  describe("hosted", () => {
    it("should show the proper set of items for normal users", async () => {
      await setupHosted({ isAdmin: false });

      REGULAR_ITEMS.forEach((title) => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
      expect(screen.queryByText("Admin settings")).not.toBeInTheDocument();
    });

    it("should show the proper set of items for admin users", async () => {
      await setupHosted({ isAdmin: true });

      HOSTED_ITEMS.forEach((title) => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
    });
  });

  describe("with data studio", () => {
    it("should show data studio app when apropriate", async () => {
      await setup({ isAdmin: true });

      WITH_DATA_STUDIO.forEach((title) => {
        expect(screen.getByText(title)).toBeInTheDocument();
      });
    });
  });

  describe("help submenu", () => {
    it("should only show keyboard shortcuts", async () => {
      await setup();
      await openHelpSubmenu();

      expect(screen.getByText("Keyboard shortcuts")).toBeInTheDocument();
      expect(screen.queryByText("Get help")).not.toBeInTheDocument();
      expect(screen.queryByText("How to use Metabase")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Download diagnostics"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/About /)).not.toBeInTheDocument();
    });
  });
});

const openProfileLink = async () => {
  await userEvent.click(screen.getByTestId("app-switcher-target"));
  await screen.findByRole("menu");
};

const openHelpSubmenu = async () =>
  await userEvent.click(await screen.findByRole("menuitem", { name: "Help" }));

const assertActiveApp = async (current: "main" | "admin" | "data-studio") => {
  expect(
    await within(await getMainAppMenuItem()).findByRole("img", {
      name: current === "main" ? /check_filled/i : /dashboard/i,
    }),
  ).toBeInTheDocument();
  expect(
    await within(await getAdminMenuItem()).findByRole("img", {
      name: current === "admin" ? /check_filled/i : /io/i,
    }),
  ).toBeInTheDocument();
  expect(
    await within(await getDataStudioMenuItem()).findByRole("img", {
      name: current === "data-studio" ? /check_filled/i : /table/i,
    }),
  ).toBeInTheDocument();
};

const getMainAppMenuItem = () =>
  screen.findByRole("menuitem", { name: /main app/i });
const getAdminMenuItem = () =>
  screen.findByRole("menuitem", { name: /admin/i });
const getDataStudioMenuItem = () =>
  screen.findByRole("menuitem", { name: /data studio/i });
