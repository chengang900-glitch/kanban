import { Route } from "react-router";

import { renderWithProviders, screen } from "__support__/ui";
import {
  createMockSettingsState,
  createMockState,
} from "metabase/redux/store/mocks";
import type { EmbeddingHomepageStatus } from "metabase-types/api";
import {
  createMockTokenFeatures,
  createMockUser,
} from "metabase-types/api/mocks";

import { AdminPeopleApp } from "./AdminPeopleApp";

interface SetupOpts {
  activeUsersCount?: number;
  ssoEnabled?: boolean;
  isSuperUser?: boolean;
  useTenants?: boolean;
  setupEmbeddingAutoenabled?: boolean;
  embeddingHomepage?: "hidden" | "visible" | "dismissed";
  hasTenantsFeature?: boolean;
}

const setup = async (inputSetupOpts?: Partial<SetupOpts>) => {
  const defaultSetupOpts: SetupOpts = {
    activeUsersCount: 50,
    ssoEnabled: false,
    isSuperUser: true,
    useTenants: false,
    setupEmbeddingAutoenabled: false,
    embeddingHomepage: "hidden",
    hasTenantsFeature: false,
  };
  const setupOpts = Object.assign(defaultSetupOpts, inputSetupOpts ?? {});

  const state = createMockState({
    currentUser: createMockUser({
      is_superuser: setupOpts.isSuperUser,
    }),
    settings: createMockSettingsState({
      "active-users-count": setupOpts.activeUsersCount,
      "embedding-homepage":
        setupOpts.embeddingHomepage as EmbeddingHomepageStatus,
      "setup-embedding-autoenabled": setupOpts.setupEmbeddingAutoenabled,
      "use-tenants": setupOpts.useTenants,
      "token-features": createMockTokenFeatures({
        sso_saml: setupOpts.ssoEnabled,
        tenants: setupOpts.hasTenantsFeature,
      }),
    }),
  });

  renderWithProviders(
    <Route path="/" component={() => <AdminPeopleApp>empty</AdminPeopleApp>} />,
    {
      storeInitialState: state,
      withRouter: true,
    },
  );
};

describe("AdminPeopleApp", () => {
  describe("sidebar", () => {
    it("should render only internal people and groups links if tenants is disabled", async () => {
      await setup();

      await assertNavLink("People", "/admin/people");
      await assertNavLink("Groups", "/admin/people/groups");
      expect(screen.queryByText("Tenants")).not.toBeInTheDocument();
      expect(screen.queryByText("Tenant users")).not.toBeInTheDocument();
    });

    it("should render both internal and external people links if tenants is enabled", async () => {
      await setup({ useTenants: true });

      await assertNavLink("Internal users", "/admin/people");
      await assertNavLink("Internal groups", "/admin/people/groups");
      await assertNavLink("Tenants", "/admin/people/tenants");
      await assertNavLink("Tenant users", "/admin/people/tenants/people");
    });

    it("should hide tenant upsell links for embedding setup instances", async () => {
      await setup({ setupEmbeddingAutoenabled: true });

      expect(screen.queryByText("Tenants")).not.toBeInTheDocument();
    });

    it("should hide tenant upsell links for the legacy embedding signal", async () => {
      await setup({ embeddingHomepage: "visible" });

      expect(screen.queryByText("Tenants")).not.toBeInTheDocument();
    });
  });

  describe("nudge to pro", () => {
    const nudgeText = /tired of manually managing people/i;

    it("should stay hidden when user is eligible for the upgrade prompt", () => {
      setup();
      expect(screen.queryByText(nudgeText)).not.toBeInTheDocument();
    });

    it("should not be visible with less than 50 users", () => {
      setup({ activeUsersCount: 10 });
      expect(screen.queryByText(nudgeText)).not.toBeInTheDocument();
    });

    it("should not be visible when user is not admin", () => {
      setup({ isSuperUser: false });
      expect(screen.queryByText(nudgeText)).not.toBeInTheDocument();
    });

    it("should not be visible when SSO is already available", () => {
      setup({ ssoEnabled: true });
      expect(screen.queryByText(nudgeText)).not.toBeInTheDocument();
    });
  });
});

async function assertNavLink(linkText: string, linkHref: string) {
  const linkLabel = await screen.findByText(linkText);
  const link =
    linkLabel.closest("a") ?? document.querySelector(`a[href="${linkHref}"]`);

  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute("href", linkHref);

  return link as HTMLElement;
}
