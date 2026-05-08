/**
 * Patches @discord-player/ffmpeg, discord-player, and @discord-player/opus
 * for Node.js v24 compatibility and maximum audio quality.
 *
 * Fixes:
 * 1. @discord-player/ffmpeg's FFmpeg class uses a Duplex proxy pattern that breaks
 *    on Node.js v24 (overriding _readableState/_writableState and copying methods).
 *    Replaced with a proper Duplex implementation that pipes to/from child process.
 *
 * 2. discord-player's createFFmpegStream passes `-ss undefined` to ffmpeg when
 *    no seek option is provided, because `!Number.isNaN(undefined)` is true.
 *    Fixed with a null check before the isNaN check.
 *
 * 3. @discord-player/opus caps Opus encoder bitrate at 128kbps in setBitrate().
 *    Opus supports up to 510kbps for stereo. Raised cap to 512kbps for max quality.
 *
 * Run: node scripts/patch-ffmpeg.js
 */

const fs = require('fs');
const path = require('path');

// Patch 1: @discord-player/ffmpeg
const ffmpegDistPath = path.join(__dirname, '..', 'node_modules', '@discord-player', 'ffmpeg', 'dist', 'index.js');
if (fs.existsSync(ffmpegDistPath)) {
    let content = fs.readFileSync(ffmpegDistPath, 'utf8');

    // Check if already patched
    if (content.includes('_outputEnded')) {
        console.log('[patch] @discord-player/ffmpeg already patched');
    } else {
        // Replace the broken constructor
        const oldConstructor = `constructor(options = {}) {
    super(options);
    /**
     * Current FFmpeg process
     */
    __publicField(this, "process");
    this.process = _FFmpeg.spawn(options);
    const EVENTS = {
      readable: this._reader,
      data: this._reader,
      end: this._reader,
      unpipe: this._reader,
      finish: this._writer,
      drain: this._writer
    };
    this._readableState = this._reader._readableState;
    this._writableState = this._writer._writableState;
    this._copy(["write", "end"], this._writer);
    this._copy(["read", "setEncoding", "pipe", "unpipe"], this._reader);
    for (const method of [
      "on",
      "once",
      "removeListener",
      "removeAllListeners",
      "listeners"
    ]) {
      this[method] = (ev, fn) => (
        // @ts-expect-error
        EVENTS[ev] ? (
          // @ts-expect-error
          EVENTS[ev][method](ev, fn)
        ) : (
          // @ts-expect-error
          import_node_stream.Duplex.prototype[method].call(this, ev, fn)
        )
      );
    }
    const processError = /* @__PURE__ */ __name((error) => this.emit("error", error), "processError");
    this._reader.on("error", processError);
    this._writer.on("error", processError);
  }`;

        const newConstructor = `constructor(options = {}) {
    super({ readableHighWaterMark: 1024 * 512, writableHighWaterMark: 1024 * 512 });
    __publicField(this, "process");
    const args = options.args ? [...options.args] : [];
    if (!args.includes('-i')) args.unshift('-i', '-');
    args.push('pipe:1');
    const resolved = _FFmpeg.resolve();
    this.process = (0, import_node_child_process.spawn)(resolved.command, args, {
      windowsHide: true,
      shell: options.shell || false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this._outputEnded = false;
    this.process.stdout.on('data', (chunk) => {
      if (!this.push(chunk)) this.process.stdout.pause();
    });
    this.process.stdout.on('end', () => {
      this._outputEnded = true;
      this.push(null);
    });
    this.process.stdout.on('error', () => {});
    this.process.stdin.on('error', () => {});
    this.process.stderr.on('data', () => {});
    this.process.on('close', () => {
      if (!this._outputEnded) { this._outputEnded = true; this.push(null); }
    });
  }`;

        // Replace old methods
        const oldMethods = `get _reader() {
    return this.process.stdout;
  }
  get _writer() {
    return this.process.stdin;
  }
  _copy(methods, target) {
    for (const method of methods) {
      this[method] = target[method].bind(target);
    }
  }
  _destroy(err, cb) {
    this._cleanup();
    if (cb) return cb(err);
  }
  _final(cb) {
    this._cleanup();
    cb();
  }
  _cleanup() {
    if (this.process) {
      this.once("error", () => {
      });
      this.process.kill("SIGKILL");
      this.process = null;
    }
  }`;

        const newMethods = `_read() {
    if (this.process?.stdout) this.process.stdout.resume();
  }
  _write(chunk, encoding, callback) {
    if (!this.process?.stdin?.writable) { callback(); return; }
    const ok = this.process.stdin.write(chunk, encoding);
    if (ok) callback(); else this.process.stdin.once('drain', callback);
  }
  _final(callback) {
    if (this.process?.stdin?.writable) this.process.stdin.end(() => callback());
    else callback();
  }
  _destroy(err, cb) {
    if (this.process) { this.process.kill("SIGKILL"); this.process = null; }
    cb(err);
  }
  get _reader() { return this.process?.stdout; }
  get _writer() { return this.process?.stdin; }`;

        if (content.includes(oldConstructor)) {
            content = content.replace(oldConstructor, newConstructor);
            content = content.replace(oldMethods, newMethods);
            fs.writeFileSync(ffmpegDistPath, content);
            console.log('[patch] @discord-player/ffmpeg patched successfully');
        } else {
            console.log('[patch] @discord-player/ffmpeg constructor pattern not found (may already be patched or version changed)');
        }
    }
}

