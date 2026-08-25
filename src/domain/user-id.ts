import { DomainValidationError } from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function assertUuid(value: string, label: string): void {
  if (!UUID_PATTERN.test(value)) {
    throw new DomainValidationError(`${label} must be a UUID.`);
  }
}

export class UserId {
  private constructor(private readonly value: string) {}

  static fromDto(value: string): UserId {
    if (typeof value !== "string") {
      throw new DomainValidationError("UserId must be a string.");
    }
    assertUuid(value, "UserId");
    return new UserId(value);
  }

  toDto(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }
}
