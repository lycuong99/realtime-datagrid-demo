import { getPokeBackend } from "@/server/poke";
import { NextRequest, NextResponse } from "next/server";

export function ok(value: any) {
  return { value, error: false };
}

export async function GET(req: NextRequest) {
  const res = handlePokeSSEWithTransformStream(req);
  return res;
}

function handlePokeSSE(req: NextRequest) {
  const spaceID = "test";
  const pubsub = getPokeBackend();
  let removeListener: () => void;

  const customReadable = new ReadableStream({
    start(controller) {
      let id = 1;
      const encoder = new TextEncoder();

      function emit(eventName: string, data: string) {
        try {
          controller.enqueue(encoder.encode(`id: ${id}\nevent: ${eventName}\n`));
          const chunks = data.split("\n");
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(`data: ${encodeURIComponent(chunk)}\n`));
          }
          controller.enqueue(encoder.encode("\n"));
          id++;
        } catch (error) {
          console.error("Error encoding data:", error);
        }
      }

      removeListener = pubsub.addListeners(spaceID, () => {
        controller.enqueue(encoder.encode("\n"));

        emit("poke", "");
        console.log("poke", "");
      });

      setInterval(function run() {
        emit("ping", "");
      }, 1000);
    },
    cancel() {
      removeListener();
    },
  });

  return new Response(customReadable, {
    // Set the headers for Server-Sent Events (SSE)
    headers: {
      Connection: "keep-alive",
      "Content-Encoding": "none",
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
    },
  });
}
function toDataString(data: string | Record<string, any>): string {
  if (isObject(data)) {
    return toDataString(JSON.stringify(data));
  }
  return data
    .split(/\r\n|\r|\n/)
    .map((line: string) => `data: ${line}\n\n`)
    .join("");
}
function isObject(value: any) {
  return value !== null && typeof value === "object";
}
function handlePokeSSEWithTransformStream(req: NextRequest) {
  const spaceID = "test";
  const pubsub = getPokeBackend();

  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();
  let id = 1;
  function emit(eventName: string, data: string) {
    try {
      writer.write(encoder.encode(`event: ${eventName}\n`));
      const chunks = data.split("\n");
      for (const chunk of chunks) {
        writer.write(encoder.encode(`data: ${encodeURIComponent(chunk)}\n`));
      }
      writer.write(encoder.encode("\n"));
      id++;
    } catch (error) {
      console.error("Error encoding data:", error);
    }
  }

  const removeListener = pubsub.addListeners(spaceID, () => {
    emit("poke", "");
    console.log("poke", "", stream);
  });

  req.signal.addEventListener("abort", async () => {
    writer.close();
    removeListener();
  });

  return new NextResponse(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

export const dynamic = "force-dynamic";
