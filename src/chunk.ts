import { createBinary, readBinary } from './utils';

// 数据块
class Chunk<T = object> {
  public data: Uint8Array;
  // https://blog.csdn.net/Kj1501120706/article/details/73330526
  // https://zhuanlan.zhihu.com/p/61636624

  public get name() {
    return readBinary(this.data.subarray(4, 8));
  }

  constructor(data: Uint8Array) {
    this.data = data;
  }

  public newByConfig(newConfig: Partial<T>) {
    const newInstance = this.createNewInstance();
    Object.keys(newConfig).forEach((name) => {
      // @ts-ignore
      newInstance[name] = newConfig[name];
    });
    newInstance.syncData();
    newInstance.data = createBinary(newInstance.data.subarray(4, this.data.byteLength - 4));

    return newInstance as unknown as this;
  }

  public syncData() {}

  public createNewInstance() {
    return new Chunk(this.data);
  }
}

/**
 * IHDR 文件头数据块
 * length(长度) 4
 * type(类型) 4
 * width(长度) 4
 * height(高度) 4
 * bit depth(图像深度) 1
 * colorType(颜色类型) 1
 * compression method(压缩方法) 1
 * filter method(滤波器方法) 1
 * interlace method(非隔行扫描方法) 1
 * CRC(循环冗余检测) 4
 */

interface IHDRConfig {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  compressionType: number;
  filterType: number;
  interlaceType: number;
}

class IHDRChunk extends Chunk<IHDRConfig> {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  compressionType: number;
  filterType: number;
  interlaceType: number;

  constructor(data: Uint8Array) {
    super(data);

    const dv = new DataView(data.buffer);
    this.width = dv.getUint32(8 + 0);
    this.height = dv.getUint32(8 + 4);
    this.bitDepth = dv.getUint8(8 + 8);
    this.colorType = dv.getUint8(8 + 9);
    this.compressionType = dv.getUint8(8 + 10);
    this.filterType = dv.getUint8(8 + 11);
    this.interlaceType = dv.getUint8(8 + 12);
  }

  syncData() {
    const bytes = new Uint8Array(this.data);
    const dv = new DataView(bytes.buffer);
    dv.setUint32(8 + 0, this.width);
    dv.setUint32(8 + 4, this.height);
    dv.setUint8(8 + 8, this.bitDepth);
    dv.setUint8(8 + 9, this.colorType);
    dv.setUint8(8 + 10, this.compressionType);
    dv.setUint8(8 + 11, this.filterType);
    dv.setUint8(8 + 12, this.interlaceType);
    this.data = bytes;
  }

  public createNewInstance() {
    return new IHDRChunk(this.data);
  }
}

/**
 * acTL 动画控制数据块
 * num_frames 4
 * num_plays 4
 */
interface IACTLConfig {
  frameCount: number;
  playTime: number;
}
class ACTLChunk extends Chunk<IACTLConfig> {
  frameCount: number;
  playTime: number;

  constructor(data: Uint8Array) {
    super(data);

    const dv = new DataView(data.buffer);
    this.frameCount = dv.getUint32(8 + 0);
    this.playTime = dv.getUint32(8 + 4);
  }

  syncData() {
    const bytes = new Uint8Array(this.data);
    const dv = new DataView(bytes.buffer);
    dv.setUint32(8 + 0, this.frameCount);
    dv.setUint32(8 + 4, this.playTime);
    this.data = bytes;
  }

  public createNewInstance() {
    return new ACTLChunk(this.data);
  }
}

/**
 * fcTL 帧控制数据块
 * sequence_number(帧序号) 4
 * width 4
 * height 4
 * x_offset 4
 * y_offset 4
 * delay_num 2 间隔分子
 * delay_den 2 间隔分母
 * dispose_op 1 在显示该帧之前，需要对前面缓冲输出区域做何种处理。
 * blend_op 1 帧渲染类型
 */
export interface IFCTLConfig {
  num: number;
  width: number;
  height: number;
  xOffset: number;
  yOffset: number;
  delayNum: number;
  delayDen: number;
  disposeOp: number;
  blendOp: number;
}

class FCTLChunk extends Chunk<IFCTLConfig> {
  num: number;
  width: number;
  height: number;
  xOffset: number;
  yOffset: number;
  delayNum: number;
  delayDen: number;
  disposeOp: number;
  blendOp: number;

  constructor(data: Uint8Array) {
    super(data);

    const dv = new DataView(data.buffer);
    this.num = dv.getUint32(8 + 0);
    this.width = dv.getUint32(8 + 4);
    this.height = dv.getUint32(8 + 8);
    this.xOffset = dv.getUint32(8 + 12);
    this.yOffset = dv.getUint32(8 + 16);
    this.delayNum = dv.getUint16(8 + 20);
    this.delayDen = dv.getUint16(8 + 22);
    this.disposeOp = dv.getUint8(8 + 24);
    this.blendOp = dv.getUint8(8 + 25);
  }

  syncData() {
    const bytes = new Uint8Array(this.data);
    const dv = new DataView(bytes.buffer);
    dv.setUint32(8 + 0, this.num);
    dv.setUint32(8 + 4, this.width);
    dv.setUint32(8 + 8, this.height);
    dv.setUint32(8 + 12, this.xOffset);
    dv.setUint32(8 + 16, this.yOffset);
    dv.setUint16(8 + 20, this.delayNum);
    dv.setInt16(8 + 22, this.delayDen);
    dv.setUint8(8 + 24, this.disposeOp);
    dv.setUint8(8 + 25, this.blendOp);
    this.data = bytes;
  }

  public createNewInstance() {
    return new FCTLChunk(this.data);
  }
}

/**
 * IDAT 帧数据块
 * frame_data 数据块
 */
class IDATChunk extends Chunk {
  frameData: Uint8Array;
  constructor(data: Uint8Array) {
    super(data);

    this.frameData = data.subarray(8, data.length - 4);
  }
}

/**
 * fdAT 帧数据块
 * sequence_number 4 帧序号
 * frame_data 数据块
 */
interface IFDATConfig {
  num: number;
  frameData: Uint8Array;
}

class FDATChunk extends Chunk<IFDATConfig> {
  num: number;
  frameData: Uint8Array;

  constructor(data: Uint8Array) {
    super(data);

    const dv = new DataView(data.buffer);
    this.num = dv.getUint32(8 + 0);
    this.frameData = data.subarray(8 + 4, data.length - 4);
  }

  syncData() {
    const bytes = new Uint8Array(this.frameData.byteLength + 12);
    const dv = new DataView(bytes.buffer);
    bytes.set(this.data, 0);
    dv.setUint32(8, this.num);
    bytes.set(new Uint8Array(this.frameData), 12);
    this.data = bytes;
  }

  public createNewInstance() {
    return new FDATChunk(this.data);
  }
}

const generateChunk = (binary: Uint8Array) => {
  const type = readBinary(binary.subarray(4, 8));
  if (/ihdr/i.test(type)) {
    return new IHDRChunk(binary);
  } else if (/actl/i.test(type)) {
    return new ACTLChunk(binary);
  } else if (/fctl/i.test(type)) {
    return new FCTLChunk(binary);
  } else if (/fdat/i.test(type)) {
    return new FDATChunk(binary);
  } else if (/idat/i.test(type)) {
    return new IDATChunk(binary);
  }

  return new Chunk(binary);
};

export { Chunk, IHDRChunk, ACTLChunk, FCTLChunk, FDATChunk, IDATChunk, generateChunk };
