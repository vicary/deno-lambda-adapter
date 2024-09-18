/**
 * The new `image` property contains combined properties of the following:
 * 1. provider.properties.ecr.properties.images
 * 2. function.properties.image
 *
 * Since we are replacing item 2, we have to copy the raw schema contents
 * instead of using $ref here.
 *
 * @see https://github.com/serverless/serverless/blob/master/lib/plugins/aws/provider.js
 */
function extendServerlessSchema(serverless) {
  serverless.configSchemaHandler?.defineFunctionProperties?.("aws", {
    type: "object",
    properties: {
      ecrImage: {
        type: "object",
        properties: {
          // provider.ecr.images
          path: { type: "string" },
          file: { type: "string" },
          buildArgs: {
            type: "object",
            additionalProperties: { type: "string" },
          },
          buildOptions: {
            type: "array",
            items: { type: "string" },
          },
          cacheFrom: {
            type: "array",
            items: { type: "string" },
          },
          platform: { type: "string" },
          provenance: { type: "boolean" },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  });
}

module.exports = {
  extendServerlessSchema,
};
