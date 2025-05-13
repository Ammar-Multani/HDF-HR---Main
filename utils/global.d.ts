declare global {
  interface Global {
    structuredClone: <T>(obj: T) => T;
    crypto: {
      getRandomValues: (array: Uint8Array) => Uint8Array;
      subtle: any;
    };
  }
}

export {};
