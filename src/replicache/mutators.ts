import { User, UserUpdate } from "@/types/user";
import { WriteTransaction } from "replicache";

export type M = typeof mutators;

export const mutators = {
  updateUser: async (tx: WriteTransaction, update: UserUpdate) => {
    const prev = await tx.get<User>(`user/${update.id}`);
    const next = { ...prev, ...update };
    await tx.set(`user/${next.id}`, next);
  },
  deleteUser: async (tx: WriteTransaction, id: string) => {
    await tx.del(`user/${id}`);
  },
  createTodo: async (tx: WriteTransaction, user: User) => {
    await tx.set(`todo/${user.id}`, user);
  },
  unDeleteUser: async (tx: WriteTransaction, entry: User) => {
    await tx.set(`user/${entry.id}`, entry);
  },
};