import { t } from "ttag";

const DatabaseSshDescription = (): JSX.Element => {
  return (
    <>{t`If a direct connection to your database isn't possible, you may want to use an SSH tunnel.`}</>
  );
};

// eslint-disable-next-line import/no-default-export -- deprecated usage
export default DatabaseSshDescription;
