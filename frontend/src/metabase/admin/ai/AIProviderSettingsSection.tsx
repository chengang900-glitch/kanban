import { useMemo } from "react";
import { P, match } from "ts-pattern";
import { t } from "ttag";

import { SettingsSection } from "metabase/admin/components/SettingsSection";
import { skipToken, useGetMetabotSettingsQuery } from "metabase/api";
import { useAdminSetting } from "metabase/api/utils";
import { useSetting } from "metabase/common/hooks";
import {
  AIProviderConfigurationForm,
  DEFAULT_HIDDEN_PROVIDERS,
  getProviderOptions,
  parseProviderAndModel,
} from "metabase/metabot";
import { PLUGIN_METABOT } from "metabase/plugins";
import { Badge, Flex, Group } from "metabase/ui";
import type { MetabotProvider } from "metabase-types/api";

export function AIProviderSettingsSection({
  id,
  hiddenProviders,
}: {
  id?: string;
  hiddenProviders?: readonly MetabotProvider[];
}) {
  const offerMetabaseAiManaged = PLUGIN_METABOT.isEnabled;
  const { value: savedProviderValue } = useAdminSetting("llm-metabot-provider");
  const config = useMemo(
    () => parseProviderAndModel(savedProviderValue),
    [savedProviderValue],
  );
  const isConfigured = !!useSetting("llm-metabot-configured?");
  const effectiveHiddenProviders = hiddenProviders ?? DEFAULT_HIDDEN_PROVIDERS;
  const connectedProvider =
    isConfigured &&
    config?.provider &&
    !effectiveHiddenProviders.includes(config.provider)
      ? config.provider
      : undefined;
  const connectedProviderSettingsQuery = useGetMetabotSettingsQuery(
    connectedProvider && connectedProvider !== "metabase"
      ? { provider: connectedProvider }
      : skipToken,
  );
  const hasCredentialsError =
    !!connectedProviderSettingsQuery.currentData?.["credentials-error"];

  return (
    <SettingsSection
      id={id}
      title={
        <Flex justify="space-between" align="center">
          <Group gap="xs" wrap="nowrap">
            {connectedProvider && (
              <Badge
                circle
                size="12"
                bg={
                  hasCredentialsError
                    ? "feedback-negative"
                    : "feedback-positive"
                }
                mr="sm"
              />
            )}
            <div>
              {match({ connectedProvider, hasCredentialsError })
                .with(
                  {
                    connectedProvider: P.nonNullable,
                    hasCredentialsError: true,
                  },
                  ({ connectedProvider }) =>
                    t`Error connecting to ${getProviderOptions(offerMetabaseAiManaged)[connectedProvider]?.label}`,
                )
                .with(
                  { connectedProvider: P.nonNullable },
                  ({ connectedProvider }) =>
                    t`Connected to ${getProviderOptions(offerMetabaseAiManaged)[connectedProvider]?.label}`,
                )
                .with(
                  { connectedProvider: P.nullish },
                  () => t`Connect to an AI provider`,
                )
                .exhaustive()}
            </div>
          </Group>
        </Flex>
      }
      description={
        !connectedProvider
          ? t`Select your AI provider to use AI explorations, SQL generation and Metabot.`
          : undefined
      }
    >
      <AIProviderConfigurationForm hiddenProviders={hiddenProviders} />
    </SettingsSection>
  );
}
