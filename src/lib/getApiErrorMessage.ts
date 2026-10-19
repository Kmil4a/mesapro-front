export function getApiErrorMessage(
  error: unknown,
  fallback = "Ocurrió un error inesperado.",
): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
