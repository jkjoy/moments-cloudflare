interface Env {
  BACKEND: {
    fetch: (request: Request) => Promise<Response>;
  };
}

const proxyPrefixes = ["/api", "/r2"];

export const onRequest = async (context: {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
}) => {
  const url = new URL(context.request.url);
  const shouldProxy = proxyPrefixes.some((prefix) => {
    return url.pathname === prefix || url.pathname.startsWith(`${prefix}/`);
  });

  if (!shouldProxy) {
    return context.next();
  }

  return context.env.BACKEND.fetch(context.request);
};
