import { mockSettings } from "__support__/settings";
import { createMockState } from "__support__/state";
import { renderWithProviders, screen } from "__support__/ui";
import {
  createMockTokenStatus,
  createMockUser,
} from "metabase-types/api/mocks";

import { AppBanner } from "./AppBanner";

function setup({
  isAdmin = true,
  isReadOnly = false,
  isDevMode = false,
  status = "valid",
  trial = false,
  error = "",
} = {}) {
  return renderWithProviders(<AppBanner />, {
    storeInitialState: createMockState({
      currentUser: createMockUser({ is_superuser: isAdmin }),
      settings: mockSettings({
        "is-hosted?": false,
        "read-only-mode": isReadOnly,
        "development-mode?": isDevMode,
        "token-status": createMockTokenStatus({
          status,
          trial,
          "error-details": error,
        }),
      }),
    }),
  });
}

describe("AppBanner customization", () => {
  it.each([true, false])(
    "preserves read-only warnings for admin=%s",
    (isAdmin) => {
      setup({ isAdmin, isReadOnly: true });
      expect(screen.getByText(/under maintenance/)).toBeInTheDocument();
    },
  );
  it.each([true, false])(
    "preserves development warnings for admin=%s",
    (isAdmin) => {
      setup({ isAdmin, isDevMode: true });
      expect(screen.getByText(/in development mode/)).toBeInTheDocument();
    },
  );
  it.each(["past-due", "unpaid", "invalid"])(
    "keeps real license failure %s without billing links",
    (status) => {
      setup({ status });
      expect(
        screen.getByText(/Some licensed features are unavailable/),
      ).toBeInTheDocument();
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    },
  );
  it("preserves the concrete error for administrators", () => {
    setup({ status: "invalid", error: "Example error detail" });
    expect(screen.getByText(/Example error detail/)).toBeInTheDocument();
  });
  it("does not show license failures to non-admins", () => {
    setup({ isAdmin: false, status: "invalid" });
    expect(screen.queryByTestId("app-banner")).not.toBeInTheDocument();
  });
  it("does not replace maintenance notices with a license warning", () => {
    setup({ isReadOnly: true, status: "invalid" });
    expect(screen.getByText(/under maintenance/)).toBeInTheDocument();
    expect(
      screen.queryByText(/Some licensed features/),
    ).not.toBeInTheDocument();
  });
  it("does not render trial or upgrade advertising", () => {
    setup({ trial: true });
    expect(screen.queryByTestId("app-banner")).not.toBeInTheDocument();
  });
});
