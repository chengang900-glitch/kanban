import { useListEnginesQuery } from "metabase/api";
import { useParams } from "metabase/router";
import { SettingsSection } from "metabase/settings-components";
import { Box, Flex, ScrollArea, Title } from "metabase/ui";

import { DatabaseEditConnectionForm } from "../components/DatabaseEditConnectionForm";
import { useDatabaseConnection } from "../hooks/use-database-connection";

export function DatabasePage() {
  const params = useParams<{ databaseId: string }>();
  const { data: engines = {} } = useListEnginesQuery();
  const { database, databaseReq, handleCancel, handleOnSubmit, title, config } =
    useDatabaseConnection({ databaseId: params.databaseId, engines });
  return (
    <Flex direction="row" h="100%" bg="background_page-secondary">
      <Box h="100%" w="100%" component={ScrollArea}>
        <Box w="100%" maw="54rem" mx="auto" p={{ base: "lg", sm: "xxl" }}>
          <Flex
            mb="xl"
            align="center"
            justify="space-between"
            wrap="wrap"
            columnGap="xl"
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
