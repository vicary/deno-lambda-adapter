# serverless-function-image-plugin

This plugin hoists image definitions from `functions.*.ecrImage` to
`provider.ecr.images.*`, allowing a single file import for functions with custom
container images.

## Usage

For example:

```yaml
functions:
  greeter:
    ecrImage:
      path: ./path/to/Dockerfile
      platform: linux/amd64
      provenance: false
```

Becomes the following:

```yaml
provider:
  name: aws
  ecr:
    images:
      greeter:
        path: ./path/to/Dockerfile
        platform: linux/amd64
functions:
  greeter:
    image:
      name: greeter
```

Container images can be reused by specifying the same Dockerfile path in
multiple functions, the first function will be used as the image name;
subsequent object properties are merged when it's not previously defined by
other functions.
