import { registerHandler } from "./lambda.ts";

registerHandler(async (event, context) => {
  return { event, context };
});
