// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// import { newDb } from "pg-mem";
import { createDatabase } from "@/server/database/schema";
import pgInit, { IDatabase, ITask } from "pg-promise";

const pgp = pgInit();
const { isolationLevel } = pgp.txMode;

export const serverID = 1;
export function getConnectionString() {
  return `postgresql://postgres:123456@localhost:5432/replicachedb`;
}
export async function initDB() {
  console.log("initializing database...");
  // const pg = await newDb().adapters.createPgPromise;
  const db = await pgp(getConnectionString());
  await tx(createDatabase, db);
  return db;
}

export function getDB() {
  // Cache the database in the Node global so that it survives HMR.
  if (!global.__db) {
    global.__db = initDB();
  }
  return global.__db as IDatabase<unknown>;
}

export type Transaction = ITask<unknown>;
type TransactionCallback<R> = (t: Transaction) => Promise<R>;

// In Postgres, snapshot isolation is known as "repeatable read".
export async function tx<R>(f: TransactionCallback<R>, dbp = getDB()) {
  const db = await dbp;
  return await db.tx(
    {
      mode: new pgp.txMode.TransactionMode({
        tiLevel: isolationLevel.repeatableRead,
      }),
    },
    f
  );
}
