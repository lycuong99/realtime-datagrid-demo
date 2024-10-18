"use client";

import { Button } from "@/components/ui/button";
import { M, mutators } from "@/replicache/mutators";
import { listUsers } from "@/replicache/user";
import { User } from "@/types/user";
import { createUndoRedoManager, UndoEntry, UndoManager } from "@/undo/UndoManager";
import { Redo, Undo } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataSheetGrid, checkboxColumn, textColumn, keyColumn, Column, intColumn } from "react-datasheet-grid";

import { Operation } from "react-datasheet-grid/dist/types";
import { Replicache } from "replicache";
import { useSubscribe } from "replicache-react";

type Row = User;

function getEmptyRow(): Row {
  return {
    id: nanoid(),
    active: true,
    firstName: "",
    lastName: "",
    email: "",
    age: 0,
    address: "",
    phoneNumber: "",
  };
}

function duplicateRow({ rowData }: { rowData: Row }): Row {
  return { ...rowData, id: nanoid() };
}

const columns: Column<Row>[] = [
  {
    ...keyColumn<Row, "active">("active", checkboxColumn),
    title: "Active",
  },
  {
    ...keyColumn<Row, "firstName">("firstName", textColumn),
    title: "First name",
  },
  {
    ...keyColumn<Row, "lastName">("lastName", textColumn),
    title: "Last name",
  },
  {
    ...keyColumn<Row, "email">("email", textColumn),
    title: "Email",
  },
  {
    ...keyColumn<Row, "age">("age", intColumn),
    title: "Age",
  },
  {
    ...keyColumn<Row, "address">("address", textColumn),
    title: "Address",
  },
  {
    ...keyColumn<Row, "phoneNumber">("phoneNumber", textColumn),
    title: "Phone Number",
  },
];

