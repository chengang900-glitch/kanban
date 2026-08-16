import { t } from "ttag";

import {
  Form,
  FormErrorMessage,
  FormProvider,
  FormSubmitButton,
  FormTextInput,
} from "metabase/forms";
import { Box, Button, Divider, Flex } from "metabase/ui";

import { LICENSE_TOKEN_SCHEMA } from "./constants";

type LicenseTokenFormProps = {
  onSubmit: (token: string) => Promise<void>;
  onSkip: () => void;
  initialValue?: string;
};

export const LicenseTokenForm = ({
  onSubmit,
  onSkip,
  initialValue = "",
}: LicenseTokenFormProps) => {
  return (
    <FormProvider
      initialValues={{ license_token: initialValue }}
      validationSchema={LICENSE_TOKEN_SCHEMA}
      onSubmit={(values) => onSubmit(values.license_token)}
    >
      {({ errors, setValues }) => (
        <Form>
          <Box mb="md">
            <FormTextInput
              aria-label={t`Token`}
              placeholder={t`Paste your token here`}
              name="license_token"
              onChange={(e) => {
                const val = e.target.value;
                const trimmed = val.trim();
                if (val !== trimmed) {
                  setValues({ license_token: trimmed });
                }
              }}
            />
            <FormErrorMessage />
          </Box>
          <Flex gap="sm">
            <FormSubmitButton
              label={t`Activate`}
              activeLabel={t`Activating`}
              disabled={!!errors.license_token}
              variant="filled"
            />
          </Flex>
          <Divider mx={{ base: "-2rem", sm: "-4rem" }} mt="xl" mb="md" />
          <Box>
            <Button
              onClick={onSkip}
              variant="subtle"
              px={0}
              fw="normal"
            >{t`I'll activate later`}</Button>
          </Box>
        </Form>
      )}
    </FormProvider>
  );
};
