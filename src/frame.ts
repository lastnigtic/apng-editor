import { IDATChunk, FCTLChunk, FDATChunk } from './chunk';
import { createBinary, createBinaryByChunks } from './utils';

const IDAT = new Uint8Array([73, 68, 65, 84]);

class ImageFrame {
	public fcTLChunk: FCTLChunk;
	private dataChunks: Array<FDATChunk | IDATChunk> = [];

	get dataChunk() {
		const total = this.dataChunks.reduce((a, b) => a + b.frameData.byteLength, 0) + 4;
		const uint8 = new Uint8Array(total);
		uint8.set(IDAT);
		let offset = 4;
		this.dataChunks.map((c) => {
			uint8.set(c.frameData, offset);
			offset += c.frameData.byteLength;
		});
		return createBinary(uint8);
	}

	get delay() {
		const delay = (this.fcTLChunk.delayNum * 1000) / this.fcTLChunk.delayDen;
		return delay < 11 ? 100 : delay;
	}

	get data() {
		return createBinaryByChunks([this.fcTLChunk, ...this.dataChunks]);
	}

	public appendData = (chunk: FDATChunk | IDATChunk) => {
		this.dataChunks.push(chunk);
	};

	constructor(fctl: FCTLChunk) {
		this.fcTLChunk = fctl;
	}
}

export { ImageFrame };
