import { mockSettings } from "__support__/settings";
import { renderWithProviders, screen } from "__support__/ui";
import { createMockState } from "metabase/redux/store/mocks";
import {
  createMockSettings,
  createMockTokenFeatures,
  createMockUser,
} from "metabase-types/api/mocks";

import { RemoteSyncSettingsPage } from "./RemoteSyncSettingsPage";

describe("RemoteSyncSettingsPage", () => {
  it("should hide the remote sync upsell when the feature is unavailable", () => {
    const settings = createMockSettings({
      "token-features": createMockTokenFeatures({}),
    });

    renderWithProviders(<RemoteSyncSettingsPage />, {
      storeInitialState: createMockState({
        currentUser: createMockUser({ is_superuser: true }),
        settings: mockSettings(settings),
      }),
    });

    expect(
      screen.queryByText(/Manage your Metabase content in Git/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Learn more" }),
    ).not.toBeInTheDocument();
  });
});
