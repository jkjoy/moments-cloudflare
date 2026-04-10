export const onRequest = async (context: { request: Request }) => {
  const url = new URL(context.request.url);
  url.pathname = "/favicon.png";
  return Response.redirect(url.toString(), 302);
};
