export function authRequestOptions(baseURL: string) {
  return {
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  };
}

export function authContextOptions(baseURL: string) {
  return authRequestOptions(baseURL);
}

type AuthResponse = {
  ok(): boolean;
  status(): number;
  text(): Promise<string>;
};

export async function assertAuthResponse(
  response: AuthResponse,
  operation: string,
): Promise<void> {
  if (response.ok()) return;
  const body = (await response.text()).slice(0, 500);
  throw new Error(
    `${operation} failed with HTTP ${response.status()}${body ? `: ${body}` : ''}`,
  );
}
