import userEvent from "@testing-library/user-event";
import fetchMock from "fetch-mock";

import {
  setupPropertiesEndpoints,
  setupSettingsEndpoints,
} from "__support__/server-mocks";
import { renderWithProviders, screen, waitFor } from "__support__/ui";
import type { SetupStep } from "metabase/redux/store";
import {
  createMockSetupState,
  createMockState,
} from "metabase/redux/store/mocks";
import { createMockSettings } from "metabase-types/api/mocks";

import { DataUsageStep } from "./DataUsageStep";

interface SetupOpts {
  step?: SetupStep;
}

const TRACKING_PATH = "path:/api/setting/anon-tracking-enabled";

const setup = ({ step = "data_usage" }: SetupOpts = {}) => {
  const state = createMockState({
    setup: createMockSetupState({
      step,
    }),
  });

  setupSettingsEndpoints([]);
  setupPropertiesEndpoints(createMockSettings());
  fetchMock.put("path:/api/setting", 200);

  renderWithProviders(<DataUsageStep stepLabel={0} />, {
    storeInitialState: state,
  });
};

describe("DataUsageStep", () => {
  it("should hide the tracking description", () => {
    setup();

    expect(
      screen.queryByText(
        "In order to help us improve Dashboard, we'd like to collect certain data about product usage.",
      ),
    ).not.toBeInTheDocument();
  });

  it("should render in inactive state", () => {
    setup({ step: "user_info" });

    expect(screen.getByText("Usage data preferences")).toBeInTheDocument();
  });

  it("should keep tracking disabled and save the disabled setting", async () => {
    setup({ step: "data_usage" });
    fetchMock.put(TRACKING_PATH, 204);

    const toggle = screen.getByRole("switch", { name: /Allow Dashboard/ });
    expect(toggle).not.toBeChecked();
    expect(toggle).toBeDisabled();
    await userEvent.click(toggle);

    expect(
      fetchMock.callHistory.called(TRACKING_PATH, { method: "PUT" }),
    ).toBeFalsy();

    await userEvent.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() => {
      expect(
        fetchMock.callHistory.called(TRACKING_PATH, { method: "PUT" }),
      ).toBeTruthy();
    });

    expect(toggle).not.toBeChecked();
  });

  it("should show an error message on submit", async () => {
    setup({ step: "data_usage" });
    fetchMock.put(TRACKING_PATH, 400);

    await userEvent.click(screen.getByRole("button", { name: "Finish" }));

    await waitFor(() => {
      expect(
        fetchMock.callHistory.called(TRACKING_PATH, { method: "PUT" }),
      ).toBeTruthy();
    });

    expect(await screen.findByText("An error occurred")).toBeInTheDocument();
  });
});
