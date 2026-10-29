import userEvent from "@testing-library/user-event";
import fetchMock from "fetch-mock";

import {
  setupPropertiesEndpoints,
  setupSettingsEndpoints,
} from "__support__/server-mocks";
import { createMockSetupState, createMockState } from "__support__/state";
import { renderWithProviders, screen } from "__support__/ui";
import type { SetupStep } from "metabase/redux/store";
import { createMockSettings } from "metabase-types/api/mocks";

import { DataUsageStep } from "./DataUsageStep";

const setup = (step: SetupStep = "data_usage") => {
  setupSettingsEndpoints([]);
  setupPropertiesEndpoints(createMockSettings());
  renderWithProviders(<DataUsageStep stepLabel={0} />, {
    storeInitialState: createMockState({
      // A stale enabled state must not unlock the setup control.
      setup: createMockSetupState({ step, isTrackingAllowed: true }),
    }),
  });
};

describe("DataUsageStep", () => {
  it("should render in inactive state", () => {
    setup("user_info");
    expect(screen.getByText("Usage data preferences")).toBeInTheDocument();
  });

  it("keeps usage collection off and disabled for mouse and keyboard", async () => {
    setup();
    const toggle = screen.getByRole("switch", { name: /Allow Metabase/ });
    expect(toggle).toBeDisabled();
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    await userEvent.tab();
    expect(toggle).not.toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    expect(toggle).not.toBeChecked();
    expect(
      fetchMock.callHistory.called("path:/api/setting/anon-tracking-enabled"),
    ).toBe(false);
  });

  it("omits the collection description and its documentation link", () => {
    setup();
    expect(
      screen.queryByText(/we'd like to collect certain data/),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finish" })).toBeEnabled();
  });
});
