const serverConnectionMessage = 'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá nuevamente.';
const serverCommunicationFallback = 'Ocurrió un error al comunicarnos con el servidor. Intentá nuevamente.';

export function normalizeServerMessage(message?: string) {
  if (!message) return serverCommunicationFallback;

  const lower = message.toLowerCase();

  if (
    lower.includes('backend')
    || lower.includes('api')
    || lower.includes('failed to fetch')
    || lower.includes('network request failed')
    || lower.includes('error de conexión')
    || lower.includes('error de conexion')
  ) {
    return serverConnectionMessage;
  }

  return message;
}

export function getServerConnectionMessage() {
  return serverConnectionMessage;
}

export function getServerCommunicationFallback() {
  return serverCommunicationFallback;
}

export function errorToUserMessage(error: unknown, fallback?: string) {
  if (error instanceof Error) return normalizeServerMessage(error.message);
  return normalizeServerMessage(fallback);
}
