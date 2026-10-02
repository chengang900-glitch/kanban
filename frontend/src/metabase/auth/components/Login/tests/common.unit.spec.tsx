import "metabase/plugins/builtin";
import { screen } from "__support__/ui";

import { setup } from "./setup";

describe("Login", () => {
  it("renders the login heading without the product name", () => {
    setup({ isPasswordLoginEnabled: true });

    expect(screen.getByRole("heading")).toHaveTextContent("Sign in");
    expect(screen.getByRole("heading")).not.toHaveTextContent("Metabase");
  });

  it("should render a list of auth providers", () => {
    setup({ isPasswordLoginEnabled: true, isGoogleAuthEnabled: true });

    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("should render the panel of the selected provider", () => {
    setup({
      initialRoute: "/auth/login/password",
      isPasswordLoginEnabled: true,
      isGoogleAuthEnabled: true,
    });

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should implicitly select the only provider with a panel", () => {
    setup({
      isPasswordLoginEnabled: true,
      isGoogleAuthEnabled: false,
    });

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should not disable password login for OSS", () => {
    setup({ isPasswordLoginEnabled: false, isGoogleAuthEnabled: true });

    expect(screen.getByText("Sign in with email")).toBeInTheDocument();
  });
});
