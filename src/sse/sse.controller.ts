import { Controller, Sse } from "@nestjs/common";
import { ApiOperation, ApiProduces, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Observable, interval, map } from "rxjs";

@Controller("sse")
@ApiTags("SSE")
export class SseController {
  @Sse("/")
  @ApiOperation({
    summary: "Subscribe to Server-Sent Events",
    description:
      "Subscribes to a stream of events from the server. The server will send an event every second with a message.",
  })
  @ApiProduces("text/event-stream")
  @ApiResponse({
    status: 200,
    description: "Stream of events",
    content: {
      "text/event-stream": {
        example: 'data: {"hello":"world"}\n\n',
      },
    },
  })
  sse(): Observable<EventData> {
    return interval(1000).pipe(map((_) => ({ data: { hello: "world" } })));
  }
}
