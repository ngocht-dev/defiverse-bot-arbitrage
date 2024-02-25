export const logger = {
  debug: (message: string | object, prefix?: string) => {
    return console.debug.apply(
      console,
      prefix
        ? [prefix, new Date(), 'DEBUG:', message]
        : [new Date(), 'DEBUG:', message],
    );
  },
  info: (message: string | object, prefix?: string) => {
    return console.info.apply(
      console,
      prefix
        ? [prefix, new Date(), 'INFO:', message]
        : [new Date(), 'INFO:', message],
    );
  },
  error: (message: string | object, prefix?: string) => {
    return console.error.apply(
      console,
      prefix
        ? [prefix, new Date(), 'ERROR:', message]
        : [new Date(), 'ERROR:', message],
    );
  },
};
