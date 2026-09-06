export function authRequestOptions(baseURL: string) {
  return {
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  };
}
