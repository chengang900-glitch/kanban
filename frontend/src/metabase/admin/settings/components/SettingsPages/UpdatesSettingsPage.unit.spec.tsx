import { renderWithProviders, screen } from "__support__/ui";

import { UpdatesSettingsPage } from "./UpdatesSettingsPage";

describe("UpdatesSettingsPage", () => {
  it("is not available in this distribution", () => {
    renderWithProviders(<UpdatesSettingsPage />);

    expect(screen.getByLabelText("error page")).toBeInTheDocument();
    expect(screen.queryByText("Check for updates")).not.toBeInTheDocument();
  });
});
