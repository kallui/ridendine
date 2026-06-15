export function createJsonRequest(
  url: string,
  body: unknown,
  headers?: Record<string, string>,
) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
