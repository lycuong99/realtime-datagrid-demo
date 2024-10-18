import { User, UserUpdate } from "@/types/user";
import { WriteTransaction } from "replicache";

export type M = typeof mutators;

export const mutators = {
  updateUser: async (tx: WriteTransaction, update: UserUpdate) => {
    const prev = await tx.get<User>(`user/${update.id}`);
    const next = { ...prev, ...update };
    await tx.set(`user/${next.id}`, next);
  },
  updateUsers: async (tx: WriteTransaction, updates: UserUpdate[]) => {
    await Promise.all(updates.map((update) => mutators.updateUser(tx, update)));
  },
  deleteUser: async (tx: WriteTransaction, id: string) => {
    await tx.del(`user/${id}`);
  },
  deleteUsers: async (tx: WriteTransaction, ids: string[]) => {
    await Promise.all(ids.map((id) => mutators.deleteUser(tx, id)));
  },
  createUser: async (tx: WriteTransaction, user: User) => {
    console.log(":::createUser", user);
    await tx.set(`user/${user.id}`, user);
  },
  createUsers: async (tx: WriteTransaction, users: User[]) => {
    await Promise.all(users.map((user) => mutators.createUser(tx, user)));
  },
  unDeleteUser: async (tx: WriteTransaction, entry: User) => {
    await tx.set(`user/${entry.id}`, entry);
  },
  unDeleteUsers: async (tx: WriteTransaction, entries: User[]) => {
    await Promise.all(entries.map((entry) => mutators.unDeleteUser(tx, entry)));
  },
};
