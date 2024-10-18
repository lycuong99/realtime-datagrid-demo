import { mutators } from "@/replicache/mutators";
import { Transaction, tx } from "@/server/database/config";
import {
  delEntry,
  getGlobalCurrentVersion,
  getLastMutationID,
  putEntry,
  setGlobalVersion,
  setLastMutationID,
} from "@/server/database/data";
import { PostgresStorage } from "@/server/database/postgres.storage";
import { getPokeBackend } from "@/server/poke";
import { NextRequest, NextResponse } from "next/server";
import { ReplicacheTransaction } from "replicache-transaction";
import { z } from "zod";

export type ClientGroup = {
  id: string;
  userID: string;
};

export type Client = {
  id: string;
  clientGroupID: string;
  lastMutationID: number;
  lastModifiedVersion: number;
};

const mutationSchema = z.object({
  id: z.number(),
  clientID: z.string(),
  name: z.string(),
  args: z.any(),
});

const pushRequestSchema = z.object({
  clientGroupID: z.string(),
  mutations: z.array(mutationSchema),
});

// type Mutation = z.infer<typeof mutationSchema>;

export async function POST(req: NextRequest) {
  const requestBody = await req.json();

  const push = pushRequestSchema.parse(requestBody);

  try {
    const { clientGroupID } = push;
    await tx(async (t) => {
      const { version: prevVersion } = await getGlobalCurrentVersion(t);
      const nextVersion = prevVersion + 1;

      const storage = new PostgresStorage(nextVersion, t);
      const tx = new ReplicacheTransaction(storage);

      for (const mutation of push.mutations) {
        const clientID = mutation.clientID;
        const lastMutationID = await getLastMutationID(t, mutation.clientID);
        const nextMutationID = lastMutationID + 1;

        if (mutation.id < nextMutationID) {
          console.log(`Mutation ${mutation.id} has already been processed - skipping`);
          continue;
        }

        if (mutation.id > nextMutationID) {
          throw new Error(
            `Mutation ${mutation.id} is from the future - aborting. This can happen in development if the server restarts. In that case, clear appliation data in browser and refresh.`
          );
        }

        console.log("Processing mutation:", JSON.stringify(mutation, null, ""));

        const mutator = (mutators as any)[mutation.name];
        if (!mutator) {
          console.error(`Unknown mutator: ${mutation.name} - skipping`);
        }
        try {
          switch (mutation.name) {
            case "createUser":
              const user = mutation.args;
              // await mutators.createUser(tx, user);
              await putEntry(t, `user/${user.id}`, user, nextVersion);
              break;
            case "updateUser":
              const update = mutation.args;
              // await mutators.updateUser(tx, update);
              try {
                await putEntry(t, `user/${update.id}`, update, nextVersion);
              } catch (error) {
                console.error("Error executing mutator:", error);
              }
              break;
            case "deleteUser":
              const id = mutation.args;
              await delEntry(t, `user/${id}`, nextVersion);
              // await mutators.deleteUser(tx, id);
              break;
            case "unDeleteUser":
              const entry = mutation.args;
              await putEntry(t, `user/${entry.id}`, entry, nextVersion);
              // await mutators.unDeleteUser(tx, entry);
              break;
            default:
              console.error(`Unknown mutator: ${mutation.name} - skipping`);
          }

          // await mutator(tx, mutation.args);
        } catch (e) {
          console.error(`Error executing mutator: ${JSON.stringify(mutator)}: ${e}`);
        }

        await setLastMutationID(t, clientID, clientGroupID, nextMutationID, nextVersion);
      }

      await setGlobalVersion(t, nextVersion);

      const pokeBackend = getPokeBackend();
      pokeBackend.poke("test");
    });
  } catch (error) {
    console.error(error);
    NextResponse.json(error, { status: 500 });
  }

  return NextResponse.json({}, { status: 200 });
}