// Patch 2: discord-player seek bug
const dpDistPath = path.join(__dirname, '..', 'node_modules', 'discord-player', 'dist', 'index.js');
if (fs.existsSync(dpDistPath)) {
    let content = fs.readFileSync(dpDistPath, 'utf8');

    const oldSeekCheck = 'if (!Number.isNaN(options.seek)) args.unshift("-ss", String(options.seek));';
    const newSeekCheck = 'if (options.seek != null && !Number.isNaN(options.seek)) args.unshift("-ss", String(options.seek));';

    if (content.includes(newSeekCheck)) {
        console.log('[patch] discord-player seek bug already patched');
    } else if (content.includes(oldSeekCheck)) {
        content = content.replace(oldSeekCheck, newSeekCheck);
        fs.writeFileSync(dpDistPath, content);
        console.log('[patch] discord-player seek bug patched successfully');
    } else {
        console.log('[patch] discord-player seek pattern not found');
    }
}

// Patch 3: @discord-player/opus — fix setBitrate/setFEC/setPLP for mediaplex compatibility
// mediaplex's OpusEncoder only has a native setBitrate(), no applyEncoderCTL/encoderCTL.
// Also raises the bitrate cap from 128kbps to 512kbps for maximum quality.
const opusDistPath = path.join(__dirname, '..', 'node_modules', '@discord-player', 'opus', 'dist', 'index.js');
if (fs.existsSync(opusDistPath)) {
    let content = fs.readFileSync(opusDistPath, 'utf8');

    // Check if already patched (look for our mediaplex-compatible setBitrate)
    if (content.includes('// mediaplex-compat: patched')) {
        console.log('[patch] @discord-player/opus already patched for mediaplex');
    } else {
        // Replace setBitrate — add mediaplex lowercase applyEncoderCtl support + raise cap
        const oldSetBitrate = `setBitrate(bitrate) {
    (this.encoder.applyEncoderCTL || this.encoder.encoderCTL).apply(
      this.encoder,
      [CTL.BITRATE, Math.min(128e3, Math.max(16e3, bitrate))]
    );
  }`;
        const newSetBitrate = `setBitrate(bitrate) {
    // mediaplex-compat: patched (supports applyEncoderCtl lowercase from mediaplex)
    const clamped = Math.min(512e3, Math.max(16e3, bitrate));
    const ctl = this.encoder.applyEncoderCTL || this.encoder.encoderCTL || this.encoder.applyEncoderCtl;
    if (ctl) { ctl.call(this.encoder, CTL.BITRATE, clamped); }
    else if (this.encoder.setBitrate) { this.encoder.setBitrate(clamped); }
  }`;

        // Replace setFEC — add mediaplex lowercase support
        const oldSetFEC = `setFEC(enabled) {
    (this.encoder.applyEncoderCTL || this.encoder.encoderCTL).apply(
      this.encoder,
      [CTL.FEC, enabled ? 1 : 0]
    );
  }`;
        const newSetFEC = `setFEC(enabled) {
    const ctl = this.encoder.applyEncoderCTL || this.encoder.encoderCTL || this.encoder.applyEncoderCtl;
    if (ctl) { ctl.call(this.encoder, CTL.FEC, enabled ? 1 : 0); }
  }`;

        // Replace setPLP — add mediaplex lowercase support
        const oldSetPLP = `setPLP(percentage) {
    (this.encoder.applyEncoderCTL || this.encoder.encoderCTL).apply(
      this.encoder,
      [CTL.PLP, Math.min(100, Math.max(0, percentage * 100))]
    );
  }`;
        const newSetPLP = `setPLP(percentage) {
    const ctl = this.encoder.applyEncoderCTL || this.encoder.encoderCTL || this.encoder.applyEncoderCtl;
    if (ctl) { ctl.call(this.encoder, CTL.PLP, Math.min(100, Math.max(0, percentage * 100))); }
  }`;

        let patched = false;
        if (content.includes(oldSetBitrate)) {
            content = content.replace(oldSetBitrate, newSetBitrate);
            patched = true;
        }
        if (content.includes(oldSetFEC)) {
            content = content.replace(oldSetFEC, newSetFEC);
            patched = true;
        }
        if (content.includes(oldSetPLP)) {
            content = content.replace(oldSetPLP, newSetPLP);
            patched = true;
        }

        if (patched) {
            fs.writeFileSync(opusDistPath, content);
            console.log('[patch] @discord-player/opus patched for mediaplex + 512kbps bitrate');
        } else {
            console.log('[patch] @discord-player/opus patterns not found (version may differ)');
        }
    }
}

console.log('[patch] Done');
