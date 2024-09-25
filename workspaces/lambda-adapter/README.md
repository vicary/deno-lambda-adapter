# Deno Lambda Adapter

A thin shim for the AWS Lambda layer
[`awslabs/aws-lambda-adapter`](https://github.com/awslabs/aws-lambda-web-adapter)
in Deno, re-wrapping events and context from into a Node.js compatible version.

You may read more about the story at
[#354](https://github.com/awslabs/aws-lambda-web-adapter/issues/354).

## Usage

1. Take a brief look at Deno's
   [official guide for AWS Lambda](https://docs.deno.com/runtime/tutorials/aws_lambda/).
1. Create a Dockerfile for your Lambda function, you may use our example below.
1. Create an entry point `handler.ts` using `registerHandler` from this package.
1. Build and push your Docker image to ECR.
1. Create a Lambda function using the image.

### Dockerfile

```dockerfile
# This Dockerfile is a modified version from the example provided at
# https://docs.deno.com/runtime/tutorials/aws_lambda/
#
# Modifications:
# 1. debian -> alpine
# 2. `timeout 10s deno run` -> `deno cache`

# Set up base images
FROM public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 AS aws-lambda-adapter
FROM alpine AS runtime

COPY --from=aws-lambda-adapter /lambda-adapter /opt/extensions/lambda-adapter

ENV PORT=8000
EXPOSE 8000

RUN mkdir /var/deno/
ENV DENO_DIR=/var/deno/

# Copy the function code
WORKDIR "/var/task"
COPY . /var/task

# Install deno
RUN apk add --no-cache deno

# Warmup caches
RUN deno cache handler.ts

CMD ["deno", "run", "-A", "handler.ts"]
```

### handler.ts

```typescript
import { registerHandler } from "jsr:@vicary/lambda-adapter";

registerHandler(async (event, context) => {
  return "Hello World!";
});
```
