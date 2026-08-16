import { screen } from "__support__/ui";

import { type SetupOpts, setup as baseSetup } from "./setup";

const setup = (opts: SetupOpts = {}) =>
  baseSetup({
    tokenFeatures: {
      embedding_sdk: opts.isEmbeddingSdkEnabled,
      embedding_simple: opts.isEmbeddingSimpleEnabled,
    },
    ...opts,
  });

describe("EmbeddingSdkSettings (EE)", () => {
  it("should not show an upgrade banner when the SDK feature is unavailable", async () => {
    await setup({
      isEmbeddingSdkEnabled: false,
      isEmbeddingSimpleEnabled: true,
      showSdkEmbedTerms: false,
      isHosted: true,
      enterprisePlugins: [
        "embedding-sdk",
        "embedding_iframe_sdk",
        "embedding_iframe_sdk_setup",
      ],
    });
    expect(screen.getAllByTestId("sdk-setting-card")).not.toHaveLength(0);
    expect(
      screen.queryByTestId("sdk-settings-alert-info"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("upgrade to Metabase Pro"),
    ).not.toBeInTheDocument();
  });

  it("should show Tenants in related settings when tenants feature is available", async () => {
    await setup({
      tokenFeatures: { tenants: true },
      enterprisePlugins: [
        "embedding-sdk",
        "embedding_iframe_sdk",
        "embedding_iframe_sdk_setup",
        "tenants",
      ],
    });

    expect(screen.getByText("Tenants")).toBeInTheDocument();
  });

  it("should not show Security and Appearance in related settings without token", async () => {
    await setup({
      isEmbeddingSdkEnabled: false,
      isEmbeddingSimpleEnabled: false,
      showSdkEmbedTerms: false,
    });

    expect(screen.queryByText("Security")).not.toBeInTheDocument();
    expect(screen.queryByText("Appearance")).not.toBeInTheDocument();
  });
});
