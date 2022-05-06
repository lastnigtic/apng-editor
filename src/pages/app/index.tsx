import { h } from 'preact';
import { listen } from '@tauri-apps/api/event';
import { save, open } from '@tauri-apps/api/dialog';
import { writeBinaryFile, readBinaryFile } from '@tauri-apps/api/fs';
import { useEffect, useRef, useState } from 'preact/hooks';
import { ParsePage } from '../../components';
import { base64ToBinary } from '../../utils';

const ApngParsePage = () => {
	const [parse, setParse] = useState<((f: File) => void) | null>(null);
	const setLoading = useRef<null | ((val?: boolean) => void)>(null);

	useEffect(() => {
		let revoke: any;

		const register = async () => {
			revoke = await listen('tauri://file-drop', async (event) => {
				const path = (event.payload as string[])?.[0];
				if (!path) return;
				setLoading.current?.(true);
				const data = await readBinaryFile(decodeURIComponent(path));

				const dirs = path.split(/[\|/]/);
				const filename = dirs.pop();
				if (!filename) return;
				const file = new File([data], filename);
				parse?.(file);
			});
		};
		register();

		return () => revoke?.();
	}, [parse]);

	return (
		<ParsePage
			getHandler={({ parse, setLoading: _ }) => {
				setParse(() => parse);
				setLoading.current = _;
			}}
			exportApng={async (apng) => {
				const path = await save({
					title: 'please select directory path to save',
				});

				await writeBinaryFile({ contents: apng.data, path: path });
			}}
			exportPng={async (apng, idx) => {
				const path = await save({
					title: 'please select directory path to save',
				});

				await writeBinaryFile({ contents: base64ToBinary(apng.frameImages[idx]), path: path });
			}}
			separatorApng={async (apng) => {
				const directory = await open({
					title: 'please select directory path to save',
					directory: true,
				});

				apng.frameImages.forEach((b64, idx) => {
					writeBinaryFile({
						contents: base64ToBinary(b64),
						path: directory + '/frame_' + idx + '.png',
					});
				});
			}}
		/>
	);
};

export { ApngParsePage };
