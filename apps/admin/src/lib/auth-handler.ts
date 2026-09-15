export function forwardAuthRequest(
  request: Request,
  handler: (request: Request) => Promise<Response>,
): Promise<Response> {
  return handler(request);
}
