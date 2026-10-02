import { t } from "ttag";

import { AdminNavWrapper } from "metabase/admin/components/AdminNav";
import { useHasTokenFeature, useSetting } from "metabase/common/hooks";
import { Divider } from "metabase/ui";

import { SettingsNavItem } from "./SettingsNavItem";

const NavDivider = () => <Divider my="sm" />;

export function SettingsNav() {
  const hasSaml = useHasTokenFeature("sso_saml");
  const hasJwt = useHasTokenFeature("sso_jwt");
  const hasOidc = useHasTokenFeature("sso_oidc");
  const hasScim = useHasTokenFeature("scim");
  const hasPythonTransforms = useHasTokenFeature("transforms-python");
  const isHosted = useSetting("is-hosted?");

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
        <SettingsNavItem path="authentication/ldap" label="LDAP" />
        {hasSaml && <SettingsNavItem path="authentication/saml" label="SAML" />}
        {hasJwt && <SettingsNavItem path="authentication/jwt" label="JWT" />}
        {hasOidc && <SettingsNavItem path="authentication/oidc" label="OIDC" />}
      </SettingsNavItem>
      <NavDivider />
      <SettingsNavItem path="email" label={t`Email`} icon="mail" />
      <SettingsNavItem path="slack" label={t`Slack`} icon="slack" />
      <SettingsNavItem path="webhooks" label={t`Webhooks`} icon="webhook" />
      <NavDivider />
      <SettingsNavItem
        path="localization"
        label={t`Localization`}
        icon="globe"
      />
      <SettingsNavItem path="maps" label={t`Maps`} icon="pinmap" />
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
    </AdminNavWrapper>
  );
}
