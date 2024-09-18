Deno.serve(async (req, info) => {
  console.info(
    `HTTP ${req.method} ${req.url} from ${
      info.remoteAddr.hostname
    }: ${await req.text()}`
  );

  return new Response("{}");
});
