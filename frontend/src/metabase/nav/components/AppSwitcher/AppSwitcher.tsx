import { useMemo } from "react";
import { t } from "ttag";

import { ForwardRefLink } from "metabase/common/components/Link";
import { trackDataStudioOpened } from "metabase/common/data-studio/analytics";
import { canAccessDataStudio as canAccessDataStudioSelector } from "metabase/common/data-studio/selectors";
import { userInitials } from "metabase/common/utils/user";
import { useDispatch, useSelector } from "metabase/redux";
import { logout } from "metabase/redux/auth";
import { setOpenModal } from "metabase/redux/ui";
import { getAdminPaths } from "metabase/selectors/admin";
import { getUser } from "metabase/selectors/user";
import {
  ActionIcon,
  Avatar,
  Box,
  Divider,
  Group,
  Icon,
  Menu,
  Stack,
  Text,
} from "metabase/ui";
import type { ColorName } from "metabase/ui/colors/types";
import * as Urls from "metabase/urls";
import type { IconName } from "metabase-types/api";

import S from "./AppSwitcher.module.css";
import { useGetCurrentApp } from "./useGetCurrentApp";

const CURRENT_APP_ICON_OVERRIDES: {
  name: IconName;
  c: ColorName;
} = { name: "check_filled", c: "core-brand" };

export const AppSwitcher = ({ className }: { className?: string }) => {
  const dispatch = useDispatch();

  const user = useSelector(getUser);

  // generate the proper set of list items for the current user
  // based on whether they're an admin or not
  const adminItems = useSelector(getAdminPaths);
  const canAccessDataStudio = useSelector(canAccessDataStudioSelector);

  const currentApp = useGetCurrentApp();

  const appsSection = useMemo(() => {
    const showAdminSettingsItem = adminItems?.length > 0;

    if (!canAccessDataStudio && !showAdminSettingsItem) {
      return null;
    }

    const items: React.ReactNode[] = [
      <Menu.Item
        key="main-app-link"
        component={ForwardRefLink}
        to="/"
        leftSection={
          <Icon
            name="dashboard"
            {...(currentApp === "main" ? CURRENT_APP_ICON_OVERRIDES : null)}
          />
        }
      >
        {t`Main app`}
      </Menu.Item>,
    ];

    if (canAccessDataStudio) {
      items.push(
        <Menu.Item
          key="data-studio-app-link"
          component={ForwardRefLink}
          to={Urls.dataStudio()}
          onAuxClick={trackDataStudioOpened}
          onClickCapture={trackDataStudioOpened}
          leftSection={
            <Icon
              name="table"
              {...(currentApp === "data-studio"
                ? CURRENT_APP_ICON_OVERRIDES
                : null)}
            />
          }
        >
          {t`Data studio`}
        </Menu.Item>,
      );
    }
    if (showAdminSettingsItem) {
      items.push(
        <Menu.Item
          key="admin-app-link"
          component={ForwardRefLink}
          to={"/admin"}
          leftSection={
            <Icon
              name="io"
              {...(currentApp === "admin" ? CURRENT_APP_ICON_OVERRIDES : null)}
            />
          }
        >{t`Admin`}</Menu.Item>,
      );
    }

    return (
      <>
        <Divider key="app-sectiondivider" w="100%" my="sm" />
        <Box px="md">{items}</Box>
      </>
    );
  }, [canAccessDataStudio, adminItems, currentApp]);

  return (
    <>
      <Menu position="bottom-end" shadow="md" width={200} offset={9}>
        <Menu.Target>
          {appsSection ? (
            <ActionIcon
              size="2.25rem"
              p="sm"
              variant="outline"
              bd="1px solid var(--mb-color-border-neutral)"
              aria-label={t`Settings`}
              bdrs="50%"
              className={className}
              data-testid="app-switcher-target"
            >
              <Icon
                name="mode"
                // Need an escape hatch here for the white color in admin settings
                style={{
                  color:
                    currentApp === "admin"
                      ? "var(--mantine-color-white)"
                      : "var(--mb-color-text-primary)",
                }}
                size={16}
              />
            </ActionIcon>
          ) : (
            <Avatar
              radius="lg"
              size={32}
              className={S.Avatar}
              bd="1px solid var(--mb-color-border-neutral)"
              data-testid="app-switcher-target"
            >
              {user ? userInitials(user) : "?"}
            </Avatar>
          )}
        </Menu.Target>
        <Menu.Dropdown w={320} px="0">
          {/* Avatar Stuff */}
          <Box px="md">
            <Menu.Item
              component={ForwardRefLink}
              to={Urls.accountSettings()}
              data-testid="mode-switcher-profile-link"
            >
              <Group wrap="nowrap">
                <Avatar color="core-brand" radius="lg" size={32}>
                  {user ? userInitials(user) : "?"}
                </Avatar>
                <Stack gap="xs">
                  <Text lh="xs">{user?.first_name}</Text>
                  <Text c="text-disabled" fz="md" lh="xs">
                    {user?.email}
                  </Text>
                </Stack>
              </Group>
            </Menu.Item>
          </Box>

          {/* Apps */}
          {appsSection}

          {/* Logout and Help */}
          <Divider w="100%" my="sm" />
          <Box px="md">
            <Menu.Sub position="left-start" offset={20} closeDelay={350}>
              <Menu.Sub.Target>
                <Menu.Sub.Item>{t`Help`}</Menu.Sub.Item>
              </Menu.Sub.Target>
              <Menu.Sub.Dropdown data-testid="help-submenu">
                <Menu.Item
                  onClick={() => dispatch(setOpenModal("help"))}
                >{t`Keyboard shortcuts`}</Menu.Item>
              </Menu.Sub.Dropdown>
            </Menu.Sub>
            <Menu.Item
              onClick={() => dispatch(logout())}
            >{t`Sign out`}</Menu.Item>
          </Box>
        </Menu.Dropdown>
      </Menu>
    </>
  );
};
