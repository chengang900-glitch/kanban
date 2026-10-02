import { type FormikHelpers, useFormikContext } from "formik";
import { useMemo, useState } from "react";
import { t } from "ttag";

import {
  useUpdateMetabotSettingsMutation,
  useValidateMetabotSettingsMutation,
} from "metabase/api";
import { getErrorMessage, useAdminSettings } from "metabase/api/utils";
import { SetByEnvVar } from "metabase/common/components/SetByEnvVar";
import { useToast } from "metabase/common/hooks";
import {
  FormErrorMessage,
  FormProvider,
  FormSelect,
  FormTextInput,
} from "metabase/forms";
import { Autocomplete, Button, Text } from "metabase/ui";
import type {
  MetabotCredentials,
  MetabotSettingsResponse,
} from "metabase-types/api";

import { useAIProviderConfigurationContext } from "./AIProviderConfigurationContext";

const SETTING_KEYS = [
  "llm-openai-compatible-api-key",
  "llm-openai-compatible-api-base-url",
  "llm-openai-compatible-api-protocol",
] as const;

type OpenAICompatibleProtocol = "chat-completions" | "responses";

type OpenAICompatibleValues = {
  apiKey: string;
  baseUrl: string;
  model: string;
  protocol: OpenAICompatibleProtocol;
};

export const OpenAICompatibleProviderFields = ({
  connectedModel,
  isCurrentConfigured,
  isEnvSetting,
}: {
  connectedModel: string | undefined;
  isCurrentConfigured: boolean;
  isEnvSetting: boolean;
}) => {
  const [updateMetabotSettings] = useUpdateMetabotSettingsMutation();
  const { details } = useAdminSettings(SETTING_KEYS);

  const initialValues = useMemo<OpenAICompatibleValues>(
    () => ({
      apiKey: String(details["llm-openai-compatible-api-key"]?.value ?? ""),
      baseUrl: String(
        details["llm-openai-compatible-api-base-url"]?.value ?? "",
      ),
      model: isCurrentConfigured ? (connectedModel ?? "") : "",
      protocol:
        details["llm-openai-compatible-api-protocol"]?.value === "responses"
          ? "responses"
          : "chat-completions",
    }),
    [connectedModel, details, isCurrentConfigured],
  );

  const handleSubmit = async (
    values: OpenAICompatibleValues,
    { resetForm }: FormikHelpers<OpenAICompatibleValues>,
  ) => {
    await updateMetabotSettings({
      provider: "openai-compatible",
      model: values.model,
      credentials: changedCredentials(values, initialValues),
    }).unwrap();

    resetForm({ values });
  };

  return (
    <FormProvider
      initialValues={initialValues}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      <OpenAICompatibleCredentialFields
        initialValues={initialValues}
        isCurrentConfigured={isCurrentConfigured}
        isEnvSetting={isEnvSetting}
      />
    </FormProvider>
  );
};

const changedCredentials = (
  values: OpenAICompatibleValues,
  initialValues: OpenAICompatibleValues,
) => {
  const credentials: MetabotCredentials = {};

  if (values.apiKey !== initialValues.apiKey) {
    credentials["api-key"] = values.apiKey || null;
  }
  if (values.baseUrl !== initialValues.baseUrl) {
    credentials["base-url"] = values.baseUrl || null;
  }
  if (values.protocol !== initialValues.protocol) {
    credentials.protocol = values.protocol;
  }

  return credentials;
};

const OpenAICompatibleCredentialFields = ({
  initialValues,
  isCurrentConfigured,
  isEnvSetting,
}: {
  initialValues: OpenAICompatibleValues;
  isCurrentConfigured: boolean;
  isEnvSetting: boolean;
}) => {
  const { dirty, setFieldValue, submitForm, values } =
    useFormikContext<OpenAICompatibleValues>();
  const [validateSettings, validateResult] =
    useValidateMetabotSettingsMutation();
  const [models, setModels] = useState<MetabotSettingsResponse["models"]>([]);
  const [sendToast] = useToast();
  const { details } = useAdminSettings(SETTING_KEYS);

  const apiKeySetting = details["llm-openai-compatible-api-key"];
  const baseUrlSetting = details["llm-openai-compatible-api-base-url"];
  const protocolSetting = details["llm-openai-compatible-api-protocol"];
  const apiKeyEnvName = apiKeySetting?.is_env_setting
    ? apiKeySetting.env_name
    : undefined;
  const baseUrlEnvName = baseUrlSetting?.is_env_setting
    ? baseUrlSetting.env_name
    : undefined;
  const protocolEnvName = protocolSetting?.is_env_setting
    ? protocolSetting.env_name
    : undefined;

  const isComplete =
    !!values.apiKey.trim() && !!values.baseUrl.trim() && !!values.model.trim();
  const connectHandler =
    isComplete && (!isCurrentConfigured || dirty)
      ? async () => {
          validateResult.reset();
          await submitForm();
        }
      : null;
  const { isMutating } = useAIProviderConfigurationContext(connectHandler);

  const handleValidate = async () => {
    try {
      const response = await validateSettings({
        provider: "openai-compatible",
        model: values.model || undefined,
        credentials: changedCredentials(values, initialValues),
      }).unwrap();

      setModels(response.models);
      sendToast({ message: t`Connection successful`, icon: "check" });
    } catch {
      return;
    }
  };

  const validationError = validateResult.error
    ? getErrorMessage(
        validateResult.error,
        t`Unable to connect to the model provider.`,
      )
    : undefined;

  return (
    <>
      <FormSelect
        name="protocol"
        label={t`API protocol`}
        description={t`Choose the protocol supported by your model service. Chat Completions is compatible with more providers.`}
        data={[
          { value: "chat-completions", label: t`Chat Completions` },
          { value: "responses", label: t`Responses API` },
        ]}
        disabled={isMutating || isEnvSetting || !!protocolEnvName}
      />
      {protocolEnvName && <SetByEnvVar varName={protocolEnvName} />}

      <FormTextInput
        name="baseUrl"
        label={t`API base URL`}
        description={t`The base URL of the selected OpenAI-compatible API.`}
        placeholder="https://api.example.com/v1"
        disabled={isMutating || isEnvSetting || !!baseUrlEnvName}
        w="100%"
      />
      {baseUrlEnvName && <SetByEnvVar varName={baseUrlEnvName} />}

      <FormTextInput
        name="apiKey"
        label={t`API key`}
        type="password"
        description={t`The API key provided by your model service.`}
        placeholder={t`Enter the provider API key`}
        disabled={isMutating || isEnvSetting || !!apiKeyEnvName}
        w="100%"
      />
      {apiKeyEnvName && <SetByEnvVar varName={apiKeyEnvName} />}

      <Autocomplete
        label={t`Model`}
        description={t`Select a discovered model or enter a model identifier manually.`}
        placeholder={t`Enter a model name`}
        data={models.map(({ id }) => id)}
        value={values.model}
        onChange={(value) => setFieldValue("model", value)}
        disabled={isMutating || isEnvSetting}
      />

      <Button
        type="button"
        variant="subtle"
        onClick={handleValidate}
        loading={validateResult.isLoading}
        disabled={
          isMutating ||
          validateResult.isLoading ||
          !values.apiKey.trim() ||
          !values.baseUrl.trim()
        }
      >
        {t`Test connection and load models`}
      </Button>

      {validationError && (
        <Text size="sm" c="error" role="alert">
          {validationError}
        </Text>
      )}

      <FormErrorMessage />
    </>
  );
};
