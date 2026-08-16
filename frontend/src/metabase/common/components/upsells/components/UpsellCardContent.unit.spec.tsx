import fetchMock from "fetch-mock";

import { mockSettings } from "__support__/settings";
import { renderWithProviders, screen } from "__support__/ui";
import { createMockState } from "metabase/redux/store/mocks";

import type { UpsellCardContentProps } from "./UpsellCardContent";
import { UpsellCardContent } from "./UpsellCardContent";

const props: UpsellCardContentProps = {
  campaign: "test-campaign",
  location: "test-location",
  title: "Test Title",
  description: "Test description",
};

describe("UpsellCardContent", () => {
  it("does not render or request trial availability", () => {
    renderWithProviders(<UpsellCardContent {...props} />, {
      storeInitialState: createMockState({
        settings: mockSettings({ "is-hosted?": true }),
      }),
    });

    expect(screen.queryByText("Test Title")).not.toBeInTheDocument();
    expect(
      fetchMock.callHistory.called(
        "path:/api/ee/cloud-proxy/mb-plan-trial-up-available",
      ),
    ).toBe(false);
  });
});
