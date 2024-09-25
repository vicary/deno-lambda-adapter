import { registerHandler } from "jsr:@vicary/lambda-adapter@^0.1.4";

registerHandler(async (event, context) => {
  return { event, context };
});
