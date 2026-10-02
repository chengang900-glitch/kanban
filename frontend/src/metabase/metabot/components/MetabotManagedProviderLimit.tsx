import { useDisclosure } from "@mantine/hooks";
import { useCallback } from "react";
import { t } from "ttag";

import { useDispatch, useSelector } from "metabase/redux";
import { dismissUndo } from "metabase/redux/undo";
import { canAccessSettings } from "metabase/selectors/user";
import {
  Button,
  Flex,
  type FlexProps,
  HoverCard,
  Modal,
  Text,
} from "metabase/ui";

import { AIProviderConfigurationForm } from "./AIProviderConfigurationForm";

const METABOT_MANAGED_PROVIDER_LIMIT_TOAST_ID =
  "metabot-managed-provider-limit";

type MetabotManagedProviderLimitActionsProps = {
  inline?: boolean;
  onConfigure?: VoidFunction;
  onConfigureClose?: VoidFunction;
} & FlexProps;

export const MetabotManagedProviderLimitActions = ({
  inline = false,
  onConfigure,
  onConfigureClose,
  ...rest
}: MetabotManagedProviderLimitActionsProps) => {
  const canConfigureAi = useSelector(canAccessSettings);
  const [isOpen, { open, close }] = useDisclosure(false, {
    onClose: onConfigureClose,
  });
  const handleConfigure = useCallback(() => {
    (onConfigure ?? open)();
  }, [onConfigure, open]);

  const configureModal = (
    <Modal
      title={t`Connect to an AI provider`}
      onClose={close}
      opened={isOpen}
      size="lg"
    >
      <AIProviderConfigurationForm isModal onClose={close} />
    </Modal>
  );

  if (!canConfigureAi) {
    return (
      <Flex
        direction={inline ? "row" : "column"}
        align={inline ? "center" : "start"}
        {...rest}
      >
        <Text c="text-secondary" fz="sm" lh="1rem">
          {t`Ask your admin to configure the AI provider.`}
        </Text>
      </Flex>
    );
  }

  if (inline) {
    return (
      <Flex align="center" gap="sm" wrap="wrap" {...rest}>
        <Button
          h="1rem"
          variant="subtle"
          size="xs"
          fz="sm"
          p={0}
          onClick={handleConfigure}
        >
          {t`Use a different AI provider`}
        </Button>
        {configureModal}
      </Flex>
    );
  }

  return (
    <Flex direction="column" align="start" gap="xs" {...rest}>
      <Button
        variant="subtle"
        size="xs"
        p={0}
        onClick={handleConfigure}
      >{t`Use a different AI provider`}</Button>
      {configureModal}
    </Flex>
  );
};

export const MetabotManagedProviderLimitHoverCard = () => {
  return (
    <HoverCard
      closeDelay={100}
      openDelay={150}
      position="top-start"
      shadow="md"
      width="26rem"
    >
      <HoverCard.Target>
        <Text
          component="span"
          fz="sm"
          td="underline dotted"
          style={{ cursor: "pointer", textUnderlineOffset: "2px" }}
        >
          {t`You've run out of AI service tokens`}
        </Text>
      </HoverCard.Target>
      <HoverCard.Dropdown p="md">
        <Flex direction="column" gap="sm">
          <Text fz="sm" lh={1.5}>
            {t`Configure OpenAI Compatible to continue using AI features.`}
          </Text>
          <MetabotManagedProviderLimitActions inline />
        </Flex>
      </HoverCard.Dropdown>
    </HoverCard>
  );
};

const MetabotManagedProviderLimitToastContent = () => {
  const dispatch = useDispatch();

  const dismissToast = useCallback(() => {
    dispatch(dismissUndo({ undoId: METABOT_MANAGED_PROVIDER_LIMIT_TOAST_ID }));
  }, [dispatch]);

  return (
    <Flex direction="column" gap="xs">
      <Text c="text-primary" fw={500} lh={1.4}>
        {t`You've run out of AI service tokens`}
      </Text>
      <Text c="text-secondary" fz="sm" lh={1.4}>
        {t`Configure OpenAI Compatible to continue using AI features.`}
      </Text>
      <MetabotManagedProviderLimitActions
        inline
        mt="sm"
        onConfigureClose={dismissToast}
      />
    </Flex>
  );
};

export const getMetabotManagedProviderLimitToastProps = () => ({
  id: METABOT_MANAGED_PROVIDER_LIMIT_TOAST_ID,
  dark: false,
  icon: null,
  toastColor: "feedback-negative" as const,
  dismissIconColor: "text-secondary" as const,
  timeout: 0,
  style: {
    padding: "1rem",
    width: "min(24rem, calc(100vw - 2 * var(--mantine-spacing-md)))",
  },
  renderChildren: () => <MetabotManagedProviderLimitToastContent />,
});
