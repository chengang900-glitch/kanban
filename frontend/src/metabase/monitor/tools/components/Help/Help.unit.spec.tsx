import { setupBugReportingDetailsEndpoint } from "__support__/server-mocks";
import { renderWithProviders, screen } from "__support__/ui";

import { Help } from "./Help";

describe("Help", () => {
  it("hides external support and commercial help sections", async () => {
    setupBugReportingDetailsEndpoint();

    renderWithProviders(<Help />);

    expect(await screen.findByText("Diagnostic info")).toBeInTheDocument();
    expect(screen.queryByText("Get help")).not.toBeInTheDocument();
    expect(screen.queryByText("Report an issue")).not.toBeInTheDocument();
    expect(screen.queryByText("Get expert help")).not.toBeInTheDocument();
  });
});
