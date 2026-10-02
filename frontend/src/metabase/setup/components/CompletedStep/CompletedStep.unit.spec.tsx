import { renderWithProviders, screen } from "__support__/ui";
import type { SetupStep } from "metabase/redux/store";
import {
  createMockSetupState,
  createMockState,
} from "metabase/redux/store/mocks";

import { CompletedStep } from "./CompletedStep";

interface SetupOpts {
  step?: SetupStep;
}

const setup = ({ step = "completed" }: SetupOpts = {}) => {
  const state = createMockState({
    setup: createMockSetupState({
      step,
    }),
  });

  renderWithProviders(<CompletedStep />, { storeInitialState: state });
};

describe("CompletedStep", () => {
  it("should render in inactive state", () => {
    setup({ step: "user_info" });

    expect(screen.queryByText("You're all set up!")).not.toBeInTheDocument();
  });

  it("should show a disabled newsletter switch and a link to the app", () => {
    setup({ step: "completed" });

    const newsletterSwitch = screen.getByRole("switch", {
      name: "Get infrequent emails about new releases and feature updates.",
    });

    expect(newsletterSwitch).not.toBeChecked();
    expect(newsletterSwitch).toBeDisabled();
    expect(screen.getByText("进入数据看板")).toBeInTheDocument();
  });
});
