import { ACTLChunk, Chunk, IFCTLConfig, IHDRChunk } from './chunk';
import { PNGSignature, WATER_MARK } from './const';
import { ImageFrame } from './frame';
import { createBinaryByChunks } from './utils';

class Apng {
  public IHDR?: IHDRChunk;
  public ACTL?: ACTLChunk;
  public prevChunks: Chunk[] = [];
  public afterChunks: Chunk[] = [];
  public name: string;
  public preloadLength: number = 12;

  private $images: HTMLImageElement[] = [];
  private imageReq: Promise<HTMLImageElement[]> | null = null;

  get playTime() {
    return this.ACTL?.playTime || 0;
  }

  get data() {
    return createBinaryByChunks([
      { data: PNGSignature },
      this.IHDR!,
      ...this.prevChunks,
      this.ACTL!,
      ...this.frames,
      { data: WATER_MARK },
      ...this.afterChunks,
    ]);
  }

  public frameImages: string[] = [];

  public frames: ImageFrame[] = [];
  public index = 0;

  public prevFrameData: ImageData | null = null;

  public $canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  constructor(name: string) {
    this.name = name;
    this.$canvas = document.createElement('canvas');
    this.ctx = this.$canvas.getContext('2d')!;
    const ua = navigator.userAgent;
    const isApple = /Mac\sOS\sX/i.test(ua);
    const isChrome = /chrome/i.test(ua);
    const isFirefox = /firefox/i.test(ua);
    const includeSafari = /safari/i.test(ua);
    if (isApple && ((includeSafari && !isChrome && !isFirefox) || (!includeSafari && !isChrome && !isFirefox))) {
      this.preloadLength = 1;
    }
  }

  public modify({ playTime }: { playTime: number }) {
    this.ACTL = this.ACTL?.newByConfig({ playTime });
  }

  public modifyFrame(config: Partial<IFCTLConfig>, idx: number) {
    const frame = this.frames[idx];
    frame.fcTLChunk = frame.fcTLChunk.newByConfig(config);
    this.loadImage(idx);
  }

  private loadImage = async (idx: number) =>
    new Promise<HTMLImageElement>((resolve, rejected) => {
      const frame = this.frames[idx];
      if (!frame) return rejected();
      const image = document.createElement('img');
      const fctl = frame.fcTLChunk;
      const cIHDR = this.IHDR!.newByConfig({ width: fctl.width, height: fctl.height });
      const imageData = new Blob(
        [
          PNGSignature,
          cIHDR.data,
          createBinaryByChunks(this.prevChunks),
          frame.dataChunk,
          createBinaryByChunks(this.afterChunks),
        ],
        {
          type: 'image/png',
        }
      );

      const url = URL.createObjectURL(imageData);
      image.src = url;
      image.onload = () => {
        this.$images[idx] = image;
        resolve(image);
      };
      image.onerror = (e) => rejected(e);
    });

  public loadImages = async () => {
    if (!this.IHDR) return;
    if (this.imageReq) return this.imageReq;
    this.imageReq = Promise.all(this.frames.map((_, idx) => this.loadImage(idx)));

    await this.imageReq;
    this.imageReq = null;

    const width = this.IHDR.width;
    const height = this.IHDR.height;

    this.$canvas.setAttribute('width', `${width * window.devicePixelRatio}`);
    this.$canvas.setAttribute('height', `${height * window.devicePixelRatio}`);
    this.$canvas.setAttribute('style', `width: ${width}px;height: ${height}px;`);
    this.ctx = this.$canvas.getContext('2d')!;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  };

  public renderFrame = () => {
    const prevFrame = this.frames[this.index - 1];

    if (prevFrame) {
      // 上一帧定义了要把数据区清空
      if (prevFrame.fcTLChunk.disposeOp == 1) {
        this.ctx.clearRect(
          prevFrame.fcTLChunk.xOffset,
          prevFrame.fcTLChunk.yOffset,
          prevFrame.fcTLChunk.width,
          prevFrame.fcTLChunk.height
        );
        // 上一帧定义了要把数据区恢复成之前的状态
      } else if (this.prevFrameData && prevFrame.fcTLChunk.disposeOp == 2) {
        this.ctx.putImageData(this.prevFrameData, prevFrame.fcTLChunk.xOffset, prevFrame.fcTLChunk.yOffset);
      }
    }

    const frame = this.frames[this.index];
    const fctl = frame.fcTLChunk;

    // 保存渲染当前帧之前的状态
    if (frame.fcTLChunk.disposeOp == 2) {
      this.prevFrameData = this.ctx.getImageData(fctl.xOffset, fctl.yOffset, fctl.width, fctl.height);
    }
    // 渲染当前帧之前把数据区清空
    if (frame.fcTLChunk.blendOp == 0) {
      this.ctx.clearRect(fctl.xOffset, fctl.yOffset, fctl.width, fctl.height);
    }

    this.ctx.drawImage(this.$images[this.index], fctl.xOffset, fctl.yOffset);
  };

  public preload = async () => {
    if (!this.IHDR) return;

    await this.loadImages();

    await new Promise<void>((resolve) => {
      const render = () => {
        if (this.index < this.frames.length) {
          const targetIndex = Math.min(this.index + this.preloadLength, this.frames.length);
          while (this.index < targetIndex) {
            this.renderFrame();
            this.index++;
            this.frameImages.push(this.$canvas.toDataURL('image/png', 1));
          }
          requestAnimationFrame(render);
        } else {
          this.index = 0;
          this.renderFrame();
          resolve();
        }
      };
      render();
    });
  };

  public mount(container: HTMLElement) {
    if (!this.IHDR) return;
    if (!container.contains(this.$canvas)) {
      let style = `width: ${this.IHDR.width}px;height: ${this.IHDR.height}px;`;
      let scale = 1;
      const maxLength = Math.max(this.IHDR.width, this.IHDR.height);
      if (maxLength > 400) {
        scale = 400 / maxLength;
        style += `transform: scale(${scale});transform-origin: top left;`;
      }
      container.setAttribute('style', style);
      container.appendChild(this.$canvas);
    }
  }

  public playing = false;

  public pause = () => {
    this.playing = false;
  };

  public stop = () => {
    this.playing = false;
    this.index = 0;
    this.renderFrame();
  };

  public play = async () => {
    if (this.playing) return;
    if (this.imageReq || !this.$images.length) await this.loadImages();

    this.playing = true;
    let playTime = 0;

    let nextFrameTime = 0;

    const delays = this.frames.map((f) => f.delay);

    const tick = (now: number) => {
      if (!this.playing) return;

      if (this.playTime && playTime > this.playTime) return this.pause();

      if (!this.index) nextFrameTime = now;
      if (now < nextFrameTime) return requestAnimationFrame(tick);

      while (nextFrameTime <= now) {
        if (this.index >= this.frames.length) {
          playTime++;
          this.index = 0;
          break;
        }
        this.renderFrame();
        nextFrameTime += delays[this.index++];
      }

      requestAnimationFrame(tick);
    };

    tick(performance.now());
  };
}

export { Apng };
