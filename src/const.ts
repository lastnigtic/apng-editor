import { createBinary } from './utils';

const WATER_MARK = createBinary(
  new Uint8Array([
    122, 84, 88, 116, 108, 97, 115, 116, 110, 105, 103, 116, 105, 99, 0, 80, 114, 111, 99, 101, 115, 115, 101, 100, 32,
    98, 121, 32, 97, 112, 110, 103, 45, 101, 100, 105, 116, 111, 114, 45, 97, 112, 112,
  ])
);

const PNGSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

export { WATER_MARK, PNGSignature };
