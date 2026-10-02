import { render, screen } from "__support__/ui";
import { createMockUser } from "metabase-types/api/mocks";

import { UserAvatar } from "./UserAvatar";

describe("UserAvatar", () => {
  describe("Users", () => {
    test("render user with name", async () => {
      const revisionUser = createMockUser({
        first_name: "Testy",
        last_name: "Alpha",
        common_name: "AlphaTesty",
        email: "user@metabase.test",
      });

      render(<UserAvatar user={revisionUser} />);

      expect(await screen.findByText("AT")).toBeInTheDocument();
    });

    test("render user without name", async () => {
      const revisionUser = createMockUser({
        first_name: null,
        last_name: null,
        common_name: "user@metabase.test",
        email: "user@metabase.test",
      });

      render(<UserAvatar user={revisionUser} />);

      expect(await screen.findByText("US")).toBeInTheDocument();
    });
  });

  describe("Revision history", () => {
    test("render user with name", async () => {
      const revisionUser = createMockUser({
        first_name: "Testy",
        last_name: "Alpha",
        common_name: "AlphaTesty",
      });

      render(<UserAvatar user={revisionUser} />);

      expect(await screen.findByText("AT")).toBeInTheDocument();
    });

    test("render user without name", async () => {
      const revisionUser = createMockUser({
        first_name: null,
        last_name: null,
        common_name: "user@metabase.test",
      });

      render(<UserAvatar user={revisionUser} />);

      expect(await screen.findByText("US")).toBeInTheDocument();
    });
  });

  describe("Admin > Groups", () => {
    test("render group name", async () => {
      const revisionUser = createMockUser({
        first_name: "Admin",
        last_name: null,
      });

      render(<UserAvatar user={revisionUser} />);

      expect(await screen.findByText("A")).toBeInTheDocument();
    });
  });
});
