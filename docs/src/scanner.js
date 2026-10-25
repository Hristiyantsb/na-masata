let library;
function loadLibrary() {
  if (window.ZXingBrowser) return Promise.resolve(window.ZXingBrowser);
  if (library) return library;
  library = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('../vendor/zxing-browser.min.js', import.meta.url).href;
    script.onload = () => resolve(window.ZXingBrowser);
    script.onerror = () => {
      library = null;
      script.remove();
      reject(Error('Не успяхме да заредим скенера. Въведи баркода ръчно.'));
    };
    document.head.append(script);
  });
  return library;
}
/** Lifecycle owner: always stop tracks on close/navigation, including pending permission races. */
export class Scanner {
  constructor() {
    this.controls = null;
    this.stream = null;
    this.generation = 0;
  }
  stop() {
    this.generation++;
    this.controls?.stop();
    this.controls = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
  async start(video, onResult) {
    this.stop();
    const generation = this.generation;
    const lib = await loadLibrary();
    if (generation !== this.generation) return;
    if (!navigator.mediaDevices?.getUserMedia)
      throw Error('Камерата не е достъпна тук. Използвай снимка на баркода или го въведи ръчно.');
    const reader = new lib.BrowserMultiFormatReader();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false,
    });
    if (generation !== this.generation) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    this.stream = stream;
    try {
      const controls = await reader.decodeFromStream(stream, video, (result, error, c) => {
        if (result && generation === this.generation) {
          c.stop();
          this.stop();
          onResult(result.getText());
        }
      });
      if (generation !== this.generation) controls.stop();
      else this.controls = controls;
    } catch (error) {
      this.stop();
      throw error;
    }
  }
  async image(file) {
    if (!file || !file.type.startsWith('image/') || file.size > 12_000_000)
      throw Error('Избери снимка до 12 MB.');
    const lib = await loadLibrary(),
      url = URL.createObjectURL(file);
    try {
      return (await new lib.BrowserMultiFormatReader().decodeFromImageUrl(url)).getText();
    } catch {
      throw Error('Не разчетохме баркода. Снимай отблизо на светло или въведи цифрите.');
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
