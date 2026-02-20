import { Controller, Get, Render, Req, Sse } from "@nestjs/common";
import { AppService } from "./app.service";
import { Request } from "express";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { InjectQueue } from "@nestjs/bull";
import { Queue } from "bull";
import process from "process";
import os from "node:os";
import { interval, map, Observable, Subject } from "rxjs";
@Controller()
export class AppController {
  private systemInfo$ = new Subject<any>();

  constructor(
    private readonly appService: AppService,
    @InjectQueue("myQueue") private readonly myQueue: Queue
  ) {
    interval(2000).subscribe(() => {
      const data = this.getSystemInfo();
      this.systemInfo$.next(data);
    });
  }

  @Get("")
  async get() {
    console.trace("call stack");
    structuredClone({ name: "Iftekhar" });
    return { msg: "Hello world" };
  }

  @Get("csrf-token")
  @ApiTags("CSRF")
  @ApiOperation({
    description: "Generate CSRF Token",
    summary: "Generate CSRF Token to be used in Frontend Forms",
  })
  @ApiOkResponse({
    description: "Generate CSRF Token",
    example: {
      csrfToken: "MHP1Skkd-QJhgDlYvqFda4RIgocjDd4_gh3U",
    },
  })
  async getCSRFToken(@Req() req: Request) {
    return { csrfToken: req.csrfToken?.() };
  }
  @Get("system-info")
  @Render("system-info") // This renders 'views/system-info.ejs'
  getSystemInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memoryUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);

    const cpuInfo = os.cpus();
    const avgLoad = os.loadavg();

    // 🧠 Node.js process memory
    const memUsage = process.memoryUsage();
    const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
    const rssMB = (memUsage.rss / 1024 / 1024).toFixed(2);

    const cpuPercentages = cpuInfo.map((cpu, index) => {
      const times = cpu.times;
      const total = Object.values(times).reduce((acc, tv) => acc + tv, 0);
      const idle = times.idle;
      const usagePercent = (((total - idle) / total) * 100).toFixed(2);

      return {
        core: index,
        model: cpu.model,
        speedMHz: cpu.speed,
        usagePercent,
      };
    });

    const uptimeInSeconds = os.uptime();
    const uptimeDays = Math.floor(uptimeInSeconds / (24 * 60 * 60));
    const uptimeHours = Math.floor((uptimeInSeconds % (24 * 60 * 60)) / 3600);

    return {
      hostname: os.hostname(),
      uptime: {
        days: uptimeDays,
        hours: uptimeHours,
        raw: uptimeInSeconds,
      },
      loadAverage: avgLoad,
      memory: {
        totalMB: (totalMem / (1024 * 1024)).toFixed(2),
        usedMB: (usedMem / (1024 * 1024)).toFixed(2),
        freeMB: (freeMem / (1024 * 1024)).toFixed(2),
        usagePercent: memoryUsagePercent,
      },
      nodeMemory: {
        heapUsedMB,
        heapTotalMB,
        rssMB,
      },
      networkInterfaces: os.networkInterfaces(),
      cpu: {
        cores: cpuInfo.length,
        details: cpuPercentages,
      },
    };
  }
  @Sse("stream")
  systemInfoStream(): Observable<MessageEvent> {
    // console.log("Strema")
    let count = 0;
    return this.systemInfo$.pipe(
      map(() => {
        console.log(`Streaming ${count++}`);
        const totalMem = os.totalmem();

        // 🧠 Node.js process memory
        const memUsage = process.memoryUsage();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        const memoryUsagePercent = ((usedMem / totalMem) * 100).toFixed(2);
        const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
        const heapTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
        const rssMB = (memUsage.rss / 1024 / 1024).toFixed(2);

        const cpuInfo = os.cpus();
        const avgLoad = os.loadavg();

        const cpuPercentages = cpuInfo.map((cpu, index) => {
          const times = cpu.times;
          const total = Object.values(times).reduce((acc, tv) => acc + tv, 0);
          const idle = times.idle;
          const usagePercent = (((total - idle) / total) * 100).toFixed(2);

          return {
            core: index,
            model: cpu.model,
            speedMHz: cpu.speed,
            usagePercent,
          };
        });

        const uptimeInSeconds = os.uptime();
        const uptimeDays = Math.floor(uptimeInSeconds / (24 * 60 * 60));
        const uptimeHours = Math.floor((uptimeInSeconds % (24 * 60 * 60)) / 3600);

        return {
          data: {
            hostname: os.hostname(),
            uptime: {
              days: uptimeDays,
              hours: uptimeHours,
              raw: uptimeInSeconds,
            },
            nodeMemory: {
              heapUsedMB,
              heapTotalMB,
              rssMB,
            },
            loadAverage: avgLoad,
            memory: {
              totalMB: (totalMem / (1024 * 1024)).toFixed(2),
              usedMB: (usedMem / (1024 * 1024)).toFixed(2),
              freeMB: (freeMem / (1024 * 1024)).toFixed(2),
              usagePercent: memoryUsagePercent,
            },
            networkInterfaces: os.networkInterfaces(),
            cpu: {
              cores: cpuInfo.length,
              details: cpuPercentages,
            },
          },
        } as MessageEvent;
      })
    );
  }

  @Get("add-job")
  async addJob() {
    const job = await this.myQueue.add("job", {
      // 'job' is the job name
      message: "This is the job data", // Job data that you want to send to the processor
    });
    return `Job with ID ${job.id} has been added to the queue.`;
  }
}
