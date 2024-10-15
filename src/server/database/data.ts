import { Transaction } from "@/server/database/config";
import { JSONValue } from "replicache";

export async function getEntry(executor: Transaction, key: string): Promise<JSONValue | undefined> {
  const row = await executor.one("select value from entry where key = $1 and deleted = false", [key]);
  if (!row) {
    return undefined;
  }
  return JSON.parse(row.value);
}

export async function putEntry(executor: Transaction, key: string, value: JSONValue, version: number): Promise<void> {
  await executor.none(
    `
      insert into entry (key, value, deleted, last_modified_version)
      values ($1, $2, false, $3)
        on conflict (key) do update set
          value = $2, deleted = false, last_modified_version = $3
      `,
    [key, JSON.stringify(value), version]
  );
}

export async function delEntry(executor: Transaction, key: string, version: number): Promise<void> {
  await executor.none(
    `update entry set deleted = true, last_modified_version = $2
        where key = $1`,
    [key, version]
  );
}

export async function* getEntries(executor: Transaction, fromKey: string): AsyncIterable<readonly [string, JSONValue]> {
  const rows = await executor.manyOrNone(
    `select key, value from entry where key >= $1 and deleted = false order by key`,
    [fromKey]
  );
  for (const row of rows) {
    yield [row.key as string, JSON.parse(row.value) as JSONValue] as const;
  }
}
