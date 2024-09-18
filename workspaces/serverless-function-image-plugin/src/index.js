const { extendServerlessSchema } = require("./schema");

class ServerlessFunctionImage {
  constructor(serverless, options, { log }) {
    this.serverless = serverless;
    this.options = options;
    this.log = log;

    this.provider = this.serverless.getProvider("aws");

    extendServerlessSchema(this.serverless);

    this.hooks = Object.fromEntries(
      [
        "before:logs:logs",
        "before:deploy:function:initialize",
        "before:package:initialize",
        "before:aws:info:gatherData",
      ].map((event) => [event, () => this.hoistImageConfig()])
    );
  }

  hoistImageConfig() {
    const { functions, provider } = this.serverless.service;
    const images = new Map();
    const functionImages = new Map();

    // Dedupe function images
    for (const [name, conf] of Object.entries(functions ?? {})) {
      if (!conf.ecrImage) continue;

      if (conf.image) {
        this.log.warning(
          `Function ${name} already has image defined, skipping ecrImage processing.`
        );
        continue;
      }

      const image = images.get(conf.ecrImage.path) ?? {};

      image.name ??= name;
      image.file ??= conf.ecrImage.file;
      image.buildArgs ??= conf.ecrImage.buildArgs;
      image.buildOptions ??= conf.ecrImage.buildOptions;
      image.cacheFrom ??= conf.ecrImage.cacheFrom;
      image.platform ??= conf.ecrImage.platform;
      image.provenance ??= conf.ecrImage.provenance;

      images.set(conf.ecrImage.path, image);

      functionImages.set(name, image);
    }

    // Avoid collision with user-defined images
    if (provider.ecr?.images) {
      for (const [, image] of images) {
        if (provider.ecr.images[image.name]) {
          const name = image.name;
          let i = 0;

          while (`${name}-${i}` in provider.ecr.images) {
            if (i++ > 999) {
              throw new Error(`Too many images with name ${name}`);
            }
          }

          image.imageName = `${name}-${i}`;
        }
      }
    } else {
      provider.ecr = { images: {} };
    }

    for (const [name, image] of functionImages) {
      functions[name].image ??= { name: image.imageName ?? image.name };
    }

    for (const [path, { name, imageName = name, ...image }] of images) {
      provider.ecr.images[imageName] = { ...image, path };
    }
  }
}

module.exports = ServerlessFunctionImage;
