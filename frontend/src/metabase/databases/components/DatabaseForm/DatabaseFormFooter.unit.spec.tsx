import { Formik } from "formik";

import { renderWithProviders, screen } from "__support__/ui";
import type { DatabaseData } from "metabase-types/api";

import { DatabaseFormFooter } from "./DatabaseFormFooter";

function setup() {
  const initialValues = { id: null } as unknown as DatabaseData;

  return renderWithProviders(
    <Formik initialValues={initialValues} onSubmit={jest.fn()}>
      <DatabaseFormFooter isAdvanced location="full-page" />
    </Formik>,
  );
}

describe("DatabaseFormFooter", () => {
  it("hides connection help while preserving advanced form actions", () => {
    setup();

    expect(screen.queryByText("Need help connecting?")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
});
