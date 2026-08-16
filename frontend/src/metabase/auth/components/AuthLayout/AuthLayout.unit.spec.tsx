import { mockSettings } from "__support__/settings";
import { renderWithProviders, screen } from "__support__/ui";
import { createMockState } from "metabase/redux/store/mocks";

import { AuthLayout } from "./AuthLayout";

function setup(siteName: string) {
  return renderWithProviders(<AuthLayout>Sign in</AuthLayout>, {
    storeInitialState: createMockState({
      settings: mockSettings({ "site-name": siteName }),
    }),
  });
}

describe("AuthLayout", () => {
  it("renders the configured site name without a login illustration", () => {
    setup("分析系统");

    expect(screen.getByTestId("login-site-name")).toHaveTextContent("分析系统");
    expect(
      screen.queryByTestId("login-page-illustration"),
    ).not.toBeInTheDocument();
  });
});
