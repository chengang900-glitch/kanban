import { Route } from "react-router";

import { mockSettings } from "__support__/settings";
import { renderWithProviders, screen } from "__support__/ui";
import { createMockState } from "metabase/redux/store/mocks";
import { createMockEngines } from "metabase-types/api/mocks";

import { DatabasePage } from "./DatabasePage";

const setup = () => {
  renderWithProviders(<Route path="/" component={DatabasePage} />, {
    withRouter: true,
    storeInitialState: createMockState({
      settings: mockSettings({
        engines: createMockEngines(),
      }),
    }),
  });
};

describe("DatabasePage", () => {
  it("does not render the database help entry or side panel", () => {
    setup();

    expect(
      screen.queryByRole("button", { name: /Help is here/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("database-help-side-panel"),
    ).not.toBeInTheDocument();
  });
});
