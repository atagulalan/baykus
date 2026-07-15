/** Thrown by addSeries when any external id in the DTO already matches a library item. */
export class AlreadyInLibraryError extends Error {
  readonly itemId: number;

  constructor(itemId: number) {
    super(`series already in library (itemId=${itemId})`);
    this.name = "AlreadyInLibraryError";
    this.itemId = itemId;
  }
}

export function isAlreadyInLibraryError(e: unknown): e is AlreadyInLibraryError {
  return e instanceof AlreadyInLibraryError;
}

/** E20: thrown by setManualList/updateTracking when "stopped" is set on a dynamically-finished series. */
export class ManualListConflictError extends Error {
  readonly itemId: number;

  constructor(itemId: number) {
    super(`finished series cannot be stopped (itemId=${itemId})`);
    this.name = "ManualListConflictError";
    this.itemId = itemId;
  }
}

export function isManualListConflictError(e: unknown): e is ManualListConflictError {
  return e instanceof ManualListConflictError;
}
