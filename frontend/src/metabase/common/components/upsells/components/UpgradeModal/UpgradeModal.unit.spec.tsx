import { setupTrialAvailableEndpoint } from "__support__/server-mocks";
import { renderWithProviders, screen } from "__support__/ui";

import { UpgradeModal } from "./UpgradeModal";

describe("UpgradeModal", () => {
  it("does not mount the commercial upgrade dialog", () => {
    setupTrialAvailableEndpoint({ available: true, plan_alias: "pro-cloud" });

    renderWithProviders(<UpgradeModal opened onClose={jest.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
