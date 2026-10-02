import { renderWithProviders, screen } from "__support__/ui";

import { UpsellPermissions } from "./UpsellPermissions";

describe("UpsellPermissions", () => {
  it("does not render the advanced permissions trial card", () => {
    renderWithProviders(<UpsellPermissions location="settings-permissions" />);

    expect(
      screen.queryByText("Get advanced permissions"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Try for free")).not.toBeInTheDocument();
  });
});
