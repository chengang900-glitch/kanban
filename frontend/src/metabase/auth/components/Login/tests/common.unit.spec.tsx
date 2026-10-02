import "metabase/plugins/builtin";
import { screen } from "__support__/ui";
import { setBasename } from "metabase/utils/basename";

import { setup } from "./setup";

describe("Login", () => {
  afterEach(() => setBasename(""));

  it("keeps the proxy prefix on top-level Keycloak login", () => {
    setBasename("/metabase/");
    setup({ isKeycloakEnabled: true });
    expect(
      screen.getByRole("link", { name: "Sign in with Keycloak" }),
    ).toHaveAttribute("href", "/metabase/auth/keycloak/login");
  });
  it("provides top-level Keycloak login while keeping the password form", () => {
    setup({ isKeycloakEnabled: true });
    expect(
      screen.getByRole("link", { name: "Sign in with Keycloak" }),
    ).toHaveAttribute("target", "_top");
    expect(
      screen.getByRole("link", { name: "Sign in with Keycloak" }),
    ).toHaveAttribute("href", "/auth/keycloak/login");
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("hides Keycloak login unless explicitly enabled", () => {
    setup();
    expect(screen.queryByText("Sign in with Keycloak")).not.toBeInTheDocument();
  });

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
