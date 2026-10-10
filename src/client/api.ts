export async function api<T>(path: string, body?: unknown): Promise<T> {
  const options: RequestInit = body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
  const response = await fetch(`/api${path}`, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? '请求未完成，请重试');
  return result as T;
}
