import { useEffect, useState } from "react";
import { t } from "ttag";

import type { MetabotConfig } from "metabase/metabot/components/Metabot";
import { MetabotChat } from "metabase/metabot/components/MetabotChat";
import { MetabotHistory } from "metabase/metabot/components/MetabotHistory";
import { useMetabotAgent } from "metabase/metabot/hooks";
import type { SuggestionModel } from "metabase/rich_text_editing/tiptap/extensions/shared/types";
import { ActionIcon, Box, Flex, Icon, Tooltip } from "metabase/ui";

import S from "./MetabotAsk.module.css";
import { MetabotGreeting } from "./MetabotGreeting";

const SUGGESTION_MODELS: SuggestionModel[] = [
  "dataset",
  "metric",
  "card",
  "table",
  "database",
  "dashboard",
];

const askConfig: MetabotConfig = {
  agentId: "ask",
  suggestionModels: SUGGESTION_MODELS,
};

export const MetabotAsk = () => {
  const { setVisible: setSidebarVisible } = useMetabotAgent("omnibot");
  const metabot = useMetabotAgent("ask");
  const { messages, isDoingScience } = metabot;
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(
    function closeSidebarOnMount() {
      setSidebarVisible(false);
    },
    [setSidebarVisible],
  );

  const showGreeting = messages.length === 0 && !isDoingScience;

  return (
    <Flex
      pos="relative"
      h="100%"
      w="100%"
      justify="center"
      bg="background_page-primary"
    >
      {showGreeting ? (
        <MetabotGreeting agentId="ask" suggestionModels={SUGGESTION_MODELS} />
      ) : (
        <Box pos="relative" h="100%" w="100%">
          <Box className={S.topFade} />
          <MetabotChat config={askConfig} className={S.chat} />
        </Box>
      )}
      {isHistoryOpen && (
        <Box className={S.historyDrawer} data-testid="metabot-history-drawer">
          <MetabotHistory
            agentId="ask"
            profileId="nlq"
            onClose={() => setIsHistoryOpen(false)}
            onNewConversation={() => {
              metabot.resetConversation();
              setIsHistoryOpen(false);
            }}
          />
        </Box>
      )}
      {!isHistoryOpen && (
        <Tooltip label={t`Conversation history`} position="bottom">
          <ActionIcon
            className={S.historyButton}
            onClick={() => setIsHistoryOpen(true)}
            data-testid="metabot-history-button"
          >
            <Icon name="history" />
          </ActionIcon>
        </Tooltip>
      )}
    </Flex>
  );
};
