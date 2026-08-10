export class AppError extends Error {
  constructor(message, { status = 500, isOperational = true, details } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.isOperational = isOperational;
    if (details) this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, { status: 400, details });
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, { status: 401 });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, { status: 404 });
  }
}

export class UpstreamError extends AppError {
  constructor(message, { status = 502, details } = {}) {
    super(message, { status, isOperational: true, details });
  }
}
