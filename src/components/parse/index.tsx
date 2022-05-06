import { h } from 'preact';
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { Apng } from '../../apng';
import { parseApng } from '../../parse';
import {
	AddIcon,
	CloseIcon,
	ExportAllIcon,
	ExportIcon,
	LoadingIcon,
	PauseIcon,
	PlayIcon,
	StopIcon,
} from '../../assets/icon';
import './style.css';

const ParsePage = ({
	exportApng,
	exportPng,
	separatorApng,
	getHandler,
}: {
	exportApng?: (png: Apng) => Promise<void>;
	exportPng?: (png: Apng, frameIndex: number) => Promise<void>;
	separatorApng?: (png: Apng) => Promise<void>;
	getHandler?: (handlers: { parse: (file: File) => void; setLoading: (loading?: boolean) => void }) => void;
}) => {
	const $input = useRef<HTMLInputElement | null>(null);
	const $container = useRef<HTMLDivElement | null>(null);
	const [png, setPng] = useState<Apng | null>(null);
	const [isParsing, setIsParsing] = useState(false);
	const [, setAllDelay] = useState('');

	const parsePNG = useCallback(
		(file: File) => {
			setIsParsing(true);
			requestAnimationFrame(async () => {
				try {
					const apng = await parseApng(file);
					setPng(apng);
				} finally {
					setIsParsing(false);
				}
			});
		},
		[$input.current]
	);

	useEffect(() => {
		getHandler?.({
			parse: parsePNG,
			setLoading(val = true) {
				setIsParsing(val);
			},
		});
	}, [parsePNG]);

	useEffect(() => {
		$container.current && png?.mount($container.current);
	}, [$container.current, png]);

	useEffect(() => {
		const readFile = () => {
			const file = $input.current?.files?.[0];
			if (file) parsePNG(file);
			$input.current && ($input.current.value = '');
		};

		$input.current?.addEventListener('change', readFile);
		return () => $input.current?.removeEventListener('change', readFile);
	}, [$input.current, png]);

	return (
		<div className="apng-container">
			{png ? (
				<div className="apng-result">
					<div className="apng-result-close" onClick={() => setPng(null)}>
						<CloseIcon />
					</div>
					<div className="apng-edit-container">
						{png.frameImages?.map((b64, idx) => (
							<div className="apng-edit-frame">
								<img key={b64.substring(12, 24)} src={b64} />
								<div className="apng-edit-item-container ">
									<span className="apng-edit-item">
										<span className="label">delayNum:</span>
										<input
											type="number"
											onBlur={(e) => {
												const delayNum = +(e.target as HTMLInputElement).value;
												if (delayNum !== png.frames[idx].fcTLChunk.delayDen) {
													png.modifyFrame({ delayNum }, idx);
												}
											}}
											value={png.frames[idx].fcTLChunk.delayNum}
										/>
									</span>
									<span className="apng-edit-item">
										<span className="label">delayDen:</span>
										<input
											type="number"
											onBlur={(e) => {
												const delayDen = +(e.target as HTMLInputElement).value;

												if (delayDen !== png.frames[idx].fcTLChunk.delayDen) {
													png.modifyFrame({ delayDen }, idx);
												}
											}}
											value={png.frames[idx].fcTLChunk.delayDen}
										/>
									</span>
									<span className="apng-edit-item">
										<span className="label">disposeOp:</span>
										<input
											type="number"
											onBlur={(e) => {
												const disposeOp = +(e.target as HTMLInputElement).value;
												if (disposeOp !== png.frames[idx].fcTLChunk.disposeOp) {
													png.modifyFrame({ disposeOp }, idx);
												}
											}}
											value={png.frames[idx].fcTLChunk.disposeOp}
										/>
									</span>
									<span className="apng-edit-item">
										<span className="label">blendOp:</span>
										<input
											type="number"
											onBlur={(e) => {
												const blendOp = +(e.target as HTMLInputElement).value;
												if (blendOp !== png.frames[idx].fcTLChunk.blendOp) {
													png.modifyFrame({ blendOp }, idx);
												}
											}}
											value={png.frames[idx].fcTLChunk.blendOp}
										/>
									</span>
									{exportPng && (
										<span className="apng-edit-item">
											<span className="label single" onClick={() => exportPng(png, idx)}>
												<ExportIcon />
												Export
											</span>
										</span>
									)}
								</div>
							</div>
						))}
					</div>
					<div className="apng-preview-container apng-edit-frame">
						<div className="apng-preview" ref={$container}></div>
						<div className="apng-edit-item-container">
							<span className="apng-edit-item">
								<span onClick={() => png.play()}>
									<PlayIcon />
								</span>
								<span onClick={() => png.pause()}>
									<PauseIcon />
								</span>
								<span onClick={() => png.stop()}>
									<StopIcon />
								</span>
							</span>
							<span className="apng-edit-item">
								<span className="label">playTime:</span>
								<input
									type="number"
									onBlur={(e) => {
										const playTime = +(e.target as HTMLInputElement).value;
										if (playTime !== png.ACTL?.playTime) {
											png.modify({ playTime });
										}
									}}
									value={png.ACTL?.playTime}
								/>
							</span>
							{!!exportApng && (
								<span className="apng-edit-item" onClick={() => exportApng(png)}>
									<ExportIcon /> Export
								</span>
							)}
							{!!separatorApng && (
								<span className="apng-edit-item" onClick={() => separatorApng(png)}>
									<ExportAllIcon /> Separator
								</span>
							)}
							<span className="apng-edit-item" style={{ marginTop: 48 }}>
								<span className="label" style={{ width: 160 }}>
									allFramesDelay(ms):
								</span>
								<input
									type="number"
									onBlur={(e) => {
										let delayNum = parseInt((e.target as HTMLInputElement).value, 10);
										if (Number.isNaN(delayNum)) return;
										if (delayNum < 11) delayNum = 100;
										png.frames.forEach((f, idx) => png.modifyFrame({ delayDen: 1000, delayNum }, idx));
										setAllDelay(delayNum.toString());
										if (png.playing) {
											png.stop();
											requestAnimationFrame(() => png.play());
										}
									}}
								/>
							</span>
						</div>
					</div>
				</div>
			) : (
				<div className="apng-file-container">
					{isParsing ? (
						<LoadingIcon />
					) : (
						<div
							className="apng-file-target"
							onDrop={async (e: DragEvent) => {
								const idx = Array.from(e.dataTransfer?.files || []).findIndex((f) => f.type === 'image/png');
								e.stopPropagation();
								e.preventDefault();
								if (idx < 0) return;
								parsePNG(e.dataTransfer?.files[idx]!);
							}}
							onDragOver={(e) => e.preventDefault()}
							onClick={() => $input.current?.click()}
						>
							<input ref={$input} type="file" accept="image/png" style={{ display: 'none' }} />
							<AddIcon />
							<div className="apng-file-target-tip">Click to select or drop .apng file</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export { ParsePage };
