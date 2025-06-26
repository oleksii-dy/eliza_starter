// Markdown Components
// Extracted from bundled code

// U31 - Lines 21291-21439
class U31 {
class U31 {
  options;
  log;
  throttledLog;
  isUnmounted;
  lastOutput;
  lastOutputHeight;
  container;
  rootNode = null;
  fullStaticOutput;
  exitPromise;
  restoreConsole;
  unsubscribeResize;
  constructor(A) {
      this.options = A;
      if (TP1(this), this.log = dhA.create(A.stdout), this.throttledLog = A.debug ? this.log : r81(this.log, void 0, {
              leading: !0,
              trailing: !0
          }), this.isUnmounted = !1, this.lastOutput = "", this.lastOutputHeight = 0, this.fullStaticOutput = "", this.unsubscribeExit = mvA(this.unmount, {
              alwaysLast: !1
          }), A.patchConsole) this.patchConsole();
      if (!Bb) A.stdout.on("resize", this.resized), this.unsubscribeResize = () => {
          A.stdout.off("resize", this.resized)
      };
      if (this.rootNode = vB1("ink-root"), this.rootNode.onComputeLayout = this.calculateLayout, this.rootNode.onRender = A.debug ? this.onRender : r81(this.onRender, 32, {
              leading: !0,
              trailing: !0
          }), this.rootNode.onImmediateRender = this.onRender, this.container = jS.createContainer(this.rootNode, 0, null, !1, null, "id", () => {}, null), process.env.DEV === "true") jS.injectIntoDevTools({
          bundleType: 0,
          version: "16.13.1",
          rendererPackageName: "ink"
      })
  }
  resized = () => {
      this.calculateLayout(), this.onRender(!0)
  };
  resolveExitPromise = () => {};
  rejectExitPromise = () => {};
  unsubscribeExit = () => {};
  calculateLayout = () => {
let A: any = this.options.stdout.columns || 80;
      if (!this.rootNode) return;
      this.rootNode.yogaNode.setWidth(A), this.rootNode.yogaNode.calculateLayout(void 0, void 0, SB1.DIRECTION_LTR)
  };
  setTheme(A) {
      this.options.theme = A
  }
  onRender(A = !1) {
      if (this.isUnmounted) return;
      if (!this.rootNode) return;
      let {
          output: B,
          outputHeight: Q,
          staticOutput: I
      } = _hA(this.rootNode, this.options.theme), G = I && I !== `
`;
      if (this.options.debug) {
          if (G) this.fullStaticOutput += I;
          this.options.stdout.write(this.fullStaticOutput + B);
          return
      }
      if (Bb) {
          if (G) this.options.stdout.write(I);
          this.lastOutput = B, this.lastOutputHeight = Q;
          return
      }
      if (G) this.fullStaticOutput += I;
      if (Q >= this.options.stdout.rows || this.lastOutputHeight >= this.options.stdout.rows) {
          if (this.options.onFlicker) this.options.onFlicker();
          this.options.stdout.write(BL.clearTerminal + this.fullStaticOutput + B + `
`), this.lastOutput = B, this.lastOutputHeight = Q, this.log.updateLineCount(B + `
`);
          return
      }
      if (A) {
          this.options.stdout.write(BL.clearTerminal + this.fullStaticOutput + B + `
`), this.lastOutput = B, this.lastOutputHeight = Q, this.log.updateLineCount(B + `
`);
          return
      }
      if (G) this.log.clear(), this.options.stdout.write(I), this.throttledLog(B);
      if (!G && B !== this.lastOutput) this.throttledLog(B);
      this.lastOutput = B, this.lastOutputHeight = Q
  }
  render(A) {
let B: any = EmA.default.createElement(E31, {
          initialTheme: this.options.theme,
          stdin: this.options.stdin,
          stdout: this.options.stdout,
          stderr: this.options.stderr,
          writeToStdout: this.writeToStdout,
          writeToStderr: this.writeToStderr,
          exitOnCtrlC: this.options.exitOnCtrlC,
          onExit: this.unmount
      }, A);
      jS.updateContainer(B, this.container, null, wmA)
  }
  writeToStdout(A) {
      if (this.isUnmounted) return;
      if (this.options.debug) {
          this.options.stdout.write(A + this.fullStaticOutput + this.lastOutput);
          return
      }
      if (Bb) {
          this.options.stdout.write(A);
          return
      }
      this.log.clear(), this.options.stdout.write(A), this.log(this.lastOutput)
  }
  writeToStderr(A) {
      if (this.isUnmounted) return;
      if (this.options.debug) {
          this.options.stderr.write(A), this.options.stdout.write(this.fullStaticOutput + this.lastOutput);
          return
      }
      if (Bb) {
          this.options.stderr.write(A);
          return
      }
      this.log.clear(), this.options.stderr.write(A), this.log(this.lastOutput)
  }
  unmount(A) {
      if (this.isUnmounted) return;
      if (this.calculateLayout(), this.onRender(), this.unsubscribeExit(), typeof this.restoreConsole === "function") this.restoreConsole();
      if (typeof this.unsubscribeResize === "function") this.unsubscribeResize();
      if (Bb) this.options.stdout.write(this.lastOutput + `
`);
      else if (!this.options.debug) this.log.done();
      if (this.isUnmounted = !0, jS.updateContainer(null, this.container, null, wmA), fS.delete(this.options.stdout), A instanceof Error) this.rejectExitPromise(A);
      else this.resolveExitPromise()
  }
  async waitUntilExit() {
      return this.exitPromise || = new Promise((A, B) => {
          this.resolveExitPromise = A, this.rejectExitPromise = B
      }), this.exitPromise
  }
  clear() {
      if (!Bb && !this.options.debug) this.log.clear()
  }
  patchConsole() {
      if (this.options.debug) return;
      this.restoreConsole = pvA((A, B) => {
          if (A === "stdout") this.writeToStdout(B);
          if (A === "stderr") {
              if (!B.startsWith("The above error occurred")) this.writeToStderr(B)
          }
      })
  }
}


// T5 - Lines 52415-52728
class T5 {
class T5 {
  measuredText;
  selection;
  offset;
  constructor(A, B = 0, Q = 0) {
      this.measuredText = A;
      this.selection = Q;
      this.offset = Math.max(0, Math.min(this.measuredText.text.length, B))
  }
  static fromText(A, B, Q = 0, I = 0) {
      return new T5(new YT2(A, B - 1), Q, I)
  }
  render(A, B, Q) {
      let {
          line: I,
          column: G
      } = this.getPosition();
      return this.measuredText.getWrappedText().map((Z, D, Y) => {
let W: any = Z;
          if (B && D === Y.length - 1) {
let E: any = Math.max(0, Z.length - 6);
              W = B.repeat(E) + Z.slice(E)
          }
          if (I !== D) return W.trimEnd();
let J: any = this.measuredText.displayWidthToStringIndex(W, G),
              F = new Intl.Segmenter("en", {
                  granularity: "grapheme"
              }),
              X = Array.from(F.segment(W)),
              V = "",
              C = A,
              K = "";
          for (let {
                  segment: E,
                  index: N
              } of X) {
let query: any = N + E.length;
              if (q <= J) V += E;
              else if (N < J && q > J) C = E;
              else if (N === J) C = E;
              else K += E
          }
          return V + Q(C) + K.trimEnd()
      }).join(`
`)
  }
  left() {
      if (this.offset === 0) return this;
let A: any = new Intl.Segmenter("en", {
              granularity: "grapheme"
          }),
          B = Array.from(A.segment(this.text.slice(0, this.offset)));
      if (B.length === 0) return new T5(this.measuredText, 0);
let Q: any = B[B.length - 1];
      return new T5(this.measuredText, Q.index)
  }
  right() {
      if (this.offset >= this.text.length) return this;
let B: any = new Intl.Segmenter("en", {
          granularity: "grapheme"
      }).segment(this.text);
      for (let {
              index: Q,
              segment: I
          } of B)
          if (Q >= this.offset) {
let G: any = Q + I.length;
              return new T5(this.measuredText, Math.min(G, this.text.length))
          }
      return this
  }
  up() {
      let {
          line: A,
          column: B
      } = this.getPosition();
      if (A === 0) return this;
let Q: any = this.measuredText.getWrappedText()[A - 1];
      if (!Q) return this;
      if (B > Q.length) {
let G: any = this.getOffset({
              line: A - 1,
              column: Q.length
          });
          return new T5(this.measuredText, G, 0)
      }
let I: any = this.getOffset({
          line: A - 1,
          column: B
      });
      return new T5(this.measuredText, I, 0)
  }
  down() {
      let {
          line: A,
          column: B
      } = this.getPosition();
      if (A >= this.measuredText.lineCount - 1) return this;
let Q: any = this.measuredText.getWrappedText()[A + 1];
      if (!Q) return this;
      if (B > Q.length) {
let G: any = this.getOffset({
              line: A + 1,
              column: Q.length
          });
          return new T5(this.measuredText, G, 0)
      }
let I: any = this.getOffset({
          line: A + 1,
          column: B
      });
      return new T5(this.measuredText, I, 0)
  }
  startOfLine() {
      let {
          line: A
      } = this.getPosition();
      return new T5(this.measuredText, this.getOffset({
          line: A,
          column: 0
      }), 0)
  }
  firstNonBlankInLine() {
      let {
          line: A
      } = this.getPosition(), Q = (this.measuredText.getWrappedText()[A] || "").match(/^\s*\S/), I = Q ? .index ? Q.index + Q[0].length - 1 : 0, G = this.getOffset({
          line: A,
          column: I
      });
      return new T5(this.measuredText, G, 0)
  }
  endOfLine() {
      let {
          line: A
      } = this.getPosition(), B = this.measuredText.getLineLength(A), Q = this.getOffset({
          line: A,
          column: B
      });
      return new T5(this.measuredText, Q, 0)
  }
  findLogicalLineStart(A = this.offset) {
let B: any = this.text.lastIndexOf(`
`, A - 1);
      return B === -1 ? 0 : B + 1
  }
  findLogicalLineEnd(A = this.offset) {
let B: any = this.text.indexOf(`
`, A);
      return B === -1 ? this.text.length : B
  }
  getLogicalLineBounds() {
      return {
          start: this.findLogicalLineStart(),
          end: this.findLogicalLineEnd()
      }
  }
  createCursorWithColumn(A, B, Q) {
let I: any = B - A,
          G = Math.min(Q, I);
      return new T5(this.measuredText, A + G, 0)
  }
  endOfLogicalLine() {
      return new T5(this.measuredText, this.findLogicalLineEnd(), 0)
  }
  startOfLogicalLine() {
      return new T5(this.measuredText, this.findLogicalLineStart(), 0)
  }
  firstNonBlankInLogicalLine() {
      let {
          start: A,
          end: B
      } = this.getLogicalLineBounds(), I = this.text.slice(A, B).match(/\S/), G = A + (I ? .index ? ? 0);
      return new T5(this.measuredText, G, 0)
  }
  upLogicalLine() {
      let {
          start: A
      } = this.getLogicalLineBounds();
      if (A === 0) return new T5(this.measuredText, 0, 0);
let B: any = this.offset - A,
          Q = A - 1,
          I = this.findLogicalLineStart(Q);
      return this.createCursorWithColumn(I, Q, B)
  }
  downLogicalLine() {
      let {
          start: A,
          end: B
      } = this.getLogicalLineBounds();
      if (B >= this.text.length) return new T5(this.measuredText, this.text.length, 0);
let Q: any = this.offset - A,
          I = B + 1,
          G = this.findLogicalLineEnd(I);
      return this.createCursorWithColumn(I, G, Q)
  }
  nextWord() {
let A: any = this;
      while (A.isOverWordChar() && !A.isAtEnd()) A = A.right();
      while (!A.isOverWordChar() && !A.isAtEnd()) A = A.right();
      return A
  }
  endOfWord() {
let A: any = this;
      if (A.isOverWordChar() && (!A.right().isOverWordChar() || A.right().isAtEnd())) return A = A.right(), A.endOfWord();
      if (!A.isOverWordChar()) A = A.nextWord();
      while (A.right().isOverWordChar() && !A.isAtEnd()) A = A.right();
      return A
  }
  prevWord() {
let A: any = this;
      if (!A.left().isOverWordChar()) A = A.left();
      while (!A.isOverWordChar() && !A.isAtStart()) A = A.left();
      if (A.isOverWordChar())
          while (A.left().isOverWordChar() && !A.isAtStart()) A = A.left();
      return A
  }
  nextWORD() {
let A: any = this;
      while (!A.isOverWhitespace() && !A.isAtEnd()) A = A.right();
      while (A.isOverWhitespace() && !A.isAtEnd()) A = A.right();
      return A
  }
  endOfWORD() {
let A: any = this;
      if (!A.isOverWhitespace() && (A.right().isOverWhitespace() || A.right().isAtEnd())) return A = A.right(), A.endOfWORD();
      if (A.isOverWhitespace()) A = A.nextWORD();
      while (!A.right().isOverWhitespace() && !A.isAtEnd()) A = A.right();
      return A
  }
  prevWORD() {
let A: any = this;
      if (A.left().isOverWhitespace()) A = A.left();
      while (A.isOverWhitespace() && !A.isAtStart()) A = A.left();
      if (!A.isOverWhitespace())
          while (!A.left().isOverWhitespace() && !A.isAtStart()) A = A.left();
      return A
  }
  modifyText(A, B = "") {
let Q: any = this.offset,
          I = A.offset,
          G = this.text.slice(0, Q) + B + this.text.slice(I);
      return T5.fromText(G, this.columns, Q + B.length)
  }
  insert(A) {
      return this.modifyText(this, A)
  }
  del() {
      if (this.isAtEnd()) return this;
      return this.modifyText(this.right())
  }
  backspace() {
      if (this.isAtStart()) return this;
      return this.left().modifyText(this)
  }
  deleteToLineStart() {
      return this.startOfLine().modifyText(this)
  }
  deleteToLineEnd() {
      if (this.text[this.offset] === `
`) return this.modifyText(this.right());
      return this.modifyText(this.endOfLine())
  }
  deleteToLogicalLineEnd() {
      if (this.text[this.offset] === `
`) return this.modifyText(this.right());
      return this.modifyText(this.endOfLogicalLine())
  }
  deleteWordBefore() {
      if (this.isAtStart()) return this;
      return this.prevWord().modifyText(this)
  }
  deleteWordAfter() {
      if (this.isAtEnd()) return this;
      return this.modifyText(this.nextWord())
  }
  isOverWordChar() {
let A: any = this.text[this.offset] ? ? "";
      return /\w/.test(A)
  }
  isOverWhitespace() {
let A: any = this.text[this.offset] ? ? "";
      return /\s/.test(A)
  }
  equals(A) {
      return this.offset === A.offset && this.measuredText === A.measuredText
  }
  isAtStart() {
      return this.offset === 0
  }
  isAtEnd() {
      return this.offset === this.text.length
  }
  startOfFirstLine() {
      return new T5(this.measuredText, 0, 0)
  }
  startOfLastLine() {
let A: any = this.text.lastIndexOf(`
`);
      if (A === -1) return this.startOfLine();
      return new T5(this.measuredText, A + 1, 0)
  }
  get text() {
      return this.measuredText.text
  }
  get columns() {
      return this.measuredText.columns + 1
  }
  getPosition() {
      return this.measuredText.getPositionFromOffset(this.offset)
  }
  getOffset(A) {
      return this.measuredText.getOffsetFromPosition(A)
  }
}


// k0A - Lines 57337-57346
class k0A {
class k0A {
  alreadyRendered = {};
  async renderStatic(A) {
      for (let B in A)
          if (!this.alreadyRendered[B] && A[B]) await aA1(A[B]), this.alreadyRendered[B] = !0
  }
  reset() {
      this.alreadyRendered = {}
  }
}


export {
  U31,
  T5,
  k0A
};
