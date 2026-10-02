import type { Route } from "react-router";

import { SettingsSection } from "metabase/admin/components/SettingsSection";
import { getEngines } from "metabase/databases/selectors";
import { useSelector } from "metabase/redux";
import { Box, Flex, ScrollArea, Title } from "metabase/ui";

import { DatabaseEditConnectionForm } from "../components/DatabaseEditConnectionForm";
import { useDatabaseConnection } from "../hooks/use-database-connection";

interface DatabasePageProps {
  params: { databaseId: string };
  route: Route;
}

export function DatabasePage({ params, route }: DatabasePageProps) {
  const engines = useSelector(getEngines);
  const { database, databaseReq, handleCancel, handleOnSubmit, title, config } =
    useDatabaseConnection({ databaseId: params.databaseId, engines });
  return (
    <Flex direction="row" h="100%" bg="background_page-secondary">
      <Box h="100%" w="100%" component={ScrollArea}>
        <Box w="100%" maw="54rem" mx="auto" p={{ base: "md", sm: "xl" }}>
          <Flex
            mb="lg"
            align="center"
            justify="space-between"
            wrap="wrap"
            columnGap="lg"
          >
            <Title order={1} fz="h2">
              {title}
            </Title>
          </Flex>
          <SettingsSection>
            <DatabaseEditConnectionForm
              database={database}
              isAttachedDWH={database?.is_attached_dwh ?? false}
              initializeError={databaseReq.error}
              onSubmitted={handleOnSubmit}
              route={route}
              onCancel={handleCancel}
              config={config}
              formLocation="full-page"
            />
          </SettingsSection>
        </Box>
      </Box>
    </Flex>
  );
}
