import { registerHandler } from "jsr:@vicary/lambda-adapter@^0.1.1";

registerHandler(async (event, context) => {
  return { event, context };
});
