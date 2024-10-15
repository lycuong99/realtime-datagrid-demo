import { Transaction } from "@/server/database/config";

export async function createDatabase(t: Transaction) {
  // A single global version number for the entire database.
  const serverID = "schemaVersion";
  await t.none(`create table replicache_server (id integer primary key not null, version integer)`);
  await t.none(`insert into replicache_server (id, version) values ($1, 1)`, serverID);

  // Stores chat messages.
  await t.none(`create table user (
           id text primary key not null,
           sender varchar(255) not null,
           content text not null,
           ord integer not null,
           deleted boolean not null,
           version integer not null)`);

  // Stores last mutationID processed for each Replicache client.
  await t.none(`create table replicache_client (
           id varchar(36) primary key not null,
           client_group_id varchar(36) not null,
           last_mutation_id integer not null,
           version integer not null)`);

  // TODO: indexes
  await t.none(`create index on replicache_client (version)`);

  await t.none(`create table entry (
    key text not null,
    value text not null,
    deleted boolean not null,
    last_modified_version integer not null)`);

  await t.none(`create unique index on entry (key)`);
  await t.none(`create index on entry (deleted)`);
  await t.none(`create index on entry (last_modified_version)`);
}
