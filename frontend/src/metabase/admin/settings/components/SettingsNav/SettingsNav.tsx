import { t } from "ttag";

import { AdminNavWrapper } from "metabase/admin/components/AdminNav";
import { UpsellGem } from "metabase/common/components/upsells/components/UpsellGem";
import { useHasTokenFeature } from "metabase/common/hooks";
import { PLUGIN_REMOTE_SYNC } from "metabase/plugins";
import { useSetting } from "metabase/settings";
import { Divider, Flex } from "metabase/ui";

import { SettingsNavItem } from "./SettingsNavItem";

const NavDivider = () => <Divider my="sm" />;

export function SettingsNav() {
  const hasHosting = useHasTokenFeature("hosting");
  const hasWhitelabel = useHasTokenFeature("whitelabel");
  const hasSaml = useHasTokenFeature("sso_saml");
  const hasJwt = useHasTokenFeature("sso_jwt");
  const hasOidc = useHasTokenFeature("sso_oidc");
  const hasScim = useHasTokenFeature("scim");
  const hasPythonTransforms = useHasTokenFeature("transforms-python");
  const isHosted = useSetting("is-hosted?");
  const tokenStatus = useSetting("token-status");

  return (
    <AdminNavWrapper>
      <SettingsNavItem path="general" label={t`General`} icon="gear" />
      <SettingsNavItem
        label={t`Authentication`}
        icon="lock"
        folderPattern="auth"
      >
        <SettingsNavItem path="authentication" label={t`Overview`} />
        {hasScim && (
          <SettingsNavItem
            path="authentication/user-provisioning"
            label={t`User provisioning`}
          />
        )}
        <SettingsNavItem path="authentication/api-keys" label={t`API keys`} />
        <SettingsNavItem path="authentication/google" label={t`Google auth`} />
        <SettingsNavItem path="authentication/ldap" label="LDAP" />
        {hasSaml && <SettingsNavItem path="authentication/saml" label="SAML" />}
        {hasJwt && <SettingsNavItem path="authentication/jwt" label="JWT" />}
        {hasOidc && <SettingsNavItem path="authentication/oidc" label="OIDC" />}
      </SettingsNavItem>
      <SettingsNavItem path="domains" label={t`Domains`} icon="globe" />
      {PLUGIN_REMOTE_SYNC.isEnabled && <PLUGIN_REMOTE_SYNC.LibraryNav />}
      <NavDivider />
      <SettingsNavItem path="email" label={t`Email`} icon="mail" />
      <SettingsNavItem path="slack" label={t`Slack`} icon="slack" />
      <SettingsNavItem path="webhooks" label={t`Webhooks`} icon="webhook" />
      <NavDivider />
      <SettingsNavItem
        path="localization"
        label={t`Localization`}
        icon="pinmap"
      />
      <SettingsNavItem path="maps" label={t`Maps`} icon="map" />
      {hasWhitelabel && (
        <SettingsNavItem
          path={!hasWhitelabel ? "whitelabel" : undefined}
          folderPattern="whitelabel"
          label={
            <Flex gap="sm" align="center">
              <span>{t`Appearance`}</span>
              {!hasWhitelabel && <UpsellGem />}
            </Flex>
          }
          icon="palette"
        >
          {hasWhitelabel && [
            // using an array so that child path detection can access them as direct children
            <SettingsNavItem
              key="branding"
              path="whitelabel/branding"
              label={t`Branding`}
            />,
            <SettingsNavItem
              key="conceal"
              path="whitelabel/conceal-metabase"
              label={t`Conceal Metabase`}
            />,
          ]}
        </SettingsNavItem>
      )}
      <NavDivider />
      <SettingsNavItem path="uploads" label={t`Uploads`} icon="upload" />
      {/* Python Runner settings are managed by Metabase Cloud for hosted instances */}
      {hasPythonTransforms && !isHosted && (
        <SettingsNavItem
          path="python-runner"
          label={t`Python Runner`}
          icon="snippet"
        />
      )}
      <SettingsNavItem
        path="public-sharing"
        label={t`Public sharing`}
        icon="share"
      />
      <NavDivider />
      {tokenStatus && (
        <SettingsNavItem path="license" label={t`License`} icon="store" />
      )}
      {hasHosting && (
        <SettingsNavItem
          path="cloud"
          label={
            <Flex gap="sm" align="center">
              <span>{t`Cloud`}</span>
              {!hasHosting && <UpsellGem />}
            </Flex>
          }
          icon="cloud"
        />
      )}
    </AdminNavWrapper>
  );
}
