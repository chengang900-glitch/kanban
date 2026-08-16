import { renderWithProviders, screen } from "__support__/ui";

import { CloudSettingsPage } from "./CloudSettingsPage";

describe("CloudSettingsPage", () => {
  it("is not available in this distribution", () => {
    renderWithProviders(<CloudSettingsPage />);

    expect(screen.getByLabelText("error page")).toBeInTheDocument();
    expect(screen.queryByText("Go to the Metabase Store")).not.toBeInTheDocument();
  });
});
