import { Route } from "react-router";

import { renderWithProviders, screen } from "__support__/ui";

import { ToolsApp } from "./ToolsApp";

describe("ToolsApp", () => {
  it("hides the Erroring questions navigation item", () => {
    renderWithProviders(<Route path="*" component={ToolsApp} />, {
      withRouter: true,
      initialRoute: "/admin/tools/help",
    });

    expect(screen.getByText("Help")).toBeInTheDocument();
    expect(screen.queryByText("Erroring questions")).not.toBeInTheDocument();
  });
});
