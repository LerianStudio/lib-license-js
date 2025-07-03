// Simple logger interface
export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

export interface TerminationHandler {
  (reason: string): void | Promise<void>;
}

export interface MiddlewareFunction {
  (req: any, res: any, next: any): void | Promise<void>;
}
