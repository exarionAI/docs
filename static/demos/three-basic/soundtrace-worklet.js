// soundtrace-worklet.js — drain pump for the ST (single-threaded wasm) fallback.
//
// In MT mode the wasm-side emscripten audio-worklet entry point runs
// exaRenderSound directly on the audio thread, so this file is not needed.
// ST builds have no audio-worklet entry point inside the wasm (emscripten's
// wasm_workers depends on pthread mutexes), so the main thread renders into
// a SAB ring and this worklet simply drains it on the audio thread.
//
// Ring protocol:
//   ring : Float32Array view over a SharedArrayBuffer — interleaved samples,
//          wrapped circularly.
//   state: Int32Array[2] = [writeIdx, readIdx] (sample units, 0 .. ringSamples-1).
//   writeIdx = updated by main, readIdx = updated by worklet. Atomics keep it
//   thread-safe.

class SoundTraceNodeProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ring = null;
    this.state = null;
    this.ringSize = 0;
    this.channels = 2;
    this.underruns = 0;

    this.port.onmessage = (ev) => {
      const d = ev.data;
      if (d && d.type === 'setup') {
        this.ring = new Float32Array(d.ringBuf);
        this.state = new Int32Array(d.stateBuf);
        this.ringSize = this.ring.length;
        this.channels = d.channels | 0 || 2;
      }
    };
  }

  process(_inputs, outputs) {
    if (!this.ring) return true;
    const out = outputs[0];
    if (!out || out.length === 0) return true;

    const frames = out[0].length;
    const ch = this.channels;
    const size = this.ringSize;

    const writeIdx = Atomics.load(this.state, 0);
    let readIdx = Atomics.load(this.state, 1);

    const avail = (writeIdx - readIdx + size) % size;
    const need = frames * ch;

    if (avail < need) {
      // underrun — fill with silence and notify the main thread occasionally
      // (every 32 underruns).
      for (let c = 0; c < ch; c++) out[c].fill(0);
      this.underruns++;
      if ((this.underruns & 31) === 1) {
        this.port.postMessage({ type: 'underrun', count: this.underruns });
      }
      return true;
    }

    for (let f = 0; f < frames; f++) {
      for (let c = 0; c < ch; c++) {
        out[c][f] = this.ring[(readIdx + c) % size];
      }
      readIdx = (readIdx + ch) % size;
    }
    Atomics.store(this.state, 1, readIdx);
    return true;
  }
}

registerProcessor('soundtrace-node', SoundTraceNodeProcessor);
