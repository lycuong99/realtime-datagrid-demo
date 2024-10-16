import { getDB, tx } from "@/server/database/config";
import { createDatabase } from "@/server/database/schema";

async function init() {
  const db = getDB();
}

init();
