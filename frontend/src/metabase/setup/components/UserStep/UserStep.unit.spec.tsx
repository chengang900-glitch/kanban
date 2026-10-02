import { mockSettings } from "__support__/settings";
import { renderWithProviders, screen } from "__support__/ui";
import type { SetupStep, UserInfo } from "metabase/redux/store";
import {
  createMockSetupState,
  createMockState,
  createMockUserInfo,
} from "metabase/redux/store/mocks";

import { UserStep } from "./UserStep";

interface SetupOpts {
  step?: SetupStep;
  user?: UserInfo;
  isHosted?: boolean;
}

const setup = ({
  step = "user_info",
  user,
  isHosted = false,
}: SetupOpts = {}) => {
  const state = createMockState({
    settings: mockSettings({ "is-hosted?": isHosted }),
    setup: createMockSetupState({
      step,
      user,
    }),
  });

  renderWithProviders(<UserStep stepLabel={0} />, { storeInitialState: state });
};

describe("UserStep", () => {
  it("should render in active state", () => {
    setup({ step: "user_info" });

    expect(screen.getByText("What should we call you?")).toBeInTheDocument();
  });

  it("should show and autofocus last name before first name", () => {
    setup({ step: "user_info" });

    const lastName = screen.getByLabelText("Last name");
    const firstName = screen.getByLabelText("First name");

    expect(lastName).toHaveFocus();
    expect(
      lastName.compareDocumentPosition(firstName) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("should autofocus the password input field for hosted instances", () => {
    const user = createMockUserInfo();
    setup({ step: "user_info", isHosted: true, user });

    expect(screen.getByLabelText("Create a password")).toHaveFocus();
  });

  it("should pre-fill the user information if provided", () => {
    const user = createMockUserInfo();
    setup({ step: "user_info", user });

    Object.values(user)
      .filter((v) => v.length > 0)
      .forEach((v) => {
        expect(screen.getByDisplayValue(v)).toBeInTheDocument();
      });
  });

  it("should render in completed state", () => {
    setup({
      step: "db_connection",
      user: createMockUserInfo({ first_name: "Testy" }),
    });

    expect(screen.getByText(/Hi, Testy/)).toBeInTheDocument();
  });
});
