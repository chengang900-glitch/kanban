import { useFormikContext } from "formik";
import { t } from "ttag";

import type { DatabaseData } from "metabase-types/api";

const DatabaseSslKeyDescription = (): JSX.Element | null => {
  const { values } = useFormikContext<DatabaseData>();
  const { engine } = values;

  if (engine !== "postgres") {
    return null;
  }

  return (
    <>{t`If you have a PEM SSL client key, you can convert that key to the PKCS-8/DER format using OpenSSL.`}</>
  );
};

// eslint-disable-next-line import/no-default-export -- deprecated usage
export default DatabaseSslKeyDescription;
