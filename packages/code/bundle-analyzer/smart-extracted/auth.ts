// Auth Components
// Extracted from bundled code

// gl - Lines 6699-6801
class gl {
class gl {
  constructor(A) {
      this.defaults = A, this.interceptors = {
          request: new ZM1,
          response: new ZM1
      }
  }
  async request(A, B) {
      try {
          return await this._request(A, B)
      } catch (Q) {
          if (Q instanceof Error) {
let I: any = {};
              Error.captureStackTrace ? Error.captureStackTrace(I) : I = new Error;
let G: any = I.stack ? I.stack.replace(/^.+\n/, "") : "";
              try {
                  if (!Q.stack) Q.stack = G;
                  else if (G && !String(Q.stack).endsWith(G.replace(/^.+\var_n.+\n/, ""))) Q.stack += `
` + G
              } catch (Z) {}
          }
          throw Q
      }
  }
  _request(A, B) {
      if (typeof A === "string") B = B || {}, B.url = A;
      else B = A || {};
      B = IC(this.defaults, B);
      let {
          transitional: Q,
          paramsSerializer: I,
          headers: G
      } = B;
      if (Q !== void 0) bl.assertOptions(Q, {
          silentJSONParsing: Zz.transitional(Zz.boolean),
          forcedJSONParsing: Zz.transitional(Zz.boolean),
          clarifyTimeoutError: Zz.transitional(Zz.boolean)
      }, !1);
      if (I != null)
          if (WA.isFunction(I)) B.paramsSerializer = {
              serialize: I
          };
          else bl.assertOptions(I, {
              encode: Zz.function,
              serialize: Zz.function
          }, !0);
      if (B.allowAbsoluteUrls !== void 0);
      else if (this.defaults.allowAbsoluteUrls !== void 0) B.allowAbsoluteUrls = this.defaults.allowAbsoluteUrls;
      else B.allowAbsoluteUrls = !0;
      bl.assertOptions(B, {
          baseUrl: Zz.spelling("baseURL"),
          withXsrfToken: Zz.spelling("withXSRFToken")
      }, !0), B.method = (B.method || this.defaults.method || "get").toLowerCase();
let Z: any = G && WA.merge(G.common, G[B.method]);
      G && WA.forEach(["delete", "get", "head", "post", "put", "patch", "common"], (C) => {
          delete G[C]
      }), B.headers = w3.concat(Z, G);
let D: any = [],
          Y = !0;
      this.interceptors.request.forEach(function C(K): any {
          if (typeof K.runWhen === "function" && K.runWhen(B) === !1) return;
          Y = Y && K.synchronous, D.unshift(K.fulfilled, K.rejected)
      });
let W: any = [];
      this.interceptors.response.forEach(function C(K): any {
          W.push(K.fulfilled, K.rejected)
      });
      let J, F = 0,
          X;
      if (!Y) {
let C: any = [S61.bind(this), void 0];
          C.unshift.apply(C, D), C.push.apply(C, W), X = C.length, J = Promise.resolve(B);
          while (F < X) J = J.then(C[F++], C[F++]);
          return J
      }
      X = D.length;
let V: any = B;
      F = 0;
      while (F < X) {
let C: any = D[F++],
              K = D[F++];
          try {
              V = C(V)
          } catch (E) {
              K.call(this, E);
              break
          }
      }
      try {
          J = S61.call(this, V)
      } catch (C) {
          return Promise.reject(C)
      }
      F = 0, X = W.length;
      while (F < X) J = J.then(W[F++], W[F++]);
      return J
  }
  getUri(A) {
      A = IC(this.defaults, A);
let B: any = aP(A.baseURL, A.url, A.allowAbsoluteUrls);
      return nP(B, A.params, A.paramsSerializer)
  }
}


// bM1 - Lines 6827-6884
class bM1 {
class bM1 {
  constructor(A) {
      if (typeof A !== "function") throw new TypeError("executor must be a function.");
      let B;
      this.promise = new Promise(function I(G): any {
          B = G
      });
let Q: any = this;
      this.promise.then((I) => {
          if (!Q._listeners) return;
let G: any = Q._listeners.length;
          while (G-- > 0) Q._listeners[G](I);
          Q._listeners = null
      }), this.promise.then = (I) => {
          let G, Z = new Promise((D) => {
              Q.subscribe(D), G = D
          }).then(I);
          return Z.cancel = function D(): any {
              Q.unsubscribe(G)
          }, Z
      }, A(function I(G, Z, D): any {
          if (Q.reason) return;
          Q.reason = new GJ(G, Z, D), B(Q.reason)
      })
  }
  throwIfRequested() {
      if (this.reason) throw this.reason
  }
  subscribe(A) {
      if (this.reason) {
          A(this.reason);
          return
      }
      if (this._listeners) this._listeners.push(A);
      else this._listeners = [A]
  }
  unsubscribe(A) {
      if (!this._listeners) return;
let B: any = this._listeners.indexOf(A);
      if (B !== -1) this._listeners.splice(B, 1)
  }
  toAbortSignal() {
let A: any = new AbortController,
          B = (Q) => {
              A.abort(Q)
          };
      return this.subscribe(B), A.signal.unsubscribe = () => this.unsubscribe(B), A.signal
  }
  static source() {
      let A;
      return {
          token: new bM1(function Q(I): any {
              A = I
          }),
          cancel: A
      }
  }
}


// It - Lines 30103-30457
class It {
class It {
  constructor() {
      iX.add(this), this.messages = [], this.receivedMessages = [], nR.set(this, void 0), this.controller = new AbortController, to.set(this, void 0), TJ1.set(this, () => {}), eo.set(this, () => {}), At.set(this, void 0), PJ1.set(this, () => {}), Bt.set(this, () => {}), Q$.set(this, {}), Qt.set(this, !1), SJ1.set(this, !1), _J1.set(this, !1), Mm.set(this, !1), jJ1.set(this, void 0), yJ1.set(this, void 0), ec1.set(this, (A) => {
          if (Q4(this, SJ1, !0, "f"), tN(A)) A = new _I;
          if (A instanceof _I) return Q4(this, _J1, !0, "f"), this._emit("abort", A);
          if (A instanceof P9) return this._emit("error", A);
          if (A instanceof Error) {
let B: any = new P9(A.message);
              return B.cause = A, this._emit("error", B)
          }
          return this._emit("error", new P9(String(A)))
      }), Q4(this, to, new Promise((A, B) => {
          Q4(this, TJ1, A, "f"), Q4(this, eo, B, "f")
      }), "f"), Q4(this, At, new Promise((A, B) => {
          Q4(this, PJ1, A, "f"), Q4(this, Bt, B, "f")
      }), "f"), X0(this, to, "f").catch(() => {}), X0(this, At, "f").catch(() => {})
  }
  get response() {
      return X0(this, jJ1, "f")
  }
  get request_id() {
      return X0(this, yJ1, "f")
  }
  async withResponse() {
let A: any = await X0(this, to, "f");
      if (!A) throw new Error("Could not resolve a `Response` object");
      return {
          data: this,
          response: A,
          request_id: A.headers.get("request-id")
      }
  }
  static fromReadableStream(A) {
let B: any = new It;
      return B._run(() => B._fromReadableStream(A)), B
  }
  static createMessage(A, B, Q) {
let I: any = new It;
      for (let G of B.messages) I._addMessageParam(G);
      return I._run(() => I._createMessage(A, { ...B,
          stream: !0
      }, { ...Q,
          headers: { ...Q ? .headers,
              "X-Stainless-Helper-Method" : "stream"
          }
      })), I
  }
  _run(A) {
      A().then(() => {
          this._emitFinal(), this._emit("end")
      }, X0(this, ec1, "f"))
  }
  _addMessageParam(A) {
      this.messages.push(A)
  }
  _addMessage(A, B = !0) {
      if (this.receivedMessages.push(A), B) this._emit("message", A)
  }
  async _createMessage(A, B, Q) {
let I: any = Q ? .signal;
      if (I) {
          if (I.aborted) this.controller.abort();
          I.addEventListener("abort", () => this.controller.abort())
      }
      X0(this, iX, "m", Al1).call(this);
      let {
          response: G,
          data: Z
      } = await A.create({ ...B,
          stream: !0
      }, { ...Q,
          signal: this.controller.signal
      }).withResponse();
      this._connected(G);
      for await (let D of Z) X0(this, iX, "m", Bl1).call(this, D);
      if (Z.controller.signal ? .aborted) throw new _I;
      X0(this, iX, "m", Ql1).call(this)
  }
  _connected(A) {
      if (this.ended) return;
      Q4(this, jJ1, A, "f"), Q4(this, yJ1, A ? .headers.get("request-id"), "f"), X0(this, TJ1, "f").call(this, A), this._emit("connect")
  }
  get ended() {
      return X0(this, Qt, "f")
  }
  get errored() {
      return X0(this, SJ1, "f")
  }
  get aborted() {
      return X0(this, _J1, "f")
  }
  abort() {
      this.controller.abort()
  }
  on(A, B) {
      return (X0(this, Q$, "f")[A] || (X0(this, Q$, "f")[A] = [])).push({
          listener: B
      }), this
  }
  off(A, B) {
let Q: any = X0(this, Q$, "f")[A];
      if (!Q) return this;
let I: any = Q.findIndex((G) => G.listener === B);
      if (I >= 0) Q.splice(I, 1);
      return this
  }
  once(A, B) {
      return (X0(this, Q$, "f")[A] || (X0(this, Q$, "f")[A] = [])).push({
          listener: B,
          once: !0
      }), this
  }
  emitted(A) {
      return new Promise((B, Q) => {
          if (Q4(this, Mm, !0, "f"), A !== "error") this.once("error", Q);
          this.once(A, B)
      })
  }
  async done() {
      Q4(this, Mm, !0, "f"), await X0(this, At, "f")
  }
  get currentMessage() {
      return X0(this, nR, "f")
  }
  async finalMessage() {
      return await this.done(), X0(this, iX, "m", tc1).call(this)
  }
  async finalText() {
      return await this.done(), X0(this, iX, "m", is0).call(this)
  }
  _emit(A, ...B) {
      if (X0(this, Qt, "f")) return;
      if (A === "end") Q4(this, Qt, !0, "f"), X0(this, PJ1, "f").call(this);
let Q: any = X0(this, Q$, "f")[A];
      if (Q) X0(this, Q$, "f")[A] = Q.filter((I) => !I.once), Q.forEach(({
          listener: I
      }) => I(...B));
      if (A === "abort") {
let I: any = B[0];
          if (!X0(this, Mm, "f") && !Q ? .length) Promise.reject(I);
          X0(this, eo, "f").call(this, I), X0(this, Bt, "f").call(this, I), this._emit("end");
          return
      }
      if (A === "error") {
let I: any = B[0];
          if (!X0(this, Mm, "f") && !Q ? .length) Promise.reject(I);
          X0(this, eo, "f").call(this, I), X0(this, Bt, "f").call(this, I), this._emit("end")
      }
  }
  _emitFinal() {
      if (this.receivedMessages.at(-1)) this._emit("finalMessage", X0(this, iX, "m", tc1).call(this))
  }
  async _fromReadableStream(A, B) {
let Q: any = B ? .signal;
      if (Q) {
          if (Q.aborted) this.controller.abort();
          Q.addEventListener("abort", () => this.controller.abort())
      }
      X0(this, iX, "m", Al1).call(this), this._connected(null);
let I: any = bD.fromReadableStream(A, this.controller);
      for await (let G of I) X0(this, iX, "m", Bl1).call(this, G);
      if (I.controller.signal ? .aborted) throw new _I;
      X0(this, iX, "m", Ql1).call(this)
  }[(nR = new WeakMap, to = new WeakMap, TJ1 = new WeakMap, eo = new WeakMap, At = new WeakMap, PJ1 = new WeakMap, Bt = new WeakMap, Q$ = new WeakMap, Qt = new WeakMap, SJ1 = new WeakMap, _J1 = new WeakMap, Mm = new WeakMap, jJ1 = new WeakMap, yJ1 = new WeakMap, ec1 = new WeakMap, iX = new WeakSet, tc1 = function A(): any {
      if (this.receivedMessages.length === 0) throw new P9("stream ended without producing a Message with role=assistant");
      return this.receivedMessages.at(-1)
  }, is0 = function A(): any {
      if (this.receivedMessages.length === 0) throw new P9("stream ended without producing a Message with role=assistant");
let B: any = this.receivedMessages.at(-1).content.filter((Q) => Q.type === "text").map((Q) => Q.text);
      if (B.length === 0) throw new P9("stream ended without producing a content block with type=text");
      return B.join(" ")
  }, Al1 = function A(): any {
      if (this.ended) return;
      Q4(this, nR, void 0, "f")
  }, Bl1 = function A(B): any {
      if (this.ended) return;
let Q: any = X0(this, iX, "m", ns0).call(this, B);
      switch (this._emit("streamEvent", B, Q), B.type) {
          case "content_block_delta":
              {
let I: any = Q.content.at(-1);
                  switch (B.delta.type) {
                      case "text_delta":
                          {
                              if (I.type === "text") this._emit("text", B.delta.text, I.text || "");
                              break
                          }
                      case "citations_delta":
                          {
                              if (I.type === "text") this._emit("citation", B.delta.citation, I.citations ? ? []);
                              break
                          }
                      case "input_json_delta":
                          {
                              if (I.type === "tool_use" && I.input) this._emit("inputJson", B.delta.partial_json, I.input);
                              break
                          }
                      case "thinking_delta":
                          {
                              if (I.type === "thinking") this._emit("thinking", B.delta.thinking, I.thinking);
                              break
                          }
                      case "signature_delta":
                          {
                              if (I.type === "thinking") this._emit("signature", I.signature);
                              break
                          }
                      default:
                          ss0(B.delta)
                  }
                  break
              }
          case "message_stop":
              {
                  this._addMessageParam(Q),
                  this._addMessage(Q, !0);
                  break
              }
          case "content_block_stop":
              {
                  this._emit("contentBlock", Q.content.at(-1));
                  break
              }
          case "message_start":
              {
                  Q4(this, nR, Q, "f");
                  break
              }
          case "content_block_start":
          case "message_delta":
              break
      }
  }, Ql1 = function A(): any {
      if (this.ended) throw new P9("stream has ended, this shouldn't happen");
let B: any = X0(this, nR, "f");
      if (!B) throw new P9("request ended without sending any chunks");
      return Q4(this, nR, void 0, "f"), B
  }, ns0 = function A(B): any {
let Q: any = X0(this, nR, "f");
      if (B.type === "message_start") {
          if (Q) throw new P9(`Unexpected event order, got ${B.type} before receiving "message_stop"`);
          return B.message
      }
      if (!Q) throw new P9(`Unexpected event order, got ${B.type} before "message_start"`);
      switch (B.type) {
          case "message_stop":
              return Q;
          case "message_delta":
              if (Q.stop_reason = B.delta.stop_reason, Q.stop_sequence = B.delta.stop_sequence, Q.usage.output_tokens = B.usage.output_tokens, B.usage.input_tokens != null) Q.usage.input_tokens = B.usage.input_tokens;
              if (B.usage.cache_creation_input_tokens != null) Q.usage.cache_creation_input_tokens = B.usage.cache_creation_input_tokens;
              if (B.usage.cache_read_input_tokens != null) Q.usage.cache_read_input_tokens = B.usage.cache_read_input_tokens;
              if (B.usage.server_tool_use != null) Q.usage.server_tool_use = B.usage.server_tool_use;
              return Q;
          case "content_block_start":
              return Q.content.push(B.content_block), Q;
          case "content_block_delta":
              {
let I: any = Q.content.at(B.index);
                  switch (B.delta.type) {
                      case "text_delta":
                          {
                              if (I ? .type === "text") I.text += B.delta.text;
                              break
                          }
                      case "citations_delta":
                          {
                              if (I ? .type === "text") I.citations ? ? (I.citations = []),
                              I.citations.push(B.delta.citation);
                              break
                          }
                      case "input_json_delta":
                          {
                              if (I ? .type === "tool_use") {
let G: any = I[as0] || "";
                                  if (G += B.delta.partial_json, Object.defineProperty(I, as0, {
                                          value: G,
                                          enumerable: !1,
                                          writable: !0
                                      }), G) I.input = OJ1(G)
                              }
                              break
                          }
                      case "thinking_delta":
                          {
                              if (I ? .type === "thinking") I.thinking += B.delta.thinking;
                              break
                          }
                      case "signature_delta":
                          {
                              if (I ? .type === "thinking") I.signature = B.delta.signature;
                              break
                          }
                      default:
                          ss0(B.delta)
                  }
                  return Q
              }
          case "content_block_stop":
              return Q
      }
  }, Symbol.asyncIterator)]() {
let A: any = [],
          B = [],
          Q = !1;
      return this.on("streamEvent", (I) => {
let G: any = B.shift();
          if (G) G.resolve(I);
          else A.push(I)
      }), this.on("end", () => {
          Q = !0;
          for (let I of B) I.resolve(void 0);
          B.length = 0
      }), this.on("abort", (I) => {
          Q = !0;
          for (let G of B) G.reject(I);
          B.length = 0
      }), this.on("error", (I) => {
          Q = !0;
          for (let G of B) G.reject(I);
          B.length = 0
      }), {
          next: async () => {
              if (!A.length) {
                  if (Q) return {
                      value: void 0,
                      done: !0
                  };
                  return new Promise((G, Z) => B.push({
                      resolve: G,
                      reject: Z
                  })).then((G) => G ? {
                      value: G,
                      done: !1
                  } : {
                      value: void 0,
                      done: !0
                  })
              }
              return {
                  value: A.shift(),
                  done: !1
              }
          },
          return: async () => {
              return this.abort(), {
                  value: void 0,
                  done: !0
              }
          }
      }
  }
  toReadableStream() {
      return new bD(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream()
  }
}


// Lm - Lines 30470-30509
class Lm extends kG {
class Lm extends kG {
  constructor() {
      super(...arguments);
      this.batches = new oo(this._client)
  }
  create(A, B) {
      let {
          betas: Q,
          ...I
      } = A;
      if (I.model in rs0) console.warn(`The model '${I.model}' is deprecated and will reach end-of-life on ${rs0[I.model]}
Please migrate to a newer model. Visit https://docs.elizaos.ai/en/docs/resources/model-deprecations for more information.`);
      return this._client.post("/v1/messages?beta=true", {
          body: I,
          timeout: this._client._options.timeout ? ? (I.stream ? 600000 : this._client._calculateNonstreamingTimeout(I.max_tokens)),
          ...B,
          headers: YB([{ ...Q ? .toString() != null ? {
                  "anthropic-beta": Q ? .toString()
              } : void 0
          }, B ? .headers]),
          stream: A.stream ? ? !1
      })
  }
  stream(A, B) {
      return It.createMessage(this, A, B)
  }
  countTokens(A, B) {
      let {
          betas: Q,
          ...I
      } = A;
      return this._client.post("/v1/messages/count_tokens?beta=true", {
          body: I,
          ...B,
          headers: YB([{
              "anthropic-beta": [...Q ? ? [], "token-counting-2024-11-01"].toString()
          }, B ? .headers])
      })
  }
}


// Om - Lines 30572-30926
class Om {
class Om {
  constructor() {
      aX.add(this), this.messages = [], this.receivedMessages = [], sR.set(this, void 0), this.controller = new AbortController, Zt.set(this, void 0), kJ1.set(this, () => {}), Dt.set(this, () => {}), Yt.set(this, void 0), xJ1.set(this, () => {}), Wt.set(this, () => {}), I$.set(this, {}), Jt.set(this, !1), fJ1.set(this, !1), vJ1.set(this, !1), Rm.set(this, !1), bJ1.set(this, void 0), gJ1.set(this, void 0), Gl1.set(this, (A) => {
          if (Q4(this, fJ1, !0, "f"), tN(A)) A = new _I;
          if (A instanceof _I) return Q4(this, vJ1, !0, "f"), this._emit("abort", A);
          if (A instanceof P9) return this._emit("error", A);
          if (A instanceof Error) {
let B: any = new P9(A.message);
              return B.cause = A, this._emit("error", B)
          }
          return this._emit("error", new P9(String(A)))
      }), Q4(this, Zt, new Promise((A, B) => {
          Q4(this, kJ1, A, "f"), Q4(this, Dt, B, "f")
      }), "f"), Q4(this, Yt, new Promise((A, B) => {
          Q4(this, xJ1, A, "f"), Q4(this, Wt, B, "f")
      }), "f"), X0(this, Zt, "f").catch(() => {}), X0(this, Yt, "f").catch(() => {})
  }
  get response() {
      return X0(this, bJ1, "f")
  }
  get request_id() {
      return X0(this, gJ1, "f")
  }
  async withResponse() {
let A: any = await X0(this, Zt, "f");
      if (!A) throw new Error("Could not resolve a `Response` object");
      return {
          data: this,
          response: A,
          request_id: A.headers.get("request-id")
      }
  }
  static fromReadableStream(A) {
let B: any = new Om;
      return B._run(() => B._fromReadableStream(A)), B
  }
  static createMessage(A, B, Q) {
let I: any = new Om;
      for (let G of B.messages) I._addMessageParam(G);
      return I._run(() => I._createMessage(A, { ...B,
          stream: !0
      }, { ...Q,
          headers: { ...Q ? .headers,
              "X-Stainless-Helper-Method" : "stream"
          }
      })), I
  }
  _run(A) {
      A().then(() => {
          this._emitFinal(), this._emit("end")
      }, X0(this, Gl1, "f"))
  }
  _addMessageParam(A) {
      this.messages.push(A)
  }
  _addMessage(A, B = !0) {
      if (this.receivedMessages.push(A), B) this._emit("message", A)
  }
  async _createMessage(A, B, Q) {
let I: any = Q ? .signal;
      if (I) {
          if (I.aborted) this.controller.abort();
          I.addEventListener("abort", () => this.controller.abort())
      }
      X0(this, aX, "m", Zl1).call(this);
      let {
          response: G,
          data: Z
      } = await A.create({ ...B,
          stream: !0
      }, { ...Q,
          signal: this.controller.signal
      }).withResponse();
      this._connected(G);
      for await (let D of Z) X0(this, aX, "m", Dl1).call(this, D);
      if (Z.controller.signal ? .aborted) throw new _I;
      X0(this, aX, "m", Yl1).call(this)
  }
  _connected(A) {
      if (this.ended) return;
      Q4(this, bJ1, A, "f"), Q4(this, gJ1, A ? .headers.get("request-id"), "f"), X0(this, kJ1, "f").call(this, A), this._emit("connect")
  }
  get ended() {
      return X0(this, Jt, "f")
  }
  get errored() {
      return X0(this, fJ1, "f")
  }
  get aborted() {
      return X0(this, vJ1, "f")
  }
  abort() {
      this.controller.abort()
  }
  on(A, B) {
      return (X0(this, I$, "f")[A] || (X0(this, I$, "f")[A] = [])).push({
          listener: B
      }), this
  }
  off(A, B) {
let Q: any = X0(this, I$, "f")[A];
      if (!Q) return this;
let I: any = Q.findIndex((G) => G.listener === B);
      if (I >= 0) Q.splice(I, 1);
      return this
  }
  once(A, B) {
      return (X0(this, I$, "f")[A] || (X0(this, I$, "f")[A] = [])).push({
          listener: B,
          once: !0
      }), this
  }
  emitted(A) {
      return new Promise((B, Q) => {
          if (Q4(this, Rm, !0, "f"), A !== "error") this.once("error", Q);
          this.once(A, B)
      })
  }
  async done() {
      Q4(this, Rm, !0, "f"), await X0(this, Yt, "f")
  }
  get currentMessage() {
      return X0(this, sR, "f")
  }
  async finalMessage() {
      return await this.done(), X0(this, aX, "m", Il1).call(this)
  }
  async finalText() {
      return await this.done(), X0(this, aX, "m", os0).call(this)
  }
  _emit(A, ...B) {
      if (X0(this, Jt, "f")) return;
      if (A === "end") Q4(this, Jt, !0, "f"), X0(this, xJ1, "f").call(this);
let Q: any = X0(this, I$, "f")[A];
      if (Q) X0(this, I$, "f")[A] = Q.filter((I) => !I.once), Q.forEach(({
          listener: I
      }) => I(...B));
      if (A === "abort") {
let I: any = B[0];
          if (!X0(this, Rm, "f") && !Q ? .length) Promise.reject(I);
          X0(this, Dt, "f").call(this, I), X0(this, Wt, "f").call(this, I), this._emit("end");
          return
      }
      if (A === "error") {
let I: any = B[0];
          if (!X0(this, Rm, "f") && !Q ? .length) Promise.reject(I);
          X0(this, Dt, "f").call(this, I), X0(this, Wt, "f").call(this, I), this._emit("end")
      }
  }
  _emitFinal() {
      if (this.receivedMessages.at(-1)) this._emit("finalMessage", X0(this, aX, "m", Il1).call(this))
  }
  async _fromReadableStream(A, B) {
let Q: any = B ? .signal;
      if (Q) {
          if (Q.aborted) this.controller.abort();
          Q.addEventListener("abort", () => this.controller.abort())
      }
      X0(this, aX, "m", Zl1).call(this), this._connected(null);
let I: any = bD.fromReadableStream(A, this.controller);
      for await (let G of I) X0(this, aX, "m", Dl1).call(this, G);
      if (I.controller.signal ? .aborted) throw new _I;
      X0(this, aX, "m", Yl1).call(this)
  }[(sR = new WeakMap, Zt = new WeakMap, kJ1 = new WeakMap, Dt = new WeakMap, Yt = new WeakMap, xJ1 = new WeakMap, Wt = new WeakMap, I$ = new WeakMap, Jt = new WeakMap, fJ1 = new WeakMap, vJ1 = new WeakMap, Rm = new WeakMap, bJ1 = new WeakMap, gJ1 = new WeakMap, Gl1 = new WeakMap, aX = new WeakSet, Il1 = function A(): any {
      if (this.receivedMessages.length === 0) throw new P9("stream ended without producing a Message with role=assistant");
      return this.receivedMessages.at(-1)
  }, os0 = function A(): any {
      if (this.receivedMessages.length === 0) throw new P9("stream ended without producing a Message with role=assistant");
let B: any = this.receivedMessages.at(-1).content.filter((Q) => Q.type === "text").map((Q) => Q.text);
      if (B.length === 0) throw new P9("stream ended without producing a content block with type=text");
      return B.join(" ")
  }, Zl1 = function A(): any {
      if (this.ended) return;
      Q4(this, sR, void 0, "f")
  }, Dl1 = function A(B): any {
      if (this.ended) return;
let Q: any = X0(this, aX, "m", ts0).call(this, B);
      switch (this._emit("streamEvent", B, Q), B.type) {
          case "content_block_delta":
              {
let I: any = Q.content.at(-1);
                  switch (B.delta.type) {
                      case "text_delta":
                          {
                              if (I.type === "text") this._emit("text", B.delta.text, I.text || "");
                              break
                          }
                      case "citations_delta":
                          {
                              if (I.type === "text") this._emit("citation", B.delta.citation, I.citations ? ? []);
                              break
                          }
                      case "input_json_delta":
                          {
                              if (I.type === "tool_use" && I.input) this._emit("inputJson", B.delta.partial_json, I.input);
                              break
                          }
                      case "thinking_delta":
                          {
                              if (I.type === "thinking") this._emit("thinking", B.delta.thinking, I.thinking);
                              break
                          }
                      case "signature_delta":
                          {
                              if (I.type === "thinking") this._emit("signature", I.signature);
                              break
                          }
                      default:
                          Ar0(B.delta)
                  }
                  break
              }
          case "message_stop":
              {
                  this._addMessageParam(Q),
                  this._addMessage(Q, !0);
                  break
              }
          case "content_block_stop":
              {
                  this._emit("contentBlock", Q.content.at(-1));
                  break
              }
          case "message_start":
              {
                  Q4(this, sR, Q, "f");
                  break
              }
          case "content_block_start":
          case "message_delta":
              break
      }
  }, Yl1 = function A(): any {
      if (this.ended) throw new P9("stream has ended, this shouldn't happen");
let B: any = X0(this, sR, "f");
      if (!B) throw new P9("request ended without sending any chunks");
      return Q4(this, sR, void 0, "f"), B
  }, ts0 = function A(B): any {
let Q: any = X0(this, sR, "f");
      if (B.type === "message_start") {
          if (Q) throw new P9(`Unexpected event order, got ${B.type} before receiving "message_stop"`);
          return B.message
      }
      if (!Q) throw new P9(`Unexpected event order, got ${B.type} before "message_start"`);
      switch (B.type) {
          case "message_stop":
              return Q;
          case "message_delta":
              if (Q.stop_reason = B.delta.stop_reason, Q.stop_sequence = B.delta.stop_sequence, Q.usage.output_tokens = B.usage.output_tokens, B.usage.input_tokens != null) Q.usage.input_tokens = B.usage.input_tokens;
              if (B.usage.cache_creation_input_tokens != null) Q.usage.cache_creation_input_tokens = B.usage.cache_creation_input_tokens;
              if (B.usage.cache_read_input_tokens != null) Q.usage.cache_read_input_tokens = B.usage.cache_read_input_tokens;
              if (B.usage.server_tool_use != null) Q.usage.server_tool_use = B.usage.server_tool_use;
              return Q;
          case "content_block_start":
              return Q.content.push(B.content_block), Q;
          case "content_block_delta":
              {
let I: any = Q.content.at(B.index);
                  switch (B.delta.type) {
                      case "text_delta":
                          {
                              if (I ? .type === "text") I.text += B.delta.text;
                              break
                          }
                      case "citations_delta":
                          {
                              if (I ? .type === "text") I.citations ? ? (I.citations = []),
                              I.citations.push(B.delta.citation);
                              break
                          }
                      case "input_json_delta":
                          {
                              if (I ? .type === "tool_use") {
let G: any = I[es0] || "";
                                  if (G += B.delta.partial_json, Object.defineProperty(I, es0, {
                                          value: G,
                                          enumerable: !1,
                                          writable: !0
                                      }), G) I.input = OJ1(G)
                              }
                              break
                          }
                      case "thinking_delta":
                          {
                              if (I ? .type === "thinking") I.thinking += B.delta.thinking;
                              break
                          }
                      case "signature_delta":
                          {
                              if (I ? .type === "thinking") I.signature = B.delta.signature;
                              break
                          }
                      default:
                          Ar0(B.delta)
                  }
                  return Q
              }
          case "content_block_stop":
              return Q
      }
  }, Symbol.asyncIterator)]() {
let A: any = [],
          B = [],
          Q = !1;
      return this.on("streamEvent", (I) => {
let G: any = B.shift();
          if (G) G.resolve(I);
          else A.push(I)
      }), this.on("end", () => {
          Q = !0;
          for (let I of B) I.resolve(void 0);
          B.length = 0
      }), this.on("abort", (I) => {
          Q = !0;
          for (let G of B) G.reject(I);
          B.length = 0
      }), this.on("error", (I) => {
          Q = !0;
          for (let G of B) G.reject(I);
          B.length = 0
      }), {
          next: async () => {
              if (!A.length) {
                  if (Q) return {
                      value: void 0,
                      done: !0
                  };
                  return new Promise((G, Z) => B.push({
                      resolve: G,
                      reject: Z
                  })).then((G) => G ? {
                      value: G,
                      done: !1
                  } : {
                      value: void 0,
                      done: !0
                  })
              }
              return {
                  value: A.shift(),
                  done: !1
              }
          },
          return: async () => {
              return this.abort(), {
                  value: void 0,
                  done: !0
              }
          }
      }
  }
  toReadableStream() {
      return new bD(this[Symbol.asyncIterator].bind(this), this.controller).toReadableStream()
  }
}


// WK - Lines 30929-30953
class WK extends kG {
class WK extends kG {
  constructor() {
      super(...arguments);
      this.batches = new Gt(this._client)
  }
  create(A, B) {
      if (A.model in Br0) console.warn(`The model '${A.model}' is deprecated and will reach end-of-life on ${Br0[A.model]}
Please migrate to a newer model. Visit https://docs.elizaos.ai/en/docs/resources/model-deprecations for more information.`);
      return this._client.post("/v1/messages", {
          body: A,
          timeout: this._client._options.timeout ? ? (A.stream ? 600000 : this._client._calculateNonstreamingTimeout(A.max_tokens)),
          ...B,
          stream: A.stream ? ? !1
      })
  }
  stream(A, B) {
      return Om.createMessage(this, A, B)
  }
  countTokens(A, B) {
      return this._client.post("/v1/messages/count_tokens", {
          body: A,
          ...B
      })
  }
}


// R8 - Lines 30998-31381
class R8 {
class R8 {
  constructor({
      baseURL: A = Ft("ANTHROPIC_BASE_URL"),
      apiKey: B = Ft("ANTHROPIC_API_KEY") ? ? null,
      authToken: Q = Ft("ANTHROPIC_AUTH_TOKEN") ? ? null,
      ...I
  } = {}) {
      hJ1.set(this, void 0);
let G: any = {
          apiKey: B,
          authToken: Q,
          ...I,
          baseURL: A || "https://api.elizaos.ai"
      };
      if (!G.dangerouslyAllowBrowser && Ss0()) throw new P9(`It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the \`dangerouslyAllowBrowser\` option to \`true\`, var_e.var_g.,

new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
`);
      this.baseURL = G.baseURL, this.timeout = G.timeout ? ? kw.DEFAULT_TIMEOUT, this.logger = G.logger ? ? console;
let Z: any = "warn";
      this.logLevel = Z, this.logLevel = lc1(G.logLevel, "ClientOptions.logLevel", this) ? ? lc1(Ft("ANTHROPIC_LOG"), "process.env['ANTHROPIC_LOG']", this) ? ? Z, this.fetchOptions = G.fetchOptions, this.maxRetries = G.maxRetries ? ? 2, this.fetch = G.fetch ? ? js0(), Q4(this, hJ1, ks0, "f"), this._options = G, this.apiKey = B, this.authToken = Q
  }
  withOptions(A) {
      return new this.constructor({ ...this._options,
          baseURL: this.baseURL,
          maxRetries: this.maxRetries,
          timeout: this.timeout,
          logger: this.logger,
          logLevel: this.logLevel,
          fetchOptions: this.fetchOptions,
          apiKey: this.apiKey,
          authToken: this.authToken,
          ...A
      })
  }
  defaultQuery() {
      return this._options.defaultQuery
  }
  validateHeaders({
      values: A,
      nulls: B
  }) {
      if (this.apiKey && A.get("x-api-key")) return;
      if (B.has("x-api-key")) return;
      if (this.authToken && A.get("authorization")) return;
      if (B.has("authorization")) return;
      throw new Error('Could not resolve authentication method. Expected either apiKey or authToken to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted')
  }
  authHeaders(A) {
      return YB([this.apiKeyAuth(A), this.bearerAuth(A)])
  }
  apiKeyAuth(A) {
      if (this.apiKey == null) return;
      return YB([{
          "X-Api-Key": this.apiKey
      }])
  }
  bearerAuth(A) {
      if (this.authToken == null) return;
      return YB([{
          Authorization: `Bearer ${this.authToken}`
      }])
  }
  stringifyQuery(A) {
      return Object.entries(A).filter(([B, Q]) => typeof Q !== "undefined").map(([B, Q]) => {
          if (typeof Q === "string" || typeof Q === "number" || typeof Q === "boolean") return `${encodeURIComponent(B)}=${encodeURIComponent(Q)}`;
          if (Q === null) return `${encodeURIComponent(B)}=`;
          throw new P9(`Cannot stringify type ${typeof Q}; Expected string, number, boolean, or null. If you need to pass nested query parameters, you can manually encode them, var_e.var_g. { query: { 'foo[key1]': value1, 'foo[key2]': value2 } }, and please open a GitHub issue requesting better support for your use case.`)
      }).join("&")
  }
  getUserAgent() {
      return `${this.constructor.name}/JS ${lR}`
  }
  defaultIdempotencyKey() {
      return `stainless-node-retry-${pc1()}`
  }
  makeStatusError(A, B, Q, I) {
      return p6.generate(A, B, Q, I)
  }
  buildURL(A, B) {
let Q: any = Ns0(A) ? new URL(A) : new URL(this.baseURL + (this.baseURL.endsWith("/") && A.startsWith("/") ? A.slice(1) : A)),
          I = this.defaultQuery();
      if (!$s0(I)) B = { ...I,
          ...B
      };
      if (typeof B === "object" && B && !Array.isArray(B)) Q.search = this.stringifyQuery(B);
      return Q.toString()
  }
  _calculateNonstreamingTimeout(A) {
      if (3600 * A / 128000 > 600) throw new P9("Streaming is strongly recommended for operations that may take longer than 10 minutes.");
      return 600000
  }
  async prepareOptions(A) {}
  async prepareRequest(A, {
      url: B,
      options: Q
  }) {}
  get(A, B) {
      return this.methodRequest("get", A, B)
  }
  post(A, B) {
      return this.methodRequest("post", A, B)
  }
  patch(A, B) {
      return this.methodRequest("patch", A, B)
  }
  put(A, B) {
      return this.methodRequest("put", A, B)
  }
  delete(A, B) {
      return this.methodRequest("delete", A, B)
  }
  methodRequest(A, B, Q) {
      return this.request(Promise.resolve(Q).then((I) => {
          return {
              method: A,
              path: B,
              ...I
          }
      }))
  }
  request(A, B = null) {
      return new kj(this, this.makeRequest(A, B, void 0))
  }
  async makeRequest(A, B, Q) {
let I: any = await A,
          G = I.maxRetries ? ? this.maxRetries;
      if (B == null) B = G;
      await this.prepareOptions(I);
      let {
          req: Z,
          url: D,
          timeout: Y
      } = this.buildRequest(I, {
          retryCount: G - B
      });
      await this.prepareRequest(Z, {
          url: D,
          options: I
      });
let W: any = "log_" + (Math.random() * 16777216 | 0).toString(16).padStart(6, "0"),
          J = Q === void 0 ? "" : `, retryOf: ${Q}`,
          F = Date.now();
      if (vZ(this).debug(`[${W}] sending request`, A$({
              retryOfRequestLogID: Q,
              method: I.method,
              url: D,
              options: I,
              headers: Z.headers
          })), I.signal ? .aborted) throw new _I;
let X: any = new AbortController,
          V = await this.fetchWithTimeout(D, Z, Y, X).catch(fo),
          C = Date.now();
      if (V instanceof Error) {
let N: any = `retrying, ${B} attempts remaining`;
          if (I.signal ? .aborted) throw new _I;
let query: any = tN(V) || /timed? ?out/iterator.test(String(V) + ("cause" in V ? String(V.cause) : ""));
          if (B) return vZ(this).info(`[${W}] connection ${q?"timed out":"failed"} - ${N}`), vZ(this).debug(`[${W}] connection ${q?"timed out":"failed"} (${N})`, A$({
              retryOfRequestLogID: Q,
              url: D,
              durationMs: C - F,
              message: V.message
          })), this.retryRequest(I, B, Q ? ? W);
          if (vZ(this).info(`[${W}] connection ${q?"timed out":"failed"} - error; no more retries left`), vZ(this).debug(`[${W}] connection ${q?"timed out":"failed"} (error; no more retries left)`, A$({
                  retryOfRequestLogID: Q,
                  url: D,
                  durationMs: C - F,
                  message: V.message
              })), q) throw new vo;
          throw new eN({
              cause: V
          })
      }
let K: any = [...V.headers.entries()].filter(([N]) => N === "request-id").map(([N, q]) => ", " + N + ": " + JSON.stringify(q)).join(""),
          E = `[${W}${J}${K}] ${Z.method} ${D} ${V.ok?"succeeded":"failed"} with status ${V.status} in ${C-F}ms`;
      if (!V.ok) {
let N: any = this.shouldRetry(V);
          if (B && N) {
let _: any = `retrying, ${B} attempts remaining`;
              return await ys0(V.body), vZ(this).info(`${E} - ${_}`), vZ(this).debug(`[${W}] response error (${_})`, A$({
                  retryOfRequestLogID: Q,
                  url: V.url,
                  status: V.status,
                  headers: V.headers,
                  durationMs: C - F
              })), this.retryRequest(I, B, Q ? ? W, V.headers)
          }
let query: any = N ? "error; no more retries left" : "error; not retryable";
          vZ(this).info(`${E} - ${q}`);
let O: any = await V.text().catch((_) => fo(_).message),
              R = EJ1(O),
              T = R ? void 0 : O;
          throw vZ(this).debug(`[${W}] response error (${q})`, A$({
              retryOfRequestLogID: Q,
              url: V.url,
              status: V.status,
              headers: V.headers,
              message: T,
              durationMs: Date.now() - F
          })), this.makeStatusError(V.status, R, T, V.headers)
      }
      return vZ(this).info(E), vZ(this).debug(`[${W}] response start`, A$({
          retryOfRequestLogID: Q,
          url: V.url,
          status: V.status,
          headers: V.headers,
          durationMs: C - F
      })), {
          response: V,
          options: I,
          controller: X,
          requestLogID: W,
          retryOfRequestLogID: Q,
          startTime: F
      }
  }
  getAPIList(A, B, Q) {
      return this.requestAPIList(B, {
          method: "get",
          path: A,
          ...Q
      })
  }
  requestAPIList(A, B) {
let Q: any = this.makeRequest(B, null, void 0);
      return new MJ1(this, Q, A)
  }
  async fetchWithTimeout(A, B, Q, I) {
      let {
          signal: G,
          method: Z,
          ...D
      } = B || {};
      if (G) G.addEventListener("abort", () => I.abort());
let Y: any = setTimeout(() => I.abort(), Q),
          W = globalThis.ReadableStream && D.body instanceof globalThis.ReadableStream || typeof D.body === "object" && D.body !== null && Symbol.asyncIterator in D.body,
          J = {
              signal: I.signal,
              ...W ? {
                  duplex: "half"
              } : {},
              method: "GET",
              ...D
          };
      if (Z) J.method = Z.toUpperCase();
      try {
          return await this.fetch.call(void 0, A, J)
      } finally {
          clearTimeout(Y)
      }
  }
  shouldRetry(A) {
let B: any = A.headers.get("x-should-retry");
      if (B === "true") return !0;
      if (B === "false") return !1;
      if (A.status === 408) return !0;
      if (A.status === 409) return !0;
      if (A.status === 429) return !0;
      if (A.status >= 500) return !0;
      return !1
  }
  async retryRequest(A, B, Q, I) {
      let G, Z = I ? .get("retry-after-ms");
      if (Z) {
let Y: any = parseFloat(Z);
          if (!Number.isNaN(Y)) G = Y
      }
let D: any = I ? .get("retry-after");
      if (D && !G) {
let Y: any = parseFloat(D);
          if (!Number.isNaN(Y)) G = Y * 1000;
          else G = Date.parse(D) - Date.now()
      }
      if (!(G && 0 <= G && G < 60000)) {
let Y: any = A.maxRetries ? ? this.maxRetries;
          G = this.calculateDefaultRetryTimeoutMillis(B, Y)
      }
      return await Ls0(G), this.makeRequest(A, B - 1, Q)
  }
  calculateDefaultRetryTimeoutMillis(A, B) {
let G: any = B - A,
          Z = Math.min(0.5 * Math.pow(2, G), 8),
          D = 1 - Math.random() * 0.25;
      return Z * D * 1000
  }
  buildRequest(A, {
      retryCount: B = 0
  } = {}) {
let Q: any = { ...A
          },
          {
              method: I,
              path: G,
              query: Z
          } = Q,
          D = this.buildURL(G, Z);
      if ("timeout" in Q) Ms0("timeout", Q.timeout);
      Q.timeout = Q.timeout ? ? this.timeout;
      let {
          bodyHeaders: Y,
          body: W
      } = this.buildBody({
          options: Q
      }), J = this.buildHeaders({
          options: A,
          method: I,
          bodyHeaders: Y,
          retryCount: B
      });
      return {
          req: {
              method: I,
              headers: J,
              ...Q.signal && {
                  signal: Q.signal
              },
              ...globalThis.ReadableStream && W instanceof globalThis.ReadableStream && {
                  duplex: "half"
              },
              ...W && {
                  body: W
              },
              ...this.fetchOptions ? ? {},
              ...Q.fetchOptions ? ? {}
          },
          url: D,
          timeout: Q.timeout
      }
  }
  buildHeaders({
      options: A,
      method: B,
      bodyHeaders: Q,
      retryCount: I
  }) {
let G: any = {};
      if (this.idempotencyHeader && B !== "get") {
          if (!A.idempotencyKey) A.idempotencyKey = this.defaultIdempotencyKey();
          G[this.idempotencyHeader] = A.idempotencyKey
      }
let Z: any = YB([G, {
          Accept: "application/json",
          "User-Agent": this.getUserAgent(),
          "X-Stainless-Retry-Count": String(I),
          ...A.timeout ? {
              "X-Stainless-Timeout": String(Math.trunc(A.timeout / 1000))
          } : {},
          ..._s0(),
          ...this._options.dangerouslyAllowBrowser ? {
              "anthropic-dangerous-direct-browser-access": "true"
          } : void 0,
          "anthropic-version": "2023-06-01"
      }, this.authHeaders(A), this._options.defaultHeaders, Q, A.headers]);
      return this.validateHeaders(Z), Z.values
  }
  buildBody({
      options: {
          body: A,
          headers: B
      }
  }) {
      if (!A) return {
          bodyHeaders: void 0,
          body: void 0
      };
let Q: any = YB([B]);
      if (ArrayBuffer.isView(A) || A instanceof ArrayBuffer || A instanceof DataView || typeof A === "string" && Q.values.has("content-type") || A instanceof Blob || A instanceof FormData || A instanceof URLSearchParams || globalThis.ReadableStream && A instanceof globalThis.ReadableStream) return {
          bodyHeaders: void 0,
          body: A
      };
      else if (typeof A === "object" && ((Symbol.asyncIterator in A) || (Symbol.iterator in A) && ("next" in A) && typeof A.next === "function")) return {
          bodyHeaders: void 0,
          body: nc1(A)
      };
      else return X0(this, hJ1, "f").call(this, {
          body: A,
          headers: Q
      })
  }
}


// wt - Lines 31867-32112
class wt {
class wt {
  constructor(A) {
      this._options = A, this._requestMessageId = 0, this._requestHandlers = new Map, this._requestHandlerAbortControllers = new Map, this._notificationHandlers = new Map, this._responseHandlers = new Map, this._progressHandlers = new Map, this._timeoutInfo = new Map, this.setNotificationHandler(aJ1, (B) => {
let Q: any = this._requestHandlerAbortControllers.get(B.params.requestId);
          Q === null || Q === void 0 || Q.abort(B.params.reason)
      }), this.setNotificationHandler(oJ1, (B) => {
          this._onprogress(B)
      }), this.setRequestHandler(rJ1, (B) => ({}))
  }
  _setupTimeout(A, B, Q, I, G = !1) {
      this._timeoutInfo.set(A, {
          timeoutId: setTimeout(I, B),
          startTime: Date.now(),
          timeout: B,
          maxTotalTimeout: Q,
          resetTimeoutOnProgress: G,
          onTimeout: I
      })
  }
  _resetTimeout(A) {
let B: any = this._timeoutInfo.get(A);
      if (!B) return !1;
let Q: any = Date.now() - B.startTime;
      if (B.maxTotalTimeout && Q >= B.maxTotalTimeout) throw this._timeoutInfo.delete(A), new _m(rR.RequestTimeout, "Maximum total timeout exceeded", {
          maxTotalTimeout: B.maxTotalTimeout,
          totalElapsed: Q
      });
      return clearTimeout(B.timeoutId), B.timeoutId = setTimeout(B.onTimeout, B.timeout), !0
  }
  _cleanupTimeout(A) {
let B: any = this._timeoutInfo.get(A);
      if (B) clearTimeout(B.timeoutId), this._timeoutInfo.delete(A)
  }
  async connect(A) {
      this._transport = A, this._transport.onclose = () => {
          this._onclose()
      }, this._transport.onerror = (B) => {
          this._onerror(B)
      }, this._transport.onmessage = (B, Q) => {
          if (Ct(B) || Vr0(B)) this._onresponse(B);
          else if (nJ1(B)) this._onrequest(B, Q);
          else if (Jr0(B)) this._onnotification(B);
          else this._onerror(new Error(`Unknown message type: ${JSON.stringify(B)}`))
      }, await this._transport.start()
  }
  _onclose() {
      var A;
let B: any = this._responseHandlers;
      this._responseHandlers = new Map, this._progressHandlers.clear(), this._transport = void 0, (A = this.onclose) === null || A === void 0 || A.call(this);
let Q: any = new _m(rR.ConnectionClosed, "Connection closed");
      for (let I of B.values()) I(Q)
  }
  _onerror(A) {
      var B;
      (B = this.onerror) === null || B === void 0 || B.call(this, A)
  }
  _onnotification(A) {
      var B;
let Q: any = (B = this._notificationHandlers.get(A.method)) !== null && B !== void 0 ? B : this.fallbackNotificationHandler;
      if (Q === void 0) return;
      Promise.resolve().then(() => Q(A)).catch((I) => this._onerror(new Error(`Uncaught error in notification handler: ${I}`)))
  }
  _onrequest(A, B) {
      var Q, I, G, Z;
let D: any = (Q = this._requestHandlers.get(A.method)) !== null && Q !== void 0 ? Q : this.fallbackRequestHandler;
      if (D === void 0) {
          (I = this._transport) === null || I === void 0 || I.send({
              jsonrpc: "2.0",
              id: A.id,
              error: {
                  code: rR.MethodNotFound,
                  message: "Method not found"
              }
          }).catch((J) => this._onerror(new Error(`Failed to send an error response: ${J}`)));
          return
      }
let Y: any = new AbortController;
      this._requestHandlerAbortControllers.set(A.id, Y);
let W: any = {
          signal: Y.signal,
          sessionId: (G = this._transport) === null || G === void 0 ? void 0 : G.sessionId,
          _meta: (Z = A.params) === null || Z === void 0 ? void 0 : Z._meta,
          sendNotification: (J) => this.notification(J, {
              relatedRequestId: A.id
          }),
          sendRequest: (J, F, X) => this.request(J, F, { ...X,
              relatedRequestId: A.id
          }),
          authInfo: B === null || B === void 0 ? void 0 : B.authInfo,
          requestId: A.id
      };
      Promise.resolve().then(() => D(A, W)).then((J) => {
          var F;
          if (Y.signal.aborted) return;
          return (F = this._transport) === null || F === void 0 ? void 0 : F.send({
              result: J,
              jsonrpc: "2.0",
              id: A.id
          })
      }, (J) => {
          var F, X;
          if (Y.signal.aborted) return;
          return (F = this._transport) === null || F === void 0 ? void 0 : F.send({
              jsonrpc: "2.0",
              id: A.id,
              error: {
                  code: Number.isSafeInteger(J.code) ? J.code : rR.InternalError,
                  message: (X = J.message) !== null && X !== void 0 ? X : "Internal error"
              }
          })
      }).catch((J) => this._onerror(new Error(`Failed to send response: ${J}`))).finally(() => {
          this._requestHandlerAbortControllers.delete(A.id)
      })
  }
  _onprogress(A) {
      let {
          progressToken: B,
          ...Q
      } = A.params, I = Number(B), G = this._progressHandlers.get(I);
      if (!G) {
          this._onerror(new Error(`Received a progress notification for an unknown token: ${JSON.stringify(A)}`));
          return
      }
let Z: any = this._responseHandlers.get(I),
          D = this._timeoutInfo.get(I);
      if (D && Z && D.resetTimeoutOnProgress) try {
          this._resetTimeout(I)
      } catch (Y) {
          Z(Y);
          return
      }
      G(Q)
  }
  _onresponse(A) {
let B: any = Number(A.id),
          Q = this._responseHandlers.get(B);
      if (Q === void 0) {
          this._onerror(new Error(`Received a response for an unknown message ID: ${JSON.stringify(A)}`));
          return
      }
      if (this._responseHandlers.delete(B), this._progressHandlers.delete(B), this._cleanupTimeout(B), Ct(A)) Q(A);
      else {
let I: any = new _m(A.error.code, A.error.message, A.error.data);
          Q(I)
      }
  }
  get transport() {
      return this._transport
  }
  async close() {
      var A;
      await ((A = this._transport) === null || A === void 0 ? void 0 : A.close())
  }
  request(A, B, Q) {
      let {
          relatedRequestId: I,
          resumptionToken: G,
          onresumptiontoken: Z
      } = Q !== null && Q !== void 0 ? Q : {};
      return new Promise((D, Y) => {
          var W, J, F, X, V;
          if (!this._transport) {
              Y(new Error("Not connected"));
              return
          }
          if (((W = this._options) === null || W === void 0 ? void 0 : W.enforceStrictCapabilities) === !0) this.assertCapabilityForMethod(A.method);
          (J = Q === null || Q === void 0 ? void 0 : Q.signal) === null || J === void 0 || J.throwIfAborted();
let C: any = this._requestMessageId++,
              K = { ...A,
                  jsonrpc: "2.0",
                  id: C
              };
          if (Q === null || Q === void 0 ? void 0 : Q.onprogress) this._progressHandlers.set(C, Q.onprogress), K.params = { ...A.params,
              _meta: {
                  progressToken: C
              }
          };
let E: any = (O) => {
              var R;
              this._responseHandlers.delete(C), this._progressHandlers.delete(C), this._cleanupTimeout(C), (R = this._transport) === null || R === void 0 || R.send({
                  jsonrpc: "2.0",
                  method: "notifications/cancelled",
                  params: {
                      requestId: C,
                      reason: String(O)
                  }
              }, {
                  relatedRequestId: I,
                  resumptionToken: G,
                  onresumptiontoken: Z
              }).catch((T) => this._onerror(new Error(`Failed to send cancellation: ${T}`))), Y(O)
          };
          this._responseHandlers.set(C, (O) => {
              var R;
              if ((R = Q === null || Q === void 0 ? void 0 : Q.signal) === null || R === void 0 ? void 0 : R.aborted) return;
              if (O instanceof Error) return Y(O);
              try {
let T: any = B.parse(O.result);
                  D(T)
              } catch (T) {
                  Y(T)
              }
          }), (F = Q === null || Q === void 0 ? void 0 : Q.signal) === null || F === void 0 || F.addEventListener("abort", () => {
              var O;
              E((O = Q === null || Q === void 0 ? void 0 : Q.signal) === null || O === void 0 ? void 0 : O.reason)
          });
let N: any = (X = Q === null || Q === void 0 ? void 0 : Q.timeout) !== null && X !== void 0 ? X : kR6,
              query = () => E(new _m(rR.RequestTimeout, "Request timed out", {
                  timeout: N
              }));
          this._setupTimeout(C, N, Q === null || Q === void 0 ? void 0 : Q.maxTotalTimeout, q, (V = Q === null || Q === void 0 ? void 0 : Q.resetTimeoutOnProgress) !== null && V !== void 0 ? V : !1), this._transport.send(K, {
              relatedRequestId: I,
              resumptionToken: G,
              onresumptiontoken: Z
          }).catch((O) => {
              this._cleanupTimeout(C), Y(O)
          })
      })
  }
  async notification(A, B) {
      if (!this._transport) throw new Error("Not connected");
      this.assertNotificationCapability(A.method);
let Q: any = { ...A,
          jsonrpc: "2.0"
      };
      await this._transport.send(Q, B)
  }
  setRequestHandler(A, B) {
let Q: any = A.shape.method.value;
      this.assertRequestHandlerCapability(Q), this._requestHandlers.set(Q, (I, G) => {
          return Promise.resolve(B(A.parse(I), G))
      })
  }
  removeRequestHandler(A) {
      this._requestHandlers.delete(A)
  }
  assertCanSetRequestHandler(A) {
      if (this._requestHandlers.has(A)) throw new Error(`A request handler for ${A} already exists, which would be overridden`)
  }
  setNotificationHandler(A, B) {
      this._notificationHandlers.set(A.shape.method.value, (Q) => Promise.resolve(B(A.parse(Q))))
  }
  removeNotificationHandler(A) {
      this._notificationHandlers.delete(A)
  }
}


// vJ - Lines 32813-32817
class vJ extends Error {
class vJ extends Error {
  constructor(A) {
      super(A !== null && A !== void 0 ? A : "Unauthorized")
  }
}


// FF1 - Lines 32980-33091
class FF1 {
class FF1 {
  constructor(A, B) {
      this._url = A, this._eventSourceInit = B === null || B === void 0 ? void 0 : B.eventSourceInit, this._requestInit = B === null || B === void 0 ? void 0 : B.requestInit, this._authProvider = B === null || B === void 0 ? void 0 : B.authProvider
  }
  async _authThenStart() {
      var A;
      if (!this._authProvider) throw new vJ("No auth provider");
      let B;
      try {
          B = await VK(this._authProvider, {
              serverUrl: this._url
          })
      } catch (Q) {
          throw (A = this.onerror) === null || A === void 0 || A.call(this, Q), Q
      }
      if (B !== "AUTHORIZED") throw new vJ;
      return await this._startOrAuth()
  }
  async _commonHeaders() {
let A: any = {};
      if (this._authProvider) {
let B: any = await this._authProvider.tokens();
          if (B) A.Authorization = `Bearer ${B.access_token}`
      }
      return A
  }
  _startOrAuth() {
      return new Promise((A, B) => {
          var Q;
          this._eventSource = new gm(this._url.href, (Q = this._eventSourceInit) !== null && Q !== void 0 ? Q : {
              fetch: (I, G) => this._commonHeaders().then((Z) => fetch(I, { ...G,
                  headers: { ...Z,
                      Accept: "text/event-stream"
                  }
              }))
          }), this._abortController = new AbortController, this._eventSource.onerror = (I) => {
              var G;
              if (I.code === 401 && this._authProvider) {
                  this._authThenStart().then(A, B);
                  return
              }
let Z: any = new Ho0(I.code, I.message, I);
              B(Z), (G = this.onerror) === null || G === void 0 || G.call(this, Z)
          }, this._eventSource.onopen = () => {}, this._eventSource.addEventListener("endpoint", (I) => {
              var G;
let Z: any = I;
              try {
                  if (this._endpoint = new URL(Z.data, this._url), this._endpoint.origin !== this._url.origin) throw new Error(`Endpoint origin does not match connection origin: ${this._endpoint.origin}`)
              } catch (D) {
                  B(D), (G = this.onerror) === null || G === void 0 || G.call(this, D), this.close();
                  return
              }
              A()
          }), this._eventSource.onmessage = (I) => {
              var G, Z;
let D: any = I,
                  Y;
              try {
                  Y = fw.parse(JSON.parse(D.data))
              } catch (W) {
                  (G = this.onerror) === null || G === void 0 || G.call(this, W);
                  return
              }(Z = this.onmessage) === null || Z === void 0 || Z.call(this, Y)
          }
      })
  }
  async start() {
      if (this._eventSource) throw new Error("SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.");
      return await this._startOrAuth()
  }
  async finishAuth(A) {
      if (!this._authProvider) throw new vJ("No auth provider");
      if (await VK(this._authProvider, {
              serverUrl: this._url,
              authorizationCode: A
          }) !== "AUTHORIZED") throw new vJ("Failed to authorize")
  }
  async close() {
      var A, B, Q;
      (A = this._abortController) === null || A === void 0 || A.abort(), (B = this._eventSource) === null || B === void 0 || B.close(), (Q = this.onclose) === null || Q === void 0 || Q.call(this)
  }
  async send(A) {
      var B, Q, I;
      if (!this._endpoint) throw new Error("Not connected");
      try {
let G: any = await this._commonHeaders(),
              Z = new Headers({ ...G,
                  ...(B = this._requestInit) === null || B === void 0 ? void 0 : B.headers
              });
          Z.set("content-type", "application/json");
let D: any = { ...this._requestInit,
                  method: "POST",
                  headers: Z,
                  body: JSON.stringify(A),
                  signal: (Q = this._abortController) === null || Q === void 0 ? void 0 : Q.signal
              },
              Y = await fetch(this._endpoint, D);
          if (!Y.ok) {
              if (Y.status === 401 && this._authProvider) {
                  if (await VK(this._authProvider, {
                          serverUrl: this._url
                      }) !== "AUTHORIZED") throw new vJ;
                  return this.send(A)
              }
let W: any = await Y.text().catch(() => null);
              throw new Error(`Error POSTing to endpoint (HTTP ${Y.status}): ${W}`)
          }
      } catch (G) {
          throw (I = this.onerror) === null || I === void 0 || I.call(this, G), G
      }
  }
}


// tl1 - Lines 33130-33344
class tl1 {
class tl1 {
  constructor(A, B) {
      var Q;
      this._url = A, this._requestInit = B === null || B === void 0 ? void 0 : B.requestInit, this._authProvider = B === null || B === void 0 ? void 0 : B.authProvider, this._sessionId = B === null || B === void 0 ? void 0 : B.sessionId, this._reconnectionOptions = (Q = B === null || B === void 0 ? void 0 : B.reconnectionOptions) !== null && Q !== void 0 ? Q : TO6
  }
  async _authThenStart() {
      var A;
      if (!this._authProvider) throw new vJ("No auth provider");
      let B;
      try {
          B = await VK(this._authProvider, {
              serverUrl: this._url
          })
      } catch (Q) {
          throw (A = this.onerror) === null || A === void 0 || A.call(this, Q), Q
      }
      if (B !== "AUTHORIZED") throw new vJ;
      return await this._startOrAuthSse({
          resumptionToken: void 0
      })
  }
  async _commonHeaders() {
      var A;
let B: any = {};
      if (this._authProvider) {
let Q: any = await this._authProvider.tokens();
          if (Q) B.Authorization = `Bearer ${Q.access_token}`
      }
      if (this._sessionId) B["mcp-session-id"] = this._sessionId;
      return new Headers({ ...B,
          ...(A = this._requestInit) === null || A === void 0 ? void 0 : A.headers
      })
  }
  async _startOrAuthSse(A) {
      var B, Q;
      let {
          resumptionToken: I
      } = A;
      try {
let G: any = await this._commonHeaders();
          if (G.set("Accept", "text/event-stream"), I) G.set("last-event-id", I);
let Z: any = await fetch(this._url, {
              method: "GET",
              headers: G,
              signal: (B = this._abortController) === null || B === void 0 ? void 0 : B.signal
          });
          if (!Z.ok) {
              if (Z.status === 401 && this._authProvider) return await this._authThenStart();
              if (Z.status === 405) return;
              throw new XF1(Z.status, `Failed to open SSE stream: ${Z.statusText}`)
          }
          this._handleSseStream(Z.body, A)
      } catch (G) {
          throw (Q = this.onerror) === null || Q === void 0 || Q.call(this, G), G
      }
  }
  _getNextReconnectionDelay(A) {
let B: any = this._reconnectionOptions.initialReconnectionDelay,
          Q = this._reconnectionOptions.reconnectionDelayGrowFactor,
          I = this._reconnectionOptions.maxReconnectionDelay;
      return Math.min(B * Math.pow(Q, A), I)
  }
  _scheduleReconnection(A, B = 0) {
      var Q;
let I: any = this._reconnectionOptions.maxRetries;
      if (I > 0 && B >= I) {
          (Q = this.onerror) === null || Q === void 0 || Q.call(this, new Error(`Maximum reconnection attempts (${I}) exceeded.`));
          return
      }
let G: any = this._getNextReconnectionDelay(B);
      setTimeout(() => {
          this._startOrAuthSse(A).catch((Z) => {
              var D;
              (D = this.onerror) === null || D === void 0 || D.call(this, new Error(`Failed to reconnect SSE stream: ${Z instanceof Error?Z.message:String(Z)}`)), this._scheduleReconnection(A, B + 1)
          })
      }, G)
  }
  _handleSseStream(A, B) {
      if (!A) return;
      let {
          onresumptiontoken: Q,
          replayMessageId: I
      } = B, G;
      (async () => {
          var D, Y, W, J;
          try {
let F: any = A.pipeThrough(new TextDecoderStream).pipeThrough(new ol1).getReader();
              while (!0) {
                  let {
                      value: X,
                      done: V
                  } = await F.read();
                  if (V) break;
                  if (X.id) G = X.id, Q === null || Q === void 0 || Q(X.id);
                  if (!X.event || X.event === "message") try {
let C: any = fw.parse(JSON.parse(X.data));
                      if (I !== void 0 && Ct(C)) C.id = I;
                      (D = this.onmessage) === null || D === void 0 || D.call(this, C)
                  } catch (C) {
                      (Y = this.onerror) === null || Y === void 0 || Y.call(this, C)
                  }
              }
          } catch (F) {
              if ((W = this.onerror) === null || W === void 0 || W.call(this, new Error(`SSE stream disconnected: ${F}`)), this._abortController && !this._abortController.signal.aborted) {
                  if (G !== void 0) try {
                      this._scheduleReconnection({
                          resumptionToken: G,
                          onresumptiontoken: Q,
                          replayMessageId: I
                      }, 0)
                  } catch (X) {
                      (J = this.onerror) === null || J === void 0 || J.call(this, new Error(`Failed to reconnect: ${X instanceof Error?X.message:String(X)}`))
                  }
              }
          }
      })()
  }
  async start() {
      if (this._abortController) throw new Error("StreamableHTTPClientTransport already started! If using Client class, note that connect() calls start() automatically.");
      this._abortController = new AbortController
  }
  async finishAuth(A) {
      if (!this._authProvider) throw new vJ("No auth provider");
      if (await VK(this._authProvider, {
              serverUrl: this._url,
              authorizationCode: A
          }) !== "AUTHORIZED") throw new vJ("Failed to authorize")
  }
  async close() {
      var A, B;
      (A = this._abortController) === null || A === void 0 || A.abort(), (B = this.onclose) === null || B === void 0 || B.call(this)
  }
  async send(A, B) {
      var Q, I, G;
      try {
          let {
              resumptionToken: Z,
              onresumptiontoken: D
          } = B || {};
          if (Z) {
              this._startOrAuthSse({
                  resumptionToken: Z,
                  replayMessageId: nJ1(A) ? A.id : void 0
              }).catch((K) => {
                  var E;
                  return (E = this.onerror) === null || E === void 0 ? void 0 : E.call(this, K)
              });
              return
          }
let Y: any = await this._commonHeaders();
          Y.set("content-type", "application/json"), Y.set("accept", "application/json, text/event-stream");
let W: any = { ...this._requestInit,
                  method: "POST",
                  headers: Y,
                  body: JSON.stringify(A),
                  signal: (Q = this._abortController) === null || Q === void 0 ? void 0 : Q.signal
              },
              J = await fetch(this._url, W),
              F = J.headers.get("mcp-session-id");
          if (F) this._sessionId = F;
          if (!J.ok) {
              if (J.status === 401 && this._authProvider) {
                  if (await VK(this._authProvider, {
                          serverUrl: this._url
                      }) !== "AUTHORIZED") throw new vJ;
                  return this.send(A)
              }
let K: any = await J.text().catch(() => null);
              throw new Error(`Error POSTing to endpoint (HTTP ${J.status}): ${K}`)
          }
          if (J.status === 202) {
              if (Kr0(A)) this._startOrAuthSse({
                  resumptionToken: void 0
              }).catch((K) => {
                  var E;
                  return (E = this.onerror) === null || E === void 0 ? void 0 : E.call(this, K)
              });
              return
          }
let V: any = (Array.isArray(A) ? A : [A]).filter((K) => ("method" in K) && ("id" in K) && K.id !== void 0).length > 0,
              C = J.headers.get("content-type");
          if (V)
              if (C === null || C === void 0 ? void 0 : C.includes("text/event-stream")) this._handleSseStream(J.body, {
                  onresumptiontoken: D
              });
              else if (C === null || C === void 0 ? void 0 : C.includes("application/json")) {
let K: any = await J.json(),
                  E = Array.isArray(K) ? K.map((N) => fw.parse(N)) : [fw.parse(K)];
              for (let N of E)(I = this.onmessage) === null || I === void 0 || I.call(this, N)
          } else throw new XF1(-1, `Unexpected content type: ${C}`)
      } catch (Z) {
          throw (G = this.onerror) === null || G === void 0 || G.call(this, Z), Z
      }
  }
  get sessionId() {
      return this._sessionId
  }
  async terminateSession() {
      var A, B;
      if (!this._sessionId) return;
      try {
let Q: any = await this._commonHeaders(),
              I = { ...this._requestInit,
                  method: "DELETE",
                  headers: Q,
                  signal: (A = this._abortController) === null || A === void 0 ? void 0 : A.signal
              },
              G = await fetch(this._url, I);
          if (!G.ok && G.status !== 405) throw new XF1(G.status, `Failed to terminate session: ${G.statusText}`);
          this._sessionId = void 0
      } catch (Q) {
          throw (B = this.onerror) === null || B === void 0 || B.call(this, Q), Q
      }
  }
}


// nV1 - Lines 34524-34576
class nV1 extends R8 {
class nV1 extends R8 {
  constructor({
      awsRegion: A = Ds1("AWS_REGION") ? ? "us-east-1",
      baseURL: B = Ds1("ANTHROPIC_BEDROCK_BASE_URL") ? ? `https://bedrock-runtime.${A}.amazonaws.com`,
      awsSecretKey: Q = null,
      awsAccessKey: I = null,
      awsSessionToken: G = null,
      ...Z
  } = {}) {
      super({
          baseURL: B,
          ...Z
      });
      this.skipAuth = !1, this.messages = Eo6(this), this.completions = new aR(this), this.beta = Uo6(this), this.awsSecretKey = Q, this.awsAccessKey = I, this.awsRegion = A, this.awsSessionToken = G, this.skipAuth = Z.skipAuth ? ? !1
  }
  validateHeaders() {}
  async prepareRequest(A, {
      url: B,
      options: Q
  }) {
      if (this.skipAuth) return;
let I: any = this.awsRegion;
      if (!I) throw new Error("Expected `awsRegion` option to be passed to the client or the `AWS_REGION` environment variable to be present");
let G: any = await U62(A, {
          url: B,
          regionName: I,
          awsAccessKey: this.awsAccessKey,
          awsSecretKey: this.awsSecretKey,
          awsSessionToken: this.awsSessionToken
      });
      A.headers = Ys1([G, A.headers]).values
  }
  buildRequest(A) {
      if (A.__streamClass = iV1, cV1(A.body)) A.body = { ...A.body
      };
      if (cV1(A.body)) {
          if (!A.body.anthropic_version) A.body.anthropic_version = zo6;
          if (A.headers && !A.body.anthropic_beta) {
let B: any = Ys1([A.headers]).values.get("anthropic-beta");
              if (B != null) A.body.anthropic_beta = B.split(",")
          }
      }
      if (wo6.has(A.path) && A.method === "post") {
          if (!cV1(A.body)) throw new Error("Expected request body to be an object for post /v1/messages");
let B: any = A.body.model;
          A.body.model = void 0;
let Q: any = A.body.stream;
          if (A.body.stream = void 0, Q) A.path = Ws1 `/model/${B}/invoke-with-response-stream`;
          else A.path = Ws1 `/model/${B}/invoke`
      }
      return super.buildRequest(A)
  }
}


// jC1 - Lines 34648-34692
class jC1 extends R8 {
class jC1 extends R8 {
  constructor({
      baseURL: A = SC1("ANTHROPIC_VERTEX_BASE_URL"),
      region: B = SC1("CLOUD_ML_REGION") ? ? null,
      projectId: Q = SC1("ANTHROPIC_VERTEX_PROJECT_ID") ? ? null,
      ...I
  } = {}) {
      if (!B) throw new Error("No region was given. The client should be instantiated with the `region` option or the `CLOUD_ML_REGION` environment variable should be set.");
      super({
          baseURL: A || `https://${B}-aiplatform.googleapis.com/v1`,
          ...I
      });
      this.messages = A45(this), this.beta = B45(this), this.region = B, this.projectId = Q, this.accessToken = I.accessToken ? ? null, this._auth = I.googleAuth ? ? new wV2.GoogleAuth({
          scopes: "https://www.googleapis.com/auth/cloud-platform"
      }), this._authClientPromise = this._auth.getClient()
  }
  validateHeaders() {}
  async prepareOptions(A) {
let B: any = await this._authClientPromise,
          Q = await B.getRequestHeaders(),
          I = B.projectId ? ? Q["x-goog-user-project"];
      if (!this.projectId && I) this.projectId = I;
      A.headers = zV2([Q, A.headers])
  }
  buildRequest(A) {
      if (_C1(A.body)) A.body = { ...A.body
      };
      if (_C1(A.body)) {
          if (!A.body.anthropic_version) A.body.anthropic_version = t95
      }
      if (e95.has(A.path) && A.method === "post") {
          if (!this.projectId) throw new Error("No projectId was given and it could not be resolved from credentials. The client should be instantiated with the `projectId` option or the `ANTHROPIC_VERTEX_PROJECT_ID` environment variable should be set.");
          if (!_C1(A.body)) throw new Error("Expected request body to be an object for post /v1/messages");
let B: any = A.body.model;
          A.body.model = void 0;
let I: any = A.body.stream ? ? !1 ? "streamRawPredict" : "rawPredict";
          A.path = `/projects/${this.projectId}/locations/${this.region}/publishers/anthropic/models/${B}:${I}`
      }
      if (A.path === "/v1/messages/count_tokens" || A.path == "/v1/messages/count_tokens?beta=true" && A.method === "post") {
          if (!this.projectId) throw new Error("No projectId was given and it could not be resolved from credentials. The client should be instantiated with the `projectId` option or the `ANTHROPIC_VERTEX_PROJECT_ID` environment variable should be set.");
          A.path = `/projects/${this.projectId}/locations/${this.region}/publishers/anthropic/models/count-tokens:rawPredict`
      }
      return super.buildRequest(A)
  }
}


// he - Lines 34829-34834
class he extends Error {
class he extends Error {
  constructor(A, B) {
      super(`MCP tool "${A}" response (${B} tokens) exceeds maximum allowed tokens (${Go1()}). Please use pagination, filtering, or limit parameters to reduce the response size.`);
      this.name = "MCPContentTooLargeError"
  }
}


// MO - Lines 35524-35652
class MO {
class MO {
  serverName;
  serverConfig;
  redirectUri;
  handleRedirection;
  _codeVerifier;
  _authorizationUrl;
  _oauthState;
  constructor(A, B, Q = m65, I = !1) {
      this.serverName = A, this.serverConfig = B, this.redirectUri = Q, this.handleRedirection = I
  }
  get redirectUrl() {
      return this.redirectUri
  }
  get authorizationUrl() {
      return this._authorizationUrl
  }
  get clientMetadata() {
      return {
          client_name: `${m0} (${this.serverName})`,
          redirect_uris: [this.redirectUri],
          grant_types: ["authorization_code", "refresh_token"],
          response_types: ["code"],
          token_endpoint_auth_method: "none"
      }
  }
  async clientInformation() {
let B: any = VJ().read(),
          Q = qO(this.serverName, this.serverConfig),
          I = B ? .mcpOAuth ? .[Q];
      if (I ? .clientId) return p2(this.serverName, "Found client info"), {
          client_id: I.clientId,
          client_secret: I.clientSecret
      };
      p2(this.serverName, "No client info found");
      return
  }
  async saveClientInformation(A) {
let B: any = VJ(),
          Q = B.read() || {},
          I = qO(this.serverName, this.serverConfig),
          G = { ...Q,
              mcpOAuth: { ...Q.mcpOAuth,
                  [I]: { ...Q.mcpOAuth ? .[I],
                      serverName : this.serverName,
                      serverUrl: this.serverConfig.url,
                      clientId: A.client_id,
                      clientSecret: A.client_secret,
                      accessToken: Q.mcpOAuth ? .[I] ? .accessToken || "",
                      expiresAt: Q.mcpOAuth ? .[I] ? .expiresAt || 0
                  }
              }
          };
      B.update(G)
  }
  async tokens() {
let B: any = VJ().read(),
          Q = qO(this.serverName, this.serverConfig),
          I = B ? .mcpOAuth ? .[Q];
      if (!I) {
          p2(this.serverName, "No token data found");
          return
      }
let G: any = (I.expiresAt - Date.now()) / 1000;
      if (G <= 0 && !I.refreshToken) {
          p2(this.serverName, "Token expired without refresh token");
          return
      }
let Z: any = {
          access_token: I.accessToken,
          refresh_token: I.refreshToken,
          expires_in: G,
          scope: I.scope,
          token_type: "Bearer"
      };
      if (p2(this.serverName, "Returning tokens"), p2(this.serverName, `Token length: ${Z.access_token?.length}`), p2(this.serverName, `Has refresh token: ${!!Z.refresh_token}`), p2(this.serverName, `Expires in: ${Z.expires_in}`), G <= 60) p2(this.serverName, "Token is expired or about to expire - SDK should refresh");
      return Z
  }
  async saveTokens(A) {
let B: any = VJ(),
          Q = B.read() || {},
          I = qO(this.serverName, this.serverConfig);
      p2(this.serverName, "Saving tokens"), p2(this.serverName, `Token expires in: ${A.expires_in}`), p2(this.serverName, `Has refresh token: ${!!A.refresh_token}`);
let G: any = { ...Q,
          mcpOAuth: { ...Q.mcpOAuth,
              [I]: { ...Q.mcpOAuth ? .[I],
                  serverName : this.serverName,
                  serverUrl: this.serverConfig.url,
                  accessToken: A.access_token,
                  refreshToken: A.refresh_token,
                  expiresAt: Date.now() + (A.expires_in || 3600) * 1000,
                  scope: A.scope
              }
          }
      };
      B.update(G)
  }
  async redirectToAuthorization(A) {
      if (!this._oauthState) throw new Error("OAuth state must be set before redirecting to authorization");
      if (A.searchParams.set("state", this._oauthState), p2(this.serverName, "Added state parameter to authorization URL"), this._authorizationUrl = A.toString(), !this.handleRedirection) {
          p2(this.serverName, "Redirection handling is disabled, skipping redirect");
          return
      }
      p2(this.serverName, "Redirecting to authorization URL"), p2(this.serverName, `Authorization URL: ${A.toString()}`);
let B: any = process.env.BROWSER,
          Q = B ? B : process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
      if (p2(this.serverName, `Opening authorization URL: ${A.toString()}`), B) p2(this.serverName, `Using $BROWSER environment variable: ${B}`);
      try {
          v65(`${Q} "${A.toString()}"`)
      } catch {
          process.stdout.write(`
Couldn't open browser automatically. Please manually open the URL above in your browser.
`)
      }
  }
  async saveCodeVerifier(A) {
      p2(this.serverName, "Saving code verifier"), this._codeVerifier = A
  }
  async codeVerifier() {
      if (!this._codeVerifier) throw p2(this.serverName, "No code verifier saved"), new Error("No code verifier saved");
      return p2(this.serverName, "Returning code verifier"), this._codeVerifier
  }
  saveOAuthState(A) {
      p2(this.serverName, "Saving OAuth state"), this._oauthState = A
  }
  getOAuthState() {
      return this._oauthState
  }
}


// dK1 - Lines 36868-36877
class dK1 extends Error {
class dK1 extends Error {
  tokenCount;
  maxTokens;
  constructor(A, B) {
      super(`File content (${A} tokens) exceeds maximum allowed tokens (${B}). Please use offset and limit parameters to read specific portions of the file, or use the GrepTool to search for specific content.`);
      this.tokenCount = A;
      this.maxTokens = B;
      this.name = "MaxFileReadTokenExceededError"
  }
}


// H11 - Lines 37845-38362
class H11 {
class H11 {
  options;
  rules;
  lexer;
  constructor(A) {
      this.options = A || Xy
  }
  space(A) {
let B: any = this.rules.block.newline.exec(A);
      if (B && B[0].length > 0) return {
          type: "space",
          raw: B[0]
      }
  }
  code(A) {
let B: any = this.rules.block.code.exec(A);
      if (B) {
let Q: any = B[0].replace(this.rules.other.codeRemoveIndent, "");
          return {
              type: "code",
              raw: B[0],
              codeBlockStyle: "indented",
              text: !this.options.pedantic ? V11(Q, `
`) : Q
          }
      }
  }
  fences(A) {
let B: any = this.rules.block.fences.exec(A);
      if (B) {
let Q: any = B[0],
              I = aZ5(Q, B[3] || "", this.rules);
          return {
              type: "code",
              raw: Q,
              lang: B[2] ? B[2].trim().replace(this.rules.inline.anyPunctuation, "$1") : B[2],
              text: I
          }
      }
  }
  heading(A) {
let B: any = this.rules.block.heading.exec(A);
      if (B) {
let Q: any = B[2].trim();
          if (this.rules.other.endingHash.test(Q)) {
let I: any = V11(Q, "#");
              if (this.options.pedantic) Q = I.trim();
              else if (!I || this.rules.other.endingSpaceChar.test(I)) Q = I.trim()
          }
          return {
              type: "heading",
              raw: B[0],
              depth: B[1].length,
              text: Q,
              tokens: this.lexer.inline(Q)
          }
      }
  }
  hr(A) {
let B: any = this.rules.block.hr.exec(A);
      if (B) return {
          type: "hr",
          raw: V11(B[0], `
`)
      }
  }
  blockquote(A) {
let B: any = this.rules.block.blockquote.exec(A);
      if (B) {
let Q: any = V11(B[0], `
`).split(`
`),
              I = "",
              G = "",
              Z = [];
          while (Q.length > 0) {
let D: any = !1,
                  Y = [],
                  W;
              for (W = 0; W < Q.length; W++)
                  if (this.rules.other.blockquoteStart.test(Q[W])) Y.push(Q[W]), D = !0;
                  else if (!D) Y.push(Q[W]);
              else break;
              Q = Q.slice(W);
let J: any = Y.join(`
`),
                  F = J.replace(this.rules.other.blockquoteSetextReplace, `
  $1`).replace(this.rules.other.blockquoteSetextReplace2, "");
              I = I ? `${I}
${J}` : J, G = G ? `${G}
${F}` : F;
let X: any = this.lexer.state.top;
              if (this.lexer.state.top = !0, this.lexer.blockTokens(F, Z, !0), this.lexer.state.top = X, Q.length === 0) break;
let V: any = Z.at(-1);
              if (V ? .type === "code") break;
              else if (V ? .type === "blockquote") {
let C: any = V,
                      K = C.raw + `
` + Q.join(`
`),
                      E = this.blockquote(K);
                  Z[Z.length - 1] = E, I = I.substring(0, I.length - C.raw.length) + E.raw, G = G.substring(0, G.length - C.text.length) + E.text;
                  break
              } else if (V ? .type === "list") {
let C: any = V,
                      K = C.raw + `
` + Q.join(`
`),
                      E = this.list(K);
                  Z[Z.length - 1] = E, I = I.substring(0, I.length - V.raw.length) + E.raw, G = G.substring(0, G.length - C.raw.length) + E.raw, Q = K.substring(Z.at(-1).raw.length).split(`
`);
                  continue
              }
          }
          return {
              type: "blockquote",
              raw: I,
              tokens: Z,
              text: G
          }
      }
  }
  list(A) {
let B: any = this.rules.block.list.exec(A);
      if (B) {
let Q: any = B[1].trim(),
              I = Q.length > 1,
              G = {
                  type: "list",
                  raw: "",
                  ordered: I,
                  start: I ? +Q.slice(0, -1) : "",
                  loose: !1,
                  items: []
              };
          if (Q = I ? `\\d{1,9}\\${Q.slice(-1)}` : `\\${Q}`, this.options.pedantic) Q = I ? Q : "[*+-]";
let Z: any = this.rules.other.listItemRegex(Q),
              D = !1;
          while (A) {
let W: any = !1,
                  J = "",
                  F = "";
              if (!(B = Z.exec(A))) break;
              if (this.rules.block.hr.test(A)) break;
              J = B[0], A = A.substring(J.length);
let X: any = B[2].split(`
`, 1)[0].replace(this.rules.other.listReplaceTabs, (q) => " ".repeat(3 * query.length)),
                  V = A.split(`
`, 1)[0],
                  C = !X.trim(),
                  K = 0;
              if (this.options.pedantic) K = 2, F = X.trimStart();
              else if (C) K = B[1].length + 1;
              else K = B[2].search(this.rules.other.nonSpaceChar), K = K > 4 ? 1 : K, F = X.slice(K), K += B[1].length;
              if (C && this.rules.other.blankLine.test(V)) J += V + `
`, A = A.substring(V.length + 1), W = !0;
              if (!W) {
let query: any = this.rules.other.nextBulletRegex(K),
                      O = this.rules.other.hrRegex(K),
                      R = this.rules.other.fencesBeginRegex(K),
                      T = this.rules.other.headingBeginRegex(K),
                      L = this.rules.other.htmlBeginRegex(K);
                  while (A) {
let _: any = A.split(`
`, 1)[0],
                          k;
                      if (V = _, this.options.pedantic) V = V.replace(this.rules.other.listReplaceNesting, "  "), count = V;
                      else count = V.replace(this.rules.other.tabCharGlobal, "    ");
                      if (R.test(V)) break;
                      if (T.test(V)) break;
                      if (L.test(V)) break;
                      if (query.test(V)) break;
                      if (O.test(V)) break;
                      if (count.search(this.rules.other.nonSpaceChar) >= K || !V.trim()) F += `
` + count.slice(K);
                      else {
                          if (C) break;
                          if (X.replace(this.rules.other.tabCharGlobal, "    ").search(this.rules.other.nonSpaceChar) >= 4) break;
                          if (R.test(X)) break;
                          if (T.test(X)) break;
                          if (O.test(X)) break;
                          F += `
` + V
                      }
                      if (!C && !V.trim()) C = !0;
                      J += _ + `
`, A = A.substring(_.length + 1), X = count.slice(K)
                  }
              }
              if (!G.loose) {
                  if (D) G.loose = !0;
                  else if (this.rules.other.doubleBlankLine.test(J)) D = !0
              }
let E: any = null,
                  N;
              if (this.options.gfm) {
                  if (E = this.rules.other.listIsTask.exec(F), E) N = E[0] !== "[ ] ", F = F.replace(this.rules.other.listReplaceTask, "")
              }
              G.items.push({
                  type: "list_item",
                  raw: J,
                  task: !!E,
                  checked: N,
                  loose: !1,
                  text: F,
                  tokens: []
              }), G.raw += J
          }
let Y: any = G.items.at(-1);
          if (Y) Y.raw = Y.raw.trimEnd(), Y.text = Y.text.trimEnd();
          else return;
          G.raw = G.raw.trimEnd();
          for (let W = 0; W < G.items.length; W++)
              if (this.lexer.state.top = !1, G.items[W].tokens = this.lexer.blockTokens(G.items[W].text, []), !G.loose) {
let J: any = G.items[W].tokens.filter((X) => X.type === "space"),
                      F = J.length > 0 && J.some((X) => this.rules.other.anyLine.test(X.raw));
                  G.loose = F
              }
          if (G.loose)
              for (let W = 0; W < G.items.length; W++) G.items[W].loose = !0;
          return G
      }
  }
  html(A) {
let B: any = this.rules.block.html.exec(A);
      if (B) return {
          type: "html",
          block: !0,
          raw: B[0],
          pre: B[1] === "pre" || B[1] === "script" || B[1] === "style",
          text: B[0]
      }
  }
  def(A) {
let B: any = this.rules.block.def.exec(A);
      if (B) {
let Q: any = B[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal, " "),
              I = B[2] ? B[2].replace(this.rules.other.hrefBrackets, "$1").replace(this.rules.inline.anyPunctuation, "$1") : "",
              G = B[3] ? B[3].substring(1, B[3].length - 1).replace(this.rules.inline.anyPunctuation, "$1") : B[3];
          return {
              type: "def",
              tag: Q,
              raw: B[0],
              href: I,
              title: G
          }
      }
  }
  table(A) {
let B: any = this.rules.block.table.exec(A);
      if (!B) return;
      if (!this.rules.other.tableDelimiter.test(B[2])) return;
let Q: any = zw2(B[1]),
          I = B[2].replace(this.rules.other.tableAlignChars, "").split("|"),
          G = B[3] ? .trim() ? B[3].replace(this.rules.other.tableRowBlankLine, "").split(`
`) : [],
          Z = {
              type: "table",
              raw: B[0],
              header: [],
              align: [],
              rows: []
          };
      if (Q.length !== I.length) return;
      for (let D of I)
          if (this.rules.other.tableAlignRight.test(D)) Z.align.push("right");
          else if (this.rules.other.tableAlignCenter.test(D)) Z.align.push("center");
      else if (this.rules.other.tableAlignLeft.test(D)) Z.align.push("left");
      else Z.align.push(null);
      for (let D = 0; D < Q.length; D++) Z.header.push({
          text: Q[D],
          tokens: this.lexer.inline(Q[D]),
          header: !0,
          align: Z.align[D]
      });
      for (let D of G) Z.rows.push(zw2(D, Z.header.length).map((Y, W) => {
          return {
              text: Y,
              tokens: this.lexer.inline(Y),
              header: !1,
              align: Z.align[W]
          }
      }));
      return Z
  }
  lheading(A) {
let B: any = this.rules.block.lheading.exec(A);
      if (B) return {
          type: "heading",
          raw: B[0],
          depth: B[2].charAt(0) === "=" ? 1 : 2,
          text: B[1],
          tokens: this.lexer.inline(B[1])
      }
  }
  paragraph(A) {
let B: any = this.rules.block.paragraph.exec(A);
      if (B) {
let Q: any = B[1].charAt(B[1].length - 1) === `
` ? B[1].slice(0, -1) : B[1];
          return {
              type: "paragraph",
              raw: B[0],
              text: Q,
              tokens: this.lexer.inline(Q)
          }
      }
  }
  text(A) {
let B: any = this.rules.block.text.exec(A);
      if (B) return {
          type: "text",
          raw: B[0],
          text: B[0],
          tokens: this.lexer.inline(B[0])
      }
  }
  escape(A) {
let B: any = this.rules.inline.escape.exec(A);
      if (B) return {
          type: "escape",
          raw: B[0],
          text: B[1]
      }
  }
  tag(A) {
let B: any = this.rules.inline.tag.exec(A);
      if (B) {
          if (!this.lexer.state.inLink && this.rules.other.startATag.test(B[0])) this.lexer.state.inLink = !0;
          else if (this.lexer.state.inLink && this.rules.other.endATag.test(B[0])) this.lexer.state.inLink = !1;
          if (!this.lexer.state.inRawBlock && this.rules.other.startPreScriptTag.test(B[0])) this.lexer.state.inRawBlock = !0;
          else if (this.lexer.state.inRawBlock && this.rules.other.endPreScriptTag.test(B[0])) this.lexer.state.inRawBlock = !1;
          return {
              type: "html",
              raw: B[0],
              inLink: this.lexer.state.inLink,
              inRawBlock: this.lexer.state.inRawBlock,
              block: !1,
              text: B[0]
          }
      }
  }
  link(A) {
let B: any = this.rules.inline.link.exec(A);
      if (B) {
let Q: any = B[2].trim();
          if (!this.options.pedantic && this.rules.other.startAngleBracket.test(Q)) {
              if (!this.rules.other.endAngleBracket.test(Q)) return;
let Z: any = V11(Q.slice(0, -1), "\\");
              if ((Q.length - Z.length) % 2 === 0) return
          } else {
let Z: any = nZ5(B[2], "()");
              if (Z > -1) {
let Y: any = (B[0].indexOf("!") === 0 ? 5 : 4) + B[1].length + Z;
                  B[2] = B[2].substring(0, Z), B[0] = B[0].substring(0, Y).trim(), B[3] = ""
              }
          }
let I: any = B[2],
              G = "";
          if (this.options.pedantic) {
let Z: any = this.rules.other.pedanticHrefTitle.exec(I);
              if (Z) I = Z[1], G = Z[3]
          } else G = B[3] ? B[3].slice(1, -1) : "";
          if (I = I.trim(), this.rules.other.startAngleBracket.test(I))
              if (this.options.pedantic && !this.rules.other.endAngleBracket.test(Q)) I = I.slice(1);
              else I = I.slice(1, -1);
          return ww2(B, {
              href: I ? I.replace(this.rules.inline.anyPunctuation, "$1") : I,
              title: G ? G.replace(this.rules.inline.anyPunctuation, "$1") : G
          }, B[0], this.lexer, this.rules)
      }
  }
  reflink(A, B) {
      let Q;
      if ((Q = this.rules.inline.reflink.exec(A)) || (Q = this.rules.inline.nolink.exec(A))) {
let I: any = (Q[2] || Q[1]).replace(this.rules.other.multipleSpaceGlobal, " "),
              G = B[I.toLowerCase()];
          if (!G) {
let Z: any = Q[0].charAt(0);
              return {
                  type: "text",
                  raw: Z,
                  text: Z
              }
          }
          return ww2(Q, G, Q[0], this.lexer, this.rules)
      }
  }
  emStrong(A, B, Q = "") {
let I: any = this.rules.inline.emStrongLDelim.exec(A);
      if (!I) return;
      if (I[3] && Q.match(this.rules.other.unicodeAlphaNumeric)) return;
      if (!(I[1] || I[2]) || !Q || this.rules.inline.punctuation.exec(Q)) {
let Z: any = [...I[0]].length - 1,
              D, Y, W = Z,
              J = 0,
              F = I[0][0] === "*" ? this.rules.inline.emStrongRDelimAst : this.rules.inline.emStrongRDelimUnd;
          F.lastIndex = 0, B = B.slice(-1 * A.length + Z);
          while ((I = F.exec(B)) != null) {
              if (D = I[1] || I[2] || I[3] || I[4] || I[5] || I[6], !D) continue;
              if (Y = [...D].length, I[3] || I[4]) {
                  W += Y;
                  continue
              } else if (I[5] || I[6]) {
                  if (Z % 3 && !((Z + Y) % 3)) {
                      J += Y;
                      continue
                  }
              }
              if (W -= Y, W > 0) continue;
              Y = Math.min(Y, Y + W + J);
let X: any = [...I[0]][0].length,
                  V = A.slice(0, Z + I.index + X + Y);
              if (Math.min(Z, Y) % 2) {
let K: any = V.slice(1, -1);
                  return {
                      type: "em",
                      raw: V,
                      text: K,
                      tokens: this.lexer.inlineTokens(K)
                  }
              }
let C: any = V.slice(2, -2);
              return {
                  type: "strong",
                  raw: V,
                  text: C,
                  tokens: this.lexer.inlineTokens(C)
              }
          }
      }
  }
  codespan(A) {
let B: any = this.rules.inline.code.exec(A);
      if (B) {
let Q: any = B[2].replace(this.rules.other.newLineCharGlobal, " "),
              I = this.rules.other.nonSpaceChar.test(Q),
              G = this.rules.other.startingSpaceChar.test(Q) && this.rules.other.endingSpaceChar.test(Q);
          if (I && G) Q = Q.substring(1, Q.length - 1);
          return {
              type: "codespan",
              raw: B[0],
              text: Q
          }
      }
  }
  br(A) {
let B: any = this.rules.inline.br.exec(A);
      if (B) return {
          type: "br",
          raw: B[0]
      }
  }
  del(A) {
let B: any = this.rules.inline.del.exec(A);
      if (B) return {
          type: "del",
          raw: B[0],
          text: B[2],
          tokens: this.lexer.inlineTokens(B[2])
      }
  }
  autolink(A) {
let B: any = this.rules.inline.autolink.exec(A);
      if (B) {
          let Q, I;
          if (B[2] === "@") Q = B[1], I = "mailto:" + Q;
          else Q = B[1], I = Q;
          return {
              type: "link",
              raw: B[0],
              text: Q,
              href: I,
              tokens: [{
                  type: "text",
                  raw: Q,
                  text: Q
              }]
          }
      }
  }
  url(A) {
      let B;
      if (B = this.rules.inline.url.exec(A)) {
          let Q, I;
          if (B[2] === "@") Q = B[0], I = "mailto:" + Q;
          else {
              let G;
              do G = B[0], B[0] = this.rules.inline._backpedal.exec(B[0]) ? .[0] ? ? ""; while (G !== B[0]);
              if (Q = B[0], B[1] === "www.") I = "http://" + B[0];
              else I = B[0]
          }
          return {
              type: "link",
              raw: B[0],
              text: Q,
              href: I,
              tokens: [{
                  type: "text",
                  raw: Q,
                  text: Q
              }]
          }
      }
  }
  inlineText(A) {
let B: any = this.rules.inline.text.exec(A);
      if (B) {
let Q: any = this.lexer.state.inRawBlock;
          return {
              type: "text",
              raw: B[0],
              text: B[0],
              escaped: Q
          }
      }
  }
}


// WW - Lines 38363-38619
class WW {
class WW {
  tokens;
  options;
  state;
  tokenizer;
  inlineQueue;
  constructor(A) {
      this.tokens = [], this.tokens.links = Object.create(null), this.options = A || Xy, this.options.tokenizer = this.options.tokenizer || new H11, this.tokenizer = this.options.tokenizer, this.tokenizer.options = this.options, this.tokenizer.lexer = this, this.inlineQueue = [], this.state = {
          inLink: !1,
          inRawBlock: !1,
          top: !0
      };
let B: any = {
          other: iD,
          block: pK1.normal,
          inline: X11.normal
      };
      if (this.options.pedantic) B.block = pK1.pedantic, B.inline = X11.pedantic;
      else if (this.options.gfm)
          if (B.block = pK1.gfm, this.options.breaks) B.inline = X11.breaks;
          else B.inline = X11.gfm;
      this.tokenizer.rules = B
  }
  static get rules() {
      return {
          block: pK1,
          inline: X11
      }
  }
  static lex(A, B) {
      return new WW(B).lex(A)
  }
  static lexInline(A, B) {
      return new WW(B).inlineTokens(A)
  }
  lex(A) {
      A = A.replace(iD.carriageReturn, `
`), this.blockTokens(A, this.tokens);
      for (let B = 0; B < this.inlineQueue.length; B++) {
let Q: any = this.inlineQueue[B];
          this.inlineTokens(Q.src, Q.tokens)
      }
      return this.inlineQueue = [], this.tokens
  }
  blockTokens(A, B = [], Q = !1) {
      if (this.options.pedantic) A = A.replace(iD.tabCharGlobal, "    ").replace(iD.spaceLine, "");
      while (A) {
          let I;
          if (this.options.extensions ? .block ? .some((Z) => {
                  if (I = Z.call({
                          lexer: this
                      }, A, B)) return A = A.substring(I.raw.length), B.push(I), !0;
                  return !1
              })) continue;
          if (I = this.tokenizer.space(A)) {
              A = A.substring(I.raw.length);
let Z: any = B.at(-1);
              if (I.raw.length === 1 && Z !== void 0) Z.raw += `
`;
              else B.push(I);
              continue
          }
          if (I = this.tokenizer.code(A)) {
              A = A.substring(I.raw.length);
let Z: any = B.at(-1);
              if (Z ? .type === "paragraph" || Z ? .type === "text") Z.raw += `
` + I.raw, Z.text += `
` + I.text, this.inlineQueue.at(-1).src = Z.text;
              else B.push(I);
              continue
          }
          if (I = this.tokenizer.fences(A)) {
              A = A.substring(I.raw.length), B.push(I);
              continue
          }
          if (I = this.tokenizer.heading(A)) {
              A = A.substring(I.raw.length), B.push(I);
              continue
          }
          if (I = this.tokenizer.hr(A)) {
              A = A.substring(I.raw.length), B.push(I);
              continue
          }
          if (I = this.tokenizer.blockquote(A)) {
              A = A.substring(I.raw.length), B.push(I);
              continue
          }
          if (I = this.tokenizer.list(A)) {
              A = A.substring(I.raw.length), B.push(I);
              continue
          }
          if (I = this.tokenizer.html(A)) {
              A = A.substring(I.raw.length), B.push(I);
              continue
          }
          if (I = this.tokenizer.def(A)) {
              A = A.substring(I.raw.length);
let Z: any = B.at(-1);
              if (Z ? .type === "paragraph" || Z ? .type === "text") Z.raw += `
` + I.raw, Z.text += `
` + I.raw, this.inlineQueue.at(-1).src = Z.text;
              else if (!this.tokens.links[I.tag]) this.tokens.links[I.tag] = {
                  href: I.href,
                  title: I.title
              };
              continue
          }
          if (I = this.tokenizer.table(A)) {
              A = A.substring(I.raw.length), B.push(I);
              continue
          }
          if (I = this.tokenizer.lheading(A)) {
              A = A.substring(I.raw.length), B.push(I);
              continue
          }
let G: any = A;
          if (this.options.extensions ? .startBlock) {
let Z: any = 1 / 0,
                  D = A.slice(1),
                  Y;
              if (this.options.extensions.startBlock.forEach((W) => {
                      if (Y = W.call({
                              lexer: this
                          }, D), typeof Y === "number" && Y >= 0) Z = Math.min(Z, Y)
                  }), Z < 1 / 0 && Z >= 0) G = A.substring(0, Z + 1)
          }
          if (this.state.top && (I = this.tokenizer.paragraph(G))) {
let Z: any = B.at(-1);
              if (Q && Z ? .type === "paragraph") Z.raw += `
` + I.raw, Z.text += `
` + I.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = Z.text;
              else B.push(I);
              Q = G.length !== A.length, A = A.substring(I.raw.length);
              continue
          }
          if (I = this.tokenizer.text(A)) {
              A = A.substring(I.raw.length);
let Z: any = B.at(-1);
              if (Z ? .type === "text") Z.raw += `
` + I.raw, Z.text += `
` + I.text, this.inlineQueue.pop(), this.inlineQueue.at(-1).src = Z.text;
              else B.push(I);
              continue
          }
          if (A) {
let Z: any = "Infinite loop on byte: " + A.charCodeAt(0);
              if (this.options.silent) {
                  console.error(Z);
                  break
              } else throw new Error(Z)
          }
      }
      return this.state.top = !0, B
  }
  inline(A, B = []) {
      return this.inlineQueue.push({
          src: A,
          tokens: B
      }), B
  }
  inlineTokens(A, B = []) {
let Q: any = A,
          I = null;
      if (this.tokens.links) {
let D: any = Object.keys(this.tokens.links);
          if (D.length > 0) {
              while ((I = this.tokenizer.rules.inline.reflinkSearch.exec(Q)) != null)
                  if (D.includes(I[0].slice(I[0].lastIndexOf("[") + 1, -1))) Q = Q.slice(0, I.index) + "[" + "a".repeat(I[0].length - 2) + "]" + Q.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex)
          }
      }
      while ((I = this.tokenizer.rules.inline.blockSkip.exec(Q)) != null) Q = Q.slice(0, I.index) + "[" + "a".repeat(I[0].length - 2) + "]" + Q.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);
      while ((I = this.tokenizer.rules.inline.anyPunctuation.exec(Q)) != null) Q = Q.slice(0, I.index) + "++" + Q.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);
let G: any = !1,
          Z = "";
      while (A) {
          if (!G) Z = "";
          G = !1;
          let D;
          if (this.options.extensions ? .inline ? .some((W) => {
                  if (D = W.call({
                          lexer: this
                      }, A, B)) return A = A.substring(D.raw.length), B.push(D), !0;
                  return !1
              })) continue;
          if (D = this.tokenizer.escape(A)) {
              A = A.substring(D.raw.length), B.push(D);
              continue
          }
          if (D = this.tokenizer.tag(A)) {
              A = A.substring(D.raw.length), B.push(D);
              continue
          }
          if (D = this.tokenizer.link(A)) {
              A = A.substring(D.raw.length), B.push(D);
              continue
          }
          if (D = this.tokenizer.reflink(A, this.tokens.links)) {
              A = A.substring(D.raw.length);
let W: any = B.at(-1);
              if (D.type === "text" && W ? .type === "text") W.raw += D.raw, W.text += D.text;
              else B.push(D);
              continue
          }
          if (D = this.tokenizer.emStrong(A, Q, Z)) {
              A = A.substring(D.raw.length), B.push(D);
              continue
          }
          if (D = this.tokenizer.codespan(A)) {
              A = A.substring(D.raw.length), B.push(D);
              continue
          }
          if (D = this.tokenizer.br(A)) {
              A = A.substring(D.raw.length), B.push(D);
              continue
          }
          if (D = this.tokenizer.del(A)) {
              A = A.substring(D.raw.length), B.push(D);
              continue
          }
          if (D = this.tokenizer.autolink(A)) {
              A = A.substring(D.raw.length), B.push(D);
              continue
          }
          if (!this.state.inLink && (D = this.tokenizer.url(A))) {
              A = A.substring(D.raw.length), B.push(D);
              continue
          }
let Y: any = A;
          if (this.options.extensions ? .startInline) {
let W: any = 1 / 0,
                  J = A.slice(1),
                  F;
              if (this.options.extensions.startInline.forEach((X) => {
                      if (F = X.call({
                              lexer: this
                          }, J), typeof F === "number" && F >= 0) W = Math.min(W, F)
                  }), W < 1 / 0 && W >= 0) Y = A.substring(0, W + 1)
          }
          if (D = this.tokenizer.inlineText(Y)) {
              if (A = A.substring(D.raw.length), D.raw.slice(-1) !== "_") Z = D.raw.slice(-1);
              G = !0;
let W: any = B.at(-1);
              if (W ? .type === "text") W.raw += D.raw, W.text += D.text;
              else B.push(D);
              continue
          }
          if (A) {
let W: any = "Infinite loop on byte: " + A.charCodeAt(0);
              if (this.options.silent) {
                  console.error(W);
                  break
              } else throw new Error(W)
          }
      }
      return B
  }
}


// z11 - Lines 38620-38798
class z11 {
class z11 {
  options;
  parser;
  constructor(A) {
      this.options = A || Xy
  }
  space(A) {
      return ""
  }
  code({
      text: A,
      lang: B,
      escaped: Q
  }) {
let I: any = (B || "").match(iD.notSpaceStart) ? .[0],
          G = A.replace(iD.endingNewline, "") + `
`;
      if (!I) return "<pre><code>" + (Q ? G : JE(G, !0)) + `</code></pre>
`;
      return '<pre><code class="language-' + JE(I) + '">' + (Q ? G : JE(G, !0)) + `</code></pre>
`
  }
  blockquote({
      tokens: A
  }) {
      return `<blockquote>
${this.parser.parse(A)}</blockquote>
`
  }
  html({
      text: A
  }) {
      return A
  }
  heading({
      tokens: A,
      depth: B
  }) {
      return `<h${B}>${this.parser.parseInline(A)}</h${B}>
`
  }
  hr(A) {
      return `<hr>
`
  }
  list(A) {
      let {
          ordered: B,
          start: Q
      } = A, I = "";
      for (let D = 0; D < A.items.length; D++) {
let Y: any = A.items[D];
          I += this.listitem(Y)
      }
let G: any = B ? "ol" : "ul",
          Z = B && Q !== 1 ? ' start="' + Q + '"' : "";
      return "<" + G + Z + `>
` + I + "</" + G + `>
`
  }
  listitem(A) {
let B: any = "";
      if (A.task) {
let Q: any = this.checkbox({
              checked: !!A.checked
          });
          if (A.loose)
              if (A.tokens[0] ? .type === "paragraph") {
                  if (A.tokens[0].text = Q + " " + A.tokens[0].text, A.tokens[0].tokens && A.tokens[0].tokens.length > 0 && A.tokens[0].tokens[0].type === "text") A.tokens[0].tokens[0].text = Q + " " + JE(A.tokens[0].tokens[0].text), A.tokens[0].tokens[0].escaped = !0
              } else A.tokens.unshift({
                  type: "text",
                  raw: Q + " ",
                  text: Q + " ",
                  escaped: !0
              });
          else B += Q + " "
      }
      return B += this.parser.parse(A.tokens, !!A.loose), `<li>${B}</li>
`
  }
  checkbox({
      checked: A
  }) {
      return "<input " + (A ? 'checked="" ' : "") + 'disabled="" type="checkbox">'
  }
  paragraph({
      tokens: A
  }) {
      return `<p>${this.parser.parseInline(A)}</p>
`
  }
  table(A) {
let B: any = "",
          Q = "";
      for (let G = 0; G < A.header.length; G++) Q += this.tablecell(A.header[G]);
      B += this.tablerow({
          text: Q
      });
let I: any = "";
      for (let G = 0; G < A.rows.length; G++) {
let Z: any = A.rows[G];
          Q = "";
          for (let D = 0; D < Z.length; D++) Q += this.tablecell(Z[D]);
          I += this.tablerow({
              text: Q
          })
      }
      if (I) I = `<tbody>${I}</tbody>`;
      return `<table>
<thead>
` + B + `</thead>
` + I + `</table>
`
  }
  tablerow({
      text: A
  }) {
      return `<tr>
${A}</tr>
`
  }
  tablecell(A) {
let B: any = this.parser.parseInline(A.tokens),
          Q = A.header ? "th" : "td";
      return (A.align ? `<${Q} align="${A.align}">` : `<${Q}>`) + B + `</${Q}>
`
  }
  strong({
      tokens: A
  }) {
      return `<strong>${this.parser.parseInline(A)}</strong>`
  }
  em({
      tokens: A
  }) {
      return `<em>${this.parser.parseInline(A)}</em>`
  }
  codespan({
      text: A
  }) {
      return `<code>${JE(A,!0)}</code>`
  }
  br(A) {
      return "<br>"
  }
  del({
      tokens: A
  }) {
      return `<del>${this.parser.parseInline(A)}</del>`
  }
  link({
      href: A,
      title: B,
      tokens: Q
  }) {
let I: any = this.parser.parseInline(Q),
          G = Hw2(A);
      if (G === null) return I;
      A = G;
let Z: any = '<a href="' + A + '"';
      if (B) Z += ' title="' + JE(B) + '"';
      return Z += ">" + I + "</a>", Z
  }
  image({
      href: A,
      title: B,
      text: Q
  }) {
let I: any = Hw2(A);
      if (I === null) return JE(Q);
      A = I;
let G: any = `<img src="${A}" alt="${Q}"`;
      if (B) G += ` title="${JE(B)}"`;
      return G += ">", G
  }
  text(A) {
      return "tokens" in A && A.tokens ? this.parser.parseInline(A.tokens) : ("escaped" in A) && A.escaped ? A.text : JE(A.text)
  }
}


// XV - Lines 38844-39024
class XV {
class XV {
  options;
  renderer;
  textRenderer;
  constructor(A) {
      this.options = A || Xy, this.options.renderer = this.options.renderer || new z11, this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new nK1
  }
  static parse(A, B) {
      return new XV(B).parse(A)
  }
  static parseInline(A, B) {
      return new XV(B).parseInline(A)
  }
  parse(A, B = !0) {
let Q: any = "";
      for (let I = 0; I < A.length; I++) {
let G: any = A[I];
          if (this.options.extensions ? .renderers ? .[G.type]) {
let D: any = G,
                  Y = this.options.extensions.renderers[D.type].call({
                      parser: this
                  }, D);
              if (Y !== !1 || !["space", "hr", "heading", "code", "table", "blockquote", "list", "html", "paragraph", "text"].includes(D.type)) {
                  Q += Y || "";
                  continue
              }
          }
let Z: any = G;
          switch (Z.type) {
              case "space":
                  {
                      Q += this.renderer.space(Z);
                      continue
                  }
              case "hr":
                  {
                      Q += this.renderer.hr(Z);
                      continue
                  }
              case "heading":
                  {
                      Q += this.renderer.heading(Z);
                      continue
                  }
              case "code":
                  {
                      Q += this.renderer.code(Z);
                      continue
                  }
              case "table":
                  {
                      Q += this.renderer.table(Z);
                      continue
                  }
              case "blockquote":
                  {
                      Q += this.renderer.blockquote(Z);
                      continue
                  }
              case "list":
                  {
                      Q += this.renderer.list(Z);
                      continue
                  }
              case "html":
                  {
                      Q += this.renderer.html(Z);
                      continue
                  }
              case "paragraph":
                  {
                      Q += this.renderer.paragraph(Z);
                      continue
                  }
              case "text":
                  {
let D: any = Z,
                          Y = this.renderer.text(D);
                      while (I + 1 < A.length && A[I + 1].type === "text") D = A[++I],
                      Y += `
` + this.renderer.text(D);
                      if (B) Q += this.renderer.paragraph({
                          type: "paragraph",
                          raw: Y,
                          text: Y,
                          tokens: [{
                              type: "text",
                              raw: Y,
                              text: Y,
                              escaped: !0
                          }]
                      });
                      else Q += Y;
                      continue
                  }
              default:
                  {
let D: any = 'Token with "' + Z.type + '" type was not found.';
                      if (this.options.silent) return console.error(D), "";
                      else throw new Error(D)
                  }
          }
      }
      return Q
  }
  parseInline(A, B = this.renderer) {
let Q: any = "";
      for (let I = 0; I < A.length; I++) {
let G: any = A[I];
          if (this.options.extensions ? .renderers ? .[G.type]) {
let D: any = this.options.extensions.renderers[G.type].call({
                  parser: this
              }, G);
              if (D !== !1 || !["escape", "html", "link", "image", "strong", "em", "codespan", "br", "del", "text"].includes(G.type)) {
                  Q += D || "";
                  continue
              }
          }
let Z: any = G;
          switch (Z.type) {
              case "escape":
                  {
                      Q += B.text(Z);
                      break
                  }
              case "html":
                  {
                      Q += B.html(Z);
                      break
                  }
              case "link":
                  {
                      Q += B.link(Z);
                      break
                  }
              case "image":
                  {
                      Q += B.image(Z);
                      break
                  }
              case "strong":
                  {
                      Q += B.strong(Z);
                      break
                  }
              case "em":
                  {
                      Q += B.em(Z);
                      break
                  }
              case "codespan":
                  {
                      Q += B.codespan(Z);
                      break
                  }
              case "br":
                  {
                      Q += B.br(Z);
                      break
                  }
              case "del":
                  {
                      Q += B.del(Z);
                      break
                  }
              case "text":
                  {
                      Q += B.text(Z);
                      break
                  }
              default:
                  {
let D: any = 'Token with "' + Z.type + '" type was not found.';
                      if (this.options.silent) return console.error(D), "";
                      else throw new Error(D)
                  }
          }
      }
      return Q
  }
}


// K11 - Lines 39025-39047
class K11 {
class K11 {
  options;
  block;
  constructor(A) {
      this.options = A || Xy
  }
  static passThroughHooks = new Set(["preprocess", "postprocess", "processAllTokens"]);
  preprocess(A) {
      return A
  }
  postprocess(A) {
      return A
  }
  processAllTokens(A) {
      return A
  }
  provideLexer() {
      return this.block ? WW.lex : WW.lexInline
  }
  provideParser() {
      return this.block ? XV.parse : XV.parseInline
  }
}


// Sw2 - Lines 39048-39245
class Sw2 {
class Sw2 {
  defaults = $t1();
  options = this.setOptions;
  parse = this.parseMarkdown(!0);
  parseInline = this.parseMarkdown(!1);
  Parser = XV;
  Renderer = z11;
  TextRenderer = nK1;
  Lexer = WW;
  Tokenizer = H11;
  Hooks = K11;
  constructor(...A) {
      this.use(...A)
  }
  walkTokens(A, B) {
let Q: any = [];
      for (let I of A) switch (Q = Q.concat(B.call(this, I)), I.type) {
          case "table":
              {
let G: any = I;
                  for (let Z of G.header) Q = Q.concat(this.walkTokens(Z.tokens, B));
                  for (let Z of G.rows)
                      for (let D of Z) Q = Q.concat(this.walkTokens(D.tokens, B));
                  break
              }
          case "list":
              {
let G: any = I;Q = Q.concat(this.walkTokens(G.items, B));
                  break
              }
          default:
              {
let G: any = I;
                  if (this.defaults.extensions ? .childTokens ? .[G.type]) this.defaults.extensions.childTokens[G.type].forEach((Z) => {
let D: any = G[Z].flat(1 / 0);
                      Q = Q.concat(this.walkTokens(D, B))
                  });
                  else if (G.tokens) Q = Q.concat(this.walkTokens(G.tokens, B))
              }
      }
      return Q
  }
  use(...A) {
let B: any = this.defaults.extensions || {
          renderers: {},
          childTokens: {}
      };
      return A.forEach((Q) => {
let I: any = { ...Q
          };
          if (I.async = this.defaults.async || I.async || !1, Q.extensions) Q.extensions.forEach((G) => {
              if (!G.name) throw new Error("extension name required");
              if ("renderer" in G) {
let Z: any = B.renderers[G.name];
                  if (Z) B.renderers[G.name] = function(...D) {
let Y: any = G.renderer.apply(this, D);
                      if (Y === !1) Y = Z.apply(this, D);
                      return Y
                  };
                  else B.renderers[G.name] = G.renderer
              }
              if ("tokenizer" in G) {
                  if (!G.level || G.level !== "block" && G.level !== "inline") throw new Error("extension level must be 'block' or 'inline'");
let Z: any = B[G.level];
                  if (Z) Z.unshift(G.tokenizer);
                  else B[G.level] = [G.tokenizer];
                  if (G.start) {
                      if (G.level === "block")
                          if (B.startBlock) B.startBlock.push(G.start);
                          else B.startBlock = [G.start];
                      else if (G.level === "inline")
                          if (B.startInline) B.startInline.push(G.start);
                          else B.startInline = [G.start]
                  }
              }
              if ("childTokens" in G && G.childTokens) B.childTokens[G.name] = G.childTokens
          }), I.extensions = B;
          if (Q.renderer) {
let G: any = this.defaults.renderer || new z11(this.defaults);
              for (let Z in Q.renderer) {
                  if (!(Z in G)) throw new Error(`renderer '${Z}' does not exist`);
                  if (["options", "parser"].includes(Z)) continue;
let D: any = Z,
                      Y = Q.renderer[D],
                      W = G[D];
                  G[D] = (...J) => {
let F: any = Y.apply(G, J);
                      if (F === !1) F = W.apply(G, J);
                      return F || ""
                  }
              }
              I.renderer = G
          }
          if (Q.tokenizer) {
let G: any = this.defaults.tokenizer || new H11(this.defaults);
              for (let Z in Q.tokenizer) {
                  if (!(Z in G)) throw new Error(`tokenizer '${Z}' does not exist`);
                  if (["options", "rules", "lexer"].includes(Z)) continue;
let D: any = Z,
                      Y = Q.tokenizer[D],
                      W = G[D];
                  G[D] = (...J) => {
let F: any = Y.apply(G, J);
                      if (F === !1) F = W.apply(G, J);
                      return F
                  }
              }
              I.tokenizer = G
          }
          if (Q.hooks) {
let G: any = this.defaults.hooks || new K11;
              for (let Z in Q.hooks) {
                  if (!(Z in G)) throw new Error(`hook '${Z}' does not exist`);
                  if (["options", "block"].includes(Z)) continue;
let D: any = Z,
                      Y = Q.hooks[D],
                      W = G[D];
                  if (K11.passThroughHooks.has(Z)) G[D] = (J) => {
                      if (this.defaults.async) return Promise.resolve(Y.call(G, J)).then((X) => {
                          return W.call(G, X)
                      });
let F: any = Y.call(G, J);
                      return W.call(G, F)
                  };
                  else G[D] = (...J) => {
let F: any = Y.apply(G, J);
                      if (F === !1) F = W.apply(G, J);
                      return F
                  }
              }
              I.hooks = G
          }
          if (Q.walkTokens) {
let G: any = this.defaults.walkTokens,
                  Z = Q.walkTokens;
              I.walkTokens = function(D) {
let Y: any = [];
                  if (Y.push(Z.call(this, D)), G) Y = Y.concat(G.call(this, D));
                  return Y
              }
          }
          this.defaults = { ...this.defaults,
              ...I
          }
      }), this
  }
  setOptions(A) {
      return this.defaults = { ...this.defaults,
          ...A
      }, this
  }
  lexer(A, B) {
      return WW.lex(A, B ? ? this.defaults)
  }
  parser(A, B) {
      return XV.parse(A, B ? ? this.defaults)
  }
  parseMarkdown(A) {
      return (Q, I) => {
let G: any = { ...I
              },
              Z = { ...this.defaults,
                  ...G
              },
              D = this.onError(!!Z.silent, !!Z.async);
          if (this.defaults.async === !0 && G.async === !1) return D(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));
          if (typeof Q === "undefined" || Q === null) return D(new Error("marked(): input parameter is undefined or null"));
          if (typeof Q !== "string") return D(new Error("marked(): input parameter is of type " + Object.prototype.toString.call(Q) + ", string expected"));
          if (Z.hooks) Z.hooks.options = Z, Z.hooks.block = A;
let Y: any = Z.hooks ? Z.hooks.provideLexer() : A ? WW.lex : WW.lexInline,
              W = Z.hooks ? Z.hooks.provideParser() : A ? XV.parse : XV.parseInline;
          if (Z.async) return Promise.resolve(Z.hooks ? Z.hooks.preprocess(Q) : Q).then((J) => Y(J, Z)).then((J) => Z.hooks ? Z.hooks.processAllTokens(J) : J).then((J) => Z.walkTokens ? Promise.all(this.walkTokens(J, Z.walkTokens)).then(() => J) : J).then((J) => W(J, Z)).then((J) => Z.hooks ? Z.hooks.postprocess(J) : J).catch(D);
          try {
              if (Z.hooks) Q = Z.hooks.preprocess(Q);
let J: any = Y(Q, Z);
              if (Z.hooks) J = Z.hooks.processAllTokens(J);
              if (Z.walkTokens) this.walkTokens(J, Z.walkTokens);
let F: any = W(J, Z);
              if (Z.hooks) F = Z.hooks.postprocess(F);
              return F
          } catch (J) {
              return D(J)
          }
      }
  }
  onError(A, B) {
      return (Q) => {
          if (Q.message += `
Please report this to https://github.com/markedjs/marked.`, A) {
let I: any = "<p>An error occurred:</p><pre>" + JE(Q.message + "", !0) + "</pre>";
              if (B) return Promise.resolve(I);
              return I
          }
          if (B) return Promise.reject(Q);
          throw Q
      }
  }
}


// M0A - Lines 56552-56620
class M0A {
class M0A {
  localServer = null;
  promiseResolver = null;
  promiseRejecter = null;
  expectedState = null;
  pendingResponse = null;
  hasPendingResponse() {
      return this.pendingResponse !== null
  }
  async waitForAuthorization(A, B) {
      return new Promise((Q, I) => {
          this.promiseResolver = Q, this.promiseRejecter = I, this.expectedState = A, this.startLocalListener(B)
      })
  }
  handleSuccessRedirect(A) {
      if (!this.pendingResponse) return;
let B: any = CL(A) ? BB().CLAUDEAI_SUCCESS_URL : BB().CONSOLE_SUCCESS_URL;
      this.pendingResponse.writeHead(302, {
          Location: B
      }), this.pendingResponse.end(), this.pendingResponse = null, E1("tengu_oauth_automatic_redirect", {})
  }
  handleErrorRedirect() {
      if (!this.pendingResponse) return;
let A: any = BB().CLAUDEAI_SUCCESS_URL;
      this.pendingResponse.writeHead(302, {
          Location: A
      }), this.pendingResponse.end(), this.pendingResponse = null, E1("tengu_oauth_automatic_redirect_error", {})
  }
  startLocalListener(A) {
      if (this.localServer) this.close();
      this.localServer = VS2.createServer(this.handleRedirect.bind(this)), this.localServer.on("error", this.handleError.bind(this)), this.localServer.listen(BB().REDIRECT_PORT, () => A())
  }
  handleRedirect(A, B) {
let Q: any = CS2.parse(A.url || "", !0);
      if (Q.pathname !== "/callback") {
          B.writeHead(404), B.end();
          return
      }
let I: any = Q.query.code,
          G = Q.query.state;
      this.validateAndRespond(I, G, B)
  }
  validateAndRespond(A, B, Q) {
      if (!A) {
          Q.writeHead(400), Q.end("Authorization code not found"), this.reject(new Error("No authorization code received"));
          return
      }
      if (B !== this.expectedState) {
          Q.writeHead(400), Q.end("Invalid state parameter"), this.reject(new Error("Invalid state parameter"));
          return
      }
      this.pendingResponse = Q, this.resolve(A)
  }
  handleError(A) {
let Q: any = A.code === "EADDRINUSE" ? `Port ${BB().REDIRECT_PORT} is already in use. Please ensure no other applications are using this port.` : A.message,
          I = new Error(Q);
      b1(I), this.close(), this.reject(I)
  }
  resolve(A) {
      if (this.promiseResolver) this.promiseResolver(A), this.promiseResolver = null, this.promiseRejecter = null
  }
  reject(A) {
      if (this.promiseRejecter) this.promiseRejecter(A), this.promiseResolver = null, this.promiseRejecter = null
  }
  close() {
      if (this.pendingResponse) this.handleErrorRedirect();
      if (this.localServer) this.localServer.close(), this.localServer = null
  }
}


// P0A - Lines 56673-56746
class P0A {
class P0A {
  codeVerifier;
  authCodeListener;
  manualAuthCodeResolver = null;
  constructor() {
      this.codeVerifier = KS2(), this.authCodeListener = new M0A
  }
  async startOAuthFlow(A, B) {
let Q: any = HS2(this.codeVerifier),
          I = zS2(),
          G = {
              codeChallenge: Q,
              state: I,
              loginWithClaudeAi: B ? .loginWithClaudeAi
          },
          Z = lS1({ ...G,
              isManual: !0
          }),
          D = lS1({ ...G,
              isManual: !1
          }),
          Y = await this.waitForAuthorizationCode(I, async () => {
              await A(Z), await Ap(D)
          }),
          W = this.authCodeListener.hasPendingResponse();
      try {
let J: any = await bmA(Y, I, this.codeVerifier, !W);
          if (O0A({
                  clearOnboarding: !1
              }), J.account) this.storeAccountInfo(J);
          if (W) {
let X: any = O31(J.scope);
              this.authCodeListener.handleSuccessRedirect(X)
          }
let F: any = await iS1(J.access_token);
          return this.formatTokens(J, F)
      } catch (J) {
          if (W) this.authCodeListener.handleErrorRedirect();
          throw J
      } finally {
          this.authCodeListener.close()
      }
  }
  async waitForAuthorizationCode(A, B) {
      return new Promise((Q, I) => {
          this.manualAuthCodeResolver = Q, this.authCodeListener.waitForAuthorization(A, B).then((G) => {
              this.manualAuthCodeResolver = null, Q(G)
          }).catch((G) => {
              this.manualAuthCodeResolver = null, I(G)
          })
      })
  }
  handleManualAuthCodeInput(A) {
      if (this.manualAuthCodeResolver) this.manualAuthCodeResolver(A.authorizationCode), this.manualAuthCodeResolver = null, this.authCodeListener.close()
  }
  storeAccountInfo(A) {
let B: any = {
              accountUuid: A.account.uuid,
              emailAddress: A.account.email_address,
              organizationUuid: A.organization ? .uuid
          },
          Q = ZA();
      Q.oauthAccount = B, j0(Q)
  }
  formatTokens(A, B) {
      return {
          accessToken: A.access_token,
          refreshToken: A.refresh_token,
          expiresAt: Date.now() + A.expires_in * 1000,
          scopes: O31(A.scope),
          subscriptionType: B
      }
  }
}


// Hk2 - Lines 2331-2361
function Hk2(): any {
function Hk2(): any {
  return {
      originalCwd: u2A(),
      totalCostUSD: 0,
      totalAPIDuration: 0,
      totalAPIDurationWithoutRetries: 0,
      startTime: Date.now(),
      lastInteractionTime: Date.now(),
      totalLinesAdded: 0,
      totalLinesRemoved: 0,
      hasUnknownModelCost: !1,
      cwd: u2A(),
      modelTokens: {},
      mainLoopModelOverride: void 0,
      maxRateLimitFallbackActive: !1,
      initialMainLoopModel: null,
      modelStrings: null,
      isNonInteractiveSession: !0,
      meter: null,
      sessionCounter: null,
      locCounter: null,
      prCounter: null,
      commitCounter: null,
      costCounter: null,
      tokenCounter: null,
      codeEditToolDecisionCounter: null,
      sessionId: p2A(),
      loggerProvider: null,
      eventLogger: null
  }
}


// n2A - Lines 2383-2392
async function n2A(A, B, Q, I, G): any {
async function n2A(A, B, Q, I, G): any {
  $9.totalCostUSD += A, $9.totalAPIDuration += B, $9.totalAPIDurationWithoutRetries += Q;
let Z: any = $9.modelTokens[G] ? ? {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0
  };
  Z.inputTokens += I.input_tokens, Z.outputTokens += I.output_tokens, Z.cacheReadInputTokens += I.cache_read_input_tokens ? ? 0, Z.cacheCreationInputTokens += I.cache_creation_input_tokens ? ? 0, $9.modelTokens[G] = Z
}


// a2A - Lines 2422-2426
function a2A(): any {
function a2A(): any {
let A: any = 0;
  for (let B of Object.values($9.modelTokens)) A += B.inputTokens;
  return A
}


// s2A - Lines 2428-2432
function s2A(): any {
function s2A(): any {
let A: any = 0;
  for (let B of Object.values($9.modelTokens)) A += B.outputTokens;
  return A
}


// r2A - Lines 2434-2438
function r2A(): any {
function r2A(): any {
let A: any = 0;
  for (let B of Object.values($9.modelTokens)) A += B.cacheReadInputTokens;
  return A
}


// o2A - Lines 2440-2444
function o2A(): any {
function o2A(): any {
let A: any = 0;
  for (let B of Object.values($9.modelTokens)) A += B.cacheCreationInputTokens;
  return A
}


// e2A - Lines 2458-2460
function e2A(): any {
function e2A(): any {
  return $9.modelTokens
}


// I9A - Lines 2494-2512
function I9A(A, B): any {
function I9A(A, B): any {
  $9.meter = A, $9.sessionCounter = B("claude_code.session.count", {
      description: "Count of CLI sessions started"
  }), $9.locCounter = B("claude_code.lines_of_code.count", {
      description: "Count of lines of code modified, with the 'type' attribute indicating whether lines were added or removed"
  }), $9.prCounter = B("claude_code.pull_request.count", {
      description: "Number of pull requests created"
  }), $9.commitCounter = B("claude_code.commit.count", {
      description: "Number of git commits created"
  }), $9.costCounter = B("claude_code.cost.usage", {
      description: "Cost of the Autocoder session",
      unit: "USD"
  }), $9.tokenCounter = B("claude_code.token.usage", {
      description: "Number of tokens used",
      unit: "tokens"
  }), $9.codeEditToolDecisionCounter = B("claude_code.code_edit_tool.decision", {
      description: "Count of code editing tool permission decisions (accept/reject) for Edit, MultiEdit, Write, and NotebookEdit tools"
  })
}


// Vc - Lines 2534-2536
function Vc(): any {
function Vc(): any {
  return $9.tokenCounter
}


// YCA - Lines 5875-5895
function YCA(A, B, Q): any {
function YCA(A, B, Q): any {
let I: any = B;
  if (!I && I !== !1) {
let G: any = ZCA.default.getProxyForUrl(Q);
      if (G) I = new URL(G)
  }
  if (I) {
      if (I.username) I.auth = (I.username || "") + ":" + (I.password || "");
      if (I.auth) {
          if (I.auth.username || I.auth.password) I.auth = (I.auth.username || "") + ":" + (I.auth.password || "");
let Z: any = Buffer.from(I.auth, "utf8").toString("base64");
          A.headers["Proxy-Authorization"] = "Basic " + Z
      }
      A.headers.host = A.hostname + (A.port ? ":" + A.port : "");
let G: any = I.hostname || I.host;
      if (A.hostname = G, A.host = G, A.port = I.port, A.path = Q, I.protocol) A.protocol = I.protocol.includes(":") ? I.protocol : `${I.protocol}:`
  }
  A.beforeRedirects.proxy = function G(Z): any {
      YCA(Z, B, Z.href)
  }
}


// E - Lines 6313-6315
          function E(): any {
          function E(): any {
              C && C(), K && K(), G.cancelToken && G.cancelToken.unsubscribe(F), G.signal && G.signal.removeEventListener("abort", F)
          }


// vM1 - Lines 6639-6642
function vM1(A): any {
function vM1(A): any {
  if (A.cancelToken) A.cancelToken.throwIfRequested();
  if (A.signal && A.signal.aborted) throw new GJ(null, A)
}


// BB - Lines 7136-7138
function BB(): any {
function BB(): any {
  return process.env.USE_LOCAL_OAUTH === "1" && Z$9 || !1 || G$9
}


// q - Lines 16130-16139
  function q(): any {
  function q(): any {
let L: any = K.scan();
      F = 0;
      while (L === 15 || L === 14) {
          if (L === 14 && Q.keepLines) F += 1;
          else if (L === 14) F = 1;
          L = K.scan()
      }
      return E = L === 16 || K.getTokenError() !== 0, L
  }


// Z - Lines 16418-16420
  function Z(F1): any {
  function Z(F1): any {
      return F1 ? () => F1(I.getTokenOffset(), I.getTokenLength(), I.getTokenStartLine(), I.getTokenStartCharacter()) : () => !0
  }


// D - Lines 16422-16424
  function D(F1): any {
  function D(F1): any {
      return F1 ? () => F1(I.getTokenOffset(), I.getTokenLength(), I.getTokenStartLine(), I.getTokenStartCharacter(), () => G.slice()) : () => !0
  }


// Y - Lines 16426-16428
  function Y(F1): any {
  function Y(F1): any {
      return F1 ? (X1) => F1(X1, I.getTokenOffset(), I.getTokenLength(), I.getTokenStartLine(), I.getTokenStartCharacter()) : () => !0
  }


// W - Lines 16430-16432
  function W(F1): any {
  function W(F1): any {
      return F1 ? (X1) => F1(X1, I.getTokenOffset(), I.getTokenLength(), I.getTokenStartLine(), I.getTokenStartCharacter(), () => G.slice()) : () => !0
  }


// T - Lines 16445-16484
  function T(): any {
  function T(): any {
      while (!0) {
let F1: any = I.scan();
          switch (I.getTokenError()) {
              case 4:
                  L(14);
                  break;
              case 5:
                  L(15);
                  break;
              case 3:
                  L(13);
                  break;
              case 1:
                  if (!O) L(11);
                  break;
              case 2:
                  L(12);
                  break;
              case 6:
                  L(16);
                  break
          }
          switch (F1) {
              case 12:
              case 13:
                  if (O) L(10);
                  else N();
                  break;
              case 16:
                  L(1);
                  break;
              case 15:
              case 14:
                  break;
              default:
                  return F1
          }
      }
  }


// L - Lines 16486-16497
  function L(F1, X1 = [], var_v = []): any {
  function L(F1, X1 = [], var_v = []): any {
      if (q(F1), X1.length + var_v.length > 0) {
let D1: any = I.getToken();
          while (D1 !== 17) {
              if (X1.indexOf(D1) !== -1) {
                  T();
                  break
              } else if (var_v.indexOf(D1) !== -1) break;
              D1 = T()
          }
      }
  }


// _ - Lines 16499-16504
  function _(F1): any {
  function _(F1): any {
let X1: any = I.getTokenValue();
      if (F1) K(X1);
      else F(X1), G.push(X1);
      return T(), !0
  }


// k - Lines 16506-16527
  function k(): any {
  function k(): any {
      switch (I.getToken()) {
          case 11:
let F1: any = I.getTokenValue(),
                  X1 = Number(F1);
              if (isNaN(X1)) L(2), X1 = 0;
              K(X1);
              break;
          case 7:
              K(null);
              break;
          case 8:
              K(!0);
              break;
          case 9:
              K(!1);
              break;
          default:
              return !1
      }
      return T(), !0
  }


// i - Lines 16529-16535
  function i(): any {
  function i(): any {
      if (I.getToken() !== 10) return L(3, [], [2, 5]), !1;
      if (_(!1), I.getToken() === 6) {
          if (E(":"), T(), !d()) L(4, [], [2, 5])
      } else L(5, [], [2, 5]);
      return G.pop(), !0
  }


// x - Lines 16537-16551
  function x(): any {
  function x(): any {
      J(), T();
let F1: any = !1;
      while (I.getToken() !== 2 && I.getToken() !== 17) {
          if (I.getToken() === 5) {
              if (!F1) L(4, [], []);
              if (E(","), T(), I.getToken() === 2 && R) break
          } else if (F1) L(6, [], []);
          if (!i()) L(4, [], [2, 5]);
          F1 = !0
      }
      if (X(), I.getToken() !== 2) L(7, [2], []);
      else T();
      return !0
  }


// s - Lines 16553-16571
  function s(): any {
  function s(): any {
      V(), T();
let F1: any = !0,
          X1 = !1;
      while (I.getToken() !== 4 && I.getToken() !== 17) {
          if (I.getToken() === 5) {
              if (!X1) L(4, [], []);
              if (E(","), T(), I.getToken() === 4 && R) break
          } else if (X1) L(6, [], []);
          if (F1) G.push(0), F1 = !1;
          else G[G.length - 1]++;
          if (!d()) L(4, [], [4, 5]);
          X1 = !0
      }
      if (C(), !F1) G.pop();
      if (I.getToken() !== 4) L(8, [4], []);
      else T();
      return !0
  }


// d - Lines 16573-16584
  function d(): any {
  function d(): any {
      switch (I.getToken()) {
          case 3:
              return s();
          case 1:
              return x();
          case 10:
              return _(!0);
          default:
              return k()
      }
  }


// fmA - Lines 22023-22041
async function fmA(A): any {
async function fmA(A): any {
let Q: any = ZA().oauthAccount ? .accountUuid,
      I = qG(A);
  if (!Q || !I) return;
let G: any = `${BB().BASE_API_URL}/api/claude_cli_profile`;
  try {
      return (await P4.get(G, {
          headers: {
              "x-api-key": I,
              "anthropic-beta": Kf
          },
          params: {
              account_uuid: Q
          }
      })).data
  } catch (Z) {
      b1(Z)
  }
}


// vmA - Lines 22042-22054
async function vmA(A): any {
async function vmA(A): any {
let B: any = `${BB().BASE_API_URL}/api/oauth/profile`;
  try {
      return (await P4.get(B, {
          headers: {
              Authorization: `Bearer ${A}`,
              "Content-Type": "application/json"
          }
      })).data
  } catch (Q) {
      b1(Q)
  }
}


// lS1 - Lines 22064-22073
function lS1({
function lS1({
  codeChallenge: A,
  state: B,
  isManual: Q,
  loginWithClaudeAi: I
}): any {
let G: any = I ? BB().CLAUDE_AI_AUTHORIZE_URL : BB().CONSOLE_AUTHORIZE_URL,
      Z = new URL(G);
  return Z.searchParams.append("code", "true"), Z.searchParams.append("client_id", BB().CLIENT_ID), Z.searchParams.append("response_type", "code"), Z.searchParams.append("redirect_uri", Q ? BB().MANUAL_REDIRECT_URL : `http://localhost:${BB().REDIRECT_PORT}/callback`), Z.searchParams.append("scope", BB().SCOPES.join(" ")), Z.searchParams.append("code_challenge", A), Z.searchParams.append("code_challenge_method", "S256"), Z.searchParams.append("state", B), Z.toString()
}


// bmA - Lines 22074-22090
async function bmA(A, B, Q, I = !1): any {
async function bmA(A, B, Q, I = !1): any {
let G: any = {
          grant_type: "authorization_code",
          code: A,
          redirect_uri: I ? BB().MANUAL_REDIRECT_URL : `http://localhost:${BB().REDIRECT_PORT}/callback`,
          client_id: BB().CLIENT_ID,
          code_verifier: Q,
          state: B
      },
      Z = await P4.post(BB().TOKEN_URL, G, {
          headers: {
              "Content-Type": "application/json"
          }
      });
  if (Z.status !== 200) throw new Error(Z.status === 401 ? "Authentication failed: Invalid authorization code" : `Token exchange failed (${Z.status}): ${Z.statusText}`);
  return Z.data
}


// gmA - Lines 22091-22124
async function gmA(A): any {
async function gmA(A): any {
let B: any = {
      grant_type: "refresh_token",
      refresh_token: A,
      client_id: BB().CLIENT_ID
  };
  try {
let Q: any = await P4.post(BB().TOKEN_URL, B, {
          headers: {
              "Content-Type": "application/json"
          }
      });
      if (Q.status !== 200) throw new Error(`Token refresh failed: ${Q.statusText}`);
let I: any = Q.data,
          {
              access_token: G,
              refresh_token: Z = A,
              expires_in: D
          } = I,
          Y = Date.now() + D * 1000,
          W = O31(I.scope);
      E1("tengu_oauth_token_refresh_success", {});
let J: any = await iS1(G);
      return {
          accessToken: G,
          refreshToken: Z,
          expiresAt: Y,
          scopes: W,
          subscriptionType: J
      }
  } catch (Q) {
      throw E1("tengu_oauth_token_refresh_failure", {}), Q
  }
}


// hmA - Lines 22125-22138
async function hmA(A): any {
async function hmA(A): any {
let B: any = await P4.get(BB().ROLES_URL, {
      headers: {
          Authorization: `Bearer ${A}`
      }
  });
  if (B.status !== 200) throw new Error(`Failed to fetch user roles: ${B.statusText}`);
let Q: any = B.data,
      I = ZA();
  if (!I.oauthAccount) throw new Error("OAuth account information not found in config");
  I.oauthAccount.organizationRole = Q.organization_role, I.oauthAccount.workspaceRole = Q.workspace_role, I.oauthAccount.organizationName = Q.organization_name, j0(I), E1("tengu_oauth_roles_stored", {
      org_role: Q.organization_role
  })
}


// mmA - Lines 22139-22158
async function mmA(A): any {
async function mmA(A): any {
  try {
let B: any = await P4.post(BB().API_KEY_URL, null, {
              headers: {
                  Authorization: `Bearer ${A}`
              }
          }),
          Q = B.data ? .raw_key;
      if (Q) return dmA(Q), E1("tengu_oauth_api_key", {
          status: "success",
          statusCode: B.status
      }), Q;
      return null
  } catch (B) {
      throw E1("tengu_oauth_api_key", {
          status: "failure",
          error: B instanceof Error ? B.message : String(B)
      }), B
  }
}


// mS - Lines 22180-22188
function mS(): any {
function mS(): any {
let A: any = process.env.CLAUDE_CODE_USE_BEDROCK || process.env.CLAUDE_CODE_USE_VERTEX,
      B = m6().apiKeyHelper,
      Q = process.env.ANTHROPIC_AUTH_TOKEN || B,
      {
          source: I
      } = GX(V9A());
  return !(A || Q || (I === "ANTHROPIC_API_KEY" || I === "apiKeyHelper"))
}


// h31 - Lines 22190-22208
function h31(): any {
function h31(): any {
  if (process.env.ANTHROPIC_AUTH_TOKEN) return {
      source: "ANTHROPIC_AUTH_TOKEN",
      hasToken: !0
  };
  if (dS()) return {
      source: "apiKeyHelper",
      hasToken: !0
  };
let B: any = $Z();
  if (CL(B ? .scopes) && B ? .accessToken) return {
      source: "claude.ai",
      hasToken: !0
  };
  return {
      source: "none",
      hasToken: !1
  }
}


// J_1 - Lines 22343-22365
function J_1(A): any {
function J_1(A): any {
  if (!CL(A.scopes)) return {
      success: !0
  };
  try {
let B: any = VJ(),
          Q = B.read() || {};
      Q.claudeAiOauth = {
          accessToken: A.accessToken,
          refreshToken: A.refreshToken,
          expiresAt: A.expiresAt,
          scopes: A.scopes,
          subscriptionType: A.subscriptionType
      };
let I: any = B.update(Q);
      return $Z.cache ? .clear ? .(), jY.cache ? .clear ? .(), I
  } catch (B) {
      return b1(B), {
          success: !1,
          warning: "Failed to save OAuth tokens"
      }
  }
}


// F_1 - Lines 22381-22408
async function F_1(A = 0): any {
async function F_1(A = 0): any {
let Q: any = $Z();
  if (!Q ? .refreshToken || !T31(Q.expiresAt)) return !1;
  if ($Z.cache ? .clear ? .(), Q = $Z(), !Q ? .refreshToken || !T31(Q.expiresAt)) return !1;
let I: any = S4();
  x1().mkdirSync(I);
  let Z;
  try {
      Z = await CdA.lock(I)
  } catch (D) {
      if (D.code === "ELOCKED") {
          if (A < 5) return await new Promise((Y) => setTimeout(Y, 1000 + Math.random() * 1000)), F_1(A + 1);
          return !1
      }
      return b1(D), !1
  }
  try {
      if ($Z.cache ? .clear ? .(), Q = $Z(), !Q ? .refreshToken || !T31(Q.expiresAt)) return !1;
let D: any = await gmA(Q.refreshToken);
      return J_1({ ...D,
          scopes: Q.scopes
      }), $Z.cache ? .clear ? .(), !0
  } catch (D) {
      return b1(D instanceof Error ? D : new Error(String(D))), !1
  } finally {
      await Z()
  }
}


// E1 - Lines 22796-22844
async function E1(A, B): any {
async function E1(A, B): any {
  if (process.env.CLAUDE_CODE_USE_BEDROCK || process.env.CLAUDE_CODE_USE_VERTEX || process.env.DISABLE_TELEMETRY || process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) return;
  try {
let Q: any = B.model ? String(B.model) : J7(),
          I = jY(Q),
          [G, Z, D] = await Promise.all([E_(), mA.getPackageManagers(), mA.getRuntimes()]);
      if (!G) return;
let Y: any = { ...B,
              model: Q,
              sessionId: y9(),
              userType: "external",
              ...I.length > 0 ? {
                  betas: I.join(",")
              } : {},
              env: JSON.stringify({
                  platform: mA.platform,
                  nodeVersion: mA.nodeVersion,
                  terminal: mA.terminal,
                  packageManagers: Z.join(","),
                  runtimes: D.join(","),
                  isRunningWithBun: mA.isRunningWithBun(),
                  isCi: !1 === "true",
                  isClaubbit: process.env.CLAUBBIT === "true",
                  isGithubAction: process.env.GITHUB_ACTIONS === "true",
                  isClaudeCodeAction: process.env.CLAUDE_CODE_ACTION === "1" || process.env.CLAUDE_CODE_ACTION === "true",
                  isClaudeAiAuth: T9(),
                  version: {
                      ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
                      PACKAGE_URL: "@elizaos/code",
                      README_URL: "https://eliza.how",
                      VERSION: "1.0.34"
                  }.VERSION,
                  ...process.env.GITHUB_ACTIONS === "true" && {
                      githubEventName: process.env.GITHUB_EVENT_NAME,
                      githubActionsRunnerEnvironment: process.env.RUNNER_ENVIRONMENT,
                      githubActionsRunnerOs: process.env.RUNNER_OS
                  }
              }),
              entrypoint: process.env.CLAUDE_CODE_ENTRYPOINT,
              ...void 0,
              ...!1
          },
          W = {
              eventName: A,
              metadata: Y
          };
      G.logEvent(W), await G.flush()
  } catch (Q) {}
}


// kG1 - Lines 24702-24709
function kG1(): any {
function kG1(): any {
  if (T9()) return !1;
let B: any = ZA(),
      Q = B.oauthAccount ? .organizationRole,
      I = B.oauthAccount ? .workspaceRole;
  if (!Q || !I) return !0;
  return ["admin", "billing"].includes(Q) || ["workspace_admin", "workspace_billing"].includes(I)
}


// CY1 - Lines 26290-26314
function CY1(): any {
function CY1(): any {
  if (T9()) {
let B: any = $Z();
      if (!B ? .accessToken) return {
          headers: {},
          error: "No OAuth token available"
      };
      return {
          headers: {
              Authorization: `Bearer ${B.accessToken}`,
              "anthropic-beta": Kf
          }
      }
  }
let A: any = qG(!1);
  if (!A) return {
      headers: {},
      error: "No API key available"
  };
  return {
      headers: {
          "x-api-key": A
      }
  }
}


// wY1 - Lines 26580-26602
function wY1(): any {
function wY1(): any {
let A: any = fx(),
      B = y9(),
      Q = ZA(),
      I = Q.oauthAccount ? .organizationUuid,
      G = Q.oauthAccount ? .emailAddress,
      Z = Q.oauthAccount ? .accountUuid,
      D = {
          "user.id": A
      };
  if (Gu1("OTEL_METRICS_INCLUDE_SESSION_ID")) D["session.id"] = B;
  if (Gu1("OTEL_METRICS_INCLUDE_VERSION")) D["app.version"] = {
      ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
      PACKAGE_URL: "@elizaos/code",
      README_URL: "https://eliza.how",
      VERSION: "1.0.34"
  }.VERSION;
  if (I) D["organization.id"] = I;
  if (G) D["user.email"] = G;
  if (Z && Gu1("OTEL_METRICS_INCLUDE_ACCOUNT_UUID")) D["user.account_uuid"] = Z;
  if (mA.terminal) D["terminal.type"] = mA.terminal;
  return D
}


// KL6 - Lines 27494-27506
function KL6(): any {
function KL6(): any {
  if (!(m6().includeCoAuthoredBy ? ? !0)) return {
      commit: "",
      pr: ""
  };
let Q: any = `\uD83E\uDD16 Generated with [${m0}](${xfA})`;
  return {
      commit: `${Q}

 Co-Authored-By: Autocoder <noreply@elizaos.ai>`,
      pr: Q
  }
}


// yj - Lines 27702-27871
async function yj(A, B, Q, I): any {
async function yj(A, B, Q, I): any {
let G: any = new Set(A.map((D) => D.name)),
      Z = await xC("claude_code_docs_config", wL6);
  return [`
You are an interactive CLI tool that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.

${va0}
IMPORTANT: You must NEVER generate or guess URLs for the user unless you are confident that the URLs are for helping the user with programming. You may use URLs provided by the user in their messages or local files.

If the user asks for help or wants to give feedback inform them of the following: 
- /help: Get help with using ${m0}
- To give feedback, users should ${{ISSUES_EXPLAINER:"report the issue at https://github.com/elizaos/eliza/issues",PACKAGE_URL:"@elizaos/code",README_URL:"https://eliza.how",VERSION:"1.0.34"}.ISSUES_EXPLAINER}

When the user directly asks about ${m0} (eg 'can ${m0} do...', 'does ${m0} have...') or asks in second person (eg 'are you able...', 'can you do...'), first use the ${IJ1} tool to gather information to answer the question from ${m0} docs at ${ba0}.
- ${Z.subpages}
- Example: ${ba0}/cli-usage

# Tone and style
You should be concise, direct, and to the point. When you run a non-trivial bash command, you should explain what the command does and why you are running it, to make sure the user understands what you are doing (this is especially important when you are running a command that will make changes to the user's system).
Remember that your output will be displayed on a command line interface. Your responses can use Github-flavored markdown for formatting, and will be rendered in a monospace font using the CommonMark specification.
Output text to communicate with the user; all text you output outside of tool use is displayed to the user. Only use tools to complete tasks. Never use tools like ${ZK} or code comments as means to communicate with the user during the session.
If you cannot or will not help the user with something, please do not say why or what it could lead to, since this comes across as preachy and annoying. Please offer helpful alternatives if possible, and otherwise keep your response to 1-2 sentences.
Only use emojis if the user explicitly requests it. Avoid using emojis in all communication unless asked.
IMPORTANT: You should minimize output tokens as much as possible while maintaining helpfulness, quality, and accuracy. Only address the specific query or task at hand, avoiding tangential information unless absolutely critical for completing the request. If you can answer in 1-3 sentences or a short paragraph, please do.
IMPORTANT: You should NOT answer with unnecessary preamble or postamble (such as explaining your code or summarizing your action), unless the user asks you to.
IMPORTANT: Keep your responses short, since they will be displayed on a command line interface. You MUST answer concisely with fewer than 4 lines (not including tool use or code generation), unless user asks for detail. Answer the user's question directly, without elaboration, explanation, or details. One word answers are best. Avoid introductions, conclusions, and explanations. You MUST avoid text before/after your response, such as "The answer is <answer>.", "Here is the content of the file..." or "Based on the information provided, the answer is..." or "Here is what I will do next...". Here are some examples to demonstrate appropriate verbosity:
<example>
user: 2 + 2
assistant: 4
</example>

<example>
user: what is 2+2?
assistant: 4
</example>

<example>
user: is 11 a prime number?
assistant: Yes
</example>

<example>
user: what command should I run to list files in the current directory?
assistant: ls
</example>

<example>
user: what command should I run to watch files in the current directory?
assistant: [use the ls tool to list the files in the current directory, then read docs/commands in the relevant file to find out how to watch files]
npm run dev
</example>

<example>
user: How many golf balls fit inside a jetta?
assistant: 150000
</example>

<example>
user: what files are in the directory src/?
assistant: [runs ls and sees foo.c, bar.c, baz.c]
user: which file contains the implementation of foo?
assistant: src/foo.c
</example>

<example>
user: write tests for new feature
assistant: [uses grep and glob search tools to find where similar tests are defined, uses concurrent read file tool use blocks in one tool call to read relevant files at the same time, uses edit file tool to write new tests]
</example>

# Proactiveness
You are allowed to be proactive, but only when the user asks you to do something. You should strive to strike a balance between:
1. Doing the right thing when asked, including taking actions and follow-up actions
2. Not surprising the user with actions you take without asking
For example, if the user asks you how to approach something, you should do your best to answer their question first, and not immediately jump into taking actions.
3. Do not add additional code explanation summary unless requested by the user. After working on a file, just stop, rather than providing an explanation of what you did.

# Following conventions
When making changes to files, first understand the file's code conventions. Mimic code style, use existing libraries and utilities, and follow existing patterns.
- NEVER assume that a given library is available, even if it is well known. Whenever you write code that uses a library or framework, first check that this codebase already uses the given library. For example, you might look at neighboring files, or check the package.json (or cargo.toml, and so on depending on the language).
- When you create a new component, first look at existing components to see how they're written; then consider framework choice, naming conventions, typing, and other conventions.
- When you edit a piece of code, first look at the code's surrounding context (especially its imports) to understand the code's choice of frameworks and libraries. Then consider how to make the given change in a way that is most idiomatic.
- Always follow security best practices. Never introduce code that exposes or logs secrets and keys. Never commit secrets or keys to the repository.

# Code style
- IMPORTANT: DO NOT ADD ***ANY*** COMMENTS unless asked


${G.has(yG.name)||G.has(oN.name)?`# Task Management
You have access to the ${yG.name} and ${oN.name} tools to help you manage and plan tasks. Use these tools VERY frequently to ensure that you are tracking your tasks and giving the user visibility into your progress.
These tools are also EXTREMELY helpful for planning tasks, and for breaking down larger complex tasks into smaller steps. If you do not use this tool when planning, you may forget to do important tasks - and that is unacceptable.

It is critical that you mark todos as completed as soon as you are done with a task. Do not batch up multiple tasks before marking them as completed.

Examples:

<example>
user: Run the build and fix any type errors
assistant: I'm going to use the ${yG.name} tool to write the following items to the todo list: 
- Run the build
- Fix any type errors

I'm now going to run the build using ${ZK}.

Looks like I found 10 type errors. I'm going to use the ${yG.name} tool to write 10 items to the todo list.

marking the first todo as in_progress

Let me start working on the first item...

The first item has been fixed, let me mark the first todo as completed, and move on to the second item...
..
..
</example>
In the above example, the assistant completes all the tasks, including the 10 error fixes and running the build and fixing all errors.

<example>
user: Help me write a new feature that allows users to track their usage metrics and export them to various formats

assistant: I'll help you implement a usage metrics tracking and export feature. Let me first use the ${yG.name} tool to plan this task.
Adding the following todos to the todo list:
1. Research existing metrics tracking in the codebase
2. Design the metrics collection system
3. Implement core metrics tracking functionality
4. Create export functionality for different formats

Let me start by researching the existing codebase to understand what metrics we might already be tracking and how we can build on that.

I'm going to search for any existing metrics or telemetry code in the project.

I've found some existing telemetry code. Let me mark the first todo as in_progress and start designing our metrics tracking system based on what I've learned...

[Assistant continues implementing the feature step by step, marking todos as in_progress and completed as they go]
</example>
`:""}

false

# Doing tasks
The user will primarily request you perform software engineering tasks. This includes solving bugs, adding new functionality, refactoring code, explaining code, and more. For these tasks the following steps are recommended:
- ${G.has(yG.name)||G.has(oN.name)?`Use the ${yG.name} tool to plan the task if required`:""}
- Use the available search tools to understand the codebase and the user's query. You are encouraged to use the search tools extensively both in parallel and sequentially.
- Implement the solution using all tools available to you
- Verify the solution if possible with tests. NEVER assume specific test framework or test script. Check the README or search codebase to determine the testing approach.
- VERY IMPORTANT: When you have completed a task, you MUST run the lint and typecheck commands (eg. npm run lint, npm run typecheck, ruff, etc.) with ${ZK} if they were provided to you to ensure your code is correct. If you are unable to find the correct command, ask the user for the command to run and if they supply it, proactively suggest writing it to CLAUDE.md so that you will know to run it next time.
NEVER commit changes unless the user explicitly asks you to. It is VERY IMPORTANT to only commit when explicitly asked, otherwise the user will feel that you are being too proactive.

- Tool results and user messages may include <system-reminder> tags. <system-reminder> tags contain useful information and reminders. They are NOT part of the user's provided input or the tool result.

${Um()?fa0():""}

# Tool usage policy${G.has(cX)?`
- When doing file search, prefer to use the ${cX} tool in order to reduce context usage.`:""}
- You have the capability to call multiple tools in a single response. When multiple independent pieces of information are requested, batch your tool calls together for optimal performance. When making multiple bash tool calls, you MUST send a single message with multiple tools calls to run the calls in parallel. For example, if you need to run "git status" and "git diff", send a single message with two tool calls to run the calls in parallel.

You MUST answer concisely with fewer than 4 lines of text (not including tool use or code generation), unless user asks for detail.
`, `
${await ha0(B,I)}`, `
${va0}
`, G.has(yG.name) || G.has(oN.name) ? `
IMPORTANT: Always use the ${yG.name} tool to plan and track tasks throughout the conversation.` : "", (Q && Q.length > 0, ""), `
# Code References

When referencing specific functions or pieces of code include the pattern \`file_path:line_number\` to allow the user to easily navigate to the source code location.

<example>
user: Where are errors from the client handled?
assistant: Clients are marked as failed in the \`connectToServer\` function in src/services/process.ts:712.
</example>
`]
}


// pJ1 - Lines 31427-31468
function pJ1(A, B, Q): any {
function pJ1(A, B, Q): any {
  if (A instanceof Error && A.message.includes(Vl1)) return eY({
      content: Xl1
  });
  if (A instanceof Error && A.message.includes(Pm)) return eY({
      content: Pm
  });
  if (A instanceof p6 && A.status === 429 && T9()) {
let I: any = A.headers ? .get ? .("anthropic-ratelimit-unified-reset"),
          G = Number(I) || 0,
          Z = `${Fl1}|${G}`;
      return eY({
          content: Z
      })
  }
  if (A instanceof Error && A.message.includes("prompt is too long")) return eY({
      content: Xt
  });
  if (A instanceof Error && A.message.includes("Your credit balance is too low")) return eY({
      content: Jl1
  });
  if (A instanceof Error && A.message.toLowerCase().includes("x-api-key")) {
      let {
          source: I
      } = GX(Q);
      return eY({
          content: I === "ANTHROPIC_API_KEY" || I === "apiKeyHelper" ? dJ1 : mJ1
      })
  }
  if (A instanceof p6 && A.status === 403 && A.message.includes("OAuth token has been revoked")) return eY({
      content: uJ1
  });
  if (process.env.CLAUDE_CODE_USE_BEDROCK && A instanceof Error && A.message.toLowerCase().includes("model id")) return eY({
      content: `${bZ} (${B}): ${A.message}`
  });
  if (A instanceof Error) return eY({
      content: `${bZ}: ${A.message}`
  });
  return eY({
      content: bZ
  })
}


// VK - Lines 32818-32864
async function VK(A, {
async function VK(A, {
  serverUrl: B,
  authorizationCode: Q
}): any {
let I: any = await rl1(B),
      G = await Promise.resolve(A.clientInformation());
  if (!G) {
      if (Q !== void 0) throw new Error("Existing OAuth client information is required when exchanging an authorization code");
      if (!A.saveClientInformation) throw new Error("OAuth client information must be saveable for dynamic registration");
let W: any = await OO6(B, {
          metadata: I,
          clientMetadata: A.clientMetadata
      });
      await A.saveClientInformation(W), G = W
  }
  if (Q !== void 0) {
let W: any = await A.codeVerifier(),
          J = await LO6(B, {
              metadata: I,
              clientInformation: G,
              authorizationCode: Q,
              codeVerifier: W,
              redirectUri: A.redirectUrl
          });
      return await A.saveTokens(J), "AUTHORIZED"
  }
let Z: any = await A.tokens();
  if (Z === null || Z === void 0 ? void 0 : Z.refresh_token) try {
let W: any = await RO6(B, {
          metadata: I,
          clientInformation: G,
          refreshToken: Z.refresh_token
      });
      return await A.saveTokens(W), "AUTHORIZED"
  } catch (W) {
      console.error("Could not refresh OAuth tokens:", W)
  }
  let {
      authorizationUrl: D,
      codeVerifier: Y
  } = await MO6(B, {
      metadata: I,
      clientInformation: G,
      redirectUrl: A.redirectUrl
  });
  return await A.saveCodeVerifier(Y), await A.redirectToAuthorization(D), "REDIRECT"
}


// rl1 - Lines 32865-32882
async function rl1(A, B): any {
async function rl1(A, B): any {
  var Q;
let I: any = new URL("/.well-known/oauth-authorization-server", A),
      G;
  try {
      G = await fetch(I, {
          headers: {
              "MCP-Protocol-Version": (Q = B === null || B === void 0 ? void 0 : B.protocolVersion) !== null && Q !== void 0 ? Q : xj
          }
      })
  } catch (Z) {
      if (Z instanceof TypeError) G = await fetch(I);
      else throw Z
  }
  if (G.status === 404) return;
  if (!G.ok) throw new Error(`HTTP ${G.status} trying to load well-known OAuth metadata`);
  return Vo0.parse(await G.json())
}


// MO6 - Lines 32883-32900
async function MO6(A, {
async function MO6(A, {
  metadata: B,
  clientInformation: Q,
  redirectUrl: I
}): any {
  let D;
  if (B) {
      if (D = new URL(B.authorization_endpoint), !B.response_types_supported.includes("code")) throw new Error("Incompatible auth server: does not support response type code");
      if (!B.code_challenge_methods_supported || !B.code_challenge_methods_supported.includes("S256")) throw new Error("Incompatible auth server: does not support code challenge method S256")
  } else D = new URL("/authorize", A);
let Y: any = await al1(),
      W = Y.code_verifier,
      J = Y.code_challenge;
  return D.searchParams.set("response_type", "code"), D.searchParams.set("client_id", Q.client_id), D.searchParams.set("code_challenge", J), D.searchParams.set("code_challenge_method", "S256"), D.searchParams.set("redirect_uri", String(I)), {
      authorizationUrl: D,
      codeVerifier: W
  }
}


// LO6 - Lines 32901-32929
async function LO6(A, {
async function LO6(A, {
  metadata: B,
  clientInformation: Q,
  authorizationCode: I,
  codeVerifier: G,
  redirectUri: Z
}): any {
  let Y;
  if (B) {
      if (Y = new URL(B.token_endpoint), B.grant_types_supported && !B.grant_types_supported.includes("authorization_code")) throw new Error("Incompatible auth server: does not support grant type authorization_code")
  } else Y = new URL("/token", A);
let W: any = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: Q.client_id,
      code: I,
      code_verifier: G,
      redirect_uri: String(Z)
  });
  if (Q.client_secret) W.set("client_secret", Q.client_secret);
let J: any = await fetch(Y, {
      method: "POST",
      headers: {
          "Content-Type": "application/x-www-form-urlencoded"
      },
      body: W
  });
  if (!J.ok) throw new Error(`Token exchange failed: HTTP ${J.status}`);
  return sl1.parse(await J.json())
}


// RO6 - Lines 32930-32954
async function RO6(A, {
async function RO6(A, {
  metadata: B,
  clientInformation: Q,
  refreshToken: I
}): any {
  let Z;
  if (B) {
      if (Z = new URL(B.token_endpoint), B.grant_types_supported && !B.grant_types_supported.includes("refresh_token")) throw new Error("Incompatible auth server: does not support grant type refresh_token")
  } else Z = new URL("/token", A);
let D: any = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: Q.client_id,
      refresh_token: I
  });
  if (Q.client_secret) D.set("client_secret", Q.client_secret);
let Y: any = await fetch(Z, {
      method: "POST",
      headers: {
          "Content-Type": "application/x-www-form-urlencoded"
      },
      body: D
  });
  if (!Y.ok) throw new Error(`Token refresh failed: HTTP ${Y.status}`);
  return sl1.parse(await Y.json())
}


// OO6 - Lines 32955-32973
async function OO6(A, {
async function OO6(A, {
  metadata: B,
  clientMetadata: Q
}): any {
  let I;
  if (B) {
      if (!B.registration_endpoint) throw new Error("Incompatible auth server: does not support dynamic client registration");
      I = new URL(B.registration_endpoint)
  } else I = new URL("/register", A);
let G: any = await fetch(I, {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify(Q)
  });
  if (!G.ok) throw new Error(`Dynamic client registration failed: HTTP ${G.status}`);
  return Ko0.parse(await G.json())
}


// He0 - Lines 33638-33670
function He0(A): any {
function He0(A): any {
  try {
let B: any = x1().readFileSync(A, {
              encoding: "utf-8"
          }),
          Q = [],
          I, G, Z = !1,
          D = !1,
          Y;
      try {
let F: any = JSON.parse(B);
          if (F.workspaceFolders) Q = F.workspaceFolders;
          I = F.pid, G = F.ideName, Z = F.transport === "ws", D = F.runningInWindows === !0, Y = F.authToken
      } catch (F) {
          Q = B.split(`
`).map((X) => X.trim())
      }
let W: any = A.split(Xe0).pop();
      if (!W) return null;
let J: any = W.replace(".lock", "");
      return {
          workspaceFolders: Q,
          port: parseInt(J),
          pid: I,
          ideName: G,
          useWebSocket: Z,
          runningInWindows: D,
          authToken: Y
      }
  } catch (B) {
      return b1(B), null
  }
}


// bt - Lines 33820-33859
async function bt(A): any {
async function bt(A): any {
let B: any = [];
  try {
let Q: any = process.env.CLAUDE_CODE_SSE_PORT,
          I = Q ? parseInt(Q) : null,
          G = e9(),
          Z = Ke0();
      for (let D of Z) {
let Y: any = He0(D);
          if (!Y) continue;
          if (Z7() !== "wsl" && KK() && (!Y.pid || !OS6(Y.pid))) continue;
let W: any = !1;
          if (process.env.CLAUDE_CODE_IDE_SKIP_VALID_CHECK === "true") W = !0;
          else if (I && Y.port === I) W = !0;
          else W = Y.workspaceFolders.some((V) => {
              if (!V) return !1;
let C: any = pm(V);
              return G === C || G.startsWith(C + Xe0)
          });
          if (!W && !A) continue;
let J: any = Y.ideName ? ? (KK() ? ft(mA.terminal) : "IDE");
          if (B.some((V) => V.name === J)) J += ` (${Y.port})`;
let F: any = await Oe0(Y.runningInWindows, Y.port),
              X;
          if (Y.useWebSocket) X = `ws://${F}:${Y.port}`;
          else X = `http://${F}:${Y.port}/sse`;
          B.push({
              url: X,
              name: J,
              workspaceFolders: Y.workspaceFolders,
              port: Y.port,
              isValid: W,
              authToken: Y.authToken
          })
      }
  } catch (Q) {
      b1(Q)
  }
  return B
}


// Eo6 - Lines 34578-34581
function Eo6(A): any {
function Eo6(A): any {
let B: any = new WK(A);
  return delete B.batches, delete B.countTokens, B
}


// Uo6 - Lines 34583-34586
function Uo6(A): any {
function Uo6(A): any {
let B: any = new nX(A);
  return delete B.promptCaching, delete B.messages.batches, delete B.messages.countTokens, B
}


// TK - Lines 34703-34752
async function TK({
async function TK({
  apiKey: A,
  maxRetries: B = 0,
  model: Q,
  isNonInteractiveSession: I,
  isSmallFastModel: G = !1
}): any {
let Z: any = {
      "x-app": "cli",
      "User-Agent": MR(),
      ...I45()
  };
  if (await F_1(), !T9()) Q45(Z);
let D: any = {
      defaultHeaders: Z,
      maxRetries: B,
      timeout: parseInt(process.env.API_TIMEOUT_MS || String(60000), 10),
      dangerouslyAllowBrowser: !0,
      fetchOptions: tn0()
  };
  if (process.env.CLAUDE_CODE_USE_BEDROCK) {
let W: any = G && process.env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION_AWS_REGION ? process.env.ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION_AWS_REGION : Xg(),
          J = { ...D,
              awsRegion: W,
              ...process.env.CLAUDE_CODE_SKIP_BEDROCK_AUTH && {
                  skipAuth: !0
              }
          };
      return new nV1(J)
  }
  if (process.env.CLAUDE_CODE_USE_VERTEX) {
let W: any = { ...D,
          region: AD0(Q),
          ...process.env.CLAUDE_CODE_SKIP_VERTEX_AUTH && {
              googleAuth: {
                  getClient: () => ({
                      getRequestHeaders: () => ({})
                  })
              }
          }
      };
      return new jC1(W)
  }
let Y: any = {
      apiKey: T9() ? null : A || qG(I),
      authToken: T9() ? $Z() ? .accessToken : void 0,
      ...D
  };
  return new kw(Y)
}


// Q45 - Lines 34754-34757
function Q45(A): any {
function Q45(A): any {
let B: any = process.env.ANTHROPIC_AUTH_TOKEN || dS();
  if (B) A.Authorization = `Bearer ${B}`, A["Proxy-Authorization"] = `Bearer ${B}`
}


// yC1 - Lines 34781-34801
async function yC1(A, B): any {
async function yC1(A, B): any {
  try {
      if (!A || A.length === 0) return 0;
let Q: any = J7(),
          I = await TK({
              maxRetries: 1,
              model: Q,
              isNonInteractiveSession: B
          }),
          G = jY(Q);
      return (await I.beta.messages.countTokens({
          model: Q,
          messages: A,
          ...G.length > 0 ? {
              betas: G
          } : {}
      })).input_tokens
  } catch (Q) {
      return b1(Q), null
  }
}


// Go1 - Lines 34808-34810
function Go1(): any {
function Go1(): any {
  return parseInt(process.env.MAX_MCP_OUTPUT_TOKENS ? ? "25000", 10)
}


// d65 - Lines 35356-35384
async function d65(): any {
async function d65(): any {
  let {
      min: A,
      max: B
  } = h65, Q = B - A + 1, I = Math.min(Q, 100);
  for (let G = 0; G < I; G++) {
let Z: any = A + Math.floor(Math.random() * Q);
      try {
          return await new Promise((D, Y) => {
let W: any = Vo1();
              W.once("error", Y), W.listen(Z, () => {
                  W.close(() => D())
              })
          }), Z
      } catch {
          continue
      }
  }
  try {
      return await new Promise((G, Z) => {
let D: any = Vo1();
          D.once("error", Z), D.listen(XC2, () => {
              D.close(() => G())
          })
      }), XC2
  } catch {
      throw new Error("No available ports for OAuth redirect")
  }
}


// iC1 - Lines 35395-35433
async function iC1(A, B): any {
async function iC1(A, B): any {
let I: any = VJ().read();
  if (!I ? .mcpOAuth) return;
let G: any = qO(A, B),
      Z = I.mcpOAuth[G];
  if (!Z ? .accessToken) {
      p2(A, "No tokens to revoke");
      return
  }
  try {
let D: any = await rl1(B.url);
      if (!D ? .revocation_endpoint) {
          p2(A, "Server does not support token revocation");
          return
      }
      p2(A, "Revoking tokens on server"), p2(A, `Revocation endpoint: ${D.revocation_endpoint}`);
let Y: any = new URLSearchParams;
      if (Y.set("token", Z.accessToken), Y.set("token_type_hint", "access_token"), Z.clientId) Y.set("client_id", Z.clientId);
      if (await P4.post(D.revocation_endpoint, Y, {
              headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Bearer ${Z.accessToken}`
              }
          }), p2(A, "Successfully revoked access token"), Z.refreshToken) {
let W: any = new URLSearchParams;
          if (W.set("token", Z.refreshToken), W.set("token_type_hint", "refresh_token"), Z.clientId) W.set("client_id", Z.clientId);
          await P4.post(D.revocation_endpoint, W, {
              headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                  Authorization: `Bearer ${Z.accessToken}`
              }
          }), p2(A, "Successfully revoked refresh token")
      }
  } catch (D) {
      if (P4.isAxiosError(D) && D.response) p2(A, `Failed to revoke tokens on server: ${D.message}, Status: ${D.response.status}, Data: ${JSON.stringify(D.response.data)}`);
      else p2(A, `Failed to revoke tokens on server: ${D}`)
  }
  VC2(A, B)
}


// VC2 - Lines 35435-35441
function VC2(A, B): any {
function VC2(A, B): any {
let Q: any = VJ(),
      I = Q.read();
  if (!I ? .mcpOAuth) return;
let G: any = qO(A, B);
  if (I.mcpOAuth[G]) delete I.mcpOAuth[G], Q.update(I), p2(A, "Cleared stored tokens")
}


// Ko1 - Lines 35442-35523
async function Ko1(A, B, Q): any {
async function Ko1(A, B, Q): any {
  VC2(A, B), E1("tengu_mcp_oauth_flow_start", {
      isOAuthFlow: !0
  });
let I: any = await d65(),
      G = `http://localhost:${I}/callback`;
  p2(A, `Using redirect port: ${I}`);
let Z: any = new MO(A, B, G, !0),
      D, Y = g65(32).toString("base64url");
  Z.saveOAuthState(Y);
let W: any = await new Promise((J, F) => {
let X: any = Vo1((V, C) => {
let K: any = f65(V.url || "", !0);
          if (K.pathname === "/callback") {
let E: any = K.query.code,
                  N = K.query.state,
                  query = K.query.error,
                  O = K.query.error_description,
                  R = K.query.error_uri;
              if (!q && N !== Y) {
                  C.writeHead(400, {
                      "Content-Type": "text/html"
                  }), C.end("<h1>Authentication Error</h1><p>Invalid state parameter. Please try again.</p><p>You can close this window.</p>"), X.close(), F(new Error("OAuth state mismatch - possible CSRF attack"));
                  return
              }
              if (q) {
                  C.writeHead(200, {
                      "Content-Type": "text/html"
                  });
let T: any = Co1.default(String(q)),
                      L = O ? Co1.default(String(O)) : "";
                  C.end(`<h1>Authentication Error</h1><p>${T}: ${L}</p><p>You can close this window.</p>`), X.close();
let _: any = `OAuth error: ${q}`;
                  if (O) _ += ` - ${O}`;
                  if (R) _ += ` (See: ${R})`;
                  F(new Error(_));
                  return
              }
              if (E) C.writeHead(200, {
                  "Content-Type": "text/html"
              }), C.end(`<h1>Authentication Successful</h1><p>You can close this window. Return to ${m0}.</p>`), X.close(), J(E)
          }
      });
      X.listen(I, async () => {
          try {
              p2(A, "Starting SDK auth"), p2(A, `Server URL: ${B.url}`);
let V: any = await VK(Z, {
                  serverUrl: B.url
              });
              if (p2(A, `Initial auth result: ${V}`), D = Z.authorizationUrl, D) Q(D);
              if (V !== "REDIRECT") p2(A, `Unexpected auth result, expected REDIRECT: ${V}`)
          } catch (V) {
              p2(A, `SDK auth error: ${V}`), X.close(), F(V)
          }
      }), setTimeout(() => {
          X.close(), F(new Error("Authentication timeout"))
      }, 300000)
  });
  try {
      p2(A, "Completing auth flow with authorization code");
let J: any = await VK(Z, {
          serverUrl: B.url,
          authorizationCode: W
      });
      if (p2(A, `Auth result: ${J}`), J === "AUTHORIZED") {
let F: any = await Z.tokens();
          if (p2(A, `Tokens after auth: ${F?"Present":"Missing"}`), F) p2(A, `Token access_token length: ${F.access_token?.length}`), p2(A, `Token expires_in: ${F.expires_in}`);
          E1("tengu_mcp_oauth_flow_success", {})
      } else throw new Error("Unexpected auth result: " + J)
  } catch (J) {
      if (p2(A, `Error during auth completion: ${J}`), P4.isAxiosError(J)) try {
let F: any = Co0.parse(J.response ? .data);
          if (F.error === "invalid_client" && F.error_description ? .includes("Client not found")) {
let X: any = VJ(),
                  V = X.read() || {},
                  C = qO(A, B);
              if (V.mcpOAuth ? .[C]) delete V.mcpOAuth[C].clientId, delete V.mcpOAuth[C].clientSecret, X.update(V)
          }
      } catch {}
      throw E1("tengu_mcp_oauth_flow_error", {}), J
  }
}


// eG5 - Lines 37158-37168
async function eG5(A, B, {
async function eG5(A, B, {
  isNonInteractiveSession: Q,
  maxSizeBytes: I = mK1,
  maxTokens: G = Zw2
}): any {
  if (!hK1.has(B) && A.length > I) throw new Error(Ut1(A.length, I));
let Z: any = AE(A);
  if (!Z || Z <= G / 4) return;
let D: any = await EV2(A, Q);
  if (D && D > G) throw new dK1(D, G)
}


// ww2 - Lines 37806-37829
function ww2(A, B, Q, I, G): any {
function ww2(A, B, Q, I, G): any {
let Z: any = B.href,
      D = B.title || null,
      Y = A[1].replace(G.other.outputLinkReplace, "$1");
  if (A[0].charAt(0) !== "!") {
      I.state.inLink = !0;
let W: any = {
          type: "link",
          raw: Q,
          href: Z,
          title: D,
          text: Y,
          tokens: I.inlineTokens(Y)
      };
      return I.state.inLink = !1, W
  }
  return {
      type: "image",
      raw: Q,
      href: Z,
      title: D,
      text: Y
  }
}


// aD - Lines 39290-39397
function aD(A, B, Q = 0, I = null, G = null): any {
function aD(A, B, Q = 0, I = null, G = null): any {
  switch (A.type) {
      case "blockquote":
          return UA.dim.italic((A.tokens ? ? []).map((Z) => aD(Z, B)).join(""));
      case "code":
          if (A.lang && E11.supportsLanguage(A.lang)) return E11.highlight(A.text, {
              language: A.lang
          }) + nD;
          else return b1(new Error(`Language not supported while highlighting code, falling back to markdown: ${A.lang}`)), E11.highlight(A.text, {
              language: "markdown"
          }) + nD;
      case "codespan":
          return V9("permission", B)(A.text);
      case "em":
          return UA.italic((A.tokens ? ? []).map((Z) => aD(Z, B)).join(""));
      case "strong":
          return UA.bold((A.tokens ? ? []).map((Z) => aD(Z, B)).join(""));
      case "del":
          return UA.strikethrough((A.tokens ? ? []).map((Z) => aD(Z, B)).join(""));
      case "heading":
          switch (A.depth) {
              case 1:
                  return UA.bold.italic.underline((A.tokens ? ? []).map((Z) => aD(Z, B)).join("")) + nD + nD;
              case 2:
                  return UA.bold((A.tokens ? ? []).map((Z) => aD(Z, B)).join("")) + nD + nD;
              default:
                  return UA.bold.dim((A.tokens ? ? []).map((Z) => aD(Z, B)).join("")) + nD + nD
          }
      case "hr":
          return "---";
      case "image":
          return A.href;
      case "link":
          return V9("permission", B)(A.href);
      case "list":
          return A.items.map((Z, D) => aD(Z, B, Q, A.ordered ? A.start + D : null, A)).join("");
      case "list_item":
          return (A.tokens ? ? []).map((Z) => `${"  ".repeat(Q)}${aD(Z,B,Q+1,I,A)}`).join("");
      case "paragraph":
          return (A.tokens ? ? []).map((Z) => aD(Z, B)).join("") + nD;
      case "space":
          return nD;
      case "text":
          if (G ? .type === "list_item") return `${I===null?"-":oZ5(Q,I)+"."} ${A.tokens?A.tokens.map((Z)=>aD(Z,B,Q,I,A)).join(""):A.text}${nD}`;
          else return A.text;
      case "table":
          {
let D: any = function(J) {
                      return UZ(J ? .map((F) => aD(F, B)).join("") ? ? "")
                  },
                  Z = A,
                  Y = Z.header.map((J, F) => {
let X: any = D(J.tokens).length;
                      for (let V of Z.rows) {
let C: any = D(V[F] ? .tokens).length;
                          X = Math.max(X, C)
                      }
                      return Math.max(X, 3)
                  }),
                  W = "| ";
              return Z.header.forEach((J, F) => {
let X: any = J.tokens ? .map((N) => aD(N, B)).join("") ? ? "",
                      V = D(J.tokens),
                      C = Y[F],
                      K = Z.align ? .[F],
                      E;
                  if (K === "center") {
let N: any = C - V.length,
                          query = Math.floor(N / 2),
                          O = N - q;
                      E = " ".repeat(q) + X + " ".repeat(O)
                  } else if (K === "right") {
let N: any = C - V.length;
                      E = " ".repeat(N) + X
                  } else E = X + " ".repeat(C - V.length);
                  W += E + " | "
              }),
              W = W.trimEnd() + nD,
              W += "|",
              Y.forEach((J) => {
let F: any = "-".repeat(J + 2);
                  W += F + "|"
              }),
              W += nD,
              Z.rows.forEach((J) => {
                  W += "| ", J.forEach((F, X) => {
let V: any = F.tokens ? .map((q) => aD(q, B)).join("") ? ? "",
                          C = D(F.tokens),
                          K = Y[X],
                          E = Z.align ? .[X],
                          N;
                      if (E === "center") {
let query: any = K - C.length,
                              O = Math.floor(q / 2),
                              R = q - O;
                          N = " ".repeat(O) + V + " ".repeat(R)
                      } else if (E === "right") {
let query: any = K - C.length;
                          N = " ".repeat(q) + V
                      } else N = V + " ".repeat(K - C.length);
                      W += N + " | "
                  }), W = W.trimEnd() + nD
              }),
              W + nD
          }
  }
  return ""
}


// jw2 - Lines 39539-39569
function jw2({
function jw2({
  content: A,
  isApiErrorMessage: B = !1,
  usage: Q = {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: {
          web_search_requests: 0
      }
  }
}): any {
  return {
      type: "assistant",
      uuid: mO(),
      timestamp: new Date().toISOString(),
      message: {
          id: mO(),
          model: "<synthetic>",
          role: "assistant",
          stop_reason: "stop_sequence",
          stop_sequence: "",
          type: "message",
          usage: Q,
          content: A
      },
      requestId: void 0,
      isApiErrorMessage: B
  }
}


// O - Lines 41467-41492
      function O(): any {
      function O(): any {
          for (var T = Math.max(N, -F); T <= Math.min(q, F); T += 2) {
var L: any = void 0,
                  _ = K[T - 1],
                  count = K[T + 1];
              if (_) K[T - 1] = void 0;
var iterator: any = !1;
              if (k) {
var var_x: any = count.oldPos - T;
                  iterator = k && 0 <= x && x < W
              }
var var_s: any = _ && _.oldPos + 1 < J;
              if (!i && !s) {
                  K[T] = void 0;
                  continue
              }
              if (!s || i && _.oldPos < count.oldPos) L = D.addToPath(k, !0, !1, 0, G);
              else L = D.addToPath(_, !1, !0, 1, G);
              if (E = D.extractCommon(L, Q, B, T, G), L.oldPos + 1 >= J && E + 1 >= W) return Y(ew2(D, L.lastComponent, Q, B, D.useLongestToken));
              else {
                  if (K[T] = L, L.oldPos + 1 >= J) query = Math.min(q, T - 1);
                  if (E + 1 >= W) N = Math.max(N, T + 1)
              }
          }
          F++
      }


// JE2 - Lines 42396-42409
async function JE2(): any {
async function JE2(): any {
  if (MQ() !== "firstParty" || T9()) return;
let B: any = ZA(),
      Q = B.oauthAccount ? .organizationUuid;
  if (!Q) return;
  try {
let I: any = BB(),
          G = await P4.get(`${I.BASE_API_URL}/api/organization/${Q}/claude_code_recommended_subscription`),
          Z = G.data ? G.data.recommended_subscription || "" : "";
      if (B.recommendedSubscription !== Z) j0({ ...B,
          recommendedSubscription: Z
      })
  } catch (I) {}
}


// rD5 - Lines 42411-42419
function rD5(): any {
function rD5(): any {
  if (MQ() !== "firstParty") return !1;
  if (T9()) return !1;
  let {
      source: B
  } = GX(!1), I = ZA().oauthAccount ? .organizationUuid;
  if (B !== "/login managed key" || !I) return !1;
  return !0
}


// ot1 - Lines 42421-42450
function ot1(): any {
function ot1(): any {
  if (!rD5()) return "";
let B: any = ZA().recommendedSubscription || "",
      Q = "";
  switch (B) {
      case "pro":
          Q = `

You can now use a Autocoder Pro subscription with Autocoder! ${UA.bold("https://claude.ai/upgrade")} then run /login.
`;
          break;
      case "max5x":
          Q = `

With the $100/mo Max plan, use Sonnet 4 as your daily driver with predictable pricing. • /upgrade to sign up
`;
          break;
      case "max20x":
          Q = `

With the $200/mo Max plan, use Opus 4 as your daily driver with predictable pricing. • /upgrade to sign up
`;
          break;
      default:
          return ""
  }
  return E1("tengu_subscription_upsell_shown", {
      recommendedSubscription: B
  }), Q
}


// tD5 - Lines 42485-42496
function tD5(): any {
function tD5(): any {
let A: any = e2A();
  if (Object.keys(A).length === 0) return "Tokens:                0 input, 0 output, 0 cache read, 0 cache write";
let B: any = "Token usage by model:";
  for (let [Q, I] of Object.entries(A)) {
let G: any = kC(Q),
          Z = `  ${_G(I.inputTokens)} input, ${_G(I.outputTokens)} output, ${_G(I.cacheReadInputTokens)} cache read, ${_G(I.cacheCreationInputTokens)} cache write`;
      B += `
` + `${G}:`.padStart(21) + Z
  }
  return B
}


// CE2 - Lines 42508-42532
function CE2(): any {
function CE2(): any {
  VE2.useEffect(() => {
let A: any = () => {
          if (kG1()) process.stdout.write(`
` + tt1() + `
`);
let B: any = m9();
          B5({ ...B,
              lastCost: KU(),
              lastAPIDuration: KP(),
              lastDuration: zU1(),
              lastLinesAdded: F21(),
              lastLinesRemoved: X21(),
              lastTotalInputTokens: a2A(),
              lastTotalOutputTokens: s2A(),
              lastTotalCacheCreationInputTokens: o2A(),
              lastTotalCacheReadInputTokens: r2A(),
              lastSessionId: y9()
          })
      };
      return process.on("exit", A), () => {
          process.off("exit", A)
      }
  }, [])
}


// KE2 - Lines 42538-42554
function KE2(A, B, Q, I, G): any {
function KE2(A, B, Q, I, G): any {
  n2A(A, B, Q, I, G), Y9A() ? .add(A, {
      model: G
  }), Vc() ? .add(I.input_tokens, {
      type: "input",
      model: G
  }), Vc() ? .add(I.output_tokens, {
      type: "output",
      model: G
  }), Vc() ? .add(I.cache_read_input_tokens ? ? 0, {
      type: "cacheRead",
      model: G
  }), Vc() ? .add(I.cache_creation_input_tokens ? ? 0, {
      type: "cacheCreation",
      model: G
  })
}


// zY5 - Lines 43594-43596
function zY5(A): any {
function zY5(A): any {
  return A.input_tokens + (A.cache_creation_input_tokens ? ? 0) + (A.cache_read_input_tokens ? ? 0) + A.output_tokens
}


// wY5 - Lines 43624-43645
async function wY5(): any {
async function wY5(): any {
let A: any = K_(),
      B = await TK({
          maxRetries: 0,
          model: A,
          isNonInteractiveSession: !1
      }),
      Q = [{
          role: "user",
          content: "quota"
      }],
      I = jY(A);
  return B.beta.messages.create({
      model: A,
      max_tokens: 1,
      messages: Q,
      metadata: _11(),
      ...I.length > 0 ? {
          betas: I
      } : {}
  }).asResponse()
}


// zH1 - Lines 43826-43857
async function zH1(): any {
async function zH1(): any {
  try {
      if (T9()) return !1;
let A: any = ZA().oauthAccount;
      if (!A) return !1;
let B: any = qG(!1);
      if (!B) return !1;
let Q: any = A.organizationUuid;
      if (!Q) {
          if (Q = await qY5(B), !Q) return !1
      }
let I: any = await P4.get(`https://api.elizaos.ai/api/organizations/${Q}/claude_code_data_sharing`, {
          headers: {
              "Content-Type": "application/json",
              "User-Agent": MR(),
              "x-api-key": B
          }
      });
      if (I.status === 200) {
let G: any = I.data.claude_code_data_sharing_enabled;
          if (ZA().isQualifiedForDataSharing !== G) j0({ ...ZA(),
              isQualifiedForDataSharing: G
          }), HH1 = !1;
          return G
      }
      return E1("tengu_data_sharing_response_err", {
          responseStatus: I.status
      }), !1
  } catch (A) {
      return b1(A), !1
  }
}


// OY5 - Lines 43919-43926
function OY5(A, B): any {
function OY5(A, B): any {
  return {
      inputTokens: A.inputTokens + B.inputTokens,
      outputTokens: A.outputTokens + B.outputTokens,
      promptCacheWriteTokens: A.promptCacheWriteTokens + B.promptCacheWriteTokens,
      promptCacheReadTokens: A.promptCacheReadTokens + B.promptCacheReadTokens
  }
}


// pE2 - Lines 43966-43968
function pE2(A, B): any {
function pE2(A, B): any {
  return B.input_tokens / 1e6 * A.inputTokens + B.output_tokens / 1e6 * A.outputTokens + (B.cache_read_input_tokens ? ? 0) / 1e6 * A.promptCacheReadTokens + (B.cache_creation_input_tokens ? ? 0) / 1e6 * A.promptCacheWriteTokens
}


// Ce1 - Lines 44035-44071
function Ce1({
function Ce1({
  error: A,
  model: B,
  messageCount: Q,
  messageTokens: I,
  durationMs: G,
  durationMsIncludingRetries: Z,
  attempt: D,
  requestId: Y,
  didFallBackToNonStreaming: W,
  promptCategory: J
}): any {
let F: any = A instanceof Error ? A.message : String(A),
      X = A instanceof p6 ? String(A.status) : void 0;
  b1(A), E1("tengu_api_error", {
      model: B,
      error: F,
      status: X,
      messageCount: Q,
      messageTokens: I,
      durationMs: G,
      durationMsIncludingRetries: Z,
      attempt: D,
      provider: Wz(),
      requestId: Y || void 0,
      didFallBackToNonStreaming: W,
      ...J ? {
          promptCategory: J
      } : {}
  }), bK("api_error", {
      model: B,
      error: F,
      status_code: String(X),
      duration_ms: String(G),
      attempt: String(D)
  })
}


// SY5 - Lines 44073-44111
function SY5({
function SY5({
  model: A,
  messageCount: B,
  messageTokens: Q,
  usage: I,
  durationMs: G,
  durationMsIncludingRetries: Z,
  attempt: D,
  ttftMs: Y,
  requestId: W,
  stopReason: J,
  stickerCostUSD: F,
  costUSD: X,
  didFallBackToNonStreaming: V,
  promptCategory: C
}): any {
  E1("tengu_api_success", {
      model: A,
      messageCount: B,
      messageTokens: Q,
      inputTokens: I.input_tokens,
      outputTokens: I.output_tokens,
      cachedInputTokens: I.cache_read_input_tokens ? ? 0,
      uncachedInputTokens: I.cache_creation_input_tokens ? ? 0,
      durationMs: G,
      durationMsIncludingRetries: Z,
      attempt: D,
      ttftMs: Y ? ? void 0,
      provider: Wz(),
      requestId: W ? ? void 0,
      stop_reason: J ? ? void 0,
      stickerCostUSD: F,
      costUSD: X,
      didFallBackToNonStreaming: V,
      ...C ? {
          promptCategory: C
      } : {}
  })
}


// Ke1 - Lines 44135-44179
function Ke1({
function Ke1({
  model: A,
  start: B,
  startIncludingRetries: Q,
  ttftMs: I,
  usage: G,
  attempt: Z,
  messageCount: D,
  messageTokens: Y,
  requestId: W,
  stopReason: J,
  didFallBackToNonStreaming: F,
  promptCategory: X
}): any {
  let {
      stickerCostUSD: V,
      costUSD: C,
      durationMs: K,
      durationMsIncludingRetries: E
  } = _Y5(A, G, B, Q);
  SY5({
      model: A,
      messageCount: D,
      messageTokens: Y,
      usage: G,
      durationMs: K,
      durationMsIncludingRetries: E,
      attempt: Z,
      ttftMs: I,
      requestId: W,
      stopReason: J,
      stickerCostUSD: V,
      costUSD: C,
      didFallBackToNonStreaming: F,
      promptCategory: X
  }), bK("api_request", {
      model: A,
      input_tokens: String(G.input_tokens),
      output_tokens: String(G.output_tokens),
      cache_read_tokens: String(G.cache_read_input_tokens),
      cache_creation_tokens: String(G.cache_creation_input_tokens),
      cost_usd: String(C),
      duration_ms: String(K)
  })
}


// y11 - Lines 44205-44258
async function y11(A, B, Q): any {
async function y11(A, B, Q): any {
let I: any = Q.maxRetries ? ? jY5,
      G, Z = {
          model: Q.model
      },
      D = 0,
      Y = null;
  for (let W = 1; W <= I + 1; W++) try {
      if (Y === null || G instanceof p6 && G.status === 401) Y = await A();
      return await B(Y, W, Z)
  } catch (J) {
      if (G = J, fY5(J) && !T9() && UG1(Q.model)) {
          if (D++, D >= yY5)
              if (Q.fallbackModel) throw E1("tengu_api_opus_fallback_triggered", {
                  original_model: Q.model,
                  fallback_model: Q.fallbackModel,
                  provider: Wz()
              }), new wH1(Q.model, Q.fallbackModel);
              else throw E1("tengu_api_custom_529_overloaded_error", {}), new cO(new Error(Vl1), Z)
      }
      if (W > I || !(J instanceof p6) || !vY5(J)) throw new cO(J, Z);
      if (J instanceof p6) {
let V: any = lE2(J);
          if (V) {
              let {
                  inputTokens: C,
                  contextLimit: K
              } = V, E = 1000, N = Math.max(0, K - C - 1000);
              if (N < He1) throw b1(new Error(`availableContext ${N} is less than FLOOR_OUTPUT_TOKENS ${He1}`)), J;
let query: any = Math.max(He1, N);
              Z.maxTokensOverride = q, E1("tengu_max_tokens_context_overflow_adjustment", {
                  inputTokens: C,
                  contextLimit: K,
                  adjustedMaxTokens: q,
                  attempt: W
              });
              continue
          }
      }
let F: any = (J.headers ? .["retry-after"] || J.headers ? .get ? .("retry-after")) ? ? null,
          X = xY5(W, F);
      if (Q.showErrors) {
          if (console.error(`  ⎿  ${UA.red(`API ${J.name} (${J.message}) · Retrying in ${Math.round(X/1000)} seconds… (attempt ${W}/${I})`)}`), J.cause instanceof Error) console.error(`    ⎿  ${UA.red(`${J.cause.name} (${J.cause.message})${"code"in J.cause?` (${J.cause.code})`:""}`)}`)
      }
      E1("tengu_api_retry", {
          attempt: W,
          delayMs: X,
          error: J.message,
          status: J.status,
          provider: Wz()
      }), await new Promise((V) => setTimeout(V, X))
  }
  throw new cO(G, Z)
}


// lE2 - Lines 44270-44289
function lE2(A): any {
function lE2(A): any {
  if (A.status !== 400 || !A.message) return;
  if (!A.message.includes("input length and `max_tokens` exceed context limit")) return;
let B: any = /input length and `max_tokens` exceed context limit: (\d+) \+ (\d+) > (\d+)/,
      Q = A.message.match(B);
  if (!Q || Q.length !== 4) return;
  if (!Q[1] || !Q[2] || !Q[3]) {
      b1(new Error("Unable to parse max_tokens from max_tokens exceed context limit error message"));
      return
  }
let I: any = parseInt(Q[1], 10),
      G = parseInt(Q[2], 10),
      Z = parseInt(Q[3], 10);
  if (isNaN(I) || isNaN(G) || isNaN(Z)) return;
  return {
      inputTokens: I,
      maxTokens: G,
      contextLimit: Z
  }
}


// iE2 - Lines 44345-44382
async function iE2(A, B): any {
async function iE2(A, B): any {
  if (B) return !0;
  try {
let Q: any = K_(),
          I = jY(Q);
      return await y11(() => TK({
          apiKey: A,
          maxRetries: 3,
          model: Q,
          isNonInteractiveSession: B
      }), async (G) => {
let Z: any = [{
              role: "user",
              content: "test"
          }];
          return await G.beta.messages.create({
              model: Q,
              max_tokens: 1,
              messages: Z,
              temperature: 0,
              ...I.length > 0 ? {
                  betas: I
              } : {},
              metadata: _11(),
              ...EH1()
          }), !0
      }, {
          maxRetries: 2,
          showErrors: !1,
          model: Q
      }), !0
  } catch (Q) {
let I: any = Q;
      if (Q instanceof cO) I = Q.originalError;
      if (b1(I), I instanceof Error && I.message.includes('{"type":"error","error":{"type":"authentication_error","message":"invalid x-api-key"}}')) return !1;
      throw I
  }
}


// wy - Lines 44749-44759
function wy(A, B): any {
function wy(A, B): any {
  return {
      input_tokens: A.input_tokens + (B.input_tokens ? ? 0),
      cache_creation_input_tokens: A.cache_creation_input_tokens + (B.cache_creation_input_tokens ? ? 0),
      cache_read_input_tokens: A.cache_read_input_tokens + (B.cache_read_input_tokens ? ? 0),
      output_tokens: A.output_tokens + (B.output_tokens ? ? 0),
      server_tool_use: {
          web_search_requests: A.server_tool_use.web_search_requests + (B.server_tool_use ? .web_search_requests ? ? 0)
      }
  }
}


// uY5 - Lines 44766-44873
async function uY5({
async function uY5({
  systemPrompt: A,
  userPrompt: B,
  assistantPrompt: Q,
  signal: I,
  isNonInteractiveSession: G,
  temperature: Z = 0,
  enablePromptCaching: D,
  promptCategory: Y
}): any {
let W: any = K_(),
      J = [{
          role: "user",
          content: B
      }, ...Q ? [{
          role: "assistant",
          content: Q
      }] : []],
      F = aE2(A, D && zy()),
      X = D ? [...F, ...J] : [{
          systemPrompt: A
      }, ...J];
  Ve1({
      model: W,
      messagesLength: JSON.stringify(X).length,
      temperature: Z,
      promptCategory: Y
  });
let V: any = 0,
      C = Date.now(),
      K = Date.now(),
      E, N, query = jY(W);
  try {
      if (E = await y11(() => TK({
              maxRetries: 0,
              model: W,
              isNonInteractiveSession: G,
              isSmallFastModel: !0
          }), async (L, _, k) => {
              return V = _, C = Date.now(), N = L.beta.messages.stream({
                  model: count.model,
                  max_tokens: 512,
                  messages: J,
                  system: F,
                  temperature: Z,
                  metadata: _11(),
                  stream: !0,
                  ...query.length > 0 ? {
                      betas: q
                  } : {},
                  ...EH1()
              }, {
                  signal: I
              }), await gY5(N)
          }, {
              showErrors: !1,
              model: W
          }), N) {
let L: any = (await N.withResponse()).response;
          sE2(L)
      }
  } catch (L) {
let _: any = L,
          count = W;
      if (L instanceof cO) _ = L.originalError, count = L.retryContext.model;
      return Ce1({
          error: _,
          model: k,
          messageCount: Q ? 2 : 1,
          durationMs: Date.now() - C,
          durationMsIncludingRetries: Date.now() - K,
          attempt: V,
          requestId: N ? .request_id,
          promptCategory: Y
      }), pJ1(_, k, G)
  }
let O: any = Cl1(E.stopReason);
  if (O) return O;
let T: any = {
      message: D ? { ...E.message,
          content: q11(E.message.content)
      } : { ...E.message,
          content: q11(E.message.content),
          usage: { ...E.usage,
              cache_read_input_tokens: 0,
              cache_creation_input_tokens: 0
          }
      },
      uuid: ze1(),
      requestId: N ? .request_id ? ? void 0,
      type: "assistant",
      timestamp: new Date().toISOString()
  };
  return Ke1({
      model: W,
      usage: E.usage,
      start: C,
      startIncludingRetries: K,
      attempt: V,
      messageCount: Q ? 2 : 1,
      messageTokens: VE([T]),
      requestId: N ? .request_id ? ? null,
      stopReason: E.stopReason,
      ttftMs: E.ttftMs,
      didFallBackToNonStreaming: !1,
      promptCategory: Y
  }), T
}


// Ee1 - Lines 44918-44927
function Ee1(A): any {
function Ee1(A): any {
  if (A.includes("3-5")) return 8192;
  if (A.includes("haiku")) return 8192;
let B: any = process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS;
  if (B) {
let Q: any = parseInt(B, 10);
      if (!isNaN(Q) && Q > 0) return Q
  }
  return 32000
}


// Z - Lines 45551-45572
  function Z(D): any {
  function Z(D): any {
      for (let Y of D) {
          if (Y.type === "code" || Y.type === "codespan") continue;
          if (Y.type === "text") {
let W: any = Y.text || "",
                  J = /(?:^|\s)@((?:[^\s\\]|\\ )+)/g,
                  F;
              while ((F = J.exec(W)) !== null) {
let X: any = F[1];
                  if (!X) continue;
                  if (X = X.replace(/\\ /g, " "), X) {
                      if (X.startsWith("./") || X.startsWith("~/") || X.startsWith("/") && X !== "/" || !X.startsWith("@") && !X.match(/^[#%^&*()]+/) && X.match(/^[a-zA-Z0-9._-]/)) {
let C: any = c81(X, B);
                          Q.add(C)
                      }
                  }
              }
          }
          if (Y.tokens) Z(Y.tokens);
          if (Y.items) Z(Y.items)
      }
  }


// Re1 - Lines 45962-46000
function Re1(A): any {
function Re1(A): any {
let B: any = {
          toolRequests: new Map,
          toolResults: new Map,
          humanMessages: 0,
          assistantMessages: 0,
          localCommandOutputs: 0,
          other: 0,
          attachments: new Map,
          duplicateFileReads: new Map,
          total: 0
      },
      Q = new Map,
      I = new Map,
      G = new Map;
  return A.forEach((D) => {
      if (D.type === "attachment") {
let Y: any = D.attachment.type || "unknown";
          B.attachments.set(Y, (B.attachments.get(Y) || 0) + 1)
      }
  }), JW(A).forEach((D) => {
      let {
          content: Y
      } = D.message;
      if (typeof Y === "string") {
let W: any = AE(Y);
          if (B.total += W, D.type === "user" && Y.includes("local-command-stdout")) B.localCommandOutputs += W;
          else B[D.type === "user" ? "humanMessages" : "assistantMessages"] += W
      } else Y.forEach((W) => $W5(W, D, B, Q, I, G))
  }), G.forEach((D, Y) => {
      if (D.count > 1) {
let J: any = Math.floor(D.totalTokens / D.count) * (D.count - 1);
          B.duplicateFileReads.set(Y, {
              count: D.count,
              tokens: J
          })
      }
  }), B
}


// HU2 - Lines 46055-46082
function HU2(A): any {
function HU2(A): any {
let B: any = {
      total_tokens: A.total,
      human_message_tokens: A.humanMessages,
      assistant_message_tokens: A.assistantMessages,
      local_command_output_tokens: A.localCommandOutputs,
      other_tokens: A.other
  };
  A.attachments.forEach((I, G) => {
      B[`attachment_${G}_count`] = I
  }), A.toolRequests.forEach((I, G) => {
      B[`tool_request_${G}_tokens`] = I
  }), A.toolResults.forEach((I, G) => {
      B[`tool_result_${G}_tokens`] = I
  });
let Q: any = [...A.duplicateFileReads.values()].reduce((I, G) => I + G.tokens, 0);
  if (B.duplicate_read_tokens = Q, B.duplicate_read_file_count = A.duplicateFileReads.size, A.total > 0) {
      B.human_message_percent = Math.round(A.humanMessages / A.total * 100), B.assistant_message_percent = Math.round(A.assistantMessages / A.total * 100), B.local_command_output_percent = Math.round(A.localCommandOutputs / A.total * 100), B.duplicate_read_percent = Math.round(Q / A.total * 100);
let I: any = [...A.toolRequests.values()].reduce((Z, D) => Z + D, 0),
          G = [...A.toolResults.values()].reduce((Z, D) => Z + D, 0);
      B.tool_request_percent = Math.round(I / A.total * 100), B.tool_result_percent = Math.round(G / A.total * 100), A.toolRequests.forEach((Z, D) => {
          B[`tool_request_${D}_percent`] = Math.round(Z / A.total * 100)
      }), A.toolResults.forEach((Z, D) => {
          B[`tool_result_${D}_percent`] = Math.round(Z / A.total * 100)
      })
  }
  return B
}


// qH1 - Lines 46089-46164
async function qH1(A, B, Q, I): any {
async function qH1(A, B, Q, I): any {
  try {
      if (A.length === 0) throw new Error(v11);
let G: any = VE(A),
          Z = Re1(A),
          D = {};
      try {
          D = HU2(Z)
      } catch (T) {
          M6("Failed to get context analysis metrics"), b1(T)
      }
      E1("tengu_compact", {
          preCompactTokenCount: G,
          ...D
      }), QU2(B.getToolPermissionContext()), B.setStreamMode ? .("requesting"), B.setResponseLength ? .(0), B.setSpinnerMessage ? .("Compacting conversation");
let Y: any = AU2(I),
          W = K2({
              content: Y
          }),
          J = wu(JW([...A, W]), ["You are a helpful AI assistant tasked with summarizing conversations."], 0, [OB], B.abortController.signal, {
              getToolPermissionContext: B.getToolPermissionContext,
              model: J7(),
              prependCLISysprompt: !0,
              toolChoice: void 0,
              isNonInteractiveSession: B.options.isNonInteractiveSession,
              maxOutputTokensOverride: CU2
          }),
          F = 0,
          X = J[Symbol.asyncIterator](),
          V = await X.next(),
          C = !1,
          K;
      while (!V.done) {
let T: any = V.value;
          if (!C && T.type === "stream_event" && T.event.type === "content_block_start" && T.event.content_block.type === "text") C = !0, B.setStreamMode ? .("responding");
          if (T.type === "stream_event" && T.event.type === "content_block_delta" && T.event.delta.type === "text_delta") F += T.event.delta.text.length, B.setResponseLength ? .(F);
          if (T.type === "assistant") K = T;
          V = await X.next()
      }
      if (!K) throw new Error("Failed to get summary response from streaming");
let E: any = BH1(K);
      if (!E) throw E1("tengu_compact_failed", {
          reason: "no_summary",
          preCompactTokenCount: G
      }), new Error("Failed to generate conversation summary - response did not contain valid text content");
      else if (E.startsWith(bZ)) throw E1("tengu_compact_failed", {
          reason: "api_error",
          preCompactTokenCount: G
      }), new Error(E);
      else if (E.startsWith(Xt)) throw E1("tengu_compact_failed", {
          reason: "prompt_too_long",
          preCompactTokenCount: G
      }), new Error(RW5);
let N: any = { ...B.readFileState
      };
      if (B.readFileState) Object.keys(B.readFileState).forEach((T) => {
          delete B.readFileState[T]
      });
let query: any = await TW5(N, B, qW5),
          O = PW5(B.agentId);
      if (O) query.push(O);
let R: any = [K2({
          content: BU2(E, Q),
          isCompactSummary: !0
      }), ...q];
      if (B.setMessages) {
          if (B.setMessages(R), B.setMessageHistory) B.setMessageHistory((T) => [...T, ...A])
      }
      return B.setStreamMode ? .("requesting"), B.setResponseLength ? .(0), B.setSpinnerMessage ? .(null), {
          summaryMessage: K,
          messagesAfterCompacting: R
      }
  } catch (G) {
      throw B.setStreamMode ? .("requesting"), B.setResponseLength ? .(0), B.setSpinnerMessage ? .(null), OW5(G, B), G
  }
}


// TW5 - Lines 46179-46199
async function TW5(A, B, Q): any {
async function TW5(A, B, Q): any {
let I: any = Object.entries(A).map(([D, Y]) => ({
          filename: D,
          ...Y
      })).filter((D) => !SW5(D.filename, B.agentId)).sort((D, Y) => Y.timestamp - D.timestamp).slice(0, Q),
      G = await Promise.all(I.map(async (D) => {
let Y: any = await Le1(D.filename, { ...B,
              fileReadingLimits: {
                  maxTokens: LW5
              }
          }, "tengu_post_compact_file_restore_success", "tengu_post_compact_file_restore_error");
          return Y ? Nu(Y) : null
      })),
      Z = 0;
  return G.filter((D) => {
      if (D === null) return !1;
let Y: any = AE(JSON.stringify(D));
      if (Z + Y <= MW5) return Z += Y, !0;
      return !1
  })
}


// _q2 - Lines 48390-48544
function _q2(A, B): any {
function _q2(A, B): any {
  let [Q] = q9(), [, I] = d5();
  Sq2.useEffect(() => {
      I((F) => {
let X: any = DV(),
              V = B ? { ...X,
                  ...B
              } : X,
              C = Object.entries(V).map(([K, E]) => ({
                  name: K,
                  type: "pending",
                  config: E
              }));
          return { ...F,
              mcp: { ...F.mcp,
                  clients: C,
                  tools: [],
                  commands: [],
                  resources: {}
              }
          }
      });
let G: any = (F) => {
              I((X) => ({ ...X,
                  mcp: { ...X.mcp,
                      clients: F(X.mcp.clients)
                  }
              }))
          },
          Z = (F) => {
              I((X) => ({ ...X,
                  mcp: { ...X.mcp,
                      tools: F(X.mcp.tools)
                  }
              }))
          },
          D = (F) => {
              I((X) => ({ ...X,
                  mcp: { ...X.mcp,
                      commands: F(X.mcp.commands)
                  }
              }))
          },
          Y = (F) => {
              I((X) => ({ ...X,
                  mcp: { ...X.mcp,
                      resources: F(X.mcp.resources)
                  }
              }))
          };
      G((F) => {
let X: any = DV(),
              V = F.filter((C) => X[C.name] || B ? .[C.name]);
          if (B) Object.entries(B).forEach(([C, K]) => {
              if (!V.find((E) => E.name === C)) V.push({
                  name: C,
                  type: "pending",
                  config: K
              })
          });
          return V
      }), Z(() => []), D(() => []), Y(() => ({}));
let W: any = 0,
          J = ({
              client: F,
              tools: X,
              commands: V,
              resources: C
          }) => {
              try {
                  if (F.type === "needs-auth") {
let K: any = {
                          text: `MCP Server ${UA.bold(F.name)} needs authentication · ${UA.dim("/mcp to authenticate")}`,
                          color: "warning"
                      };
                      A(K, {
                          timeoutMs: 1e4
                      })
                  } else if (F.type === "failed") {
                      if (F.config.type !== "sse-ide" && F.config.type !== "ws-ide") W++;
                      if (W > 0) {
let K: any = {
                              text: `${W} MCP server${W>1?"s":""} failed to connect (see /mcp for info)`,
                              color: "error"
                          };
                          A(K, {
                              timeoutMs: 1e4
                          })
                      }
                  }
                  if (F.type === "connected" && F.client.transport) {
let E: any = function(R) {
                              if (!K) return;
                              K = !1, m7(F.name, R), G((T) => T.map((L) => L.name !== F.name ? L : {
                                  name: L.name,
                                  type: "failed",
                                  config: L.config
                              })), Z((T) => ci(T, F.name)), D((T) => li(T, F.name)), Y((T) => ii(T, F.name))
                          },
                          K = !0,
                          N = F.client.transport.onclose;
                      F.client.transport.onclose = () => {
                          if (N) N();
                          if (F.config.type === "sse" || F.config.type === "sse-ide") {
                              p2(F.name, "SSE transport closed, attempting to reconnect"), G((T) => T.map((L) => L.name !== F.name ? L : {
                                  name: L.name,
                                  type: "pending",
                                  config: L.config
                              }));
let R: any = F.client.transport;
                              if (R && typeof R.close === "function") R.close().catch((T) => {
                                  p2(F.name, `Error closing old transport: ${T}`)
                              });
                              setTimeout(() => {
                                  if (R) R.onclose = void 0, R.onerror = void 0, R.onmessage = void 0
                              }, 0), pe(F.name, F.config, J).catch((T) => {
                                  m7(F.name, `Reconnection failed: ${T}`), E(`Reconnection failed: ${T}`)
                              })
                          } else E("transport closed")
                      };
let query: any = F.client.transport.onerror;
                      F.client.transport.onerror = (R) => {
                          if (q) q(R);
                          if (F.config.type === "sse" || F.config.type === "sse-ide") m7(F.name, `Transport error: ${R}`);
                          else E(R)
                      };
let O: any = F.client.transport.onmessage;
                      F.client.transport.onmessage = (...R) => {
                          if (O) O.apply(F.client.transport, R);
                          if (K) return;
                          if (K = !0, G((T) => T.map((L) => L.name !== F.name ? L : { ...F,
                                  type: "connected"
                              })), Z((T) => {
                                  return [...T.filter((L) => !X.includes(L)), ...X]
                              }), D((T) => {
                                  return [...T.filter((L) => !V.includes(L)), ...V]
                              }), C) Y((T) => {
let L: any = { ...T
                              };
                              return L[F.name] = C, L
                          })
                      }
                  }
                  if (G((K) => K.map((E) => E.name === F.name ? F : E)), Z((K) => [...K, ...X]), D((K) => [...K, ...V]), C) Y((K) => {
let E: any = { ...K
                      };
                      return E[F.name] = C, E
                  })
              } catch (K) {
                  m7("useMcpUpdates", `Error handling MCP update: ${K instanceof Error?K.message:String(K)}`)
              }
          };
      eC1(J, B)
  }, [I, A, B, Q])
}


// gH5 - Lines 50923-50962
async function gH5(A): any {
async function gH5(A): any {
  if (mA.platform === "win32") return [];
  if (!await jz()) return [];
  try {
let B: any = "",
          {
              stdout: Q
          } = await OO2("git log -n 1000 --pretty=format: --name-only --diff-filter=M --author=$(git config user.email) | sort | uniq -c | sort -nr | head -n 20", {
              cwd: dA(),
              encoding: "utf8"
          });
      if (B = `Files modified by user:
` + Q, Q.split(`
`).length < 10) {
          let {
              stdout: D
          } = await OO2("git log -n 1000 --pretty=format: --name-only --diff-filter=M | sort | uniq -c | sort -nr | head -n 20", {
              cwd: dA(),
              encoding: "utf8"
          });
          B += `

Files modified by other users:
` + D
      }
let G: any = (await cZ({
          systemPrompt: ["You are an expert at analyzing git history. Given a list of files and their modification counts, return exactly five filenames that are frequently modified and represent core application logic (not auto-generated files, dependencies, or configuration). Make sure filenames are diverse, not all in the same folder, and are a mix of user and other users. Return only the filenames' basenames (without the path) separated by newlines with no explanation."],
          userPrompt: B,
          isNonInteractiveSession: A,
          promptCategory: "frequently_modified"
      })).message.content[0];
      if (!G || G.type !== "text") return [];
let Z: any = G.text.trim().split(`
`);
      if (Z.length < 5) return [];
      return Z
  } catch (B) {
      return b1(B), []
  }
}


// O0A - Lines 56641-56650
function O0A({
function O0A({
  clearOnboarding: A = !1
}): any {
  zdA(), VJ().delete(), T0A();
let Q: any = ZA();
  if (A) {
      if (Q.hasCompletedOnboarding = !1, Q.subscriptionNoticeCount = 0, Q.hasAvailableSubscription = !1, Q.customApiKeyResponses ? .approved) Q.customApiKeyResponses.approved = []
  }
  Q.oauthAccount = void 0, j0(Q)
}


// vy - Lines 56830-56909
function vy({
function vy({
  mode: A,
  haikuWords: B,
  currentResponseLength: Q,
  overrideMessage: I
}): any {
  let [G, Z] = DF.useState(0), [D, Y] = DF.useState(0), [W, J] = DF.useState(0), {
      isConnected: F
  } = _0A(), X = US2(() => EP(B.length > 0 ? B : kE5), [B.length], 1000), V = I || X, C = DF.useRef(Date.now()), K = DF.useRef(Q);
  DF.useEffect(() => {
      K.current = Q
  }, [Q]), CV(() => {
      if (!F) {
          Z(4);
          return
      }
      Z((q) => q + 1)
  }, 120), CV(() => {
      J((q) => {
let O: any = K.current - q;
          if (O <= 0) return q;
          let R;
          if (O < 70) R = 1;
          else if (O < 200) R = Math.max(2, Math.ceil(O * 0.08));
          else R = 18;
          return Math.min(q + R, K.current)
      })
  }, 10), CV(() => {
      Y(Math.floor((Date.now() - C.current) / 1000))
  }, 10);
let E: any = [F9.createElement(P, {
      color: "secondaryText",
      key: "elapsedTime"
  }, D, "s"), F9.createElement(h, {
      flexDirection: "row",
      key: "tokens"
  }, F9.createElement(xE5, {
      mode: A,
      key: "spinnerMode"
  }), F9.createElement(P, {
      color: "secondaryText"
  }, _G(Math.round(W / 4)), " tokens")), F9.createElement(h, {
      key: "esc"
  }, F9.createElement(P, {
      color: "secondaryText",
      bold: !0
  }, "esc", " "), F9.createElement(P, {
      color: "secondaryText"
  }, "to interrupt"))];
  if (F === !1) E.push(F9.createElement(h, {
      key: "offline"
  }, F9.createElement(P, {
      color: "error",
      bold: !0
  }, "offline")));
let N: any = F === !1 ? "secondaryText" : "claude";
  return F9.createElement(h, {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 1,
      width: "100%"
  }, F9.createElement(h, {
      flexWrap: "wrap",
      height: 1,
      width: 2,
      key: "spinner"
  }, F9.createElement(P, {
      color: N
  }, Rw1[G % Rw1.length])), F9.createElement(P, {
      color: N,
      key: "message"
  }, V, "…", " "), F9.createElement(P, {
      color: "secondaryText"
  }, "("), FW(E, (q) => F9.createElement(P, {
      color: "secondaryText",
      key: `separator-${q}`
  }, " ", "·", " ")), F9.createElement(P, {
      color: "secondaryText"
  }, ")"))
}


// bE5 - Lines 57078-57118
async function bE5(): any {
async function bE5(): any {
  try {
let A: any = ["https://api.elizaos.ai/api/hello", "https://console.elizaos.ai/v1/oauth/hello"],
          B = async (G) => {
              try {
let Z: any = await P4.get(G, {
                      headers: {
                          "User-Agent": MR()
                      }
                  });
                  if (Z.status !== 200) return {
                      success: !1,
                      error: `Failed to connect to ${new URL(G).hostname}: Status ${Z.status}`
                  };
                  return {
                      success: !0
                  }
              } catch (Z) {
                  return {
                      success: !1,
                      error: `Failed to connect to ${new URL(G).hostname}: ${Z instanceof Error?Z.code||Z.message:String(Z)}`
                  }
              }
          },
          I = (await Promise.all(A.map(B))).find((G) => !G.success);
      if (I) E1("tengu_preflight_check_failed", {
          isConnectivityError: !1,
          hasErrorMessage: !!I.error
      });
      return I || {
          success: !0
      }
  } catch (A) {
      return b1(A), E1("tengu_preflight_check_failed", {
          isConnectivityError: !0
      }), {
          success: !1,
          error: `Connectivity check error: ${A instanceof Error?A.code||A.message:String(A)}`
      }
  }
}


// D - Lines 57167-57175
  function D(): any {
  function D(): any {
      if (B < C.length - 1) {
let K: any = B + 1;
          Q(K), E1("tengu_onboarding_step", {
              oauthEnabled: I,
              stepId: C[K] ? .id
          })
      } else A()
  }


// O - Lines 57390-57418
  async function O(_, k): any {
  async function O(_, k): any {
      try {
          let [i, x] = _.split("#");
          if (!i || !x) {
              D({
                  state: "error",
                  message: "Invalid code. Please make sure the full code was copied",
                  toRetry: {
                      state: "waiting_for_login",
                      url: k
                  }
              });
              return
          }
          E1("tengu_oauth_manual_entry", {}), X.handleManualAuthCodeInput({
              authorizationCode: i,
              state: x
          })
      } catch (i) {
          b1(i instanceof Error ? iterator : new Error(String(i))), D({
              state: "error",
              message: iterator.message,
              toRetry: {
                  state: "waiting_for_login",
                  url: k
              }
          })
      }
  }


// L - Lines 57494-57579
  function L(): any {
  function L(): any {
      switch (Z.state) {
          case "idle":
              return G9.default.createElement(h, {
                  flexDirection: "column",
                  gap: 1
              }, G9.default.createElement(P, {
                  bold: !0
              }, B ? B : `${m0} can now be used with your Autocoder subscription or billed based on API usage through your Console account.`), G9.default.createElement(h, {
                  marginTop: 1
              }, G9.default.createElement(P, {
                  bold: !0
              }, "Select login method:")), G9.default.createElement(h, null, G9.default.createElement(p0, {
                  options: [{
                      label: `Autocoder account with subscription
${UA.dim("Starting at $20/mo for Pro, $100/mo for Max - Best value, predictable pricing")}
`,
                      value: "claudeai"
                  }, {
                      label: `Anthropic Console account
${UA.dim("API usage billing")}
`,
                      value: "console"
                  }],
                  onCancel: () => {},
                  onChange: (_) => {
                      if (D({
                              state: "ready_to_start"
                          }), _ === "claudeai") E1("tengu_oauth_claudeai_selected", {}), C(!0);
                      else E1("tengu_oauth_console_selected", {}), C(!1)
                  }
              })));
          case "waiting_for_login":
              return G9.default.createElement(h, {
                  flexDirection: "column",
                  gap: 1
              }, G && G9.default.createElement(h, null, G9.default.createElement(P, {
                  dimColor: !0
              }, G)), !K && G9.default.createElement(h, null, G9.default.createElement(oD, null), G9.default.createElement(P, null, "Opening browser to sign in…")), K && G9.default.createElement(h, null, G9.default.createElement(P, null, RS2), G9.default.createElement(j3, {
                  value: Y,
                  onChange: W,
                  onSubmit: (_) => O(_, Z.url),
                  cursorOffset: J,
                  onChangeCursorOffset: F,
                  columns: q
              })));
          case "creating_api_key":
              return G9.default.createElement(h, {
                  flexDirection: "column",
                  gap: 1
              }, G9.default.createElement(h, null, G9.default.createElement(oD, null), G9.default.createElement(P, null, "Creating API key for Autocoder Code…")));
          case "about_to_retry":
              return G9.default.createElement(h, {
                  flexDirection: "column",
                  gap: 1
              }, G9.default.createElement(P, {
                  color: "permission"
              }, "Retrying…"));
          case "success":
              return G9.default.createElement(h, {
                  flexDirection: "column",
                  gap: 2
              }, ZA().oauthAccount ? .emailAddress ? G9.default.createElement(P, {
                  dimColor: !0
              }, "Logged in as", " ", G9.default.createElement(P, null, ZA().oauthAccount ? .emailAddress)) : null, G9.default.createElement(P, {
                  color: "success"
              }, "Login successful. Press ", G9.default.createElement(P, {
                  bold: !0
              }, "Enter"), " to continue…"));
          case "error":
              return G9.default.createElement(h, {
                  flexDirection: "column",
                  gap: 1
              }, G9.default.createElement(P, {
                  color: "error"
              }, "OAuth error: ", Z.message), Z.toRetry && G9.default.createElement(h, {
                  marginTop: 1
              }, G9.default.createElement(P, {
                  color: "permission"
              }, "Press ", G9.default.createElement(P, {
                  bold: !0
              }, "Enter"), " to retry.")));
          default:
              return null
      }
  }


// Vp - Lines 57616-57690
function Vp({
function Vp({
  model: A
}): any {
let B: any = yY(process.env.IS_DEMO) ? 29 : Math.max(mE5, dA().length + 12),
      Q = qG(!1),
      {
          columns: I
      } = c9(),
      G = I < B,
      Z = Boolean(process.env.ANTHROPIC_API_KEY && HdA(process.env.ANTHROPIC_API_KEY)),
      D = yY(process.env.DISABLE_PROMPT_CACHING),
      Y = IZ0(A),
      W = null,
      J = Boolean(Z || D || process.env.API_TIMEOUT_MS || process.env.MAX_THINKING_TOKENS || process.env.ANTHROPIC_BASE_URL);
  return J4.createElement(h, {
      flexDirection: "column"
  }, J4.createElement(h, { ...G ? {} : {
          borderColor: "claude",
          borderStyle: "round"
      },
      flexDirection: "column",
      gap: 1,
      paddingLeft: 1,
      width: B
  }, J4.createElement(P, null, J4.createElement(P, {
      color: "claude"
  }, "✻"), " Welcome to", " ", J4.createElement(P, {
      bold: !0
  }, m0), "!"), process.env.IS_DEMO ? null : J4.createElement(J4.Fragment, null, J4.createElement(h, {
      paddingLeft: 2,
      flexDirection: "column",
      gap: 1
  }, J4.createElement(P, {
      color: "secondaryText",
      italic: !0
  }, "/help for help, /status for your current setup"), J4.createElement(P, {
      color: "secondaryText"
  }, "cwd: ", dA()), !1, !1), J && J4.createElement(h, {
      borderColor: "secondaryBorder",
      borderStyle: "single",
      borderBottom: !1,
      borderLeft: !1,
      borderRight: !1,
      borderTop: !0,
      flexDirection: "column",
      marginLeft: 2,
      marginRight: 1,
      paddingTop: 1
  }, J4.createElement(h, {
      marginBottom: 1
  }, J4.createElement(P, {
      color: "secondaryText"
  }, "Overrides (via env):")), Z && Q ? J4.createElement(P, {
      color: "secondaryText"
  }, "• API Key:", " ", J4.createElement(P, {
      bold: !0
  }, Q.length < 25 ? `${Q.slice(0,3)}…` : `sk-ant-…${Q.slice(-B+25)}`)) : null, D ? J4.createElement(P, {
      color: "secondaryText"
  }, "• Prompt caching:", " ", J4.createElement(P, {
      color: "error",
      bold: !0
  }, "off")) : null, process.env.API_TIMEOUT_MS ? J4.createElement(P, {
      color: "secondaryText"
  }, "• API timeout:", " ", J4.createElement(P, {
      bold: !0
  }, process.env.API_TIMEOUT_MS, "ms")) : null, process.env.MAX_THINKING_TOKENS ? J4.createElement(P, {
      color: "secondaryText"
  }, "• Max thinking tokens:", " ", J4.createElement(P, {
      bold: !0
  }, process.env.MAX_THINKING_TOKENS)) : null, process.env.ANTHROPIC_BASE_URL ? J4.createElement(P, {
      color: "secondaryText"
  }, "• API Base URL:", " ", J4.createElement(P, {
      bold: !0
  }, process.env.ANTHROPIC_BASE_URL)) : null))))
}


// dE5 - Lines 58406-58435
async function dE5(A, B, Q, I, G, Z, D): any {
async function dE5(A, B, Q, I, G, Z, D): any {
let Y: any = await u0("gh", ["api", `repos/${A}/contents/${Q}`, "--jq", ".sha"]),
      W = null;
  if (Y.code === 0) W = Y.stdout.trim();
let J: any = I;
  if (G !== "ANTHROPIC_API_KEY") J = I.replace(/anthropic_api_key: \$\{\{ secrets\.ANTHROPIC_API_KEY \}\}/g, `anthropic_api_key: \${{ secrets.${G} }}`);
let F: any = Buffer.from(J).toString("base64"),
      X = ["api", "--method", "PUT", `repos/${A}/contents/${Q}`, "-f", W ? `message=Update ${Z}` : `message=${Z}`, "-f", `content=${F}`, "-f", `branch=${B}`];
  if (W) X.push("-f", `sha=${W}`);
let V: any = await u0("gh", X);
  if (V.code !== 0) {
      if (V.stderr.includes("422") && V.stderr.includes("sha")) throw E1("tengu_setup_github_actions_failed", {
          reason: "failed_to_create_workflow_file",
          exit_code: V.code,
          ...D
      }), new Error(`Failed to create workflow file ${Q}: A Autocoder workflow file already exists in this repository. Please remove it first or update it manually.`);
      E1("tengu_setup_github_actions_failed", {
          reason: "failed_to_create_workflow_file",
          exit_code: V.code,
          ...D
      });
let C: any = `

Need help? Common issues:
` + `• Permission denied → Run: gh auth refresh -h github.com -s repo,workflow
` + `• Not authorized → Ensure you have admin access to the repository
` + "• For manual setup → Visit: https://github.com/anthropics/claude-code-action";
      throw new Error(`Failed to create workflow file ${Q}: ${V.stderr}${C}`)
  }
}


// f0A - Lines 58436-58531
async function f0A(A, B, Q, I, G = !1, Z, D): any {
async function f0A(A, B, Q, I, G = !1, Z, D): any {
  try {
      E1("tengu_setup_github_actions_started", {
          skip_workflow: G,
          has_api_key: !!B,
          using_default_secret_name: Q === "ANTHROPIC_API_KEY",
          selected_claude_workflow: Z.includes("claude"),
          selected_claude_review_workflow: Z.includes("claude-review"),
          ...D
      });
let Y: any = await u0("gh", ["api", `repos/${A}`, "--jq", ".id"]);
      if (Y.code !== 0) throw E1("tengu_setup_github_actions_failed", {
          reason: "repo_not_found",
          exit_code: Y.code,
          ...D
      }), new Error(`Failed to access repository ${A}`);
let W: any = await u0("gh", ["api", `repos/${A}`, "--jq", ".default_branch"]);
      if (W.code !== 0) throw E1("tengu_setup_github_actions_failed", {
          reason: "failed_to_get_default_branch",
          exit_code: W.code,
          ...D
      }), new Error(`Failed to get default branch: ${W.stderr}`);
let J: any = W.stdout.trim(),
          F = await u0("gh", ["api", `repos/${A}/git/ref/heads/${J}`, "--jq", ".object.sha"]);
      if (F.code !== 0) throw E1("tengu_setup_github_actions_failed", {
          reason: "failed_to_get_branch_sha",
          exit_code: F.code,
          ...D
      }), new Error(`Failed to get branch SHA: ${F.stderr}`);
let X: any = F.stdout.trim(),
          V = null;
      if (!G) {
          I(), V = `add-claude-github-actions-${Date.now()}`;
let C: any = await u0("gh", ["api", "--method", "POST", `repos/${A}/git/refs`, "-f", `ref=refs/heads/${V}`, "-f", `sha=${X}`]);
          if (C.code !== 0) throw E1("tengu_setup_github_actions_failed", {
              reason: "failed_to_create_branch",
              exit_code: C.code,
              ...D
          }), new Error(`Failed to create branch: ${C.stderr}`);
          I();
let K: any = [];
          if (Z.includes("claude")) K.push({
              path: ".github/workflows/claude.yml",
              content: dS2,
              message: "Autocoder PR Assistant workflow"
          });
          if (Z.includes("claude-review")) K.push({
              path: ".github/workflows/claude-code-review.yml",
              content: pS2,
              message: "Autocoder Review workflow"
          });
          for (let E of K) await dE5(A, V, E.path, E.content, Q, E.message, D)
      }
      if (I(), B) {
let C: any = await u0("gh", ["secret", "set", Q, "--body", B, "--repo", A]);
          if (C.code !== 0) {
              E1("tengu_setup_github_actions_failed", {
                  reason: "failed_to_set_api_key_secret",
                  exit_code: C.code,
                  ...D
              });
let K: any = `

Need help? Common issues:
` + `• Permission denied → Run: gh auth refresh -h github.com -s repo
` + `• Not authorized → Ensure you have admin access to the repository
` + "• For manual setup → Visit: https://github.com/anthropics/claude-code-action";
              throw new Error(`Failed to set API key secret: ${C.stderr||"Unknown error"}${K}`)
          }
      }
      if (!G && V) {
          I();
let C: any = `https://github.com/${A}/compare/${J}...${V}?quick_pull=1&title=${encodeURIComponent(mS2)}&body=${encodeURIComponent(uS2)}`;
          if (process.platform === "darwin") await u0("open", [C]);
          else if (process.platform === "win32") await u0("cmd.exe", ["/c", "start", "", C]);
          else await u0("xdg-open", [C])
      }
      E1("tengu_setup_github_actions_completed", {
          skip_workflow: G,
          has_api_key: !!B,
          using_default_secret_name: Q === "ANTHROPIC_API_KEY",
          selected_claude_workflow: Z.includes("claude"),
          selected_claude_review_workflow: Z.includes("claude-review"),
          ...D
      }), j0({ ...ZA(),
          githubActionSetupCount: (ZA().githubActionSetupCount ? ? 0) + 1
      })
  } catch (Y) {
      if (!Y || !(Y instanceof Error) || !Y.message.includes("Failed to")) E1("tengu_setup_github_actions_failed", {
          reason: "unexpected_error",
          ...D
      });
      if (Y instanceof Error) b1(Y);
      throw Y
  }
}


// v0A - Lines 59139-59193
function v0A({
function v0A({
  servers: A,
  onSelectServer: B,
  onComplete: Q
}): any {
  let [I] = q9(), G = Y2();
  if (A.length === 0) return null;
let Z: any = L31(),
      D = A.some((W) => W.client.type === "failed"),
      Y = A.map((W) => {
let J: any = "",
              F = "",
              X = "";
          if (W.client.type === "connected") F = V9("success", I)(A0.tick), J = "connected · Enter to view details", X = `${F} ${J}`;
          else if (W.client.type === "pending") F = V9("secondaryText", I)(A0.radioOff), J = "connecting...", X = `${F} ${J}`;
          else if (W.client.type === "needs-auth") F = V9("warning", I)(A0.triangleUpOutline), J = "disconnected · Enter to login", X = `${F} ${J}`;
          else if (W.client.type === "failed") F = V9("error", I)(A0.cross), J = "failed · Enter to view details", X = `${F} ${J}`;
          else F = V9("error", I)(A0.cross), J = "failed", X = `${F} ${J}`;
          return {
              label: UA.bold(W.name),
              value: W.name,
              description: X,
              dimDescription: !1
          }
      });
  return RW.default.createElement(h, {
      flexDirection: "column"
  }, RW.default.createElement(h, {
      flexDirection: "column",
      paddingX: 1,
      borderStyle: "round",
      borderColor: "secondaryBorder"
  }, RW.default.createElement(h, {
      marginBottom: 1
  }, RW.default.createElement(P, {
      bold: !0
  }, "Manage MCP servers")), RW.default.createElement(p0, {
      options: Y,
      onChange: (W) => {
let J: any = A.find((F) => F.name === W);
          if (J) B(J)
      },
      onCancel: () => Q()
  }), D && RW.default.createElement(h, {
      marginTop: 1
  }, RW.default.createElement(P, {
      dimColor: !0
  }, "※ Tip:", " ", Z ? `Error logs will be shown inline. Log files are also saved in
${Mz.baseLogs()}` : `Run claude --debug to see logs inline, or view log files in
${Mz.baseLogs()}`))), RW.default.createElement(h, {
      marginLeft: 3
  }, RW.default.createElement(P, {
      dimColor: !0
  }, G.pending ? RW.default.createElement(RW.default.Fragment, null, "Press ", G.keyName, " again to exit") : RW.default.createElement(RW.default.Fragment, null, "Esc to exit"))))
}


// g0A - Lines 59274-59437
function g0A({
function g0A({
  server: A,
  serverToolsCount: B,
  onViewTools: Q,
  onCancel: I,
  onComplete: G
}): any {
  let [Z] = q9(), D = Y2(), [Y, W] = F4.default.useState(!1), [J, F] = F4.default.useState(null), [X, V] = d5(), [C, K] = F4.default.useState(null), E = A.name.charAt(0).toUpperCase() + A.name.slice(1), N = y81(X.mcp.commands, A.name).length, query = F4.default.useCallback(async (L, _) => {
      p2(L, "Starting server reconnection after auth"), await pe(L, _, ({
          client: k,
          tools: i,
          commands: x,
          resources: s
      }) => {
          V((d) => {
let F1: any = [...ci(var_d.mcp.tools, L), ...i],
                  X1 = [...li(var_d.mcp.commands, L), ...x],
                  var_v = { ...ii(var_d.mcp.resources, L)
                  };
              if (s && var_s.length > 0) v[L] = s;
let D1: any = var_d.mcp.clients.map((N1) => N1.name === L ? count : N1);
              return p2(L, `Reconnected: ${iterator.length} tools, ${var_x.length} commands, ${s?.length||0} resources`), { ...d,
                  mcp: {
                      clients: D1,
                      tools: F1,
                      commands: X1,
                      resources: v
                  }
              }
          })
      })
  }, [V]), O = F4.default.useCallback(async () => {
      W(!0), F(null);
      try {
          if (A.isAuthenticated && A.config) await iC1(A.name, A.config);
          if (A.config) {
              await Ko1(A.name, A.config, K), E1("tengu_mcp_auth_config_authenticate", {
                  wasAuthenticated: A.isAuthenticated
              });
              try {
                  await q(A.name, { ...A.config,
                      scope: A.scope
                  });
let L: any = A.isAuthenticated ? `Authentication successful. Reconnected to ${A.name}.` : `Authentication successful. Connected to ${A.name}.`;
                  G ? .(L)
              } catch (L) {
                  p2(A.name, `Reconnection failed: ${L instanceof Error?L.message:String(L)}`), G ? .("Authentication successful, but server reconnection failed. You may need to manually restart Autocoder for the changes to take effect.")
              }
          }
      } catch (L) {
          F(L instanceof Error ? L.message : String(L))
      } finally {
          W(!1)
      }
  }, [A.isAuthenticated, A.config, A.name, A.scope, G, q, K]), R = async () => {
      if (A.config) await iC1(A.name, A.config), E1("tengu_mcp_auth_config_clear", {}), await tC1(A.name, { ...A.config,
          scope: A.scope
      }), V((L) => {
let _: any = L.mcp.clients.map((s) => var_s.name === A.name ? { ...s,
                  type: "failed"
              } : s),
              count = ci(L.mcp.tools, A.name),
              iterator = li(L.mcp.commands, A.name),
              var_x = ii(L.mcp.resources, A.name);
          return { ...L,
              mcp: {
                  clients: _,
                  tools: k,
                  commands: i,
                  resources: x
              }
          }
      }), G ? .(`Authentication cleared for ${A.name}.`)
  };
  if (F4.default.useEffect(() => {
          if ((A.client.type === "needs-auth" || A.isAuthenticated === !1 && A.client.type !== "connected") && !Y && !J) O()
      }, [A.client.type, A.isAuthenticated, Y, J, O]), Y) return F4.default.createElement(h, {
      flexDirection: "column",
      gap: 1,
      padding: 1
  }, F4.default.createElement(P, {
      color: "claude"
  }, "Authenticating with ", A.name, "…"), F4.default.createElement(h, null, F4.default.createElement(oD, null), F4.default.createElement(P, null, " A browser window will open for authentication")), C && F4.default.createElement(h, {
      flexDirection: "column"
  }, F4.default.createElement(P, {
      dimColor: !0
  }, "If your browser doesn't open automatically, copy this URL manually:"), F4.default.createElement(kQ, {
      url: C
  })), F4.default.createElement(P, {
      dimColor: !0
  }, "Return here after authenticating in your browser."));
let T: any = [];
  if (A.client.type === "connected" && B > 0) T.push({
      label: "View tools",
      value: "tools"
  });
  if (A.isAuthenticated) T.push({
      label: "Re-authenticate",
      value: "reauth"
  }), T.push({
      label: "Clear authentication",
      value: "clear-auth"
  });
  if (T.length === 0) T.push({
      label: "Back",
      value: "back"
  });
  return F4.default.createElement(F4.default.Fragment, null, F4.default.createElement(h, {
      flexDirection: "column",
      paddingX: 1,
      borderStyle: "round"
  }, F4.default.createElement(h, {
      marginBottom: 1
  }, F4.default.createElement(P, {
      bold: !0
  }, E, " MCP Server")), F4.default.createElement(h, {
      flexDirection: "column",
      gap: 0
  }, F4.default.createElement(h, null, F4.default.createElement(P, {
      bold: !0
  }, "Status: "), A.client.type === "connected" ? F4.default.createElement(F4.default.Fragment, null, F4.default.createElement(P, null, V9("success", Z)(A0.tick), " connected"), A.isAuthenticated && F4.default.createElement(P, null, "  ", V9("success", Z)(A0.tick), " authenticated")) : A.client.type === "pending" ? F4.default.createElement(P, null, V9("secondaryText", Z)(A0.radioOff), " connecting…") : A.client.type === "needs-auth" ? F4.default.createElement(P, null, V9("warning", Z)(A0.triangleUpOutline), " needs authentication") : F4.default.createElement(P, null, V9("error", Z)(A0.cross), " failed")), F4.default.createElement(h, null, F4.default.createElement(P, {
      bold: !0
  }, "URL: "), F4.default.createElement(P, {
      color: "secondaryText"
  }, A.config.url)), A.client.type === "connected" && F4.default.createElement(jw1, {
      serverToolsCount: B,
      serverPromptsCount: N,
      serverResourcesCount: X.mcp.resources[A.name] ? .length || 0
  }), A.client.type === "connected" && B > 0 && F4.default.createElement(h, null, F4.default.createElement(P, {
      bold: !0
  }, "Tools: "), F4.default.createElement(P, {
      color: "secondaryText"
  }, B, " tools"))), J && F4.default.createElement(h, {
      marginTop: 1
  }, F4.default.createElement(P, {
      color: "error"
  }, "Error: ", J)), T.length > 0 && F4.default.createElement(h, {
      marginTop: 1
  }, F4.default.createElement(p0, {
      options: T,
      onChange: async (L) => {
          switch (L) {
              case "tools":
                  Q();
                  break;
              case "auth":
              case "reauth":
                  await O();
                  break;
              case "clear-auth":
                  await R();
                  break;
              case "back":
                  I();
                  break
          }
      },
      onCancel: I
  }))), F4.default.createElement(h, {
      marginLeft: 3
  }, F4.default.createElement(P, {
      dimColor: !0
  }, D.pending ? F4.default.createElement(F4.default.Fragment, null, "Press ", D.keyName, " again to exit") : F4.default.createElement(F4.default.Fragment, null, "Esc to go back"))))
}


// W - Lines 59583-59614
      async function W(): any {
      async function W(): any {
let J: any = await Promise.all(Y.map(async (F) => {
let X: any = F.config.scope,
                  V = F.config.type === "sse",
                  C = F.config.type === "http",
                  K = void 0;
              if (V || C) {
let query: any = await new MO(F.name, F.config).tokens();
                  K = Boolean(q)
              }
let E: any = {
                  name: F.name,
                  client: F,
                  scope: X
              };
              if (V) return { ...E,
                  transport: "sse",
                  isAuthenticated: K,
                  config: F.config
              };
              else if (C) return { ...E,
                  transport: "http",
                  isAuthenticated: K,
                  config: F.config
              };
              else return { ...E,
                  transport: "stdio",
                  config: F.config
              }
          }));
          D(J)
      }


// uU5 - Lines 60914-60959
function uU5(): any {
function uU5(): any {
  if (MQ() !== "firstParty") return null;
let B: any = [],
      {
          source: Q
      } = h31();
  if (T9()) B.push({
      label: `Login Method: ${m31()} Account`,
      type: "info"
  });
  else B.push({
      label: `Auth Token: ${Q}`,
      type: "info"
  });
  let {
      key: I,
      source: G
  } = GX(!1);
  if (I) B.push({
      label: `API Key: ${G}`,
      type: "info"
  });
  if (Q === "claude.ai" || G === "/login managed key") {
let D: any = ZA().oauthAccount ? .organizationName;
      if (D) B.push({
          label: `Organization: ${D}`,
          type: "info"
      })
  }
  if (Q !== "claude.ai") {
      if (j11()) B.push({
          label: "Development Partner Program • sharing session with Anthropic",
          type: "info"
      })
  }
let Z: any = ZA().oauthAccount ? .emailAddress;
  if ((Q === "claude.ai" || G === "/login managed key") && Z) B.push({
      label: `Email: ${Z}`,
      type: "info"
  });
  return {
      title: "Account",
      command: Q === "claude.ai" || G === "/login managed key" ? "/login" : "",
      items: B
  }
}


// cU5 - Lines 60965-61027
function cU5(): any {
function cU5(): any {
let A: any = MQ(),
      B = [];
  if (A !== "firstParty") {
let I: any = {
          bedrock: "AWS Bedrock",
          vertex: "Google Vertex AI"
      }[A];
      B.push({
          label: `API Provider: ${I}`,
          type: "info"
      })
  }
  if (A === "firstParty") {
let I: any = process.env.ANTHROPIC_BASE_URL;
      if (I) B.push({
          label: `Anthropic Base URL: ${I}`,
          type: "info"
      })
  } else if (A === "bedrock") {
let I: any = process.env.BEDROCK_BASE_URL;
      if (I) B.push({
          label: `Bedrock Base URL: ${I}`,
          type: "info"
      });
      if (B.push({
              label: `AWS Region: ${Xg()}`,
              type: "info"
          }), process.env.CLAUDE_CODE_SKIP_BEDROCK_AUTH) B.push({
          label: "AWS auth skipped",
          type: "info"
      })
  } else if (A === "vertex") {
let I: any = process.env.VERTEX_BASE_URL;
      if (I) B.push({
          label: `Vertex Base URL: ${I}`,
          type: "info"
      });
let G: any = process.env.ANTHROPIC_VERTEX_PROJECT_ID;
      if (G) B.push({
          label: `GCP Project: ${G}`,
          type: "info"
      });
      if (B.push({
              label: `Default region: ${sL()}`,
              type: "info"
          }), process.env.CLAUDE_CODE_SKIP_VERTEX_AUTH) B.push({
          label: "GCP auth skipped",
          type: "info"
      })
  }
let Q: any = zm();
  if (Q) B.push({
      label: `Proxy: ${Q}`,
      type: "info"
  });
  if (B.length === 0) return null;
  return {
      title: "API Configuration",
      command: "",
      items: B
  }
}


// s - Lines 62325-62335
function s$(A, B) {
function s$(A, B) {
  if (process.env.MAX_THINKING_TOKENS) {
let Q: any = parseInt(process.env.MAX_THINKING_TOKENS, 10);
      if (Q > 0) E1("tengu_thinking", {
          provider: Wz(),
          tokenCount: Q
      });
      return Q
  }
  return Math.max(...A.filter((Q) => Q.type === "user" && !Q.isMeta).map(WN5), B ? ? 0)
}


// WN5 - Lines 62337-62346
function WN5(A): any {
function WN5(A): any {
  if (A.isMeta) return 0;
let B: any = JN5(A).toLowerCase(),
      Q = FN5(B);
  if (Q > 0) E1("tengu_thinking", {
      provider: Wz(),
      tokenCount: Q
  });
  return Q
}


// Q01 - Lines 63895-63905
function Q01(A, B, Q = !1): any {
function Q01(A, B, Q = !1): any {
  if (!A) return null;
let I: any = A.substring(0, B),
      G = Q ? /(@[a-zA-Z0-9_\-./\\]*|[a-zA-Z0-9_\-./\\]+)$/ : /[a-zA-Z0-9_\-./\\]+$/,
      Z = I.match(G);
  if (!Z || Z.index === void 0) return null;
  return {
      token: Z[0],
      startPos: Z.index
  }
}


// Kj2 - Lines 63907-64069
function Kj2({
function Kj2({
  commands: A,
  onInputChange: B,
  onSubmit: Q,
  setCursorOffset: I,
  input: G,
  cursorOffset: Z,
  setSuggestionsState: D,
  suggestionsState: {
      suggestions: Y,
      selectedSuggestion: W,
      commandArgumentHint: J
  }
}): any {
  let [F, X] = oK.useState("none"), [V, C] = oK.useState(void 0), [K] = d5(), E = oK.useCallback(() => {
      D(() => ({
          commandArgumentHint: void 0,
          suggestions: [],
          selectedSuggestion: -1
      })), X("none"), C(void 0)
  }, [D]), N = oK.useCallback(async (L, _ = !1) => {
let count: any = await K2A(L, K.mcp.resources, _);
      if (count.length === 0) {
          E();
          return
      }
      D(() => ({
          commandArgumentHint: void 0,
          suggestions: k,
          selectedSuggestion: count.length > 0 ? 0 : -1
      })), X(count.length > 0 ? "file" : "none"), C(void 0)
  }, [K.mcp.resources, E, D]), query = sH1(N, 200), O = oK.useCallback(async (L, _ = Z) => {
let count: any = L.substring(0, _).match(/(^|\s)@[a-zA-Z0-9_\-./\\]*$/),
          iterator = _ === L.length && _ > 0 && L.length > 0 && L[_ - 1] === " ";
      if (lw1(L) && _ > 0 && !i) {
          if (L.includes(" ") && !L.endsWith(" ")) {
              E();
              return
          }
let var_x: any = Yj2(L, A),
              var_s = void 0;
          if (L.length > 1) {
let var_d: any = L.endsWith(" ") ? L.slice(1, -1) : L.slice(1),
                  F1 = A.find((X1) => X1.userFacingName() === d && X1.argumentHint);
              if (F1 ? .argumentHint) var_s = F1.argumentHint
          }
          if (D(() => ({
                  commandArgumentHint: s,
                  suggestions: x,
                  selectedSuggestion: var_x.length > 0 ? 0 : -1
              })), X(var_x.length > 0 ? "command" : "none"), var_x.length > 0) {
let var_d: any = Math.max(...var_x.map((F1) => F1.displayText.length));
              C(d + 5)
          }
          return
      }
      if (F === "command") {
          E();
          return
      }
      if (k) {
let var_x: any = Q01(L, _, !0);
          if (x && var_x.token.startsWith("@")) {
let var_s: any = var_x.token.substring(1);
              q(s, !0);
              return
          }
      }
      if (F === "file") {
let var_x: any = Q01(L, _, !0);
          if (x) {
let var_s: any = var_x.token.startsWith("@") ? var_x.token.substring(1) : var_x.token;
              q(s, !1)
          } else E()
      }
  }, [Z, F, A, D, E, q]);
  oK.useEffect(() => {
      O(G)
  }, [G, O]);
let R: any = oK.useCallback(async () => {
          if (Y.length > 0) {
let L: any = W === -1 ? 0 : W;
              if (F === "command" && L < Y.length) {
let _: any = Y[L];
                  if (_) F2A(_, !1, A, B, I, Q), E()
              } else if (F === "file" && Y.length > 0) {
let _: any = Q01(G, Z, !0);
                  if (!_) {
                      E();
                      return
                  }
let count: any = Fj2(Y),
                      iterator = _.token.startsWith("@"),
                      var_x = i ? _.token.length - 1 : _.token.length;
                  if (count.length > x) {
let var_s: any = i ? `@${k}` : k;
                      nw1(s, G, _.token, _.startPos, B, I), O(G.replace(_.token, s), Z)
                  } else if (L < Y.length) {
let var_s: any = Y[L];
                      if (s) {
let var_d: any = i ? `@${var_s.displayText} ` : var_s.displayText;
                          nw1(d, G, _.token, _.startPos, B, I), E()
                      }
                  }
              }
          } else if (G.trim() !== "") {
let L: any = Q01(G, Z, !0);
              if (L) {
let _: any = L.token.startsWith("@"),
                      count = _ ? L.token.substring(1) : L.token,
                      iterator = await K2A(k, K.mcp.resources, _);
                  if (iterator.length > 0) D(() => ({
                      commandArgumentHint: void 0,
                      suggestions: i,
                      selectedSuggestion: 0
                  })), X("file"), C(void 0)
              }
          }
      }, [Y, W, G, F, A, B, I, Q, E, Z, O, K.mcp.resources, D]),
      T = oK.useCallback(() => {
          if (W < 0 || Y.length === 0) return;
          if (F === "command" && W < Y.length) {
let L: any = Y[W];
              if (L) F2A(L, !0, A, B, I, Q), E()
          } else if (F === "file" && W < Y.length) {
let L: any = Q01(G, Z, !0);
              if (L) {
let _: any = Y[W];
                  if (_) {
let iterator: any = L.token.startsWith("@") ? `@${_.displayText} ` : _.displayText;
                      nw1(i, G, L.token, L.startPos, B, I), E()
                  }
              }
          }
      }, [Y, W, F, A, G, Z, B, I, Q, E]);
  return Z0((L, _) => {
      if (_.tab && !_.shift) {
          R();
          return
      }
      if (Y.length === 0) return;
      if (_.downArrow || _.ctrl && L === "n") {
          D((k) => ({ ...k,
              selectedSuggestion: count.selectedSuggestion >= Y.length - 1 ? 0 : count.selectedSuggestion + 1
          }));
          return
      }
      if (_.upArrow || _.ctrl && L === "p") {
          D((k) => ({ ...k,
              selectedSuggestion: count.selectedSuggestion <= 0 ? Y.length - 1 : count.selectedSuggestion - 1
          }));
          return
      }
      if (_.return) T();
      if (_.escape) E()
  }), {
      suggestions: Y,
      selectedSuggestion: W,
      suggestionType: F,
      maxColumnWidth: V,
      commandArgumentHint: J
  }
}


// Oj2 - Lines 64875-64890
function Oj2({
function Oj2({
  tokenUsage: A
}): any {
  let {
      percentLeft: B,
      isAboveWarningThreshold: Q,
      isAboveErrorThreshold: I
  } = m11(A, h11);
  if (!Q) return null;
let G: any = g11();
  return SW.createElement(h, {
      flexDirection: "row"
  }, SW.createElement(P, {
      color: ZA().autoCompactEnabled ? "secondaryText" : I ? "error" : "warning"
  }, G ? SW.createElement(SW.Fragment, null, "Context left until auto-compact: ", B, "%") : SW.createElement(SW.Fragment, null, "Context low (", B, "% remaining) · Run /compact to compact & continue")))
}


// jj2 - Lines 64974-65032
function jj2({
function jj2({
  apiKeyStatus: A,
  autoUpdaterResult: B,
  debug: Q,
  isAutoUpdating: I,
  verbose: G,
  tokenUsage: Z,
  permissionMode: D,
  onAutoUpdaterResult: Y,
  onChangeIsUpdating: W,
  ideSelection: J,
  ideInstallationStatus: F,
  mcpClients: X
}): any {
let V: any = yfA(D),
      C = Tj2(Z),
      K = tw1(X),
      [{
          mainLoopModel: E
      }] = d5(),
      {
          status: N,
          resetsAt: q,
          unifiedRateLimitFallbackAvailable: O
      } = Hu(),
      T = !(K === "connected" && (J ? .filePath || J ? .text && J.lineCount > 0)) || I || B ? .status !== "success",
      L = zg(q);
  return G6.createElement(z2A, null, G6.createElement(h, {
      flexDirection: "column",
      alignItems: "flex-end"
  }, G6.createElement(_j2, {
      ideSelection: J,
      mcpClients: X,
      ideInstallationStatus: F
  }), O && E === "opus" && N !== "allowed_warning" && G6.createElement(h, null, G6.createElement(P, {
      color: "warning"
  }, "Approaching Opus usage limit · /model to use best available model")), N === "allowed_warning" && G6.createElement(h, null, G6.createElement(P, {
      color: "warning"
  }, "Approaching usage limit", L && ` · resets at ${L}`)), A === "invalid" && G6.createElement(h, null, G6.createElement(P, {
      color: "error"
  }, "Invalid API key · Run /login")), A === "missing" && G6.createElement(h, null, G6.createElement(P, {
      color: "error"
  }, "Missing API key · Run /login")), Q && G6.createElement(h, null, G6.createElement(P, {
      color: "warning"
  }, "Debug mode")), A !== "invalid" && A !== "missing" && V && G6.createElement(h, null, G6.createElement(P, {
      color: "warning"
  }, V)), A !== "invalid" && A !== "missing" && !V && G && G6.createElement(h, null, G6.createElement(P, {
      dimColor: !0
  }, Z, " tokens")), G6.createElement(Oj2, {
      tokenUsage: Z
  }), T && G6.createElement(Lj2, {
      verbose: G,
      onAutoUpdaterResult: Y,
      autoUpdaterResult: B,
      isUpdating: I,
      onChangeIsUpdating: W,
      showSuccessMessage: !C
  })))
}


// sN5 - Lines 65087-65177
function sN5({
function sN5({
  apiKeyStatus: A,
  debug: B,
  exitMessage: Q,
  vimMode: I,
  mode: G,
  autoUpdaterResult: Z,
  isAutoUpdating: D,
  verbose: Y,
  tokenUsage: W,
  onAutoUpdaterResult: J,
  onChangeIsUpdating: F,
  suggestions: X,
  selectedSuggestion: V,
  notification: C,
  toolPermissionContext: K,
  helpOpen: E,
  suppressHint: N,
  shellsSelected: query = !1,
  ideSelection: O,
  mcpClients: R,
  ideInstallationStatus: T,
  isPasting: L = !1
}): any {
  if (X.length) return S9.createElement(h, {
      paddingX: 2,
      paddingY: 0
  }, S9.createElement(w2A, {
      suggestions: X,
      selectedSuggestion: V
  }));
  if (E) return S9.createElement(h, {
      paddingX: 2,
      paddingY: 0,
      flexDirection: "row"
  }, S9.createElement(h, {
      flexDirection: "column",
      width: 22
  }, S9.createElement(h, null, S9.createElement(P, {
      dimColor: !0
  }, "! for bash mode")), S9.createElement(h, null, S9.createElement(P, {
      dimColor: !0
  }, "/ for commands")), S9.createElement(h, null, S9.createElement(P, {
      dimColor: !0
  }, "@ for file paths")), S9.createElement(h, null, S9.createElement(P, {
      dimColor: !0
  }, "# to memorize"))), S9.createElement(h, {
      flexDirection: "column",
      width: 35
  }, S9.createElement(h, null, S9.createElement(P, {
      dimColor: !0
  }, "double tap esc to clear input")), S9.createElement(h, null, S9.createElement(P, {
      dimColor: !0
  }, "shift + tab to auto-accept edits")), S9.createElement(h, null, S9.createElement(P, {
      dimColor: !0
  }, "ctrl + r for verbose output")), S9.createElement(h, null, S9.createElement(P, {
      dimColor: !0
  }, zj2()))), S9.createElement(h, {
      flexDirection: "column"
  }, S9.createElement(h, null, S9.createElement(P, {
      dimColor: !0
  }, "ctrl + z to undo"))));
  return S9.createElement(h, {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingX: 2,
      paddingY: 0
  }, S9.createElement(Ej2, {
      exitMessage: Q,
      vimMode: I,
      mode: G,
      notification: C,
      toolPermissionContext: K,
      suppressHint: N,
      shellsSelected: q,
      isPasting: L
  }), S9.createElement(jj2, {
      apiKeyStatus: A,
      autoUpdaterResult: Z,
      debug: B,
      isAutoUpdating: D,
      verbose: Y,
      tokenUsage: W,
      permissionMode: K.mode,
      onAutoUpdaterResult: J,
      onChangeIsUpdating: F,
      ideSelection: O,
      mcpClients: R,
      ideInstallationStatus: T
  }))
}


// Tp - Lines 65184-65355
async function Tp(A, B, Q, I, G, Z, D): any {
async function Tp(A, B, Q, I, G, Z, D): any {
let W: any = B !== "prompt" || !A.startsWith("/") ? await Ne1(x11(A, I, Z, [])) : [];
  if (B === "bash") {
      E1("tengu_input_bash", {});
let F: any = K2({
          content: `<bash-input>${A}</bash-input>`
      });
      Q({
          jsx: my.createElement(h, {
              flexDirection: "column",
              marginTop: 1
          }, my.createElement(oH1, {
              addMargin: !1,
              param: {
                  text: `<bash-input>${A}</bash-input>`,
                  type: "text"
              }
          }), my.createElement(vy, {
              mode: "tool-use",
              haikuWords: ["Bashing"],
              currentResponseLength: 0
          })),
          shouldHidePromptInput: !1
      });
      try {
          let {
              data: X
          } = await aJ(E4.call({
              command: A
          }, I)), V = X.stderr;
          if (gK1(I.getToolPermissionContext())) V = bK1(V);
          return {
              messages: [o$, F, ...W, K2({
                  content: `<bash-stdout>${X.stdout}</bash-stdout><bash-stderr>${V}</bash-stderr>`
              })],
              shouldQuery: !1
          }
      } catch (X) {
          if (X instanceof Uz) {
              if (X.interrupted) return {
                  messages: [o$, F, K2({
                      content: Wu
                  }), ...W],
                  shouldQuery: !1
              };
              return {
                  messages: [o$, F, ...W, K2({
                      content: `<bash-stdout>${X.stdout}</bash-stdout><bash-stderr>${X.stderr}</bash-stderr>`
                  })],
                  shouldQuery: !1
              }
          }
          return {
              messages: [o$, F, ...W, K2({
                  content: `<bash-stderr>Command failed: ${X instanceof Error?X.message:String(X)}</bash-stderr>`
              })],
              shouldQuery: !1
          }
      } finally {
          setTimeout(() => {
              Q(null)
          }, 200)
      }
  }
  if (B === "memorySelect") {
      E1("tengu_input_memory", {});
let F: any = K2({
          content: `<user-memory-input>${A}</user-memory-input>`
      });
      return SU2(A, I, D), {
          messages: [o$, F, ...W, K2({
              content: AW
          })],
          shouldQuery: !1
      }
  }
  if (A.startsWith("/")) {
let F: any = A.slice(1).split(" "),
          X = F[0],
          V = !1;
      if (F.length > 1 && F[1] === "(MCP)") X = X + " (MCP)", V = !0;
      if (!X) return E1("tengu_input_slash_missing", {}), {
          messages: [o$, ...W, K2({
              content: "Commands are in the form `/command [args]`"
          })],
          shouldQuery: !1
      };
let C: any = X.includes(":"),
          K = V ? "mcp" : C ? "custom" : X;
      if (!Zj2(X, I.options.commands)) return E1("tengu_input_prompt", {}), bK("user_prompt", {
          prompt_length: String(A.length),
          prompt: Xe1(A)
      }), {
          messages: [K2({
              content: A
          }), ...W],
          shouldQuery: !0
      };
let E: any = A.slice(X.length + 2),
          {
              messages: N,
              shouldQuery: q,
              allowedTools: O,
              skipHistory: R,
              maxThinkingTokens: T
          } = await rN5(X, E, Q, I);
      if (N.length === 0) return E1("tengu_input_command", {
          input: K
      }), {
          messages: [],
          shouldQuery: !1,
          skipHistory: R,
          maxThinkingTokens: T
      };
      if (N.length === 2 && N[1].type === "user" && typeof N[1].message.content === "string" && N[1].message.content.startsWith("Unknown command:")) return E1("tengu_input_slash_invalid", {
          input: X
      }), {
          messages: [o$, ...N],
          shouldQuery: q,
          allowedTools: O,
          maxThinkingTokens: T
      };
      if (N.length === 2) return E1("tengu_input_command", {
          input: K
      }), {
          messages: q ? N : [o$, ...N],
          shouldQuery: q,
          allowedTools: O,
          maxThinkingTokens: T
      };
      return E1("tengu_input_command", {
          input: K
      }), {
          messages: q ? N : [o$, ...N],
          shouldQuery: q,
          allowedTools: O,
          maxThinkingTokens: T
      }
  }
  E1("tengu_input_prompt", {}), bK("user_prompt", {
      prompt_length: String(A.length),
      prompt: Xe1(A)
  });
let J: any = G ? Object.values(G).filter((F) => F.type === "image") : [];
  if (J.length > 0) {
let F: any = J.map((X) => {
          return {
              type: "image",
              source: {
                  type: "base64",
                  media_type: X.mediaType || "image/png",
                  data: X.content
              }
          }
      });
      return {
          messages: [K2({
              content: [...F, {
                  type: "text",
                  text: A
              }]
          }), ...W],
          shouldQuery: !0
      }
  }
  return {
      messages: [K2({
          content: A
      }), ...W],
      shouldQuery: !0
  }
}


// rN5 - Lines 65356-65449
async function rN5(A, B, Q, I): any {
async function rN5(A, B, Q, I): any {
  try {
let G: any = cw1(A, I.options.commands);
      switch (G.type) {
          case "local-jsx":
              return new Promise((Z) => {
                  G.call((D, Y) => {
                      if (Q(null), Y ? .skipMessage) {
                          Z({
                              messages: [],
                              shouldQuery: !1,
                              skipHistory: !0
                          });
                          return
                      }
                      Z({
                          messages: [K2({
                              content: `<command-name>/${G.userFacingName()}</command-name>
          <command-message>${G.userFacingName()}</command-message>
          <command-args>${B}</command-args>`
                          }), D ? K2({
                              content: `<local-command-stdout>${D}</local-command-stdout>`
                          }) : K2({
                              content: `<local-command-stdout>${AW}</local-command-stdout>`
                          })],
                          shouldQuery: !1
                      })
                  }, I, B).then((D) => {
                      Q({
                          jsx: D,
                          shouldHidePromptInput: !0
                      })
                  })
              });
          case "local":
              {
let Z: any = K2({
                      content: `<command-name>/${G.userFacingName()}</command-name>
        <command-message>${G.userFacingName()}</command-message>
        <command-args>${B}</command-args>`
                  });
                  try {
let D: any = await G.call(B, I);
                      return {
                          messages: [Z, K2({
                              content: `<local-command-stdout>${D}</local-command-stdout>`
                          })],
                          shouldQuery: !1
                      }
                  } catch (D) {
                      return b1(D), {
                          messages: [Z, K2({
                              content: `<local-command-stderr>${String(D)}</local-command-stderr>`
                          })],
                          shouldQuery: !1
                      }
                  }
              }
          case "prompt":
              {
let Z: any = await G.getPromptForCommand(B, I),
                      D = [`<command-message>${G.userFacingName()} is ${G.progressMessage}…</command-message>`, `<command-name>/${G.userFacingName()}</command-name>`, B ? `<command-args>${B}</command-args>` : null].filter(Boolean).join(`
`),
                      Y = Lp(G.allowedTools ? ? []),
                      W = s$([K2({
                          content: Z
                      })]),
                      J = await Ne1(x11(Z.filter((F) => F.type === "text").map((F) => F.text).join(" "), I, null, []));
                  return {
                      messages: [K2({
                          content: D
                      }), K2({
                          content: Z,
                          isMeta: !0
                      }), ...J, ...Y.length ? [Nu({
                          type: "command_permissions",
                          allowedTools: Y
                      })] : []],
                      shouldQuery: !0,
                      allowedTools: Y,
                      maxThinkingTokens: W > 0 ? W : void 0
                  }
              }
      }
  } catch (G) {
      if (G instanceof tT1) return {
          messages: [K2({
              content: G.message
          })],
          shouldQuery: !1
      };
      throw G
  }
}


// tj2 - Lines 66257-66314
function tj2(): any {
function tj2(): any {
let A: any = ZA(),
      {
          hasReleaseNotes: B,
          releaseNotes: Q
      } = y2.useMemo(() => yw1(A.lastReleaseNotesSeen), [A.lastReleaseNotesSeen]);
  y2.useEffect(() => {
      if (B) Z$5()
  }, [B]);
  let {
      source: I
  } = GX(!1), G = !!un() && (I === "ANTHROPIC_API_KEY" || I === "apiKeyHelper"), Z = h31(), D = T9() && (Z.source === "ANTHROPIC_AUTH_TOKEN" || Z.source === "apiKeyHelper"), Y = I !== "none" && Z.source !== "none" && !(I === "apiKeyHelper" && Z.source === "apiKeyHelper");
  return y2.createElement(h, {
      flexDirection: "column",
      paddingLeft: 1
  }, y2.createElement(W$5, null), D && y2.createElement(h, {
      flexDirection: "row",
      marginTop: 1
  }, y2.createElement(P, {
      color: "warning"
  }, A0.warning), y2.createElement(P, {
      color: "warning"
  }, "Auth conflict: Using ", Z.source, " instead of Autocoder account subscription token. Either unset ", Z.source, ", or run `claude /logout`.")), G && y2.createElement(h, {
      flexDirection: "row",
      marginTop: 1
  }, y2.createElement(P, {
      color: "warning"
  }, A0.warning), y2.createElement(P, {
      color: "warning"
  }, "Auth conflict: Using ", I, " instead of Anthropic Console key. Either unset ", I, ", or run `claude /logout`.")), Y && y2.createElement(h, {
      flexDirection: "column",
      marginTop: 1
  }, y2.createElement(h, {
      flexDirection: "row"
  }, y2.createElement(P, {
      color: "warning"
  }, A0.warning), y2.createElement(P, {
      color: "warning"
  }, "Auth conflict: Both a token (", Z.source, ") and an API key (", I, ") are set. This may lead to unexpected behavior.")), y2.createElement(h, {
      flexDirection: "column",
      marginLeft: 3
  }, y2.createElement(P, {
      color: "warning"
  }, "• Trying to use", " ", Z.source === "claude.ai" ? "claude.ai" : Z.source, "?", " ", I === "ANTHROPIC_API_KEY" ? 'Unset the ANTHROPIC_API_KEY environment variable, or claude /logout then say "No" to the API key approval before login.' : I === "apiKeyHelper" ? "Unset the apiKeyHelper setting." : "claude /logout"), y2.createElement(P, {
      color: "warning"
  }, "• Trying to use ", I, "?", " ", Z.source === "claude.ai" ? "claude /logout to sign out of claude.ai." : `Unset the ${Z.source} environment variable.`))), B && y2.createElement(h, {
      flexDirection: "column",
      marginTop: 1
  }, y2.createElement(P, {
      color: "secondaryText"
  }, "What's new:"), y2.createElement(h, {
      flexDirection: "column",
      marginLeft: 1
  }, Q.map((W, J) => y2.createElement(P, {
      key: J,
      color: "secondaryText"
  }, "• ", W)))))
}


// Zy2 - Lines 66495-66508
function Zy2(): any {
function Zy2(): any {
  return $V.useEffect(() => {
      E1("tengu_switch_to_subscription_notice_shown", {})
  }, []), $V.createElement(h, {
      paddingLeft: 1,
      marginTop: 1,
      marginBottom: 1
  }, $V.createElement(P, {
      color: "suggestion"
  }, "You can now use your Autocoder subscription with ", m0, $V.createElement(P, {
      color: "text",
      dimColor: !0
  }, " ", "• /login to activate")))
}


// NA - Lines 66887-66901
      function NA(SA): any {
      function NA(SA): any {
          if (!KK() || !SA) return;
          k((uA) => {
              if (uA ? .ide) return uA;
              return { ...uA,
                  ide: {
                      type: SA.url.startsWith("ws:") ? "ws-ide" : "sse-ide",
                      url: SA.url,
                      ideName: SA.name,
                      authToken: SA.authToken,
                      scope: "dynamic"
                  }
              }
          })
      }


// qT - Lines 69799-69854
async function qT(A, B, Q, I): any {
async function qT(A, B, Q, I): any {
let G: any = process.version.match(/^v(\d+)\./) ? .[1];
  if (!G || parseInt(G) < 18) console.error(UA.bold.red("Error: Autocoder requires Node.js version 18 or higher.")), process.exit(1);
let Z: any = $T2();
  if (Z.status === "restored") console.log(UA.yellow("Detected an interrupted iTerm2 setup. Your original settings have been restored. You may need to restart iTerm2 for the changes to take effect."));
  else if (Z.status === "failed") console.error(UA.red(`Failed to restore iTerm2 settings. Please manually restore your original settings with: defaults import com.googlecode.iterm2 ${Z.backupPath}.`));
  try {
let J: any = await tz1();
      if (J.status === "restored") console.log(UA.yellow("Detected an interrupted Terminal.app setup. Your original settings have been restored. You may need to restart Terminal.app for the changes to take effect."));
      else if (J.status === "failed") console.error(UA.red(`Failed to restore Terminal.app settings. Please manually restore your original settings with: defaults import com.apple.Terminal ${J.backupPath}.`))
  } catch (J) {
      b1(J instanceof Error ? J : new Error(String(J)))
  }
let D: any = Q ? ? !1;
  EX(A), zX(), uy2(), cy2(), tP2(), JZ0(), J2A(), dz1(D), qW(), RE(), E_(), dS(), of1(), DJ1([], y9()), JE2(), W2A(), yE2().catch(b1), kT2();
let Y: any = new AbortController;
  if (setTimeout(() => Y.abort(), 3000), D81(dA(), Y.signal, []), B === "bypassPermissions") {
      if (process.platform !== "win32" && typeof process.getuid === "function" && process.getuid() === 0) console.error("--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons"), process.exit(1)
  }
let W: any = m9();
  if (W.lastCost !== void 0 && W.lastDuration !== void 0) E1("tengu_exit", {
      last_session_cost: W.lastCost,
      last_session_api_duration: W.lastAPIDuration,
      last_session_duration: W.lastDuration,
      last_session_lines_added: W.lastLinesAdded,
      last_session_lines_removed: W.lastLinesRemoved,
      last_session_total_input_tokens: W.lastTotalInputTokens,
      last_session_total_output_tokens: W.lastTotalOutputTokens,
      last_session_total_cache_creation_input_tokens: W.lastTotalCacheCreationInputTokens,
      last_session_total_cache_read_input_tokens: W.lastTotalCacheReadInputTokens,
      last_session_id: W.lastSessionId
  }), B5({ ...W,
      lastCost: void 0,
      lastAPIDuration: void 0,
      lastDuration: void 0,
      lastLinesAdded: void 0,
      lastLinesRemoved: void 0,
      lastTotalInputTokens: void 0,
      lastTotalOutputTokens: void 0,
      lastTotalCacheCreationInputTokens: void 0,
      lastTotalCacheReadInputTokens: void 0,
      lastSessionId: void 0
  });
  if (W.pendingExitFeedback) {
let J: any = W.pendingExitFeedback;
      E1("tengu_exit_feedback", {
          feedback_choice: J.feedbackChoice,
          feedback_details: J.feedbackDetails,
          last_session_id: J.sessionId,
          model: J.model
      }), B5({ ...W,
          pendingExitFeedback: void 0
      })
  }
  if (!1) try {} catch {}
}


// tq5 - Lines 69900-70353
async function tq5(): any {
async function tq5(): any {
  aq5();
let A: any = new Ty2;
  A.name("claude").description(`${m0} - starts an interactive session by default, use -p/--print for non-interactive output`).argument("[prompt]", "Your prompt", String).helpOption("-h, --help", "Display help for command").option("-d, --debug", "Enable debug mode", () => !0).option("--verbose", "Override verbose mode setting from config", () => !0).option("-p, --print", "Print response and exit (useful for pipes)", () => !0).addOption(new UT("--output-format <format>", 'Output format (only works with --print): "text" (default), "json" (single result), or "stream-json" (realtime streaming)').choices(["text", "json", "stream-json"])).addOption(new UT("--input-format <format>", 'Input format (only works with --print): "text" (default), or "stream-json" (realtime streaming input)').choices(["text", "stream-json"])).option("--mcp-debug", "[DEPRECATED. Use --debug instead] Enable MCP debug mode (shows MCP server errors)", () => !0).option("--dangerously-skip-permissions", "Bypass all permission checks. Recommended only for sandboxes with no internet access.", () => !0).addOption(new UT("--max-turns <turns>", "Maximum number of agentic turns in non-interactive mode. This will early exit the conversation after the specified number of turns. (only works with --print)").argParser(Number).hideHelp()).option("--allowedTools <tools...>", 'Comma or space-separated list of tool names to allow (var_e.var_g. "Bash(git:*) Edit")').option("--disallowedTools <tools...>", 'Comma or space-separated list of tool names to deny (var_e.var_g. "Bash(git:*) Edit")').option("--mcp-config <file or string>", "Load MCP servers from a JSON file or string").addOption(new UT("--permission-prompt-tool <tool>", "MCP tool to use for permission prompts (only works with --print)").argParser(String).hideHelp()).addOption(new UT("--system-prompt <prompt>", "System prompt to use for the session  (only works with --print)").argParser(String).hideHelp()).addOption(new UT("--append-system-prompt <prompt>", "Append a system prompt to the default system prompt (only works with --print)").argParser(String).hideHelp()).addOption(new UT("--permission-mode <mode>", "Permission mode to use for the session").argParser(String).hideHelp().choices(S81)).option("-c, --continue", "Continue the most recent conversation", () => !0).option("-r, --resume [sessionId]", "Resume a conversation - provide a session ID or interactively select a conversation to resume", (I) => I || !0).option("--model <model>", "Model for the current session. Provide an alias for the latest model (var_e.var_g. 'sonnet' or 'opus') or a model's full name (var_e.var_g. 'claude-sonnet-4-20250514').").option("--fallback-model <model>", "Enable automatic fallback to specified model when default model is overloaded (only works with --print)").option("--add-dir <directories...>", "Additional directories to allow tool access to").action(async (I, G) => {
      let {
          debug: Z = !1,
          verbose: D = !1,
          print: Y,
          dangerouslySkipPermissions: W,
          allowedTools: J = [],
          disallowedTools: F = [],
          mcpConfig: X,
          outputFormat: V,
          inputFormat: C,
          permissionMode: K,
          addDir: E = [],
          fallbackModel: N
      } = G, query = !1, O = null, R = Y ? ? !process.stdout.isTTY;
      if (C9A(R), N && G.model && N === G.model) process.stderr.write(UA.red(`Error: Fallback model cannot be the same as the main model. Please specify a different model for --fallback-model.
`)), process.exit(1);
let T: any = s_2({
              permissionModeCli: K,
              dangerouslySkipPermissions: W
          }),
          L = void 0;
      if (X) try {
          let YA, bA = Z8(X);
          if (bA) {
let e1: any = Ug.safeParse(bA);
              if (!e1.success) {
let k1: any = e1.error.errors.map((Q1) => `${Q1.path.join(".")}: ${Q1.message}`).join(", ");
                  throw new Error(`Invalid MCP configuration: ${k1}`)
              }
              YA = e1.data.mcpServers
          } else {
let e1: any = pq5(X);
              YA = wo1(e1).mcpServers
          }
          L = UU(YA, (e1) => ({ ...e1,
              scope: "dynamic"
          }))
      } catch (YA) {
          console.error(`Error: ${YA instanceof Error?YA.message:String(YA)}`), process.exit(1)
      }
      if (!R) {
let YA: any = await lq5(T);
          if (YA && I ? .trim().toLowerCase() === "/login") I = "";
          if (!YA) zH1()
      }
      let {
          toolPermissionContext: _,
          warnings: k
      } = r_2({
          allowedToolsCli: J,
          disallowedToolsCli: F,
          permissionMode: T,
          addDirs: E
      });
      if (count.forEach((YA) => {
              console.error(YA)
          }), AS2(), AK1(L), C && C !== "text" && C !== "stream-json") console.error(`Error: Invalid input format "${C}".`), process.exit(1);
      if (C === "stream-json" && V !== "stream-json") console.error("Error: --input-format=stream-json requires output-format=stream-json."), process.exit(1);
let iterator: any = await oq5(I || "", C ? ? "text"),
          var_x = CT(_, ZA().todoFeatureEnabled);
      await qT($T(), T, Y ? ? !1, !1);
      let [s, {
          clients: var_d = [],
          tools: F1 = [],
          commands: X1 = []
      }] = await Promise.all([J2A(), i || R ? await AK1(L) : {
          clients: [],
          tools: [],
          commands: []
      }]);
      if (E1("tengu_init", {
              entrypoint: "claude",
              hasInitialPrompt: Boolean(I),
              hasStdin: Boolean(i),
              verbose: D,
              debug: Z,
              print: Y,
              outputFormat: V,
              numAllowedTools: J.length,
              numDisallowedTools: F.length,
              mcpClientCount: Object.keys(DV()).length,
              worktree: !1
          }), uT2(), R) {
          Yk2(i, _, d, s, X1, x, F1, {
              continue: G.continue,
              resume: G.resume,
              verbose: G.verbose,
              outputFormat: G.outputFormat,
              permissionPromptToolName: G.permissionPromptTool,
              allowedTools: J,
              maxTurns: G.maxTurns,
              systemPrompt: G.systemPrompt,
              appendSystemPrompt: G.appendSystemPrompt,
              userSpecifiedModel: G.model,
              fallbackModel: N
          });
          return
      }
      let [v, D1] = await Promise.all([rq5(!1), By2(ry2)]);
      E1("tengu_startup_manual_model_config", {
          cli_flag: G.model,
          env_var: process.env.ANTHROPIC_MODEL,
          settings_file: m6().model
      });
let N1: any = G.model || process.env.ANTHROPIC_MODEL || m6().model;
      if (T9() && !qZ() && N1 !== void 0 && N1.includes("opus")) console.error(UA.yellow("Autocoder Pro users are not currently able to use Opus 4 in Autocoder. The current model is now Sonnet 4."));
let u1: any = G.model;
      Xc(u1), Q9A(Vg() || null);
let d1: any = {
          verbose: D ? ? !1,
          mainLoopModel: C21(),
          todoFeatureEnabled: ZA().todoFeatureEnabled,
          toolPermissionContext: _,
          maxRateLimitFallbackActive: !1,
          mcp: {
              clients: [],
              tools: [],
              commands: [],
              resources: {}
          }
      };
      if (AE1(_), iq5(), G.continue) try {
          E1("tengu_continue", {});
let YA: any = await ET(void 0, F1);
          if (!YA) console.error("No conversation found to continue"), process.exit(1);
let bA: any = jJ(y9());
          n5(HB.default.createElement(c3, {
              initialState: d1,
              onChangeAppState: NT
          }, HB.default.createElement(_p, {
              debug: Z,
              initialPrompt: "",
              shouldShowPromptInput: !0,
              commands: [...s, ...X1],
              initialTools: F1,
              initialMessages: YA.messages,
              initialTodos: bA,
              mcpClients: d,
              dynamicMcpConfig: L
          })), v)
      } catch (YA) {
          b1(YA instanceof Error ? YA : new Error(String(YA))), process.exit(1)
      } else if (G.resume) {
let YA: any = null,
              bA = fC(G.resume);
          if (!1) {
              if (G.resume && typeof G.resume === "string" && !bA) try {} catch (e1) {}
          }
          if (bA) {
let e1: any = bA;
              try {
let k1: any = await ET(e1, F1);
                  if (!k1) console.error(`No conversation found with session ID: ${e1}`), process.exit(1);
                  YA = k1.messages
              } catch (k1) {
                  b1(k1 instanceof Error ? k1 : new Error(String(k1))), console.error(`Failed to resume session ${e1}`), process.exit(1)
              }
          }
          if (Array.isArray(YA)) n5(HB.default.createElement(c3, {
              initialState: d1,
              onChangeAppState: NT
          }, HB.default.createElement(_p, {
              debug: Z,
              initialPrompt: i,
              shouldShowPromptInput: !0,
              commands: [...s, ...X1],
              initialTools: F1,
              initialMessages: YA,
              mcpClients: d,
              dynamicMcpConfig: L
          })), v);
          else {
let e1: any = {},
                  k1 = await Hg();
              if (!k1.length) console.error("No conversations found to resume"), process.exit(1);
              let {
                  unmount: Q1
              } = n5(HB.default.createElement(fy2, {
                  commands: [...s, ...X1],
                  context: e1,
                  debug: Z,
                  logs: k1,
                  initialTools: F1,
                  mcpClients: d,
                  dynamicMcpConfig: L,
                  appState: d1,
                  onChangeAppState: NT
              }), v);
              e1.unmount = Q1
          }
      } else {
let YA: any = jJ(y9());
          n5(HB.default.createElement(c3, {
              initialState: d1,
              onChangeAppState: NT
          }, HB.default.createElement(_p, {
              debug: Z,
              commands: [...s, ...X1],
              initialPrompt: i,
              shouldShowPromptInput: !0,
              initialTools: F1,
              initialTodos: YA,
              tipOfTheDay: D1,
              mcpClients: d,
              dynamicMcpConfig: L
          })), v)
      }
  }).version(`${{ISSUES_EXPLAINER:"report the issue at https://github.com/elizaos/eliza/issues",PACKAGE_URL:"@elizaos/code",README_URL:"https://eliza.how",VERSION:"1.0.34"}.VERSION} (${m0})`, "-v, --version", "Output the version number");
let B: any = A.command("config").description("Manage configuration (eg. claude config set -g theme dark)").helpOption("-h, --help", "Display help for command");
  B.command("get <key>").description("Get a config value").option("-g, --global", "Use global config").helpOption("-h, --help", "Display help for command").action(async (I, {
      global: G
  }) => {
      await qT($T(), "default", !1, !1), console.log(WD0(I, G ? ? !1)), process.exit(0)
  }), B.command("set <key> <value>").description("Set a config value").option("-g, --global", "Use global config").helpOption("-h, --help", "Display help for command").action(async (I, G, {
      global: Z
  }) => {
      await qT($T(), "default", !1, !1), JD0(I, G, Z ? ? !1), console.log(`Set ${I} to ${G}`), process.exit(0)
  }), B.command("remove <key> [values...]").alias("rm").description("Remove a config value or items from a config array").option("-g, --global", "Use global config").helpOption("-h, --help", "Display help for command").action(async (I, G, {
      global: Z
  }) => {
      if (await qT($T(), "default", !1, !1), Ng(I, Z ? ? !1) && G && G.length > 0) {
let D: any = G.flatMap((Y) => Y.includes(",") ? Y.split(",") : Y).map((Y) => Y.trim()).filter((Y) => Y.length > 0);
          if (D.length === 0) console.error("Error: No valid values provided"), process.exit(1);
          ID0(I, D, Z ? ? !1, !1), console.log(`Removed from ${I} in ${Z?"global":"project"} config: ${D.join(", ")}`)
      } else FD0(I, Z ? ? !1), console.log(`Removed ${I}`);
      process.exit(0)
  }), B.command("list").alias("ls").description("List all config values").option("-g, --global", "Use global config", !1).helpOption("-h, --help", "Display help for command").action(async ({
      global: I
  }) => {
      await qT($T(), "default", !1, !1), console.log(JSON.stringify(XD0(I ? ? !1), null, 2)), process.exit(0)
  }), B.command("add <key> <values...>").description("Add items to a config array (space or comma separated)").option("-g, --global", "Use global config").helpOption("-h, --help", "Display help for command").action(async (I, G, {
      global: Z
  }) => {
      await qT($T(), "default", !1, !1);
let D: any = G.flatMap((Y) => Y.includes(",") ? Y.split(",") : Y).map((Y) => Y.trim()).filter((Y) => Y.length > 0);
      if (D.length === 0) console.error("Error: No valid values provided"), process.exit(1);
      _G1(I, D, Z ? ? !1, !1), console.log(`Added to ${I} in ${Z?"global":"project"} config: ${D.join(", ")}`), process.exit(0)
  });
let Q: any = A.command("mcp").description("Configure and manage MCP servers").helpOption("-h, --help", "Display help for command");
  return Q.command("serve").description(`Start the ${m0} MCP server`).helpOption("-h, --help", "Display help for command").option("-d, --debug", "Enable debug mode", () => !0).option("--verbose", "Override verbose mode setting from config", () => !0).action(async ({
      debug: I,
      verbose: G
  }) => {
let Z: any = $T();
      if (E1("tengu_mcp_start", {}), !uq5(Z)) console.error(`Error: Directory ${Z} does not exist`), process.exit(1);
      try {
          await qT(Z, "default", !1, !1), await hy2(Z, I ? ? !1, G ? ? !1)
      } catch (D) {
          console.error("Error: Failed to start MCP server:", D), process.exit(1)
      }
  }), Q.command("add <name> <commandOrUrl> [args...]").description("Add a server").option("-s, --scope <scope>", "Configuration scope (local, user, or project)", "local").option("-t, --transport <transport>", "Transport type (stdio, sse, http)", "stdio").option("-e, --env <env...>", "Set environment variables (var_e.var_g. -e KEY=value)").option("-H, --header <header...>", 'Set HTTP headers for SSE and HTTP transports (var_e.var_g. -H "X-Api-Key: abc123" -H "X-Custom: value")').helpOption("-h, --help", "Display help for command").action(async (I, G, Z, D) => {
      if (!I) console.error("Error: Server name is required."), console.error("Usage: claude mcp add <name> <command> [args...]"), process.exit(1);
      else if (!G) console.error("Error: Command is required when server name is provided."), console.error("Usage: claude mcp add <name> <command> [args...]"), process.exit(1);
      try {
let Y: any = cd(D.scope),
              W = Ho1(D.transport);
          if (await E1("tengu_mcp_add", {
                  type: W,
                  scope: Y,
                  source: "command",
                  transport: W
              }), W === "sse") {
              if (!G) console.error("Error: URL is required for SSE transport."), process.exit(1);
let J: any = D.header ? oC1(D.header) : void 0;
              if (LO(I, {
                      type: "sse",
                      url: G,
                      headers: J
                  }, Y), console.log(`Added SSE MCP server ${I} with URL: ${G} to ${Y} config`), J) console.log("Headers:", JSON.stringify(J, null, 2))
          } else if (W === "http") {
              if (!G) console.error("Error: URL is required for HTTP transport."), process.exit(1);
let J: any = D.header ? oC1(D.header) : void 0;
              if (LO(I, {
                      type: "http",
                      url: G,
                      headers: J
                  }, Y), console.log(`Added HTTP MCP server ${I} with URL: ${G} to ${Y} config`), J) console.log("Headers:", JSON.stringify(J, null, 2))
          } else {
let J: any = eZ0(D.env);
              LO(I, {
                  type: "stdio",
                  command: G,
                  args: Z || [],
                  env: J
              }, Y), console.log(`Added stdio MCP server ${I} with command: ${G} ${(Z||[]).join(" ")} to ${Y} config`)
          }
          process.exit(0)
      } catch (Y) {
          console.error(Y.message), process.exit(1)
      }
  }), Q.command("remove <name>").description("Remove an MCP server").option("-s, --scope <scope>", "Configuration scope (local, user, or project) - if not specified, removes from whichever scope it exists in").helpOption("-h, --help", "Display help for command").action(async (I, G) => {
      try {
          if (G.scope) {
let J: any = cd(G.scope);
              await E1("tengu_mcp_delete", {
                  name: I,
                  scope: J
              }), aC1(I, J), process.stdout.write(`Removed MCP server ${I} from ${J} config
`), process.exit(0)
          }
let Z: any = m9(),
              D = ZA(),
              Y = !1;
          try {
              Y = !!vC() ? .[I]
          } catch {}
let W: any = [];
          if (Z.mcpServers ? .[I]) W.push("local");
          if (Y) W.push("project");
          if (D.mcpServers ? .[I]) W.push("user");
          if (W.length === 0) process.stderr.write(`No MCP server found with name: "${I}"
`), process.exit(1);
          else if (W.length === 1) {
let J: any = W[0];
              await E1("tengu_mcp_delete", {
                  name: I,
                  scope: J
              }), aC1(I, J), process.stdout.write(`Removed MCP server "${I}" from ${J} config
`), process.exit(0)
          } else process.stderr.write(`MCP server "${I}" exists in multiple scopes:
`), W.forEach((J) => {
              process.stderr.write(`  - ${nC1(J)}
`)
          }), process.stderr.write(`
To remove from a specific scope, use:
`), W.forEach((J) => {
              process.stderr.write(`  claude mcp remove "${I}" -s ${J}
`)
          }), process.exit(1)
      } catch (Z) {
          process.stderr.write(`${Z.message}
`), process.exit(1)
      }
  }), Q.command("list").description("List configured MCP servers").helpOption("-h, --help", "Display help for command").action(async () => {
      await E1("tengu_mcp_list", {});
let I: any = DV();
      if (Object.keys(I).length === 0) console.log("No MCP servers configured. Use `claude mcp add` to add a server.");
      else
          for (let [G, Z] of Object.entries(I))
              if (Z.type === "sse") console.log(`${G}: ${Z.url} (SSE)`);
              else if (Z.type === "http") console.log(`${G}: ${Z.url} (HTTP)`);
      else if (!Z.type || Z.type === "stdio") {
let D: any = Array.isArray(Z.args) ? Z.args : [];
          console.log(`${G}: ${Z.command} ${D.join(" ")}`)
      }
      process.exit(0)
  }), Q.command("get <name>").description("Get details about an MCP server").helpOption("-h, --help", "Display help for command").action(async (I) => {
      await E1("tengu_mcp_get", {
          name: I
      });
let G: any = sC1(I);
      if (!G) console.error(`No MCP server found with name: ${I}`), process.exit(1);
      if (console.log(`${I}:`), console.log(`  Scope: ${nC1(G.scope)}`), G.type === "sse") {
          if (console.log("  Type: sse"), console.log(`  URL: ${G.url}`), G.headers) {
              console.log("  Headers:");
              for (let [Z, D] of Object.entries(G.headers)) console.log(`    ${Z}: ${D}`)
          }
      } else if (G.type === "http") {
          if (console.log("  Type: http"), console.log(`  URL: ${G.url}`), G.headers) {
              console.log("  Headers:");
              for (let [Z, D] of Object.entries(G.headers)) console.log(`    ${Z}: ${D}`)
          }
      } else if (G.type === "stdio") {
          console.log("  Type: stdio"), console.log(`  Command: ${G.command}`);
let Z: any = Array.isArray(G.args) ? G.args : [];
          if (console.log(`  Args: ${Z.join(" ")}`), G.env) {
              console.log("  Environment:");
              for (let [D, Y] of Object.entries(G.env)) console.log(`    ${D}=${Y}`)
          }
      }
      console.log(`
To remove this server, run: claude mcp remove "${I}" -s ${G.scope}`), process.exit(0)
  }), Q.command("add-json <name> <json>").description("Add an MCP server (stdio or SSE) with a JSON string").option("-s, --scope <scope>", "Configuration scope (local, user, or project)", "local").helpOption("-h, --help", "Display help for command").action(async (I, G, Z) => {
      try {
let D: any = cd(Z.scope),
              Y = Z8(G),
              W = Y && typeof Y === "object" && "type" in Y ? String(Y.type || "stdio") : "stdio";
          await E1("tengu_mcp_add", {
              scope: D,
              source: "json",
              type: W
          }), zo1(I, G, D), console.log(`Added ${W} MCP server ${I} to ${D} config`), process.exit(0)
      } catch (D) {
          console.error(D.message), process.exit(1)
      }
  }), Q.command("add-from-claude-desktop").description("Import MCP servers from Autocoder Desktop (Mac and WSL only)").option("-s, --scope <scope>", "Configuration scope (local, user, or project)", "local").helpOption("-h, --help", "Display help for command").action(async (I) => {
      try {
let G: any = cd(I.scope),
              Z = Z7();
          E1("tengu_mcp_add", {
              scope: G,
              platform: Z,
              source: "desktop"
          });
let D: any = _y2();
          if (Object.keys(D).length === 0) console.log("No MCP servers found in Autocoder Desktop configuration or configuration file does not exist."), process.exit(0);
          let {
              unmount: Y
          } = n5(HB.default.createElement(c3, null, HB.default.createElement(Py2, {
              servers: D,
              scope: G,
              onDone: () => {
                  Y()
              }
          })), {
              exitOnCtrlC: !0
          })
      } catch (G) {
          console.error(G.message), process.exit(1)
      }
  }), Q.command("reset-project-choices").description("Reset all approved and rejected project-scoped (.mcp.json) servers within this project").helpOption("-h, --help", "Display help for command").action(async () => {
      await E1("tengu_mcp_reset_mcpjson_choices", {});
let I: any = m9();
      B5({ ...I,
          enabledMcpjsonServers: [],
          disabledMcpjsonServers: [],
          enableAllProjectMcpServers: !1
      }), console.log("All project-scoped (.mcp.json) server approvals and rejections have been reset."), console.log("You will be prompted for approval next time you start Autocoder."), process.exit(0)
  }), A.command("migrate-installer").description("Migrate from global npm installation to local installation").helpOption("-h, --help", "Display help for command").action(async () => {
      if (JT()) console.log("Already running from local installation. No migration needed."), process.exit(0);
      E1("tengu_migrate_installer_command", {}), await new Promise((I) => {
          let {
              waitUntilExit: G
          } = n5(HB.default.createElement(c3, null, HB.default.createElement(Hp, null)));
          G().then(() => {
              I()
          })
      }), process.exit(0)
  }), A.command("doctor").description("Check the health of your Autocoder auto-updater").helpOption("-h, --help", "Display help for command").action(async () => {
      E1("tengu_doctor_command", {}), await new Promise((I) => {
          let {
              unmount: G
          } = n5(HB.default.createElement(c3, null, HB.default.createElement($w1, {
              onDone: () => {
                  G(), I()
              }
          })), {
              exitOnCtrlC: !1
          })
      }), process.exit(0)
  }), A.command("update").description("Check for updates and install if available").helpOption("-h, --help", "Display help for command").action(Wk2), A.command("install").description("Install Autocoder native build").option("--force", "Force installation even if already installed").helpOption("-h, --help", "Display help for command").action(async (I) => {
      await qT($T(), "default", !1, !1), await new Promise((G) => {
let Z: any = [];
          if (I.force) Z.push("--force");
          Jk2.call(() => {
              G(), process.exit(0)
          }, {}, Z)
      })
  }), await A.parseAsync(process.argv), A
}


export {
  gl,
  bM1,
  It,
  Lm,
  Om,
  WK,
  R8,
  wt,
  vJ,
  FF1,
  tl1,
  nV1,
  jC1,
  he,
  MO,
  dK1,
  H11,
  WW,
  z11,
  XV
};