const UserList = () => {
  const [rep, setRep] = useState<Replicache<M> | null>(null);

  const users = useSubscribe(rep, listUsers, { default: [] });

  const undoManagerRef = useRef<UndoManager | null>();
  useEffect(() => {
    undoManagerRef.current = createUndoRedoManager();
  }, []);

  const rowChangeHandler = {
    CREATE: (operation: Operation, newValues: Row[]) => {
      const undoManager = undoManagerRef.current;
      if (!undoManager) return;

      const newUsers = newValues.slice(operation.fromRowIndex, operation.toRowIndex);

      const undoEntry: UndoEntry = {
        operation: () => {
          newUsers.forEach((newUser) => {
            createdRowIds.add(newUser.id);
            rep?.mutate.createUser(newUser);
          });
        },
        reverseOperation: () => {
          newUsers.forEach((newUser) => {
            createdRowIds.delete(newUser.id);
            rep?.mutate.deleteUser(newUser.id);
          });
        },
        description: "CREATE USER",
        reverseDescription: "REDO CREATE USER",
        scopeName: "",
        hasRedoConflict: () => false,
        hasUndoConflict: () => false,
      };

      undoManager.do(undoEntry);
    },
    UPDATE: (operation: Operation, newValues: Row[]) => {
      const undoManager = undoManagerRef.current;
      if (!undoManager) return;

      const updateRows = newValues.slice(operation.fromRowIndex, operation.toRowIndex);
      updateRows.forEach(({ id }) => !createdRowIds.has(id) && !deletedRowIds.has(id) && updatedRowIds.add(id));
      rep?.mutate.updateUser(updateRows[0]);

      const updateIds = updateRows.map(({ id }) => id);
      const currentUsers = users.filter((user) => updateIds.includes(user.id));

      const undoEntry: UndoEntry = {
        operation: () => {
          updateRows.forEach((user) => {
            updatedRowIds.add(user.id);
            rep?.mutate.updateUser(user);
          });
        },
        reverseOperation: () => {
          currentUsers.forEach((user) => {
            updatedRowIds.delete(user.id);
            rep?.mutate.updateUser(user);
          });
        },
        description: "UPDATE USER",
        reverseDescription: "REDO UPDATE USER",
        scopeName: "",
        hasRedoConflict: () => false,
        hasUndoConflict: () => false,
      };

      undoManager.do(undoEntry);
    },
    DELETE: (operation: Operation) => {
      const undoManager = undoManagerRef.current;
      if (!undoManager) return;

      const deleteRows = users.slice(operation.fromRowIndex, operation.toRowIndex);
      const undoEntry: UndoEntry = {
        operation: () => {
          deleteRows.forEach((user) => {
            // deletedRowIds.add(user.id);
            rep?.mutate.deleteUser(user.id);
          });
        },
        reverseOperation: () => {
          deleteRows.forEach((user) => {
            // deletedRowIds.delete(user.id);
            rep?.mutate.unDeleteUser(user);
          });
        },
        description: "DELETE USER",
        reverseDescription: "REDO DELETE USER",
        scopeName: "",
        hasRedoConflict: () => false,
        hasUndoConflict: () => false,
      };

      undoManager.do(undoEntry);
    },
  };
  function handleChange(newValues: Row[], operations: Operation[]) {
    console.log("handleChange", operations.length);
    for (const operation of operations) {
      console.log("handleChange", operation.fromRowIndex, operation.toRowIndex);

      rowChangeHandler[operation.type](operation, newValues);
    }
  }

  function handleUndo() {
    const undoManager = undoManagerRef.current;
    if (undoManager) {
      undoManager.undo();
    }
  }

  function handleRedo() {
    const undoManager = undoManagerRef.current;
    if (undoManager) {
      undoManager.redo();
    }
  }

  const canUndo = undoManagerRef.current?.getStatus().canUndo;
  const canRedo = undoManagerRef.current?.getStatus().canRedo;

  useEffect(() => {
    const spaceID = "nana";
    const r = new Replicache({
      pushURL: `/api/replicache/push?spaceID=${spaceID}`,
      pullURL: `/api/replicache/pull?spaceID=${spaceID}`,
      name: spaceID,
      mutators: mutators,
      pullInterval: 30000,
      licenseKey: process.env.NEXT_PUBLIC_REPLICACHE_LICENSE_KEY!,
    });

    const eventSource = new EventSource("/api/replicache/poke");
    eventSource.addEventListener("message", (event) => {
      console.log(":::::poke", event);
      r.pull();
    });
    eventSource.addEventListener("open", () => {
      console.log("::::: POKE OPEN");
    });
    // eventSource.onmessage = (event) => {
    //   console.log(":::::poke", event);
    //   r.pull();
    // };

    eventSource.addEventListener("poke", (event) => {
      console.log(":::::poke test", event);
      r.pull();
    });

    setRep(r);
    eventSource.onerror = (event) => {
      console.log(":::::poke error", event);
    };
    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "z") {
        handleUndo();
      } else if (event.ctrlKey && event.key === "y") {
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const createdRowIds = useMemo(() => new Set(), []);
  const deletedRowIds = useMemo(() => new Set(), []);
  const updatedRowIds = useMemo(() => new Set(), []);

  return (
    <>
      <div className="flex gap-4 justify-center mb-9">
        <Button disabled={!canUndo} onClick={handleUndo} variant={"outline"} className="p-1 h-12 aspect-square">
          <Undo />
        </Button>
        <Button disabled={!canRedo} onClick={handleRedo} variant={"outline"} className="p-1 h-12 aspect-square">
          <Redo />
        </Button>
      </div>

      <DataSheetGrid
        rowKey="id"
        createRow={getEmptyRow}
        duplicateRow={duplicateRow}
        value={users}
        onChange={handleChange}
        columns={columns}
        rowClassName={({ rowData }) => {
          if (deletedRowIds.has(rowData.id)) {
            return "row-deleted";
          }
          if (createdRowIds.has(rowData.id)) {
            return "row-created";
          }
          if (updatedRowIds.has(rowData.id)) {
            return "row-updated";
          }
        }}
      />
    </>
  );
};
export default UserList;
