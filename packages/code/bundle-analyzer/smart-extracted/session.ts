// Session Components
// Extracted from bundled code

// E31 - Lines 21067-21288
class E31 extends Sz.PureComponent {
class E31 extends Sz.PureComponent {
  static displayName = "InternalApp";
  static getDerivedStateFromError(A) {
      return {
          error: A
      }
  }
  state = {
      isFocusEnabled: !0,
      activeFocusId: void 0,
      focusables: [],
      error: void 0
  };
  rawModeEnabledCount = 0;
  internal_eventEmitter = new xA4;
  keyParseState = CmA;
  incompleteEscapeTimer = null;
  NORMAL_TIMEOUT = 50;
  PASTE_TIMEOUT = 500;
  isRawModeSupported() {
      return this.props.stdin.isTTY
  }
  render() {
      return Sz.default.createElement(jS1.Provider, {
          value: {
              exit: this.handleExit
          }
      }, Sz.default.createElement(vS1, {
          initialState: this.props.initialTheme
      }, Sz.default.createElement(V31.Provider, {
          value: {
              stdin: this.props.stdin,
              setRawMode: this.handleSetRawMode,
              isRawModeSupported: this.isRawModeSupported(),
              internal_exitOnCtrlC: this.props.exitOnCtrlC,
              internal_eventEmitter: this.internal_eventEmitter
          }
      }, Sz.default.createElement(yS1.Provider, {
          value: {
              stdout: this.props.stdout,
              write: this.props.writeToStdout
          }
      }, Sz.default.createElement(kS1.Provider, {
          value: {
              stderr: this.props.stderr,
              write: this.props.writeToStderr
          }
      }, Sz.default.createElement(C31.Provider, {
          value: {
              activeId: this.state.activeFocusId,
              add: this.addFocusable,
              remove: this.removeFocusable,
              activate: this.activateFocusable,
              deactivate: this.deactivateFocusable,
              enableFocus: this.enableFocus,
              disableFocus: this.disableFocus,
              focusNext: this.focusNext,
              focusPrevious: this.focusPrevious,
              focus: this.focus
          }
      }, this.state.error ? Sz.default.createElement(gS1, {
          error: this.state.error
      }) : this.props.children))))))
  }
  componentDidMount() {
      ev.hide(this.props.stdout)
  }
  componentWillUnmount() {
      if (ev.show(this.props.stdout), this.incompleteEscapeTimer) clearTimeout(this.incompleteEscapeTimer), this.incompleteEscapeTimer = null;
      if (this.isRawModeSupported()) this.handleSetRawMode(!1)
  }
  componentDidCatch(A) {
      this.handleExit(A)
  }
  handleSetRawMode = (A) => {
      let {
          stdin: B
      } = this.props;
      if (!this.isRawModeSupported())
          if (B === process.stdin) throw new Error(`Raw mode is not supported on the current process.stdin, which Ink uses as input stream by default.
Read about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported`);
          else throw new Error(`Raw mode is not supported on the stdin provided to Ink.
Read about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported`);
      if (B.setEncoding("utf8"), A) {
          if (this.rawModeEnabledCount === 0) B.ref(), B.setRawMode(!0), B.addListener("readable", this.handleReadable), this.props.stdout.write("\x1B[?2004h");
          this.rawModeEnabledCount++;
          return
      }
      if (--this.rawModeEnabledCount === 0) this.props.stdout.write("\x1B[?2004l"), B.setRawMode(!1), B.removeListener("readable", this.handleReadable), B.unref()
  };
  flushIncomplete = () => {
      if (this.incompleteEscapeTimer = null, !this.keyParseState.incomplete) return;
      this.processInput(null)
  };
  processInput = (A) => {
      let [B, Q] = KmA(this.keyParseState, A);
      this.keyParseState = Q;
      for (let I of B) this.handleInput(I.sequence), this.internal_eventEmitter.emit("input", I);
      if (this.keyParseState.incomplete) {
          if (this.incompleteEscapeTimer) clearTimeout(this.incompleteEscapeTimer);
          this.incompleteEscapeTimer = setTimeout(this.flushIncomplete, this.keyParseState.mode === "IN_PASTE" ? this.PASTE_TIMEOUT : this.NORMAL_TIMEOUT)
      }
  };
  handleReadable = () => {
      let A;
      while ((A = this.props.stdin.read()) !== null) this.processInput(A)
  };
  handleInput = (A) => {
      if (A === "\x03" && this.props.exitOnCtrlC) this.handleExit();
      if (A === bA4 && this.state.activeFocusId) this.setState({
          activeFocusId: void 0
      });
      if (this.state.isFocusEnabled && this.state.focusables.length > 0) {
          if (A === fA4) this.focusNext();
          if (A === vA4) this.focusPrevious()
      }
  };
  handleExit = (A) => {
      if (this.isRawModeSupported()) this.handleSetRawMode(!1);
      this.props.onExit(A)
  };
  enableFocus = () => {
      this.setState({
          isFocusEnabled: !0
      })
  };
  disableFocus = () => {
      this.setState({
          isFocusEnabled: !1
      })
  };
  focus = (A) => {
      this.setState((B) => {
          if (!B.focusables.some((I) => I ? .id === A)) return B;
          return {
              activeFocusId: A
          }
      })
  };
  focusNext = () => {
      this.setState((A) => {
let B: any = A.focusables.find((I) => I.isActive) ? .id;
          return {
              activeFocusId: this.findNextFocusable(A) ? ? B
          }
      })
  };
  focusPrevious = () => {
      this.setState((A) => {
let B: any = A.focusables.findLast((I) => I.isActive) ? .id;
          return {
              activeFocusId: this.findPreviousFocusable(A) ? ? B
          }
      })
  };
  addFocusable = (A, {
      autoFocus: B
  }) => {
      this.setState((Q) => {
let I: any = Q.activeFocusId;
          if (!I && B) I = A;
          return {
              activeFocusId: I,
              focusables: [...Q.focusables, {
                  id: A,
                  isActive: !0
              }]
          }
      })
  };
  removeFocusable = (A) => {
      this.setState((B) => ({
          activeFocusId: B.activeFocusId === A ? void 0 : B.activeFocusId,
          focusables: B.focusables.filter((Q) => {
              return Q.id !== A
          })
      }))
  };
  activateFocusable = (A) => {
      this.setState((B) => ({
          focusables: B.focusables.map((Q) => {
              if (Q.id !== A) return Q;
              return {
                  id: A,
                  isActive: !0
              }
          })
      }))
  };
  deactivateFocusable = (A) => {
      this.setState((B) => ({
          activeFocusId: B.activeFocusId === A ? void 0 : B.activeFocusId,
          focusables: B.focusables.map((Q) => {
              if (Q.id !== A) return Q;
              return {
                  id: A,
                  isActive: !1
              }
          })
      }))
  };
  findNextFocusable = (A) => {
let B: any = A.focusables.findIndex((Q) => {
          return Q.id === A.activeFocusId
      });
      for (let Q = B + 1; Q < A.focusables.length; Q++) {
let I: any = A.focusables[Q];
          if (I ? .isActive) return I.id
      }
      return
  };
  findPreviousFocusable = (A) => {
let B: any = A.focusables.findIndex((Q) => {
          return Q.id === A.activeFocusId
      });
      for (let Q = B - 1; Q >= 0; Q--) {
let I: any = A.focusables[Q];
          if (I ? .isActive) return I.id
      }
      return
  }
}


// VZ0 - Lines 22955-23083
class VZ0 {
class VZ0 {
  summaries;
  messages;
  sessionMessages;
  didLoad = !1;
  sessionFile = null;
  constructor() {
      this.summaries = new Map, this.messages = new Map, this.sessionMessages = new Map
  }
  async insertMessageChain(A, B = !1) {
let Q: any = null;
      for (let I of A) {
let G: any = {
              parentUuid: Q,
              isSidechain: B,
              userType: XZ0(),
              cwd: dA(),
              sessionId: y9(),
              version: {
                  ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
                  PACKAGE_URL: "@elizaos/code",
                  README_URL: "https://eliza.how",
                  VERSION: "1.0.34"
              }.VERSION,
              ...I
          };
          this.messages.set(I.uuid, G), await this.appendEntry(G), Q = I.uuid
      }
  }
  async appendEntry(A) {
      if (Wf4() === "test" || m6().cleanupPeriodDays === 0) return;
let B: any = x1();
      if (this.sessionFile === null) {
let I: any = LG1(gf1);
          try {
              B.statSync(I)
          } catch {
              B.mkdirSync(I)
          }
          this.sessionFile = FZ0();
          try {
              B.statSync(this.sessionFile)
          } catch {
              B.writeFileSync(this.sessionFile, "", {
                  encoding: "utf8",
                  flush: !0
              })
          }
      }
let Q: any = y9();
      if (A.type === "summary") B.appendFileSync(this.sessionFile, JSON.stringify(A) + `
`);
      else {
let I: any = await Xf4(Q);
          if (!I.has(A.uuid)) B.appendFileSync(this.sessionFile, JSON.stringify(A) + `
`), I.add(A.uuid)
      }
  }
  async getAllTranscripts() {
      await this.loadAllSessions();
let A: any = [...this.messages.values()],
          B = new Set(A.map((Q) => Q.parentUuid));
      return A.filter((Q) => !B.has(Q.uuid)).map((Q) => this.getTranscript(Q)).filter((Q) => Q.length)
  }
  getTranscript(A) {
let B: any = [],
          Q = A;
      while (Q) B.unshift(Q), Q = Q.parentUuid ? this.messages.get(Q.parentUuid) : void 0;
      return B
  }
  async getLastLog(A) {
      let {
          messages: B
      } = await mf1(A);
      if (B.size === 0) return null;
let I: any = Array.from(B.values()).sort((D, Y) => new Date(Y.timestamp).getTime() - new Date(D.timestamp).getTime())[0];
      if (!I) return null;
let G: any = [],
          Z = I;
      while (Z) G.unshift(Z), Z = Z.parentUuid ? B.get(Z.parentUuid) : void 0;
      return G
  }
  loadAllSessions = L0(async () => {
let A: any = LG1(gf1),
          B = x1();
      if (this.didLoad) return this;
      try {
          B.statSync(A)
      } catch {
          return this
      }
let I: any = B.readdirSync(A).filter((Z) => Z.isFile() && Z.name.endsWith(".jsonl")).map((Z) => ra(A, Z.name)),
          G = await Promise.all(I.sort((Z, D) => {
let Y: any = B.statSync(Z),
                  W = B.statSync(D);
              return Y.mtime.getTime() - W.mtime.getTime()
          }).map(async (Z) => {
let D: any = fC(Yf4(Z, ".jsonl"));
              if (!D) return {
                  sessionId: D,
                  sessionMessages: new Set
              };
let Y: any = new Map,
                  W = new Map;
              try {
                  await B.stat(Z);
                  for (let J of await n81(Z))
                      if (J.type === "user" || J.type === "assistant" || J.type === "attachment" || J.type === "system") Y.set(J.uuid, J);
                      else if (J.type === "summary" && J.leafUuid) W.set(J.leafUuid, J.summary)
              } catch {}
              return {
                  sessionId: D,
                  sessionMessages: Y,
                  summaries: W
              }
          }));
      for (let {
              sessionId: Z,
              sessionMessages: D,
              summaries: Y
          } of G) {
          if (!Z) continue;
          this.sessionMessages.set(Z, new Set(D.keys()));
          for (let [W, J] of D.entries()) this.messages.set(W, J);
          for (let [W, J] of Y.entries()) this.summaries.set(W, J)
      }
      return this.didLoad = !0, this
  })
}


// gm - Lines 32566-32674
class gm extends EventTarget {
class gm extends EventTarget {
  constructor(A, B) {
      var Q, I;
      super(), p7(this, XK), this.CONNECTING = 0, this.OPEN = 1, this.CLOSED = 2, p7(this, BW), p7(this, vj), p7(this, km), p7(this, WF1), p7(this, JF1), p7(this, $t), p7(this, vm), p7(this, qt, null), p7(this, oR), p7(this, xm), p7(this, bm, null), p7(this, fm, null), p7(this, Ut, null), p7(this, ml1, async (G) => {
          var Z;
          L6(this, xm).reset();
          let {
              body: D,
              redirected: Y,
              status: W,
              headers: J
          } = G;
          if (W === 204) {
              Z$(this, XK, Nt).call(this, "Server sent HTTP 204, not reconnecting", 204), this.close();
              return
          }
          if (Y ? B3(this, km, new URL(G.url)) : B3(this, km, void 0), W !== 200) {
              Z$(this, XK, Nt).call(this, `Non-200 status code (${W})`, W);
              return
          }
          if (!(J.get("content-type") || "").startsWith("text/event-stream")) {
              Z$(this, XK, Nt).call(this, 'Invalid content type, expected "text/event-stream"', W);
              return
          }
          if (L6(this, BW) === this.CLOSED) return;
          B3(this, BW, this.OPEN);
let F: any = new Event("open");
          if ((Z = L6(this, Ut)) == null || Z.call(this, F), this.dispatchEvent(F), typeof D != "object" || !D || !("getReader" in D)) {
              Z$(this, XK, Nt).call(this, "Invalid response body, expected a web ReadableStream", W), this.close();
              return
          }
let X: any = new TextDecoder,
              V = D.getReader(),
              C = !0;
          do {
              let {
                  done: K,
                  value: E
              } = await V.read();
              E && L6(this, xm).feed(X.decode(E, {
                  stream: !K
              })), K && (C = !1, L6(this, xm).reset(), Z$(this, XK, cl1).call(this))
          } while (C)
      }), p7(this, dl1, (G) => {
          B3(this, oR, void 0), !(G.name === "AbortError" || G.type === "aborted") && Z$(this, XK, cl1).call(this, gl1(G))
      }), p7(this, ul1, (G) => {
          typeof G.id == "string" && B3(this, qt, G.id);
let Z: any = new MessageEvent(G.event || "message", {
              data: G.data,
              origin: L6(this, km) ? L6(this, km).origin : L6(this, vj).origin,
              lastEventId: G.id || ""
          });
          L6(this, fm) && (!G.event || G.event === "message") && L6(this, fm).call(this, Z), this.dispatchEvent(Z)
      }), p7(this, pl1, (G) => {
          B3(this, $t, G)
      }), p7(this, ll1, () => {
          B3(this, vm, void 0), L6(this, BW) === this.CONNECTING && Z$(this, XK, hl1).call(this)
      });
      try {
          if (A instanceof URL) B3(this, vj, A);
          else if (typeof A == "string") B3(this, vj, new URL(A, zO6()));
          else throw new Error("Invalid URL")
      } catch {
          throw HO6("An invalid or illegal string was specified")
      }
      B3(this, xm, YF1({
          onEvent: L6(this, ul1),
          onRetry: L6(this, pl1)
      })), B3(this, BW, this.CONNECTING), B3(this, $t, 3000), B3(this, JF1, (Q = B == null ? void 0 : B.fetch) != null ? Q : globalThis.fetch), B3(this, WF1, (I = B == null ? void 0 : B.withCredentials) != null ? I : !1), Z$(this, XK, hl1).call(this)
  }
  get readyState() {
      return L6(this, BW)
  }
  get url() {
      return L6(this, vj).href
  }
  get withCredentials() {
      return L6(this, WF1)
  }
  get onerror() {
      return L6(this, bm)
  }
  set onerror(A) {
      B3(this, bm, A)
  }
  get onmessage() {
      return L6(this, fm)
  }
  set onmessage(A) {
      B3(this, fm, A)
  }
  get onopen() {
      return L6(this, Ut)
  }
  set onopen(A) {
      B3(this, Ut, A)
  }
  addEventListener(A, B, Q) {
let I: any = B;
      super.addEventListener(A, I, Q)
  }
  removeEventListener(A, B, Q) {
let I: any = B;
      super.removeEventListener(A, I, Q)
  }
  close() {
      L6(this, vm) && clearTimeout(L6(this, vm)), L6(this, BW) !== this.CLOSED && (L6(this, oR) && L6(this, oR).abort(), B3(this, BW, this.CLOSED), B3(this, oR, void 0))
  }
}


// Do1 - Lines 34853-34909
class Do1 {
class Do1 {
  ws;
  started = !1;
  opened;
  constructor(A) {
      this.ws = A;
      this.opened = new Promise((B, Q) => {
          if (this.ws.readyState === XL.OPEN) B();
          else this.ws.on("open", () => {
              B()
          }), this.ws.on("error", (I) => {
              Q(I)
          })
      }), this.ws.on("message", this.onMessageHandler), this.ws.on("error", this.onErrorHandler), this.ws.on("close", this.onCloseHandler)
  }
  onclose;
  onerror;
  onmessage;
  onMessageHandler = (A) => {
      try {
let B: any = JSON.parse(A.toString("utf-8")),
              Q = fw.parse(B);
          this.onmessage ? .(Q)
      } catch (B) {
          this.onErrorHandler(B)
      }
  };
  onErrorHandler = (A) => {
      this.onerror ? .(A instanceof Error ? A : new Error("Failed to process message"))
  };
  onCloseHandler = () => {
      this.onclose ? .(), this.ws.off("message", this.onMessageHandler), this.ws.off("error", this.onErrorHandler), this.ws.off("close", this.onCloseHandler)
  };
  async start() {
      if (this.started) throw new Error("Start can only be called once per transport.");
      if (await this.opened, this.ws.readyState !== XL.OPEN) throw new Error("WebSocket is not open. Cannot start transport.");
      this.started = !0
  }
  async close() {
      if (this.ws.readyState === XL.OPEN || this.ws.readyState === XL.CONNECTING) this.ws.close();
      this.onCloseHandler()
  }
  async send(A) {
      if (this.ws.readyState !== XL.OPEN) throw new Error("WebSocket is not open. Cannot send message.");
let B: any = JSON.stringify(A);
      try {
          await new Promise((Q, I) => {
              this.ws.send(B, (G) => {
                  if (G) I(G);
                  else Q()
              })
          })
      } catch (Q) {
          throw this.onErrorHandler(Q), Q
      }
  }
}


// z2A - Lines 64853-64872
class z2A extends Rj2.Component {
class z2A extends Rj2.Component {
  constructor(A) {
      super(A);
      this.state = {
          hasError: !1
      }
  }
  static getDerivedStateFromError() {
      return {
          hasError: !0
      }
  }
  componentDidCatch(A) {
      MG1(A)
  }
  render() {
      if (this.state.hasError) return null;
      return this.props.children
  }
}


// y9 - Lines 2364-2366
function y9(): any {
function y9(): any {
  return $9.sessionId
}


// c2A - Lines 2368-2370
function c2A(): any {
function c2A(): any {
  return $9.sessionId = p2A(), $9.sessionId
}


// G9A - Lines 2514-2516
function G9A(): any {
function G9A(): any {
  return $9.sessionCounter
}


// V9A - Lines 2558-2560
function V9A(): any {
function V9A(): any {
  return $9.isNonInteractiveSession
}


// C9A - Lines 2562-2564
function C9A(A): any {
function C9A(A): any {
  $9.isNonInteractiveSession = A
}


// VA - Lines 18797-18814
          function VA(KA): any {
          function VA(KA): any {
              return (typeof fetch == "function" ? fetch(Q, {
                  credentials: "same-origin"
              }).then(function(PA) {
                  if (!PA.ok) throw "failed to load wasm binary file at '" + Q + "'";
                  return PA.arrayBuffer()
              }).catch(function() {
                  return D1()
              }) : Promise.resolve().then(function() {
                  return D1()
              })).then(function(PA) {
                  return WebAssembly.instantiate(PA, OA)
              }).then(function(PA) {
                  return PA
              }).then(KA, function(PA) {
                  Y("failed to asynchronously prepare wasm: " + PA), X1(PA)
              })
          }


// MG1 - Lines 22891-22914
function MG1(A): any {
function MG1(A): any {
  try {
let B: any = xx();
      aL.setExtras({
          nodeVersion: mA.nodeVersion,
          platform: mA.platform,
          isCI: mA.isCI,
          isTest: !1,
          packageVersion: {
              ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
              PACKAGE_URL: "@elizaos/code",
              README_URL: "https://eliza.how",
              VERSION: "1.0.34"
          }.VERSION,
          sessionId: y9(),
          statsigGates: YZ0(),
          terminal: mA.terminal,
          userType: "external"
      }), aL.setUser({
          id: B.userID,
          email: B.email
      }), aL.captureException(A)
  } catch {}
}


// m7 - Lines 23271-23295
function m7(A, B): any {
function m7(A, B): any {
  if (M6(UA.red(`MCP server "${A}" ${B}`)), m6().cleanupPeriodDays === 0) return;
  try {
let Q: any = Mz.mcpLogs(A),
          I = B instanceof Error ? B.stack || B.message : String(B),
          G = new Date().toISOString(),
          Z = uf1(Q, pf1 + ".txt");
      if (!x1().existsSync(Q)) x1().mkdirSync(Q);
      if (!x1().existsSync(Z)) x1().writeFileSync(Z, "[]", {
          encoding: "utf8",
          flush: !1
      });
let D: any = {
              error: I,
              timestamp: G,
              sessionId: y9(),
              cwd: x1().cwd()
          },
          Y = cf1(Z);
      Y.push(D), x1().writeFileSync(Z, JSON.stringify(Y, null, 2), {
          encoding: "utf8",
          flush: !1
      })
  } catch {}
}


// p2 - Lines 23297-23320
function p2(A, B): any {
function p2(A, B): any {
  O9(`MCP server "${A}": ${B}`);
  try {
let Q: any = Mz.mcpLogs(A),
          I = new Date().toISOString(),
          G = uf1(Q, pf1 + ".txt");
      if (!x1().existsSync(Q)) x1().mkdirSync(Q);
      if (!x1().existsSync(G)) x1().writeFileSync(G, "[]", {
          encoding: "utf8",
          flush: !1
      });
let Z: any = {
              debug: B,
              timestamp: I,
              sessionId: y9(),
              cwd: x1().cwd()
          },
          D = cf1(G);
      D.push(Z), x1().writeFileSync(G, JSON.stringify(D, null, 2), {
          encoding: "utf8",
          flush: !1
      })
  } catch {}
}


// cf4 - Lines 24216-24267
function cf4(): any {
function cf4(): any {
  if (process.env.CURSOR_TRACE_ID) return "cursor";
  if (process.env.VSCODE_GIT_ASKPASS_MAIN ? .includes("/.cursor-server/")) return "cursor";
  if (process.env.VSCODE_GIT_ASKPASS_MAIN ? .includes("/.windsurf-server/")) return "windsurf";
let A: any = process.env.__CFBundleIdentifier ? .toLowerCase();
  if (A ? .includes("vscodium")) return "codium";
  if (A ? .includes("windsurf")) return "windsurf";
  if (A ? .includes("pycharm")) return "pycharm";
  if (A ? .includes("intellij")) return "intellij";
  if (A ? .includes("webstorm")) return "webstorm";
  if (A ? .includes("phpstorm")) return "phpstorm";
  if (A ? .includes("rubymine")) return "rubymine";
  if (A ? .includes("clion")) return "clion";
  if (A ? .includes("goland")) return "goland";
  if (A ? .includes("rider")) return "rider";
  if (A ? .includes("datagrip")) return "datagrip";
  if (A ? .includes("appcode")) return "appcode";
  if (A ? .includes("dataspell")) return "dataspell";
  if (A ? .includes("aqua")) return "aqua";
  if (A ? .includes("gateway")) return "gateway";
  if (A ? .includes("fleet")) return "fleet";
  if (A ? .includes("com.google.android.studio")) return "androidstudio";
  if (process.env.TERMINAL_EMULATOR === "JetBrains-JediTerm") return "pycharm";
  if (process.env.TERM === "xterm-ghostty") return "ghostty";
  if (process.env.TERM ? .includes("kitty")) return "kitty";
  if (process.env.TERM_PROGRAM) return process.env.TERM_PROGRAM;
  if (process.env.TMUX) return "tmux";
  if (process.env.STY) return "screen";
  if (process.env.KONSOLE_VERSION) return "konsole";
  if (process.env.GNOME_TERMINAL_SERVICE) return "gnome-terminal";
  if (process.env.XTERM_VERSION) return "xterm";
  if (process.env.VTE_VERSION) return "vte-based";
  if (process.env.TERMINATOR_UUID) return "terminator";
  if (process.env.KITTY_WINDOW_ID) return "kitty";
  if (process.env.ALACRITTY_LOG) return "alacritty";
  if (process.env.TILIX_ID) return "tilix";
  if (process.env.WT_SESSION) return "windows-terminal";
  if (process.env.SESSIONNAME && process.env.TERM === "cygwin") return "cygwin";
  if (process.env.MSYSTEM) return process.env.MSYSTEM.toLowerCase();
  if (process.env.ConEmuTask) return "conemu";
  if (process.env.WSL_DISTRO_NAME) return `wsl-${process.env.WSL_DISTRO_NAME}`;
  if (process.env.SSH_CONNECTION || process.env.SSH_CLIENT || process.env.SSH_TTY) return "ssh-session";
  if (process.env.TERM) {
let B: any = process.env.TERM;
      if (B.includes("alacritty")) return "alacritty";
      if (B.includes("rxvt")) return "rxvt";
      if (B.includes("termite")) return "termite";
      return process.env.TERM
  }
  if (!process.stdout.isTTY) return "non-interactive";
  return null
}


// Wv1 - Lines 24858-24867
function Wv1(): any {
function Wv1(): any {
  let {
      env: A
  } = CD0, {
      TERM: B,
      TERM_PROGRAM: Q
  } = A;
  if (CD0.platform !== "win32") return B !== "linux";
  return Boolean(A.WT_SESSION) || Boolean(A.TERMINUS_SUBLIME) || A.ConEmuTask === "{cmd::Cmder}" || Q === "Terminus-Sublime" || Q === "vscode" || B === "xterm-256color" || B === "alacritty" || B === "rxvt-unicode" || B === "rxvt-unicode-256color" || A.TERMINAL_EMULATOR === "JetBrains-JediTerm"
}


// Ua0 - Lines 26806-26831
function Ua0({
function Ua0({
  onDone: A
}): any {
  return Z0((B, Q) => {
      if (Q.ctrl && (B === "c" || B === "d") || Q.escape) A()
  }), pR.default.createElement(h, {
      flexDirection: "column",
      borderStyle: "round",
      padding: 1,
      borderColor: "secondaryBorder"
  }, pR.default.createElement(h, {
      marginBottom: 1,
      flexDirection: "column"
  }, pR.default.createElement(P, {
      bold: !0
  }, "You've spent $5 on the Anthropic API this session."), pR.default.createElement(P, null, "Learn more about how to monitor your spending:"), pR.default.createElement(kQ, {
      url: "https://eliza.how-cost"
  })), pR.default.createElement(h, null, pR.default.createElement(p0, {
      options: [{
          value: "ok",
          label: "Got it, thanks!"
      }],
      onChange: A,
      onCancel: A
  })))
}


// WJ1 - Lines 26924-26929
function WJ1(A): any {
function WJ1(A): any {
  if (A.messages.length > 0) {
let B: any = A.messages[0];
      if (B && "sessionId" in B) YL6(B.sessionId, y9())
  }
}


// Cl1 - Lines 31470-31475
function Cl1(A): any {
function Cl1(A): any {
  if (A !== "refusal") return;
  return E1("tengu_refusal_api_response", {}), eY({
      content: `${bZ}: Autocoder is unable to respond to this request, which appears to violate our Usage Policy (https://www.elizaos.ai/legal/aup). Please double press esc to edit your last message or start a new session for Autocoder to assist with a different task.`
  })
}


// gw - Lines 36079-36087
async function gw(A, B, Q, I): any {
async function gw(A, B, Q, I): any {
  return wC2({
      client: Q,
      tool: A,
      args: B,
      signal: new AbortController().signal,
      isNonInteractiveSession: I
  })
}


// wC2 - Lines 36217-36261
async function wC2({
async function wC2({
  client: {
      client: A,
      name: B
  },
  tool: Q,
  args: I,
  signal: G,
  isNonInteractiveSession: Z
}): any {
  try {
      p2(B, `Calling MCP tool: ${Q}`);
let D: any = await A.callTool({
          name: Q,
          arguments: I
      }, Sm, {
          signal: G,
          timeout: p65()
      });
      if ("isError" in D && D.isError) {
let W: any = "Unknown error";
          if ("content" in D && Array.isArray(D.content) && D.content.length > 0) {
let J: any = D.content[0];
              if (J && typeof J === "object" && "text" in J) W = J.text
          } else if ("error" in D) W = String(D.error);
          throw m7(B, W), Error(W)
      }
      if (p2(B, `Tool call succeeded: ${JSON.stringify(D)}`), "toolResult" in D) {
let J: any = await wJ("claude_code_unicode_sanitize") ? $i1(String(D.toolResult)) : String(D.toolResult);
          if (B !== "ide") await Zo1(J, Q, Z);
          return J
      }
      if ("content" in D && Array.isArray(D.content)) {
let W: any = D.content,
              X = (await wJ("claude_code_unicode_sanitize") ? D$(W) : W).map((V) => No1(V, B)).flat();
          if (B !== "ide") await Zo1(X, Q, Z);
          return X
      }
let Y: any = `Unexpected response format from tool ${Q}`;
      throw m7(B, Y), Error(Y)
  } catch (D) {
      if (D instanceof he) throw D;
      if (!(D instanceof Error) || D.name !== "AbortError") throw D
  }
}


// LY5 - Lines 43878-43893
function LY5(): any {
function LY5(): any {
  return Fe1.useEffect(() => {
      MY5()
  }, []), s7.createElement(h, {
      flexDirection: "column",
      gap: 1,
      paddingLeft: 1,
      paddingTop: 1
  }, s7.createElement(P, {
      color: "text"
  }, "Your organization has enrolled in the", " ", s7.createElement(kQ, {
      url: "https://support.elizaos.ai/en/articles/11174108-about-the-development-partner-program"
  }, "Development Partner Program"), ". Your Autocoder sessions are being shared with Anthropic to improve our services including model training. Questions? Contact your account", " ", s7.createElement(kQ, {
      url: "https://console.elizaos.ai/settings/members"
  }, "admin"), "."))
}


// fY5 - Lines 44291-44294
function fY5(A): any {
function fY5(A): any {
  if (!(A instanceof p6)) return !1;
  return A.status === 529 || (A.message ? .includes('"type":"overloaded_error"') ? ? !1)
}


// vY5 - Lines 44296-44310
function vY5(A): any {
function vY5(A): any {
  if (A.message ? .includes('"type":"overloaded_error"')) return !0;
  if (lE2(A)) return !0;
let B: any = A.headers ? .get("x-should-retry");
  if (B === "true" && !T9()) return !0;
  if (B === "false") return !1;
  if (A instanceof eN) return !0;
  if (!A.status) return !1;
  if (A.status === 408) return !0;
  if (A.status === 409) return !0;
  if (A.status === 429) return !T9();
  if (A.status === 401) return KdA(), !0;
  if (A.status && A.status >= 500) return !0;
  return !1
}


// cZ - Lines 44886-44915
async function cZ({
async function cZ({
  systemPrompt: A = [],
  userPrompt: B,
  assistantPrompt: Q,
  enablePromptCaching: I = !1,
  signal: G,
  isNonInteractiveSession: Z,
  temperature: D = 0,
  promptCategory: Y
}): any {
  return (await We1([K2({
      content: A.map((J) => ({
          type: "text",
          text: J
      }))
  }), K2({
      content: B
  })], async () => {
      return [await uY5({
          systemPrompt: A,
          userPrompt: B,
          assistantPrompt: Q,
          signal: G,
          isNonInteractiveSession: Z,
          temperature: D,
          enablePromptCaching: I,
          promptCategory: Y
      })]
  }))[0]
}


// BU2 - Lines 45438-45444
function BU2(A, B): any {
function BU2(A, B): any {
let I: any = `This session is being continued from a previous conversation that ran out of context. The conversation is summarized below:
${tY5(A)}.`;
  if (B) return `${I}
Please continue the conversation from where we left it off without asking the user any further questions. Continue with the last task that you were asked to work on.`;
  return I
}


// xq2 - Lines 48736-48745
async function xq2(A, B, Q): any {
async function xq2(A, B, Q): any {
  try {
      if (!Q || Q.type !== "connected") throw new Error("IDE client not available");
      await gw("close_tab", {
          tab_name: A
      }, Q, B.options.isNonInteractiveSession)
  } catch (I) {
      b1(I)
  }
}


// rF5 - Lines 48755-48757
function rF5(A): any {
function rF5(A): any {
  return A.type === "result" && Array.isArray(A.data) && A.data[0] ? .type === "text" && A.data[0].text === "FILE_SAVED" && typeof A.data[1].text === "string"
}


// xu - Lines 48763-48795
function xu({
function xu({
  onChange: A,
  options: B,
  input: Q,
  file_path: I,
  ideName: G
}): any {
  return pG.createElement(h, {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "permission",
      marginTop: 1,
      paddingLeft: 1,
      paddingRight: 1,
      paddingBottom: 1
  }, pG.createElement(h, {
      flexDirection: "column",
      padding: 1
  }, pG.createElement(P, {
      bold: !0,
      color: "permission"
  }, "Opened changes in ", G, " ⧉"), tR && pG.createElement(P, {
      dimColor: !0
  }, "Save file to continue…")), pG.createElement(h, {
      flexDirection: "column"
  }, pG.createElement(P, null, "Do you want to make this edit to", " ", pG.createElement(P, {
      bold: !0
  }, oF5(I)), "?"), pG.createElement(p0, {
      options: B,
      onChange: (Z) => A(Z, Q),
      onCancel: () => A("no", Q)
  })))
}


// eJ - Lines 48874-48886
function eJ(A, B): any {
function eJ(A, B): any {
let Q: any = eF(A, B) ? `Yes, and don't ask again this session (${UA.bold.dim("shift+tab")})` : `Yes, add ${UA.bold(CA1(A))} and don't ask again this session (${UA.bold.dim("shift+tab")})`;
  return [{
      label: "Yes",
      value: "yes"
  }, {
      label: Q,
      value: "yes-dont-ask-again"
  }, {
      label: `No, and tell Autocoder what to do differently (${UA.bold.dim("esc")})`,
      value: "no"
  }]
}


// HX5 - Lines 49686-49709
function HX5(A, B, Q): any {
function HX5(A, B, Q): any {
  if (A === null) return [{
      label: "Yes",
      value: "yes"
  }, {
      label: `No, and tell Autocoder what to do differently (${UA.bold.dim("esc")})`,
      value: "no"
  }];
  switch (B) {
      case "edit":
          return eJ(A, Q);
      case "read":
          return [{
              label: "Yes",
              value: "yes"
          }, {
              label: `Yes, and add ${UA.bold(CA1(A))} as a working directory for this session`,
              value: "yes-dont-ask-again"
          }, {
              label: `No, and tell Autocoder what to do differently (${UA.bold.dim("esc")})`,
              value: "no"
          }]
  }
}


// UO2 - Lines 50175-50193
async function UO2(A, B, Q, I): any {
async function UO2(A, B, Q, I): any {
let G: any = $a0(B, A),
      Z = await cZ({
          systemPrompt: [],
          userPrompt: G,
          isNonInteractiveSession: I,
          signal: Q,
          promptCategory: "web_fetch_apply"
      });
  if (Q.aborted) throw new NG;
  let {
      content: D
  } = Z.message;
  if (D.length > 0) {
let Y: any = D[0];
      if ("text" in Y) return Y.text
  }
  return "No response from model"
}


// kH5 - Lines 50581-50593
function kH5(A, B): any {
function kH5(A, B): any {
let Q: any = eF(A, B) ? [{
      label: "Yes, and don't ask again this session",
      value: "yes-dont-ask-again"
  }] : [];
  return [{
      label: "Yes",
      value: "yes"
  }, ...Q, {
      label: `No, and tell Autocoder what to do differently (${UA.bold.dim("esc")})`,
      value: "no"
  }]
}


// Aw5 - Lines 54163-54177
async function Aw5(A): any {
async function Aw5(A): any {
  try {
let B: any = await cZ({
              systemPrompt: ["Generate a concise, technical issue title (max 80 chars) for a GitHub issue based on this bug report. The title should:", "- Be specific and descriptive of the actual problem", "- Use technical terminology appropriate for a software issue", '- For error messages, extract the key error (var_e.var_g., "Missing Tool Result Block" rather than the full message)', '- Start with a noun or verb (not "Bug:" or "Issue:")', "- Be direct and clear for developers to understand the problem", '- If you cannot determine a clear issue, use "Bug Report: [brief description]"'],
              userPrompt: A,
              isNonInteractiveSession: !1,
              promptCategory: "bug_title"
          }),
          Q = B.message.content[0] ? .type === "text" ? B.message.content[0].text : "Bug Report";
      if (Q.startsWith(bZ)) return gT2(A);
      return Q
  } catch (B) {
      return b1(B instanceof Error ? B : new Error(String(B))), gT2(A)
  }
}


// Dw1 - Lines 54496-54538
function Dw1({
function Dw1({
  initial: A,
  onSelect: B
}): any {
let Q: any = A === null ? Q0A : A,
      [I, G] = nT2.useState(Q),
      Z = BZ0(),
      D = Y2();
  return _8.createElement(h, {
      flexDirection: "column"
  }, _8.createElement(h, {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "remember",
      paddingX: 2,
      paddingY: 1,
      width: "100%"
  }, _8.createElement(h, {
      marginBottom: 1,
      flexDirection: "column"
  }, _8.createElement(P, {
      color: "remember",
      bold: !0
  }, "Select Model"), _8.createElement(P, {
      dimColor: !0
  }, "Switch between Autocoder models. Applies to this session and future Autocoder sessions. For custom model names, specify with --model.")), _8.createElement(h, {
      flexDirection: "column",
      paddingX: 1
  }, _8.createElement(p0, {
      defaultValue: I,
      focusValue: Z.some((Y) => Y.value === I) ? I : Z[0] ? .value ? ? void 0,
      options: Z.map((Y) => ({ ...Y,
          value: Y.value === null ? Q0A : Y.value
      })),
      onFocus: (Y) => G(Y),
      onChange: (Y) => B(Y === Q0A ? null : Y),
      onCancel: () => {}
  }))), _8.createElement(h, {
      paddingX: 1
  }, _8.createElement(P, {
      dimColor: !0
  }, D.pending ? _8.createElement(_8.Fragment, null, "Press ", D.keyName, " again to exit") : _8.createElement(_8.Fragment, null, "Enter to confirm · Esc to exit"))))
}


// AE5 - Lines 55407-55420
async function AE5(): any {
async function AE5(): any {
let A: any = await rP2(),
      {
          installPath: B
      } = ww1(A);
  if (O9(`Checking for native installer update to version ${A}`), !await sP2(B, async () => {
          if (!ew5(A)) O9(`Downloading native installer version ${A}`), await rw5(A), tw5(A);
          else O9(`Version ${A} already installed, updating symlink`);
let I: any = TE(),
              G = SB(I.symlinks, "latest");
          oP2(G, B)
      }, 3)) return !1;
  return O9(`Successfully updated to version ${A}`), !0
}


// qw1 - Lines 56088-56139
function qw1({
function qw1({
  onSelect: A,
  onCancel: B,
  title: Q,
  renderDetails: I
}): any {
  let [G, Z] = DS2.useState(ZS2), D = TU2(e9()), Y = [{
      label: "Project memory",
      value: "Project",
      description: `${D?"Checked in at":"Saved in"} ./CLAUDE.md`
  }, ...D ? [{
      label: "Project memory (local)",
      value: "Local",
      description: "Gitignored in ./CLAUDE.local.md"
  }] : [], {
      label: "User memory",
      value: "User",
      description: "Saved in ~/.claude/CLAUDE.md"
  }, ...[]];
  return Y2(), Z0((W, J) => {
      if (J.escape) B()
  }), FB.createElement(h, {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "remember",
      padding: 1,
      width: "100%"
  }, FB.createElement(h, {
      marginBottom: 1,
      flexDirection: "row",
      justifyContent: "space-between"
  }, FB.createElement(P, {
      color: "remember",
      bold: !0
  }, Q || "Where should this memory be saved?")), FB.createElement(h, {
      flexDirection: "column",
      paddingX: 1
  }, FB.createElement(p0, {
      focusValue: G,
      options: Y,
      onFocus: (W) => Z(W),
      onChange: (W) => {
          ZS2 = W, A(W)
      },
      onCancel: B
  })), FB.createElement(h, {
      marginTop: 1,
      flexDirection: "column"
  }, I ? I(G) : FB.createElement(qE5, {
      type: G
  })))
}


// fS2 - Lines 57978-58013
function fS2({
function fS2({
  secretExists: A,
  useExistingSecret: B,
  secretName: Q,
  skipWorkflow: I = !1
}): any {
  return VB.default.createElement(VB.default.Fragment, null, VB.default.createElement(h, {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "secondaryBorder",
      paddingX: 1
  }, VB.default.createElement(h, {
      flexDirection: "column",
      marginBottom: 1
  }, VB.default.createElement(P, {
      bold: !0
  }, "Install GitHub App"), VB.default.createElement(P, {
      dimColor: !0
  }, "Success")), !I && VB.default.createElement(P, {
      color: "success"
  }, "✓ GitHub Actions workflow created!"), A && B && VB.default.createElement(h, {
      marginTop: 1
  }, VB.default.createElement(P, {
      color: "success"
  }, "✓ Using existing ANTHROPIC_API_KEY secret")), (!A || !B) && VB.default.createElement(h, {
      marginTop: 1
  }, VB.default.createElement(P, {
      color: "success"
  }, "✓ API key saved as ", Q, " secret")), VB.default.createElement(h, {
      marginTop: 1
  }, VB.default.createElement(P, null, "Next steps:")), I ? VB.default.createElement(VB.default.Fragment, null, VB.default.createElement(P, null, "1. Install the Autocoder GitHub App if you haven't already"), VB.default.createElement(P, null, "2. Your workflow file was kept unchanged"), VB.default.createElement(P, null, "3. API key is configured and ready to use")) : VB.default.createElement(VB.default.Fragment, null, VB.default.createElement(P, null, "1. A pre-filled PR page has been created"), VB.default.createElement(P, null, "2. Install the Autocoder GitHub App if you haven't already"), VB.default.createElement(P, null, "3. Merge the PR to enable Autocoder PR assistance"))), VB.default.createElement(h, {
      marginLeft: 3
  }, VB.default.createElement(P, {
      dimColor: !0
  }, "Press any key to exit")))
}


// W - Lines 59504-59521
      async function W(): any {
      async function W(): any {
          try {
let J: any = await A.description({}, {
                  isNonInteractiveSession: !1,
                  getToolPermissionContext: () => ({
                      mode: "default",
                      additionalWorkingDirectories: new Set,
                      alwaysAllowRules: {},
                      alwaysDenyRules: {},
                      isBypassPermissionsModeAvailable: !1
                  }),
                  tools: []
              });
              Z(J)
          } catch {
              Z("Failed to load description")
          }
      }


// J - Lines 59945-59955
      async function J(): any {
      async function J(): any {
          try {
let F: any = await Hg();
              if (F.length === 0) A("No conversations found to resume");
              else I(F)
          } catch (F) {
              A("Failed to load conversations")
          } finally {
              Z(!1)
          }
      }


// D - Lines 59958-59970
  async function D(J): any {
  async function D(J): any {
let F: any = Q[J];
      if (!F) {
          A("Failed to load selected conversation");
          return
      }
let X: any = fC(F.messages.find((V) => V.sessionId) ? .sessionId);
      if (!X) {
          A("Failed to resume conversation");
          return
      }
      B(X, F)
  }


// T_2 - Lines 61394-61415
function T_2(A): any {
function T_2(A): any {
  switch (A) {
      case "localSettings":
          return {
              label: "Project settings (local)",
              description: `Saved in ${fn("localSettings")}`,
              value: A
          };
      case "projectSettings":
          return {
              label: "Project settings",
              description: `Checked in at ${fn("projectSettings")}`,
              value: A
          };
      case "userSettings":
          return {
              label: "User settings",
              description: "Saved in at ~/.claude/settings.json",
              value: A
          }
  }
}


// P_2 - Lines 61418-61485
function P_2({
function P_2({
  onAddRules: A,
  onCancel: B,
  ruleValues: Q,
  ruleBehavior: I,
  initialContext: G,
  setToolPermissionContext: Z
}): any {
let D: any = gw1.map(T_2),
      Y = Y2();
  Z0((J, F) => {
      if (F.escape) B()
  });
let W: any = O_2.useCallback((J) => {
      if (J === "cancel") {
          B();
          return
      } else if (gw1.includes(J)) {
let F: any = J;
          ni({
              ruleValues: Q,
              ruleBehavior: I,
              destination: F,
              initialContext: G,
              setToolPermissionContext: Z
          });
let X: any = Q.map((V) => ({
              ruleValue: V,
              ruleBehavior: I,
              source: F
          }));
          A(X)
      }
  }, [A, B, Q, I, G, Z]);
  return S5.createElement(S5.Fragment, null, S5.createElement(h, {
      flexDirection: "column",
      borderStyle: "round",
      paddingLeft: 1,
      paddingRight: 1,
      borderColor: "permission"
  }, S5.createElement(P, {
      bold: !0,
      color: "permission"
  }, "Add ", I, " permission rule", Q.length === 1 ? "" : "s", S5.createElement(UI, null)), S5.createElement(h, {
      flexDirection: "column",
      paddingX: 2
  }, Q.map((J) => S5.createElement(h, {
      flexDirection: "column",
      key: m8(J)
  }, S5.createElement(P, {
      bold: !0
  }, m8(J)), S5.createElement(bw1, {
      ruleValue: J
  })))), S5.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, S5.createElement(P, null, Q.length === 1 ? "Where should this rule be saved?" : "Where should these rules be saved?"), S5.createElement(p0, {
      options: D,
      onChange: W,
      onCancel: B
  }))), S5.createElement(h, {
      marginLeft: 3
  }, Y.pending ? S5.createElement(P, {
      dimColor: !0
  }, "Press ", Y.keyName, " again to exit") : S5.createElement(P, {
      dimColor: !0
  }, "↑/↓ to select · Enter to confirm · Esc to cancel")))
}


// H2A - Lines 64503-64542
function H2A(A): any {
function H2A(A): any {
  let [B] = q9(), Q = Hj2({
      value: A.value,
      onChange: A.onChange,
      onSubmit: A.onSubmit,
      onExit: A.onExit,
      onExitMessage: A.onExitMessage,
      onMessage: A.onMessage,
      onHistoryReset: A.onHistoryReset,
      onHistoryUp: A.onHistoryUp,
      onHistoryDown: A.onHistoryDown,
      focus: A.focus,
      mask: A.mask,
      multiline: A.multiline,
      cursorChar: A.showCursor ? " " : "",
      highlightPastedText: A.highlightPastedText,
      invert: UA.inverse,
      themeText: V9("text", B),
      columns: A.columns,
      onImagePaste: A.onImagePaste,
      disableCursorMovementForUpDownKeys: A.disableCursorMovementForUpDownKeys,
      externalOffset: A.cursorOffset,
      onOffsetChange: A.onChangeCursorOffset,
      onModeChange: A.onModeChange,
      isMessageLoading: A.isLoading,
      onUndo: A.onUndo
  }), {
      mode: I,
      setMode: G
  } = Q;
  return aw1.default.useEffect(() => {
      if (A.initialMode && A.initialMode !== I) G(A.initialMode)
  }, [A.initialMode, I, G]), aw1.default.createElement(h, {
      flexDirection: "column"
  }, aw1.default.createElement(Iw1, {
      inputState: Q,
      terminalFocus: !0,
      ...A
  }))
}


// dj2 - Lines 65994-66021
function dj2(): any {
function dj2(): any {
  let [A, B] = I01.useState(() => {
let Z: any = qG(!1);
      if (!mS() || T9()) return "valid";
      if (Z) return "loading";
      return "missing"
  }), [Q, I] = I01.useState(null), G = I01.useCallback(async () => {
      if (!mS() || T9()) return;
let Z: any = qG(!1);
      if (!Z) {
          B("missing");
          return
      }
      try {
let Y: any = await iE2(Z, !1) ? "valid" : "invalid";
          B(Y);
          return
      } catch (D) {
          I(D), B("error");
          return
      }
  }, []);
  return {
      status: A,
      reverify: G,
      error: Q
  }
}


// C - Lines 66401-66405
function C$5(A) {
function C$5(A) {
  return A.filter((B) => {
      return E2A(B.id) >= B.cooldownSessions
  })
}


// H - Lines 66415-66423
function H$5(A) {
function H$5(A) {
  if (A.length === 0) return;
  if (A.length === 1) return A[0];
let B: any = A.map((Q) => ({
      tip: Q,
      sessions: E2A(Q.id)
  }));
  return B.sort((Q, I) => I.sessions - Q.sessions), B[0] ? .tip
}


// Qy2 - Lines 66434-66439
function Qy2(A): any {
function Qy2(A): any {
  Ay2(A.id), E1("tengu_tip_shown", {
      tipIdLength: A.id,
      cooldownSessions: A.cooldownSessions
  })
}


// Nq5 - Lines 68276-68298
async function Nq5(A): any {
async function Nq5(A): any {
  if (!A.length) throw new Error("Can't summarize empty conversation");
let Q: any = [`Please write a 5-10 word title the following conversation:

${AQ(A).map((G)=>{if(G.type==="user"){if(typeof G.message.content==="string")return`User: ${G.message.content}`;else if(Array.isArray(G.message.content))return`User: ${G.message.content.filter((Z)=>Z.type==="text").map((Z)=>Z.type==="text"?Z.text:"").join(`
`).trim()}`}else if(G.type==="assistant"){let Z=BH1(G);if(Z)return`
      Autocoder: $ {
          U11(Z).trim()
      }
      `}return null}).filter((G)=>G!==null).join(`

      `)}
`, "Respond with the title for the conversation and nothing else."
  ];
  return (await cZ({
      systemPrompt: [Uq5],
      userPrompt: Q.join(`
`),
      enablePromptCaching: !0,
      isNonInteractiveSession: !1,
      promptCategory: "summarize_convo"
  })).message.content.filter((G) => G.type === "text").map((G) => G.text).join("")
}


// sy2 - Lines 68611-68619
function sy2(): any {
function sy2(): any {
  return YE1.default.createElement(h, {
      flexDirection: "row"
  }, YE1.default.createElement(P, {
      color: "text"
  }, "※ Tip: Use git worktrees to run multiple Autocoder sessions in parallel.", " ", YE1.default.createElement(kQ, {
      url: "https://eliza.how-worktrees"
  }, "Learn more")))
}


// Dk2 - Lines 69259-69278
function Dk2(A): any {
function Dk2(A): any {
  return A.flatMap((B) => {
      switch (B.type) {
          case "assistant":
              return [{
                  type: "assistant",
                  message: B.message,
                  session_id: y9()
              }];
          case "user":
              return [{
                  type: "user",
                  message: B.message,
                  session_id: y9()
              }];
          default:
              return []
      }
  })
}


// Yk2 - Lines 69282-69361
async function Yk2(A, B, Q, I, G, Z, D, Y): any {
async function Yk2(A, B, Q, I, G, Z, D, Y): any {
let W: any = [];
  if (Y.continue) try {
      E1("tengu_continue_print", {});
let N: any = await ET(void 0, Z.concat(D));
      if (N) W = N.messages
  } catch (N) {
      b1(N instanceof Error ? N : new Error(String(N))), process.exit(1)
  }
  if (Y.resume) try {
      E1("tengu_resume_print", {});
let N: any = fC(Y.resume);
      if (!N) {
          if (console.error("Error: --resume requires a valid session ID when used with --print"), console.error("Usage: claude -p --resume <session-id>"), typeof Y.resume === "string" && !N) console.error("Session IDs must be in UUID format (var_e.var_g., 550e8400-e29b-41d4-a716-446655440000)"), console.error(`Provided value "${Y.resume}" is not a valid UUID`);
          process.exit(1)
      }
let query: any = await ET(N, Z.concat(D));
      if (!q) console.error(`No conversation found with session ID: ${N}`), process.exit(1);
      W = query.messages
  } catch (N) {
      b1(N instanceof Error ? N : new Error(String(N))), console.error("Failed to resume session with --print mode"), process.exit(1)
  }
  let J;
  if (typeof A === "string") J = GU2([JSON.stringify({
      type: "user",
      session_id: "",
      message: {
          role: "user",
          content: A
      },
      parent_tool_use_id: null
  })]);
  else J = A;
let F: any = new g2A(J),
      X = Boolean(fC(Y.resume));
  if (!A && !X) console.error("Error: Input must be provided either through stdin or as a prompt argument when using --print"), process.exit(1);
  if (Y.outputFormat === "stream-json" && !Y.verbose) console.error("Error: When using --print, --output-format=stream-json requires --verbose"), process.exit(1);
let V: any = [...Z, ...D],
      C = void 0;
  if (Y.permissionPromptToolName) {
      if (C = D.find((N) => N.name === Y.permissionPromptToolName), !C) console.error(`Error: MCP tool ${Y.permissionPromptToolName} (passed via --permission-prompt-tool) not found. Available MCP tools: ${D.map((N)=>N.name).join(", ")||"none"}`), process.exit(1);
      if (!C.inputJSONSchema) console.error(`Error: tool ${Y.permissionPromptToolName} (passed via --permission-prompt-tool) must be an MCP tool`), process.exit(1);
      V = V.filter((N) => N.name !== Y.permissionPromptToolName)
  }
let K: any = [];
  for await (let N of kq5(F.structuredInput, B, Q, [...I, ...G], V, W, C, Y)) {
      if (Y.outputFormat === "stream-json" && Y.verbose) EC(JSON.stringify(N) + `
`);
      K.push(N)
  }
let E: any = UD(K);
  if (!E || E.type !== "result") throw new Error("No messages returned");
  switch (Y.outputFormat) {
      case "json":
          if (Y.verbose) {
              EC(JSON.stringify(K) + `
`);
              break
          }
          EC(JSON.stringify(E) + `
`);
          break;
      case "stream-json":
          break;
      default:
          switch (E.subtype) {
              case "success":
                  EC(E.result.endsWith(`
`) ? E.result : E.result + `
`);
                  break;
              case "error_during_execution":
                  EC("Execution error");
                  break;
              case "error_max_turns":
                  EC(`Error: Reached max turns (${Y.maxTurns})`)
          }
  }
  process.exit(E.is_error ? 1 : 0)
}


export {
  E31,
  VZ0,
  gm,
  Do1,
  z2A,
  y9,
  c2A,
  G9A,
  V9A,
  C9A,
  VA,
  MG1,
  m7,
  p2,
  cf4,
  Wv1,
  Ua0,
  WJ1,
  Cl1,
  gw
};
