import { isFulfilled } from "@reduxjs/toolkit";
import { useCallback } from "react";

import { useMetabotContext } from "metabase/metabot";
import {
  type FetchedChatMessage,
  normalizeFetchedChatMessages,
} from "metabase/metabot/utils/normalize-fetched-chat-messages";
import { useDispatch, useSelector } from "metabase/redux";
import type { MetabotConversationDetail } from "metabase-types/api";

import { trackMetabotRequestSent } from "../analytics";
import type { MetabotProfileId } from "../constants";
import {
  type MetabotAgentId,
  type MetabotPromptSubmissionResult,
  type MetabotUserChatMessage,
  cancelInflightAgentRequests,
  getActiveToolCalls,
  getConversationId,
  getDebugMode,
  getIsLongMetabotConversation,
  getIsProcessing,
  getMessages,
  getMetabotId,
  getMetabotReactionsState,
  getMetabotRequestId,
  getMetabotVisible,
  resetConversation as resetConversationAction,
  retryPrompt,
  setConversationSnapshot,
  setProfileOverride as setProfileOverrideAction,
  setVisible as setVisibleAction,
  submitInput as submitInputAction,
} from "../state";

export const useMetabotAgent = (agentId: MetabotAgentId = "omnibot") => {
  const dispatch = useDispatch();
  const { prompt, setPrompt, promptInputRef, getChatContext } =
    useMetabotContext();

  const metabotRequestId = useSelector((state) =>
    getMetabotRequestId(state, agentId),
  );
  const visible = useSelector((state) => getMetabotVisible(state, agentId));
  const isDoingScience = useSelector((state) =>
    getIsProcessing(state, agentId),
  );

  const setVisible = useCallback(
    (visible: boolean) => dispatch(setVisibleAction({ agentId, visible })),
    [dispatch, agentId],
  );

  const prepareRetryIfUnsuccesful = useCallback(
    (result: MetabotPromptSubmissionResult) => {
      if (!result.success && result.shouldRetry) {
        promptInputRef?.current?.focus();
        setPrompt(result.prompt);
      }
    },
    [promptInputRef, setPrompt],
  );

  const setProfileOverride = useCallback(
    (profile: MetabotProfileId | undefined) => {
      dispatch(setProfileOverrideAction({ agentId, profile }));
    },
    [dispatch, agentId],
  );

  const submitInput = useCallback(
    async (
      prompt: string | Omit<MetabotUserChatMessage, "id" | "role">,
      options?: {
        profile?: MetabotProfileId | undefined;
        preventOpenSidebar?: boolean;
        focusInput?: boolean;
      },
    ) => {
      setPrompt("");

      if (!visible && !options?.preventOpenSidebar) {
        setVisible(true);
      }

      if (options?.focusInput) {
        promptInputRef?.current?.focus();
      }

      const action = await dispatch(
        submitInputAction({
          ...(typeof prompt === "string"
            ? { type: "text", message: prompt }
            : prompt),
          context: await getChatContext(),
          agentId,
          metabot_id: metabotRequestId,
          profile: options?.profile,
        }),
      );

      trackMetabotRequestSent();

      if (isFulfilled(action)) {
        prepareRetryIfUnsuccesful(action.payload);
      }

      return action;
    },
    [
      dispatch,
      getChatContext,
      metabotRequestId,
      prepareRetryIfUnsuccesful,
      setVisible,
      visible,
      agentId,
      promptInputRef,
      setPrompt,
    ],
  );

  const retryMessage = useCallback(
    async (messageId: string) => {
      const context = await getChatContext();
      const action = await dispatch(
        retryPrompt({
          messageId,
          context,
          metabot_id: metabotRequestId,
          agentId,
        }),
      );
      if (isFulfilled(action)) {
        prepareRetryIfUnsuccesful(action.payload);
      }
    },
    [
      dispatch,
      getChatContext,
      metabotRequestId,
      prepareRetryIfUnsuccesful,
      agentId,
    ],
  );

  const cancelRequest = useCallback(() => {
    dispatch(cancelInflightAgentRequests(agentId));
  }, [dispatch, agentId]);

  const resetConversation = useCallback(() => {
    dispatch(resetConversationAction({ agentId }));
  }, [agentId, dispatch]);

  const restoreConversation = useCallback(
    (conversation: MetabotConversationDetail) => {
      if (isDoingScience) {
        return false;
      }

      dispatch(
        setConversationSnapshot({
          agentId,
          conversationId: conversation.conversation_id,
          messages: normalizeFetchedChatMessages(
            conversation.chat_messages as FetchedChatMessage[],
          ),
          history: conversation.history,
          state: conversation.state,
          suggestedTransforms: [],
          activeToolCalls: [],
        }),
      );
      return true;
    },
    [agentId, dispatch, isDoingScience],
  );

  return {
    prompt,
    setPrompt,
    promptInputRef,
    visible,
    setVisible,
    setProfileOverride,
    resetConversation,
    restoreConversation,
    submitInput,
    retryMessage,
    cancelRequest,
    conversationId: useSelector((state) => getConversationId(state, agentId)),
    metabotId: useSelector(getMetabotId),
    messages: useSelector((state) => getMessages(state, agentId)),
    isDoingScience,
    isLongConversation: useSelector((state) =>
      getIsLongMetabotConversation(state, agentId),
    ),
    activeToolCalls: useSelector((state) => getActiveToolCalls(state, agentId)),
    debugMode: useSelector(getDebugMode),
    reactions: useSelector(getMetabotReactionsState),
  };
};
