import * as CRC from 'crc-32';
import { PNGSignature } from './const';

const base64ToBinary = (b64: string) => Uint8Array.from(atob(b64.split(',')[1]), (c) => c.charCodeAt(0));

const createBinaryByChunks = (list: { data: Uint8Array }[]) => {
	const totalLength = list.reduce((a, b) => a + b.data.byteLength, 0);
	const binary = new Uint8Array(totalLength);
	let prev = 0;
	list.forEach((c) => {
		binary.set(c.data, prev);
		prev += c.data.byteLength;
	});
	return binary;
};

// 判断是不是png
const checkIsPNG = (buffer: Uint8Array) => Array.from(buffer.slice(0, 8)).every((byte, i) => byte === PNGSignature[i]);

// 二进制转字符串
const readBinary = (buffer: Uint8Array) => String.fromCharCode(...Array.from(buffer));

const createBinary = (data: Uint8Array) => {
	const bytes = new Uint8Array(data.byteLength + 8);
	const dv = new DataView(bytes.buffer);
	// 设置长度
	dv.setUint32(0, data.length - 4);
	bytes.set(data, 4);
	const crc = CRC.buf(bytes.subarray(4, 4 + data.byteLength));
	dv.setUint32(bytes.length - 4, crc);

	return bytes;
};

const toByteArray = (number: number | string, length = 2) => {
	const result: number[] = [];
	const hexStr = number.toString(16);
	let stash: string[] = [];
	Array.from(hexStr)
		.reverse()
		.forEach((i, idx) => {
			stash.unshift(i);
			if (stash.length === 2 || idx === hexStr.length - 1) {
				result.push(parseInt(stash.join(''), 16));
				stash = [];
			}
		});

	while (result.length < length) result.push(0);

	return result.reverse();
};

export { base64ToBinary, checkIsPNG, createBinaryByChunks, readBinary, toByteArray, createBinary };
