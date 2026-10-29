import userEvent from "@testing-library/user-event";

import { setupSettingEndpoint } from "__support__/server-mocks";
import { createMockSettingsState } from "__support__/state";
import { renderWithProviders, screen } from "__support__/ui";
import { Route } from "metabase/router";
import type { TokenFeatures } from "metabase-types/api";
import {
  createMockSettings,
  createMockTokenFeatures,
  createMockUser,
  createMockVersionInfo,
} from "metabase-types/api/mocks";

import { SettingsNav } from "./SettingsNav";

const setup = async ({
  initialRoute,
  isHosted,
  customVizDevModeEnabled,
  tokenFeatures,
}: {
  initialRoute: string;
  isHosted?: boolean;
  customVizDevModeEnabled?: boolean;
  tokenFeatures?: Partial<TokenFeatures>;
}) => {
  const versionInfo = createMockVersionInfo();
  const settings = createMockSettings({
    "version-info": versionInfo,
    "custom-viz-plugin-dev-mode-enabled": Boolean(customVizDevModeEnabled),
    "token-features": createMockTokenFeatures({
      hosting: Boolean(isHosted),
      "custom-viz": true,
      "custom-viz-available": true,
      ...tokenFeatures,
    }),
  });

  setupSettingEndpoint({
    settingKey: "version-info",
    settingValue: versionInfo,
  });

  renderWithProviders(<Route path="*" element={<SettingsNav />} />, {
    withRouter: true,
    initialRoute,
    storeInitialState: {
      currentUser: createMockUser({ is_superuser: true }),
      settings: createMockSettingsState(settings),
    },
  });
};

describe("SettingsNav", () => {
  it("should render the settings nav", async () => {
    await setup({ initialRoute: "/admin/settings/general" });

    expect(await screen.findByText("General")).toBeInTheDocument();
    expect(await screen.findByText("Authentication")).toBeInTheDocument();
  });

  it("should hide Remote sync upsell nav item for non-pro plans", async () => {
    await setup({ initialRoute: "/admin/settings/general", tokenFeatures: {} });
    expect(
      screen.queryByRole("link", { name: /Remote sync/i }),
    ).not.toBeInTheDocument();
  });

  it("should hide Remote sync upsell nav item for pro plans", async () => {
    await setup({ initialRoute: "/admin/settings/general" });

    expect(screen.queryByText("Remote sync")).not.toBeInTheDocument();
  });

  it("should highlight the active nav item", async () => {
    await setup({ initialRoute: "/admin/settings/general" });

    const generalNavItem = await screen.findByRole("link", { name: /General/ });
    expect(generalNavItem).toHaveAttribute("data-active", "true");

    const authNavItem = screen.getByText("Authentication");
    expect(authNavItem).not.toHaveAttribute("data-active");
  });

  it("should collapse sections by default", async () => {
    await setup({ initialRoute: "/admin/settings/general" });
    const authNavItem = screen.getByRole("link", { name: /Authentication/ });
    expect(authNavItem).not.toHaveAttribute("data-expanded");
  });

  it("should open a section by default if the page loads on a child route", async () => {
    await setup({ initialRoute: "/admin/settings/authentication/google" });

    const authNavItem = await screen.findByRole("link", {
      name: /Authentication/,
    });
    expect(authNavItem).toHaveAttribute("data-expanded", "true");
    const googleAuthItem = await screen.findByRole("link", {
      name: /Google auth/,
    });
    expect(googleAuthItem).toHaveAttribute("data-active", "true");
  });

  it("should expand and collapse a section", async () => {
    await setup({ initialRoute: "/admin/settings/general" });

    const authNavItem = await screen.findByRole("link", {
      name: /Authentication/,
    });

    expect(authNavItem).not.toHaveAttribute("data-expanded");
    await userEvent.click(authNavItem); // expand
    expect(authNavItem).toHaveAttribute("data-expanded", "true");
    await userEvent.click(authNavItem); // collapse
    expect(authNavItem).not.toHaveAttribute("data-expanded");
  });

  it("should highlight a collapsed parent when a child is active", async () => {
    await setup({ initialRoute: "/admin/settings/authentication/google" });

    const authNavItem = await screen.findByRole("link", {
      name: /Authentication/,
    });
    const googleAuthItem = await screen.findByRole("link", {
      name: /Google auth/,
    });
    expect(authNavItem).toHaveAttribute("data-expanded", "true");
    expect(authNavItem).not.toHaveAttribute("data-active");
    expect(googleAuthItem).toHaveAttribute("data-active", "true");

    await userEvent.click(authNavItem);
    expect(authNavItem).not.toHaveAttribute("data-expanded");
    expect(authNavItem).toHaveAttribute("data-active", "true");
  });

  it.each([false, true])("hides Updates for hosted=%s", async (isHosted) => {
    await setup({ initialRoute: "/admin/settings/general", isHosted });
    expect(screen.queryByText("Updates")).not.toBeInTheDocument();
  });

  it.each([false, true])(
    "hides Custom visualizations with development mode=%s",
    async (customVizDevModeEnabled) => {
      await setup({
        initialRoute: "/admin/settings/custom-visualizations",
        customVizDevModeEnabled,
      });
      expect(
        screen.queryByText("Custom visualizations"),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Development")).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Localization/ }),
      ).toBeInTheDocument();
    },
  );
});
