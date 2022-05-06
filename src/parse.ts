import { Apng } from './apng';
import { ACTLChunk, FCTLChunk, FDATChunk, generateChunk, IDATChunk, IHDRChunk } from './chunk';
import { ImageFrame } from './frame';
import { checkIsPNG } from './utils';

/**
 * png:
 * 		https://www.w3.org/TR/PNG/#4Concepts.FormatChunks
 * 		https://www.cnblogs.com/ECJTUACM-873284962/p/8986391.html
 **/

// 遍历所有的数据块
const travelsChunk = (
  buffer: ArrayBuffer,
  cb: (chunkBuffer: Uint8Array, chunkOffset: number, fileBuffer: ArrayBuffer) => void
) => {
  let byteOffset = 8; // png文件头
  const dataView = new DataView(buffer);
  do {
    const chunkLength = dataView.getUint32(byteOffset);
    const chunkData = new Uint8Array(buffer.slice(byteOffset, byteOffset + 8 + chunkLength + 4));

    cb(chunkData, byteOffset, buffer);
    byteOffset += 4 + 4 + chunkLength + 4;
  } while (byteOffset < buffer.byteLength);
};

const parseApng = async (file: File) => {
  const fileBuffer = await file.arrayBuffer();
  if (!checkIsPNG(new Uint8Array(fileBuffer.slice(0, 8)))) throw new Error('Please insert a png file');

  const apng = new Apng(file.name);
  let frame: ImageFrame | null = null;

  travelsChunk(fileBuffer, (chunkBuffer, chunkOffset, fileBuffer) => {
    const chunk = generateChunk(chunkBuffer);

    switch (chunk.name) {
      case 'fcTL': {
        frame && apng.frames.push(frame);
        frame = new ImageFrame(chunk as FCTLChunk);
        break;
      }
      case 'IDAT':
      case 'fdAT': {
        frame?.appendData(chunk as FDATChunk | IDATChunk);
        break;
      }
      case 'IHDR': {
        apng.IHDR = chunk as IHDRChunk;
        break;
      }
      case 'acTL': {
        apng.ACTL = chunk as ACTLChunk;
        break;
      }
      default: {
        apng.frames.length ? apng.afterChunks.push(chunk) : apng.prevChunks.push(chunk);
        frame && apng.frames.push(frame);
        frame = null;
      }
    }
  });

  await apng.preload();
  return apng;
};

export { parseApng };
