import { Route } from "react-router";

import { setupBugReportingDetailsEndpoint } from "__support__/server-mocks";
import { mockSettings } from "__support__/settings";
import { renderWithProviders, screen } from "__support__/ui";
import { createMockState } from "metabase/redux/store/mocks";
import {
  createMockSettings,
  createMockTokenStatus,
  createMockUser,
} from "metabase-types/api/mocks";

import { AdminNavbar } from "./AdminNavbar";

const setup = ({
  isAdmin = false,
  isPaidPlan = false,
  siteName = "Metabase",
}) => {
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
      path="/"
      component={() => <AdminNavbar path="/admin" adminPaths={[]} />}
    />,
    {
      storeInitialState: state,
      withRouter: true,
    },
  );
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
});
