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
