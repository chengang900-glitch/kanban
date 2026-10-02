import { renderWithProviders, screen } from "__support__/ui";

import { UpsellEmbedHomepage } from "./UpsellEmbedHomepage";
import { UpsellMetabaseBanner } from "./UpsellMetabaseBanner";
import { UpsellUsageAnalytics } from "./UpsellUsageAnalytics";

describe("commercial upsell components", () => {
  it("does not render the embed homepage upsell", () => {
    renderWithProviders(<UpsellEmbedHomepage location="home" />);

    expect(screen.queryByText("Try Metabase Pro")).not.toBeInTheDocument();
  });

  it("does not render the usage analytics trial card", () => {
    renderWithProviders(<UpsellUsageAnalytics location="usage" />);

    expect(screen.queryByText("Try for free")).not.toBeInTheDocument();
  });

  it("does not render the embedded Metabase branding upsell", () => {
    renderWithProviders(<UpsellMetabaseBanner />);

    expect(screen.queryByText(/Powered by Metabase/)).not.toBeInTheDocument();
  });
});
