import { tx } from "@/server/database/config";
import { getChangedEntries, getCurrentVersion, getLastMutationIDChanges } from "@/server/database/data";
import { NextRequest, NextResponse } from "next/server";
import { PullResponse } from "replicache";
import { z } from "zod";

const pullRequestSchema = z.object({
  clientGroupID: z.string(),
  cookie: z.union([z.number(), z.null()]),
  // schemaVersion: z.string(),
  // profileID: z.string(),
});

type PullRequest = z.infer<typeof pullRequestSchema>;

export async function POST(req: NextRequest) {
  const pullBody: PullRequest = await req.json();
  const { clientGroupID, cookie } = pullBody;
  const fromVersion = cookie ?? 0;
  console.log(pullBody);

  try {
    const res = await tx(async (t) => {
      const { version: currentVersion } = await getCurrentVersion(t);

      if (fromVersion > currentVersion) {
        throw new Error(
          `fromVersion ${fromVersion} is from the future - aborting. This can happen in development if the server restarts. In that case, clear appliation data in browser and refresh.`
        );
      }

      // Get lmids for requesting client groups.
      const lastMutationIDChanges = await getLastMutationIDChanges(t, clientGroupID, fromVersion);

      const entries = await getChangedEntries(t, fromVersion);
      const res: PullResponse = {
        lastMutationIDChanges,
        cookie: currentVersion,
        patch: [],
      };
      for (const [key, value, deleted] of entries) {
        if (deleted) {
          res.patch.push({
            op: "del",
            key,
          });
        } else {
          res.patch.push({
            op: "put",
            key,
            value,
          });
        }
      }

      return res;
    });
    return NextResponse.json(res, { status: 200 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(e, { status: 500 });
  }
}
