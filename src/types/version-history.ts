export type VersionHistory = {
  id: string;
  date: Date | string;
  modifyBy: string;
  name: string | null;
};

export type VersionHistoryChange = {
  op: string;
};
