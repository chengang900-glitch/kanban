import userEvent from "@testing-library/user-event";
import fetchMock from "fetch-mock";

import { screen, waitFor } from "__support__/ui";

import { assertConversation, setup } from "../../tests/utils";

const conversationId = "11111111-1111-4111-8111-111111111111";

const mockConversationEndpoints = () => {
  fetchMock.get("path:/api/metabot/conversations", {
    data: [
      {
        conversation_id: conversationId,
        created_at: "2026-08-02T09:00:00Z",
        summary: "Show monthly revenue",
        user_id: 1,
        message_count: 2,
        last_message_at: "2026-08-02T09:01:00Z",
      },
    ],
    total: 1,
    limit: 50,
    offset: 0,
  });
  fetchMock.get(`path:/api/metabot/conversations/${conversationId}`, {
    conversation_id: conversationId,
    created_at: "2026-08-02T09:00:00Z",
    summary: "Show monthly revenue",
    user_id: 1,
    chat_messages: [
      {
        id: "user-1",
        role: "user",
        type: "text",
        message: "Show monthly revenue",
      },
      {
        id: "agent-1",
        role: "agent",
        type: "text",
        message: "Revenue is growing.",
        finished: true,
      },
    ],
    history: [
      { role: "user", content: "Show monthly revenue" },
      { role: "assistant", content: "Revenue is growing." },
    ],
    state: { queries: {} },
  });
};

const mockConversationList = (data: Record<string, unknown>[]) => {
  fetchMock.get("path:/api/metabot/conversations", {
    data,
    total: data.length,
    limit: 50,
    offset: 0,
  });
};

describe("MetabotHistory", () => {
  it("lists and restores a resumable conversation", async () => {
    mockConversationEndpoints();
    setup();

    await userEvent.click(await screen.findByTestId("metabot-history-button"));
    expect(await screen.findByTestId("metabot-history")).toBeInTheDocument();
    const listCall = fetchMock.callHistory.lastCall(
      "path:/api/metabot/conversations",
    );
    expect(new URL(listCall!.url).searchParams.get("profile-id")).toBe(
      "internal",
    );
    await userEvent.click(await screen.findByText("Show monthly revenue"));

    await assertConversation([
      ["user", "Show monthly revenue"],
      ["agent", "Revenue is growing."],
    ]);
  });

  it("starts a new conversation from history", async () => {
    mockConversationEndpoints();
    const { store } = setup();
    const originalId =
      store.getState().metabot.conversations.omnibot?.conversationId;

    await userEvent.click(await screen.findByTestId("metabot-history-button"));
    await userEvent.click(await screen.findByText("New conversation"));

    expect(
      store.getState().metabot.conversations.omnibot?.conversationId,
    ).not.toBe(originalId);
    expect(await screen.findByTestId("metabot-chat")).toBeInTheDocument();
  });

  it("shows the first prompts in most-recent activity order", async () => {
    mockConversationList([
      {
        conversation_id: "22222222-2222-4222-8222-222222222222",
        created_at: "2026-08-02T09:00:00Z",
        summary: "Older first prompt",
        user_id: 1,
        message_count: 2,
        last_message_at: "2026-08-02T09:01:00Z",
      },
      {
        conversation_id: "33333333-3333-4333-8333-333333333333",
        created_at: "2026-08-03T09:00:00Z",
        summary:
          "Newer first prompt that is intentionally long enough to be visually truncated",
        user_id: 1,
        message_count: 2,
        last_message_at: "2026-08-03T09:01:00Z",
      },
    ]);
    setup();

    await userEvent.click(await screen.findByTestId("metabot-history-button"));
    const newer = await screen.findByText(/Newer first prompt/);
    const older = await screen.findByText("Older first prompt");

    expect(
      newer.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(newer).toHaveAttribute(
      "title",
      "Newer first prompt that is intentionally long enough to be visually truncated",
    );
  });

  it("refreshes and closes conversation history", async () => {
    mockConversationEndpoints();
    setup();

    await userEvent.click(await screen.findByTestId("metabot-history-button"));
    await screen.findByText("Show monthly revenue");
    const callsBeforeRefresh = fetchMock.callHistory.calls(
      "path:/api/metabot/conversations",
    ).length;

    await userEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await waitFor(() => {
      expect(
        fetchMock.callHistory.calls("path:/api/metabot/conversations").length,
      ).toBeGreaterThan(callsBeforeRefresh);
    });

    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByTestId("metabot-history")).not.toBeInTheDocument();
  });

  it("deletes an owned conversation after confirmation", async () => {
    mockConversationEndpoints();
    fetchMock.delete(`path:/api/metabot/conversations/${conversationId}`, 204);
    const { store } = setup();

    await userEvent.click(await screen.findByTestId("metabot-history-button"));
    await userEvent.click(await screen.findByText("Show monthly revenue"));
    expect(store.getState().metabot.conversations.omnibot?.conversationId).toBe(
      conversationId,
    );

    await userEvent.click(await screen.findByTestId("metabot-history-button"));
    await userEvent.click(
      await screen.findByTestId(`delete-conversation-${conversationId}`),
    );
    expect(await screen.findByText("Delete conversation?")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(
        fetchMock.callHistory
          .calls(`path:/api/metabot/conversations/${conversationId}`)
          .filter((call) => call.options.method === "DELETE"),
      ).toHaveLength(1);
    });
    const deleteCall = fetchMock.callHistory
      .calls(`path:/api/metabot/conversations/${conversationId}`)
      .find((call) => call.options.method === "DELETE");
    expect(deleteCall?.options.method).toBe("DELETE");
    expect(new URL(deleteCall!.url).searchParams.get("profile-id")).toBe(
      "internal",
    );
    expect(
      store.getState().metabot.conversations.omnibot?.conversationId,
    ).not.toBe(conversationId);
    expect(screen.queryByTestId("metabot-history")).not.toBeInTheDocument();
  });

  it("does not offer deletion for a conversation owned by another user", async () => {
    mockConversationList([
      {
        conversation_id: conversationId,
        created_at: "2026-08-02T09:00:00Z",
        summary: "Shared conversation",
        user_id: 2,
        message_count: 2,
        last_message_at: "2026-08-02T09:01:00Z",
      },
    ]);
    setup();

    await userEvent.click(await screen.findByTestId("metabot-history-button"));
    expect(await screen.findByText("Shared conversation")).toBeInTheDocument();
    expect(
      screen.queryByTestId(`delete-conversation-${conversationId}`),
    ).not.toBeInTheDocument();
  });
});
