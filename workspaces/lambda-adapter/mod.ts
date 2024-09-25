import type { Context, Handler } from "npm:@types/aws-lambda@^8.10.145";
import { onStart, onStop } from "./server.ts";

let lambdaHandler: Handler | null = null;

/**
 * Register the handler function to be called when the Lambda function is
 * invoked.
 */
export const registerHandler = (handler: Handler): void => {
  // [ ] Handle environment variable `_HANDLER`
  lambdaHandler = handler;
};

type Ok<T> = [null, T];
type Err<E> = [E, null];
type Result<T, E = Error> = Ok<T> | Err<E>;

function ensureResult<T, E = Error>([err, val]: Result<T, E>): T {
  if (err) throw err;

  return val!;
}

const shutdown = await onStart(async (req) => {
  if (req.method === "GET") {
    return new Response();
  }

  const context = ensureResult(
    parseLambdaContext(req.headers.get("x-amzn-lambda-context"))
  );

  const event = parseLambdaEvent(await req.text());

  const requestContext = ensureResult(
    parseRequestContext(req.headers.get("x-amzn-lambda-request-context"))
  );

  if (requestContext !== null) {
    event.requestContext = requestContext;
  }

  const response = await new Promise((resolve, reject) => {
    try {
      const maybePromise = lambdaHandler?.(event, context, (error, result) =>
        error ? reject(error) : resolve(result)
      );

      if (maybePromise instanceof Promise) {
        maybePromise.then(resolve, reject);
      } else {
        resolve(maybePromise);
      }
    } catch (e) {
      reject(e);
    }
  });

  return new Response(JSON.stringify(response));
});

onStop(shutdown);

function parseLambdaContext(input: string | null): Result<Context> {
  input = input?.trim() || null;
  if (!input) {
    return [new Error(`Unexpected empty Lambda context.`), null];
  }

  const [error, contents] = parseJson(input);
  if (error) {
    return [
      new Error(`Malformed JSON in Lambda context: ${input}`, {
        cause: error,
      }),
      null,
    ];
  }

  if (typeof contents !== "object" || !contents) {
    return [new Error(`Lambda context must be an object, got: ${input}`), null];
  }

  const {
    request_id,
    deadline,
    invoked_function_arn,
    xray_trace_id,
    client_context,
    identity,
    env_config: { function_name, memory, version, log_stream, log_group },
  } = contents as Record<string, any>;

  const noop = () => {};

  Deno.env.set("_X_AMZN_TRACE_ID", xray_trace_id);

  return [
    null,
    {
      functionName: function_name,
      functionVersion: version,
      invokedFunctionArn: invoked_function_arn,
      memoryLimitInMB: memory,
      awsRequestId: request_id,
      logGroupName: log_group || Deno.env.get("AWS_LAMBDA_LOG_GROUP_NAME"),
      logStreamName: log_stream || Deno.env.get("AWS_LAMBDA_LOG_STREAM_NAME"),
      identity,
      clientContext: client_context,
      callbackWaitsForEmptyEventLoop: true,
      getRemainingTimeInMillis: () => deadline - Date.now(),
      done: noop,
      fail: noop,
      succeed: noop,
    },
  ];
}

function parseRequestContext(
  input: string | null
): Result<Record<string, any> | null> {
  input = input?.trim() || null;
  if (!input) return [null, null];

  const [error, contents] = parseJson(input);
  if (error) {
    return [
      new Error(`Malformed JSON in request context: ${input}`, {
        cause: error,
      }),
      null,
    ];
  }

  if (typeof contents !== "object" || !contents) {
    return [
      new Error(`Request context must be an object, got: ${input}`),
      null,
    ];
  }

  return [null, contents as Record<string, any>];
}

function parseLambdaEvent(input: string): Record<string, unknown> {
  input = input?.trim();
  if (!input) return {};

  const [error, event] = parseJson(input);
  if (error) {
    throw new Error(`Malformed JSON in Lambda event: ${input}`, {
      cause: error,
    });
  }

  if (typeof event !== "object") {
    throw new Error(`Lambda event is not an object: ${event}`);
  }

  return (event as Record<string, unknown> | null) ?? {};
}

function parseJson(input: string): Result<unknown> {
  try {
    return [null, JSON.parse(input)];
  } catch (e) {
    if (!(e instanceof Error)) throw e;

    return [e, null];
  }
}
