import userEvent from "@testing-library/user-event";
import { Route } from "react-router";

import { renderWithProviders, screen } from "__support__/ui";

import { ApplicationPermissionsHelp } from "./ApplicationPermissionsHelp";
import { CollectionPermissionsHelp } from "./CollectionPermissionsHelp";
import { LegacyPermissionsModal } from "./LegacyPermissionsModal/LegacyPermissionsModal";
import { PermissionsEditorLegacyNoSelfServiceWarning } from "./PermissionsEditor/PermissionsEditorLegacyWarning";
import { PermissionsEditorSplitPermsMessage } from "./PermissionsEditor/PermissionsEditorSplitPermsMessage";

describe("permissions documentation links", () => {
  it("keeps collection permissions help without an external docs link", () => {
    renderWithProviders(<CollectionPermissionsHelp />);

    expect(screen.getByText("Collection permissions")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Learn more/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps application permissions help without an external docs link", () => {
    renderWithProviders(<ApplicationPermissionsHelp />);

    expect(screen.getAllByText("Applications permissions")).not.toHaveLength(0);
    expect(
      screen.queryByRole("link", { name: /Learn more/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps the split permissions message without an external docs link", () => {
    renderWithProviders(<PermissionsEditorSplitPermsMessage />);

    expect(screen.getByText(/access hasn’t changed/)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Learn more" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the legacy warning details without an external docs link", async () => {
    renderWithProviders(<PermissionsEditorLegacyNoSelfServiceWarning />);

    await userEvent.click(screen.getByText("Read more"));

    expect(
      screen.getByText(/Metabase will automatically change/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Need help/ }),
    ).not.toBeInTheDocument();
  });

  it("keeps the legacy modal action without an external docs link", async () => {
    renderWithProviders(
      <Route
        path="*"
        component={() => <LegacyPermissionsModal isOpen onClose={jest.fn()} />}
      />,
      { withRouter: true, initialRoute: "/admin/permissions/data" },
    );

    expect(
      await screen.findByRole("button", { name: "Got it" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Learn more" }),
    ).not.toBeInTheDocument();
  });
});
