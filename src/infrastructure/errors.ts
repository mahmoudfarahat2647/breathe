export class UnauthenticatedError extends Error {
  constructor(message = "Authentication is required.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class PersistenceError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PersistenceError";
  }
}
