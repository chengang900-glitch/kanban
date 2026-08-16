import { renderWithProviders, screen } from "__support__/ui";

import {
  UpsellCacheConfig,
  UpsellDevInstances,
  UpsellHostingBanner,
  UpsellSSO,
  UpsellUploads,
} from "./HiddenAdminUpsells";

describe("HiddenAdminUpsells", () => {
  it("hides the commercial promotions used by admin settings pages", () => {
    renderWithProviders(
      <>
        <UpsellCacheConfig location="performance-data_cache" />
        <UpsellDevInstances location="settings-general" />
        <UpsellSSO location="authentication-sidebar" />
        <UpsellHostingBanner location="settings-email-migrate_to_cloud" />
        <UpsellUploads location="settings-uploads" />
      </>,
    );

    expect(screen.queryByText("Control your caching")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Get a development instance"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Tired of manually managing people and groups?"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Minimize maintenance")).not.toBeInTheDocument();
    expect(screen.queryByText("Manage your uploads")).not.toBeInTheDocument();
  });
});
