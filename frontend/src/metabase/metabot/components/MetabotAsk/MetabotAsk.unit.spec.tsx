import userEvent from "@testing-library/user-event";
import fetchMock from "fetch-mock";
import { assocIn } from "icepick";

import { screen, waitFor } from "__support__/ui";
import { getMetabotVisible } from "metabase/metabot/state";
import { getMetabotInitialState } from "metabase/metabot/state/reducer-utils";
import { createMockUser } from "metabase-types/api/mocks";

import {
  enterChatMessage,
  mockAgentEndpoint,
  setup,
  whoIsYourFavoriteResponse,
} from "../../tests/utils";

import { MetabotAsk } from "./MetabotAsk";

const greetingTitle =
  /What would you like to know\?|What do you want to explore\?|What are you looking to learn\?/;

const conversationId = "22222222-2222-4222-8222-222222222222";

const mockAskConversationEndpoints = () => {
  fetchMock.get("path:/api/metabot/conversations", {
    data: [
      {
        conversation_id: conversationId,
        created_at: "2026-08-03T09:00:00Z",
        summary: "每月订单量",
        user_id: 1,
        message_count: 2,
        last_message_at: "2026-08-03T09:01:00Z",
      },
    ],
    total: 1,
    limit: 50,
    offset: 0,
  });
  fetchMock.get(`path:/api/metabot/conversations/${conversationId}`, {
    conversation_id: conversationId,
    created_at: "2026-08-03T09:00:00Z",
    summary: "每月订单量",
    user_id: 1,
    chat_messages: [
      {
        id: "user-1",
        role: "user",
        type: "text",
        message: "每月有多少订单？",
      },
      {
        id: "agent-1",
        role: "agent",
        type: "text",
        message: "这是每月订单量。",
        finished: true,
      },
    ],
    history: [
      { role: "user", content: "每月有多少订单？" },
      { role: "assistant", content: "这是每月订单量。" },
    ],
    state: { queries: {} },
  });
};

describe("MetabotAsk", () => {
  it("shows the greeting and closes the global Metabot sidebar", async () => {
    const metabotInitialState = assocIn(
      getMetabotInitialState(),
      ["conversations", "omnibot", "visible"],
      true,
    );

    const { store } = setup({
      ui: <MetabotAsk />,
      metabotInitialState,
      promptSuggestions: [{ prompt: "Show me all orders" }],
    });

    expect(await screen.findByText(greetingTitle)).toBeInTheDocument();
    expect(await screen.findByText("Show me all orders")).toBeInTheDocument();
    expect(screen.getByTestId("metabot-chat-input")).toBeInTheDocument();
    expect(screen.queryByTestId("metabot-chat")).not.toBeInTheDocument();
    expect(getMetabotVisible(store.getState(), "omnibot")).toBe(false);
  });

  it("replaces the greeting with the conversation after sending a message", async () => {
    setup({ ui: <MetabotAsk /> });
    mockAgentEndpoint({ textChunks: whoIsYourFavoriteResponse });

    expect(await screen.findByText(greetingTitle)).toBeInTheDocument();

    await enterChatMessage("Who is your favorite?");

    expect(
      await screen.findByText("Who is your favorite?"),
    ).toBeInTheDocument();
    expect(await screen.findByTestId("metabot-chat")).toBeInTheDocument();
    expect(screen.queryByText(greetingTitle)).not.toBeInTheDocument();
  });

  it("shows the AI provider setup notice in the greeting when not configured", async () => {
    setup({
      ui: <MetabotAsk />,
      currentUser: createMockUser({ is_superuser: true }),
      isConfigured: false,
    });

    expect(
      await screen.findByText("To use AI问数, please", {
        exact: false,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "connect to a model" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("metabot-chat-input")).not.toBeInTheDocument();
  });

  it("lists and restores only NLQ conversation history", async () => {
    mockAskConversationEndpoints();
    setup({ ui: <MetabotAsk /> });

    await userEvent.click(await screen.findByTestId("metabot-history-button"));
    expect(screen.getByTestId("metabot-history-drawer")).toBeInTheDocument();
    expect(await screen.findByTestId("metabot-history")).toBeInTheDocument();
    expect(screen.getByText(greetingTitle)).toBeInTheDocument();

    await waitFor(() => {
      const listCall = fetchMock.callHistory.lastCall(
        "path:/api/metabot/conversations",
      );
      expect(new URL(listCall!.url).searchParams.get("profile-id")).toBe("nlq");
    });

    await userEvent.click(await screen.findByText("每月订单量"));
    expect(await screen.findByText("每月有多少订单？")).toBeInTheDocument();
    expect(await screen.findByText("这是每月订单量。")).toBeInTheDocument();

    const detailCall = fetchMock.callHistory.lastCall(
      `path:/api/metabot/conversations/${conversationId}`,
    );
    expect(new URL(detailCall!.url).searchParams.get("profile-id")).toBe("nlq");
  });
});
