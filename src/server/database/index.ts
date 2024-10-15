import { tx } from "@/server/database/config";
import { createDatabase } from "@/server/database/schema";

async function init() {
  await tx(createDatabase);
}

init();
