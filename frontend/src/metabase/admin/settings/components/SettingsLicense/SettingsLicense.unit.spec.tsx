import { renderWithProviders, screen } from "__support__/ui";

import { SettingsLicense } from "./SettingsLicense";

describe("SettingsLicense", () => {
  it("hides the paid plans advertisement", () => {
    renderWithProviders(<SettingsLicense />);
    expect(
      screen.queryByRole("link", { name: "Explore our paid plans" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Looking for more?")).not.toBeInTheDocument();
  });
});
