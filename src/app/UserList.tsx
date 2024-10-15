"use client";

import { Button } from "@/components/ui/button";
import { mutators } from "@/replicache/mutators";
import { User } from "@/types/user";
import { createUndoRedoManager, UndoEntry, UndoManager } from "@/undo/UndoManager";
import { Redo, Undo } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataSheetGrid, checkboxColumn, textColumn, keyColumn, Column, intColumn } from "react-datasheet-grid";

import { Operation } from "react-datasheet-grid/dist/types";
import { Replicache } from "replicache";

type Row = Partial<User>;

const UserList = () => {
  const [data, setData] = useState<Row[]>([
    {
      id: nanoid(),
      active: true,
      firstName: "Elon",
      lastName: "Musk",
      email: "elon@tesla.com",
      age: 50,
      address: "3500 Deer Creek Road, Palo Alto, CA",
      phoneNumber: "123-456-7890",
    },
    {
      id: nanoid(),
      active: false,
      firstName: "Jeff",
      lastName: "Bezos",
      email: "jeff@amazon.com",
      age: 57,
      address: "410 Terry Ave N, Seattle, WA",
      phoneNumber: "234-567-8901",
    },
    {
      id: nanoid(),
      active: true,
      firstName: "Bill",
      lastName: "Gates",
      email: "bill@microsoft.com",
      age: 66,
      address: "500 5th Ave N, Seattle, WA",
      phoneNumber: "345-678-9012",
    },
    {
      id: nanoid(),
      active: true,
      firstName: "Mark",
      lastName: "Zuckerberg",
      email: "mark@facebook.com",
      age: 37,
      address: "1 Hacker Way, Menlo Park, CA",
      phoneNumber: "456-789-0123",
    },
    {
      id: nanoid(),
      active: false,
      firstName: "Larry",
      lastName: "Page",
      email: "larry@google.com",
      age: 49,
      address: "1600 Amphitheatre Parkway, Mountain View, CA",
      phoneNumber: "567-890-1234",
    },
    {
      id: nanoid(),
      active: true,
      firstName: "Sundar",
      lastName: "Pichai",
      email: "sundar@google.com",
      age: 49,
      address: "1600 Amphitheatre Parkway, Mountain View, CA",
      phoneNumber: "678-901-2345",
    }, // Thêm dữ liệu mới
    {
      id: nanoid(),
      active: true,
      firstName: "Tim",
      lastName: "Cook",
      email: "tim@apple.com",
      age: 61,
      address: "1 Apple Park Way, Cupertino, CA",
      phoneNumber: "789-012-3456",
    }, // Thêm dữ liệu mới
  ]);

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

  const undoManagerRef = useRef<UndoManager | null>();
  useEffect(() => {
    undoManagerRef.current = createUndoRedoManager();
  }, []);

  function handleChange(newValues: Row[], operations: Operation[]) {
    const undoManager = undoManagerRef.current;

    let updateRows: Row[] = [];
    for (const operation of operations) {
      updateRows = newValues.slice(operation.fromRowIndex, operation.toRowIndex);
    }

    for (const operation of operations) {
      if (operation.type === "CREATE") {
        newValues.slice(operation.fromRowIndex, operation.toRowIndex).forEach(({ id }) => createdRowIds.add(id));
      }

      // Handle update
      if (operation.type === "UPDATE") {
        newValues.slice(operation.fromRowIndex, operation.toRowIndex).forEach(({ id }) => {
          if (!createdRowIds.has(id) && !deletedRowIds.has(id)) {
            updatedRowIds.add(id);
          }
        });
      }
      // Handle delete

      if (operation.type === "DELETE") {
        let keptRows = 0;

        // Make sure to use `data` and not `newValue`
        data.slice(operation.fromRowIndex, operation.toRowIndex).forEach(({ id }, i) => {
          // If the row was updated, dismiss the update
          // No need to update a row and immediately delete it
          updatedRowIds.delete(id);

          if (createdRowIds.has(id)) {
            // Row was freshly created, simply ignore it
            // No need to insert a row and immediately delete it
            createdRowIds.delete(id);
          } else {
            // Add the row to the deleted Set
            deletedRowIds.add(id);
            // Insert it back into newValue to display it in red to the user
            newValues.splice(operation.fromRowIndex + keptRows++, 0, data[operation.fromRowIndex + i]);
          }
        });
      }
    }

    if (undoManager) {
      const oldDatas = data;
      const undoEntry: UndoEntry = {
        operation: () => {
          setData(newValues);
        },
        description: "CHANGE",
        reverseOperation: () => {
          console.log("reverseOperation");
          setData(oldDatas);
        },
        reverseDescription: "REDO",
        scopeName: "",
        hasRedoConflict: () => false,
        hasUndoConflict: () => false,
      };
      undoManager.do(undoEntry);
    }
    console.log("handleChange", updateRows, operations);
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
      // To get your own license key run `npx replicache get-license`. (It's free.)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      licenseKey: process.env.NEXT_PUBLIC_REPLICACHE_LICENSE_KEY!,
    });

    const eventSource = new EventSource("/api/replicache/poke");
    eventSource.onmessage = (event) => {
      console.log("poke", event);
      r.pull();
    };

    return () => {
      eventSource.close();
    };
  }, []);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "z") {
        handleUndo(); // Ctrl + Z để hoàn tác
      } else if (event.ctrlKey && event.key === "y") {
        handleRedo(); // Ctrl + Y để làm lại
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
        createRow={() => ({ id: nanoid() })}
        duplicateRow={({ rowData }) => ({ ...rowData, id: nanoid() })}
        value={data}
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
