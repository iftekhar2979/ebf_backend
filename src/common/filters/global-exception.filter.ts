import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

/**
 * Enterprise Global Exception Filter.
 * Standardizes error responses across the entire API and ensures sensitive internal errors are not leaked.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal Server Error";

    // Detailed logging for internal errors
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} failed with status ${status}: ${
          typeof message === "object" ? JSON.stringify(message) : message
        }`,
        exception instanceof Error ? exception.stack : ""
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === "object" ? (message as any).message || message : message,
    });
  }
}
