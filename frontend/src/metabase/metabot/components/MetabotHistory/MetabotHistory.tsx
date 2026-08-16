import { useState } from "react";
import { t } from "ttag";

import {
  useDeleteUserMetabotConversationMutation,
  useLazyGetUserMetabotConversationQuery,
  useListUserMetabotConversationsQuery,
} from "metabase/api/metabot";
import { ConfirmModal } from "metabase/common/components/ConfirmModal";
import type { MetabotProfileId } from "metabase/metabot/constants";
import { useMetabotAgent } from "metabase/metabot/hooks";
import type { MetabotAgentId } from "metabase/metabot/state";
import { useSelector } from "metabase/redux";
import { getUserId } from "metabase/selectors/user";
import {
  ActionIcon,
  Box,
  Button,
  Flex,
  Icon,
  Loader,
  Stack,
  Text,
  Title,
  Tooltip,
  UnstyledButton,
} from "metabase/ui";

import S from "./MetabotHistory.module.css";

const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "";

export const MetabotHistory = ({
  agentId,
  profileId,
  onClose,
  onNewConversation,
}: {
  agentId: MetabotAgentId;
  profileId: MetabotProfileId;
  onClose: () => void;
  onNewConversation: () => void;
}) => {
  const metabot = useMetabotAgent(agentId);
  const currentUserId = useSelector(getUserId);
  const conversations = useListUserMetabotConversationsQuery({
    limit: 50,
    profileId,
  });
  const [getConversation, detail] = useLazyGetUserMetabotConversationQuery();
  const [deleteConversation, deletion] =
    useDeleteUserMetabotConversationMutation();
  const [selectedId, setSelectedId] = useState<string>();
  const [conversationToDelete, setConversationToDelete] = useState<string>();

  const handleSelect = async (conversationId: string) => {
    if (metabot.isDoingScience) {
      return;
    }

    setSelectedId(conversationId);
    try {
      const conversation = await getConversation(
        { conversationId, profileId },
        true,
      ).unwrap();
      if (metabot.restoreConversation(conversation)) {
        onClose();
      }
    } catch {
      // RTK Query exposes the error state below the list.
    } finally {
      setSelectedId(undefined);
    }
  };

  const handleDelete = async () => {
    if (!conversationToDelete) {
      return;
    }

    const deletedId = conversationToDelete;
    try {
      await deleteConversation({
        conversationId: deletedId,
        profileId,
      }).unwrap();
      setConversationToDelete(undefined);

      if (metabot.conversationId === deletedId) {
        onNewConversation();
      }
    } catch {
      // RTK Query exposes the error in the confirmation modal.
    }
  };

  const items = [...(conversations.currentData?.data ?? [])].sort((a, b) => {
    const aTime = a.last_message_at ?? a.created_at;
    const bTime = b.last_message_at ?? b.created_at;
    return bTime.localeCompare(aTime);
  });

  return (
    <Box className={S.container} data-testid="metabot-history">
      <Flex
        className={S.header}
        align="center"
        justify="space-between"
        gap="md"
      >
        <Title order={3}>{t`Conversation history`}</Title>
        <Flex gap="sm">
          <Button
            size="compact-sm"
            leftSection={<Icon name="add" />}
            onClick={onNewConversation}
          >
            {t`New conversation`}
          </Button>
          <Tooltip label={t`Refresh`} position="bottom">
            <ActionIcon
              aria-label={t`Refresh`}
              disabled={conversations.isFetching}
              onClick={() => conversations.refetch()}
            >
              <Icon name="refresh" />
            </ActionIcon>
          </Tooltip>
          <Tooltip label={t`Close`} position="bottom">
            <ActionIcon aria-label={t`Close`} onClick={onClose}>
              <Icon name="close" />
            </ActionIcon>
          </Tooltip>
        </Flex>
      </Flex>

      <Stack className={S.list} gap="xs">
        {conversations.isLoading && (
          <Flex justify="center" p="xl">
            <Loader />
          </Flex>
        )}
        {conversations.isError && (
          <Text
            c="error"
            ta="center"
            p="xl"
          >{t`Couldn't load conversation history.`}</Text>
        )}
        {!conversations.isLoading &&
          !conversations.isError &&
          items.length === 0 && (
            <Text
              c="text-secondary"
              ta="center"
              p="xl"
            >{t`No previous conversations yet.`}</Text>
          )}
        {items.map((conversation) => {
          const activityDate =
            conversation.last_message_at ?? conversation.created_at;
          const date = formatDate(activityDate);
          return (
            <Flex
              key={conversation.conversation_id}
              className={S.item}
              align="center"
            >
              <UnstyledButton
                className={S.itemButton}
                disabled={metabot.isDoingScience || detail.isFetching}
                aria-busy={
                  selectedId === conversation.conversation_id &&
                  detail.isFetching
                }
                onClick={() => handleSelect(conversation.conversation_id)}
              >
                <Flex align="center" gap="sm">
                  <Box className={S.itemLabel}>
                    <Text
                      className={S.summary}
                      fw="bold"
                      title={conversation.summary ?? undefined}
                    >
                      {conversation.summary || t`Conversation from ${date}`}
                    </Text>
                    <Text c="text-secondary" fz="sm">
                      {date}
                    </Text>
                  </Box>
                  {selectedId === conversation.conversation_id &&
                    detail.isFetching && <Loader size="sm" />}
                </Flex>
              </UnstyledButton>
              {conversation.user_id === currentUserId && (
                <Tooltip label={t`Delete conversation`} position="left">
                  <ActionIcon
                    className={S.deleteButton}
                    aria-label={t`Delete conversation`}
                    data-testid={`delete-conversation-${conversation.conversation_id}`}
                    disabled={metabot.isDoingScience || deletion.isLoading}
                    color="feedback-negative"
                    variant="subtle"
                    onClick={() =>
                      setConversationToDelete(conversation.conversation_id)
                    }
                  >
                    <Icon name="trash" />
                  </ActionIcon>
                </Tooltip>
              )}
            </Flex>
          );
        })}
        {detail.isError && (
          <Text
            c="error"
            ta="center"
          >{t`Couldn't restore this conversation.`}</Text>
        )}
      </Stack>
      <ConfirmModal
        opened={conversationToDelete != null}
        title={t`Delete conversation?`}
        message={t`This permanently deletes this conversation and all of its messages. This action cannot be undone.`}
        confirmButtonText={t`Delete`}
        errorMessage={
          deletion.isError ? t`Couldn't delete this conversation.` : undefined
        }
        onConfirm={handleDelete}
        onClose={() => setConversationToDelete(undefined)}
      />
    </Box>
  );
};
