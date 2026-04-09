interface Env {
  BACKEND: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export const onRequest = async (context: {
  request: Request;
  env: Env;
}) => {
  return context.env.BACKEND.fetch(context.request);
};
