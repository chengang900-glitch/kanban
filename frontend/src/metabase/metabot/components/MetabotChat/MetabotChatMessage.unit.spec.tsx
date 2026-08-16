import { renderWithProviders, screen, within } from "__support__/ui";
import type { MetabotAgentChatMessage } from "metabase/metabot/state";
import { createMockUser } from "metabase-types/api/mocks";

import { AgentMessage, Messages } from "./MetabotChatMessage";

const setup = (message: MetabotAgentChatMessage) =>
  renderWithProviders(
    <AgentMessage
      debug={false}
      readonly={false}
      hideActions
      setFeedbackMessage={() => {}}
      submittedFeedback={undefined}
      getCopyText={() => ""}
      message={message}
    />,
    {
      storeInitialState: {
        currentUser: createMockUser({ is_superuser: true }),
      },
    },
  );

describe("AgentMessage", () => {
  it("never renders raw reasoning, including in debug mode", () => {
    renderWithProviders(
      <Messages
        messages={[
          { id: "u1", role: "user", type: "text", message: "question" },
          {
            id: "reasoning-1",
            role: "agent",
            type: "reasoning",
            message: "Checking the available tables",
          },
          { id: "a1", role: "agent", type: "text", message: "answer" },
        ]}
        isDoingScience={false}
        debug
      />,
    );

    expect(
      screen.queryByText("Checking the available tables"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("answer")).toBeInTheDocument();
  });

  it("does not render execution details for a completed turn", () => {
    renderWithProviders(
      <Messages
        messages={[
          { id: "u1", role: "user", type: "text", message: "question" },
          {
            id: "t1",
            role: "agent",
            type: "tool_call",
            name: "construct_notebook_query",
            args: JSON.stringify({
              query: { stages: [{ "source-card": "sales-model" }] },
            }),
            status: "ended",
            result: "ok",
          },
          { id: "a1", role: "agent", type: "text", message: "answer" },
        ]}
        isDoingScience={false}
        debug={false}
      />,
    );

    expect(screen.getByText("answer")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Execution details/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("metabot-execution-details"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("sales-model")).not.toBeInTheDocument();
  });

  it("hides the action bar on the last agent message while processing", () => {
    renderWithProviders(
      <Messages
        messages={[
          { id: "u1", role: "user", type: "text", message: "hi" },
          { id: "a1", role: "agent", type: "text", message: "hello" },
        ]}
        isDoingScience
        debug={false}
      />,
    );

    const [, agentMessage] = screen.getAllByTestId("metabot-chat-message");
    expect(
      within(agentMessage).queryByTestId("metabot-chat-message-copy"),
    ).not.toBeInTheDocument();
  });

  describe("turn_errored", () => {
    it("shows a specific message when the agent reaches its step limit", () => {
      setup({
        id: "msg",
        role: "agent",
        type: "turn_errored",
        error: {
          message: "step limit",
          "error-code": "metabot_max_iterations",
        },
      });

      expect(
        screen.getByText(
          /reached its step limit before a reliable final answer/,
        ),
      ).toBeInTheDocument();
    });

    it("shows locked message for metabase_ai_managed_locked errors", () => {
      setup({
        id: "msg",
        role: "agent",
        type: "turn_errored",
        error: { type: "metabase_ai_managed_locked" },
        display: {
          type: "locked",
          message: "You've used all of your included AI service tokens.",
        },
      });

      expect(
        screen.getByText(
          /You've used all of your included AI service tokens\./,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Start paid subscription/ }),
      ).toHaveAttribute(
        "href",
        "https://store.staging.metabase.com/account/manage/plans",
      );
    });

    it("shows the custom display message when provided", () => {
      setup({
        id: "msg",
        role: "agent",
        type: "turn_errored",
        error: { type: "stream_error" },
        display: {
          type: "alert",
          message: "The model is overloaded, please try again.",
        },
      });

      expect(
        screen.getByText(/The model is overloaded, please try again\./),
      ).toBeInTheDocument();
    });

    it("shows generic alert message when display message is missing", () => {
      setup({
        id: "msg",
        role: "agent",
        type: "turn_errored",
        error: { type: "stream_error" },
      });

      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    });

    it("renders the raw error payload as a debug card when debug is true", () => {
      renderWithProviders(
        <AgentMessage
          debug
          readonly={false}
          hideActions
          setFeedbackMessage={() => {}}
          submittedFeedback={undefined}
          getCopyText={() => ""}
          message={{
            id: "msg",
            role: "agent",
            type: "turn_errored",
            error: { type: "stream_error", message: "boom" },
          }}
        />,
      );

      const debugCard = screen.getByTestId(
        "metabot-chat-message-turn-alert-debug",
      );
      expect(debugCard).toHaveTextContent(/stream_error/);
      expect(debugCard).toHaveTextContent(/boom/);
    });
  });
});
