import { renderWithProviders, screen } from "__support__/ui";

import { TransformsUpsellPage } from "./TransformsUpsellPage";

describe("TransformsUpsellPage", () => {
  it("does not render commercial promotion", () => {
    renderWithProviders(<TransformsUpsellPage />);
    expect(screen.queryByText(/transform/i)).not.toBeInTheDocument();
  });
});
