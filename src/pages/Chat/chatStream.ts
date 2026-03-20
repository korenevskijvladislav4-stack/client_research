export type ChatStreamEvent =
  | { type: 'meta'; model: string }
  | { type: 'reasoning_delta'; text: string }
  | { type: 'content_delta'; text: string }
  | { type: 'error'; message: string }
  | { type: 'done' };

export async function readChatNdjsonStream(
  body: ReadableStream<Uint8Array> | null,
  onEvent: (e: ChatStreamEvent) => void,
): Promise<void> {
  if (!body) return;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      try {
        onEvent(JSON.parse(t) as ChatStreamEvent);
      } catch {
        /* ignore malformed chunk */
      }
    }
  }
  const tail = buffer.trim();
  if (tail) {
    try {
      onEvent(JSON.parse(tail) as ChatStreamEvent);
    } catch {
      /* ignore */
    }
  }
}
