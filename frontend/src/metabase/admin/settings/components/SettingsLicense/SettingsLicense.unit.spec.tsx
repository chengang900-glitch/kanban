import { renderWithProviders, screen } from "__support__/ui";

import { SettingsLicense } from "./SettingsLicense";

const setup = () => {
  renderWithProviders(<SettingsLicense />);
};

describe("SettingsLicense", () => {
  it("does not render commercial plan promotion", () => {
    setup();

    expect(
      screen.queryByRole("link", { name: "Explore our paid plans" }),
    ).not.toBeInTheDocument();
  });
});
