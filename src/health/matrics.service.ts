// src/metrics/metrics.service.ts
import { Injectable } from "@nestjs/common";
import * as promClient from "prom-client";

@Injectable()
export class MetricsService {
  private httpRequestsTotal: promClient.Counter<string>;

  constructor() {
    // Collect default system metrics (e.g., memory usage, CPU usage)
    promClient.collectDefaultMetrics();

    // Create a custom counter metric for HTTP requests
    this.httpRequestsTotal = new promClient.Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status"],
    });
  }

  // Method to increment the HTTP request counter
  incrementHttpRequests(method: string, route: string, status: string) {
    this.httpRequestsTotal.inc({ method, route, status });
  }

  // Return Prometheus metrics in Prometheus format
  async getMetrics() {
    return promClient.register.metrics(); // Return the metrics in the Prometheus format
  }
}
