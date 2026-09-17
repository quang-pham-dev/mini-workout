export interface RequestContext {
  requestId: string;
  traceId?: string;
  parentSpanId?: string;
}

const requestIdPattern = /^[A-Za-z0-9._:-]{1,128}$/;
const traceIdPattern = /^[a-f0-9]{32}$/;
const spanIdPattern = /^[a-f0-9]{16}$/;

export function createRequestContext(headers?: Headers): RequestContext {
  const incomingRequestId = headers?.get('x-request-id') ?? '';
  const requestId = requestIdPattern.test(incomingRequestId)
    ? incomingRequestId
    : crypto.randomUUID();
  const traceparent = headers?.get('traceparent')?.split('-') ?? [];
  const [, candidateTraceId, candidateParentSpanId] = traceparent;
  const traceId = traceIdPattern.test(candidateTraceId ?? '')
    ? candidateTraceId
    : undefined;
  const parentSpanId = spanIdPattern.test(candidateParentSpanId ?? '')
    ? candidateParentSpanId
    : undefined;

  return { requestId, traceId, parentSpanId };
}

export function requestContextHeaders(context: RequestContext): Headers {
  const headers = new Headers({ 'x-request-id': context.requestId });
  if (context.traceId) headers.set('x-trace-id', context.traceId);
  return headers;
}
