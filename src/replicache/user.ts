import { User } from "@/types/user";
import { ReadTransaction } from "replicache";

export async function listUsers(tx: ReadTransaction) {
  return await tx.scan<User>({ prefix: "user/" }).values().toArray();
}
export async function getUserById(tx: ReadTransaction, id: string) {
  return tx.get<User>(`user/${id}`);
}
