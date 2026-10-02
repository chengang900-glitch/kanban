import userEvent from "@testing-library/user-event";
import { Route } from "react-router";

import { setupBugReportingDetailsEndpoint } from "__support__/server-mocks";
import { mockSettings } from "__support__/settings";
import { renderWithProviders, screen, waitFor } from "__support__/ui";
import type { AdminPath } from "metabase/redux/store";
import { createMockState } from "metabase/redux/store/mocks";
import {
  createMockSettings,
  createMockTokenStatus,
  createMockUser,
} from "metabase-types/api/mocks";

import { AdminNavbar } from "./AdminNavbar";

// The real tab list and its order live with `getAdminPaths`, which pins them in
// its own spec. Here the list is a fixture: what matters is that digit N routes
// to the Nth tab, whatever the tabs happen to be.
const ADMIN_PATHS: AdminPath[] = [
  { key: "settings", path: "/admin/settings", name: "Settings" },
  { key: "databases", path: "/admin/databases", name: "Databases" },
  { key: "people", path: "/admin/people", name: "People" },
];

type SetupOpts = {
  isAdmin?: boolean;
  isPaidPlan?: boolean;
  adminPaths?: AdminPath[];
  siteName?: string;
};

const setup = ({
  isAdmin = false,
  isPaidPlan = false,
  adminPaths = [],
  siteName = "Metabase",
}: SetupOpts) => {
  setupBugReportingDetailsEndpoint();
  const state = createMockState({
    currentUser: createMockUser({ is_superuser: isAdmin }),
    settings: mockSettings(
      createMockSettings({
        "site-name": siteName,
        "token-status": createMockTokenStatus({ valid: isPaidPlan }),
      }),
    ),
  });

  return renderWithProviders(
    <Route
      path="*"
      component={() => <AdminNavbar path="/admin" adminPaths={adminPaths} />}
    />,
    {
      storeInitialState: state,
      withRouter: true,
      initialRoute: "/admin",
      withKBar: true,
    },
  );
};

const setupTabs = async (adminPaths: AdminPath[] = ADMIN_PATHS) => {
  const { history } = setup({ isAdmin: true, adminPaths });

  // The digit shortcut is registered from an effect; a keystroke dispatched in
  // the same tick as the initial render lands before that and is lost.
  await screen.findByTestId("admin-navbar");

  return { history };
};

describe("AdminNavbar", () => {
  it("shows the configured site name and hides the store link", () => {
    setup({ siteName: "分析系统", isAdmin: true, isPaidPlan: false });

    expect(screen.getByTestId("admin-site-name")).toHaveTextContent("分析系统");
    expect(screen.getByText("管理中心")).toBeInTheDocument();
    expect(screen.queryByTestId("store-link")).not.toBeInTheDocument();
  });

  describe("StoreLink visibility", () => {
    it("does not show store link when user is not an admin", () => {
      setup({ isAdmin: false, isPaidPlan: true });
      expect(screen.queryByTestId("store-link")).not.toBeInTheDocument();
    });

    it("does not show store link when user is admin and not on paid plan", () => {
      setup({ isAdmin: true, isPaidPlan: false });
      expect(screen.queryByTestId("store-link")).not.toBeInTheDocument();
    });

    it("does not show store link when user is admin and on paid plan", () => {
      setup({ isAdmin: true, isPaidPlan: true });
      expect(screen.queryByTestId("store-link")).not.toBeInTheDocument();
    });
  });

  describe("tab shortcuts", () => {
    it.each(
      ADMIN_PATHS.map(
        (adminPath, index) =>
          [`${index + 1}`, adminPath.key, adminPath.path] as const,
      ),
    )("pressing %s goes to the %s tab", async (key, _key, pathname) => {
      const { history } = await setupTabs();

      await userEvent.keyboard(key);

      await waitFor(() =>
        expect(history?.getCurrentLocation().pathname).toBe(pathname),
      );
    });

    it("ignores digits past the end of the tab list", async () => {
      const { history } = await setupTabs();

      await userEvent.keyboard(`${ADMIN_PATHS.length + 1}`);
      expect(history?.getCurrentLocation().pathname).toBe("/admin");

      // The handler is live — the out-of-range digit was ignored, not dropped.
      await userEvent.keyboard("2");
      await waitFor(() =>
        expect(history?.getCurrentLocation().pathname).toBe(
          ADMIN_PATHS[1].path,
        ),
      );
    });
  });
});
