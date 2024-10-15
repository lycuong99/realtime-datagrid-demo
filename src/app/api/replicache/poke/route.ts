import { getPokeBackend } from "@/server/poke";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  // const { spaceID } = req.url;
  const spaceID = "test";
  console.log("connnected to poke endpoint from spaceID", req.url);
  req.headers.set("Content-Type", "text/event-stream");
  req.headers.set("Cache-Control", "no-cache");
  req.headers.set("Connection", "keep-alive");
  const pubsub = getPokeBackend();
  let removeListener: () => void;

  const customReadable = new ReadableStream({
    start(controller) {
      let id = 1;
      function emit(eventName: string, data: string) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`id: ${id}\nevent: ${eventName}\n`));
        const chunks = data.split("\n");
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(`data: ${encodeURIComponent(chunk)}\n`));
        }
        controller.enqueue(encoder.encode("\n"));
        id++;
      }

      removeListener = pubsub.addListeners(spaceID, () => {
        emit("poke", "");
      });
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

export const dynamic = "force-dynamic";
