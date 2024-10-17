import { serverID, Transaction } from "@/server/database/config";
import { JSONValue } from "replicache";

export async function getEntry(executor: Transaction, key: string): Promise<JSONValue | undefined> {
  const row = await executor.one("select value from entry where key = $1 and deleted = false", [key]);
  if (!row) {
    return undefined;
  }
  return JSON.parse(row.value);
}

export async function putEntry(executor: Transaction, key: string, value: JSONValue, version: number): Promise<void> {
  console.log(":::putEntry", key, value);
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

export async function getGlobalCurrentVersion(executor: Transaction) {
  return executor.one<{ version: number }>("select version from replicache_server where id = $1", serverID);
}
export async function setGlobalVersion(executor: Transaction, version: number) {
  await executor.none("update replicache_server set version = $1 where id = $2", [version, serverID]);
}
export async function getChangedEntries(
  executor: Transaction,
  prevVersion: number
): Promise<[key: string, value: JSONValue, deleted: boolean][]> {
  const rows = await executor.manyOrNone(`select key, value, deleted from entry where last_modified_version > $1`, [
    prevVersion,
  ]);
  return rows.map((row) => [row.key, JSON.parse(row.value), row.deleted]);
}

export async function getLastMutationIDChanges(t: Transaction, clientGroupID: string, fromVersion: number) {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const rows = await t.manyOrNone<{ id: string; last_mutation_id: number }>(
    `select id, last_mutation_id
    from replicache_client
    where client_group_id = $1 and version > $2`,
    [clientGroupID, fromVersion]
  );
  return Object.fromEntries(rows.map((r) => [r.id, r.last_mutation_id]));
}

export async function getLastMutationID(t: Transaction, clientID: string) {
  const clientRow = await t.oneOrNone("select last_mutation_id from replicache_client where id = $1", clientID);
  if (!clientRow) {
    return 0;
  }
  return parseInt(clientRow.last_mutation_id);
}

export async function setLastMutationID(
  t: Transaction,
  clientID: string,
  clientGroupID: string,
  mutationID: number,
  version: number
) {
  const result = await t.result(
    `update replicache_client set
      client_group_id = $2,
      last_mutation_id = $3,
      version = $4
    where id = $1`,
    [clientID, clientGroupID, mutationID, version]
  );
  if (result.rowCount === 0) {
    await t.none(
      `insert into replicache_client (
        id,
        client_group_id,
        last_mutation_id,
        version
      ) values ($1, $2, $3, $4)`,
      [clientID, clientGroupID, mutationID, version]
    );
  }
}
