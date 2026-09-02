export function formatBotError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.length > 500) {
    return `${message.slice(0, 497)}...`;
  }
  return message;
}
