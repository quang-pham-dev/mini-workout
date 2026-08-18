export interface RequestContext {
  requestId: string;
  traceId?: string;
  parentSpanId?: string;
}

export function createRequestContext(headers?: Headers): RequestContext {
  const requestId = headers?.get('x-request-id') ?? crypto.randomUUID();
  const traceparent = headers?.get('traceparent');
  const [, traceId, parentSpanId] = traceparent?.split('-') ?? [];

  return { requestId, traceId, parentSpanId };
}

export function requestContextHeaders(context: RequestContext): Headers {
  const headers = new Headers({ 'x-request-id': context.requestId });
  if (context.traceId) headers.set('x-trace-id', context.traceId);
  return headers;
}
