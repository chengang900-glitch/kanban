import userEvent from "@testing-library/user-event";
import fetchMock from "fetch-mock";

import { setupUpdateSettingsEndpoint } from "__support__/server-mocks";
import { renderWithProviders, screen, waitFor } from "__support__/ui";

import { EnableGuestEmbedsSection } from "./EnableGuestEmbedsSection";

const setup = (isEnabled = true, termsAccepted = false) => {
  setupUpdateSettingsEndpoint();
  renderWithProviders(
    <EnableGuestEmbedsSection
      isEnabled={isEnabled}
      termsAccepted={termsAccepted}
      isSimpleEmbedFeatureAvailable={false}
    />,
  );
};

describe("EnableGuestEmbedsSection", () => {
  it("hides the redundant title while retaining explicit consent and its original update", async () => {
    setup();
    expect(
      screen.queryByText(/Agree to the .* to continue/),
    ).not.toBeInTheDocument();
    expect(fetchMock.callHistory.called("path:/api/setting")).toBe(false);
    await userEvent.click(
      screen.getByRole("button", { name: "Agree and continue" }),
    );
    await waitFor(() =>
      expect(fetchMock.callHistory.called("path:/api/setting")).toBe(true),
    );
    const calls = fetchMock.callHistory.calls("path:/api/setting");
    expect(JSON.parse(String(calls[0].options.body))).toEqual({
      "enable-embedding-modular": true,
      "show-static-embed-terms": false,
    });
  });

  it("keeps the license accessible from the information icon", async () => {
    setup();
    await userEvent.hover(screen.getByRole("img", { name: "info icon" }));
    expect(
      await screen.findByRole("link", { name: "usage conditions" }),
    ).toHaveAttribute("href", "https://metabase.com/license/embedding");
  });

  it("retains the enable-and-agree state when embedding is disabled", () => {
    setup(false);
    expect(
      screen.getByText(/To continue, enable embedding and agree/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Agree and enable" }),
    ).toBeEnabled();
  });

  it("only offers enabling when the terms were already accepted", () => {
    setup(false, true);
    expect(
      screen.getByText("Enable embedding to get started."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Enable and continue" }),
    ).toBeEnabled();
  });

  it("renders no consent section when already enabled and accepted", () => {
    setup(true, true);
    expect(
      screen.queryByTestId("enable-embedding-card"),
    ).not.toBeInTheDocument();
  });
});
