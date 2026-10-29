import { renderWithProviders, screen } from "__support__/ui";
import { createMockUser } from "metabase-types/api/mocks";

import { UpsellWrapper } from "./UpsellWrapper";

describe("UpsellWrapper", () => {
  it.each([true, false])(
    "does not mount commercial content for admin=%s",
    (isAdmin) => {
      const content = jest.fn(() => <div>Commercial content</div>);
      const Wrapped = UpsellWrapper(content);
      renderWithProviders(<Wrapped />, {
        storeInitialState: {
          currentUser: createMockUser({ is_superuser: isAdmin }),
        },
      });
      expect(content).not.toHaveBeenCalled();
      expect(screen.queryByText("Commercial content")).not.toBeInTheDocument();
    },
  );
});
