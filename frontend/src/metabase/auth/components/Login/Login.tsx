import type { Location } from "history";
import { t } from "ttag";
import _ from "underscore";

import { useSetting } from "metabase/common/hooks";
import { usePageTitle } from "metabase/hooks/use-page-title";
import type { AuthProvider } from "metabase/plugins/types";
import { useSelector } from "metabase/redux";
import { Box, Button, Divider } from "metabase/ui";
import { getBasename } from "metabase/utils/basename";

import { getAuthProviders } from "../../selectors";
import { AuthLayout } from "../AuthLayout";

interface LoginQueryString {
  redirect?: string;
}

interface LoginQueryParams {
  provider?: string;
}

interface LoginProps {
  params?: LoginQueryParams;
  location?: Location<LoginQueryString>;
}

export const Login = ({ params, location }: LoginProps): JSX.Element => {
  const providers = useSelector(getAuthProviders);
  const keycloakEnabled = useSetting("oss-keycloak-enabled");
  const selection = getSelectedProvider(providers, params?.provider);
  const redirectUrl = location?.query?.redirect;

  usePageTitle(t`Login`);

  const [passwordProvider, otherProviders] = _.partition(
    providers,
    (provider) => provider.name === "password",
  );
  return (
    <AuthLayout>
      <Box
        role="heading"
        c="text-primary"
        fz="1.25rem"
        fw="bold"
        lh="1.5rem"
        ta="center"
      >
        {t`Sign in`}
      </Box>
      {keycloakEnabled && (
        <Box mt="2rem" ta="center">
          <Button
            component="a"
            href={`${getBasename()}/auth/keycloak/login`}
            target="_top"
          >
            {t`Sign in with Keycloak`}
          </Button>
        </Box>
      )}
      {selection && selection.Panel && (
        <Box mt="2.5rem">
          <selection.Panel redirectUrl={redirectUrl} />
        </Box>
      )}
      {!selection && (
        <Box mt="3.5rem">
          {otherProviders.map((provider) => (
            <Box key={provider.name} mt="2rem" ta="center">
              <provider.Button isCard={true} redirectUrl={redirectUrl} />
            </Box>
          ))}
          {passwordProvider.map((provider) => (
            <>
              <Divider mt="2rem" />
              <Box key={provider.name} mt="1rem" ta="center">
                <provider.Button isCard={true} redirectUrl={redirectUrl} />
              </Box>
            </>
          ))}
        </Box>
      )}
    </AuthLayout>
  );
};

const getSelectedProvider = (
  providers: AuthProvider[],
  providerName?: string,
): AuthProvider | undefined => {
  const provider =
    providers.length > 1
      ? providers.find((p) => p.name === providerName)
      : providers[0];

  return provider?.Panel ? provider : undefined;
};
