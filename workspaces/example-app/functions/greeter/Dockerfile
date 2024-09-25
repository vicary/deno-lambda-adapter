# This Dockerfile is a modified version from the example provided at
# https://docs.deno.com/runtime/tutorials/aws_lambda/
#
# Modifications:
# 1. debian -> alpine
# 2. `timeout 10s deno run` -> `deno cache`

# Set up the base image
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
# RUN timeout 10s deno run -A handler.ts || [ $? -eq 143 ] || exit 1

CMD ["deno", "run", "-A", "handler.ts"]
