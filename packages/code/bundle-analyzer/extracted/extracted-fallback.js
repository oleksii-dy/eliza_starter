// Fallback extraction - manual cleanup required

// Functions
function A(B) {
      return B.map(function(Q) {
          if (Q === "") return "''";
          if (Q && typeof Q === "object") return Q.op.replace(/(.)/g, "\\$1");
          if (/["\s\\]/.test(Q) && !/'/.test(Q)) return "'" + Q.replace(/(['])/g, "\\$1") + "'";
          if (/["'\s]/.test(Q)) return '"' + Q.replace(/(["\\$`!])/g, "\\$1") + '"';
          return String(Q).replace(/([A-Za-z]:)?([#!"$&'()*,:;<=>?@[\\\]^`{|}

function dm2(A, B) {
      var Q = B.lastIndex,
          I = [],
          G;
      while (G = B.exec(A))
          if (I.push(G), B.lastIndex === G.index) B.lastIndex += 1;
      return B.lastIndex = Q, I
  }

function um2(A, B, Q) {
      var I = typeof A === "function" ? A(Q) : A[Q];
      if (typeof I === "undefined" && Q != "") I = "";
      else if (typeof I === "undefined") I = "$";
      if (typeof I === "object") return B + NP + JSON.stringify(I) + NP;
      return B + I
  }

function pm2(A, B, Q) {
      if (!Q) Q = {}

function E() {
              K += 1;
              var O, R, T = J.charAt(K);
              if (T === "{") {
                  if (K += 1, J.charAt(K) === "}

function A(B, Q, I) {
      var G = pm2(B, Q, I);
      if (typeof Q !== "function") return G;
      return G.reduce(function(Z, D) {
          if (typeof D === "object") return Z.concat(D);
          var Y = D.split(RegExp("(" + NP + ".*?" + NP + ")", "g"));
          if (Y.length === 1) return Z.concat(Y[0]);
          return Z.concat(Y.filter(Boolean).map(function(W) {
              if (mm2.test(W)) return JSON.parse(W.split(NP)[1]);
              return W
          }

function nm2(A) {
      switch ($5A.call(A)) {
          case "[object Error]":
          case "[object Exception]":
          case "[object DOMException]":
              return !0;
          default:
              return A91(A, Error)
      }

function Qx(A, B) {
      return $5A.call(A) === `[object ${B}

function am2(A) {
      return Qx(A, "ErrorEvent")
  }

function sm2(A) {
      return Qx(A, "DOMError")
  }

function rm2(A) {
      return Qx(A, "DOMException")
  }

function om2(A) {
      return Qx(A, "String")
  }

function q5A(A) {
      return typeof A === "object" && A !== null && "__sentry_template_string__" in A && "__sentry_template_values__" in A
  }

function tm2(A) {
      return A === null || q5A(A) || typeof A !== "object" && typeof A !== "function"
  }

function M5A(A) {
      return Qx(A, "Object")
  }

function em2(A) {
      return typeof Event !== "undefined" && A91(A, Event)
  }

function Ad2(A) {
      return typeof Element !== "undefined" && A91(A, Element)
  }

function Bd2(A) {
      return Qx(A, "RegExp")
  }

function Qd2(A) {
      return Boolean(A && A.then && typeof A.then === "function")
  }

function Id2(A) {
      return M5A(A) && "nativeEvent" in A && "preventDefault" in A && "stopPropagation" in A
  }

function Gd2(A) {
      return typeof A === "number" && A !== A
  }

function A91(A, B) {
      try {
          return A instanceof B
      }

function Zd2(A) {
      return !!(typeof A === "object" && A !== null && (A.__isVue || A._isVue))
  }

function A(B, Q) {
      var I = "";
      B = B || "Run the trap, drop the bass", B = B.split("");
      var G = {
          a: ["@", "Ą", "Ⱥ", "Ʌ", "Δ", "Λ", "Д"],
          b: ["ß", "Ɓ", "Ƀ", "ɮ", "β", "฿"],
          c: ["©", "Ȼ", "Ͼ"],
          d: ["Ð", "Ɗ", "Ԁ", "ԁ", "Ԃ", "ԃ"],
          e: ["Ë", "ĕ", "Ǝ", "ɘ", "Σ", "ξ", "Ҽ", "੬"],
          f: ["Ӻ"],
          g: ["ɢ"],
          h: ["Ħ", "ƕ", "Ң", "Һ", "Ӈ", "Ԋ"],
          i: ["༏"],
          j: ["Ĵ"],
          k: ["ĸ", "Ҡ", "Ӄ", "Ԟ"],
          l: ["Ĺ"],
          m: ["ʍ", "Ӎ", "ӎ", "Ԡ", "ԡ", "൩"],
          n: ["Ñ", "ŋ", "Ɲ", "Ͷ", "Π", "Ҋ"],
          o: ["Ø", "õ", "ø", "Ǿ", "ʘ", "Ѻ", "ם", "۝", "๏"],
          p: ["Ƿ", "Ҏ"],
          q: ["্"],
          r: ["®", "Ʀ", "Ȑ", "Ɍ", "ʀ", "Я"],
          s: ["§", "Ϟ", "ϟ", "Ϩ"],
          t: ["Ł", "Ŧ", "ͳ"],
          u: ["Ʊ", "Ս"],
          v: ["ט"],
          w: ["Ш", "Ѡ", "Ѽ", "൰"],
          x: ["Ҳ", "Ӿ", "Ӽ", "ӽ"],
          y: ["¥", "Ұ", "Ӌ"],
          z: ["Ƶ", "ɀ"]
      }

function A(B, Q) {
      B = B || "   he is here   ";
      var I = {
              up: ["̍", "̎", "̄", "̅", "̿", "̑", "̆", "̐", "͒", "͗", "͑", "̇", "̈", "̊", "͂", "̓", "̈", "͊", "͋", "͌", "̃", "̂", "̌", "͐", "̀", "́", "̋", "̏", "̒", "̓", "̔", "̽", "̉", "ͣ", "ͤ", "ͥ", "ͦ", "ͧ", "ͨ", "ͩ", "ͪ", "ͫ", "ͬ", "ͭ", "ͮ", "ͯ", "̾", "͛", "͆", "̚"],
              down: ["̖", "̗", "̘", "̙", "̜", "̝", "̞", "̟", "̠", "̤", "̥", "̦", "̩", "̪", "̫", "̬", "̭", "̮", "̯", "̰", "̱", "̲", "̳", "̹", "̺", "̻", "̼", "ͅ", "͇", "͈", "͉", "͍", "͎", "͓", "͔", "͕", "͖", "͙", "͚", "̣"],
              mid: ["̕", "̛", "̀", "́", "͘", "̡", "̢", "̧", "̨", "̴", "̵", "̶", "͜", "͝", "͞", "͟", "͠", "͢", "̸", "̷", "͡", " ҉"]
          }

function Z(W) {
          var J = Math.floor(Math.random() * W);
          return J
      }

function D(W) {
          var J = !1;
          return G.filter(function(F) {
              J = F === W
          }

function Y(W, J) {
          var F = "",
              X, V;
          J = J || {}

function A(B, Q) {
          if (!T6.enabled) return B + "";
          var I = ky[Q];
          if (!I && Q in T6) return T6[Q](B);
          return I.open + B + I.close
      }

function LP2(A) {
      var B = function Q() {
          return _w5.apply(Q, arguments)
      }

function _w5() {
      var A = Array.prototype.slice.call(arguments),
          B = A.map(function(D) {
              if (D != null && D.constructor === String) return D;
              else return Rw5.inspect(D)
          }

function jw5() {
      var A = {}

function A(B, Q) {
      var I = Q.split("");
      return I = I.map(B), I.join("")
  }

function _P2(...A) {
      return A.filter((B) => B !== void 0 && B !== null).shift()
  }

function W0A(A, B, Q, I) {
      let G = Q.split("-");
      if (G.length > 1) G[1] = G[1].charAt(0).toUpperCase() + G[1].substr(1), G = G.join(""), I[G] = _P2(A[G], A[Q], B[G], B[Q]);
      else I[Q] = _P2(A[Q], B[Q])
  }

function fw5(A, B, Q) {
      let I = A[B];
      for (let G = 1; G < Q; G++) I += 1 + A[B + G];
      return I
  }

function jP2(A, B) {
      return A + B + 1
  }

function A(C, K) {
          if (C[K] > 0) return A(C, K + 1);
          return K
      }

function B(C) {
          let K = {}

function Q(C) {
          let K = 0;
          return C.forEach(function(E) {
              E.forEach(function(N) {
                  K = Math.max(K, N.x + (N.colSpan || 1))
              }

function I(C) {
          return C.length
      }

function G(C, K) {
          let E = C.y,
              N = C.y - 1 + (C.rowSpan || 1),
              q = K.y,
              O = K.y - 1 + (K.rowSpan || 1),
              R = !(E > O || q > N),
              T = C.x,
              L = C.x - 1 + (C.colSpan || 1),
              _ = K.x,
              k = K.x - 1 + (K.colSpan || 1),
              i = !(T > k || _ > L);
          return R && i
      }

function Z(C, K, E) {
          let N = Math.min(C.length - 1, E),
              q = {
                  x: K,
                  y: E
              }

function D(C, K, E, N) {
          for (let q = E; q < N; q++)
              if (Z(C, q, K)) return !1;
          return !0
      }

function Y(C) {
          C.forEach(function(K, E) {
              K.forEach(function(N) {
                  for (let q = 1; q < N.rowSpan; q++) {
                      let O = new mw5(N);
                      O.x = N.x, O.y = N.y + q, O.colSpan = N.colSpan, J(O, C[E + q])
                  }

function W(C) {
          for (let K = C.length - 1; K >= 0; K--) {
              let E = C[K];
              for (let N = 0; N < E.length; N++) {
                  let q = E[N];
                  for (let O = 1; O < q.colSpan; O++) {
                      let R = new hw5;
                      R.x = q.x + O, R.y = q.y, E.splice(N + 1, 0, R)
                  }

function J(C, K) {
          let E = 0;
          while (E < K.length && K[E].x < C.x) E++;
          K.splice(E, 0, C)
      }

function F(C) {
          let K = I(C),
              E = Q(C);
          gw5(`Max rows: ${K}

function X(C) {
          return C.map(function(K) {
              if (!Array.isArray(K)) {
                  let E = Object.keys(K)[0];
                  if (K = K[E], Array.isArray(K)) K = K.slice(), K.unshift(E);
                  else K = [E, K]
              }

function V(C) {
          let K = X(C);
          return B(K), F(K), Y(K), W(K), K
      }

function xP2(A, B, Q, I) {
      return function(G, Z) {
          let D = [],
              Y = [],
              W = {}

function X0A(A, B, Q) {
      let I = [];
      A.forEach(function(Z) {
          I.push(Z.draw(B))
      }

function D(C, K) {
              if (K) {
                  let E = `${C.padEnd(Q+2)}

function Y(C) {
              return C.join(`
`).replace(/^/gm, " ".repeat(2))
          }

function G(J, F) {
              let X = t$.resolve(J, F);
              if (O2A.existsSync(X)) return X;
              if (I.includes(t$.extname(F))) return;
              let V = I.find((C) => O2A.existsSync(`${X}

function Z(Y) {
              return Y.length > 1 && Y[0] === "-"
          }

function Ey2(A) {
      return A.map((B) => {
          if (!B.startsWith("--inspect")) return B;
          let Q, I = "127.0.0.1",
              G = "9229",
              Z;
          if ((Z = B.match(/^(--inspect(-brk)?)$/)) !== null) Q = Z[1];
          else if ((Z = B.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null)
              if (Q = Z[1], /^\d+$/.test(Z[3])) G = Z[3];
              else I = Z[3];
          else if ((Z = B.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) Q = Z[1], I = Z[3], G = Z[4];
          if (Q && G !== "0") return `${Q}

function Hk2() {
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
      modelTokens: {}

function y9() {
  return $9.sessionId
}

function c2A() {
  return $9.sessionId = p2A(), $9.sessionId
}

function e9() {
  return $9.originalCwd
}

function l2A() {
  return $9.cwd
}

function i2A(A) {
  $9.cwd = A
}

async function n2A(A, B, Q, I, G) {
  $9.totalCostUSD += A, $9.totalAPIDuration += B, $9.totalAPIDurationWithoutRetries += Q;
  let Z = $9.modelTokens[G] ? ? {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadInputTokens: 0,
      cacheCreationInputTokens: 0
  }

function KU() {
  return $9.totalCostUSD
}

function KP() {
  return $9.totalAPIDuration
}

function zU1() {
  return Date.now() - $9.startTime
}

function Fc() {
  $9.lastInteractionTime = Date.now()
}

function wU1(A, B) {
  $9.totalLinesAdded += A, $9.totalLinesRemoved += B
}

function F21() {
  return $9.totalLinesAdded
}

function X21() {
  return $9.totalLinesRemoved
}

function a2A() {
  let A = 0;
  for (let B of Object.values($9.modelTokens)) A += B.inputTokens;
  return A
}

function s2A() {
  let A = 0;
  for (let B of Object.values($9.modelTokens)) A += B.outputTokens;
  return A
}

function r2A() {
  let A = 0;
  for (let B of Object.values($9.modelTokens)) A += B.cacheReadInputTokens;
  return A
}

function o2A() {
  let A = 0;
  for (let B of Object.values($9.modelTokens)) A += B.cacheCreationInputTokens;
  return A
}

function EU1() {
  $9.hasUnknownModelCost = !0
}

function t2A() {
  return $9.hasUnknownModelCost
}

function V21() {
  return $9.lastInteractionTime
}

function e2A() {
  return $9.modelTokens
}

function A9A() {
  return $9.mainLoopModelOverride
}

function C21() {
  return $9.initialMainLoopModel
}

function Xc(A) {
  $9.mainLoopModelOverride = A
}

function HP() {
  return $9.maxRateLimitFallbackActive
}

function B9A(A) {
  $9.maxRateLimitFallbackActive = A
}

function Q9A(A) {
  $9.initialMainLoopModel = A
}

function K21() {
  return $9.modelStrings
}

function UU1(A) {
  $9.modelStrings = A
}

function I9A(A, B) {
  $9.meter = A, $9.sessionCounter = B("claude_code.session.count", {
      description: "Count of CLI sessions started"
  }

function G9A() {
  return $9.sessionCounter
}

function NU1() {
  return $9.locCounter
}

function Z9A() {
  return $9.prCounter
}

function D9A() {
  return $9.commitCounter
}

function Y9A() {
  return $9.costCounter
}

function Vc() {
  return $9.tokenCounter
}

function yk() {
  return $9.codeEditToolDecisionCounter
}

function W9A() {
  return $9.loggerProvider
}

function J9A(A) {
  $9.loggerProvider = A
}

function F9A() {
  return $9.eventLogger
}

function X9A(A) {
  $9.eventLogger = A
}

function V9A() {
  return $9.isNonInteractiveSession
}

function C9A(A) {
  $9.isNonInteractiveSession = A
}

function qk2(A) {
  var B = Nk2.call(A, Cc),
      Q = A[Cc];
  try {
      A[Cc] = void 0;
      var I = !0
  }

function Rk2(A) {
  return Lk2.call(A)
}

function Pk2(A) {
  if (A == null) return A === void 0 ? Tk2 : Ok2;
  return w9A && w9A in Object(A) ? H9A(A) : z9A(A)
}

function Sk2(A) {
  return A != null && typeof A == "object"
}

function jk2(A) {
  return typeof A == "symbol" || f7(A) && oW(A) == _k2
}

function yk2(A, B) {
  var Q = -1,
      I = A == null ? 0 : A.length,
      G = Array(I);
  while (++Q < I) G[Q] = B(A[Q], Q, A);
  return G
}

function N9A(A) {
  if (typeof A == "string") return A;
  if (U8(A)) return xk(A, N9A) + "";
  if (kk(A)) return U9A ? U9A.call(A) : "";
  var B = A + "";
  return B == "0" && 1 / A == -xk2 ? "-0" : B
}

function fk2(A) {
  var B = typeof A;
  return A != null && (B == "object" || B == "function")
}

function vk2(A) {
  return A
}

function dk2(A) {
  if (!pB(A)) return !1;
  var B = oW(A);
  return B == gk2 || B == hk2 || B == bk2 || B == mk2
}

function pk2(A) {
  return !!q9A && q9A in A
}

function ik2(A) {
  if (A != null) {
      try {
          return lk2.call(A)
      }

function Ax2(A) {
  if (!pB(A) || M9A(A)) return !1;
  var B = vk(A) ? ek2 : ak2;
  return B.test(HU(A))
}

function Bx2(A, B) {
  return A == null ? void 0 : A[B]
}

function Qx2(A, B) {
  var Q = R9A(A, B);
  return L9A(Q) ? Q : void 0
}

function Zx2(A, B, Q) {
  switch (Q.length) {
      case 0:
          return A.call(B);
      case 1:
          return A.call(B, Q[0]);
      case 2:
          return A.call(B, Q[0], Q[1]);
      case 3:
          return A.call(B, Q[0], Q[1], Q[2])
  }

function Yx2(A, B) {
  var Q = -1,
      I = A.length;
  B || (B = Array(I));
  while (++Q < I) B[Q] = A[Q];
  return B
}

function Xx2(A) {
  var B = 0,
      Q = 0;
  return function() {
      var I = Fx2(),
          G = Jx2 - (I - Q);
      if (Q = I, G > 0) {
          if (++B >= Wx2) return arguments[0]
      }

function Vx2(A) {
  return function() {
      return A
  }

function zx2(A, B) {
  var Q = -1,
      I = A == null ? 0 : A.length;
  while (++Q < I)
      if (B(A[Q], Q, A) === !1) break;
  return A
}

function wx2(A, B, Q, I) {
  var G = A.length,
      Z = Q + (I ? 1 : -1);
  while (I ? Z-- : ++Z < G)
      if (B(A[Z], Z, A)) return Z;
  return -1
}

function Ex2(A) {
  return A !== A
}

function Ux2(A, B, Q) {
  var I = Q - 1,
      G = A.length;
  while (++I < G)
      if (A[I] === B) return I;
  return -1
}

function Nx2(A, B, Q) {
  return B === B ? v9A(A, B, Q) : x9A(A, f9A, Q)
}

function Lx2(A, B) {
  var Q = typeof A;
  return B = B == null ? qx2 : B, !!B && (Q == "number" || Q != "symbol" && Mx2.test(A)) && (A > -1 && A % 1 == 0 && A < B)
}

function Rx2(A, B, Q) {
  if (B == "__proto__" && bk) bk(A, B, {
      configurable: !0,
      enumerable: !0,
      value: Q,
      writable: !0
  }

function Ox2(A, B) {
  return A === B || A !== A && B !== B
}

function Sx2(A, B, Q) {
  var I = A[B];
  if (!(Px2.call(A, B) && fH(I, Q)) || Q === void 0 && !(B in A)) pq(A, B, Q)
}

function _x2(A, B, Q, I) {
  var G = !Q;
  Q || (Q = {}

function jx2(A, B, Q) {
  return B = h9A(B === void 0 ? A.length - 1 : B, 0),
      function() {
          var I = arguments,
              G = -1,
              Z = h9A(I.length - B, 0),
              D = Array(Z);
          while (++G < Z) D[G] = I[B + G];
          G = -1;
          var Y = Array(B + 1);
          while (++G < B) Y[G] = I[G];
          return Y[B] = Q(D), P9A(A, this, Y)
      }

function yx2(A, B) {
  return U21(N21(A, B, fk), A + "")
}

function xx2(A) {
  return typeof A == "number" && A > -1 && A % 1 == 0 && A <= kx2
}

function fx2(A) {
  return A != null && gk(A.length) && !vk(A)
}

function vx2(A, B, Q) {
  if (!pB(Q)) return !1;
  var I = typeof B;
  if (I == "number" ? bH(Q) && uq(B, Q.length) : I == "string" && (B in Q)) return fH(Q[B], A);
  return !1
}

function bx2(A) {
  return m9A(function(B, Q) {
      var I = -1,
          G = Q.length,
          Z = G > 1 ? Q[G - 1] : void 0,
          D = G > 2 ? Q[2] : void 0;
      if (Z = A.length > 3 && typeof Z == "function" ? (G--, Z) : void 0, D && d9A(Q[0], Q[1], D)) Z = G < 3 ? void 0 : Z, G = 1;
      B = Object(B);
      while (++I < G) {
          var Y = Q[I];
          if (Y) A(B, Y, I, Z)
      }

function hx2(A) {
  var B = A && A.constructor,
      Q = typeof B == "function" && B.prototype || gx2;
  return A === Q
}

function mx2(A, B) {
  var Q = -1,
      I = Array(A);
  while (++Q < A) I[Q] = B(Q);
  return I
}

function ux2(A) {
  return f7(A) && oW(A) == dx2
}

function ix2() {
  return !1
}

function Nf2(A) {
  return f7(A) && gk(A.length) && !!$B[oW(A)]
}

function Tf2(A, B) {
  var Q = U8(A),
      I = !Q && zU(A),
      G = !Q && !I && gH(A),
      Z = !Q && !I && !G && dk(A),
      D = Q || I || G || Z,
      Y = D ? p9A(A.length, String) : [],
      W = Y.length;
  for (var J in A)
      if ((B || Of2.call(A, J)) && !(D && (J == "length" || G && (J == "offset" || J == "parent") || Z && (J == "buffer" || J == "byteLength" || J == "byteOffset") || uq(J, W)))) Y.push(J);
  return Y
}

function Pf2(A, B) {
  return function(Q) {
      return A(B(Q))
  }

function yf2(A) {
  if (!hk(A)) return t9A(A);
  var B = [];
  for (var Q in Object(A))
      if (jf2.call(A, Q) && Q != "constructor") B.push(Q);
  return B
}

function kf2(A) {
  return bH(A) ? R21(A) : e9A(A)
}

function xf2(A) {
  var B = [];
  if (A != null)
      for (var Q in Object(A)) B.push(Q);
  return B
}

function bf2(A) {
  if (!pB(A)) return A4A(A);
  var B = hk(A),
      Q = [];
  for (var I in A)
      if (!(I == "constructor" && (B || !vf2.call(A, I)))) Q.push(I);
  return Q
}

function gf2(A) {
  return bH(A) ? R21(A, !0) : B4A(A)
}

function df2(A, B) {
  if (U8(A)) return !1;
  var Q = typeof A;
  if (Q == "number" || Q == "symbol" || Q == "boolean" || A == null || kk(A)) return !0;
  return mf2.test(A) || !hf2.test(A) || B != null && A in Object(B)
}

function pf2() {
  this.__data__ = wU ? wU(null) : {}

function cf2(A) {
  var B = this.has(A) && delete this.__data__[A];
  return this.size -= B ? 1 : 0, B
}

function af2(A) {
  var B = this.__data__;
  if (wU) {
      var Q = B[A];
      return Q === lf2 ? void 0 : Q
  }

function of2(A) {
  var B = this.__data__;
  return wU ? B[A] !== void 0 : rf2.call(B, A)
}

function ef2(A, B) {
  var Q = this.__data__;
  return this.size += this.has(A) ? 0 : 1, Q[A] = wU && B === void 0 ? tf2 : B, this
}

function pk(A) {
  var B = -1,
      Q = A == null ? 0 : A.length;
  this.clear();
  while (++B < Q) {
      var I = A[B];
      this.set(I[0], I[1])
  }

function Av2() {
  this.__data__ = [], this.size = 0
}

function Bv2(A, B) {
  var Q = A.length;
  while (Q--)
      if (fH(A[Q][0], B)) return Q;
  return -1
}

function Gv2(A) {
  var B = this.__data__,
      Q = lq(B, A);
  if (Q < 0) return !1;
  var I = B.length - 1;
  if (Q == I) B.pop();
  else Iv2.call(B, Q, 1);
  return --this.size, !0
}

function Zv2(A) {
  var B = this.__data__,
      Q = lq(B, A);
  return Q < 0 ? void 0 : B[Q][1]
}

function Dv2(A) {
  return lq(this.__data__, A) > -1
}

function Yv2(A, B) {
  var Q = this.__data__,
      I = lq(Q, A);
  if (I < 0) ++this.size, Q.push([A, B]);
  else Q[I][1] = B;
  return this
}

function ck(A) {
  var B = -1,
      Q = A == null ? 0 : A.length;
  this.clear();
  while (++B < Q) {
      var I = A[B];
      this.set(I[0], I[1])
  }

function Jv2() {
  this.size = 0, this.__data__ = {
      hash: new MU1,
      map: new(nq || iq),
      string: new MU1
  }

function Fv2(A) {
  var B = typeof A;
  return B == "string" || B == "number" || B == "symbol" || B == "boolean" ? A !== "__proto__" : A === null
}

function Xv2(A, B) {
  var Q = A.__data__;
  return C4A(B) ? Q[typeof B == "string" ? "string" : "hash"] : Q.map
}

function Vv2(A) {
  var B = aq(this, A).delete(A);
  return this.size -= B ? 1 : 0, B
}

function Cv2(A) {
  return aq(this, A).get(A)
}

function Kv2(A) {
  return aq(this, A).has(A)
}

function Hv2(A, B) {
  var Q = aq(this, A),
      I = Q.size;
  return Q.set(A, B), this.size += Q.size == I ? 0 : 1, this
}

function lk(A) {
  var B = -1,
      Q = A == null ? 0 : A.length;
  this.clear();
  while (++B < Q) {
      var I = A[B];
      this.set(I[0], I[1])
  }

function LU1(A, B) {
  if (typeof A != "function" || B != null && typeof B != "function") throw new TypeError(zv2);
  var Q = function() {
      var I = arguments,
          G = B ? B.apply(this, I) : I[0],
          Z = Q.cache;
      if (Z.has(G)) return Z.get(G);
      var D = A.apply(this, I);
      return Q.cache = Z.set(G, D) || Z, D
  }

function Ev2(A) {
  var B = L0(A, function(I) {
          if (Q.size === wv2) Q.clear();
          return I
      }

function qv2(A) {
  return A == null ? "" : $9A(A)
}

function Mv2(A, B) {
  if (U8(A)) return A;
  return uk(A, B) ? [A] : U4A(ik(A))
}

function Rv2(A) {
  if (typeof A == "string" || kk(A)) return A;
  var B = A + "";
  return B == "0" && 1 / A == -Lv2 ? "-0" : B
}

function Ov2(A, B) {
  B = sq(B, A);
  var Q = 0,
      I = B.length;
  while (A != null && Q < I) A = A[dH(B[Q++])];
  return Q && Q == I ? A : void 0
}

function Tv2(A, B, Q) {
  var I = A == null ? void 0 : nk(A, B);
  return I === void 0 ? Q : I
}

function Pv2(A, B) {
  var Q = -1,
      I = B.length,
      G = A.length;
  while (++Q < I) A[G + Q] = B[Q];
  return A
}

function Sv2(A) {
  return U8(A) || zU(A) || !!($4A && A && A[$4A])
}

function M4A(A, B, Q, I, G) {
  var Z = -1,
      D = A.length;
  Q || (Q = q4A), G || (G = []);
  while (++Z < D) {
      var Y = A[Z];
      if (B > 0 && Q(Y))
          if (B > 1) M4A(Y, B - 1, Q, I, G);
          else ak(G, Y);
      else if (!I) G[G.length] = Y
  }

function _v2(A) {
  var B = A == null ? 0 : A.length;
  return B ? L4A(A, 1) : []
}

function jv2(A) {
  return U21(N21(A, void 0, R4A), A + "")
}

function gv2(A) {
  if (!f7(A) || oW(A) != kv2) return !1;
  var B = sk(A);
  if (B === null) return !0;
  var Q = vv2.call(B, "constructor") && B.constructor;
  return typeof Q == "function" && Q instanceof Q && T4A.call(Q) == bv2
}

function hv2(A, B, Q) {
  var I = -1,
      G = A.length;
  if (B < 0) B = -B > G ? 0 : G + B;
  if (Q = Q > G ? G : Q, Q < 0) Q += G;
  G = B > Q ? 0 : Q - B >>> 0, B >>>= 0;
  var Z = Array(G);
  while (++I < G) Z[I] = A[I + B];
  return Z
}

function mv2(A, B, Q) {
  var I = A.length;
  return Q = Q === void 0 ? I : Q, !B && Q >= I ? A : P4A(A, B, Q)
}

function sv2(A) {
  return av2.test(A)
}

function rv2(A) {
  return A.split("")
}

function Jb2(A) {
  return A.match(Wb2) || []
}

function Fb2(A) {
  return T21(A) ? b4A(A) : _4A(A)
}

function Xb2(A) {
  return function(B) {
      B = ik(B);
      var Q = T21(B) ? g4A(B) : void 0,
          I = Q ? Q[0] : B.charAt(0),
          G = Q ? S4A(Q, 1).join("") : B.slice(1);
      return I[A]() + G
  }

function Cb2(A) {
  return m4A(ik(A).toLowerCase())
}

function Kb2() {
  this.__data__ = new iq, this.size = 0
}

function Hb2(A) {
  var B = this.__data__,
      Q = B.delete(A);
  return this.size = B.size, Q
}

function zb2(A) {
  return this.__data__.get(A)
}

function wb2(A) {
  return this.__data__.has(A)
}

function Ub2(A, B) {
  var Q = this.__data__;
  if (Q instanceof iq) {
      var I = Q.__data__;
      if (!nq || I.length < Eb2 - 1) return I.push([A, B]), this.size = ++Q.size, this;
      Q = this.__data__ = new zP(I)
  }

function rk(A) {
  var B = this.__data__ = new iq(A);
  this.size = B.size
}

function Nb2(A, B) {
  return A && vH(B, vF(B), A)
}

function Mb2(A, B) {
  if (B) return A.slice();
  var Q = A.length,
      I = r4A ? r4A(Q) : new A.constructor(Q);
  return A.copy(I), I
}

function Lb2(A, B) {
  var Q = -1,
      I = A == null ? 0 : A.length,
      G = 0,
      Z = [];
  while (++Q < I) {
      var D = A[Q];
      if (B(D, Q, A)) Z[G++] = D
  }

function Rb2() {
  return []
}

function Sb2(A, B) {
  return vH(A, ok(A), B)
}

function yb2(A, B) {
  return vH(A, j21(A), B)
}

function kb2(A, B, Q) {
  var I = B(A);
  return U8(A) ? I : ak(I, Q(A))
}

function xb2(A) {
  return y21(A, vF, ok)
}

function fb2(A) {
  return y21(A, mH, j21)
}

function nb2(A) {
  var B = A.length,
      Q = new A.constructor(B);
  if (B && typeof A[0] == "string" && ib2.call(A, "index")) Q.index = A.index, Q.input = A.input;
  return Q
}

function sb2(A) {
  var B = new A.constructor(A.byteLength);
  return new tk(B).set(new tk(A)), B
}

function rb2(A, B) {
  var Q = B ? ek(A.buffer) : A.buffer;
  return new A.constructor(Q, A.byteOffset, A.byteLength)
}

function tb2(A) {
  var B = new A.constructor(A.source, ob2.exec(A));
  return B.lastIndex = A.lastIndex, B
}

function eb2(A) {
  return X6A ? Object(X6A.call(A)) : {}

function Ag2(A, B) {
  var Q = B ? ek(A.buffer) : A.buffer;
  return new A.constructor(Q, A.byteOffset, A.length)
}

function Ng2(A, B, Q) {
  var I = A.constructor;
  switch (B) {
      case Jg2:
          return ek(A);
      case Bg2:
      case Qg2:
          return new I(+A);
      case Fg2:
          return W6A(A, Q);
      case Xg2:
      case Vg2:
      case Cg2:
      case Kg2:
      case Hg2:
      case zg2:
      case wg2:
      case Eg2:
      case Ug2:
          return v21(A, Q);
      case Ig2:
          return new I;
      case Gg2:
      case Yg2:
          return new I(A);
      case Zg2:
          return J6A(A);
      case Dg2:
          return new I;
      case Wg2:
          return V6A(A)
  }

function Mg2(A) {
  return f7(A) && EU(A) == qg2
}

function Og2(A) {
  return f7(A) && EU(A) == Rg2
}

function g21(A, B, Q, I, G, Z) {
  var D, Y = B & Pg2,
      W = B & Sg2,
      J = B & _g2;
  if (Q) D = G ? Q(A, I, G, Z) : Q(A);
  if (D !== void 0) return D;
  if (!pB(A)) return A;
  var F = U8(A);
  if (F) {
      if (D = Y6A(A), !Y) return E21(A, D)
  }

function Qh2(A) {
  return M6A(A, Ah2 | Bh2)
}

function Gh2(A) {
  return this.__data__.set(A, Ih2), this
}

function Zh2(A) {
  return this.__data__.has(A)
}

function h21(A) {
  var B = -1,
      Q = A == null ? 0 : A.length;
  this.__data__ = new zP;
  while (++B < Q) this.add(A[B])
}

function Dh2(A, B) {
  var Q = -1,
      I = A == null ? 0 : A.length;
  while (++Q < I)
      if (B(A[Q], Q, A)) return !0;
  return !1
}

function Yh2(A, B) {
  return A.has(B)
}

function Fh2(A, B, Q, I, G, Z) {
  var D = Q & Wh2,
      Y = A.length,
      W = B.length;
  if (Y != W && !(D && W > Y)) return !1;
  var J = Z.get(A),
      F = Z.get(B);
  if (J && F) return J == B && F == A;
  var X = -1,
      V = !0,
      C = Q & Jh2 ? new m21 : void 0;
  Z.set(A, B), Z.set(B, A);
  while (++X < Y) {
      var K = A[X],
          E = B[X];
      if (I) var N = D ? I(E, K, X, B, A, Z) : I(K, E, X, A, B, Z);
      if (N !== void 0) {
          if (N) continue;
          V = !1;
          break
      }

function Xh2(A) {
  var B = -1,
      Q = Array(A.size);
  return A.forEach(function(I, G) {
      Q[++B] = [G, I]
  }

function Vh2(A) {
  var B = -1,
      Q = Array(A.size);
  return A.forEach(function(I) {
      Q[++B] = I
  }

function Oh2(A, B, Q, I, G, Z, D) {
  switch (Q) {
      case Rh2:
          if (A.byteLength != B.byteLength || A.byteOffset != B.byteOffset) return !1;
          A = A.buffer, B = B.buffer;
      case Lh2:
          if (A.byteLength != B.byteLength || !Z(new tk(A), new tk(B))) return !1;
          return !0;
      case Hh2:
      case zh2:
      case Uh2:
          return fH(+A, +B);
      case wh2:
          return A.name == B.name && A.message == B.message;
      case Nh2:
      case qh2:
          return A == B + "";
      case Eh2:
          var Y = T6A;
      case $h2:
          var W = I & Ch2;
          if (Y || (Y = Ax), A.size != B.size && !W) return !1;
          var J = D.get(A);
          if (J) return J == B;
          I |= Kh2, D.set(A, B);
          var F = u21(Y(A), Y(B), I, G, Z, D);
          return D.delete(A), F;
      case Mh2:
          if (PU1) return PU1.call(A) == PU1.call(B)
  }

function _h2(A, B, Q, I, G, Z) {
  var D = Q & Th2,
      Y = wc(A),
      W = Y.length,
      J = wc(B),
      F = J.length;
  if (W != F && !D) return !1;
  var X = W;
  while (X--) {
      var V = Y[X];
      if (!(D ? V in B : Sh2.call(B, V))) return !1
  }

function kh2(A, B, Q, I, G, Z) {
  var D = U8(A),
      Y = U8(B),
      W = D ? y6A : EU(A),
      J = Y ? y6A : EU(B);
  W = W == j6A ? p21 : W, J = J == j6A ? p21 : J;
  var F = W == p21,
      X = J == p21,
      V = W == J;
  if (V && gH(A)) {
      if (!gH(B)) return !1;
      D = !0, F = !1
  }

function f6A(A, B, Q, I, G) {
  if (A === B) return !0;
  if (A == null || B == null || !f7(A) && !f7(B)) return A !== A && B !== B;
  return x6A(A, B, Q, I, f6A, G)
}

function vh2(A, B, Q, I) {
  var G = Q.length,
      Z = G,
      D = !I;
  if (A == null) return !Z;
  A = Object(A);
  while (G--) {
      var Y = Q[G];
      if (D && Y[2] ? Y[1] !== A[Y[0]] : !(Y[0] in A)) return !1
  }

function bh2(A) {
  return A === A && !pB(A)
}

function gh2(A) {
  var B = vF(A),
      Q = B.length;
  while (Q--) {
      var I = B[Q],
          G = A[I];
      B[Q] = [I, G, c21(G)]
  }

function hh2(A, B) {
  return function(Q) {
      if (Q == null) return !1;
      return Q[A] === B && (B !== void 0 || (A in Object(Q)))
  }

function mh2(A) {
  var B = b6A(A);
  if (B.length == 1 && B[0][2]) return l21(B[0][0], B[0][1]);
  return function(Q) {
      return Q === A || v6A(Q, A, B)
  }

function dh2(A, B) {
  return A != null && B in Object(A)
}

function uh2(A, B, Q) {
  B = sq(B, A);
  var I = -1,
      G = B.length,
      Z = !1;
  while (++I < G) {
      var D = dH(B[I]);
      if (!(Z = A != null && Q(A, D))) break;
      A = A[D]
  }

function ph2(A, B) {
  return A != null && m6A(A, B, h6A)
}

function ih2(A, B) {
  if (uk(A) && c21(B)) return l21(dH(A), B);
  return function(Q) {
      var I = N4A(Q, A);
      return I === void 0 && I === B ? i21(Q, A) : Bx(B, I, ch2 | lh2)
  }

function nh2(A) {
  return function(B) {
      return B == null ? void 0 : B[A]
  }

function ah2(A) {
  return function(B) {
      return nk(B, A)
  }

function sh2(A) {
  return uk(A) ? u6A(dH(A)) : p6A(A)
}

function rh2(A) {
  if (typeof A == "function") return A;
  if (A == null) return fk;
  if (typeof A == "object") return U8(A) ? d6A(A[0], A[1]) : g6A(A);
  return c6A(A)
}

function oh2(A, B, Q, I) {
  var G = -1,
      Z = A == null ? 0 : A.length;
  while (++G < Z) {
      var D = A[G];
      B(I, D, Q(D), A)
  }

function th2(A) {
  return function(B, Q, I) {
      var G = -1,
          Z = Object(B),
          D = I(B),
          Y = D.length;
      while (Y--) {
          var W = D[A ? Y : ++G];
          if (Q(Z[W], W, Z) === !1) break
      }

function Am2(A, B) {
  return A && n21(A, B, vF)
}

function Bm2(A, B) {
  return function(Q, I) {
      if (Q == null) return Q;
      if (!bH(Q)) return A(Q, I);
      var G = Q.length,
          Z = B ? G : -1,
          D = Object(Q);
      while (B ? Z-- : ++Z < G)
          if (I(D[Z], Z, D) === !1) break;
      return Q
  }

function Im2(A, B, Q, I) {
  return a6A(A, function(G, Z, D) {
      B(I, G, Q(G), D)
  }

function Gm2(A, B) {
  return function(Q, I) {
      var G = U8(Q) ? l6A : s6A,
          Z = B ? B() : {}

function Zm2(A, B, Q) {
  if (Q !== void 0 && !fH(A[B], Q) || Q === void 0 && !(B in A)) pq(A, B, Q)
}

function Dm2(A) {
  return f7(A) && bH(A)
}

function Ym2(A, B) {
  if (B === "constructor" && typeof A[B] === "function") return;
  if (B == "__proto__") return;
  return A[B]
}

function Wm2(A) {
  return vH(A, mH(A))
}

function Jm2(A, B, Q, I, G, Z, D) {
  var Y = Nc(A, Q),
      W = Nc(B, Q),
      J = D.get(W);
  if (J) {
      Uc(A, Q, J);
      return
  }

function A5A(A, B, Q, I, G) {
  if (A === B) return;
  n21(B, function(Z, D) {
      if (G || (G = new uH), pB(Z)) e6A(A, B, D, Q, A5A, I, G);
      else {
          var Y = I ? I(Nc(A, D), Z, D + "", A, B, G) : void 0;
          if (Y === void 0) Y = Z;
          Uc(A, D, Y)
      }

function Xm2(A, B, Q) {
  var I = -1,
      G = A == null ? 0 : A.length;
  while (++I < G)
      if (Q(B, A[I])) return !0;
  return !1
}

function Vm2(A) {
  var B = A == null ? 0 : A.length;
  return B ? A[B - 1] : void 0
}

function Cm2(A, B) {
  return xk(B, function(Q) {
      return A[Q]
  }

function Km2(A) {
  return A == null ? [] : I5A(A, vF(A))
}

function Hm2(A, B) {
  return Bx(A, B)
}

function zm2(A, B) {
  var Q = {}

function wm2(A, B, Q, I) {
  if (!pB(A)) return A;
  B = sq(B, A);
  var G = -1,
      Z = B.length,
      D = Z - 1,
      Y = A;
  while (Y != null && ++G < Z) {
      var W = dH(B[G]),
          J = Q;
      if (W === "__proto__" || W === "constructor" || W === "prototype") return A;
      if (G != D) {
          var F = Y[W];
          if (J = I ? I(F, W, Y) : void 0, J === void 0) J = pB(F) ? F : uq(B[G + 1]) ? [] : {}

function Em2(A, B, Q) {
  var I = -1,
      G = B.length,
      Z = {}

function Um2(A, B) {
  if (A == null) return {}

function Rm2(A, B) {
  return A + Mm2(Lm2() * (B - A + 1))
}

function Om2(A) {
  var B = A.length;
  return B ? A[Y5A(0, B - 1)] : void 0
}

function Tm2(A) {
  return t21(G5A(A))
}

function Pm2(A) {
  var B = U8(A) ? t21 : W5A;
  return B(A)
}

function ym2(A, B, Q) {
  var I = -1,
      G = g9A,
      Z = A.length,
      D = !0,
      Y = [],
      W = Y;
  if (Q) D = !1, G = Q5A;
  else if (Z >= jm2) {
      var J = B ? null : J5A(A);
      if (J) return Ax(J);
      D = !1, G = d21, W = new m21
  }

function km2(A, B) {
  return A && A.length ? F5A(A, oq(B, 2)) : []
}

function xm2(A, B, Q) {
  var I = -1,
      G = A.length,
      Z = B.length,
      D = {}

function fm2(A, B) {
  return X5A(A || [], B || [], cq)
}

function CV9() {
  return;
  try {
      return VV9("git config --get user.email").toString().trim()
  }

function El(A, B) {
  return function Q() {
      return A.apply(B, arguments)
  }

function CC9(A) {
  return A !== null && !Ul(A) && A.constructor !== null && !Ul(A.constructor) && IJ(A.constructor.isBuffer) && A.constructor.isBuffer(A)
}

function KC9(A) {
  let B;
  if (typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView) B = ArrayBuffer.isView(A);
  else B = A && A.buffer && oJA(A.buffer);
  return B
}

function Nl(A, B, {
  allOwnKeys: Q = !1
} = {}) {
  if (A === null || typeof A === "undefined") return;
  let I, G;
  if (typeof A !== "object") A = [A];
  if (bx(A))
      for (I = 0, G = A.length; I < G; I++) B.call(null, A[I], I, A);
  else {
      let Z = Q ? Object.getOwnPropertyNames(A) : Object.keys(A),
          D = Z.length,
          Y;
      for (I = 0; I < D; I++) Y = Z[I], B.call(null, A[Y], Y, A)
  }

function eJA(A, B) {
  B = B.toLowerCase();
  let Q = Object.keys(A),
      I = Q.length,
      G;
  while (I-- > 0)
      if (G = Q[I], B === G.toLowerCase()) return G;
  return null
}

function kq1() {
  let {
      caseless: A
  }

function B(Q, I, G) {
          return I.toUpperCase() + G
      }

function lC9(A) {
  return !!(A && IJ(A.append) && A[Symbol.toStringTag] === "FormData" && A[Symbol.iterator])
}

function gx(A, B, Q, I, G) {
  if (Error.call(this), Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  else this.stack = new Error().stack;
  if (this.message = A, this.name = "AxiosError", B && (this.code = B), Q && (this.config = Q), I && (this.request = I), G) this.response = G, this.status = G.status ? G.status : null
}

function A() {
      return {
          message: this.message,
          name: this.name,
          description: this.description,
          number: this.number,
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          config: WA.toJSONObject(this.config),
          code: this.code,
          status: this.status
      }

function Y(W) {
      return W !== Error.prototype
  }

function GM1(A) {
  return WA.isPlainObject(A) || WA.isArray(A)
}

function XVA(A) {
  return WA.endsWith(A, "[]") ? A.slice(0, -2) : A
}

function FVA(A, B, Q) {
  if (!A) return B;
  return A.concat(B).map(function I(G, Z) {
      return G = XVA(G), !Q && Z ? "[" + G + "]" : G
  }

function bH9(A) {
  return WA.isArray(A) && !A.some(GM1)
}

function A(B) {
  return /^is[A-Z]/.test(B)
}

function hH9(A, B, Q) {
  if (!WA.isObject(A)) throw new TypeError("target must be an object");
  B = B || new(H61 || FormData), Q = WA.toFlatObject(Q, {
      metaTokens: !0,
      dots: !1,
      indexes: !1
  }

function K(E, N) {
      return !WA.isUndefined(N[E])
  }

function J(K) {
      if (K === null) return "";
      if (WA.isDate(K)) return K.toISOString();
      if (!W && WA.isBlob(K)) throw new F2("Blob is not supported. Use a Buffer instead.");
      if (WA.isArrayBuffer(K) || WA.isTypedArray(K)) return W && typeof Blob === "function" ? new Blob([K]) : Buffer.from(K);
      return K
  }

function F(K, E, N) {
      let q = K;
      if (K && !N && typeof K === "object") {
          if (WA.endsWith(E, "{}

function O(R, T) {
              !(WA.isUndefined(R) || R === null) && B.append(D === !0 ? FVA([E], T, Z) : D === null ? E : E + "[]", J(R))
          }

function C(K, E) {
      if (WA.isUndefined(K)) return;
      if (X.indexOf(K) !== -1) throw Error("Circular reference detected in " + E.join("."));
      X.push(K), WA.forEach(K, function N(q, O) {
          if ((!(WA.isUndefined(q) || q === null) && G.call(B, q, WA.isString(O) ? O.trim() : O, E, V)) === !0) C(q, E ? E.concat(O) : [O])
      }

function VVA(A) {
  let B = {
      "!": "%21",
      "'": "%27",
      "(": "%28",
      ")": "%29",
      "~": "%7E",
      "%20": "+",
      "%00": "\x00"
  }

function Q(I) {
      return B[I]
  }

function CVA(A, B) {
  this._pairs = [], A && JM(A, this, B)
}

function A(B, Q) {
  this._pairs.push([B, Q])
}

function A(B) {
  let Q = B ? function(I) {
      return B.call(this, I, VVA)
  }

function I(G) {
      return Q(G[0]) + "=" + Q(G[1])
  }

function mH9(A) {
  return encodeURIComponent(A).replace(/%3A/gi, ":").replace(/%24/g, "$").replace(/%2C/gi, ",").replace(/%20/g, "+").replace(/%5B/gi, "[").replace(/%5D/gi, "]")
}

function nP(A, B, Q) {
  if (!B) return A;
  let I = Q && Q.encode || mH9;
  if (WA.isFunction(Q)) Q = {
      serialize: Q
  }

function B(Q) {
          if (Q !== null) A(Q)
      }

function FM1(A, B) {
  return JM(A, new q5.classes.URLSearchParams, Object.assign({
      visitor: function(Q, I, G, Z) {
          if (q5.isNode && WA.isBuffer(Q)) return this.append(I, Q.toString("base64")), !1;
          return Z.defaultVisitor.apply(this, arguments)
      }

function nH9(A) {
  return WA.matchAll(/\w+|\[(\w*)]/g, A).map((B) => {
      return B[0] === "[]" ? "" : B[1] || B[0]
  }

function aH9(A) {
  let B = {}

function sH9(A) {
  function B(Q, I, G, Z) {
      let D = Q[Z++];
      if (D === "__proto__") return !0;
      let Y = Number.isFinite(+D),
          W = Z >= Q.length;
      if (D = !D && WA.isArray(G) ? G.length : D, W) {
          if (WA.hasOwnProp(G, D)) G[D] = [G[D], I];
          else G[D] = I;
          return !Y
      }

function rH9(A, B, Q) {
  if (WA.isString(A)) try {
      return (B || JSON.parse)(A), WA.trim(A)
  }

function A(B, Q) {
      let I = Q.getContentType() || "",
          G = I.indexOf("application/json") > -1,
          Z = WA.isObject(B);
      if (Z && WA.isHTMLForm(B)) B = new FormData(B);
      if (WA.isFormData(B)) return G ? JSON.stringify(z61(B)) : B;
      if (WA.isArrayBuffer(B) || WA.isBuffer(B) || WA.isStream(B) || WA.isFile(B) || WA.isBlob(B) || WA.isReadableStream(B)) return B;
      if (WA.isArrayBufferView(B)) return B.buffer;
      if (WA.isURLSearchParams(B)) return Q.setContentType("application/x-www-form-urlencoded;charset=utf-8", !1), B.toString();
      let Y;
      if (Z) {
          if (I.indexOf("application/x-www-form-urlencoded") > -1) return FM1(B, this.formSerializer).toString();
          if ((Y = WA.isFileList(B)) || I.indexOf("multipart/form-data") > -1) {
              let W = this.env && this.env.FormData;
              return JM(Y ? {
                  "files[]": B
              }

function A(B) {
      let Q = this.transitional || XM1.transitional,
          I = Q && Q.forcedJSONParsing,
          G = this.responseType === "json";
      if (WA.isResponse(B) || WA.isReadableStream(B)) return B;
      if (B && WA.isString(B) && (I && !this.responseType || G)) {
          let D = !(Q && Q.silentJSONParsing) && G;
          try {
              return JSON.parse(B)
          }

function A(B) {
      return B >= 200 && B < 300
  }

function Z(D) {
          if (G = D.indexOf(":"), Q = D.substring(0, G).trim().toLowerCase(), I = D.substring(G + 1).trim(), !Q || B[Q] && oH9[Q]) return;
          if (Q === "set-cookie")
              if (B[Q]) B[Q].push(I);
              else B[Q] = [I];
          else B[Q] = B[Q] ? B[Q] + ", " + I : I
      }

function Rl(A) {
  return A && String(A).trim().toLowerCase()
}

function w61(A) {
  if (A === !1 || A == null) return A;
  return WA.isArray(A) ? A.map(w61) : String(A)
}

function tH9(A) {
  let B = Object.create(null),
      Q = /([^\s,;=]+)\s*(?:=\s*([^,;]+))?/g,
      I;
  while (I = Q.exec(A)) B[I[1]] = I[2];
  return B
}

function VM1(A, B, Q, I, G) {
  if (WA.isFunction(I)) return I.call(this, B, Q);
  if (G) B = Q;
  if (!WA.isString(B)) return;
  if (WA.isString(I)) return B.indexOf(I) !== -1;
  if (WA.isRegExp(I)) return I.test(B)
}

function Az9(A) {
  return A.trim().toLowerCase().replace(/([a-z\d])(\w*)/g, (B, Q, I) => {
      return Q.toUpperCase() + I
  }

function Bz9(A, B) {
  let Q = WA.toCamelCase(" " + B);
  ["get", "set", "has"].forEach((I) => {
      Object.defineProperty(A, I + Q, {
          value: function(G, Z, D) {
              return this[I].call(this, B, G, Z, D)
          }

function G(D, Y, W) {
          let J = Rl(Y);
          if (!J) throw new Error("header name must be a non-empty string");
          let F = WA.findKey(I, J);
          if (!F || I[F] === void 0 || W === !0 || W === void 0 && I[F] !== !1) I[F || Y] = w61(D)
      }

function G(Z) {
          if (Z = Rl(Z), Z) {
              let D = WA.findKey(Q, Z);
              if (D && (!B || VM1(Q, Q[D], D, B))) delete Q[D], I = !0
          }

function G(Z) {
          let D = Rl(Z);
          if (!Q[D]) Bz9(I, Z), Q[D] = !0
      }

function Tl(A, B) {
  let Q = this || cx,
      I = B || Q,
      G = w3.from(I.headers),
      Z = I.data;
  return WA.forEach(A, function D(Y) {
      Z = Y.call(Q, Z, G.normalize(), B ? B.status : void 0)
  }

function Pl(A) {
  return !!(A && A.__CANCEL__)
}

function MVA(A, B, Q) {
  F2.call(this, A == null ? "canceled" : A, F2.ERR_CANCELED, B, Q), this.name = "CanceledError"
}

function Gz(A, B, Q) {
  let I = Q.config.validateStatus;
  if (!Q.status || !I || I(Q.status)) A(Q);
  else B(new F2("Request failed with status code " + Q.status, [F2.ERR_BAD_REQUEST, F2.ERR_BAD_RESPONSE][Math.floor(Q.status / 100) - 4], Q.config, Q.request, Q))
}

function CM1(A) {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(A)
}

function KM1(A, B) {
  return B ? A.replace(/\/?\/$/, "") + "/" + B.replace(/^\/+/, "") : A
}

function aP(A, B, Q) {
  let I = !CM1(B);
  if (A && (I || Q == !1)) return KM1(A, B);
  return B
}

function fl(A) {
  let B = /^([-+\w]{1,25}

function _M1(A, B, Q) {
  let I = Q && Q.Blob || q5.classes.Blob,
      G = fl(A);
  if (B === void 0 && I) B = !0;
  if (G === "data") {
      A = G.length ? A.slice(G.length + 1) : A;
      let Z = Gw9.exec(A);
      if (!Z) throw new F2("Invalid URL", F2.ERR_INVALID_URL);
      let D = Z[1],
          Y = Z[2],
          W = Z[3],
          J = Buffer.from(decodeURIComponent(W), Y ? "base64" : "utf8");
      if (B) {
          if (!I) throw new F2("Blob is not supported", F2.ERR_NOT_SUPPORT);
          return new I([J], {
              type: D
          }

function V(C, K) {
          if (C) return Q(C);
          if (K) X(K, V);
          else Q(null)
      }

function Hw9(A, B) {
  A = A || 10;
  let Q = new Array(A),
      I = new Array(A),
      G = 0,
      Z = 0,
      D;
  return B = B !== void 0 ? B : 1000,
      function Y(W) {
          let J = Date.now(),
              F = I[Z];
          if (!D) D = J;
          Q[G] = W, I[G] = J;
          let X = Z,
              V = 0;
          while (X !== G) V += Q[X++], X = X % A;
          if (G = (G + 1) % A, G === Z) Z = (Z + 1) % A;
          if (J - D < B) return;
          let C = F && J - F;
          return C ? Math.round(V * 1000 / C) : void 0
      }

function zw9(A, B) {
  let Q = 0,
      I = 1000 / B,
      G, Z, D = (J, F = Date.now()) => {
          if (Q = F, G = null, Z) clearTimeout(Z), Z = null;
          A.apply(null, J)
      }

function Rw9(A, B) {
  if (A.beforeRedirects.proxy) A.beforeRedirects.proxy(A);
  if (A.beforeRedirects.config) A.beforeRedirects.config(A, B)
}

function YCA(A, B, Q) {
  let I = B;
  if (!I && I !== !1) {
      let G = ZCA.default.getProxyForUrl(Q);
      if (G) I = new URL(G)
  }

function G(Z) {
      YCA(Z, B, Z.href)
  }

function A(B) {
      return Tw9(async function Q(I, G, Z) {
          let {
              data: D,
              lookup: Y,
              family: W
          }

function q(u1) {
              E.emit("abort", !u1 || u1.type ? new GJ(null, B, K) : u1)
          }

function u1(d1) {
                  if (K.destroyed) return;
                  let YA = [d1],
                      bA = +d1.headers["content-length"];
                  if (k || s) {
                      let L1 = new yM1({
                          maxRate: WA.toFiniteNumber(s)
                      }

function HA(MA) {
                          if (L1.push(MA), BA += MA.length, B.maxContentLength > -1 && BA > B.maxContentLength) C = !0, e1.destroy(), G(new F2("maxContentLength size of " + B.maxContentLength + " exceeded", F2.ERR_BAD_RESPONSE, B, k1))
                      }

function HA() {
                          if (C) return;
                          let MA = new F2("stream has been aborted", F2.ERR_BAD_RESPONSE, B, k1);
                          e1.destroy(MA), G(MA)
                      }

function HA(MA) {
                          if (K.destroyed) return;
                          G(F2.from(MA, null, B, k1))
                      }

function HA() {
                          try {
                              let MA = L1.length === 1 ? L1[0] : Buffer.concat(L1);
                              if (J !== "arraybuffer") {
                                  if (MA = MA.toString(F), !F || F === "utf8") MA = WA.stripBOM(MA)
                              }

function u1(d1) {
                  G(F2.from(d1, null, B, K))
              }

function u1(d1) {
                  d1.setKeepAlive(!0, 60000)
              }

function d1() {
                  if (V) return;
                  let YA = B.timeout ? "timeout of " + B.timeout + "ms exceeded" : "timeout exceeded",
                      bA = B.transitional || px;
                  if (B.timeoutErrorMessage) YA = B.timeoutErrorMessage;
                  G(new F2(YA, bA.clarifyTimeoutError ? F2.ETIMEDOUT : F2.ECONNABORTED, B, K)), q()
              }

function IC(A, B) {
  B = B || {}

function I(J, F, X, V) {
      if (WA.isPlainObject(J) && WA.isPlainObject(F)) return WA.merge.call({
          caseless: V
      }

function G(J, F, X, V) {
      if (!WA.isUndefined(F)) return I(J, F, X, V);
      else if (!WA.isUndefined(J)) return I(void 0, J, X, V)
  }

function Z(J, F) {
      if (!WA.isUndefined(F)) return I(void 0, F)
  }

function D(J, F) {
      if (!WA.isUndefined(F)) return I(void 0, F);
      else if (!WA.isUndefined(J)) return I(void 0, J)
  }

function Y(J, F, X) {
      if (X in B) return I(J, F);
      else if (X in A) return I(void 0, J)
  }

function J(F) {
      let X = W[F] || G,
          V = X(A[F], B[F], F);
      WA.isUndefined(V) && X !== Y || (Q[F] = V)
  }

function B(Q, I) {
          let G = R61(A),
              Z = G.data,
              D = w3.from(G.headers).normalize(),
              {
                  responseType: Y,
                  onUploadProgress: W,
                  onDownloadProgress: J
              }

function E() {
              C && C(), K && K(), G.cancelToken && G.cancelToken.unsubscribe(F), G.signal && G.signal.removeEventListener("abort", F)
          }

function q() {
              if (!N) return;
              let R = w3.from("getAllResponseHeaders" in N && N.getAllResponseHeaders()),
                  L = {
                      data: !Y || Y === "text" || Y === "json" ? N.responseText : N.response,
                      status: N.status,
                      statusText: N.statusText,
                      headers: R,
                      config: A,
                      request: N
                  }

function _(k) {
                  Q(k), E()
              }

function _(k) {
                  I(k), E()
              }

function R() {
              if (!N || N.readyState !== 4) return;
              if (N.status === 0 && !(N.responseURL && N.responseURL.indexOf("file:") === 0)) return;
              setTimeout(q)
          }

function R() {
                  if (!N) return;
                  I(new F2("Request aborted", F2.ECONNABORTED, A, N)), N = null
              }

function R() {
                  I(new F2("Network Error", F2.ERR_NETWORK, A, N)), N = null
              }

function R() {
                  let T = G.timeout ? "timeout of " + G.timeout + "ms exceeded" : "timeout exceeded",
                      L = G.transitional || px;
                  if (G.timeoutErrorMessage) T = G.timeoutErrorMessage;
                  I(new F2(T, L.clarifyTimeoutError ? F2.ETIMEDOUT : F2.ECONNABORTED, A, N)), N = null
              }

function R(T, L) {
              N.setRequestHeader(L, T)
          }

function vM1(A) {
  if (A.cancelToken) A.cancelToken.throwIfRequested();
  if (A.signal && A.signal.aborted) throw new GJ(null, A)
}

function S61(A) {
  if (vM1(A), A.headers = w3.from(A.headers), A.data = Tl.call(A, A.transformRequest), ["post", "put", "patch"].indexOf(A.method) !== -1) A.headers.setContentType("application/x-www-form-urlencoded", !1);
  return P61.getAdapter(A.adapter || cx.adapter)(A).then(function Q(I) {
      return vM1(A), I.data = Tl.call(A, A.transformResponse, I), I.headers = w3.from(I.headers), I
  }

function Q(I) {
      if (!Pl(I)) {
          if (vM1(A), I && I.response) I.response.data = Tl.call(A, A.transformResponse, I.response), I.response.headers = w3.from(I.response.headers)
      }

function Q(I) {
      return typeof I === A || "a" + (B < 1 ? "n " : " ") + A
  }

function A(B, Q, I) {
  function G(Z, D) {
      return "[Axios v" + eP + "] Transitional option '" + Z + "'" + D + (I ? ". " + I : "")
  }

function A(B) {
  return (Q, I) => {
      return console.warn(`${I}

function hw9(A, B, Q) {
  if (typeof A !== "object") throw new F2("options must be an object", F2.ERR_BAD_OPTION_VALUE);
  let I = Object.keys(A),
      G = I.length;
  while (G-- > 0) {
      let Z = I[G],
          D = B[Z];
      if (D) {
          let Y = A[Z],
              W = Y === void 0 || D(Y, Z, A);
          if (W !== !0) throw new F2("option " + Z + " must be " + W, F2.ERR_BAD_OPTION_VALUE);
          continue
      }

function C(K) {
          if (typeof K.runWhen === "function" && K.runWhen(B) === !1) return;
          Y = Y && K.synchronous, D.unshift(K.fulfilled, K.rejected)
      }

function C(K) {
          W.push(K.fulfilled, K.rejected)
      }

function A(B) {
  gl.prototype[B] = function(Q, I) {
      return this.request(IC(I || {}

function A(B) {
  function Q(I) {
      return function G(Z, D, Y) {
          return this.request(IC(Y || {}

function I(G) {
          B = G
      }

function D() {
              Q.unsubscribe(G)
          }

function I(G, Z, D) {
          if (Q.reason) return;
          Q.reason = new GJ(G, Z, D), B(Q.reason)
      }

function Q(I) {
              A = I
          }

function gM1(A) {
  return function B(Q) {
      return A.apply(null, Q)
  }

function hM1(A) {
  return WA.isObject(A) && A.isAxiosError === !0
}

function qCA(A) {
  let B = new hl(A),
      Q = El(hl.prototype.request, B);
  return WA.extend(Q, hl.prototype, B, {
      allOwnKeys: !0
  }

function I(G) {
      return qCA(IC(A, G))
  }

function A(B) {
  return Promise.all(B)
}

function Cf() {
  return sl.join(S4(), "statsig")
}

function BB() {
  return process.env.USE_LOCAL_OAUTH === "1" && Z$9 || !1 || G$9
}

function MQ() {
  return process.env.CLAUDE_CODE_USE_BEDROCK ? "bedrock" : process.env.CLAUDE_CODE_USE_VERTEX ? "vertex" : "firstParty"
}

function Wz() {
  return MQ()
}

function TL1(A, {
  suffix: B = "nodejs"
} = {}) {
  if (typeof A !== "string") throw new TypeError(`Expected a string, got ${typeof A}

function R51(A, B = {}) {
  return new Xz(A, B).streamSync()
}

function WwA(A, B = {}) {
  return new Xz(A, B).stream()
}

function JwA(A, B = {}) {
  return new Xz(A, B).walkSync()
}

async function YwA(A, B = {}) {
  return new Xz(A, B).walk()
}

function O51(A, B = {}) {
  return new Xz(A, B).iterateSync()
}

function FwA(A, B = {}) {
  return new Xz(A, B).iterate()
}

function Ez() {
  return typeof global.Bun !== "undefined" && !!global.Bun ? .embeddedFiles && Array.isArray(global.Bun ? .embeddedFiles) && (global.Bun ? .embeddedFiles ? .length ? ? 0) > 0
}

function yu9(A, B, Q, I) {
  if (Ez()) return oOA(process.execPath, ["--ripgrep", ...A, B], {
      maxBuffer: 4000000,
      signal: Q,
      timeout: 1e4
  }

async function lU(A, B, Q) {
  if (!Ez()) await ku9();
  return new Promise((I) => {
      yu9(A, B, Q, (G, Z) => {
          if (G) {
              if (G.code !== 1) b1(G);
              I([])
          }

async function ATA(A, B, Q) {
  try {
      return (await lU(["-l", "."], A, B)).slice(0, Q)
  }

async function ku9() {
  if (process.platform !== "darwin" || tOA) return;
  if (tOA = !0, !(await u0("codesign", ["-vv", "-d", Zv()], {
          preserveOutputOnError: !1
      }

function x1() {
  return Qp9
}

function ki(A, B) {
  return A instanceof Error && A.message === B
}

function Q(G) {
      throw new Error
  }

function I(G, Z = " | ") {
      return G.map((D) => typeof D === "string" ? `'${D}

function gs9(A) {
  UfA = A
}

function L81() {
  return UfA
}

function X2(A, B) {
  let Q = L81(),
      I = R81({
          issueData: B,
          data: A.data,
          path: A.path,
          errorMaps: [A.common.contextualErrorMap, A.schemaErrorMap, Q, Q === zv ? void 0 : zv].filter((G) => !!G)
      }

function O81(A, B, Q, I) {
  if (Q === "a" && !I) throw new TypeError("Private accessor was defined without a getter");
  if (typeof B === "function" ? A !== B || !I : !B.has(A)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return Q === "m" ? I : Q === "a" ? I.call(A) : I ? I.value : B.get(A)
}

function NfA(A, B, Q, I, G) {
  if (I === "m") throw new TypeError("Private method is not writable");
  if (I === "a" && !G) throw new TypeError("Private accessor was defined without a setter");
  if (typeof B === "function" ? A !== B || !G : !B.has(A)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return I === "a" ? G.call(A, Q) : G ? G.value = Q : B.set(A, Q), Q
}

function u4(A) {
  if (!A) return {}

function qfA(A) {
  let B = "([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d";
  if (A.precision) B = `${B}

function Qr9(A) {
  return new RegExp(`^${qfA(A)}

function MfA(A) {
  let B = `${$fA}

function Ir9(A, B) {
  if ((B === "v4" || !B) && ss9.test(A)) return !0;
  if ((B === "v6" || !B) && os9.test(A)) return !0;
  return !1
}

function Gr9(A, B) {
  if (!ls9.test(A)) return !1;
  try {
      let [Q] = A.split("."), I = Q.replace(/-/g, "+").replace(/_/g, "/").padEnd(Q.length + (4 - Q.length % 4) % 4, "="), G = JSON.parse(atob(I));
      if (typeof G !== "object" || G === null) return !1;
      if (!G.typ || !G.alg) return !1;
      if (B && G.alg !== B) return !1;
      return !0
  }

function Zr9(A, B) {
  if ((B === "v4" || !B) && rs9.test(A)) return !0;
  if ((B === "v6" || !B) && ts9.test(A)) return !0;
  return !1
}

function Dr9(A, B) {
  let Q = (A.toString().split(".")[1] || "").length,
      I = (B.toString().split(".")[1] || "").length,
      G = Q > I ? Q : I,
      Z = parseInt(A.toFixed(G).replace(".", "")),
      D = parseInt(B.toFixed(G).replace(".", ""));
  return Z % D / Math.pow(10, G)
}

function Cv(A) {
  if (A instanceof U3) {
      let B = {}

function I(G) {
          for (let D of G)
              if (D.result.status === "valid") return D.result;
          for (let D of G)
              if (D.result.status === "dirty") return B.common.issues.push(...D.ctx.common.issues), D.result;
          let Z = G.map((D) => new WJ(D.ctx.common.issues));
          return X2(B, {
              code: $0.invalid_union,
              unionErrors: Z
          }

function IP1(A, B) {
  let Q = sU(A),
      I = sU(B);
  if (A === B) return {
      valid: !0,
      data: A
  }

function Z(Y) {
          let W = new Set;
          for (let J of Y) {
              if (J.status === "aborted") return W4;
              if (J.status === "dirty") B.dirty();
              W.add(J.value)
          }

function Q(D, Y) {
          return R81({
              data: D,
              path: B.path,
              errorMaps: [B.common.contextualErrorMap, B.schemaErrorMap, L81(), zv].filter((W) => !!W),
              issueData: {
                  code: $0.invalid_arguments,
                  argumentsError: Y
              }

function I(D, Y) {
          return R81({
              data: D,
              path: B.path,
              errorMaps: [B.common.contextualErrorMap, B.schemaErrorMap, L81(), zv].filter((W) => !!W),
              issueData: {
                  code: $0.invalid_return_type,
                  returnTypeError: Y
              }

function LfA(A, B) {
  return new iM({
      values: A,
      typeName: R0.ZodEnum,
      ...u4(B)
  }

function wfA(A, B) {
  let Q = typeof A === "function" ? A(B) : typeof A === "string" ? {
      message: A
  }

function RfA(A, B = {}, Q) {
  if (A) return wS.create().superRefine((I, G) => {
      var Z, D;
      let Y = A(I);
      if (Y instanceof Promise) return Y.then((W) => {
          var J, F;
          if (!W) {
              let X = wfA(B, I),
                  V = (F = (J = X.fatal) !== null && J !== void 0 ? J : Q) !== null && F !== void 0 ? F : !0;
              G.addIssue({
                  code: "custom",
                  ...X,
                  fatal: V
              }

function _fA(A) {
  switch (A) {
      case "bypassPermissions":
          return "bypassPermissions";
      case "acceptEdits":
          return "acceptEdits";
      case "plan":
          return "plan";
      case "default":
          return "default";
      default:
          return "default"
  }

function jfA(A) {
  switch (A) {
      case "default":
          return "Default";
      case "plan":
          return "Plan Mode";
      case "acceptEdits":
          return "Accept Edits";
      case "bypassPermissions":
          return "Bypass Permissions"
  }

function yfA(A) {
  switch (A) {
      case "default":
      case "plan":
      case "acceptEdits":
          return null;
      case "bypassPermissions":
          return "Bypassing Permissions"
  }

function er9(A, B) {
  if (!A || !A.permissions) return [];
  let {
      permissions: Q
  }

function Ao9(A, B) {
  if (!A.allowedTools || A.allowedTools.length < 1) return [];
  let Q = new Set;
  for (let G of B)
      if (G.ruleBehavior === "allow" && G.source === "localSettings") Q.add(m8(G.ruleValue));
  let I = new Set;
  for (let G of A.allowedTools)
      if (!Q.has(G)) I.add(G);
  return Array.from(I)
}

function Bo9(A, B) {
  if (!A.ignorePatterns || A.ignorePatterns.length < 1) return [];
  let Q = new Set;
  for (let G of B)
      if (G.ruleBehavior === "deny" && G.source === "localSettings" && G.ruleValue.toolName === TD && G.ruleValue.ruleContent !== void 0) Q.add(G.ruleValue.ruleContent);
  let I = new Set;
  for (let G of A.ignorePatterns)
      if (!Q.has(G)) I.add(G);
  return Array.from(I).map((G) => ({
      toolName: TD,
      ruleContent: G
  }

function hfA() {
  let A = m9();
  if (!A.allowedTools && !A.ignorePatterns) return;
  let B = { ...A
      }

function mfA() {
  let A = [],
      B = m9();
  for (let Q of B.allowedTools) A.push({
      source: "projectSettings",
      ruleBehavior: "allow",
      ruleValue: aM(Q)
  }

function GP1(A) {
  let B = KC(A);
  return er9(B, A)
}

function dfA(A) {
  let B = m8(A.ruleValue),
      Q = KC(A.source);
  if (!Q || !Q.permissions) return !1;
  let I = Q.permissions[A.ruleBehavior];
  if (!I || !I.includes(B)) return !1;
  try {
      let G = { ...Q,
          permissions: { ...Q.permissions,
              [A.ruleBehavior]: I.filter((Z) => Z !== B)
          }

function Qo9() {
  return {
      permissions: {
          allow: [],
          deny: []
      }

function _81({
  ruleValues: A,
  ruleBehavior: B
}, Q) {
  if (A.length < 1) return !0;
  let I = A.map(m8),
      G = KC(Q) || Qo9();
  try {
      let Z = G.permissions || {}

function j81(A) {
  return A.replace(/[^a-zA-Z0-9_-]/g, "_")
}

function pi(A, B) {
  let Q = `mcp__${B}

function y81(A, B) {
  let Q = `mcp__${B}

function ci(A, B) {
  let Q = `mcp__${B}

function li(A, B) {
  let Q = `mcp__${B}

function ii(A, B) {
  let Q = { ...A
  }

function ZP1(A) {
  let B = A.split("__"),
      [Q, I, ...G] = B;
  if (Q !== "mcp" || !I) return null;
  let Z = G.length > 0 ? G.join("__") : void 0;
  return {
      serverName: I,
      toolName: Z
  }

function k81(A, B) {
  let Q = `mcp__${j81(B)}

function pfA(A) {
  switch (A) {
      case "cliArg":
          return "CLI argument";
      case "command":
          return "command configuration";
      case "localSettings":
          return "project local settings";
      case "projectSettings":
          return "project settings";
      case "policySettings":
          return "policy settings";
      case "userSettings":
          return "user settings"
  }

function aM(A) {
  let B = A.match(/^([^(]+)\(([^)]+)\)$/);
  if (!B) return {
      toolName: A
  }

function m8(A) {
  return A.ruleContent ? `${A.toolName}

function x81(A) {
  return ufA.flatMap((B) => (A.alwaysAllowRules[B] || []).map((Q) => ({
      source: B,
      ruleBehavior: "allow",
      ruleValue: aM(Q)
  }

function Pv(A) {
  return ufA.flatMap((B) => (A.alwaysDenyRules[B] || []).map((Q) => ({
      source: B,
      ruleBehavior: "deny",
      ruleValue: aM(Q)
  }

function cfA(A, B) {
  if (B.ruleValue.ruleContent !== void 0) return !1;
  if (B.ruleValue.toolName === A.name) return !0;
  let Q = ZP1(B.ruleValue.toolName),
      I = ZP1(A.name);
  return Q !== null && I !== null && Q.toolName === void 0 && Q.serverName === I.serverName
}

function Io9(A, B) {
  return x81(A).find((Q) => cfA(B, Q)) || null
}

function Go9(A, B) {
  return Pv(A).find((Q) => cfA(B, Q)) || null
}

function Sv(A, B, Q) {
  return DP1(A, B.name, Q)
}

function DP1(A, B, Q) {
  let I = new Map,
      G = [];
  switch (Q) {
      case "allow":
          G = x81(A);
          break;
      case "deny":
          G = Pv(A);
          break
  }

function lfA(A) {
  switch (A) {
      case "allow":
          return "alwaysAllowRules";
      case "deny":
          return "alwaysDenyRules"
  }

async function f81(A) {
  return ni({ ...A,
      ruleValues: [A.rule.ruleValue],
      ruleBehavior: A.rule.ruleBehavior,
      destination: A.rule.source
  }

async function ni({
  ruleBehavior: A,
  destination: B,
  initialContext: Q,
  setToolPermissionContext: I,
  ruleValues: G
}) {
  let Z = new Set(G.map(m8)),
      D = lfA(A),
      Y = { ...Q,
          [D]: { ...Q[D],
              [B]: [...Q[D][B] || [], ...Z]
          }

async function ifA({
  rule: A,
  initialContext: B,
  setToolPermissionContext: Q
}) {
  if (A.source === "policySettings") throw new Error("Cannot delete permission rules from managed settings");
  let I = m8(A.ruleValue),
      G = lfA(A.ruleBehavior),
      Z = A.source,
      D = { ...B,
          [G]: { ...B[G],
              [A.source]: B[G][Z] ? .filter((Y) => Y !== I) || []
          }

function nfA(A, B) {
  let Q = { ...A.alwaysAllowRules
      }

function Wo9() {
  return nM.map((A) => h81(A))
}

function d3(A) {
  return Zo9(A) ? afA(A) : afA(dA(), A)
}

function WP1(A) {
  return new Set([e9(), ...A.additionalWorkingDirectories])
}

function eF(A, B) {
  return Array.from(WP1(B)).some((Q) => ai(A, Q))
}

function ai(A, B) {
  let Q = d3(A),
      I = d3(B);
  if (!Q.startsWith(I)) return !1;
  let G = Q[I.length];
  if (G === void 0 || G === Do9) return !0;
  return !1
}

function Jo9(A) {
  switch (A) {
      case "cliArg":
      case "command":
          return d3(e9());
      case "userSettings":
      case "policySettings":
      case "projectSettings":
      case "localSettings":
          return g81(A)
  }

function YP1(A) {
  return _v.join(tU, A)
}

function Fo9({
  patternRoot: A,
  pattern: B,
  rootPath: Q
}) {
  let I = _v.join(A, B);
  if (A === Q) return YP1(B);
  else if (I.startsWith(`${Q}

function b81(A, B) {
  let Q = new Set(A.get(null) ? ? []);
  for (let [I, G] of A.entries()) {
      if (I === null) continue;
      for (let Z of G) {
          let D = Fo9({
              patternRoot: I,
              pattern: Z,
              rootPath: B
          }

function jv(A) {
  let B = ofA(A, "read", "deny"),
      Q = new Map;
  for (let [G, Z] of B.entries()) Q.set(G, Array.from(Z.keys()));
  let I = m9().ignorePatterns;
  if (I && I.length > 0)
      for (let G of I) {
          let {
              relativePattern: Z,
              root: D
          }

function rfA(A, B) {
  if (A.startsWith(`${tU}

function ofA(A, B, Q) {
  let I = (() => {
          switch (B) {
              case "edit":
                  return oU;
              case "read":
                  return TD
          }

function v81(A, B, Q, I) {
  let G = d3(A),
      Z = ofA(B, Q, I);
  for (let [D, Y] of Z.entries()) {
      let W = sfA.default().add(Array.from(Y.keys())),
          J = _v.relative(D ? ? dA(), G);
      if (J.startsWith(`..${tU}

function qz(A, B, Q) {
  if (typeof A.getPath !== "function") return {
      behavior: "ask",
      message: `Autocoder requested permissions to use ${A.name}

async function GvA(A, B, {
  limit: Q,
  offset: I
}, G, Z) {
  let D = b81(jv(Z), B),
      W = (await L51([A], {
          cwd: B,
          nocase: !0,
          nodir: !0,
          signal: G,
          stat: !0,
          withFileTypes: !0,
          ignore: D
      }

function ZvA(A, B) {
  if (A === ".") return !0;
  if (A.startsWith("~")) return !1;
  if (A.includes("\x00") || B.includes("\x00")) return !1;
  let Q = tfA(efA(), B, A),
      I = tfA(efA(), B),
      G = XP1(I, Q);
  return !G.startsWith("..") && !si(G)
}

function DvA(A, B = 0, Q) {
  let Z = x1().readFileSync(A, {
          encoding: "utf8"
      }

function rM(A, B, Q, I) {
  let G = B;
  if (I === "CRLF") G = B.split(`
`).join(`\r
`);
  eM(A, G, {
      encoding: Q
  }

function UG(A) {
  try {
      let Q = x1(),
          {
              buffer: I,
              bytesRead: G
          }

function eU(A, B = "utf8") {
  try {
      let Q = x1(),
          {
              buffer: I,
              bytesRead: G
          }

function Vo9(A) {
  let B = 0,
      Q = 0;
  for (let I = 0; I < A.length; I++)
      if (A[I] === `
`)
          if (I > 0 && A[I - 1] === "\r") B++;
          else Q++;
  return B > Q ? "CRLF" : "LF"
}

function qS(A) {
  let B = si(A) ? A : u81(dA(), A),
      Q = x1(),
      I = String.fromCharCode(8239),
      G = /^(.+)([ \u202F])(AM|PM)(\.png)$/,
      Z = JP1(B).match(G);
  if (Z) {
      if (Q.existsSync(B)) return B;
      let D = Z[2],
          Y = D === " " ? I : " ",
          W = B.replace(`${D}

function kv(A) {
  return A.replace(/^\t+/gm, (B) => "  ".repeat(B.length))
}

function oM(A) {
  return A ? si(A) ? A : u81(dA(), A) : void 0
}

function VP1(A) {
  let B = oM(A),
      Q = B ? XP1(dA(), B) : void 0;
  return {
      absolutePath: B,
      relativePath: Q
  }

function p81(A) {
  let {
      relativePath: B
  }

function xv(A) {
  let B = x1();
  try {
      let Q = AvA(A),
          I = JP1(A, FP1(A));
      if (!B.existsSync(Q)) return;
      let D = B.readdirSync(Q).filter((Y) => JP1(Y.name, FP1(Y.name)) === I && yv(Q, Y.name) !== A)[0];
      if (D) return D.name;
      return
  }

function tM({
  content: A,
  startLine: B
}) {
  if (!A) return "";
  return A.split(/\r?\n/).map((I, G) => {
      let Z = G + B,
          D = String(Z);
      if (D.length >= 6) return `${D}

function WvA(A) {
  let B = x1();
  if (!B.existsSync(A)) return !0;
  return B.isDirEmptySync(A)
}

function wI(A) {
  let B = UG(A);
  return x1().readFileSync(A, {
      encoding: B
  }

function CP1(A) {
  let {
      content: B
  }

function eM(A, B, Q = {
  encoding: "utf-8"
}) {
  x1().writeFileSync(A, B, {
      encoding: Q.encoding,
      flush: !0
  }

function d81(A) {
  return A.replace(/[^a-zA-Z0-9]/g, "-")
}

function AL(A) {
  let B = A / 1024;
  if (B < 1) return `${A}

function c81(A, B) {
  if (A.startsWith("~/")) return yv(IvA(), A.substring(2));
  else if (si(A)) return A;
  else {
      let Q = A.startsWith("./") ? A : `./${A}

function oi(A, B = !1) {
  let Q = A.length,
      I = 0,
      G = "",
      Z = 0,
      D = 16,
      Y = 0,
      W = 0,
      J = 0,
      F = 0,
      X = 0;

  function V(R, T) {
      let L = 0,
          _ = 0;
      while (L < R || !T) {
          let k = A.charCodeAt(I);
          if (k >= 48 && k <= 57) _ = _ * 16 + k - 48;
          else if (k >= 65 && k <= 70) _ = _ * 16 + k - 65 + 10;
          else if (k >= 97 && k <= 102) _ = _ * 16 + k - 97 + 10;
          else break;
          I++, L++
      }

function C(R) {
      I = R, G = "", Z = 0, D = 16, X = 0
  }

function K() {
      let R = I;
      if (A.charCodeAt(I) === 48) I++;
      else {
          I++;
          while (I < A.length && vv(A.charCodeAt(I))) I++
      }

function E() {
      let R = "",
          T = I;
      while (!0) {
          if (I >= Q) {
              R += A.substring(T, I), X = 2;
              break
          }

function N() {
      if (G = "", X = 0, Z = I, W = Y, F = J, I >= Q) return Z = Q, D = 17;
      let R = A.charCodeAt(I);
      if (KP1(R)) {
          do I++, G += String.fromCharCode(R), R = A.charCodeAt(I); while (KP1(R));
          return D = 15
      }

function q(R) {
      if (KP1(R) || ri(R)) return !1;
      switch (R) {
          case 125:
          case 93:
          case 123:
          case 91:
          case 34:
          case 58:
          case 44:
          case 47:
              return !1
      }

function O() {
      let R;
      do R = N(); while (R >= 12 && R <= 15);
      return R
  }

function KP1(A) {
  return A === 32 || A === 9
}

function ri(A) {
  return A === 10 || A === 13
}

function vv(A) {
  return A >= 48 && A <= 57
}

function zP1(A, B, Q) {
  let I, G, Z, D, Y;
  if (B) {
      D = B.offset, Y = D + B.length, Z = D;
      while (Z > 0 && !ti(A, Z - 1)) Z--;
      let L = Y;
      while (L < A.length && !ti(A, L)) L++;
      G = A.substring(Z, L), I = Ko9(G, Q)
  }

function N() {
      if (F > 1) return bv(W, F) + bv(V, I + X);
      let L = V.length * (I + X);
      if (!J || L > HP1[C][W].length) return W + bv(V, I + X);
      if (L <= 0) return W;
      return HP1[C][W][L]
  }

function q() {
      let L = K.scan();
      F = 0;
      while (L === 15 || L === 14) {
          if (L === 14 && Q.keepLines) F += 1;
          else if (L === 14) F = 1;
          L = K.scan()
      }

function R(L, _, k) {
      if (!E && (!B || _ < Y && k > D) && A.substring(_, k) !== L) O.push({
          offset: _,
          length: k - _,
          content: L
      }

function bv(A, B) {
  let Q = "";
  for (let I = 0; I < B; I++) Q += A;
  return Q
}

function Ko9(A, B) {
  let Q = 0,
      I = 0,
      G = B.tabSize || 4;
  while (Q < A.length) {
      let Z = A.charAt(Q);
      if (Z === FJ[1]) I++;
      else if (Z === "\t") I += G;
      else break;
      Q++
  }

function Ho9(A, B) {
  for (let Q = 0; Q < B.length; Q++) {
      let I = B.charAt(Q);
      if (I === "\r") {
          if (Q + 1 < B.length && B.charAt(Q + 1) === `
`) return `\r
`;
          return "\r"
      }

function ti(A, B) {
  return `\r
`.indexOf(A.charAt(B)) !== -1
}

function XvA(A, B = [], Q = ei.DEFAULT) {
  let I = null,
      G = [],
      Z = [];

  function D(W) {
      if (Array.isArray(G)) G.push(W);
      else if (I !== null) G[I] = W
  }

function wP1(A, B = [], Q = ei.DEFAULT) {
  let I = {
      type: "array",
      offset: -1,
      length: -1,
      children: [],
      parent: void 0
  }

function G(W) {
      if (I.type === "property") I.length = W - I.offset, I = I.parent
  }

function Z(W) {
      return I.children.push(W), W
  }

function l81(A, B) {
  if (!A) return;
  let Q = A;
  for (let I of B)
      if (typeof I === "string") {
          if (Q.type !== "object" || !Array.isArray(Q.children)) return;
          let G = !1;
          for (let Z of Q.children)
              if (Array.isArray(Z.children) && Z.children[0].value === I && Z.children.length === 2) {
                  Q = Z.children[1], G = !0;
                  break
              }

function EP1(A, B, Q = ei.DEFAULT) {
  let I = oi(A, !1),
      G = [];

  function Z(F1) {
      return F1 ? () => F1(I.getTokenOffset(), I.getTokenLength(), I.getTokenStartLine(), I.getTokenStartCharacter()) : () => !0
  }

function D(F1) {
      return F1 ? () => F1(I.getTokenOffset(), I.getTokenLength(), I.getTokenStartLine(), I.getTokenStartCharacter(), () => G.slice()) : () => !0
  }

function Y(F1) {
      return F1 ? (X1) => F1(X1, I.getTokenOffset(), I.getTokenLength(), I.getTokenStartLine(), I.getTokenStartCharacter()) : () => !0
  }

function W(F1) {
      return F1 ? (X1) => F1(X1, I.getTokenOffset(), I.getTokenLength(), I.getTokenStartLine(), I.getTokenStartCharacter(), () => G.slice()) : () => !0
  }

function T() {
      while (!0) {
          let F1 = I.scan();
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

function L(F1, X1 = [], v = []) {
      if (q(F1), X1.length + v.length > 0) {
          let D1 = I.getToken();
          while (D1 !== 17) {
              if (X1.indexOf(D1) !== -1) {
                  T();
                  break
              }

function _(F1) {
      let X1 = I.getTokenValue();
      if (F1) K(X1);
      else F(X1), G.push(X1);
      return T(), !0
  }

function k() {
      switch (I.getToken()) {
          case 11:
              let F1 = I.getTokenValue(),
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

function i() {
      if (I.getToken() !== 10) return L(3, [], [2, 5]), !1;
      if (_(!1), I.getToken() === 6) {
          if (E(":"), T(), !d()) L(4, [], [2, 5])
      }

function x() {
      J(), T();
      let F1 = !1;
      while (I.getToken() !== 2 && I.getToken() !== 17) {
          if (I.getToken() === 5) {
              if (!F1) L(4, [], []);
              if (E(","), T(), I.getToken() === 2 && R) break
          }

function s() {
      V(), T();
      let F1 = !0,
          X1 = !1;
      while (I.getToken() !== 4 && I.getToken() !== 17) {
          if (I.getToken() === 5) {
              if (!X1) L(4, [], []);
              if (E(","), T(), I.getToken() === 4 && R) break
          }

function d() {
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

function wo9(A) {
  switch (typeof A) {
      case "boolean":
          return "boolean";
      case "number":
          return "number";
      case "string":
          return "string";
      case "object":
          {
              if (!A) return "null";
              else if (Array.isArray(A)) return "array";
              return "object"
          }

function VvA(A, B, Q, I) {
  let G = B.slice(),
      D = wP1(A, []),
      Y = void 0,
      W = void 0;
  while (G.length > 0)
      if (W = G.pop(), Y = l81(D, G), Y === void 0 && Q !== void 0)
          if (typeof W === "string") Q = {
              [W]: Q
          }

function MS(A, B, Q) {
  if (!Q.formattingOptions) return [B];
  let I = i81(A, B),
      G = B.offset,
      Z = B.offset + B.content.length;
  if (B.length === 0 || B.content.length === 0) {
      while (G > 0 && !ti(I, G - 1)) G--;
      while (Z < I.length && !ti(I, Z)) Z++
  }

function i81(A, B) {
  return A.substring(0, B.offset) + B.content + A.substring(B.offset + B.length)
}

function zvA(A, B, Q, I) {
  return VvA(A, B, Q, I)
}

function wvA(A, B) {
  let Q = B.slice(0).sort((G, Z) => {
          let D = G.offset - Z.offset;
          if (D === 0) return G.length - Z.length;
          return D
      }

function EvA(A) {
  if (!A) return null;
  try {
      return UP1(A)
  }

async function n81(A) {
  try {
      let B = await No9(A, "utf8");
      if (!B.trim()) return [];
      return B.split(`
`).filter((Q) => Q.trim()).map((Q) => {
          try {
              return JSON.parse(Q)
          }

function UvA(A, B) {
  try {
      if (!A || A.trim() === "") return JSON.stringify([B], null, 4);
      let Q = UP1(A);
      if (Array.isArray(Q)) {
          let I = Q.length,
              D = zvA(A, I === 0 ? [0] : [I], B, {
                  formattingOptions: {
                      insertSpaces: !0,
                      tabSize: 4
                  }

function Mo9() {
  let A = new Map;
  for (let [B, Q] of Object.entries(lB)) {
      for (let [I, G] of Object.entries(Q)) lB[I] = {
          open: `\x1B[${G[0]}

function AX(A, B = globalThis.Deno ? globalThis.Deno.args : NP1.argv) {
  let Q = A.startsWith("-") ? "" : A.length === 1 ? "-" : "--",
      I = B.indexOf(Q + A),
      G = B.indexOf("--");
  return I !== -1 && (G === -1 || I < G)
}

function Oo9() {
  if ("FORCE_COLOR" in u3) {
      if (u3.FORCE_COLOR === "true") return 1;
      if (u3.FORCE_COLOR === "false") return 0;
      return u3.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(u3.FORCE_COLOR, 10), 3)
  }

function To9(A) {
  if (A === 0) return !1;
  return {
      level: A,
      hasBasic: !0,
      has256: A >= 2,
      has16m: A >= 3
  }

function Po9(A, {
  streamIsTTY: B,
  sniffFlags: Q = !0
} = {}) {
  let I = Oo9();
  if (I !== void 0) a81 = I;
  let G = Q ? a81 : I;
  if (G === 0) return 0;
  if (Q) {
      if (AX("color=16m") || AX("color=full") || AX("color=truecolor")) return 3;
      if (AX("color=256")) return 2
  }

function LvA(A, B = {}) {
  let Q = Po9(A, {
      streamIsTTY: A && A.isTTY,
      ...B
  }

function OvA(A, B, Q) {
  let I = A.indexOf(B);
  if (I === -1) return A;
  let G = B.length,
      Z = 0,
      D = "";
  do D += A.slice(Z, I) + B + Q, Z = I + G, I = A.indexOf(B, Z); while (I !== -1);
  return D += A.slice(Z), D
}

function TvA(A, B, Q, I) {
  let G = 0,
      Z = "";
  do {
      let D = A[I - 1] === "\r";
      Z += A.slice(G, D ? I - 1 : I) + B + (D ? `\r
` : `
`) + Q, G = I + 1, I = A.indexOf(`
`, G)
  }

function Bn(A) {
  return jo9(A)
}

function jvA(A, B, {
  signal: Q,
  edges: I
} = {}) {
  let G = void 0,
      Z = null,
      D = I != null && I.includes("leading"),
      Y = I == null || I.includes("trailing"),
      W = () => {
          if (Z !== null) A.apply(G, Z), G = void 0, Z = null
      }

function yvA(A, B = 0, Q = {}) {
  if (typeof Q !== "object") Q = {}

function r81(A, B = 0, Q = {}) {
  if (typeof Q !== "object") Q = {}

function TP1(A, {
  include: B,
  exclude: Q
} = {}) {
  let I = (G) => {
      let Z = (D) => typeof D === "string" ? G === D : D.test(G);
      if (B) return B.some(Z);
      if (Q) return !Q.some(Z);
      return !0
  }

function B(G, Z, D) {
      let Y = G[Z];
      G[Z] = function(...W) {
          return D.call(this, Y, ...W)
      }

function Q(G) {
      return A.MeasureCallback.implement({
          measure: (...Z) => {
              let {
                  width: D,
                  height: Y
              }

function I(G) {
      return A.DirtiedCallback.implement({
          dirtied: G
      }

function C(S1, T1, VA) {
          VA = T1 + VA;
          for (var OA = ""; !(T1 >= VA);) {
              var KA = S1[T1++];
              if (!KA) break;
              if (128 & KA) {
                  var PA = 63 & S1[T1++];
                  if ((224 & KA) == 192) OA += String.fromCharCode((31 & KA) << 6 | PA);
                  else {
                      var D0 = 63 & S1[T1++];
                      65536 > (KA = (240 & KA) == 224 ? (15 & KA) << 12 | PA << 6 | D0 : (7 & KA) << 18 | PA << 12 | D0 << 6 | 63 & S1[T1++]) ? OA += String.fromCharCode(KA) : (KA -= 65536, OA += String.fromCharCode(55296 | KA >> 10, 56320 | 1023 & KA))
                  }

function K() {
          var S1 = X.buffer;
          W.HEAP8 = E = new Int8Array(S1), W.HEAP16 = q = new Int16Array(S1), W.HEAP32 = R = new Int32Array(S1), W.HEAPU8 = N = new Uint8Array(S1), W.HEAPU16 = O = new Uint16Array(S1), W.HEAPU32 = T = new Uint32Array(S1), W.HEAPF32 = L = new Float32Array(S1), W.HEAPF64 = _ = new Float64Array(S1)
      }

function X1(S1) {
          throw Y(S1 = "Aborted(" + S1 + ")"), V = !0, F(S1 = new WebAssembly.RuntimeError(S1 + ". Build with -sASSERTIONS for more info.")), S1
      }

function v() {
          return Q.startsWith("data:application/octet-stream;base64,")
      }

function D1() {
          try {
              throw "both async and sync fetching of the wasm failed"
          }

function N1(S1) {
          for (; 0 < S1.length;) S1.shift()(W)
      }

function u1(S1) {
          if (S1 === void 0) return "_unknown";
          var T1 = (S1 = S1.replace(/[^a-zA-Z0-9_]/g, "$")).charCodeAt(0);
          return 48 <= T1 && 57 >= T1 ? "_" + S1 : S1
      }

function d1(S1, T1) {
          return S1 = u1(S1),
              function() {
                  return T1.apply(this, arguments)
              }

function e1(S1) {
          var T1 = Error,
              VA = d1(S1, function(OA) {
                  this.name = S1, this.message = OA, (OA = Error(OA).stack) !== void 0 && (this.stack = this.toString() + `
` + OA.replace(/^Error(:[^\n]*)?\n/, ""))
              }

function Q1(S1) {
          throw new k1(S1)
      }

function MA(S1) {
          for (var T1 = ""; N[S1];) T1 += HA[N[S1++]];
          return T1
      }

function B1() {
          for (; t.length;) {
              var S1 = t.pop();
              S1.L.Z = !1, S1.delete()
          }

function P1(S1, T1) {
          for (T1 === void 0 && Q1("ptr should not be undefined"); S1.P;) T1 = S1.aa(T1), S1 = S1.P;
          return T1
      }

function y1(S1) {
          var T1 = MA(S1 = cQ(S1));
          return zB(S1), T1
      }

function O1(S1, T1) {
          var VA = e[S1];
          return VA === void 0 && Q1(T1 + " has unknown type " + y1(S1)), VA
      }

function QA(S1) {
          --S1.count.value, S1.count.value === 0 && (S1.S ? S1.T.V(S1.S) : S1.O.M.V(S1.N))
      }

function fA(S1) {
          throw new Y0(S1)
      }

function H0(S1, T1) {
          return T1.O && T1.N || fA("makeClassHandle requires ptr and ptrType"), !!T1.T != !!T1.S && fA("Both smartPtrType and smartPtr must be specified"), T1.count = {
              value: 1
          }

function k2(S1) {
          return typeof FinalizationRegistry == "undefined" ? (k2 = (T1) => T1, S1) : (o1 = new FinalizationRegistry((T1) => {
              QA(T1.L)
          }

function q2(S1) {
          for (; S1.length;) {
              var T1 = S1.pop();
              S1.pop()(T1)
          }

function h2(S1) {
          return this.fromWireType(R[S1 >> 2])
      }

function E0(S1, T1, VA) {
          function OA(lA) {
              (lA = VA(lA)).length !== S1.length && fA("Mismatched type converter count");
              for (var NA = 0; NA < S1.length; ++NA) y0(S1[NA], lA[NA])
          }

function g0(S1) {
          switch (S1) {
              case 1:
                  return 0;
              case 2:
                  return 1;
              case 4:
                  return 2;
              case 8:
                  return 3;
              default:
                  throw TypeError("Unknown type size: " + S1)
          }

function y0(S1, T1, VA = {}) {
          if (!("argPackAdvance" in T1)) throw TypeError("registerType registeredInstance requires argPackAdvance");
          var OA = T1.name;
          if (S1 || Q1('type "' + OA + '" must have a positive integer typeid pointer'), e.hasOwnProperty(S1)) {
              if (VA.ta) return;
              Q1("Cannot register type '" + OA + "' twice")
          }

function T0(S1) {
          Q1(S1.L.O.M.name + " instance already deleted")
      }

function N2(S1, T1, VA) {
          if (S1[T1].R === void 0) {
              var OA = S1[T1];
              S1[T1] = function() {
                  return S1[T1].R.hasOwnProperty(arguments.length) || Q1("Function '" + VA + "' called with an invalid number of arguments (" + arguments.length + ") - expects one of (" + S1[T1].R + ")!"), S1[T1].R[arguments.length].apply(this, arguments)
              }

function h9(S1, T1, VA, OA, KA, PA, D0, lA) {
          this.name = S1, this.constructor = T1, this.W = VA, this.V = OA, this.P = KA, this.oa = PA, this.aa = D0, this.ma = lA, this.ia = []
      }

function z5(S1, T1, VA) {
          for (; T1 !== VA;) T1.aa || Q1("Expected null or instance of " + VA.name + ", got an instance of " + T1.name), S1 = T1.aa(S1), T1 = T1.P;
          return S1
      }

function W3(S1, T1) {
          return T1 === null ? (this.da && Q1("null is not a valid " + this.name), 0) : (T1.L || Q1('Cannot pass "' + F3(T1) + '" as a ' + this.name), T1.L.N || Q1("Cannot pass deleted object as a pointer of type " + this.name), z5(T1.L.N, T1.L.O.M, this.M))
      }

function Z6(S1, T1) {
          if (T1 === null) {
              if (this.da && Q1("null is not a valid " + this.name), this.ca) {
                  var VA = this.ea();
                  return S1 !== null && S1.push(this.V, VA), VA
              }

function r2(S1, T1) {
          return T1 === null ? (this.da && Q1("null is not a valid " + this.name), 0) : (T1.L || Q1('Cannot pass "' + F3(T1) + '" as a ' + this.name), T1.L.N || Q1("Cannot pass deleted object as a pointer of type " + this.name), T1.L.O.ba && Q1("Cannot convert argument of type " + T1.L.O.name + " to parameter type " + this.name), z5(T1.L.N, T1.L.O.M, this.M))
      }

function v6(S1, T1, VA, OA) {
          this.name = S1, this.M = T1, this.da = VA, this.ba = OA, this.ca = !1, this.V = this.wa = this.ea = this.ja = this.Aa = this.va = void 0, T1.P !== void 0 ? this.toWireType = Z6 : (this.toWireType = OA ? W3 : r2, this.U = null)
      }

function uQ(S1) {
          var T1 = J3[S1];
          return T1 || (S1 >= J3.length && (J3.length = S1 + 1), J3[S1] = T1 = k.get(S1)), T1
      }

function x0(S1, T1) {
          var VA, OA, KA = (S1 = MA(S1)).includes("j") ? (VA = S1, OA = [], function() {
              if (OA.length = 0, Object.assign(OA, arguments), VA.includes("j")) {
                  var PA = W["dynCall_" + VA];
                  PA = OA && OA.length ? PA.apply(null, [T1].concat(OA)) : PA.call(null, T1)
              }

function L9(S1, T1) {
          var VA = [],
              OA = {}

function KA(PA) {
              OA[PA] || e[PA] || (w6[PA] ? w6[PA].forEach(KA) : (VA.push(PA), OA[PA] = !0))
          }

function w5(S1, T1, VA, OA, KA) {
          var PA = T1.length;
          2 > PA && Q1("argTypes array size mismatch! Must at least get return value and 'this' types!");
          var D0 = T1[1] !== null && VA !== null,
              lA = !1;
          for (VA = 1; VA < T1.length; ++VA)
              if (T1[VA] !== null && T1[VA].U === void 0) {
                  lA = !0;
                  break
              }

function _B(S1, T1) {
          for (var VA = [], OA = 0; OA < S1; OA++) VA.push(T[T1 + 4 * OA >> 2]);
          return VA
      }

function D6(S1) {
          4 < S1 && --YA[S1].fa == 0 && (YA[S1] = void 0, bA.push(S1))
      }

function F3(S1) {
          if (S1 === null) return "null";
          var T1 = typeof S1;
          return T1 === "object" || T1 === "array" || T1 === "function" ? S1.toString() : "" + S1
      }

function X3(S1, T1) {
          for (var VA = "", OA = 0; !(OA >= T1 / 2); ++OA) {
              var KA = q[S1 + 2 * OA >> 1];
              if (KA == 0) break;
              VA += String.fromCharCode(KA)
          }

function q7(S1, T1, VA) {
          if (VA === void 0 && (VA = 2147483647), 2 > VA) return 0;
          VA -= 2;
          var OA = T1;
          VA = VA < 2 * S1.length ? VA / 2 : S1.length;
          for (var KA = 0; KA < VA; ++KA) q[T1 >> 1] = S1.charCodeAt(KA), T1 += 2;
          return q[T1 >> 1] = 0, T1 - OA
      }

function V3(S1) {
          return 2 * S1.length
      }

function H2(S1, T1) {
          for (var VA = 0, OA = ""; !(VA >= T1 / 4);) {
              var KA = R[S1 + 4 * VA >> 2];
              if (KA == 0) break;
              ++VA, 65536 <= KA ? (KA -= 65536, OA += String.fromCharCode(55296 | KA >> 10, 56320 | 1023 & KA)) : OA += String.fromCharCode(KA)
          }

function w9(S1, T1, VA) {
          if (VA === void 0 && (VA = 2147483647), 4 > VA) return 0;
          var OA = T1;
          VA = OA + VA - 4;
          for (var KA = 0; KA < S1.length; ++KA) {
              var PA = S1.charCodeAt(KA);
              if (55296 <= PA && 57343 >= PA && (PA = 65536 + ((1023 & PA) << 10) | 1023 & S1.charCodeAt(++KA)), R[T1 >> 2] = PA, (T1 += 4) + 4 > VA) break
          }

function j5(S1) {
          for (var T1 = 0, VA = 0; VA < S1.length; ++VA) {
              var OA = S1.charCodeAt(VA);
              55296 <= OA && 57343 >= OA && ++VA, T1 += 4
          }

function y3(S1) {
          var T1 = j8[S1];
          return T1 === void 0 ? MA(S1) : T1
      }

function T1() {
              return this.ca ? H0(this.M.W, {
                  O: this.va,
                  N: OA,
                  T: this,
                  S: S1
              }

function D0(lA, NA, SA) {
              return NA === SA ? lA : SA.P === void 0 ? null : (lA = D0(lA, NA, SA.P)) === null ? null : SA.ma(lA)
          }

function SA() {
                      L9("Cannot call " + uA + " due to unbound types", lA)
                  }

function uA() {
                      L9("Cannot call " + W2 + " due to unbound types", NA)
                  }

function OA(PA) {
                  PA >>= 2;
                  var D0 = T;
                  return new KA(D0.buffer, D0[PA + 1], D0[PA])
              }

function S1(KA) {
              W.asm = KA.exports, X = W.asm.D, K(), k = W.asm.I, x.unshift(W.asm.E), --d == 0 && F1 && (KA = F1, F1 = null, KA())
          }

function T1(KA) {
              S1(KA.instance)
          }

function VA(KA) {
              return (typeof fetch == "function" ? fetch(Q, {
                  credentials: "same-origin"
              }

function rG() {
          return (rG = W.asm.H).apply(null, arguments)
      }

function zB() {
          return (zB = W.asm.J).apply(null, arguments)
      }

function e7() {
          0 < d || (N1(i), 0 < d || I || (I = !0, W.calledRun = !0, V || (N1(x), J(W), N1(s))))
      }

function S1() {
          I || e7(), I || (F1 = S1)
      }

async function kbA(A) {
  let B = await xt9({
      instantiateWasm(Q, I) {
          WebAssembly.instantiate(A, Q).then((G) => {
              G instanceof WebAssembly.Instance ? I(G) : I(G.instance)
          }

function lP1({
  onlyFirst: A = !1
} = {}) {
  let Q = ["[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?(?:\\u0007|\\u001B\\u005C|\\u009C))", "(?:(?:\\d{1,4}

function UZ(A) {
  if (typeof A !== "string") throw new TypeError(`Expected a \`string\`, got \`${typeof A}

function xbA(A) {
  return A === 161 || A === 164 || A === 167 || A === 168 || A === 170 || A === 173 || A === 174 || A >= 176 && A <= 180 || A >= 182 && A <= 186 || A >= 188 && A <= 191 || A === 198 || A === 208 || A === 215 || A === 216 || A >= 222 && A <= 225 || A === 230 || A >= 232 && A <= 234 || A === 236 || A === 237 || A === 240 || A === 242 || A === 243 || A >= 247 && A <= 250 || A === 252 || A === 254 || A === 257 || A === 273 || A === 275 || A === 283 || A === 294 || A === 295 || A === 299 || A >= 305 && A <= 307 || A === 312 || A >= 319 && A <= 322 || A === 324 || A >= 328 && A <= 331 || A === 333 || A === 338 || A === 339 || A === 358 || A === 359 || A === 363 || A === 462 || A === 464 || A === 466 || A === 468 || A === 470 || A === 472 || A === 474 || A === 476 || A === 593 || A === 609 || A === 708 || A === 711 || A >= 713 && A <= 715 || A === 717 || A === 720 || A >= 728 && A <= 731 || A === 733 || A === 735 || A >= 768 && A <= 879 || A >= 913 && A <= 929 || A >= 931 && A <= 937 || A >= 945 && A <= 961 || A >= 963 && A <= 969 || A === 1025 || A >= 1040 && A <= 1103 || A === 1105 || A === 8208 || A >= 8211 && A <= 8214 || A === 8216 || A === 8217 || A === 8220 || A === 8221 || A >= 8224 && A <= 8226 || A >= 8228 && A <= 8231 || A === 8240 || A === 8242 || A === 8243 || A === 8245 || A === 8251 || A === 8254 || A === 8308 || A === 8319 || A >= 8321 && A <= 8324 || A === 8364 || A === 8451 || A === 8453 || A === 8457 || A === 8467 || A === 8470 || A === 8481 || A === 8482 || A === 8486 || A === 8491 || A === 8531 || A === 8532 || A >= 8539 && A <= 8542 || A >= 8544 && A <= 8555 || A >= 8560 && A <= 8569 || A === 8585 || A >= 8592 && A <= 8601 || A === 8632 || A === 8633 || A === 8658 || A === 8660 || A === 8679 || A === 8704 || A === 8706 || A === 8707 || A === 8711 || A === 8712 || A === 8715 || A === 8719 || A === 8721 || A === 8725 || A === 8730 || A >= 8733 && A <= 8736 || A === 8739 || A === 8741 || A >= 8743 && A <= 8748 || A === 8750 || A >= 8756 && A <= 8759 || A === 8764 || A === 8765 || A === 8776 || A === 8780 || A === 8786 || A === 8800 || A === 8801 || A >= 8804 && A <= 8807 || A === 8810 || A === 8811 || A === 8814 || A === 8815 || A === 8834 || A === 8835 || A === 8838 || A === 8839 || A === 8853 || A === 8857 || A === 8869 || A === 8895 || A === 8978 || A >= 9312 && A <= 9449 || A >= 9451 && A <= 9547 || A >= 9552 && A <= 9587 || A >= 9600 && A <= 9615 || A >= 9618 && A <= 9621 || A === 9632 || A === 9633 || A >= 9635 && A <= 9641 || A === 9650 || A === 9651 || A === 9654 || A === 9655 || A === 9660 || A === 9661 || A === 9664 || A === 9665 || A >= 9670 && A <= 9672 || A === 9675 || A >= 9678 && A <= 9681 || A >= 9698 && A <= 9701 || A === 9711 || A === 9733 || A === 9734 || A === 9737 || A === 9742 || A === 9743 || A === 9756 || A === 9758 || A === 9792 || A === 9794 || A === 9824 || A === 9825 || A >= 9827 && A <= 9829 || A >= 9831 && A <= 9834 || A === 9836 || A === 9837 || A === 9839 || A === 9886 || A === 9887 || A === 9919 || A >= 9926 && A <= 9933 || A >= 9935 && A <= 9939 || A >= 9941 && A <= 9953 || A === 9955 || A === 9960 || A === 9961 || A >= 9963 && A <= 9969 || A === 9972 || A >= 9974 && A <= 9977 || A === 9979 || A === 9980 || A === 9982 || A === 9983 || A === 10045 || A >= 10102 && A <= 10111 || A >= 11094 && A <= 11097 || A >= 12872 && A <= 12879 || A >= 57344 && A <= 63743 || A >= 65024 && A <= 65039 || A === 65533 || A >= 127232 && A <= 127242 || A >= 127248 && A <= 127277 || A >= 127280 && A <= 127337 || A >= 127344 && A <= 127373 || A === 127375 || A === 127376 || A >= 127387 && A <= 127404 || A >= 917760 && A <= 917999 || A >= 983040 && A <= 1048573 || A >= 1048576 && A <= 1114109
}

function fbA(A) {
  return A === 12288 || A >= 65281 && A <= 65376 || A >= 65504 && A <= 65510
}

function vbA(A) {
  return A >= 4352 && A <= 4447 || A === 8986 || A === 8987 || A === 9001 || A === 9002 || A >= 9193 && A <= 9196 || A === 9200 || A === 9203 || A === 9725 || A === 9726 || A === 9748 || A === 9749 || A >= 9776 && A <= 9783 || A >= 9800 && A <= 9811 || A === 9855 || A >= 9866 && A <= 9871 || A === 9875 || A === 9889 || A === 9898 || A === 9899 || A === 9917 || A === 9918 || A === 9924 || A === 9925 || A === 9934 || A === 9940 || A === 9962 || A === 9970 || A === 9971 || A === 9973 || A === 9978 || A === 9981 || A === 9989 || A === 9994 || A === 9995 || A === 10024 || A === 10060 || A === 10062 || A >= 10067 && A <= 10069 || A === 10071 || A >= 10133 && A <= 10135 || A === 10160 || A === 10175 || A === 11035 || A === 11036 || A === 11088 || A === 11093 || A >= 11904 && A <= 11929 || A >= 11931 && A <= 12019 || A >= 12032 && A <= 12245 || A >= 12272 && A <= 12287 || A >= 12289 && A <= 12350 || A >= 12353 && A <= 12438 || A >= 12441 && A <= 12543 || A >= 12549 && A <= 12591 || A >= 12593 && A <= 12686 || A >= 12688 && A <= 12773 || A >= 12783 && A <= 12830 || A >= 12832 && A <= 12871 || A >= 12880 && A <= 42124 || A >= 42128 && A <= 42182 || A >= 43360 && A <= 43388 || A >= 44032 && A <= 55203 || A >= 63744 && A <= 64255 || A >= 65040 && A <= 65049 || A >= 65072 && A <= 65106 || A >= 65108 && A <= 65126 || A >= 65128 && A <= 65131 || A >= 94176 && A <= 94180 || A === 94192 || A === 94193 || A >= 94208 && A <= 100343 || A >= 100352 && A <= 101589 || A >= 101631 && A <= 101640 || A >= 110576 && A <= 110579 || A >= 110581 && A <= 110587 || A === 110589 || A === 110590 || A >= 110592 && A <= 110882 || A === 110898 || A >= 110928 && A <= 110930 || A === 110933 || A >= 110948 && A <= 110951 || A >= 110960 && A <= 111355 || A >= 119552 && A <= 119638 || A >= 119648 && A <= 119670 || A === 126980 || A === 127183 || A === 127374 || A >= 127377 && A <= 127386 || A >= 127488 && A <= 127490 || A >= 127504 && A <= 127547 || A >= 127552 && A <= 127560 || A === 127568 || A === 127569 || A >= 127584 && A <= 127589 || A >= 127744 && A <= 127776 || A >= 127789 && A <= 127797 || A >= 127799 && A <= 127868 || A >= 127870 && A <= 127891 || A >= 127904 && A <= 127946 || A >= 127951 && A <= 127955 || A >= 127968 && A <= 127984 || A === 127988 || A >= 127992 && A <= 128062 || A === 128064 || A >= 128066 && A <= 128252 || A >= 128255 && A <= 128317 || A >= 128331 && A <= 128334 || A >= 128336 && A <= 128359 || A === 128378 || A === 128405 || A === 128406 || A === 128420 || A >= 128507 && A <= 128591 || A >= 128640 && A <= 128709 || A === 128716 || A >= 128720 && A <= 128722 || A >= 128725 && A <= 128727 || A >= 128732 && A <= 128735 || A === 128747 || A === 128748 || A >= 128756 && A <= 128764 || A >= 128992 && A <= 129003 || A === 129008 || A >= 129292 && A <= 129338 || A >= 129340 && A <= 129349 || A >= 129351 && A <= 129535 || A >= 129648 && A <= 129660 || A >= 129664 && A <= 129673 || A >= 129679 && A <= 129734 || A >= 129742 && A <= 129756 || A >= 129759 && A <= 129769 || A >= 129776 && A <= 129784 || A >= 131072 && A <= 196605 || A >= 196608 && A <= 262141
}

function gt9(A) {
  if (!Number.isSafeInteger(A)) throw new TypeError(`Expected a code point, got \`${typeof A}

function DL(A, {
  ambiguousAsWide: B = !1
} = {}) {
  if (gt9(A), fbA(A) || vbA(A) || B && xbA(A)) return 2;
  return 1
}

function Kn(A, B = {}) {
  if (typeof A !== "string" || A.length === 0) return 0;
  let {
      ambiguousIsNarrow: Q = !0,
      countAnsiEscapeCodes: I = !1
  }

function pv(A) {
  let B = 0;
  for (let Q of A.split(`
`)) B = Math.max(B, Kn(Q));
  return B
}

function OS(A, B = {}) {
  if (typeof A !== "string" || A.length === 0) return 0;
  let {
      ambiguousIsNarrow: Q = !0,
      countAnsiEscapeCodes: I = !1
  }

function it9() {
  let A = new Map;
  for (let [B, Q] of Object.entries(iB)) {
      for (let [I, G] of Object.entries(Q)) iB[I] = {
          open: `\x1B[${G[0]}

function Hn(A, B, Q) {
  return String(A).normalize().replaceAll(`\r
`, `
`).split(`
`).map((I) => tt9(I, B, Q)).join(`
`)
}

function zn(A) {
  if (!Number.isInteger(A)) return !1;
  return A >= 4352 && (A <= 4447 || A === 9001 || A === 9002 || 11904 <= A && A <= 12871 && A !== 12351 || 12880 <= A && A <= 19903 || 19968 <= A && A <= 42182 || 43360 <= A && A <= 43388 || 44032 <= A && A <= 55203 || 63744 <= A && A <= 64255 || 65040 <= A && A <= 65049 || 65072 <= A && A <= 65131 || 65281 <= A && A <= 65376 || 65504 <= A && A <= 65510 || 110592 <= A && A <= 110593 || 127488 <= A && A <= 127569 || 131072 <= A && A <= 262141)
}

function Tz(A, B, Q) {
  let I = [...A],
      G = [],
      Z = typeof Q === "number" ? Q : I.length,
      D = !1,
      Y, W = 0,
      J = "";
  for (let [F, X] of I.entries()) {
      let V = !1;
      if (tbA.includes(X)) {
          let C = /\d[^m]*/.exec(A.slice(F, F + 18));
          if (Y = C && C.length > 0 ? C[0] : void 0, W < Z) {
              if (D = !0, Y !== void 0) G.push(Y)
          }

function cv(A, B = {}) {
  if (typeof A !== "string" || A.length === 0) return 0;
  let {
      ambiguousIsNarrow: Q = !0,
      countAnsiEscapeCodes: I = !1
  }

function kB1(A, B, Q) {
  if (A.charAt(B) === " ") return B;
  let I = Q ? 1 : -1;
  for (let G = 0; G <= 3; G++) {
      let Z = B + G * I;
      if (A.charAt(Z) === " ") return Z
  }

function sP1(A, B, Q = {}) {
  let {
      position: I = "end",
      space: G = !1,
      preferTruncationOnSpace: Z = !1
  }

function HS1(A, B = 1, Q = {}) {
  let {
      indent: I = " ",
      includeEmptyLines: G = !1
  }

function UhA(A) {
  switch (A) {
      case "light":
          return g14;
      case "light-ansi":
          return h14;
      case "dark-ansi":
          return m14;
      case "light-daltonized":
          return d14;
      case "dark-daltonized":
          return p14;
      default:
          return u14
  }

function V9(A, B, Q = "foreground") {
  return (I) => i14(I, A ? UhA(B)[A] : void 0, Q)
}

function ES1(A) {
  if (!Number.isInteger(A)) return !1;
  return DL(A) === 2
}

function t14(A) {
  if (NS1.has(A)) return A;
  if (US1.has(A)) return US1.get(A);
  if (A = A.slice(2), A.includes(";")) A = A[0] + "0";
  let B = nB.codes.get(Number.parseInt(A, 10));
  if (B) return nB.color.ansi(B);
  return nB.reset.open
}

function e14(A) {
  for (let B = 0; B < A.length; B++) {
      let Q = A.codePointAt(B);
      if (Q >= r14 && Q <= o14) return B
  }

function AA4(A, B) {
  A = A.slice(B, B + 19);
  let Q = e14(A);
  if (Q !== -1) {
      let I = A.indexOf("m", Q);
      if (I === -1) I = A.length;
      return A.slice(0, I + 1)
  }

function BA4(A, B = Number.POSITIVE_INFINITY) {
  let Q = [],
      I = 0,
      G = 0;
  while (I < A.length) {
      let Z = A.codePointAt(I);
      if (s14.has(Z)) {
          let W = AA4(A, I);
          if (W) {
              Q.push({
                  type: "ansi",
                  code: W,
                  endCode: t14(W)
              }

function MhA(A) {
  let B = [];
  for (let Q of A)
      if (Q.code === nB.reset.open) B = [];
      else if (NS1.has(Q.code)) B = B.filter((I) => I.endCode !== Q.code);
  else B = B.filter((I) => I.endCode !== Q.endCode), B.push(Q);
  return B
}

function QA4(A) {
  return MhA(A).map(({
      endCode: I
  }

function OhA(A) {
  if (Q31.has(A)) return A;
  if (qS1.has(A)) return qS1.get(A);
  if (A.startsWith(I31)) return IA4;
  if (A = A.slice(2), A.includes(";")) A = A[0] + "0";
  let B = nB.codes.get(parseInt(A, 10));
  if (B) return nB.color.ansi(B);
  else return nB.reset.open
}

function Pn(A) {
  return A.map((B) => B.code).join("")
}

function LS1(A) {
  return G31([], A)
}

function G31(A, B) {
  let Q = [...A];
  for (let I of B)
      if (I.code === nB.reset.open) Q = [];
      else if (Q31.has(I.code)) Q = Q.filter((G) => G.endCode !== I.code);
  else Q = Q.filter((G) => G.endCode !== I.endCode), Q.push(I);
  return Q
}

function RS1(A) {
  return LS1(A).reverse().map((B) => ({ ...B,
      code: B.endCode
  }

function Z31(A, B) {
  let Q = new Set(B.map((G) => G.endCode)),
      I = new Set(A.map((G) => G.code));
  return [...RS1(A.filter((G) => !Q.has(G.endCode))), ...B.filter((G) => !I.has(G.code))]
}

function ThA(A) {
  let B = [],
      Q = [];
  for (let I of A)
      if (I.type === "ansi") B = G31(B, [I]);
      else if (I.type === "char") Q.push({ ...I,
      styles: [...B]
  }

function PhA(A) {
  let B = "";
  for (let Q = 0; Q < A.length; Q++) {
      let I = A[Q];
      if (Q === 0) B += Pn(I.styles);
      else B += Pn(Z31(A[Q - 1].styles, I.styles));
      if (B += I.value, Q === A.length - 1) B += Pn(Z31(I.styles, []))
  }

function GA4(A) {
  for (let B = 0; B < A.length; B++) {
      let Q = A.charCodeAt(B);
      if (Q >= 48 && Q <= 57) return B
  }

function ZA4(A, B) {
  A = A.slice(B);
  for (let I = 1; I < MS1.length; I++)
      if (A.charCodeAt(I) !== MS1[I]) return;
  let Q = A.indexOf("\x07", I31.length);
  if (Q === -1) return;
  return A.slice(0, Q + 1)
}

function DA4(A, B) {
  A = A.slice(B, B + 19);
  let Q = GA4(A);
  if (Q !== -1) {
      let I = A.indexOf("m", Q);
      if (I === -1) I = A.length;
      return A.slice(0, I + 1)
  }

function ShA(A, B = Number.POSITIVE_INFINITY) {
  let Q = [],
      I = 0,
      G = 0;
  while (I < A.length) {
      let Z = A.codePointAt(I);
      if (LhA.has(Z)) {
          let W = ZA4(A, I) || DA4(A, I);
          if (W) {
              Q.push({
                  type: "ansi",
                  code: W,
                  endCode: OhA(W)
              }

function vS1({
  children: A,
  initialState: B
}) {
  let Q = Ab.useState(B);
  return H31.default.createElement(DmA.Provider, {
      value: Q
  }

function q9() {
  let [A, B] = Ab.useContext(DmA);
  return H31.useMemo(() => {
      return [A, (Q) => {
          j0({ ...ZA(),
              theme: Q
          }

function P({
  color: A,
  backgroundColor: B,
  dimColor: Q = !1,
  bold: I = !1,
  italic: G = !1,
  underline: Z = !1,
  strikethrough: D = !1,
  inverse: Y = !1,
  wrap: W = "wrap",
  children: J
}) {
  let [F] = q9();
  if (J === void 0 || J === null) return null;
  return WmA.default.createElement("ink-text", {
      style: {
          flexGrow: 0,
          flexShrink: 1,
          flexDirection: "row",
          textWrap: W
      }

function gS1({
  error: A
}) {
  let B = A.stack ? A.stack.split(`
`).slice(1) : void 0,
      Q = B ? FmA.parseLine(B[0]) : void 0,
      I = JmA(Q ? .file),
      G, Z = 0;
  if (I && Q ? .line && z31.existsSync(I)) {
      let D = z31.readFileSync(I, "utf8");
      if (G = ZmA(D, Q.line), G)
          for (let {
                  line: Y
              }

function PA4(A) {
  return {
      name: "",
      fn: !1,
      ctrl: !1,
      meta: !1,
      shift: !1,
      option: !1,
      sequence: A,
      raw: A,
      isPasted: !0
  }

function jA4(A) {
  if (LA4.isBuffer(A))
      if (A[0] > 127 && A[1] === void 0) return A[0] -= 128, "\x1B" + String(A);
      else return String(A);
  else if (A !== void 0 && typeof A !== "string") return String(A);
  else if (!A) return "";
  else return A
}

function KmA(A, B = "") {
  let Q = B === null,
      I = Q ? "" : jA4(B);
  if (A.mode === "IN_PASTE") {
      if ((A.incomplete.slice(-w31.length + 1) + I).indexOf(w31) === -1) return [
          [], { ...A,
              incomplete: A.incomplete + I
          }

function YmA(A) {
  fS.forEach((B) => {
      B.setTheme(A)
  }

function N31() {
  return UmA.useContext(NmA)
}

function q31({
  children: A,
  transform: B
}) {
  if (A === void 0 || A === null) return null;
  return qmA.default.createElement("ink-text", {
      style: {
          flexGrow: 0,
          flexShrink: 1,
          flexDirection: "row"
      }

function UI({
  count: A = 1
}) {
  return MmA.default.createElement("ink-text", null, `
`.repeat(A))
}

function EC(A) {
  for (let B = 0; B < A.length; B += 2000) process.stdout.write(A.substring(B, B + 2000))
}

function L31() {
  return process.argv.includes("--debug") || process.argv.includes("-d")
}

function O9(A) {
  if (!L31()) return;
  console.log(UA.dim(`[DEBUG] ${A.trim()}

function M6(A) {
  if (!L31()) return;
  EC(V9("error", ZA().theme)(`[ERROR] ${A.trim()}

async function SmA() {
  try {
      let [A, B, Q, I, G, Z] = await Promise.all([oA4(), OmA(), TmA(), tA4(), PmA(), kn()]);
      return {
          commitHash: A,
          branchName: B,
          remoteUrl: Q,
          isHeadOnRemote: I,
          isClean: G,
          worktreeCount: Z
      }

async function eA4(A, B) {
  let {
      code: Q
  }

function A04() {
  return _mA(jmA(), ".config", "git", "ignore")
}

function pS1() {
  switch (Z7()) {
      case "macos":
          return "/Library/Application Support/ClaudeCode";
      default:
          return "/etc/claude-code"
  }

function Q04() {
  return xn(pS1(), "managed-settings.json")
}

function I04(A) {
  if (!x1().existsSync(A)) return null;
  try {
      let B = wI(A),
          Q = Z8(B),
          I = kfA.safeParse(Q);
      if (!I.success) return b1(new Error(`Invalid settings: ${I.error.message}

function g81(A) {
  switch (A) {
      case "userSettings":
          return ymA(S4());
      case "policySettings":
      case "projectSettings":
      case "localSettings":
          return ymA(e9())
  }

function h81(A) {
  switch (A) {
      case "userSettings":
          return xn(g81(A), "settings.json");
      case "projectSettings":
      case "localSettings":
          return xn(g81(A), fn(A));
      case "policySettings":
          return Q04()
  }

function fn(A) {
  switch (A) {
      case "projectSettings":
          return xn(".claude", "settings.json");
      case "localSettings":
          return xn(".claude", "settings.local.json")
  }

function KC(A) {
  return I04(h81(A))
}

function qB(A, B) {
  if (A === "policySettings") return;
  let Q = h81(A),
      I = B04(Q);
  if (!x1().existsSync(I)) x1().mkdirSync(I);
  let Z = { ...KC(A),
      ...B
  }

function G04(A, B) {
  let Q = [...A, ...B];
  return Array.from(new Set(Q))
}

function m6() {
  let A = {}

function kmA(A, B = 300000) {
  let Q = new Map,
      I = (...G) => {
          let Z = JSON.stringify(G),
              D = Q.get(Z),
              Y = Date.now();
          if (!D) Q.set(Z, {
              value: A(...G),
              timestamp: Y,
              refreshing: !1
          }

function vn(A = "") {
  let B = S4(),
      I = !process.env.CLAUDE_CONFIG_DIR ? "" : `-${Z04("sha256").update(B).digest("hex").substring(0,8)}

function xmA() {
  let A = vn("-credentials");
  return {
      name: "keychain",
      read() {
          try {
              let B = NZ(`security find-generic-password -a $USER -w -s "${A}

function cS1() {
  let A = S4(),
      B = ".credentials.json",
      Q = D04(A, ".credentials.json");
  return {
      name: "plaintext",
      read() {
          if (x1().existsSync(Q)) try {
              let I = x1().readFileSync(Q, {
                  encoding: "utf8"
              }

function Y04(A) {
  let B = cS1();
  return {
      name: `${A.name}

function VJ() {
  if (process.platform === "darwin") {
      let A = xmA();
      return Y04(A)
  }

async function fmA(A) {
  let Q = ZA().oauthAccount ? .accountUuid,
      I = qG(A);
  if (!Q || !I) return;
  let G = `${BB().BASE_API_URL}

async function vmA(A) {
  let B = `${BB().BASE_API_URL}

function CL(A) {
  return Boolean(A ? .includes(YzA))
}

function O31(A) {
  return A ? .split(" ").filter(Boolean) ? ? []
}

function lS1({
  codeChallenge: A,
  state: B,
  isManual: Q,
  loginWithClaudeAi: I
}) {
  let G = I ? BB().CLAUDE_AI_AUTHORIZE_URL : BB().CONSOLE_AUTHORIZE_URL,
      Z = new URL(G);
  return Z.searchParams.append("code", "true"), Z.searchParams.append("client_id", BB().CLIENT_ID), Z.searchParams.append("response_type", "code"), Z.searchParams.append("redirect_uri", Q ? BB().MANUAL_REDIRECT_URL : `http://localhost:${BB().REDIRECT_PORT}

async function bmA(A, B, Q, I = !1) {
  let G = {
          grant_type: "authorization_code",
          code: A,
          redirect_uri: I ? BB().MANUAL_REDIRECT_URL : `http://localhost:${BB().REDIRECT_PORT}

async function gmA(A) {
  let B = {
      grant_type: "refresh_token",
      refresh_token: A,
      client_id: BB().CLIENT_ID
  }

async function hmA(A) {
  let B = await P4.get(BB().ROLES_URL, {
      headers: {
          Authorization: `Bearer ${A}

async function mmA(A) {
  try {
      let B = await P4.post(BB().API_KEY_URL, null, {
              headers: {
                  Authorization: `Bearer ${A}

function T31(A) {
  return Date.now() + 300000 >= A
}

async function iS1(A) {
  switch ((await vmA(A)) ? .organization ? .organization_type) {
      case "claude_max":
          return "max";
      case "claude_pro":
          return "pro";
      case "claude_enterprise":
          return "enterprise";
      case "claude_team":
          return "team";
      default:
          return null
  }

function mS() {
  let A = process.env.CLAUDE_CODE_USE_BEDROCK || process.env.CLAUDE_CODE_USE_VERTEX,
      B = m6().apiKeyHelper,
      Q = process.env.ANTHROPIC_AUTH_TOKEN || B,
      {
          source: I
      }

function h31() {
  if (process.env.ANTHROPIC_AUTH_TOKEN) return {
      source: "ANTHROPIC_AUTH_TOKEN",
      hasToken: !0
  }

function qG(A) {
  let {
      key: B
  }

function GX(A) {
  if (A && process.env.ANTHROPIC_API_KEY) return {
      key: process.env.ANTHROPIC_API_KEY,
      source: "ANTHROPIC_API_KEY"
  }

function o04() {
  let A = process.env.CLAUDE_CODE_API_KEY_HELPER_TTL_MS;
  if (A) {
      let B = parseInt(A, 10);
      if (!Number.isNaN(B) && B >= 0) return B;
      M6(`Found CLAUDE_CODE_API_KEY_HELPER_TTL_MS env var, but it was not a valid number. Got ${A}

function KdA() {
  dS.cache.clear()
}

function CJ(A) {
  return A.slice(-20)
}

function t04(A) {
  return /^[a-zA-Z0-9-_]+$/.test(A)
}

function dmA(A) {
  if (!t04(A)) throw new Error("Invalid API key format. API key must contain only alphanumeric characters, dashes, and underscores.");
  let B = ZA();
  if (wdA(), process.platform === "darwin") try {
      let I = vn();
      NZ(`security add-generic-password -a $USER -s "${I}

function HdA(A) {
  let B = ZA(),
      Q = CJ(A);
  return B.customApiKeyResponses ? .approved ? .includes(Q) ? ? !1
}

function zdA() {
  wdA();
  let A = ZA();
  A.primaryApiKey = void 0, j0(A), un.cache.clear ? .()
}

function wdA() {
  if (process.platform === "darwin") try {
      let A = vn();
      NZ(`security delete-generic-password -a $USER -s "${A}

function J_1(A) {
  if (!CL(A.scopes)) return {
      success: !0
  }

async function F_1(A = 0) {
  let Q = $Z();
  if (!Q ? .refreshToken || !T31(Q.expiresAt)) return !1;
  if ($Z.cache ? .clear ? .(), Q = $Z(), !Q ? .refreshToken || !T31(Q.expiresAt)) return !1;
  let I = S4();
  x1().mkdirSync(I);
  let Z;
  try {
      Z = await CdA.lock(I)
  }

function T9() {
  if (!mS()) return !1;
  return CL($Z() ? .scopes)
}

function qZ() {
  let A = UdA();
  return A === "max" || A === "enterprise" || A === "team"
}

function EdA() {
  return qZ()
}

function UdA() {
  if (!mS()) return null;
  let A = $Z();
  if (!A) return null;
  return A.subscriptionType ? ? null
}

function m31() {
  switch (UdA()) {
      case "enterprise":
          return "Autocoder Enterprise";
      case "team":
          return "Autocoder Team";
      case "max":
          return "Autocoder Max";
      case "pro":
          return "Autocoder Pro";
      default:
          return "Autocoder API"
  }

function Yb() {
  return !!(process.env.CLAUDE_CODE_USE_BEDROCK || process.env.CLAUDE_CODE_USE_VERTEX)
}

function e04(A) {
  let B = MQ();
  if (B === "bedrock") return !1;
  else if (B === "firstParty") return A.includes("claude-3-7") || A.includes("claude-opus-4") || A.includes("claude-sonnet-4");
  else return A.includes("claude-opus-4") || A.includes("claude-sonnet-4")
}

function NdA(A) {
  let B = A.toLowerCase();
  if (B.includes("claude-sonnet-4")) return "Sonnet 4";
  if (B.includes("claude-opus-4")) return "Opus 4";
  if (B.includes("claude-3-7-sonnet")) return "Autocoder 3.7 Sonnet";
  if (B.includes("claude-3-5-sonnet")) return "Autocoder 3.5 Sonnet";
  if (B.includes("claude-3-5-haiku")) return "Autocoder 3.5 Haiku";
  return
}

function Fg(A, B) {
  return A.find((Q) => Q.includes(B)) ? ? null
}

function wG1(A) {
  let B = [],
      Q = !1;
  async function I() {
      if (Q) return;
      if (B.length === 0) return;
      Q = !0;
      while (B.length > 0) {
          let {
              args: G,
              resolve: Z,
              reject: D,
              context: Y
          }

function EG1(A) {
  return {
      haiku35: pn[A],
      sonnet35: pS[A],
      sonnet37: uS[A],
      sonnet40: UC[A],
      opus40: GN[A]
  }

async function ox4() {
  let A;
  try {
      A = await oG0()
  }

function ex4() {
  if (K21() !== null) return;
  if (MQ() !== "bedrock") {
      UU1(EG1(MQ()));
      return
  }

function zX() {
  let A = K21();
  if (A === null) return ex4(), EG1(MQ());
  return A
}

function K_() {
  return process.env.ANTHROPIC_SMALL_FAST_MODEL || zX().haiku35
}

function UG1(A) {
  return A === zX().opus40
}

function Vg() {
  let A, B = A9A();
  if (B !== void 0) A = B;
  else A = process.env.ANTHROPIC_MODEL || m6().model || void 0;
  if (T9() && !qZ() && A ? .includes("opus")) return;
  return A
}

function J7() {
  let A = Vg();
  if (A !== void 0 && A !== null) return Cg(A);
  if (A === null && HP()) return wX();
  return sa()
}

function eG0() {
  if (MQ() === "bedrock") return zX().sonnet37;
  return zX().sonnet40
}

function sa() {
  if (qZ()) return zX().opus40;
  return eG0()
}

function wX() {
  return eG0()
}

function kC(A) {
  let B = A.match(/(claude-(\d+-\d+-)?\w+)/);
  if (B && B[1]) return B[1];
  return A
}

function NG1() {
  if (T9() && !qZ()) return $G1.description;
  let A = ZA().fallbackAvailableWarningThreshold;
  if (A === void 0) return "Use Opus 4 or Sonnet 4 based on Max usage limits";
  return `Opus 4 for up to ${(A*100).toFixed(0)}

function H_(A) {
  if (A === zX().opus40) return "Opus 4";
  if (A === zX().sonnet40) return "Sonnet 4";
  return "Sonnet 3.7"
}

function C_() {
  if (T9() && !qZ()) return {
      value: null,
      label: "Sonnet",
      description: $G1.description
  }

function Qf4() {
  if (T9() && !qZ()) return [C_()];
  if (qZ()) return [C_(), Bf4, $G1];
  if (MQ() === "bedrock") return [C_(), AZ0, vf1];
  return [C_(), vf1]
}

function BZ0() {
  let A = Qf4(),
      B = null,
      Q = Vg(),
      I = C21();
  if (Q !== void 0 && Q !== null) B = Q;
  else if (I !== null) B = I;
  if (B === null || A.some((G) => G.value === B)) return A;
  if (QZ0(B)) A.push(B === "sonnet" ? AZ0 : vf1);
  else A.push({
      value: B,
      label: B,
      description: "Custom model"
  }

function QZ0(A) {
  return ["sonnet", "opus"].includes(A)
}

function Cg(A) {
  let B = A.toLowerCase().trim();
  if (QZ0(B)) return B === "sonnet" ? zX().sonnet40 : zX().opus40;
  return B
}

function z_(A) {
  if (A === null) {
      if (T9() && !qZ()) return `Sonnet (${$G1.description}

function IZ0(A) {
  return A
}

function DZ0() {
  w_ = null, ZZ0.cache ? .clear ? .(), E_.cache ? .clear ? .(), Zf4.cache ? .clear ? .(), wJ.cache ? .clear ? .()
}

async function E1(A, B) {
  if (process.env.CLAUDE_CODE_USE_BEDROCK || process.env.CLAUDE_CODE_USE_VERTEX || process.env.DISABLE_TELEMETRY || process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) return;
  try {
      let Q = B.model ? String(B.model) : J7(),
          I = jY(Q),
          [G, Z, D] = await Promise.all([E_(), mA.getPackageManagers(), mA.getRuntimes()]);
      if (!G) return;
      let Y = { ...B,
              model: Q,
              sessionId: y9(),
              userType: "external",
              ...I.length > 0 ? {
                  betas: I.join(",")
              }

function YZ0() {
  return { ...GZ0
  }

async function xC(A, B) {
  if (process.env.CLAUDE_CODE_USE_BEDROCK || process.env.CLAUDE_CODE_USE_VERTEX || process.env.DISABLE_TELEMETRY || process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) return B;
  let Q = await E_();
  if (!Q) return B;
  let I = Q.getDynamicConfig(A);
  if (Object.keys(I.value).length === 0) return B;
  return I.value
}

function JZ0() {
  aL.init({
      dsn: bJA,
      environment: "external",
      release: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
          PACKAGE_URL: "@elizaos/code",
          README_URL: "https://eliza.how",
          VERSION: "1.0.34"
      }

function MG1(A) {
  try {
      let B = xx();
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
          }

function fC(A) {
  if (typeof A !== "string") return null;
  return Df4.test(A) ? A : null
}

function oa() {
  return ra(S4(), "projects")
}

function FZ0() {
  let A = LG1(gf1);
  return ra(A, `${y9()}

function Wf4() {
  return "production"
}

function XZ0() {
  return "external"
}

function LG1(A) {
  return ra(oa(), A.replace(/[^a-zA-Z0-9]/g, "-"))
}

function Kg() {
  if (!bf1) bf1 = new VZ0;
  return bf1
}

async function RG1(A) {
  let B = EZ0(A);
  return await Kg().insertMessageChain(B), B[B.length - 1] ? .uuid || null
}

async function CZ0(A) {
  await Kg().insertMessageChain(EZ0(A), !0)
}

function Jf4(A) {
  let B = A.find((G) => G.type === "user");
  if (!B || B.type !== "user") return "No prompt";
  let Q = B.message ? .content,
      I = "";
  if (typeof Q === "string") I = Q;
  else if (Array.isArray(Q)) I = Q.find((Z) => Z.type === "text") ? .text || "No prompt";
  else I = "No prompt";
  if (I = I.replace(/\n/g, " ").trim(), I.length > 45) I = I.slice(0, 45) + "...";
  return I
}

function Ff4(A) {
  return A.map((B) => {
      let {
          isSidechain: Q,
          parentUuid: I,
          ...G
      }

function KZ0(A, B = 0, Q) {
  let I = A[A.length - 1],
      G = A[0],
      Z = Jf4(A),
      D = new Date(G.timestamp),
      Y = new Date(I.timestamp);
  return {
      date: I.timestamp,
      messages: Ff4(A),
      fullPath: "n/a",
      value: B,
      created: D,
      modified: Y,
      firstPrompt: Z,
      messageCount: A.length,
      isSidechain: G.isSidechain,
      leafUuid: I.uuid,
      summary: Q
  }

async function HZ0() {
  let A = await Kg().getAllTranscripts(),
      B = Kg().summaries;
  return A.map((Q, I) => {
      let G = Q[Q.length - 1],
          Z = G ? B.get(G.uuid) : void 0;
      return KZ0(Q, I, Z)
  }

async function zZ0(A, B) {
  await Kg().appendEntry({
      type: "summary",
      summary: B,
      leafUuid: A
  }

async function hf1(A) {
  let B = new Map,
      Q = new Map;
  try {
      let I = await n81(A);
      for (let G of I)
          if (G.type === "user" || G.type === "assistant" || G.type === "attachment" || G.type === "system") B.set(G.uuid, G);
          else if (G.type === "summary" && G.leafUuid) Q.set(G.leafUuid, G.summary)
  }

async function mf1(A) {
  let B = ra(LG1(dA()), `${A}

async function wZ0(A) {
  let B = await Kg().getLastLog(A);
  if (B !== null && B !== void 0) {
      let Q = B[B.length - 1],
          {
              summaries: I
          }

function EZ0(A) {
  return A.filter((B) => {
      if (B.type === "progress") return !1;
      if (B.type === "attachment" && XZ0() !== "ant") return !1;
      return !0
  }

function Kf4(A) {
  return A.toISOString().replace(/[:.]/g, "-")
}

function Hf4() {
  return uf1(Mz.errors(), pf1 + ".txt")
}

function b1(A) {
  if (df1) return;
  df1 = !0;
  try {
      if (process.env.CLAUDE_CODE_USE_BEDROCK || process.env.CLAUDE_CODE_USE_VERTEX || process.env.DISABLE_ERROR_REPORTING || process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) return;
      let B = A.stack || A.message,
          Q = {
              error: B,
              timestamp: new Date().toISOString()
          }

function UZ0() {
  return [...OG1]
}

function cf1(A) {
  if (!x1().existsSync(A)) return [];
  try {
      return JSON.parse(x1().readFileSync(A, {
          encoding: "utf8"
      }

function zf4(A, B) {
  return
}

async function Hg() {
  let A = await HZ0();
  return wf4(A.filter((B) => B.messages.length)).map((B, Q) => ({ ...B,
      value: Q
  }

async function NZ0(A) {
  return await wZ0(A)
}

function wf4(A) {
  return A.sort((B, Q) => {
      let I = Q.modified.getTime() - B.modified.getTime();
      if (I !== 0) return I;
      let G = Q.created.getTime() - B.created.getTime();
      if (G !== 0) return G;
      return B.created.getTime() - Q.created.getTime()
  }

function m7(A, B) {
  if (M6(UA.red(`MCP server "${A}

function p2(A, B) {
  O9(`MCP server "${A}

function MZ0(A, B) {
  let Q = [],
      I = "";
  for (let G of A)
      if ([...I].length < B) I += G;
      else Q.push(I), I = G;
  if (I) Q.push(I);
  return Q
}

function U_(A) {
  if (A < 60000) {
      let G = (A / 1000).toFixed(1);
      return `${G.endsWith(".0")?G.slice(0,-2):G}

function _G(A) {
  let B = A >= 1000;
  return new Intl.NumberFormat("en", {
      notation: "compact",
      minimumFractionDigits: B ? 1 : 0,
      maximumFractionDigits: 1
  }

function qZ0(A, B = {}) {
  let {
      style: Q = "narrow",
      numeric: I = "always",
      now: G = new Date
  }

function lf1(A, B = {}) {
  let {
      now: Q = new Date,
      ...I
  }

function zg(A, B = !1) {
  if (!A) return;
  let Q = new Date(A * 1000),
      I = Q.getMinutes(),
      G = Q.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: I === 0 ? void 0 : "2-digit",
          hour12: !0
      }

function yZ0(A) {
  let B = null,
      Q = "";
  A.on("data", (G) => {
      if (B) B.write(G);
      else Q += G
  }

function xZ0(A, B, Q) {
  let I = "running",
      G, Z = yZ0(A.stdout),
      D = yZ0(A.stderr),
      Y = (X) => {
          if (I = "killed", A.pid) kZ0.default(A.pid, "SIGKILL")
      }

function fZ0(A) {
  return {
      background: () => null,
      kill: () => {}

function PG1() {
  return !1
}

function nf1() {
  return !1;
  try {
      return x1().accessSync("/usr/bin/sandbox-exec", Nf4.X_OK), !0
  }

function hZ0(A) {
  if (!nf1()) throw new Error("Sandbox mode requested but not available on this system");
  try {
      let B = new gZ0;
      return {
          finalCommand: B.wrapCommand(A),
          cleanup: () => B.cleanup()
      }

function af1(A) {
  let B = {}

function mZ0(A) {
  let B = wg.parse(A),
      Q = -1,
      I = 0;
  for (let G = 0; G < B.length; G++) {
      let Z = B[G];
      if (typeof Z === "string") {
          if (Z.includes("=") && G === I) {
              I++;
              continue
          }

function cZ0(A) {
  let B = A.includes("zsh") ? ".zshrc" : A.includes("bash") ? ".bashrc" : ".profile";
  return _f4(Rf4(), B)
}

function yf4(A, B) {
  let Q = cZ0(A),
      I = Q.endsWith(".zshrc"),
      G = "";
  if (I) G = `
    echo "# Functions" >> $SNAPSHOT_FILE
    
    # Force autoload all functions first
    typeset -f > /dev/null 2>&1
    
    # Now get user function names - filter system ones and write directly to file
    typeset +f | grep -vE '^(_|__)' | while read func; do
      typeset -f "$func" >> $SNAPSHOT_FILE
    done
    
    echo "# Shell Options" >> $SNAPSHOT_FILE
    setopt | sed 's/^/setopt /' | head -n 1000 >> $SNAPSHOT_FILE
  `;
  else G = `
    echo "# Functions" >> $SNAPSHOT_FILE
    
    # Force autoload all functions first
    declare -f > /dev/null 2>&1
    
    # Now get user function names - filter system ones and give the rest to eval in b64 encoding
    declare -F | cut -d' ' -f3 | grep -vE '^(_|__)' | while read func; do
      # Encode the function to base64, preserving all special characters
      encoded_func=$(declare -f "$func" | base64 )
      # Write the function definition to the snapshot
      echo "eval ${sf1}

function uZ0(A) {
  try {
      return x1().accessSync(A, qf4.X_OK), !0
  }

function kf4() {
  let A = Math.floor(Math.random() * 65536).toString(16).padStart(4, "0"),
      B = lZ0(),
      Q = `${rf1.tmpdir()}

async function xf4(A, B, Q, I = !1, G) {
  let Z = Q || jf4,
      {
          binShell: D,
          snapshotFilePath: Y
      }

function iZ0() {
  return l2A()
}

function EX(A, B) {
  let Q = Pf4(A) ? A : Sf4(B || x1().cwd(), A);
  if (!x1().existsSync(Q)) throw new Error(`Path "${Q}

function nZ0() {
  return ff4
}

function dA() {
  try {
      return iZ0()
  }

function u0(A, B, Q = {
  timeout: 10 * As * ea,
  preserveOutputOnError: !0,
  useCwd: !0
}) {
  return PD(A, B, {
      abortSignal: Q.abortSignal,
      timeout: Q.timeout,
      preserveOutputOnError: Q.preserveOutputOnError,
      cwd: Q.useCwd ? dA() : void 0,
      env: Q.env
  }

function PD(A, B, Q = {
  timeout: 10 * As * ea,
  preserveOutputOnError: !0
}) {
  let {
      abortSignal: I,
      timeout: G = 10 * As * ea,
      preserveOutputOnError: Z = !0,
      cwd: D,
      env: Y
  }

function NZ(A, B, Q = 10 * As * ea) {
  let I;
  if (B === void 0) I = {}

function S4() {
  return process.env.CLAUDE_CONFIG_DIR ? ? SG1(sZ0(), ".claude")
}

function UX() {
  if (x1().existsSync(SG1(S4(), ".config.json"))) return SG1(S4(), ".config.json");
  return SG1(process.env.CLAUDE_CONFIG_DIR || sZ0(), ".claude.json")
}

async function Eg(A, B = ["--version"]) {
  return (await u0(A, B, {
      timeout: 1000,
      preserveOutputOnError: !0,
      useCwd: !1
  }

function cf4() {
  if (process.env.CURSOR_TRACE_ID) return "cursor";
  if (process.env.VSCODE_GIT_ASKPASS_MAIN ? .includes("/.cursor-server/")) return "cursor";
  if (process.env.VSCODE_GIT_ASKPASS_MAIN ? .includes("/.windsurf-server/")) return "windsurf";
  let A = process.env.__CFBundleIdentifier ? .toLowerCase();
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
  if (process.env.WSL_DISTRO_NAME) return `wsl-${process.env.WSL_DISTRO_NAME}

function yY(A) {
  if (!A) return !1;
  let B = A.toLowerCase().trim();
  return ["1", "true", "yes", "on"].includes(B)
}

function tZ0() {
  return yY(process.env.DISABLE_NON_ESSENTIAL_MODEL_CALLS)
}

function eZ0(A) {
  let B = {}

function Xg() {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1"
}

function sL() {
  return process.env.CLOUD_ML_REGION || "us-east5"
}

function tf1() {
  return yY(process.env.CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR)
}

function AD0(A) {
  if (A ? .startsWith("claude-3-5-haiku")) return process.env.VERTEX_REGION_CLAUDE_3_5_HAIKU || sL();
  if (A ? .startsWith("claude-3-5-sonnet")) return process.env.VERTEX_REGION_CLAUDE_3_5_SONNET || sL();
  if (A ? .startsWith("claude-3-7-sonnet")) return process.env.VERTEX_REGION_CLAUDE_3_7_SONNET || sL();
  if (A ? .startsWith("claude-opus-4")) return process.env.VERTEX_REGION_CLAUDE_4_0_OPUS || sL();
  if (A ? .startsWith("claude-sonnet-4")) return process.env.VERTEX_REGION_CLAUDE_4_0_SONNET || sL();
  return sL()
}

function Zv1(A) {
  return Bs.includes(A)
}

function QD0() {
  let A = dA(),
      B = $_(UX(), NX);
  while (!0) {
      if (B.projects ? .[A] ? .hasTrustDialogAccepted) return !0;
      let I = BD0(A, "..");
      if (I === A) break;
      A = I
  }

function Dv1(A) {
  return Qs.includes(A)
}

function Ng(A, B) {
  if (B) {
      let Q = ZA();
      return A in Q && Array.isArray(Q[A])
  }

function tf4(A, B) {
  if (Ng(A, B)) return !1;
  if (B) {
      let Q = ZA();
      return A in Q && typeof Q[A] === "object"
  }

function ef4(A, B) {
  let Q = Array.from(new Set(B));
  switch (A) {
      case "allowedTools":
          return Q.length > 0 ? Q : ["git diff:*"];
      case "ignorePatterns":
          return Q.length > 0 ? Q.map((I) => `Read(${I}

function Av4(A, B) {
  let Q = ef4(A, B);
  switch (A) {
      case "allowedTools":
          return {
              permissions: {
                  allow: Q
              }

function Bv4(A, B) {
  if (A !== "allowedTools" && A !== "ignorePatterns") return;
  console.warn(`Warning: "claude config add ${A}

function _G1(A, B, Q, I = !0) {
  if (E1("tengu_config_add", {
          key: A,
          global: Q,
          count: B.length
      }

function ID0(A, B, Q, I = !0) {
  if (E1("tengu_config_remove", {
          key: A,
          global: Q,
          count: B.length
      }

function j0(A) {
  GD0(UX(), { ...A,
      projects: $_(UX(), NX).projects
  }

function Qv1(A) {
  if (A.installMethod !== void 0) return A;
  let B = "unknown",
      Q = !0;
  switch (A.autoUpdaterStatus) {
      case "migrated":
          B = "local";
          break;
      case "installed":
          B = "native";
          break;
      case "disabled":
          Q = !1;
          break;
      case "enabled":
      case "no_permissions":
      case "not_configured":
          B = "global";
          break;
      case void 0:
          break
  }

function ZA() {
  try {
      let A = x1().existsSync(UX()) ? x1().statSync(UX()) : null;
      if (N_.config && A) {
          if (A.mtimeMs <= N_.mtime) return N_.config
      }

function jG1(A) {
  let B = ZA();
  if (B.customApiKeyResponses ? .approved ? .includes(A)) return "approved";
  if (B.customApiKeyResponses ? .rejected ? .includes(A)) return "rejected";
  return "new"
}

function GD0(A, B, Q) {
  let I = sf4(A),
      G = x1();
  if (!G.existsSync(I)) G.mkdirSync(I);
  let Z = Object.fromEntries(Object.entries(B).filter(([D, Y]) => JSON.stringify(Y) !== JSON.stringify(Q[D])));
  eM(A, JSON.stringify(Z, null, 2))
}

function ZD0() {
  if (Gv1) return;
  Gv1 = !0, $_(UX(), NX, !0)
}

function m9() {
  let A = DD0(),
      B = $_(UX(), NX);
  if (!B.projects) return UN;
  let Q = B.projects[A] ? ? UN;
  if (typeof Q.allowedTools === "string") Q.allowedTools = Z8(Q.allowedTools) ? ? [];
  return Q
}

function B5(A) {
  let B = DD0(),
      Q = $_(UX(), NX);
  GD0(UX(), { ...Q,
      projects: { ...Q.projects,
          [B]: A
      }

function yG1() {
  let A = ZA();
  return !!(process.env.DISABLE_AUTOUPDATER || process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC || A.autoUpdates === !1)
}

function kG1() {
  if (T9()) return !1;
  let B = ZA(),
      Q = B.oauthAccount ? .organizationRole,
      I = B.oauthAccount ? .workspaceRole;
  if (!Q || !I) return !0;
  return ["admin", "billing"].includes(Q) || ["workspace_admin", "workspace_billing"].includes(I)
}

function Qv4(A) {
  let B = Z8(A),
      Q = {}

function Yv1(A) {
  let B = Iv1(dA(), ".mcp.json");
  eM(B, JSON.stringify(A, null, 2), {
      encoding: "utf8"
  }

function fx() {
  let A = ZA();
  if (A.userID) return A.userID;
  let B = rf4(32).toString("hex");
  return j0({ ...A,
      userID: B
  }

function YD0() {
  let A = ZA();
  if (!A.firstStartTime) j0({ ...A,
      firstStartTime: new Date().toISOString()
  }

function WD0(A, B) {
  if (E1("tengu_config_get", {
          key: A,
          global: B
      }

function JD0(A, B, Q) {
  if (E1("tengu_config_set", {
          key: A,
          global: Q
      }

function FD0(A, B) {
  if (E1("tengu_config_delete", {
          key: A,
          global: B
      }

function XD0(A) {
  if (E1("tengu_config_list", {
          global: A
      }

function VD0() {
  let A = m6();
  Object.assign(process.env, ZA().env), Object.assign(process.env, A.env)
}

function Wv1() {
  let {
      env: A
  }

function fD0({
  children: A
}) {
  let {
      marker: B
  }

function dv4({
  children: A
}) {
  let {
      depth: B
  }

function bD0({
  isFocused: A,
  isSelected: B,
  children: Q
}) {
  let {
      styles: I
  }

function fG1({
  isDisabled: A = !1,
  visibleOptionCount: B = 5,
  highlightText: Q,
  options: I,
  defaultValue: G,
  onChange: Z,
  onSubmit: D
}) {
  let Y = mD0({
      visibleOptionCount: B,
      options: I,
      defaultValue: G,
      onChange: Z,
      onSubmit: D
  }

function gG1({
  children: A
}) {
  let {
      marker: B
  }

function rL({
  children: A
}) {
  let {
      marker: B
  }

function iD0({
  isFocused: A,
  isSelected: B,
  children: Q,
  shouldShowDownArrow: I,
  shouldShowUpArrow: G
}) {
  let {
      styles: Z
  }

function p0({
  isDisabled: A = !1,
  visibleOptionCount: B = 5,
  highlightText: Q,
  options: I,
  defaultValue: G,
  onCancel: Z,
  onChange: D,
  onFocus: Y,
  focusValue: W
}) {
  let J = aD0({
      visibleOptionCount: B,
      options: I,
      defaultValue: G,
      onChange: D,
      onCancel: Z,
      onFocus: Y,
      focusValue: W
  }

function dG1(A) {
  return Cv1.add(A), () => Cv1.delete(A)
}

function MI(A = 0) {
  qI(A).catch((B) => {
      M6(`Graceful shutdown failed: ${B}

async function qI(A = 0) {
  process.exitCode = A;
  try {
      let B = (async () => {
          try {
              await Promise.all(Array.from(Cv1).map((Q) => Q()))
          }

function Y2(A) {
  let [B, Q] = tD0.useState({
      pending: !1,
      keyName: null
  }

function Qb4() {
  return {
      verbose: !1,
      mainLoopModel: null,
      maxRateLimitFallbackActive: !1,
      todoFeatureEnabled: !1,
      toolPermissionContext: tz(),
      mcp: {
          clients: [],
          tools: [],
          commands: [],
          resources: {}

function c3({
  children: A,
  initialState: B,
  onChangeAppState: Q
}) {
  if (TZ.useContext(eD0)) throw new Error("AppStateProvider can not be nested within another AppStateProvider");
  let [G, Z] = TZ.useState({
      currentState: B ? ? Qb4(),
      previousState: null
  }

function d5() {
  let A = TZ.useContext(AY0);
  if (!A.__IS_INITIALIZED__) throw new ReferenceError("useAppState cannot be called outside of an <AppStateProvider />");
  return A
}

function Ib4({
  filePath: A,
  errorDescription: B,
  onExit: Q,
  onReset: I
}) {
  Z0((D, Y) => {
      if (Y.escape) Q()
  }

async function BY0({
  error: A
}) {
  let B = {
      exitOnCtrlC: !1,
      theme: Gb4
  }

function MR() {
  return `autocoder/${{ISSUES_EXPLAINER:"report the issue at https://github.com/elizaos/eliza/issues",PACKAGE_URL:"@elizaos/code",README_URL:"https://eliza.how",VERSION:"1.0.34"}

function CY1() {
  if (T9()) {
      let B = $Z();
      if (!B ? .accessToken) return {
          headers: {}

function sW6() {
  if (!process.env.OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE) process.env.OTEL_EXPORTER_OTLP_METRICS_TEMPORALITY_PREFERENCE = "delta"
}

function rW6() {
  let A = (process.env.OTEL_METRICS_EXPORTER || "").trim().split(",").filter(Boolean),
      B = parseInt(process.env.OTEL_METRIC_EXPORT_INTERVAL || nW6.toString()),
      Q = [];
  for (let I of A)
      if (I === "console") {
          let G = new HY1.ConsoleMetricExporter,
              Z = G.export.bind(G);
          G.export = (D, Y) => {
              if (D.resource && D.resource.attributes) console.log(`
=== Resource Attributes ===`), console.log(D.resource.attributes), console.log(`===========================
`);
              return Z(D, Y)
          }

function oW6() {
  let A = (process.env.OTEL_LOGS_EXPORTER || "").trim().split(",").filter(Boolean),
      B = [];
  for (let Q of A)
      if (Q === "console") B.push(new $h.ConsoleLogRecordExporter);
      else if (Q === "otlp") {
      let I = process.env.OTEL_EXPORTER_OTLP_LOGS_PROTOCOL ? .trim() || process.env.OTEL_EXPORTER_OTLP_PROTOCOL ? .trim();
      switch (I) {
          case "grpc":
              B.push(new qg0.OTLPLogExporter);
              break;
          case "http/json":
              B.push(new Mg0.OTLPLogExporter);
              break;
          case "http/protobuf":
              B.push(new $g0.OTLPLogExporter);
              break;
          default:
              throw new Error(`Unknown protocol set in OTEL_EXPORTER_OTLP_LOGS_PROTOCOL or OTEL_EXPORTER_OTLP_PROTOCOL env var: ${I}

function zg0() {
  return Boolean(process.env.CLAUDE_CODE_ENABLE_TELEMETRY)
}

function tW6() {
  let A = new Bu1;
  return new Iu1.PeriodicExportingMetricReader({
      exporter: A,
      exportIntervalMillis: 300000
  }

function eW6() {
  return !1
}

function Lg0() {
  sW6(), KY1.diag.setLogger(new Au1, KY1.DiagLogLevel.ERROR);
  let A = [];
  if (zg0()) A.push(...rW6());
  if (eW6()) A.push(tW6());
  let B = Sr.resourceFromAttributes({
          [zY1.ATTR_SERVICE_NAME]: "claude-code",
          [zY1.ATTR_SERVICE_VERSION]: {
              ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
              PACKAGE_URL: "@elizaos/code",
              README_URL: "https://eliza.how",
              VERSION: "1.0.34"
          }

function Gu1(A) {
  let B = AJ6[A],
      Q = process.env[A];
  if (Q === void 0) return B;
  return Q === "true"
}

function wY1() {
  let A = fx(),
      B = y9(),
      Q = ZA(),
      I = Q.oauthAccount ? .organizationUuid,
      G = Q.oauthAccount ? .emailAddress,
      Z = Q.oauthAccount ? .accountUuid,
      D = {
          "user.id": A
      }

function zm() {
  return process.env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY
}

function tn0() {
  let A = zm();
  return A ? {
      dispatcher: on0(A)
  }

function en0() {
  let A = zm();
  if (A) P4.defaults.proxy = !1, P4.defaults.httpsAgent = new rn0.default.HttpsProxyAgent(A), Sc1.default.setGlobalDispatcher(on0(A))
}

function cM6() {
  let A = Lg0();
  if (A) I9A(A, (Q, I) => {
      let G = A ? .createCounter(Q, I);
      return {
          attributes: null,
          add(Z, D = {}

function Ba0(A) {
  let B;
  if (typeof Bun !== "undefined" && Bun.embeddedFiles ? .length > 0) B = "./ripgrep.node";
  else B = aM6(nM6(iM6(
      import.meta.url)), "ripgrep.node");
  let {
      ripgrepMain: Q
  }

function Pj(A, B, {
  target: Q = "stdout",
  ...I
} = {}) {
  if (!AJ1.default[Q]) {
      if (I.fallback === !1) return A;
      return typeof I.fallback === "function" ? I.fallback(A, B) : `${A}

function kQ({
  url: A,
  children: B
}) {
  let Q = IL6.includes(mA.terminal ? ? ""),
      I = B || A;
  if (Q || I !== A) return QJ1.default.createElement(BJ1, {
      url: A
  }

function Ua0({
  onDone: A
}) {
  return Z0((B, Q) => {
      if (Q.ctrl && (B === "c" || B === "d") || Q.escape) A()
  }

function xc1() {
  let A = ZJ1(S4(), "todos");
  if (!x1().existsSync(A)) x1().mkdirSync(A);
  return A
}

function cR(A) {
  let B = `${y9()}

function jJ(A) {
  return La0(cR(A))
}

function DJ1(A, B) {
  Ra0(A, cR(B))
}

function YJ1(A, B) {
  let Q = qa0[A.status] - qa0[B.status];
  if (Q !== 0) return Q;
  return Ma0[A.priority] - Ma0[B.priority]
}

function WJ1(A) {
  if (A.messages.length > 0) {
      let B = A.messages[0];
      if (B && "sessionId" in B) YL6(B.sessionId, y9())
  }

function YL6(A, B) {
  let Q = ZJ1(xc1(), `${A}

function La0(A) {
  if (!x1().existsSync(A)) return [];
  try {
      let B = JSON.parse(x1().readFileSync(A, {
          encoding: "utf-8"
      }

function Ra0(A, B) {
  try {
      eM(B, JSON.stringify(A, null, 2))
  }

function w0({
  children: A,
  height: B
}) {
  if (Pa0.useContext(Sa0)) return A;
  return QK.createElement(WL6, null, QK.createElement(h, {
      flexDirection: "row",
      height: B,
      overflowY: "hidden"
  }

function WL6({
  children: A
}) {
  return QK.createElement(Sa0.Provider, {
      value: !0
  }

function C5() {
  return ko.createElement(w0, {
      height: 1
  }

function JJ1({
  todo: {
      status: A,
      priority: B,
      content: Q
  },
  isCurrent: I = !1,
  previousStatus: G,
  verbose: Z
}) {
  let D = G !== "completed" && A === "completed" ? "success" : G !== "in_progress" && A === "in_progress" ? "suggestion" : void 0;
  return yJ.createElement(h, {
      flexDirection: "row"
  }

function _a0({
  oldTodos: A,
  newTodos: B,
  verbose: Q = !1
}) {
  if (B.length === 0) return IK.createElement(w0, {
      height: 1
  }

function K6({
  result: A,
  verbose: B
}) {
  let Q;
  if (typeof A !== "string") Q = "Error";
  else {
      let G = A.trim();
      if (!B && G.includes("InputValidationError: ")) Q = "Invalid tool parameters";
      else if (G.startsWith("Error: ")) Q = G;
      else Q = `Error: ${G}

function ka0({
  todos: A,
  verbose: B
}) {
  if (A.length === 0) return GK.createElement(w0, {
      height: 1
  }

function bc1(A) {
  return `
- Fast content search tool that works with any codebase size
- Searches file contents using regular expressions
- Supports full regex syntax (eg. "log.*Error", "function\\s+\\w+", etc.)
- Filter files by pattern with the include parameter (eg. "*.js", "*.{ts,tsx}

function KJ1() {
  let A = process.env.BASH_MAX_OUTPUT_LENGTH;
  if (A) {
      let B = parseInt(A, 10);
      if (!isNaN(B) && B > 0) return B
  }

function Em() {
  let A = process.env.BASH_DEFAULT_TIMEOUT_MS;
  if (A) {
      let B = parseInt(A, 10);
      if (!isNaN(B) && B > 0) return B
  }

function CJ1() {
  let A = process.env.BASH_MAX_TIMEOUT_MS;
  if (A) {
      let B = parseInt(A, 10);
      if (!isNaN(B) && B > 0) return Math.max(B, Em())
  }

function KL6() {
  if (!(m6().includeCoAuthoredBy ? ? !0)) return {
      commit: "",
      pr: ""
  }

function xa0() {
  return `Executes a given bash command in a persistent shell session with optional timeout, ensuring proper handling and security measures.

Before executing the command, please follow these steps:

1. Directory Verification:
 - If the command will create new directories or files, first use the LS tool to verify the parent directory exists and is the correct location
 - For example, before running "mkdir foo/bar", first use LS to check that "foo" exists and is the intended parent directory

2. Command Execution:
 - Always quote file paths that contain spaces with double quotes (e.g., cd "path with spaces/file.txt")
 - Examples of proper quoting:
   - cd "/Users/name/My Documents" (correct)
   - cd /Users/name/My Documents (incorrect - will fail)
   - python "/path/with spaces/script.py" (correct)
   - python /path/with spaces/script.py (incorrect - will fail)
 - After ensuring proper quoting, execute the command.
 - Capture the output of the command.

Usage notes:
- The command argument is required.
- You can specify an optional timeout in milliseconds (up to ${CJ1()}

function HL6() {
  let {
      commit: B,
      pr: Q
  }

function Um() {
  return !1
}

function fa0() {
  return ""
}

function ga0() {
  return `You are ${m0}

async function yj(A, B, Q, I) {
  let G = new Set(A.map((D) => D.name)),
      Z = await xC("claude_code_docs_config", wL6);
  return [`
You are an interactive CLI tool that helps users with software engineering tasks. Use the instructions below and the tools available to you to assist the user.

${va0}

async function ha0(A, B) {
  let [Q, I] = await Promise.all([jz(), EL6()]), G = NdA(A), Z = G ? `You are powered by the model named ${G}

async function EL6() {
  try {
      let {
          stdout: A
      }

async function ma0(A, B) {
  return [`You are an agent for ${m0}

function hc1(A, B, Q, I) {
  if (!I ? .errorMessages) return;
  if (Q) A.errorMessage = { ...A.errorMessage,
      [B]: Q
  }

function u6(A, B, Q, I, G) {
  A[B] = Q, hc1(A, B, I, G)
}

function la0() {
  return {}

function ia0(A, B) {
  let Q = {
      type: "array"
  }

function na0(A, B) {
  let Q = {
      type: "integer",
      format: "int64"
  }

function aa0() {
  return {
      type: "boolean"
  }

function HJ1(A, B) {
  return B4(A.type._def, B)
}

function mc1(A, B, Q) {
  let I = Q ? ? B.dateStrategy;
  if (Array.isArray(I)) return {
      anyOf: I.map((G, Z) => mc1(A, B, G))
  }

function ra0(A, B) {
  return { ...B4(A.innerType._def, B),
      default: A.defaultValue()
  }

function oa0(A, B) {
  return B.effectStrategy === "input" ? B4(A.schema._def, B) : {}

function ta0(A) {
  return {
      type: "string",
      enum: Array.from(A.values)
  }

function ea0(A, B) {
  let Q = [B4(A.left._def, { ...B,
          currentPath: [...B.currentPath, "allOf", "0"]
      }

function As0(A, B) {
  let Q = typeof A.value;
  if (Q !== "bigint" && Q !== "number" && Q !== "boolean" && Q !== "string") return {
      type: Array.isArray(A.value) ? "array" : "object"
  }

function zJ1(A, B) {
  let Q = {
      type: "string"
  }

function uc1(A, B) {
  return B.patternStrategy === "escape" ? qL6(A) : A
}

function qL6(A) {
  let B = "";
  for (let Q = 0; Q < A.length; Q++) {
      if (!$L6.has(A[Q])) B += "\\";
      B += A[Q]
  }

function YK(A, B, Q, I) {
  if (A.format || A.anyOf ? .some((G) => G.format)) {
      if (!A.anyOf) A.anyOf = [];
      if (A.format) {
          if (A.anyOf.push({
                  format: A.format,
                  ...A.errorMessage && I.errorMessages && {
                      errorMessage: {
                          format: A.errorMessage.format
                      }

function vD(A, B, Q, I) {
  if (A.pattern || A.allOf ? .some((G) => G.pattern)) {
      if (!A.allOf) A.allOf = [];
      if (A.pattern) {
          if (A.allOf.push({
                  pattern: A.pattern,
                  ...A.errorMessage && I.errorMessages && {
                      errorMessage: {
                          pattern: A.errorMessage.pattern
                      }

function Bs0(A, B) {
  if (!B.applyRegexFlags || !A.flags) return A.source;
  let Q = {
          i: A.flags.includes("i"),
          m: A.flags.includes("m"),
          s: A.flags.includes("s")
      }

function wJ1(A, B) {
  if (B.target === "openAi") console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");
  if (B.target === "openApi3" && A.keyType ? ._def.typeName === R0.ZodEnum) return {
      type: "object",
      required: A.keyType._def.values,
      properties: A.keyType._def.values.reduce((I, G) => ({ ...I,
          [G]: B4(A.valueType._def, { ...B,
              currentPath: [...B.currentPath, "properties", G]
          }

function Qs0(A, B) {
  if (B.mapStrategy === "record") return wJ1(A, B);
  let Q = B4(A.keyType._def, { ...B,
          currentPath: [...B.currentPath, "items", "items", "0"]
      }

function Is0(A) {
  let B = A.values,
      I = Object.keys(A.values).filter((Z) => {
          return typeof B[B[Z]] !== "number"
      }

function Gs0() {
  return {
      not: {}

function Zs0(A) {
  return A.target === "openApi3" ? {
      enum: ["null"],
      nullable: !0
  }

function Ys0(A, B) {
  if (B.target === "openApi3") return Ds0(A, B);
  let Q = A.options instanceof Map ? Array.from(A.options.values()) : A.options;
  if (Q.every((I) => (I._def.typeName in xo) && (!I._def.checks || !I._def.checks.length))) {
      let I = Q.reduce((G, Z) => {
          let D = xo[Z._def.typeName];
          return D && !G.includes(D) ? [...G, D] : G
      }

function Ws0(A, B) {
  if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(A.innerType._def.typeName) && (!A.innerType._def.checks || !A.innerType._def.checks.length)) {
      if (B.target === "openApi3") return {
          type: xo[A.innerType._def.typeName],
          nullable: !0
      }

function Js0(A, B) {
  let Q = {
      type: "number"
  }

function Fs0(A, B) {
  let Q = B.target === "openAi",
      I = {
          type: "object",
          properties: {}

function ML6(A, B) {
  if (A.catchall._def.typeName !== "ZodNever") return B4(A.catchall._def, { ...B,
      currentPath: [...B.currentPath, "additionalProperties"]
  }

function LL6(A) {
  try {
      return A.isOptional()
  }

function Cs0(A, B) {
  return B4(A.type._def, B)
}

function Ks0(A, B) {
  let I = {
      type: "array",
      uniqueItems: !0,
      items: B4(A.valueType._def, { ...B,
          currentPath: [...B.currentPath, "items"]
      }

function Hs0(A, B) {
  if (A.rest) return {
      type: "array",
      minItems: A.items.length,
      items: A.items.map((Q, I) => B4(Q._def, { ...B,
          currentPath: [...B.currentPath, "items", `${I}

function zs0() {
  return {
      not: {}

function ws0() {
  return {}

function B4(A, B, Q = !1) {
  let I = B.seen.get(A);
  if (B.override) {
      let Y = B.override ? .(A, B, I, Q);
      if (Y !== ua0) return Y
  }

function Q4(A, B, Q, I, G) {
  if (I === "m") throw new TypeError("Private method is not writable");
  if (I === "a" && !G) throw new TypeError("Private accessor was defined without a setter");
  if (typeof B === "function" ? A !== B || !G : !B.has(A)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return I === "a" ? G.call(A, Q) : G ? G.value = Q : B.set(A, Q), Q
}

function X0(A, B, Q, I) {
  if (Q === "a" && !I) throw new TypeError("Private accessor was defined without a getter");
  if (typeof B === "function" ? A !== B || !I : !B.has(A)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return Q === "m" ? I : Q === "a" ? I.call(A) : I ? I.value : B.get(A)
}

function tN(A) {
  return typeof A === "object" && A !== null && (("name" in A) && A.name === "AbortError" || ("message" in A) && String(A.message).includes("FetchRequestCanceledException"))
}

function cc1(A) {
  if (typeof A !== "object") return {}

function qs0(A, B) {
  return Object.prototype.hasOwnProperty.call(A, B)
}

function UJ1(A, B, Q) {
  if (!B || NJ1[A] > NJ1[Q]) return io;
  else return B[A].bind(B)
}

function vZ(A) {
  let B = A.logger,
      Q = A.logLevel ? ? "off";
  if (!B) return _L6;
  let I = Rs0.get(B);
  if (I && I[0] === Q) return I[1];
  let G = {
      error: UJ1("error", B, Q),
      warn: UJ1("warn", B, Q),
      info: UJ1("info", B, Q),
      debug: UJ1("debug", B, Q)
  }

function jL6() {
  if (typeof Deno !== "undefined" && Deno.build != null) return "deno";
  if (typeof EdgeRuntime !== "undefined") return "edge";
  if (Object.prototype.toString.call(typeof globalThis.process !== "undefined" ? globalThis.process : 0) === "[object process]") return "node";
  return "unknown"
}

function kL6() {
  if (typeof navigator === "undefined" || !navigator) return null;
  let A = [{
      key: "edge",
      pattern: /Edge(?:\W+(\d+)\.(\d+)(?:\.(\d+))?)?/
  }

function js0() {
  if (typeof fetch !== "undefined") return fetch;
  throw new Error("`fetch` is not defined as a global; Either pass `fetch` to the client, `new Anthropic({ fetch }

function ic1(...A) {
  let B = globalThis.ReadableStream;
  if (typeof B === "undefined") throw new Error("`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`");
  return new B(...A)
}

function nc1(A) {
  let B = Symbol.asyncIterator in A ? A[Symbol.asyncIterator]() : A[Symbol.iterator]();
  return ic1({
      start() {}

function no(A) {
  if (A[Symbol.asyncIterator]) return A;
  let B = A.getReader();
  return {
      async next() {
          try {
              let Q = await B.read();
              if (Q ? .done) B.releaseLock();
              return Q
          }

async function ys0(A) {
  if (A === null || typeof A !== "object") return;
  if (A[Symbol.asyncIterator]) {
      await A[Symbol.asyncIterator]().return ? .();
      return
  }

function vs0(A) {
  let B = 0;
  for (let G of A) B += G.length;
  let Q = new Uint8Array(B),
      I = 0;
  for (let G of A) Q.set(G, I), I += G.length;
  return Q
}

function ao(A) {
  let B;
  return (xs0 ? ? (B = new globalThis.TextEncoder, xs0 = B.encode.bind(B)))(A)
}

function ac1(A) {
  let B;
  return (fs0 ? ? (B = new globalThis.TextDecoder, fs0 = B.decode.bind(B)))(A)
}

function vL6(A, B) {
  for (let G = B ? ? 0; G < A.length; G++) {
      if (A[G] === 10) return {
          preceding: G,
          index: G + 1,
          carriage: !1
      }

function bs0(A) {
  for (let I = 0; I < A.length - 1; I++) {
      if (A[I] === 10 && A[I + 1] === 10) return I + 2;
      if (A[I] === 13 && A[I + 1] === 13) return I + 2;
      if (A[I] === 13 && A[I + 1] === 10 && I + 3 < A.length && A[I + 2] === 13 && A[I + 3] === 10) return I + 4
  }

function hL6(A, B) {
  let Q = A.indexOf(B);
  if (Q !== -1) return [A.substring(0, Q), B, A.substring(Q + B.length)];
  return [A, "", ""]
}

function sc1(A, B) {
  if (!A || typeof A !== "object" || Array.isArray(A)) return A;
  return Object.defineProperty(A, "_request_id", {
      value: B.headers.get("request-id"),
      enumerable: !1
  }

function LJ1(A, B, Q) {
  return rc1(), new File(A, B ? ? "unknown_file", Q)
}

function ms0(A) {
  return (typeof A === "object" && A !== null && (("name" in A) && A.name && String(A.name) || ("url" in A) && A.url && String(A.url) || ("filename" in A) && A.filename && String(A.filename) || ("path" in A) && A.path && String(A.path)) || "").split(/[\\/]/).pop() || void 0
}

async function RJ1(A, B, Q) {
  if (rc1(), A = await A, dL6(A)) {
      if (A instanceof File) return A;
      return LJ1([await A.arrayBuffer()], A.name)
  }

async function oc1(A) {
  let B = [];
  if (typeof A === "string" || ArrayBuffer.isView(A) || A instanceof ArrayBuffer) B.push(A);
  else if (us0(A)) B.push(A instanceof Blob ? A : await A.arrayBuffer());
  else if (ds0(A))
      for await (let Q of A) B.push(...await oc1(Q));
  else {
      let Q = A ? .constructor ? .name;
      throw new Error(`Unexpected data type: ${typeof A}

function pL6(A) {
  if (typeof A !== "object" || A === null) return "";
  return `; props: [${Object.getOwnPropertyNames(A).map((Q)=>`"${Q}

function ls0(A) {
  return A.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent)
}

function B(Q, ...I) {
      if (Q.length === 1) return Q[0];
      let G = !1,
          Z = Q.reduce((F, X, V) => {
              if (/[?#]/.test(X)) G = !0;
              return F + X + (V === I.length ? "" : (G ? encodeURIComponent : A)(String(I[V])))
          }

function A() {
      if (this.receivedMessages.length === 0) throw new P9("stream ended without producing a Message with role=assistant");
      return this.receivedMessages.at(-1)
  }

function A() {
      if (this.receivedMessages.length === 0) throw new P9("stream ended without producing a Message with role=assistant");
      let B = this.receivedMessages.at(-1).content.filter((Q) => Q.type === "text").map((Q) => Q.text);
      if (B.length === 0) throw new P9("stream ended without producing a content block with type=text");
      return B.join(" ")
  }

function A() {
      if (this.ended) return;
      Q4(this, nR, void 0, "f")
  }

function A(B) {
      if (this.ended) return;
      let Q = X0(this, iX, "m", ns0).call(this, B);
      switch (this._emit("streamEvent", B, Q), B.type) {
          case "content_block_delta":
              {
                  let I = Q.content.at(-1);
                  switch (B.delta.type) {
                      case "text_delta":
                          {
                              if (I.type === "text") this._emit("text", B.delta.text, I.text || "");
                              break
                          }

function A() {
      if (this.ended) throw new P9("stream has ended, this shouldn't happen");
      let B = X0(this, nR, "f");
      if (!B) throw new P9("request ended without sending any chunks");
      return Q4(this, nR, void 0, "f"), B
  }

function A(B) {
      let Q = X0(this, nR, "f");
      if (B.type === "message_start") {
          if (Q) throw new P9(`Unexpected event order, got ${B.type}

function A() {
      if (this.receivedMessages.length === 0) throw new P9("stream ended without producing a Message with role=assistant");
      return this.receivedMessages.at(-1)
  }

function A() {
      if (this.receivedMessages.length === 0) throw new P9("stream ended without producing a Message with role=assistant");
      let B = this.receivedMessages.at(-1).content.filter((Q) => Q.type === "text").map((Q) => Q.text);
      if (B.length === 0) throw new P9("stream ended without producing a content block with type=text");
      return B.join(" ")
  }

function A() {
      if (this.ended) return;
      Q4(this, sR, void 0, "f")
  }

function A(B) {
      if (this.ended) return;
      let Q = X0(this, aX, "m", ts0).call(this, B);
      switch (this._emit("streamEvent", B, Q), B.type) {
          case "content_block_delta":
              {
                  let I = Q.content.at(-1);
                  switch (B.delta.type) {
                      case "text_delta":
                          {
                              if (I.type === "text") this._emit("text", B.delta.text, I.text || "");
                              break
                          }

function A() {
      if (this.ended) throw new P9("stream has ended, this shouldn't happen");
      let B = X0(this, sR, "f");
      if (!B) throw new P9("request ended without sending any chunks");
      return Q4(this, sR, void 0, "f"), B
  }

function A(B) {
      let Q = X0(this, sR, "f");
      if (B.type === "message_start") {
          if (Q) throw new P9(`Unexpected event order, got ${B.type}

function pJ1(A, B, Q) {
  if (A instanceof Error && A.message.includes(Vl1)) return eY({
      content: Xl1
  }

function Cl1(A) {
  if (A !== "refusal") return;
  return E1("tengu_refusal_api_response", {}

function Ir0(A, B) {
  return new Set([...A].filter((Q) => !B.has(Q)))
}

function Gr0(A, B) {
  return A.size > 0 && B.size > 0 && [...A].every((Q) => B.has(Q))
}

function IF1(A, B) {
  return Object.entries(B).reduce((Q, [I, G]) => {
      if (G && typeof G === "object") Q[I] = Q[I] ? { ...Q[I],
          ...G
      }

function JO6(A) {
  return fw.parse(JSON.parse(A))
}

function ZF1(A) {
  return JSON.stringify(A) + `
`
}

function VO6() {
  let A = {}

function CO6() {
  return "type" in DF1
}

function YF1(A) {
  if (typeof A == "function") throw new TypeError("`callbacks` must be an object, got a function instead. Did you mean `{onEvent: fn}

function F(E) {
      let N = D ? E.replace(/^\xEF\xBB\xBF/, "") : E,
          [q, O] = KO6(`${Z}

function X(E) {
      if (E === "") {
          C();
          return
      }

function V(E, N, q) {
      switch (E) {
          case "event":
              J = N;
              break;
          case "data":
              W = `${W}

function C() {
      W.length > 0 && B({
          id: Y,
          event: J || void 0,
          data: W.endsWith(`
`) ? W.slice(0, -1) : W
      }

function K(E = {}) {
      Z && E.consume && X(Z), D = !0, Y = void 0, W = "", J = "", Z = ""
  }

function KO6(A) {
  let B = [],
      Q = "",
      I = 0;
  for (; I < A.length;) {
      let G = A.indexOf("\r", I),
          Z = A.indexOf(`
`, I),
          D = -1;
      if (G !== -1 && Z !== -1 ? D = Math.min(G, Z) : G !== -1 ? D = G : Z !== -1 && (D = Z), D === -1) {
          Q = A.slice(I);
          break
      }

function HO6(A) {
  let B = globalThis.DOMException;
  return typeof B == "function" ? new B(A, "SyntaxError") : new SyntaxError(A)
}

function gl1(A) {
  return A instanceof Error ? "errors" in A && Array.isArray(A.errors) ? A.errors.map(gl1).join(", ") : ("cause" in A) && A.cause instanceof Error ? `${A}

function Jo0(A) {
  return {
      type: A.type,
      message: A.message,
      code: A.code,
      defaultPrevented: A.defaultPrevented,
      cancelable: A.cancelable,
      timeStamp: A.timeStamp
  }

function zO6() {
  let A = "document" in globalThis ? globalThis.document : void 0;
  return A && typeof A == "object" && "baseURI" in A && typeof A.baseURI == "string" ? A.baseURI : void 0
}

async function wO6(A) {
  return (await nl1).getRandomValues(new Uint8Array(A))
}

async function EO6(A) {
  let Q = "",
      I = await wO6(A);
  for (let G = 0; G < A; G++) {
      let Z = I[G] % 66;
      Q += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~" [Z]
  }

async function UO6(A) {
  return await EO6(A)
}

async function NO6(A) {
  let B = await (await nl1).subtle.digest("SHA-256", new TextEncoder().encode(A));
  return btoa(String.fromCharCode(...new Uint8Array(B))).replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "")
}

async function al1(A) {
  if (!A) A = 43;
  if (A < 43 || A > 128) throw `Expected a length between 43 and 128. Received ${A}

async function VK(A, {
  serverUrl: B,
  authorizationCode: Q
}) {
  let I = await rl1(B),
      G = await Promise.resolve(A.clientInformation());
  if (!G) {
      if (Q !== void 0) throw new Error("Existing OAuth client information is required when exchanging an authorization code");
      if (!A.saveClientInformation) throw new Error("OAuth client information must be saveable for dynamic registration");
      let W = await OO6(B, {
          metadata: I,
          clientMetadata: A.clientMetadata
      }

async function rl1(A, B) {
  var Q;
  let I = new URL("/.well-known/oauth-authorization-server", A),
      G;
  try {
      G = await fetch(I, {
          headers: {
              "MCP-Protocol-Version": (Q = B === null || B === void 0 ? void 0 : B.protocolVersion) !== null && Q !== void 0 ? Q : xj
          }

async function MO6(A, {
  metadata: B,
  clientInformation: Q,
  redirectUrl: I
}) {
  let D;
  if (B) {
      if (D = new URL(B.authorization_endpoint), !B.response_types_supported.includes("code")) throw new Error("Incompatible auth server: does not support response type code");
      if (!B.code_challenge_methods_supported || !B.code_challenge_methods_supported.includes("S256")) throw new Error("Incompatible auth server: does not support code challenge method S256")
  }

async function LO6(A, {
  metadata: B,
  clientInformation: Q,
  authorizationCode: I,
  codeVerifier: G,
  redirectUri: Z
}) {
  let Y;
  if (B) {
      if (Y = new URL(B.token_endpoint), B.grant_types_supported && !B.grant_types_supported.includes("authorization_code")) throw new Error("Incompatible auth server: does not support grant type authorization_code")
  }

async function RO6(A, {
  metadata: B,
  clientInformation: Q,
  refreshToken: I
}) {
  let Z;
  if (B) {
      if (Z = new URL(B.token_endpoint), B.grant_types_supported && !B.grant_types_supported.includes("refresh_token")) throw new Error("Incompatible auth server: does not support grant type refresh_token")
  }

async function OO6(A, {
  metadata: B,
  clientMetadata: Q
}) {
  let I;
  if (B) {
      if (!B.registration_endpoint) throw new Error("Incompatible auth server: does not support dynamic client registration");
      I = new URL(B.registration_endpoint)
  }

function zi1(A) {
  let B = [],
      Q = x1(),
      I = $S6(A),
      G = LF1[A.toLowerCase()];
  if (!G) return B;
  for (let Z of I) {
      if (!Q.existsSync(Z)) continue;
      for (let D of G) {
          let Y = new RegExp("^" + D + ".*$"),
              W = Q.readdirSync(Z).filter((J) => Y.test(J.name) && Q.statSync(Q3.join(Z, J.name)).isDirectory()).map((J) => Q3.join(Z, J.name));
          for (let J of W) {
              let F = kt.platform() === "linux" ? J : Q3.join(J, "plugins");
              if (Q.existsSync(F)) B.push(F)
          }

function MF1(A) {
  let B = Q3.join(A, "lib"),
      Q = x1();
  if (Q.existsSync(B)) {
      let I = Q.readdirSync(B),
          G = new RegExp("^claude-code-jetbrains-plugin-(\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9.]+)?)\\.jar$");
      for (let Z of I) {
          let D = Z.name.match(G);
          if (D) return D[1]
      }

function jt(A, B) {
  let Q = x1();
  if (!Q.existsSync(B)) Q.mkdirSync(B);
  let I = Q.readdirSync(A);
  for (let G of I) {
      let Z = Q3.join(A, G.name),
          D = Q3.join(B, G.name);
      if (Q.statSync(Z).isDirectory()) jt(Z, D);
      else Q.copyFileSync(Z, D)
  }

function yt(A) {
  let B = x1();
  if (B.existsSync(A)) B.readdirSync(A).forEach((Q) => {
      let I = Q3.join(A, Q.name);
      if (B.statSync(I).isDirectory()) yt(I);
      else B.unlinkSync(I)
  }

async function De0(A, B) {
  let Q = x1(),
      I = [];
  if (!Q.existsSync(B) || !Q.statSync(B).isDirectory()) {
      E1("tengu_ext_jetbrains_extension_install_source_missing", {}

async function Ye0(A, B) {
  let Q = x1(),
      I = [];
  if (!LF1[A.toLowerCase()]) throw E1("tengu_ext_jetbrains_extension_install_unknown_ide", {}

function We0(A) {
  let B = zi1(A);
  for (let Q of B) {
      let I = Q3.join(Q, Hi1);
      if (x1().existsSync(I)) return !0
  }

function bw() {
  return xt.createElement(P, {
      color: "permission"
  }

function Je0({
  onDone: A,
  installedVersion: B
}) {
  let Q = Y2();
  qS6(), Z0((Y, W) => {
      if (W.escape || W.return) A()
  }

function wi1() {
  let A = ZA(),
      B = mA.terminal || "unknown";
  return A.hasIdeOnboardingBeenShown ? .[B] === !0
}

function qS6() {
  if (wi1()) return;
  let A = mA.terminal || "unknown",
      B = ZA();
  j0({ ...B,
      hasIdeOnboardingBeenShown: { ...B.hasIdeOnboardingBeenShown,
          [A]: !0
      }

function Ce0(A) {
  try {
      return process.kill(A, 0), !0
  }

function OS6(A) {
  if (!Ce0(A)) return !1;
  if (!tR && !hZ) return !0;
  try {
      let B = process.ppid;
      for (let Q = 0; Q < 10; Q++) {
          if (B === A) return !0;
          if (B === 0 || B === 1) break;
          let I = NZ(`ps -o ppid= -p ${B}

function Ke0() {
  try {
      return TS6().flatMap((Q) => {
          try {
              return x1().readdirSync(Q).filter((I) => I.name.endsWith(".lock")).map((I) => {
                  let G = vt(Q, I.name);
                  return {
                      path: G,
                      mtime: x1().statSync(G).mtime
                  }

function He0(A) {
  try {
      let B = x1().readFileSync(A, {
              encoding: "utf-8"
          }

async function Ei1(A, B, Q = 500) {
  try {
      return new Promise((I) => {
          let G = RS6({
              host: A,
              port: B,
              timeout: Q
          }

function TS6() {
  let A = [],
      B = x1(),
      Q = Z7(),
      I = vt(S4(), "ide");
  if (B.existsSync(I)) A.push(I);
  if (Q !== "wsl") return A;
  let G = process.env.USERPROFILE;
  if (G) {
      let Z = G.replace(/\\/g, "/").replace(/^([A-Z]):/i, (Y, W) => `/mnt/${W.toLowerCase()}

async function PS6() {
  try {
      let A = Ke0();
      for (let B of A) {
          let Q = He0(B);
          if (!Q) {
              try {
                  x1().unlinkSync(B)
              }

function KK() {
  return tR || hZ || Boolean(process.env.FORCE_CODE_TERMINAL)
}

async function ze0(A) {
  if (!Ez()) return [() => {}

async function _S6() {
  if (!KK()) return null;
  try {
      let A = await yS6();
      E1("tengu_ext_installed", {}

async function Fe0() {
  if (RF1) RF1.abort();
  RF1 = new AbortController;
  let A = RF1.signal;
  await PS6();
  let B = Date.now();
  while (Date.now() - B < 30000 && !A.aborted) {
      let Q = await bt(!1);
      if (A.aborted) return null;
      if (Q.length) return Q[0];
      await new Promise((I) => setTimeout(I, 1000))
  }

async function bt(A) {
  let B = [];
  try {
      let Q = process.env.CLAUDE_CODE_SSE_PORT,
          I = Q ? parseInt(Q) : null,
          G = e9(),
          Z = Ke0();
      for (let D of Z) {
          let Y = He0(D);
          if (!Y) continue;
          if (Z7() !== "wsl" && KK() && (!Y.pid || !OS6(Y.pid))) continue;
          let W = !1;
          if (process.env.CLAUDE_CODE_IDE_SKIP_VALID_CHECK === "true") W = !0;
          else if (I && Y.port === I) W = !0;
          else W = Y.workspaceFolders.some((V) => {
              if (!V) return !1;
              let C = pm(V);
              return G === C || G.startsWith(C + Xe0)
          }

async function we0(A) {
  await A.notification({
      method: "ide_connected",
      params: {
          pid: process.pid
      }

function OF1(A) {
  return A.some((B) => B.type === "connected" && B.name === "ide")
}

async function Ni1() {
  if (tR) {
      let A = Ne0();
      if (A) try {
          if ((await PD(A, ["--list-extensions"], {
                  env: um()
              }

async function yS6() {
  if (tR) {
      let A = Ne0();
      if (A)
          if ((await xC("tengu-ext-vscode-install-from-marketplace", void 0)) ? .fromMarketplace) {
              let Q = await PD(A, ["--force", "--install-extension", "anthropic.claude-code"], {
                  env: um()
              }

function um() {
  if (Z7() === "linux") return { ...process.env,
      DISPLAY: ""
  }

function Ee0() {
  return {
      ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
      PACKAGE_URL: "@elizaos/code",
      README_URL: "https://eliza.how",
      VERSION: "1.0.34"
  }

async function Ue0(A) {
  let {
      stdout: B
  }

function kS6() {
  try {
      if (Z7() !== "macos") return null;
      let B = process.ppid;
      for (let Q = 0; Q < 10; Q++) {
          if (!B || B === 0 || B === 1) break;
          let I = NZ(`ps -o command= -p ${B}

function Ne0() {
  let A = kS6();
  if (A) {
      if (x1().existsSync(A)) return A
  }

function xS6(A) {
  return
}

async function fS6() {
  for (let A of ["code", "cursor", "windsurf"]) try {
      await vS6(A)
  }

async function vS6(A) {
  let B = await Ue0(A);
  if (B && Ve0.lte(B, Ee0())) {
      let [Q, I] = await ze0("claude-code.vsix");
      try {
          await new Promise((G) => {
              setTimeout(G, 500)
          }

function TF1(A) {
  let Q = A.find((I) => I.type === "connected" && I.name === "ide") ? .config;
  return Q ? .type === "sse-ide" || Q ? .type === "ws-ide" ? Q.ideName : null
}

function ft(A) {
  switch (A) {
      case "vscode":
          return "VS Code";
      case "cursor":
          return "Cursor";
      case "windsurf":
          return "Windsurf";
      case "pycharm":
          return "PyCharm";
      case "intellij":
          return "IntelliJ IDEA";
      case "webstorm":
          return "WebStorm";
      case "phpstorm":
          return "PhpStorm";
      case "rubymine":
          return "RubyMine";
      case "clion":
          return "CLion";
      case "goland":
          return "GoLand";
      case "rider":
          return "Rider";
      case "datagrip":
          return "DataGrip";
      case "appcode":
          return "AppCode";
      case "dataspell":
          return "DataSpell";
      case "aqua":
          return "Aqua";
      case "gateway":
          return "Gateway";
      case "fleet":
          return "Fleet";
      case "androidstudio":
          return "Android Studio";
      default:
          return TU1(A)
  }

function IW(A) {
  if (!A) return;
  let B = A.find((Q) => Q.type === "connected" && Q.name === "ide");
  return B ? .type === "connected" ? B : void 0
}

async function Le0(A) {
  try {
      await gw("closeAllDiffTabs", {}

async function Re0(A, B, Q) {
  if (!KK()) {
      if ((await xC("tengu-ext-always-upgrade-fixed", void 0)) ? .upgrade) await fS6(), await De0("0.1.9-beta", pm(Ui1, "vendor", "claude-code-jetbrains-plugin"))
  }

function ID2(A) {
  if (A[Symbol.asyncIterator]) return A;
  let B = A.getReader();
  return {
      async next() {
          try {
              let Q = await B.read();
              if (Q ? .done) B.releaseLock();
              return Q
          }

function cV1(A) {
  return A != null && typeof A === "object" && !Array.isArray(A)
}

function Co6(A) {
  return typeof A === "object" && A !== null && (("name" in A) && A.name === "AbortError" || ("message" in A) && String(A.message).includes("FetchRequestCanceledException"))
}

function FD2(A) {
  return A.replace(/[^A-Za-z0-9\-._~!$&'()*+,;=:@]+/g, encodeURIComponent)
}

function B(Q, ...I) {
      if (Q.length === 1) return Q[0];
      let G = !1,
          Z = Q.reduce((F, X, V) => {
              if (/[?#]/.test(X)) G = !0;
              return F + X + (V === I.length ? "" : (G ? encodeURIComponent : A)(String(I[V])))
          }

function Eo6(A) {
  let B = new WK(A);
  return delete B.batches, delete B.countTokens, B
}

function Uo6(A) {
  let B = new nX(A);
  return delete B.promptCaching, delete B.messages.batches, delete B.messages.countTokens, B
}

function _C1(A) {
  return A != null && typeof A === "object" && !Array.isArray(A)
}

function A45(A) {
  let B = new WK(A);
  return delete B.batches, B
}

function B45(A) {
  let B = new nX(A);
  return delete B.messages.batches, B
}

async function TK({
  apiKey: A,
  maxRetries: B = 0,
  model: Q,
  isNonInteractiveSession: I,
  isSmallFastModel: G = !1
}) {
  let Z = {
      "x-app": "cli",
      "User-Agent": MR(),
      ...I45()
  }

function Q45(A) {
  let B = process.env.ANTHROPIC_AUTH_TOKEN || dS();
  if (B) A.Authorization = `Bearer ${B}

function I45() {
  let A = {}

async function EV2(A, B) {
  if (!A) return 0;
  return yC1([{
      role: "user",
      content: A
  }

async function yC1(A, B) {
  try {
      if (!A || A.length === 0) return 0;
      let Q = J7(),
          I = await TK({
              maxRetries: 1,
              model: Q,
              isNonInteractiveSession: B
          }

function AE(A) {
  return A.length / 4
}

function Go1() {
  return parseInt(process.env.MAX_MCP_OUTPUT_TOKENS ? ? "25000", 10)
}

function Z45(A) {
  return A.type === "text"
}

function D45(A) {
  return A.type === "image"
}

function Y45(A) {
  if (!A) return 0;
  if (typeof A === "string") return AE(A);
  return A.reduce((B, Q) => {
      if (Z45(Q)) return B + AE(Q.text);
      else if (D45(Q)) return B + 1600;
      return B
  }

async function Zo1(A, B, Q) {
  if (!A) return;
  if (Y45(A) <= Go1() * G45) return;
  try {
      let Z = await yC1(typeof A === "string" ? [{
          role: "user",
          content: A
      }

function NO() {
  return $V2.default.createElement(P, {
      color: "secondaryText"
  }

function MV2() {
  return UA.dim(qV2)
}

function c9() {
  let A = N31(),
      [B, Q] = kC1.useState({
          columns: process.stdout.columns || 80,
          rows: process.stdout.rows || 24
      }

function I() {
          Q({
              columns: process.stdout.columns || 80,
              rows: process.stdout.rows || 24
          }

function W45(A) {
  try {
      let B = JSON.parse(A);
      return JSON.stringify(B, null, 2)
  }

function LV2(A) {
  return A.split(`
`).map(W45).join(`
`)
}

function F45(A, B) {
  let Q = A.split(`
`),
      I = [];
  for (let G of Q)
      if (G.length <= B) I.push(G.trimEnd());
      else
          for (let Z = 0; Z < G.length; Z += B) I.push(G.slice(Z, Z + B).trimEnd());
  return {
      aboveTheFold: I.slice(0, RV2).join(`
`),
      remainingLines: I.slice(RV2).length
  }

function X45(A, B) {
  let Q = A.trimEnd();
  if (!Q) return "";
  let {
      aboveTheFold: I,
      remainingLines: G
  }

function BE({
  content: A,
  verbose: B,
  isError: Q
}) {
  let {
      columns: I
  }

async function d65() {
  let {
      min: A,
      max: B
  }

function qO(A, B) {
  let Q = JSON.stringify({
          type: B.type,
          url: B.url,
          headers: B.headers || {}

async function iC1(A, B) {
  let I = VJ().read();
  if (!I ? .mcpOAuth) return;
  let G = qO(A, B),
      Z = I.mcpOAuth[G];
  if (!Z ? .accessToken) {
      p2(A, "No tokens to revoke");
      return
  }

function VC2(A, B) {
  let Q = VJ(),
      I = Q.read();
  if (!I ? .mcpOAuth) return;
  let G = qO(A, B);
  if (I.mcpOAuth[G]) delete I.mcpOAuth[G], Q.update(I), p2(A, "Cleared stored tokens")
}

async function Ko1(A, B, Q) {
  VC2(A, B), E1("tengu_mcp_oauth_flow_start", {
      isOAuthFlow: !0
  }

function nC1(A) {
  switch (A) {
      case "local":
          return "Local (private to you in this project)";
      case "project":
          return "Project (shared via .mcp.json)";
      case "user":
          return "User (available in all your projects)";
      default:
          return A
  }

function cd(A) {
  if (!A) return "local";
  if (!ef1.options.includes(A)) throw new Error(`Invalid scope: ${A}

function Ho1(A) {
  if (!A) return "stdio";
  if (A !== "stdio" && A !== "sse" && A !== "http") throw new Error(`Invalid transport type: ${A}

function LO(A, B, Q = "local") {
  if (Q === "project") {
      let G = {
          mcpServers: { ...vC()
          }

function zo1(A, B, Q = "local") {
  if (A.match(/[^a-zA-Z0-9_-]/)) throw new Error(`Invalid name ${A}

function aC1(A, B = "local") {
  if (B === "project") {
      let Q = vC();
      if (!Q[A]) throw new Error(`No MCP server found with name: ${A}

function sC1(A) {
  let B = m9(),
      Q = vC(),
      I = ZA();
  if (B.mcpServers ? .[A]) return { ...B.mcpServers[A],
      scope: "local"
  }

function rC1(A) {
  let B = m6();
  if (B ? .disabledMcpjsonServers ? .includes(A)) return "rejected";
  if (B ? .enabledMcpjsonServers ? .includes(A) || B ? .enableAllProjectMcpServers) return "approved";
  return "pending"
}

function wo1(A) {
  try {
      if (!x1().existsSync(A)) throw new Error(`MCP config file not found: ${A}

function oC1(A) {
  let B = {}

function p65() {
  return parseInt(process.env.MCP_TOOL_TIMEOUT || "", 10) || 1e8
}

function CC2() {
  return parseInt(process.env.MCP_TIMEOUT || "", 10) || 30000
}

function l65(A) {
  return !A.name.startsWith("mcp__ide__") || c65.includes(A.name)
}

function KC2(A, B) {
  return `${A}

async function tC1(A, B) {
  let Q = KC2(A, B);
  try {
      let I = await ue(A, B);
      if (I.type === "connected") await I.cleanup()
  }

async function HC2(A, B) {
  return await tC1(A, B), ue(A, B)
}

async function gw(A, B, Q, I) {
  return wC2({
      client: Q,
      tool: A,
      args: B,
      signal: new AbortController().signal,
      isNonInteractiveSession: I
  }

async function pe(A, B, Q) {
  let I = await HC2(A, B);
  if (I.type !== "connected") {
      Q({
          client: I,
          tools: [],
          commands: []
      }

async function eC1(A, B) {
  let Q = !1,
      I = DV(),
      G = B ? { ...I,
          ...B
      }

function No1(A, B) {
  switch (A.type) {
      case "text":
          return [{
              type: "text",
              text: A.text
          }

async function wC2({
  client: {
      client: A,
      name: B
  },
  tool: Q,
  args: I,
  signal: G,
  isNonInteractiveSession: Z
}) {
  try {
      p2(B, `Calling MCP tool: ${Q}

function YW({
  code: A,
  language: B
}) {
  let Q = $K1.useMemo(() => {
      let I = kv(A);
      try {
          if (Au.supportsLanguage(B)) return Au.highlight(I, {
              language: B
          }

async function Qw2() {
  if (xK1) return xK1.default;
  if (Ez()) try {
      let Q = await Promise.resolve().then(() => (_H2(), SH2)),
          I = Q.sharp || Q.default;
      return xK1 = {
          default: I
      }

async function Y11(A, B, Q) {
  try {
      let I = await Promise.resolve().then(() => I1(kK1(), 1)),
          Z = (I.default || I)(A),
          D = await Z.metadata();
      if (!D.width || !D.height) {
          if (B > Kt1) return {
              buffer: await Z.jpeg({
                  quality: 80
              }

function W11(A) {
  let B = A.split(`
`),
      Q = 0;
  while (Q < B.length && B[Q] ? .trim() === "") Q++;
  let I = B.length - 1;
  while (I >= 0 && B[I] ? .trim() === "") I--;
  if (Q > I) return "";
  return B.slice(Q, I + 1).join(`
`)
}

function bO(A) {
  let B = /^data:image\/[a-z0-9.+_-]+;base64,/i.test(A);
  if (B) return {
      totalLines: 1,
      truncatedContent: A,
      isImage: B
  }

function gK1(A) {
  if (tf1() || !eF(dA(), A)) {
      if (EX(e9()), !tf1()) return E1("bash_tool_reset_to_original_dir", {}

async function Iw2(A, B, Q) {
  let G = (await cZ({
      systemPrompt: [`Extract any file paths that this command reads or modifies. For commands like "git diff" and "cat", include the paths of files being shown. Use paths verbatim -- don't add any slashes or try to resolve them. Do not try to infer paths that were not explicitly listed in the command output.

IMPORTANT: Commands that do not display the contents of the files should not return any filepaths. For eg. "ls", pwd", "find". Even more complicated commands that don't display the contents should not be considered: eg "find . -type f -exec ls -la {}

function Ht1(A) {
  if (!A) return "";
  let B = Array.isArray(A) ? A.join("") : A,
      {
          truncatedContent: Q
      }

function pG5(A) {
  if (typeof A["image/png"] === "string") return {
      image_data: A["image/png"].replace(/\s/g, ""),
      media_type: "image/png"
  }

function cG5(A) {
  switch (A.output_type) {
      case "stream":
          return {
              output_type: A.output_type,
              text: Ht1(A.text)
          }

function Gw2(A, B, Q, I) {
  let G = A.id ? ? `cell-${B}

function lG5(A) {
  let B = [];
  if (A.cellType !== "code") B.push(`<cell_type>${A.cellType}

function iG5(A) {
  let B = [];
  if (A.text) B.push({
      text: `
${A.text}

function nG5(A) {
  let B = lG5(A),
      Q = A.outputs ? .flatMap(iG5);
  return [B, ...Q ? ? []]
}

function zt1(A, B) {
  let Q = oM(A);
  if (!Q) throw new Error("Invalid notebook path");
  let I = x1().readFileSync(Q, {
          encoding: "utf-8"
      }

function wt1(A, B) {
  let Q = A.flatMap(nG5);
  return {
      tool_use_id: B,
      type: "tool_result",
      content: Q.reduce((I, G) => {
          if (I.length === 0) return [G];
          let Z = I[I.length - 1];
          if (Z && Z.type === "text" && G.type === "text") return Z.text += `
` + G.text, I;
          return [...I, G]
      }

function Yu(A) {
  let B = A.match(/^cell-(\d+)$/);
  if (B && B[1]) {
      let Q = parseInt(B[1], 10);
      return isNaN(Q) ? void 0 : Q
  }

async function eG5(A, B, {
  isNonInteractiveSession: Q,
  maxSizeBytes: I = mK1,
  maxTokens: G = Zw2
}) {
  if (!hK1.has(B) && A.length > I) throw new Error(Ut1(A.length, I));
  let Z = AE(A);
  if (!Z || Z <= G / 4) return;
  let D = await EV2(A, Q);
  if (D && D > G) throw new dK1(D, G)
}

function Jy(A, B, Q) {
  return {
      type: "image",
      file: {
          base64: A.toString("base64"),
          type: `image/${B}

async function AZ5(A, B) {
  try {
      let Q = await BZ5(A, B),
          I = await QZ5(Q);
      if (I) return I;
      if (Q.format === "png") {
          let Z = await GZ5(Q);
          if (Z) return Z
      }

async function BZ5(A, B) {
  let Q = x1().statSync(A),
      I = await Qw2(),
      G = x1().readFileBytesSync(A),
      Z = await I(G).metadata(),
      D = Z.format || "jpeg",
      Y = Math.floor(B / 0.125),
      W = Math.floor(Y * 0.75);
  return {
      imageBuffer: G,
      metadata: Z,
      format: D,
      maxBytes: W,
      originalSize: Q.size,
      sharp: I
  }

async function QZ5(A) {
  let B = [1, 0.75, 0.5, 0.25];
  for (let Q of B) {
      let I = Math.round((A.metadata.width || 2000) * Q),
          G = Math.round((A.metadata.height || 2000) * Q),
          Z = A.sharp(A.imageBuffer).resize(I, G, {
              fit: "inside",
              withoutEnlargement: !0
          }

function IZ5(A, B) {
  switch (B) {
      case "png":
          return A.png({
              compressionLevel: 9,
              palette: !0
          }

async function GZ5(A) {
  let B = await A.sharp(A.imageBuffer).resize(800, 800, {
      fit: "inside",
      withoutEnlargement: !0
  }

async function ZZ5(A, B) {
  let Q = await A.sharp(A.imageBuffer).resize(600, 600, {
      fit: "inside",
      withoutEnlargement: !0
  }

async function DZ5(A) {
  let B = await A.sharp(A.imageBuffer).resize(400, 400, {
      fit: "inside",
      withoutEnlargement: !0
  }

async function YZ5(A) {
  let B = await Promise.resolve().then(() => I1(kK1(), 1)),
      I = await (B.default || B)(x1().readFileBytesSync(A)).resize(400, 400, {
          fit: "inside",
          withoutEnlargement: !0
      }

async function WZ5(A, B) {
  try {
      let I = x1().statSync(A).size;
      if (I === 0) throw new Error(`Image file is empty: ${A}

function CZ5(A, B, Q, I = [], G) {
  let Z = [],
      D = 0,
      Y = jv(G),
      W = Y.get(B);
  if (W) W.push(...I);
  else Y.set(B, [...I]);
  let J = new Map;
  for (let [X, V] of Y.entries())
      if (V.length > 0) {
          let C = Xw2.default().add(V);
          J.set(X, C)
      }

function KZ5(A) {
  let B = [];
  for (let Q of A) {
      let I = Q.split(gO),
          G = B,
          Z = "";
      for (let D = 0; D < I.length; D++) {
          let Y = I[D];
          if (!Y) continue;
          Z = Z ? `${Z}

function Vw2(A, B = 0, Q = "") {
  let I = "";
  if (B === 0) I += `- ${dA()}

function Fw2(A, B, Q) {
  if (A !== "." && JZ5(A).startsWith(".")) return !0;
  if (A.includes(`__pycache__${gO}

function Ew2(A) {
  Xy = A
}

function X8(A, B = "") {
  let Q = typeof A === "string" ? A : A.source,
      I = {
          replace: (G, Z) => {
              let D = typeof Z === "string" ? Z : Z.source;
              return D = D.replace(iD.caret, "$1"), Q = Q.replace(G, D), I
          }

function JE(A, B) {
  if (B) {
      if (iD.escapeTest.test(A)) return A.replace(iD.escapeReplace, Kw2)
  }

function Hw2(A) {
  try {
      A = encodeURI(A).replace(iD.percentDecode, "%")
  }

function zw2(A, B) {
  let Q = A.replace(iD.findPipe, (Z, D, Y) => {
          let W = !1,
              J = D;
          while (--J >= 0 && Y[J] === "\\") W = !W;
          if (W) return "|";
          else return " |"
      }

function V11(A, B, Q) {
  let I = A.length;
  if (I === 0) return "";
  let G = 0;
  while (G < I)
      if (A.charAt(I - G - 1) === B) G++;
      else break;
  return A.slice(0, I - G)
}

function nZ5(A, B) {
  if (A.indexOf(B[1]) === -1) return -1;
  let Q = 0;
  for (let I = 0; I < A.length; I++)
      if (A[I] === "\\") I++;
      else if (A[I] === B[0]) Q++;
  else if (A[I] === B[1]) {
      if (Q--, Q < 0) return I
  }

function ww2(A, B, Q, I, G) {
  let Z = B.href,
      D = B.title || null,
      Y = A[1].replace(G.other.outputLinkReplace, "$1");
  if (A[0].charAt(0) !== "!") {
      I.state.inLink = !0;
      let W = {
          type: "link",
          raw: Q,
          href: Z,
          title: D,
          text: Y,
          tokens: I.inlineTokens(Y)
      }

function aZ5(A, B, Q) {
  let I = A.match(Q.other.indentCodeCompensation);
  if (I === null) return B;
  let G = I[1];
  return B.split(`
`).map((Z) => {
      let D = Z.match(Q.other.beginningSpace);
      if (D === null) return Z;
      let [Y] = D;
      if (Y.length >= G.length) return Z.slice(G.length);
      return Z
  }

function r5(A, B) {
  return Fy.parse(A, B)
}

function kK(A, B) {
  return r5.lexer(U11(A)).map((Q) => aD(Q, B)).join("").trim()
}

function aD(A, B, Q = 0, I = null, G = null) {
  switch (A.type) {
      case "blockquote":
          return UA.dim.italic((A.tokens ? ? []).map((Z) => aD(Z, B)).join(""));
      case "code":
          if (A.lang && E11.supportsLanguage(A.lang)) return E11.highlight(A.text, {
              language: A.lang
          }

function oZ5(A, B) {
  switch (A) {
      case 0:
      case 1:
          return B.toString();
      case 2:
          return sZ5[B - 1];
      case 3:
          return rZ5[B - 1];
      default:
          return B.toString()
  }

function oK1(A) {
  return A.type !== "progress" && A.type !== "attachment" && A.type !== "system" && Array.isArray(A.message.content) && A.message.content[0] ? .type === "text" && Pt1.has(A.message.content[0].text)
}

function AD5(A) {
  return A.type === "assistant" && A.isApiErrorMessage === !0 && A.message.model === "<synthetic>"
}

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
}) {
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
      }

function xK({
  content: A,
  usage: B
}) {
  return jw2({
      content: typeof A === "string" ? [{
          type: "text",
          text: A === "" ? AW : A
      }

function eY({
  content: A
}) {
  return jw2({
      content: [{
          type: "text",
          text: A === "" ? AW : A
      }

function K2({
  content: A,
  isMeta: B,
  isCompactSummary: Q,
  toolUseResult: I
}) {
  return {
      type: "user",
      message: {
          role: "user",
          content: A || AW
      }

function St1({
  toolUse: A = !1,
  hardcodedMessage: B = void 0
}) {
  let Q;
  if (B !== void 0) Q = B;
  else if (A) Q = VV;
  else Q = Wu;
  return K2({
      content: [{
          type: "text",
          text: Q
      }

function yw2({
  toolUseID: A,
  parentToolUseID: B,
  data: Q
}) {
  return {
      type: "progress",
      data: Q,
      toolUseID: A,
      parentToolUseID: B,
      uuid: mO(),
      timestamp: new Date().toISOString()
  }

function kw2(A) {
  return {
      type: "tool_result",
      content: Ju,
      is_error: !0,
      tool_use_id: A
  }

function mG(A, B) {
  if (!A.trim() || !B.trim()) return null;
  let Q = B.replace(/[.*+?^${}

function Vy(A) {
  if (A.type === "progress" || A.type === "attachment" || A.type === "system") return !0;
  if (typeof A.message.content === "string") return A.message.content.trim().length > 0;
  if (A.message.content.length === 0) return !1;
  if (A.message.content.length > 1) return !0;
  if (A.message.content[0].type !== "text") return !0;
  return A.message.content[0].text.trim().length > 0 && A.message.content[0].text !== AW && A.message.content[0].text !== VV
}

function AQ(A) {
  let B = !1;
  return A.flatMap((Q) => {
      switch (Q.type) {
          case "assistant":
              return B = B || Q.message.content.length > 1, Q.message.content.map((I) => {
                  let G = B ? mO() : Q.uuid;
                  return {
                      type: "assistant",
                      timestamp: new Date().toISOString(),
                      message: { ...Q.message,
                          content: [I]
                      }

function BD5(A) {
  return A.type === "assistant" && A.message.content.some((B) => B.type === "tool_use")
}

function _t1(A, B) {
  let Q = [],
      I = [];
  for (let G of A) {
      if (BD5(G)) I.push(G);
      if (G.type === "user" && Array.isArray(G.message.content) && G.message.content[0] ? .type === "tool_result") {
          let Z = G.message.content[0] ? .tool_use_id,
              D = I.find((Y) => Y.message.content[0] ? .id === Z);
          if (D) {
              Q.splice(Q.indexOf(D) + 1, 0, G);
              continue
          }

function xw2(A, B) {
  let Q = M11(A);
  if (!Q) return new Set;
  let I = B.find((D) => D.type === "assistant" && D.message.content.some((Y) => Y.type === "tool_use" && Y.id === Q));
  if (!I) return new Set;
  let G = I.message.id,
      Z = B.filter((D) => D.type === "assistant" && D.message.id === G);
  return new Set(Z.flatMap((D) => D.message.content.filter((Y) => Y.type === "tool_use").map((Y) => Y.id)))
}

function tK1(A) {
  let B = Fu(A),
      Q = QD5(A);
  return Ir0(Q, new Set(Object.keys(B)))
}

function eK1(A) {
  let B = Fu(A);
  return new Set(A.filter((Q) => Q.type === "assistant" && Array.isArray(Q.message.content) && Q.message.content[0] ? .type === "tool_use" && (Q.message.content[0] ? .id in B) && B[Q.message.content[0] ? .id] === !0).map((Q) => Q.message.content[0].id))
}

function JW(A) {
  let B = [];
  return A.filter((Q) => {
      if (Q.type === "progress" || Q.type === "system" || AD5(Q)) return !1;
      return !0
  }

function ID5(A, B) {
  let Q = rK1(A.message.content),
      I = rK1(B.message.content);
  return { ...A,
      message: { ...A.message,
          content: DD5(Q, I)
      }

function GD5(A, B) {
  return { ...A,
      message: { ...A.message,
          content: [...A.message.content, ...B.message.content]
      }

function ZD5(A, B) {
  let Q = rK1(A.message.content),
      I = rK1(B.message.content);
  return { ...A,
      message: { ...A.message,
          content: [...Q, ...I]
      }

function rK1(A) {
  if (typeof A === "string") return [{
      type: "text",
      text: A
  }

function DD5(A, B) {
  let Q = UD(A);
  if (Q ? .type === "tool_result" && typeof Q.content === "string" && B.every((I) => I.type === "text")) return [...A.slice(0, -1), { ...Q,
      content: [Q.content, ...B.map((I) => I.text)].map((I) => I.trim()).filter(Boolean).join(`

`)
  }

function q11(A) {
  return A.map((B) => {
      switch (B.type) {
          case "tool_use":
              if (typeof B.input !== "string" && !pB(B.input)) throw new Error("Tool use input must be a string or object");
              return { ...B,
                  input: typeof B.input === "string" ? Z8(B.input) ? ? {}

function AH1(A) {
  return U11(A).trim() === "" || A.trim() === AW
}

function U11(A) {
  let B = new RegExp(`<(${YD5.join("|")}

function M11(A) {
  switch (A.type) {
      case "attachment":
          return null;
      case "assistant":
          if (A.message.content[0] ? .type !== "tool_use") return null;
          return A.message.content[0].id;
      case "user":
          if (A.message.content[0] ? .type !== "tool_result") return null;
          return A.message.content[0].tool_use_id;
      case "progress":
          return A.toolUseID;
      case "system":
          return A.toolUseID ? ? null
  }

function fw2(A) {
  let B = AQ(A),
      Q = tK1(B);
  return B.filter((G, Z) => {
      if (G.type === "assistant" && G.message.content[0] ? .type === "tool_use" && Q.has(G.message.content[0].id)) return !1;
      return !0
  }

function BH1(A) {
  if (A.type !== "assistant") return null;
  if (Array.isArray(A.message.content)) return A.message.content.filter((B) => B.type === "text").map((B) => B.type === "text" ? B.text : "").join(`
`).trim() || null;
  return null
}

function vw2(A) {
  if (A.type !== "user") return null;
  let B = A.message.content;
  if (typeof B === "string") return B;
  if (Array.isArray(B)) return B.filter((Q) => Q.type === "text").map((Q) => Q.type === "text" ? Q.text : "").join(`
`).trim() || null;
  return null
}

function bw2(A, B) {
  let Q = M11(A);
  if (!Q) return [];
  return B.filter((I) => I.type === "progress" && I.parentToolUseID === Q)
}

function jt1(A, B, Q, I, G) {
  if (A.type !== "stream_event" && A.type !== "stream_request_start") {
      B(A);
      return
  }

function WD5(A) {
  switch (A.type) {
      case "command_permissions":
          return [];
      case "new_directory":
          return [sK1(WE.name, {
              path: A.path
          }

function aK1(A, B) {
  try {
      let Q = A.mapToolResultToToolResultBlockParam(B, "1");
      if (Array.isArray(Q.content) && Q.content.some((I) => I.type === "image")) return K2({
          content: Q.content,
          isMeta: !0
      }

function sK1(A, B) {
  return K2({
      content: `Called the ${A}

function L11(A, B, Q, I) {
  return {
      type: "system",
      content: A,
      isMeta: !1,
      timestamp: new Date().toISOString(),
      uuid: mO(),
      toolUseID: Q,
      level: B,
      ...I && {
          preventContinuation: I
      }

function gw2({
  command: A,
  elapsedTimeSeconds: B,
  onOptionSelected: Q
}) {
  let [I] = q9(), [G, Z] = K5.useState(B);
  K5.useEffect(() => {
      let J = setInterval(() => {
          Z((F) => F + 1)
      }

function W(J) {
      switch (J) {
          case "wait":
              Q("wait");
              break;
          case "background":
              Q("background");
              break;
          case "kill":
              Q("kill");
              break
      }

function bt1(A) {
  let B = [];
  for (let G of vt1.parse(A.replaceAll('"', `"${xt1}

function gt1(A) {
  return A.filter((B) => !JD5.has(B))
}

function Cy(A) {
  let B = bt1(A);
  for (let I = 0; I < B.length; I++) {
      let G = B[I];
      if (G === void 0) continue;
      if (G === ">&" || G === ">") {
          let Z = B[I - 1] ? .trim(),
              D = B[I + 1] ? .trim();
          if (Z === void 0 || D === void 0) continue;
          if (G === ">&" && ft1.has(D) || G === ">" && D === "/dev/null") {
              if (ft1.has(Z.charAt(Z.length - 1))) B[I - 1] = Z.slice(0, -1).trim();
              B[I] = void 0, B[I + 1] = void 0
          }

function FD5(A) {
  let B = vt1.parse(A.replaceAll('"', `"${xt1}

function uw2(A) {
  return Cy(A).length > 1 && !FD5(A)
}

function Vu({
  content: A,
  verbose: B
}) {
  let {
      stdout: Q,
      stderr: I,
      isImage: G,
      returnCodeInterpretation: Z
  }

async function XD5(A, B, Q, I) {
  let G = B.join(" ").trim(),
      Z = await I({ ...A,
          command: G
      }

async function cw2(A, B) {
  if (uw2(A.command)) return {
      behavior: "ask",
      message: `Autocoder requested permissions to use ${E4.name}

function ht1(A, B, Q) {
  let I = Cy(A.command);
  for (let G of I) {
      let [Z, ...D] = G.split(" ");
      if (Z === "cd" && D.length > 0) {
          let Y = D.join(" ").replace(/^['"]|['"]$/g, ""),
              W = VD5(Y) ? Y : CD5(B, Y);
          if (!ZvA(lw2(Q, W), lw2(B, Q))) return {
              behavior: "ask",
              message: `ERROR: cd to '${W}

function QH1(A) {
  return [{
      toolName: E4.name,
      ruleContent: A
  }

function HD5(A) {
  return [{
      toolName: E4.name,
      ruleContent: KD5(A)
  }

function zD5(A) {
  let B = mt1(A);
  if (B !== null) return {
      type: "prefix",
      prefix: B
  }

function iw2(A, B, Q) {
  let I = A.command.trim();
  return Array.from(B.entries()).filter(([G]) => {
      let Z = zD5(G);
      switch (Z.type) {
          case "exact":
              return Z.command === I;
          case "prefix":
              switch (Q) {
                  case "exact":
                      return Z.prefix === I;
                  case "prefix":
                      return I.startsWith(Z.prefix)
              }

function aw2(A, B, Q) {
  let I = Sv(B, E4, "deny"),
      G = iw2(A, I, Q),
      Z = Sv(B, E4, "allow"),
      D = iw2(A, Z, Q);
  return {
      matchingDenyRules: G,
      matchingAllowRules: D
  }

function nw2(A, B, Q) {
  let I = dt1(A, B);
  if (I.behavior === "deny") return I;
  if (I.behavior === "allow") return I;
  let G = sw2(A, B);
  if (G.behavior === "deny") return G;
  if (Q === null || Q === void 0) return {
      behavior: "ask",
      message: `Autocoder requested permissions to use ${E4.name}

function UD5(A) {
  let B = ND5(A),
      Q = ED5.get(B);
  return Q !== void 0 ? Q : wD5
}

function ND5(A) {
  return (A.split("|").pop() ? .trim() || A).trim().split(/\s+/)[0] || ""
}

function rw2(A, B, Q, I) {
  let Z = UD5(A)(B, Q, I);
  return {
      isError: Z.isError,
      message: Z.message
  }

function RD5(A, B) {
  if (B !== 0) return;
  if (A.match(/^\s*git\s+commit\b/)) E1("tengu_git_operation", {
      operation: "commit"
  }

async function OD5({
  shellCommand: A,
  input: B,
  dialogResultPromise: Q,
  setToolJSX: I
}) {
  let G = A.result;
  return Promise.race([G, Q.then(async (Z) => {
      if (Z === "background" && A) {
          let D = XE.moveToBackground(B.command, A);
          if (I) I(null);
          return {
              stdout: `Command running in background (shell ID: ${D}

async function TD5({
  input: A,
  abortController: B,
  dialogResultPromise: Q,
  setToolJSX: I
}) {
  let {
      command: G,
      timeout: Z,
      shellExecutable: D
  }

function FW(A, B) {
  return A.flatMap((Q, I) => I ? [B(I), Q] : [Q])
}

function A(B, Q) {
      var I, G = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {}

function Y(T) {
          if (T = D.postProcess(T, G), Z) return setTimeout(function() {
              Z(T)
          }

function O() {
          for (var T = Math.max(N, -F); T <= Math.min(q, F); T += 2) {
              var L = void 0,
                  _ = K[T - 1],
                  k = K[T + 1];
              if (_) K[T - 1] = void 0;
              var i = !1;
              if (k) {
                  var x = k.oldPos - T;
                  i = k && 0 <= x && x < W
              }

function T() {
          setTimeout(function() {
              if (F > X || Date.now() > C) return Z();
              if (!O()) T()
          }

function A(B, Q, I, G, Z) {
      var D = B.lastComponent;
      if (D && !Z.oneChangePerToken && D.added === Q && D.removed === I) return {
          oldPos: B.oldPos + G,
          lastComponent: {
              count: D.count + 1,
              added: Q,
              removed: I,
              previousComponent: D.previousComponent
          }

function A(B, Q, I, G, Z) {
      var D = Q.length,
          Y = I.length,
          W = B.oldPos,
          J = W - G,
          F = 0;
      while (J + 1 < D && W + 1 < Y && this.equals(I[W + 1], Q[J + 1], Z))
          if (J++, W++, F++, Z.oneChangePerToken) B.lastComponent = {
              count: 1,
              previousComponent: B.lastComponent,
              added: !1,
              removed: !1
          }

function A(B, Q, I) {
      if (I.comparator) return I.comparator(B, Q);
      else return B === Q || I.ignoreCase && B.toLowerCase() === Q.toLowerCase()
  }

function A(B) {
      var Q = [];
      for (var I = 0; I < B.length; I++)
          if (B[I]) Q.push(B[I]);
      return Q
  }

function A(B) {
      return B
  }

function A(B) {
      return Array.from(B)
  }

function A(B) {
      return B.join("")
  }

function A(B) {
      return B
  }

function ew2(A, B, Q, I, G) {
  var Z = [],
      D;
  while (B) Z.push(B), D = B.previousComponent, delete B.previousComponent, B = D;
  Z.reverse();
  var Y = 0,
      W = Z.length,
      J = 0,
      F = 0;
  for (; Y < W; Y++) {
      var X = Z[Y];
      if (!X.removed) {
          if (!X.added && G) {
              var V = Q.slice(J, J + X.count);
              V = V.map(function(C, K) {
                  var E = I[F + K];
                  return E.length > C.length ? E : C
              }

function AE2(A, B) {
  var Q;
  for (Q = 0; Q < A.length && Q < B.length; Q++)
      if (A[Q] != B[Q]) return A.slice(0, Q);
  return A.slice(0, Q)
}

function BE2(A, B) {
  var Q;
  if (!A || !B || A[A.length - 1] != B[B.length - 1]) return "";
  for (Q = 0; Q < A.length && Q < B.length; Q++)
      if (A[A.length - (Q + 1)] != B[B.length - (Q + 1)]) return A.slice(-Q);
  return A.slice(-Q)
}

function lt1(A, B, Q) {
  if (A.slice(0, B.length) != B) throw Error("string ".concat(JSON.stringify(A), " doesn't start with prefix ").concat(JSON.stringify(B), "; this is a bug"));
  return Q + A.slice(B.length)
}

function it1(A, B, Q) {
  if (!B) return A + Q;
  if (A.slice(-B.length) != B) throw Error("string ".concat(JSON.stringify(A), " doesn't end with suffix ").concat(JSON.stringify(B), "; this is a bug"));
  return A.slice(0, -B.length) + Q
}

function R11(A, B) {
  return lt1(A, B, "")
}

function GH1(A, B) {
  return it1(A, B, "")
}

function QE2(A, B) {
  return B.slice(0, PD5(A, B))
}

function PD5(A, B) {
  var Q = 0;
  if (A.length > B.length) Q = A.length - B.length;
  var I = B.length;
  if (A.length < B.length) I = A.length;
  var G = Array(I),
      Z = 0;
  G[0] = 0;
  for (var D = 1; D < I; D++) {
      if (B[D] == B[Z]) G[D] = G[Z];
      else G[D] = Z;
      while (Z > 0 && B[D] != B[Z]) Z = G[Z];
      if (B[D] == B[Z]) Z++
  }

function IE2(A, B, Q, I) {
  if (B && Q) {
      var G = B.value.match(/^\s*/)[0],
          Z = B.value.match(/\s*$/)[0],
          D = Q.value.match(/^\s*/)[0],
          Y = Q.value.match(/\s*$/)[0];
      if (A) {
          var W = AE2(G, D);
          A.value = it1(A.value, D, W), B.value = R11(B.value, W), Q.value = R11(Q.value, W)
      }

function WE2(A, B, Q) {
  return YE2.diff(A, B, Q)
}

function GE2(A, B, Q) {
  return YH1.diff(A, B, Q)
}

function ZE2(A, B) {
  var Q = Object.keys(A);
  if (Object.getOwnPropertySymbols) {
      var I = Object.getOwnPropertySymbols(A);
      B && (I = I.filter(function(G) {
          return Object.getOwnPropertyDescriptor(A, G).enumerable
      }

function DE2(A) {
  for (var B = 1; B < arguments.length; B++) {
      var Q = arguments[B] != null ? arguments[B] : {}

function yD5(A, B) {
  if (typeof A != "object" || !A) return A;
  var Q = A[Symbol.toPrimitive];
  if (Q !== void 0) {
      var I = Q.call(A, B || "default");
      if (typeof I != "object") return I;
      throw new TypeError("@@toPrimitive must return a primitive value.")
  }

function kD5(A) {
  var B = yD5(A, "string");
  return typeof B == "symbol" ? B : B + ""
}

function nt1(A) {
  return nt1 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(B) {
      return typeof B
  }

function xD5(A, B, Q) {
  if (B = kD5(B), B in A) Object.defineProperty(A, B, {
      value: Q,
      enumerable: !0,
      configurable: !0,
      writable: !0
  }

function ct1(A) {
  return fD5(A) || vD5(A) || bD5(A) || gD5()
}

function fD5(A) {
  if (Array.isArray(A)) return at1(A)
}

function vD5(A) {
  if (typeof Symbol !== "undefined" && A[Symbol.iterator] != null || A["@@iterator"] != null) return Array.from(A)
}

function bD5(A, B) {
  if (!A) return;
  if (typeof A === "string") return at1(A, B);
  var Q = Object.prototype.toString.call(A).slice(8, -1);
  if (Q === "Object" && A.constructor) Q = A.constructor.name;
  if (Q === "Map" || Q === "Set") return Array.from(A);
  if (Q === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(Q)) return at1(A, B)
}

function at1(A, B) {
  if (B == null || B > A.length) B = A.length;
  for (var Q = 0, I = new Array(B); Q < B; Q++) I[Q] = A[Q];
  return I
}

function gD5() {
  throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)
}

function st1(A, B, Q, I, G) {
  if (B = B || [], Q = Q || [], I) A = I(G, A);
  var Z;
  for (Z = 0; Z < B.length; Z += 1)
      if (B[Z] === A) return Q[Z];
  var D;
  if (Object.prototype.toString.call(A) === "[object Array]") {
      B.push(A), D = new Array(A.length), Q.push(D);
      for (Z = 0; Z < A.length; Z += 1) D[Z] = st1(A[Z], B, Q, I, G);
      return B.pop(), Q.pop(), D
  }

function T11(A, B, Q, I, G, Z, D) {
  if (!D) D = {}

function F(X) {
              var V = J(X);
              W(V)
          }

function J(F) {
      if (!F) return;
      F.push({
          value: "",
          lines: []
      }

function X(i) {
          return i.map(function(x) {
              return " " + x
          }

function i() {
              var x = F[R],
                  s = x.lines || hD5(x.value);
              if (x.lines = s, x.added || x.removed) {
                  var d;
                  if (!C) {
                      var F1 = F[R - 1];
                      if (C = N, K = q, F1) E = D.context > 0 ? X(F1.lines.slice(-D.context)) : [], C -= E.length, K -= E.length
                  }

function hD5(A) {
  var B = A.endsWith(`
`),
      Q = A.split(`
`).map(function(I) {
          return I + `
`
      }

function XW({
  patch: A,
  dim: B,
  skipUnchanged: Q,
  hideLineNumbers: I,
  width: G
}) {
  let Z = uO.useRef(null),
      [D, Y] = uO.useState(G || dD5);
  uO.useEffect(() => {
      if (!G && Z.current) {
          let {
              width: F
          }

function uD5(A) {
  return A.map((B) => {
      if (B.startsWith("+")) return {
          code: " " + B.slice(1),
          i: 0,
          type: "add",
          originalCode: B.slice(1)
      }

function pD5(A) {
  let B = [],
      Q = 0;
  while (Q < A.length) {
      let I = A[Q];
      if (!I) {
          Q++;
          continue
      }

function cD5(A, B) {
  return WE2(A, B, {
      ignoreCase: !1
  }

function lD5(A, B, Q, I, G, Z) {
  let {
      type: D,
      i: Y,
      wordDiff: W,
      matchedLine: J,
      originalCode: F
  }

function iD5(A, B, Q, I, G, Z, D) {
  let Y = uD5(A),
      W = pD5(Y),
      J = nD5(W, B),
      F = Math.max(...J.map(({
          i: C
      }

function Cu({
  i: A,
  width: B,
  hidden: Q
}) {
  if (Q) return null;
  return l2.createElement(P, {
      color: "secondaryText"
  }

function nD5(A, B) {
  let Q = B,
      I = [],
      G = [...A];
  while (G.length > 0) {
      let Z = G.shift(),
          {
              code: D,
              type: Y,
              originalCode: W,
              wordDiff: J,
              matchedLine: F
          }

function WH1({
  filePath: A,
  structuredPatch: B,
  style: Q,
  verbose: I
}) {
  let {
      columns: G
  }

async function JE2() {
  if (MQ() !== "firstParty" || T9()) return;
  let B = ZA(),
      Q = B.oauthAccount ? .organizationUuid;
  if (!Q) return;
  try {
      let I = BB(),
          G = await P4.get(`${I.BASE_API_URL}

function rD5() {
  if (MQ() !== "firstParty") return !1;
  if (T9()) return !1;
  let {
      source: B
  }

function ot1() {
  if (!rD5()) return "";
  let B = ZA().recommendedSubscription || "",
      Q = "";
  switch (B) {
      case "pro":
          Q = `

You can now use a Autocoder Pro subscription with Autocoder! ${UA.bold("https://claude.ai/upgrade")}

function FE2() {
  let [A] = P$.useState(() => {
      let B = ZA(),
          Q = B.recommendedSubscription || "",
          I = B.subscriptionUpsellShownCount ? ? 0;
      if (!["pro", "max5x", "max20x"].includes(Q) || I >= 5) return !1;
      return !0
  }

function XE2() {
  let A = ot1();
  if (!A) return null;
  return P$.createElement(h, {
      paddingLeft: 1,
      marginTop: 1,
      marginBottom: 1
  }

function oD5(A) {
  return `$${A>0.5?eD5(A,100).toFixed(2):A.toFixed(4)}

function tD5() {
  let A = e2A();
  if (Object.keys(A).length === 0) return "Tokens:                0 input, 0 output, 0 cache read, 0 cache write";
  let B = "Token usage by model:";
  for (let [Q, I] of Object.entries(A)) {
      let G = kC(Q),
          Z = `  ${_G(I.inputTokens)}

function tt1() {
  let A = oD5(KU()) + (t2A() ? " (costs may be inaccurate due to usage of unknown models)" : ""),
      B = tD5();
  return UA.dim((process.env.DISABLE_COST_WARNINGS ? "" : `Total cost:            ${A}

function CE2() {
  VE2.useEffect(() => {
      let A = () => {
          if (kG1()) process.stdout.write(`
` + tt1() + `
`);
          let B = m9();
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
          }

function eD5(A, B) {
  return Math.round(A * B) / B
}

function KE2(A, B, Q, I, G) {
  n2A(A, B, Q, I, G), Y9A() ? .add(A, {
      model: G
  }

function P11(A) {
  return A.replaceAll("&", zE2).replaceAll("$", wE2)
}

function EE2(A) {
  return A.replaceAll(zE2, "&").replaceAll(wE2, "$")
}

function Ky(A, B) {
  let Q = 0,
      I = 0;
  if (A.length === 0 && B) Q = B.split(/\r?\n/).length;
  else Q = A.reduce((G, Z) => G + Z.lines.filter((D) => D.startsWith("+")).length, 0), I = A.reduce((G, Z) => G + Z.lines.filter((D) => D.startsWith("-")).length, 0);
  wU1(Q, I), NU1() ? .add(Q, {
      type: "added"
  }

function UE2({
  filePath: A,
  oldContent: B,
  newContent: Q,
  ignoreWhitespace: I = !1,
  singleHunk: G = !1
}) {
  return T11(A, A, P11(B), P11(Q), void 0, void 0, {
      ignoreWhitespace: I,
      context: G ? 1e5 : HE2
  }

function iJ({
  filePath: A,
  fileContents: B,
  edits: Q,
  ignoreWhitespace: I = !1
}) {
  let G = P11(kv(B));
  return T11(A, A, G, Q.reduce((Z, D) => {
      let {
          old_string: Y,
          new_string: W
      }

function JH1(A) {
  return A.map(({
      old_string: B,
      new_string: Q,
      replace_all: I = !1
  }

function et1({
  filePath: A,
  fileContents: B,
  oldString: Q,
  newString: I,
  replaceAll: G = !1
}) {
  return pO({
      filePath: A,
      fileContents: B,
      edits: [{
          old_string: Q,
          new_string: I,
          replace_all: G
      }

function pO({
  filePath: A,
  fileContents: B,
  edits: Q
}) {
  let I = B,
      G = [];
  for (let D of Q) {
      let Y = D.old_string.replace(/\n+$/, "");
      for (let J of G)
          if (Y !== "" && J.includes(Y)) throw new Error("Cannot edit file: old_string is a substring of a new_string from a previous edit.");
      let W = I;
      if (I = D.old_string === "" ? D.new_string : $E2(I, D.old_string, D.new_string, D.replace_all), I === W) throw new Error("String not found in file. Failed to apply edit.");
      G.push(D.new_string)
  }

function qE2(A, B) {
  return T11("file.txt", "file.txt", A, B, void 0, void 0, {
      context: 8
  }

function ME2(A, B, Q, I = 4) {
  let Z = (A.split(B)[0] ? ? "").split(/\r?\n/).length - 1,
      D = $E2(A, B, Q).split(/\r?\n/),
      Y = Math.max(0, Z - I),
      W = Z + I + Q.split(/\r?\n/).length;
  return {
      snippet: D.slice(Y, W).join(`
`),
      startLine: Y + 1
  }

function LE2(A) {
  return A.map((B) => {
      let Q = [],
          I = [],
          G = [];
      for (let Z of B.lines)
          if (Z.startsWith(" ")) Q.push(Z.slice(1)), I.push(Z.slice(1)), G.push(Z.slice(1));
          else if (Z.startsWith("-")) I.push(Z.slice(1));
      else if (Z.startsWith("+")) G.push(Z.slice(1));
      return {
          old_string: I.join(`
`),
          new_string: G.join(`
`),
          replace_all: !1
      }

function BY5(A) {
  let B = A,
      Q = [];
  for (let [I, G] of Object.entries(AY5)) {
      let Z = B;
      if (B = B.replaceAll(I, G), Z !== B) Q.push({
          from: I,
          to: G
      }

function Ae1({
  file_path: A,
  edits: B
}) {
  if (B.length === 0) return {
      file_path: A,
      edits: B
  }

function QY5(A, B, Q) {
  if (A.length === B.length && A.every((Y, W) => {
          let J = B[W];
          return J !== void 0 && Y.old_string === J.old_string && Y.new_string === J.new_string && Y.replace_all === J.replace_all
      }

function FH1(A, B) {
  if (A.file_path !== B.file_path) return !1;
  if (A.edits.length === B.edits.length && A.edits.every((G, Z) => {
          let D = B.edits[Z];
          return D !== void 0 && G.old_string === D.old_string && G.new_string === D.new_string && G.replace_all === D.replace_all
      }

function XH1({
  file_path: A,
  operation: B,
  patch: Q,
  style: I,
  verbose: G
}) {
  let {
      columns: Z
  }

function PE2(A) {
  return A.some((B) => B.old_string === "")
}

async function SE2(A, B) {
  return {
      name: A.name,
      description: await A.prompt({
          getToolPermissionContext: B.getToolPermissionContext,
          tools: B.tools
      }

function _E2(A) {
  let [B] = Be1(A);
  E1("tengu_sysprompt_block", {
      snippet: B ? .slice(0, 20),
      length: B ? .length ? ? 0,
      hash: B ? VY5("sha256").update(B).digest("hex") : ""
  }

function Be1(A) {
  let B = A[0] || "",
      Q = A.slice(1);
  return [B, Q.join(`
`)].filter(Boolean)
}

function Qe1(A, B) {
  return [...A, Object.entries(B).map(([Q, I]) => `${Q}

function Ie1(A, B) {
  if (Object.entries(B).length === 0) return A;
  return CY5(B), [K2({
      content: `<system-reminder>
As you answer the user's questions, you can use the following context:
${Object.entries(B).map(([Q,I])=>`# ${Q}

async function CY5(A) {
  let B = A.directoryStructure ? .length ? ? 0,
      Q = A.gitStatus ? .length ? ? 0,
      I = A.claudeMd ? .length ? ? 0,
      G = B + Q + I,
      Z = m9(),
      D = new AbortController;
  setTimeout(() => D.abort(), 1000);
  let Y = await D81(dA(), D.signal, Z.ignorePatterns ? ? []);
  E1("tengu_context_size", {
      directory_structure_size: B,
      git_status_size: Q,
      claude_md_size: I,
      total_context_size: G,
      project_file_count_rounded: Y
  }

function Ge1(A, B) {
  try {
      let Q = A.message.content.map((I) => {
          if (I.type !== "tool_use") return I;
          if (typeof I.input !== "object" || I.input === null) return I;
          let G = B.find((Z) => Z.name === I.name);
          if (!G) return I;
          return { ...I,
              input: KY5(G, I.input)
          }

function KY5(A, B) {
  switch (A.name) {
      case E4.name:
          {
              let {
                  command: Q,
                  sandbox: I,
                  timeout: G,
                  description: Z
              }

function HY5(A) {
  if (A ? .type === "assistant" && "usage" in A.message && !(A.message.content[0] ? .type === "text" && Pt1.has(A.message.content[0].text)) && A.message.model !== "<synthetic>") return A.message.usage;
  return
}

function zY5(A) {
  return A.input_tokens + (A.cache_creation_input_tokens ? ? 0) + (A.cache_read_input_tokens ? ? 0) + A.output_tokens
}

function VE(A) {
  let B = A.length - 1;
  while (B >= 0) {
      let Q = A[B],
          I = Q ? HY5(Q) : void 0;
      if (I) return zY5(I);
      B--
  }

function jE2(A) {
  S11 = A, Ze1.forEach((Q) => Q(A));
  let B = Math.round((A.resetsAt ? A.resetsAt - Date.now() / 1000 : 0) / 3600);
  E1("tengu_claudeai_limits_status_changed", {
      status: A.status,
      unifiedRateLimitFallbackAvailable: A.unifiedRateLimitFallbackAvailable,
      hoursTillReset: B
  }

async function wY5() {
  let A = K_(),
      B = await TK({
          maxRetries: 0,
          model: A,
          isNonInteractiveSession: !1
      }

async function yE2() {
  if (!T9()) return;
  try {
      let A = await wY5();
      De1(A.headers)
  }

function Hu() {
  let [A, B] = CH1.useState({ ...S11
  }

function kE2(A) {
  let B = A.get("anthropic-ratelimit-unified-status") || "allowed",
      Q = A.get("anthropic-ratelimit-unified-reset"),
      I = Q ? Number(Q) : void 0,
      G = A.get("anthropic-ratelimit-unified-fallback") === "available";
  return {
      status: B,
      resetsAt: I,
      unifiedRateLimitFallbackAvailable: G
  }

function De1(A) {
  if (!T9()) return;
  let B = kE2(A);
  if (!s21(S11, B)) jE2(B)
}

function Ye1(A) {
  if (!T9() || A.status !== 429) return;
  try {
      let B = { ...S11
      }

function xE2(A, B, Q, I) {
  if (!Q.resetsAt) return;
  let G = Vg();
  if (!A && Q.unifiedRateLimitFallbackAvailable && (G === void 0 || G === null) && EdA()) {
      I(!0), E1("tengu_claude_ai_limits_enable_fallback", {}

async function We1(A, B) {
  return await B()
}

function NY5(A, B) {
  return A.map((Q) => {
      if (typeof Q === "string") return B(Q);
      return Q.map((I) => {
          switch (I.type) {
              case "tool_result":
                  if (typeof I.content === "string") return { ...I,
                      content: B(I.content)
                  }

function KH1(A, B) {
  return UU(A, (Q, I) => {
      if (Array.isArray(Q)) return Q.map((G) => KH1(G, B));
      if (Hc(Q)) return KH1(Q, B);
      return B(Q, I, A)
  }

function vE2(A, B) {
  return {
      uuid: "UUID",
      requestId: "REQUEST_ID",
      timestamp: A.timestamp,
      message: { ...A.message,
          content: A.message.content.map((Q) => {
              switch (Q.type) {
                  case "text":
                      return { ...Q,
                          text: B(Q.text),
                          citations: Q.citations || []
                      }

function bE2(A) {
  if (typeof A !== "string") return A;
  let B = A.replace(/num_files="\d+"/g, 'num_files="[NUM]"').replace(/duration_ms="\d+"/g, 'duration_ms="[DURATION]"').replace(/cost_usd="\d+"/g, 'cost_usd="[COST]"').replace(/\//g, gE2.sep).replaceAll(dA(), "[CWD]");
  if (B.includes("Files modified by user:")) return "Files modified by user: [FILES]";
  return B
}

async function zH1() {
  try {
      if (T9()) return !1;
      let A = ZA().oauthAccount;
      if (!A) return !1;
      let B = qG(!1);
      if (!B) return !1;
      let Q = A.organizationUuid;
      if (!Q) {
          if (Q = await qY5(B), !Q) return !1
      }

function j11() {
  if (process.env.IS_DEMO) return !1;
  return ZA().isQualifiedForDataSharing ? ? !1
}

function MY5() {
  HH1 = !0;
  let A = ZA();
  if (A.initialDataSharingMessageSeen) return;
  j0({ ...A,
      initialDataSharingMessageSeen: !0
  }

function hE2() {
  if (HH1) return !1;
  return j11()
}

function LY5() {
  return Fe1.useEffect(() => {
      MY5()
  }

function mE2(A) {
  if (process.env.CLAUDE_CODE_USE_BEDROCK || process.env.CLAUDE_CODE_USE_VERTEX) return !1;
  return [GN.firstParty, UC.firstParty, uS.firstParty, pS.firstParty].includes(A)
}

function RY5() {
  return Fe1.useEffect(() => {
      HH1 = !0
  }

function dE2() {
  return ZA().initialDataSharingMessageSeen ? s7.createElement(RY5, null) : s7.createElement(LY5, null)
}

function OY5(A, B) {
  return {
      inputTokens: A.inputTokens + B.inputTokens,
      outputTokens: A.outputTokens + B.outputTokens,
      promptCacheWriteTokens: A.promptCacheWriteTokens + B.promptCacheWriteTokens,
      promptCacheReadTokens: A.promptCacheReadTokens + B.promptCacheReadTokens
  }

function pE2(A, B) {
  return B.input_tokens / 1e6 * A.inputTokens + B.output_tokens / 1e6 * A.outputTokens + (B.cache_read_input_tokens ? ? 0) / 1e6 * A.promptCacheReadTokens + (B.cache_creation_input_tokens ? ? 0) / 1e6 * A.promptCacheWriteTokens
}

function cE2(A, B) {
  let Q = uE2[kC(A)];
  if (!Q) E1("tengu_unknown_model_cost", {
      model: A,
      shortName: kC(A)
  }

function PY5() {
  return Boolean(process.env.OTEL_LOG_USER_PROMPTS)
}

function Xe1(A) {
  return PY5() ? A : "<REDACTED>"
}

async function bK(A, B = {}) {
  let Q = F9A();
  if (!Q) return;
  let I = { ...wY1(),
      "event.name": A,
      "event.timestamp": new Date().toISOString()
  }

function Ve1({
  model: A,
  messagesLength: B,
  temperature: Q,
  betas: I,
  permissionMode: G,
  promptCategory: Z
}) {
  E1("tengu_api_query", {
      model: A,
      messagesLength: B,
      temperature: Q,
      provider: Wz(),
      ...I ? .length ? {
          betas: I.join(",")
      }

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
}) {
  let F = A instanceof Error ? A.message : String(A),
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
      }

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
}) {
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
      }

function _Y5(A, B, Q, I) {
  let {
      stickerCostUSD: G,
      finalCostUSD: Z
  }

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
}) {
  let {
      stickerCostUSD: V,
      costUSD: C,
      durationMs: K,
      durationMsIncludingRetries: E
  }

async function y11(A, B, Q) {
  let I = Q.maxRetries ? ? jY5,
      G, Z = {
          model: Q.model
      }

function xY5(A, B) {
  if (B) {
      let G = parseInt(B, 10);
      if (!isNaN(G)) return G * 1000
  }

function lE2(A) {
  if (A.status !== 400 || !A.message) return;
  if (!A.message.includes("input length and `max_tokens` exceed context limit")) return;
  let B = /input length and `max_tokens` exceed context limit: (\d+) \+ (\d+) > (\d+)/,
      Q = A.message.match(B);
  if (!Q || Q.length !== 4) return;
  if (!Q[1] || !Q[2] || !Q[3]) {
      b1(new Error("Unable to parse max_tokens from max_tokens exceed context limit error message"));
      return
  }

function fY5(A) {
  if (!(A instanceof p6)) return !1;
  return A.status === 529 || (A.message ? .includes('"type":"overloaded_error"') ? ? !1)
}

function vY5(A) {
  if (A.message ? .includes('"type":"overloaded_error"')) return !0;
  if (lE2(A)) return !0;
  let B = A.headers ? .get("x-should-retry");
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

function EH1(A) {
  let B = {}

function zy() {
  return !yY(process.env.DISABLE_PROMPT_CACHING)
}

function _11() {
  return {
      user_id: fx()
  }

async function iE2(A, B) {
  if (B) return !0;
  try {
      let Q = K_(),
          I = jY(Q);
      return await y11(() => TK({
          apiKey: A,
          maxRetries: 3,
          model: Q,
          isNonInteractiveSession: B
      }

async function gY5(A) {
  let B = Date.now(),
      Q = null,
      I = null,
      G = zu;
  for await (let Z of A) switch (Z.type) {
      case "message_start":
          I = Date.now() - B, G = wy(G, Z.message.usage);
          break;
      case "message_delta":
          G = wy(G, Z.usage), Q = Z.delta.stop_reason;
          break;
      default:
          break
  }

function hY5(A, B = !1) {
  if (B)
      if (typeof A.message.content === "string") return {
          role: "user",
          content: [{
              type: "text",
              text: A.message.content,
              ...zy() ? {
                  cache_control: {
                      type: "ephemeral"
                  }

function mY5(A, B = !1) {
  if (B)
      if (typeof A.message.content === "string") return {
          role: "assistant",
          content: [{
              type: "text",
              text: A.message.content,
              ...zy() ? {
                  cache_control: {
                      type: "ephemeral"
                  }

async function we1(A, B, Q, I, G, Z) {
  for await (let D of Je1(A, async function*() {
      yield* nE2(A, B, Q, I, G, Z)
  }

function wy(A, B) {
  return {
      input_tokens: A.input_tokens + (B.input_tokens ? ? 0),
      cache_creation_input_tokens: A.cache_creation_input_tokens + (B.cache_creation_input_tokens ? ? 0),
      cache_read_input_tokens: A.cache_read_input_tokens + (B.cache_read_input_tokens ? ? 0),
      output_tokens: A.output_tokens + (B.output_tokens ? ? 0),
      server_tool_use: {
          web_search_requests: A.server_tool_use.web_search_requests + (B.server_tool_use ? .web_search_requests ? ? 0)
      }

function dY5(A) {
  return A.map((B, Q) => {
      return B.type === "user" ? hY5(B, Q > A.length - 3) : mY5(B, Q > A.length - 3)
  }

async function uY5({
  systemPrompt: A,
  userPrompt: B,
  assistantPrompt: Q,
  signal: I,
  isNonInteractiveSession: G,
  temperature: Z = 0,
  enablePromptCaching: D,
  promptCategory: Y
}) {
  let W = K_(),
      J = [{
          role: "user",
          content: B
      }

async function cZ({
  systemPrompt: A = [],
  userPrompt: B,
  assistantPrompt: Q,
  enablePromptCaching: I = !1,
  signal: G,
  isNonInteractiveSession: Z,
  temperature: D = 0,
  promptCategory: Y
}) {
  return (await We1([K2({
      content: A.map((J) => ({
          type: "text",
          text: J
      }

function Ee1(A) {
  if (A.includes("3-5")) return 8192;
  if (A.includes("haiku")) return 8192;
  let B = process.env.CLAUDE_CODE_MAX_OUTPUT_TOKENS;
  if (B) {
      let Q = parseInt(B, 10);
      if (!isNaN(Q) && Q > 0) return Q
  }

function sE2(A) {
  try {
      let B = A.headers.get("anthropic-ratelimit-unified-fallback-percentage");
      if (B !== null) {
          let Q = parseFloat(B);
          if (!isNaN(Q) && Q > 0 && Q <= 1) {
              if (ZA().fallbackAvailableWarningThreshold !== Q) j0({ ...ZA(),
                  fallbackAvailableWarningThreshold: Q
              }

function AU2(A) {
  if (!A || A.trim() === "") return `Your task is to create a detailed summary of the conversation so far, paying close attention to the user's explicit requests and your previous actions.
This summary should be thorough in capturing technical details, code patterns, and architectural decisions that would be essential for continuing development work without losing context.

Before providing your final summary, wrap your analysis in <analysis> tags to organize your thoughts and ensure you've covered all necessary points. In your analysis process:

1. Chronologically analyze each message and section of the conversation. For each section thoroughly identify:
 - The user's explicit requests and intents
 - Your approach to addressing the user's requests
 - Key decisions, technical concepts and code patterns
 - Specific details like:
   - file names
   - full code snippets
   - function signatures
   - file edits
- Errors that you ran into and how you fixed them
- Pay special attention to specific user feedback that you received, especially if the user told you to do something differently.
2. Double-check for technical accuracy and completeness, addressing each required element thoroughly.

Your summary should include the following sections:

1. Primary Request and Intent: Capture all of the user's explicit requests and intents in detail
2. Key Technical Concepts: List all important technical concepts, technologies, and frameworks discussed.
3. Files and Code Sections: Enumerate specific files and code sections examined, modified, or created. Pay special attention to the most recent messages and include full code snippets where applicable and include a summary of why this file read or edit is important.
4. Errors and fixes: List all errors that you ran into, and how you fixed them. Pay special attention to specific user feedback that you received, especially if the user told you to do something differently.
5. Problem Solving: Document problems solved and any ongoing troubleshooting efforts.
6. All user messages: List ALL user messages that are not tool results. These are critical for understanding the users' feedback and changing intent.
6. Pending Tasks: Outline any pending tasks that you have explicitly been asked to work on.
7. Current Work: Describe in detail precisely what was being worked on immediately before this summary request, paying special attention to the most recent messages from both user and assistant. Include file names and code snippets where applicable.
8. Optional Next Step: List the next step that you will take that is related to the most recent work you were doing. IMPORTANT: ensure that this step is DIRECTLY in line with the user's explicit requests, and the task you were working on immediately before this summary request. If your last task was concluded, then only list next steps if they are explicitly in line with the users request. Do not start on tangential requests without confirming with the user first.
                     If there is a next step, include direct quotes from the most recent conversation showing exactly what task you were working on and where you left off. This should be verbatim to ensure there's no drift in task interpretation.

Here's an example of how your output should be structured:

<example>
<analysis>
[Your thought process, ensuring all points are covered thoroughly and accurately]
</analysis>

<summary>
1. Primary Request and Intent:
 [Detailed description]

2. Key Technical Concepts:
 - [Concept 1]
 - [Concept 2]
 - [...]

3. Files and Code Sections:
 - [File Name 1]
    - [Summary of why this file is important]
    - [Summary of the changes made to this file, if any]
    - [Important Code Snippet]
 - [File Name 2]
    - [Important Code Snippet]
 - [...]

4. Errors and fixes:
  - [Detailed description of error 1]:
    - [How you fixed the error]
    - [User feedback on the error if any]
  - [...]

5. Problem Solving:
 [Description of solved problems and ongoing troubleshooting]

6. All user messages: 
  - [Detailed non tool use user message]
  - [...]

7. Pending Tasks:
 - [Task 1]
 - [Task 2]
 - [...]

8. Current Work:
 [Precise description of current work]

9. Optional Next Step:
 [Optional Next step to take]

</summary>
</example>

Please provide your summary based on the conversation so far, following this structure and ensuring precision and thoroughness in your response. 

There may be additional summarization instructions provided in the included context. If so, remember to follow these instructions when creating the above summary. Examples of instructions include:
<example>
## Compact Instructions
When summarizing the conversation focus on typescript code changes and also remember the mistakes you made and how you fixed them.
</example>

<example>
# Summary instructions
When you are using compact - please focus on test output and code changes. Include file reads verbatim.
</example>
`;
  return `Your task is to create a detailed summary of the conversation so far, paying close attention to the user's explicit requests and your previous actions.
This summary should be thorough in capturing technical details, code patterns, and architectural decisions that would be essential for continuing development work without losing context.

Before providing your final summary, wrap your analysis in <analysis> tags to organize your thoughts and ensure you've covered all necessary points. In your analysis process:

1. Chronologically analyze each message and section of the conversation. For each section thoroughly identify:
 - The user's explicit requests and intents
 - Your approach to addressing the user's requests
 - Key decisions, technical concepts and code patterns
 - Specific details like:
   - file names
   - full code snippets
   - function signatures
   - file edits
- Errors that you ran into and how you fixed them
- Pay special attention to specific user feedback that you received, especially if the user told you to do something differently.
2. Double-check for technical accuracy and completeness, addressing each required element thoroughly.

Your summary should include the following sections:

1. Primary Request and Intent: Capture all of the user's explicit requests and intents in detail
2. Key Technical Concepts: List all important technical concepts, technologies, and frameworks discussed.
3. Files and Code Sections: Enumerate specific files and code sections examined, modified, or created. Pay special attention to the most recent messages and include full code snippets where applicable and include a summary of why this file read or edit is important.
4. Errors and fixes: List all errors that you ran into, and how you fixed them. Pay special attention to specific user feedback that you received, especially if the user told you to do something differently.
5. Problem Solving: Document problems solved and any ongoing troubleshooting efforts.
6. All user messages: List ALL user messages that are not tool results. These are critical for understanding the users' feedback and changing intent.
6. Pending Tasks: Outline any pending tasks that you have explicitly been asked to work on.
7. Current Work: Describe in detail precisely what was being worked on immediately before this summary request, paying special attention to the most recent messages from both user and assistant. Include file names and code snippets where applicable.
8. Optional Next Step: List the next step that you will take that is related to the most recent work you were doing. IMPORTANT: ensure that this step is DIRECTLY in line with the user's explicit requests, and the task you were working on immediately before this summary request. If your last task was concluded, then only list next steps if they are explicitly in line with the users request. Do not start on tangential requests without confirming with the user first.
                     If there is a next step, include direct quotes from the most recent conversation showing exactly what task you were working on and where you left off. This should be verbatim to ensure there's no drift in task interpretation.

Here's an example of how your output should be structured:

<example>
<analysis>
[Your thought process, ensuring all points are covered thoroughly and accurately]
</analysis>

<summary>
1. Primary Request and Intent:
 [Detailed description]

2. Key Technical Concepts:
 - [Concept 1]
 - [Concept 2]
 - [...]

3. Files and Code Sections:
 - [File Name 1]
    - [Summary of why this file is important]
    - [Summary of the changes made to this file, if any]
    - [Important Code Snippet]
 - [File Name 2]
    - [Important Code Snippet]
 - [...]

4. Errors and fixes:
  - [Detailed description of error 1]:
    - [How you fixed the error]
    - [User feedback on the error if any]
  - [...]

5. Problem Solving:
 [Description of solved problems and ongoing troubleshooting]

6. All user messages: 
  - [Detailed non tool use user message]
  - [...]

7. Pending Tasks:
 - [Task 1]
 - [Task 2]
 - [...]

8. Current Work:
 [Precise description of current work]

9. Optional Next Step:
 [Optional Next step to take]

</summary>
</example>

Please provide your summary based on the conversation so far, following this structure and ensuring precision and thoroughness in your response. 

There may be additional summarization instructions provided in the included context. If so, remember to follow these instructions when creating the above summary. Examples of instructions include:
<example>
## Compact Instructions
When summarizing the conversation focus on typescript code changes and also remember the mistakes you made and how you fixed them.
</example>

<example>
# Summary instructions
When you are using compact - please focus on test output and code changes. Include file reads verbatim.
</example>


Additional Instructions:
${A}

function tY5(A) {
  let B = A,
      Q = B.match(/<analysis>([\s\S]*?)<\/analysis>/);
  if (Q) {
      let G = Q[1] || "";
      B = B.replace(/<analysis>[\s\S]*?<\/analysis>/, `Analysis:
${G.trim()}

function BU2(A, B) {
  let I = `This session is being continued from a previous conversation that ran out of context. The conversation is summarized below:
${tY5(A)}

function eY5() {
  return null;
  if (x1().existsSync(A)) try {
      return x1().readFileSync(A, {
          encoding: "utf8"
      }

async function QU2(A) {
  return
}

async function aJ(A) {
  let B = IU2;
  for await (let Q of A) B = Q;
  if (B === IU2) throw new Error("No items in generator");
  return B
}

async function Ne1(A) {
  let B = [];
  for await (let Q of A) B.push(Q);
  return B
}

function DU2(A) {
  return ai(A, e9())
}

function YU2(A, B) {
  try {
      if (x1().existsSync(A)) {
          if (!x1().statSync(A).isFile()) return null;
          let I = x1().readFileSync(A, {
              encoding: "utf-8"
          }

function IW5(A, B) {
  let Q = new Set,
      G = new WW().lex(A);

  function Z(D) {
      for (let Y of D) {
          if (Y.type === "code" || Y.type === "codespan") continue;
          if (Y.type === "text") {
              let W = Y.text || "",
                  J = /(?:^|\s)@((?:[^\s\\]|\\ )+)/g,
                  F;
              while ((F = J.exec(W)) !== null) {
                  let X = F[1];
                  if (!X) continue;
                  if (X = X.replace(/\\ /g, " "), X) {
                      if (X.startsWith("./") || X.startsWith("~/") || X.startsWith("/") && X !== "/" || !X.startsWith("@") && !X.match(/^[#%^&*()]+/) && X.match(/^[a-zA-Z0-9._-]/)) {
                          let C = c81(X, B);
                          Q.add(C)
                      }

function Eu(A, B, Q, I, G = 0, Z) {
  if (Q.has(A) || G >= GW5) return [];
  let D = YU2(A, B);
  if (!D || !D.content.trim()) return [];
  if (Z) D.parent = Z;
  Q.add(A);
  let Y = [];
  Y.push(D);
  let W = IW5(D.content, A);
  for (let J of W) {
      if (!DU2(J) && !I) continue;
      let X = Eu(J, B, Q, I, G + 1, A);
      Y.push(...X)
  }

function NH1() {
  return dG().filter((A) => A.content.length > k11)
}

function lO() {
  return null
}

function JU2(A, B) {
  let Q = [];
  if (!eF(A, B)) return Q;
  let I = new Set,
      G = e9(),
      Z = qe1(BW5(A)),
      D = [],
      Y = Z;
  while (Y !== G && Y !== ZU2(Y).root) {
      if (Y.startsWith(G)) D.push(Y);
      Y = qe1(Y)
  }

function Me1() {
  for (let A of dG(!0))
      if (A.type !== "User" && A.parent && !DU2(A.path)) return !0;
  return !1
}

async function FU2() {
  let A = m9();
  if (A.hasClaudeMdExternalIncludesApproved || A.hasClaudeMdExternalIncludesWarningShown) return !1;
  return Me1()
}

async function DW5(A, B, Q, I) {
  let G = new AbortController;
  setTimeout(() => {
      G.abort()
  }

async function hK(A) {
  try {
      return await A()
  }

function YW5(A) {
  if (!A) return [];
  return A.filter((B) => B.mode === "prompt").map((B) => ({
      type: "queued_command",
      prompt: B.value
  }

function WW5(A) {
  if (A.getToolPermissionContext().mode !== "plan") return [];
  return [{
      type: "plan_mode"
  }

function JW5() {
  return []
}

function FW5() {
  return []
}

function XW5(A, B) {
  if (!A ? .text || !A.filePath) return [];
  let Q = TF1(B.options.mcpClients) ? ? "IDE";
  return [{
      type: "selected_lines_in_ide",
      filename: A.filePath,
      content: A.text,
      ideName: Q
  }

function VW5(A) {
  if (!A ? .filePath || A.text) return [];
  return [{
      type: "opened_file_in_ide",
      filename: A.filePath
  }

async function CW5(A, B) {
  let Q = wW5(A);
  return (await Promise.all(Q.map(async (G) => {
      try {
          let {
              filename: Z,
              lineStart: D,
              lineEnd: Y
          }

async function KW5(A, B) {
  let Q = EW5(A);
  if (Q.length === 0) return [];
  let I = B.options.mcpClients || [];
  return (await Promise.all(Q.map(async (Z) => {
      try {
          let [D, ...Y] = Z.split(":"), W = Y.join(":");
          if (!D || !W) return E1("tengu_at_mention_mcp_resource_error", {}

async function HW5(A) {
  return (await Promise.all(Object.entries(A.readFileState).map(async ([Q, I]) => {
      try {
          if (x1().statSync(Q).mtimeMs <= I.timestamp) return;
          let Z = {
              file_path: Q
          }

async function zW5(A) {
  let B = [];
  if (A.nestedMemoryAttachmentTriggers && A.nestedMemoryAttachmentTriggers.size > 0) {
      for (let Q of A.nestedMemoryAttachmentTriggers) try {
          let I = JU2(Q, A.getToolPermissionContext());
          for (let G of I)
              if (!A.readFileState[G.path]) B.push({
                  type: "nested_memory",
                  path: G.path,
                  content: G
              }

function wW5(A) {
  let B = /(^|\s)@([^\s]+)\b/g,
      Q = A.match(B) || [];
  return [...new Set(Q.map((I) => I.slice(I.indexOf("@") + 1)))]
}

function EW5(A) {
  let B = /(^|\s)@([^\s]+:[^\s]+)\b/g,
      Q = A.match(B) || [];
  return [...new Set(Q.map((I) => I.slice(I.indexOf("@") + 1)))]
}

function UW5(A) {
  let B = A.match(/^([^#]+)(?:#L(\d+)(?:-(\d+))?)?$/);
  if (!B) return {
      filename: A
  }

async function NW5() {
  let A = await SK.getNewDiagnostics();
  if (A.length === 0) return [];
  return [{
      type: "diagnostics",
      files: A,
      isNew: !0
  }

async function Le1(A, B, Q, I, G) {
  let {
      offset: Z,
      limit: D
  }

async function W() {
          try {
              let F = {
                      file_path: A,
                      offset: Z ? ? 1,
                      limit: 100
                  }

function Nu(A) {
  return {
      attachment: A,
      type: "attachment",
      uuid: ZW5(),
      timestamp: new Date().toISOString()
  }

function f11(A) {
  if (A === "Local") return "project (local)";
  return A.toLowerCase()
}

function Re1(A) {
  let B = {
          toolRequests: new Map,
          toolResults: new Map,
          humanMessages: 0,
          assistantMessages: 0,
          localCommandOutputs: 0,
          other: 0,
          attachments: new Map,
          duplicateFileReads: new Map,
          total: 0
      }

function KU2(A, B, Q) {
  A.set(B, (A.get(B) || 0) + Q)
}

function HU2(A) {
  let B = {
      total_tokens: A.total,
      human_message_tokens: A.humanMessages,
      assistant_message_tokens: A.assistantMessages,
      local_command_output_tokens: A.localCommandOutputs,
      other_tokens: A.other
  }

async function qH1(A, B, Q, I) {
  try {
      if (A.length === 0) throw new Error(v11);
      let G = VE(A),
          Z = Re1(A),
          D = {}

function OW5(A, B) {
  if (ki(A, b11) || ki(A, v11)) B.addNotification ? .({
      text: ""
  }

async function TW5(A, B, Q) {
  let I = Object.entries(A).map(([D, Y]) => ({
          filename: D,
          ...Y
      }

function PW5(A) {
  let B = jJ(A);
  if (B.length === 0) return null;
  return Nu({
      type: "todo",
      content: B,
      itemCount: B.length,
      context: "post-compact"
  }

function SW5(A, B) {
  let Q = qS(A);
  try {
      let I = qS(cR(B));
      if (Q === I) return !0
  }

function zU2() {
  let A = J7(),
      B = Ee1(A);
  return VU2 - B
}

function m11(A, B) {
  let Q = zU2() * B,
      I = g11() ? Q : zU2(),
      G = Math.max(0, Math.round((I - A) / I * 100)),
      Z = I * _W5,
      D = I * jW5,
      Y = A >= Z,
      W = A >= D,
      J = g11() && A >= Q;
  return {
      percentLeft: G,
      isAboveWarningThreshold: Y,
      isAboveErrorThreshold: W,
      isAboveAutoCompactThreshold: J
  }

function g11() {
  return ZA().autoCompactEnabled
}

async function yW5(A) {
  if (!g11()) return !1;
  let B = VE(A),
      {
          isAboveAutoCompactThreshold: Q
      }

async function wU2(A, B) {
  if (!await yW5(A)) return {
      messages: A,
      wasCompacted: !1
  }

function EU2({
  notebook_path: A,
  cell_id: B,
  new_source: Q,
  cell_type: I,
  edit_mode: G = "replace",
  verbose: Z
}) {
  let D = G === "delete" ? "delete" : `${G}

function mW5(A, B) {
  return A.reduce((Q, I) => {
      let G = B.options.tools.find((Y) => Y.name === I.name),
          Z = G ? .inputSchema.safeParse(I.input),
          D = Z ? .success ? Boolean(G ? .isConcurrencySafe(Z.data)) : !1;
      if (D && Q[Q.length - 1] ? .isConcurrencySafe) Q[Q.length - 1].blocks.push(I);
      else Q.push({
          isConcurrencySafe: D,
          blocks: [I]
      }

function Oe1(A, B) {
  A.setInProgressToolUseIDs((Q) => new Set([...Q].filter((I) => I !== B)))
}

function cW5(A) {
  if (A instanceof NG) return VV;
  if (!(A instanceof Error)) return String(A);
  let Q = lW5(A).filter(Boolean).join(`
`).trim() || "Error";
  if (Q.length <= 1e4) return Q;
  let I = 5000,
      G = Q.slice(0, I),
      Z = Q.slice(-I);
  return `${G}

function lW5(A) {
  if (A instanceof Uz) return [A.interrupted ? VV : "", A.stderr, A.stdout];
  let B = [A.message];
  if ("stderr" in A && typeof A.stderr === "string") B.push(A.stderr);
  if ("stdout" in A && typeof A.stdout === "string") B.push(A.stdout);
  return B
}

function MU2(A, B) {
  let Q = B.errors.filter((Y) => Y.code === "invalid_type" && Y.received === "undefined" && Y.message === "Required").map((Y) => String(Y.path[0])),
      I = B.errors.filter((Y) => Y.code === "unrecognized_keys").flatMap((Y) => Y.keys),
      G = B.errors.filter((Y) => Y.code === "invalid_type" && ("received" in Y) && Y.received !== "undefined" && Y.message !== "Required").map((Y) => {
          let W = Y;
          return {
              param: String(Y.path[0]),
              expected: W.expected,
              received: W.received
          }

function LH1(A) {
  let B = S4(),
      Q = dA(),
      I = A.startsWith(B) ? "~/" + LU2(B, A) : null,
      G = A.startsWith(Q) ? "./" + LU2(Q, A) : null;
  if (I && G) return I.length <= G.length ? I : G;
  return I || G || A
}

function RU2({
  memoryType: A,
  memoryPath: B
}) {
  let Q = LH1(B);
  return d11.createElement(h, {
      flexDirection: "column",
      flexGrow: 1
  }

function OU2(A) {
  return `You have been asked to add a memory to the memory file at ${A}

function u11(A) {
  if (!x1().existsSync(A)) return "";
  return x1().readFileSync(A, {
      encoding: "utf-8"
  }

function TU2(A) {
  try {
      nW5("git", ["rev-parse", "--is-inside-work-tree"], {
          cwd: A,
          stdio: "ignore"
      }

async function RH1(A) {
  let B = iW5(A);
  await R31("CLAUDE.local.md", B)
}

function gK(A) {
  let B = e9();
  if (A === "ExperimentalUltraClaudeMd") return gK("User");
  switch (A) {
      case "User":
          return p11(S4(), "CLAUDE.md");
      case "Local":
          return p11(B, "CLAUDE.local.md");
      case "Project":
          return p11(B, "CLAUDE.md");
      case "Managed":
          return p11(pS1(), "CLAUDE.md");
      case "ExperimentalUltraClaudeMd":
          return p11(S4(), "ULTRACLAUDE.md")
  }

async function aW5(A, B, Q) {
  if (A !== nJ) return {
      behavior: "ask",
      message: "Used incorrect tool"
  }

function sW5() {
  let A = ZA(),
      B = (A.memoryUsageCount || 0) + 1;
  j0({ ...A,
      memoryUsageCount: B
  }

function _U2() {
  let [A, B] = c11.useState(0), [Q, I] = c11.useState({
      show: !1
  }

function oe1({
  message: A,
  title: B
}) {
  let Q = B ? `${B}

function JF5({
  message: A,
  title: B
}) {
  try {
      let Q = B || m0;
      process.stdout.write(`\x1B]777;notify;${Q}

function te1() {
  process.stdout.write("\x07")
}

async function FF5(A, B) {
  return;
  try {
      let Q = A.title || m0,
          I = c81(B, dA());
      await u0(I, [Q, A.message])
  }

async function XF5() {
  try {
      if (mA.terminal !== "Apple_Terminal") return !1;
      let B = (await u0("osascript", ["-e", 'tell application "Terminal" to name of current settings of front window'])).stdout.trim();
      if (!B) return !1;
      let Q = await u0("defaults", ["export", "com.apple.Terminal", "-"]);
      if (Q.code !== 0) return !1;
      let Z = e$2.default.parse(Q.stdout) ? .["Window Settings"] ? .[B];
      if (!Z) return !1;
      return Z.Bell === !1
  }

async function _u(A) {
  let B = ZA(),
      Q = B.preferredNotifChannel,
      I = "none";
  if (B.customNotifyCommand) await FF5(A, B.customNotifyCommand);
  switch (Q) {
      case "auto":
          if (mA.terminal === "Apple_Terminal")
              if (await XF5()) te1(), I = "terminal_bell";
              else I = "no_method_available";
          else if (mA.terminal === "iTerm.app") oe1(A), I = "iterm2";
          else if (mA.terminal === "kitty") t$2(A), I = "kitty";
          else if (mA.terminal === "ghostty") JF5(A), I = "ghostty";
          else I = "no_method_available";
          break;
      case "iterm2":
          oe1(A), I = "iterm2";
          break;
      case "terminal_bell":
          te1(), I = "terminal_bell";
          break;
      case "iterm2_with_bell":
          oe1(A), te1(), I = "iterm2_with_bell";
          break;
      case "kitty":
          t$2(A), I = "kitty";
          break;
      case "notifications_disabled":
          I = "disabled";
          break
  }

function Bq2(A, B = !1) {
  Aq2.useEffect(() => {
      if (!B) RG1(A)
  }

function Qq2() {
  return GA1.createElement(w0, {
      height: 1
  }

function ju() {
  return ee1.createElement(P, {
      color: "error"
  }

function Iq2({
  progressMessagesForMessage: A,
  tool: B,
  tools: Q,
  param: I,
  verbose: G
}) {
  if (typeof I.content === "string" && I.content.startsWith(VV)) return Ny.createElement(w0, {
      height: 1
  }

function Gq2({
  input: A,
  progressMessagesForMessage: B,
  style: Q,
  tool: I,
  tools: G,
  messages: Z,
  verbose: D
}) {
  let {
      columns: Y
  }

function Dq2({
  message: A,
  progressMessagesForMessage: B,
  style: Q,
  tool: I,
  tools: G,
  verbose: Z,
  width: D
}) {
  let [Y] = q9();
  if (!A.toolUseResult || !I) return null;
  return DA1.createElement(h, {
      flexDirection: "row",
      width: D
  }

function CF5(A, B) {
  let Q = null;
  for (let I of B) {
      if (I.type !== "assistant" || !Array.isArray(I.message.content)) continue;
      for (let G of I.message.content)
          if (G.type === "tool_use" && G.id === A) Q = G
  }

function Wq2(A, B, Q) {
  return Yq2.useMemo(() => {
      let I = CF5(A, Q);
      if (!I) return null;
      let G = B.find((Z) => Z.name === I.name);
      if (!G) return null;
      return {
          tool: G,
          toolUse: I
      }

function Jq2({
  param: A,
  message: B,
  messages: Q,
  progressMessagesForMessage: I,
  style: G,
  tools: Z,
  verbose: D,
  width: Y
}) {
  let W = Wq2(A.tool_use_id, Z, Q);
  if (!W) return null;
  if (A.content === Ju) return x$.createElement(Qq2, null);
  if (A.content === N11 || A.content === VV) return x$.createElement(Gq2, {
      input: W.toolUse.input,
      progressMessagesForMessage: I,
      tool: W.tool,
      tools: Z,
      messages: Q,
      style: G,
      verbose: D
  }

function CV(A, B) {
  let Q = sD.useRef(A);
  jF5(() => {
      Q.current = A
  }

function yF5(A) {
  let B = sD.useRef(A);
  B.current = A, sD.useEffect(() => () => {
      B.current()
  }

function sH1(A, B = 500, Q) {
  let I = sD.useRef();
  yF5(() => {
      if (I.current) I.current.cancel()
  }

function Kq2({
  isError: A,
  isUnresolved: B,
  shouldAnimate: Q
}) {
  let [I, G] = rH1.default.useState(!0);
  return CV(() => {
      if (!Q) return;
      G((D) => !D)
  }

function Hq2({
  param: A,
  addMargin: B,
  tools: Q,
  verbose: I,
  erroredToolUseIDs: G,
  inProgressToolUseIDs: Z,
  resolvedToolUseIDs: D,
  progressMessagesForMessage: Y,
  shouldAnimate: W,
  shouldShowDot: J
}) {
  let [F] = q9(), X = Q.find((O) => O.name === A.name);
  if (!X) return b1(new Error(`Tool ${A.name}

function kF5(A, B, {
  theme: Q,
  verbose: I
}) {
  try {
      let G = A.inputSchema.safeParse(B);
      if (!G.success) return "";
      return A.renderToolUseMessage(G.data, {
          theme: Q,
          verbose: I
      }

function xF5(A, B, Q, {
  verbose: I
}) {
  try {
      return A.renderToolUseProgressMessage(Q, {
          tools: B,
          verbose: I
      }

function fF5(A) {
  try {
      return A.renderToolUseQueuedMessage ? .()
  }

function zq2({
  param: {
      text: A
  },
  addMargin: B,
  shouldShowDot: Q
}) {
  let {
      columns: I
  }

function oH1({
  param: {
      text: A
  },
  addMargin: B
}) {
  let Q = mG(A, "bash-input");
  if (!Q) return null;
  return f$.createElement(h, {
      flexDirection: "column",
      marginTop: B ? 1 : 0,
      width: "100%"
  }

function wq2({
  addMargin: A,
  param: {
      text: B
  }
}) {
  let Q = mG(B, "command-message"),
      I = mG(B, "command-args");
  if (!Q) return null;
  return YA1.createElement(h, {
      flexDirection: "column",
      marginTop: A ? 1 : 0,
      width: "100%"
  }

function Eq2({
  addMargin: A,
  param: {
      text: B
  }
}) {
  let {
      columns: Q
  }

function vF5() {
  return Uq2.sample(["Got it.", "Good to know.", "Noted."])
}

function Nq2({
  param: {
      text: A
  },
  addMargin: B
}) {
  let Q = mG(A, "user-memory-input");
  if (!Q) return null;
  return rJ.createElement(h, {
      flexDirection: "column",
      marginTop: B ? 1 : 0,
      width: "100%"
  }

function qq2({
  content: A
}) {
  let B = mG(A, "local-command-stdout"),
      Q = mG(A, "local-command-stderr");
  if (!B && !Q) return oJ.createElement(w0, null, oJ.createElement(P, {
      color: "secondaryText"
  }

function tH1({
  addMargin: A,
  param: B,
  verbose: Q
}) {
  if (B.text.trim() === AW) return null;
  if (B.text.startsWith("<bash-stdout") || B.text.startsWith("<bash-stderr")) return uG.createElement($q2, {
      content: B.text,
      verbose: Q
  }

function Mq2({
  param: {
      thinking: A
  },
  addMargin: B = !1
}) {
  let [Q] = q9();
  if (!A) return null;
  return FA1.default.createElement(h, {
      flexDirection: "column",
      gap: 1,
      marginTop: B ? 1 : 0,
      width: "100%"
  }

function Lq2({
  addMargin: A = !1
}) {
  return Z1A.default.createElement(h, {
      marginTop: A ? 1 : 0
  }

function Rq2({
  attachment: A,
  verbose: B
}) {
  if (A.files.length === 0) return null;
  let Q = A.files.reduce((G, Z) => G + Z.diagnostics.length, 0),
      I = A.files.length;
  if (B) return zE.default.createElement(h, {
      flexDirection: "column"
  }

function Oq2({
  attachment: A,
  addMargin: B,
  verbose: Q
}) {
  switch (A.type) {
      case "new_directory":
          return HW.default.createElement(v$, {
              text: `Listed directory ${UA.bold(XA1(dA(),A.path)+gF5)}

function Tq2({
  message: A,
  addMargin: B,
  verbose: Q
}) {
  let {
      columns: I
  }

function wE({
  message: A,
  messages: B,
  addMargin: Q,
  tools: I,
  verbose: G,
  erroredToolUseIDs: Z,
  inProgressToolUseIDs: D,
  resolvedToolUseIDs: Y,
  progressMessagesForMessage: W,
  shouldAnimate: J,
  shouldShowDot: F,
  style: X,
  width: V
}) {
  switch (A.type) {
      case "attachment":
          return TB.createElement(Oq2, {
              addMargin: Q,
              attachment: A.attachment,
              verbose: G
          }

function hF5({
  message: A,
  messages: B,
  addMargin: Q,
  tools: I,
  progressMessagesForMessage: G,
  param: Z,
  style: D,
  verbose: Y
}) {
  let {
      columns: W
  }

function mF5({
  param: A,
  addMargin: B,
  tools: Q,
  verbose: I,
  erroredToolUseIDs: G,
  inProgressToolUseIDs: Z,
  resolvedToolUseIDs: D,
  progressMessagesForMessage: Y,
  shouldAnimate: W,
  shouldShowDot: J,
  width: F
}) {
  switch (A.type) {
      case "tool_use":
          return TB.createElement(Hq2, {
              param: A,
              addMargin: B,
              tools: Q,
              verbose: I,
              erroredToolUseIDs: G,
              inProgressToolUseIDs: Z,
              resolvedToolUseIDs: D,
              progressMessagesForMessage: Y,
              shouldAnimate: W,
              shouldShowDot: J
          }

function Pq2({
  erroredToolUseIDs: A,
  messages: B,
  onSelect: Q,
  onEscape: I,
  tools: G,
  resolvedToolUseIDs: Z
}) {
  let D = oO.useMemo(dF5, []);
  oO.useEffect(() => {
      E1("tengu_message_selector_opened", {}

function Y(E) {
      let N = B.length - 1 - B.indexOf(E);
      E1("tengu_message_selector_selected", {
          index_from_end: N,
          message_type: E.type,
          is_current_prompt: E.uuid === D
      }

function W() {
      E1("tengu_message_selector_cancelled", {}

function uF5(A) {
  if (A.type !== "user") return !1;
  if (Array.isArray(A.message.content) && A.message.content[0] ? .type === "tool_result") return !1;
  if (oK1(A)) return !1;
  if (A.isMeta) return !1;
  return !0
}

function _q2(A, B) {
  let [Q] = q9(), [, I] = d5();
  Sq2.useEffect(() => {
      I((F) => {
          let X = DV(),
              V = B ? { ...X,
                  ...B
              }

function yq2(A) {
  jq2.useEffect(() => {
      if (!A.length) return;
      let B = IW(A);
      if (B) B.client.setNotificationHandler(pF5, async (Q) => {
          let {
              eventName: I,
              eventData: G
          }

function o5(A) {
  E1("tengu_unary_event", {
      event: A.event,
      completion_type: A.completion_type,
      language_name: A.metadata.language_name,
      message_id: A.metadata.message_id,
      platform: A.metadata.platform
  }

function KV(A, B) {
  kq2.useEffect(() => {
      E1("tengu_tool_use_show_permission_request", {
          messageID: A.assistantMessage.message.id,
          toolName: A.tool.name
      }

function mI({
  title: A
}) {
  return VA1.createElement(h, {
      flexDirection: "column"
  }

function ku({
  onChange: A,
  toolUseContext: B,
  filePath: Q,
  edits: I,
  editMode: G
}) {
  let Z = $y.useRef(!1),
      D = $y.useMemo(() => cF5().slice(0, 6), []),
      Y = $y.useMemo(() => `✻ [Autocoder] ${lF5(Q)}

async function F() {
      if (!W) return;
      E1("tengu_ext_will_show_diff", {}

function iF5(A, B, Q, I) {
  let G = I === "single",
      Z = UE2({
          filePath: A,
          oldContent: B,
          newContent: Q,
          singleHunk: G
      }

async function nF5(A, B, Q, I) {
  let G = !1,
      Z = x1(),
      D = d3(A),
      Y = Z.existsSync(D) ? wI(D) : "";
  async function W() {
      if (G) return;
      G = !0;
      try {
          await xq2(I, Q, J)
      }

async function xq2(A, B, Q) {
  try {
      if (!Q || Q.type !== "connected") throw new Error("IDE client not available");
      await gw("close_tab", {
          tab_name: A
      }

function aF5(A) {
  return A.type === "result" && Array.isArray(A.data) && typeof A.data[0] === "object" && A.data[0] !== null && "type" in A.data[0] && A.data[0].type === "text" && "text" in A.data[0] && A.data[0].text === "TAB_CLOSED"
}

function sF5(A) {
  return A.type === "result" && Array.isArray(A.data) && typeof A.data[0] === "object" && A.data[0] !== null && "type" in A.data[0] && A.data[0].type === "text" && "text" in A.data[0] && A.data[0].text === "DIFF_REJECTED"
}

function rF5(A) {
  return A.type === "result" && Array.isArray(A.data) && A.data[0] ? .type === "text" && A.data[0].text === "FILE_SAVED" && typeof A.data[1].text === "string"
}

function xu({
  onChange: A,
  options: B,
  input: Q,
  file_path: I,
  ideName: G
}) {
  return pG.createElement(h, {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "permission",
      marginTop: 1,
      paddingLeft: 1,
      paddingRight: 1,
      paddingBottom: 1
  }

function Az1({
  file_path: A,
  edits: B,
  verbose: Q,
  useBorder: I = !0
}) {
  let G = D1A.useMemo(() => x1().existsSync(A) ? wI(A) : "", [A]),
      Z = D1A.useMemo(() => iJ({
          filePath: A,
          fileContents: G,
          edits: B
      }

function tO(A, {
  assistantMessage: {
      message: {
          id: B
      }
  }
}, Q) {
  o5({
      completion_type: A,
      event: Q,
      metadata: {
          language_name: "none",
          message_id: B,
          platform: mA.platform
      }

function eO(A, B, Q, I) {
  let G = B === "edit" ? "acceptEdits" : Q.mode,
      Z = d3(A),
      Y = eF(A, Q) ? Q.additionalWorkingDirectories : new Set([...Q.additionalWorkingDirectories, CA1(Z)]);
  I({ ...Q,
      mode: G,
      additionalWorkingDirectories: Y
  }

function CA1(A) {
  let B = d3(A);
  try {
      if (x1().statSync(B).isDirectory()) return B
  }

function eJ(A, B) {
  let Q = eF(A, B) ? `Yes, and don't ask again this session (${UA.bold.dim("shift+tab")}

function fq2({
  setToolPermissionContext: A,
  toolUseConfirm: B,
  toolUseContext: Q,
  onDone: I,
  onReject: G,
  verbose: Z
}) {
  let D = gI.inputSchema.parse(B.input),
      {
          file_path: Y,
          new_string: W,
          old_string: J,
          replace_all: F = !1
      }

function C(q, {
      file_path: O,
      edits: R
  }) {
      K();
      let {
          old_string: T,
          new_string: L
      }

function Bz1(A, B) {
  vq2.useEffect(() => {
      E1("tengu_tool_use_show_permission_request", {
          messageID: A.assistantMessage.message.id,
          toolName: A.tool.name,
          isMcp: A.tool.isMcp ? ? !1
      }

function BX5(A) {
  switch (A.length) {
      case 0:
          return "";
      case 1:
          return UA.bold(A[0]);
      case 2:
          return UA.bold(A[0]) + " and " + UA.bold(A[1]);
      default:
          return UA.bold(A.slice(0, -1).join(", ")) + ", and " + UA.bold(A.slice(-1)[0])
  }

function QX5(A) {
  let B = BX5(A);
  if (B.length > 50) return "similar";
  else return B
}

function IX5(A) {
  return A.flatMap((B) => {
      if (!B.ruleContent) return [];
      return mt1(B.ruleContent) ? ? B.ruleContent
  }

function bq2({
  toolUseConfirm: A
}) {
  let {
      permissionResult: B
  }

function GX5(A) {
  switch (A) {
      case "cliArg":
          return "CLI argument";
      case "command":
          return "command configuration";
      case "localSettings":
          return "local settings";
      case "projectSettings":
          return "project settings";
      case "policySettings":
          return "managed settings";
      case "userSettings":
          return "global settings"
  }

function gq2(A) {
  switch (A.type) {
      case "rule":
          return `${UA.bold(m8(A.rule.ruleValue))}

function ZX5({
  title: A,
  decisionReason: B
}) {
  let [Q] = q9();

  function I() {
      switch (B.type) {
          case "subcommandResults":
              return K8.default.createElement(h, {
                  flexDirection: "column"
              }

function hq2({
  permissionResult: A
}) {
  let B = A.decisionReason,
      Q = A.behavior !== "allow" ? A.ruleSuggestions : void 0,
      I = 10;
  return K8.default.createElement(h, {
      flexDirection: "column"
  }

function mq2({
  setToolPermissionContext: A,
  toolUseConfirm: B,
  onDone: Q,
  onReject: I
}) {
  let [G] = q9(), {
      command: Z,
      description: D
  }

function X(V) {
      switch (V) {
          case "yes":
              tO("tool_use_single", B, "accept"), B.onAllow("temporary", B.input), Q();
              break;
          case "yes-dont-ask-again-prefix":
              {
                  tO("tool_use_single", B, "accept");
                  let C = B.permissionResult.behavior !== "allow" ? B.permissionResult.ruleSuggestions : void 0;
                  if (C) ni({
                      ruleValues: C,
                      ruleBehavior: "allow",
                      destination: "localSettings",
                      initialContext: B.toolUseContext.getToolPermissionContext(),
                      setToolPermissionContext: A
                  }

function Qz1({
  setToolPermissionContext: A,
  toolUseConfirm: B,
  onDone: Q,
  onReject: I,
  verbose: G
}) {
  let [Z] = q9(), D = B.tool.userFacingName(B.input), Y = D.endsWith(" (MCP)") ? D.slice(0, -6) : D, W = AF.useMemo(() => ({
      completion_type: "tool_use_single",
      language_name: "none"
  }

function uq2() {
  if (ZA().messageIdleNotifThresholdMs !== NX.messageIdleNotifThresholdMs) return 0;
  return dq2
}

function DX5() {
  return Date.now() - V21()
}

function YX5(A) {
  return DX5() < A
}

function WX5(A) {
  return !YX5(A)
}

function pq2(A, B = dq2) {
  Y1A.useEffect(() => {
      JX5(), Fc()
  }

function cq2({
  file_path: A,
  content: B,
  verbose: Q
}) {
  let I = Iz1.useMemo(() => x1().existsSync(A), [A]),
      G = Iz1.useMemo(() => {
          if (!I) return "";
          let D = UG(A);
          return x1().readFileSync(A, {
              encoding: D
          }

function lq2({
  setToolPermissionContext: A,
  toolUseConfirm: B,
  toolUseContext: Q,
  onDone: I,
  onReject: G,
  verbose: Z
}) {
  let {
      file_path: D,
      content: Y
  }

function X(N, {
      file_path: q,
      content: O
  }) {
      switch (C(), N) {
          case "yes":
              o5({
                  completion_type: "write_file_single",
                  event: "accept",
                  metadata: {
                      language_name: $G(q),
                      message_id: B.assistantMessage.message.id,
                      platform: mA.platform
                  }

function CX5(A) {
  let B = A.tool;
  if ("getPath" in B && typeof B.getPath === "function") try {
      return B.getPath(A.input)
  }

function KX5(A) {
  let B = d3(A);
  try {
      return x1().existsSync(B) && x1().statSync(B).isFile()
  }

function HX5(A, B, Q) {
  if (A === null) return [{
      label: "Yes",
      value: "yes"
  }

function iq2({
  toolUseConfirm: A,
  onDone: B,
  onReject: Q,
  verbose: I,
  setToolPermissionContext: G,
  toolUseContext: Z
}) {
  let [D] = q9(), Y = CX5(A), W = A.tool.userFacingName(A.input), {
      toolType: J,
      userFacingReadOrEdit: F
  }

function K(E) {
      switch (E) {
          case "yes":
              o5({
                  completion_type: "tool_use_single",
                  event: "accept",
                  metadata: {
                      language_name: "none",
                      message_id: A.assistantMessage.message.id,
                      platform: mA.platform
                  }

function qH5() {
  let A = Date.now();
  for (let [B, Q] of mz1.entries())
      if (A - Q.timestamp > zO2) mz1.delete(B)
}

function RH5(A) {
  if (A.length > MH5) return !1;
  let B;
  try {
      B = new URL(A)
  }

async function OH5(A) {
  try {
      let B = await P4.get(`https://claude.ai/api/web/domain_info?domain=${encodeURIComponent(A)}

function TH5(A, B) {
  try {
      let Q = new URL(A),
          I = new URL(B);
      if (I.protocol !== Q.protocol) return !1;
      if (I.port !== Q.port) return !1;
      if (I.username || I.password) return !1;
      let G = (Y) => Y.replace(/^www\./, ""),
          Z = G(Q.hostname),
          D = G(I.hostname);
      return Z === D
  }

async function wO2(A, B, Q) {
  try {
      return await P4.get(A, {
          signal: B,
          maxRedirects: 0,
          responseType: "arraybuffer",
          maxContentLength: LH5
      }

async function EO2(A, B) {
  if (!RH5(A)) throw new Error("Invalid URL");
  qH5();
  let Q = Date.now(),
      I = mz1.get(A);
  if (I && Q - I.timestamp < zO2) return {
      bytes: I.bytes,
      code: I.code,
      codeText: I.codeText,
      content: I.content
  }

async function UO2(A, B, Q, I) {
  let G = $a0(B, A),
      Z = await cZ({
          systemPrompt: [],
          userPrompt: G,
          isNonInteractiveSession: I,
          signal: Q,
          promptCategory: "web_fetch_apply"
      }

function SH5(A) {
  try {
      let B = $W.inputSchema.safeParse(A);
      if (!B.success) return `input:${A.toString()}

function _H5(A) {
  try {
      let B = $W.inputSchema.safeParse(A);
      if (!B.success) return `input:${A.toString()}

function NO2({
  setToolPermissionContext: A,
  toolUseConfirm: B,
  onDone: Q,
  onReject: I,
  verbose: G
}) {
  let [Z] = q9(), {
      url: D
  }

function F(X) {
      switch (X) {
          case "yes":
              tO("tool_use_single", B, "accept"), B.onAllow("temporary", B.input), Q();
              break;
          case "yes-dont-ask-again-domain":
              tO("tool_use_single", B, "accept"), f81({
                  rule: {
                      ruleBehavior: "allow",
                      ruleValue: {
                          toolName: B.tool.name,
                          ruleContent: _H5(B.input)
                      }

function kH5(A, B) {
  let Q = eF(A, B) ? [{
      label: "Yes, and don't ask again this session",
      value: "yes-dont-ask-again"
  }

function qO2({
  setToolPermissionContext: A,
  toolUseConfirm: B,
  onDone: Q,
  onReject: I,
  verbose: G
}) {
  let {
      columns: Z
  }

function X(V) {
      switch (V) {
          case "yes":
              o5({
                  completion_type: "tool_use_single",
                  event: "accept",
                  metadata: {
                      language_name: W,
                      message_id: B.assistantMessage.message.id,
                      platform: mA.platform
                  }

function MO2({
  setToolPermissionContext: A,
  toolUseConfirm: B,
  toolUseContext: Q,
  onDone: I,
  onReject: G,
  verbose: Z
}) {
  let D = S$.inputSchema.parse(B.input),
      Y = D.file_path,
      W = D.edits.map((E) => ({
          old_string: E.old_string,
          new_string: E.new_string,
          replace_all: E.replace_all ? ? !1
      }

function X(E, {
      file_path: N,
      edits: q
  }) {
      switch (V(), E) {
          case "yes":
              o5({
                  completion_type: "str_replace_multi",
                  event: "accept",
                  metadata: {
                      language_name: $G(N),
                      message_id: B.assistantMessage.message.id,
                      platform: mA.platform
                  }

function LO2({
  toolUseConfirm: A,
  setToolPermissionContext: B,
  onDone: Q,
  onReject: I
}) {
  let [G] = q9();

  function Z(D) {
      if (D === "yes") B({ ...A.toolUseContext.getToolPermissionContext(),
          mode: "acceptEdits"
      }

function fH5(A) {
  switch (A) {
      case gI:
          return fq2;
      case S$:
          return MO2;
      case nJ:
          return lq2;
      case E4:
          return mq2;
      case $W:
          return NO2;
      case iO:
          return qO2;
      case hO:
          return LO2;
      case g$:
      case qy:
      case WE:
      case OB:
      case J11:
          return iq2;
      default:
          return Qz1
  }

function RO2({
  toolUseConfirm: A,
  toolUseContext: B,
  onDone: Q,
  onReject: I,
  verbose: G,
  setToolPermissionContext: Z
}) {
  Z0((W, J) => {
      if (J.ctrl && W === "c") Q(), I(), A.onReject()
  }

async function gH5(A) {
  if (mA.platform === "win32") return [];
  if (!await jz()) return [];
  try {
      let B = "",
          {
              stdout: Q
          }

function uz1(A) {
  return (A.match(/\r\n|\r|\n/g) || []).length
}

function yAA(A, B) {
  return `[Pasted text #${A}

function PO2(A) {
  return `[Image #${A}

function mH5(A, B) {
  return `[...Truncated text #${A}

function SO2(A) {
  let B = /\[(Pasted text|Image|\.\.\.Truncated text) #(\d+)(?: \+\d+ lines)?(\.)*\]/g;
  return [...A.matchAll(B)].map((I) => ({
      id: parseInt(I[2] || "0"),
      match: I[0]
  }

function jAA(A) {
  return typeof A !== "string"
}

function dH5() {
  return m9().history ? ? []
}

function pz1() {
  let A = [];
  for (let B of dH5()) {
      if (!jAA(B)) {
          A.push({
              display: B,
              pastedContents: {}

function uH5(A, B) {
  if (!A || !B) return !A && !B;
  let Q = Object.keys(A).map(Number),
      I = Object.keys(B).map(Number);
  if (Q.length !== I.length) return !1;
  for (let G of Q) {
      let Z = A[G],
          D = B[G];
      if (!Z || !D || Z.content !== D.content) return !1
  }

function pH5(A, B) {
  if (jAA(A) && jAA(B)) return A.display === B.display && uH5(A.pastedContents, B.pastedContents);
  return A === B
}

function _O2(A, B) {
  if (A.length <= cH5) return {
      truncatedText: A,
      placeholderContent: ""
  }

function GT(A) {
  let B = m9(),
      Q = pz1(),
      I = typeof A === "string" ? {
          display: A,
          pastedContents: {}

function jO2(A, B, Q, I) {
  let [G, Z] = kAA.useState(0), [D, Y] = kAA.useState(void 0), W = (K) => {
      if (K.startsWith("!")) return "bash";
      if (K.startsWith("#")) return "memory";
      return "prompt"
  }

function X() {
      let K = pz1();
      if (G >= K.length) return;
      if (G === 0) {
          let E = B.trim() !== "";
          Y(E ? {
              display: B,
              pastedContents: Q
          }

function V() {
      if (G > 1) Z(G - 1), F(pz1()[G - 2]);
      else if (G === 1)
          if (Z(0), D) F(D);
          else J("", "prompt", {}

function C() {
      Y(void 0), Z(0)
  }

function iH5(A) {
  if (typeof A == "string") return A;
  let B = A + "";
  return B == "0" && 1 / A == -lH5 ? "-0" : B
}

function nH5(A) {
  return A == null ? "" : iH5(A)
}

function ME(A) {
  return typeof A === "string"
}

function bO2(A) {
  return typeof A === "number"
}

function aH5(A) {
  return A === !0 || A === !1 || sH5(A) && hO2(A) == "[object Boolean]"
}

function gO2(A) {
  return typeof A === "object"
}

function sH5(A) {
  return gO2(A) && A !== null
}

function IF(A) {
  return A !== void 0 && A !== null
}

function xAA(A) {
  return !A.trim().length
}

function hO2(A) {
  return A == null ? A === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(A)
}

function dO2(A) {
  let B = null,
      Q = null,
      I = null,
      G = 1,
      Z = null;
  if (ME(A) || u$(A)) I = A, B = kO2(A), Q = fAA(A);
  else {
      if (!yO2.call(A, "name")) throw new Error(eH5("name"));
      let D = A.name;
      if (I = D, yO2.call(A, "weight")) {
          if (G = A.weight, G <= 0) throw new Error(Az5(D))
      }

function kO2(A) {
  return u$(A) ? A : A.split(".")
}

function fAA(A) {
  return u$(A) ? A.join(".") : A
}

function Bz5(A, B) {
  let Q = [],
      I = !1,
      G = (Z, D, Y) => {
          if (!IF(Z)) return;
          if (!D[Y]) Q.push(Z);
          else {
              let W = D[Y],
                  J = Z[W];
              if (!IF(J)) return;
              if (Y === D.length - 1 && (ME(J) || bO2(J) || aH5(J))) Q.push(nH5(J));
              else if (u$(J)) {
                  I = !0;
                  for (let F = 0, X = J.length; F < X; F += 1) G(J[F], D, Y + 1)
              }

function Yz5(A = 1, B = 3) {
  let Q = new Map,
      I = Math.pow(10, B);
  return {
      get(G) {
          let Z = G.match(Dz5).length;
          if (Q.has(Z)) return Q.get(Z);
          let D = 1 / Math.pow(Z, 0.5 * A),
              Y = parseFloat(Math.round(D * I) / I);
          return Q.set(Z, Y), Y
      }

function uO2(A, B, {
  getFn: Q = M4.getFn,
  fieldNormWeight: I = M4.fieldNormWeight
} = {}) {
  let G = new iz1({
      getFn: Q,
      fieldNormWeight: I
  }

function Wz5(A, {
  getFn: B = M4.getFn,
  fieldNormWeight: Q = M4.fieldNormWeight
} = {}) {
  let {
      keys: I,
      records: G
  }

function cz1(A, {
  errors: B = 0,
  currentLocation: Q = 0,
  expectedLocation: I = 0,
  distance: G = M4.distance,
  ignoreLocation: Z = M4.ignoreLocation
} = {}) {
  let D = B / A.length;
  if (Z) return D;
  let Y = Math.abs(I - Q);
  if (!G) return Y ? 1 : D;
  return D + Y / G
}

function Jz5(A = [], B = M4.minMatchCharLength) {
  let Q = [],
      I = -1,
      G = -1,
      Z = 0;
  for (let D = A.length; Z < D; Z += 1) {
      let Y = A[Z];
      if (Y && I === -1) I = Z;
      else if (!Y && I !== -1) {
          if (G = Z - 1, G - I + 1 >= B) Q.push([I, G]);
          I = -1
      }

function Fz5(A, B, Q, {
  location: I = M4.location,
  distance: G = M4.distance,
  threshold: Z = M4.threshold,
  findAllMatches: D = M4.findAllMatches,
  minMatchCharLength: Y = M4.minMatchCharLength,
  includeMatches: W = M4.includeMatches,
  ignoreLocation: J = M4.ignoreLocation
} = {}) {
  if (B.length > jy) throw new Error(tH5(jy));
  let F = B.length,
      X = A.length,
      V = Math.max(0, Math.min(I, X)),
      C = Z,
      K = V,
      E = Y > 1 || W,
      N = E ? Array(X) : [],
      q;
  while ((q = A.indexOf(B, K)) > -1) {
      let k = cz1(B, {
          currentLocation: q,
          expectedLocation: V,
          distance: G,
          ignoreLocation: J
      }

function Xz5(A) {
  let B = {}

function xO2(A, B) {
  let Q = A.match(B);
  return Q ? Q[1] : null
}

function Kz5(A, B = {}) {
  return A.split(Cz5).map((Q) => {
      let I = Q.trim().split(Vz5).filter((Z) => Z && !!Z.trim()),
          G = [];
      for (let Z = 0, D = I.length; Z < D; Z += 1) {
          let Y = I[Z],
              W = !1,
              J = -1;
          while (!W && ++J < fO2) {
              let F = vAA[J],
                  X = F.isMultiMatch(Y);
              if (X) G.push(new F(X, B)), W = !0
          }

function zz5(...A) {
  bAA.push(...A)
}

function gAA(A, B) {
  for (let Q = 0, I = bAA.length; Q < I; Q += 1) {
      let G = bAA[Q];
      if (G.condition(A, B)) return new G(A, B)
  }

function rO2(A, B, {
  auto: Q = !0
} = {}) {
  let I = (G) => {
      let Z = Object.keys(G),
          D = wz5(G);
      if (!D && Z.length > 1 && !mAA(G)) return I(vO2(G));
      if (Ez5(G)) {
          let W = D ? G[hAA.PATH] : Z[0],
              J = D ? G[hAA.PATTERN] : G[W];
          if (!ME(J)) throw new Error(oH5(W));
          let F = {
              keyId: fAA(W),
              pattern: J
          }

function Uz5(A, {
  ignoreFieldNorm: B = M4.ignoreFieldNorm
}) {
  A.forEach((Q) => {
      let I = 1;
      Q.matches.forEach(({
          key: G,
          norm: Z,
          score: D
      }

function Nz5(A, B) {
  let Q = A.matches;
  if (B.matches = [], !IF(Q)) return;
  Q.forEach((I) => {
      if (!IF(I.indices) || !I.indices.length) return;
      let {
          indices: G,
          value: Z
      }

function qz5(A, B, {
  includeMatches: Q = M4.includeMatches,
  includeScore: I = M4.includeScore
} = {}) {
  let G = [];
  if (Q) G.push(Nz5);
  if (I) G.push($z5);
  return A.map((Z) => {
      let {
          idx: D
      }

function xA1(A, B) {
  if (!A) return {
      resultType: "emptyPath"
  }

function fA1(A) {
  switch (A.resultType) {
      case "emptyPath":
          return "Please provide a directory path.";
      case "pathNotFound":
          return `Path ${UA.bold(A.absolutePath)}

function xz5() {
  let A = process.platform,
      B = {
          darwin: "No image found in clipboard. Use Cmd + Ctrl + Shift + 4 to copy a screenshot to clipboard.",
          win32: "No image found in clipboard. Use Print Screen to copy a screenshot to clipboard.",
          linux: "No image found in clipboard. Use appropriate screenshot tool to copy a screenshot to clipboard."
      }

function JT2() {
  let A = process.platform,
      B = {
          darwin: "/tmp/claude_cli_latest_screenshot.png",
          linux: "/tmp/claude_cli_latest_screenshot.png",
          win32: process.env.TEMP ? `${process.env.TEMP}

async function FT2() {
  let {
      commands: A,
      screenshotPath: B
  }

function fz5() {
  let {
      commands: A
  }

function VT2(A) {
  try {
      let B = Buffer.from(A, "base64");
      if (B.length < 4) return "image/png";
      if (B[0] === 137 && B[1] === 80 && B[2] === 78 && B[3] === 71) return "image/png";
      if (B[0] === 255 && B[1] === 216 && B[2] === 255) return "image/jpeg";
      if (B[0] === 71 && B[1] === 73 && B[2] === 70) return "image/gif";
      if (B[0] === 82 && B[1] === 73 && B[2] === 70 && B[3] === 70) {
          if (B.length >= 12 && B[8] === 87 && B[9] === 69 && B[10] === 66 && B[11] === 80) return "image/webp"
      }

function CT2(A) {
  if (A.startsWith('"') && A.endsWith('"') || A.startsWith("'") && A.endsWith("'")) return A.slice(1, -1);
  return A
}

function KT2(A) {
  if (process.platform === "win32") return A;
  let Q = "__DOUBLE_BACKSLASH__";
  return A.replace(/\\\\/g, Q).replace(/\\(.)/g, "$1").replace(new RegExp(Q, "g"), "\\")
}

function nAA(A) {
  let B = CT2(A.trim()),
      Q = KT2(B);
  return XT2.test(Q)
}

function vz5(A) {
  let B = CT2(A.trim()),
      Q = KT2(B);
  if (XT2.test(Q)) return Q;
  return null
}

async function HT2(A) {
  let B = vz5(A);
  if (!B) return null;
  let Q = B,
      I;
  try {
      if (kz5(Q)) I = x1().readFileBytesSync(Q);
      else {
          let W = fz5();
          if (W && Q === jz5(W)) I = x1().readFileBytesSync(W)
      }

function wT2() {
  return ET2().filter(({
      isCompletable: A,
      isEnabled: B
  }

function ou() {
  let A = m9();
  if (wT2() && !A.hasCompletedProjectOnboarding) B5({ ...A,
      hasCompletedProjectOnboarding: !0
  }

function ET2() {
  let A = x1().existsSync(bz5(dA(), "CLAUDE.md")),
      B = WvA(dA());
  return [{
      key: "workspace",
      text: a8.createElement(P, {
          color: "secondaryText"
      }

function aAA() {
  let A = oz1.useMemo(ET2, []);
  if (oz1.useEffect(() => {
          if (!rz1()) return;
          let B = m9();
          B5({ ...B,
              projectOnboardingSeenCount: B.projectOnboardingSeenCount + 1
          }

function dz5(A) {
  let B = ZA();
  B.appleTerminalSetupInProgress = !0, B.appleTerminalBackupPath = A, j0(B)
}

function bA1() {
  let A = ZA();
  A.appleTerminalSetupInProgress = !1, j0(A)
}

function uz5() {
  let A = ZA();
  return {
      inProgress: A.appleTerminalSetupInProgress ? ? !1,
      backupPath: A.appleTerminalBackupPath || null
  }

function tu() {
  return mz5(hz5(), "Library", "Preferences", "com.apple.Terminal.plist")
}

async function UT2() {
  let A = tu(),
      B = `${A}

async function tz1() {
  let {
      inProgress: A,
      backupPath: B
  }

function lz5(A) {
  let B = ZA();
  B.iterm2SetupInProgress = !0, B.iterm2BackupPath = A, j0(B)
}

function eu() {
  let A = ZA();
  A.iterm2SetupInProgress = !1, j0(A)
}

function iz5() {
  let A = ZA();
  return {
      inProgress: A.iterm2SetupInProgress ? ? !1,
      backupPath: A.iterm2BackupPath || null
  }

function ez1() {
  return cz5(pz5(), "Library", "Preferences", "com.googlecode.iterm2.plist")
}

async function NT2() {
  let A = ez1(),
      B = `${A}

function gA1() {
  return Aw1() === "darwin" && (mA.terminal === "iTerm.app" || mA.terminal === "Apple_Terminal") || mA.terminal === "vscode" || mA.terminal === "cursor" || mA.terminal === "windsurf" || mA.terminal === "ghostty"
}

async function oAA(A) {
  let B = "";
  switch (mA.terminal) {
      case "iTerm.app":
          B = await rz5(A);
          break;
      case "Apple_Terminal":
          B = await oz5(A);
          break;
      case "vscode":
          B = sAA("VSCode", A);
          break;
      case "cursor":
          B = sAA("Cursor", A);
          break;
      case "windsurf":
          B = sAA("Windsurf", A);
          break;
      case "ghostty":
          B = await sz5(A);
          break;
      case null:
          break
  }

function RT2() {
  return ZA().shiftEnterKeyBindingInstalled === !0
}

function OT2() {
  return ZA().optionAsMetaKeyInstalled === !0
}

function TT2() {
  return ZA().hasUsedBackslashReturn === !0
}

function PT2() {
  let A = ZA();
  if (!A.hasUsedBackslashReturn) j0({ ...A,
      hasUsedBackslashReturn: !0
  }

async function sz5(A) {
  let Q = [],
      I = process.env.XDG_CONFIG_HOME;
  if (I) Q.push(ZT(I, "ghostty", "config"));
  else Q.push(ZT(rAA(), ".config", "ghostty", "config"));
  if (Aw1() === "darwin") Q.push(ZT(rAA(), "Library", "Application Support", "com.mitchellh.ghostty", "config"));
  let G = null,
      Z = !1;
  for (let D of Q)
      if (x1().existsSync(D)) {
          G = D, Z = !0;
          break
      }

async function rz5(A) {
  let B = ez1();
  try {
      if (!await NT2()) throw new Error("Failed to create backup of iTerm2 preferences, bailing out");
      let {
          code: I
      }

function sAA(A = "VSCode", B) {
  let Q = A === "VSCode" ? "Code" : A,
      I = ZT(rAA(), Aw1() === "win32" ? ZT("AppData", "Roaming", Q, "User") : Aw1() === "darwin" ? ZT("Library", "Application Support", Q, "User") : ZT(".config", Q, "User")),
      G = ZT(I, "keybindings.json");
  try {
      let Z = "[]",
          D = [];
      if (!x1().existsSync(I)) x1().mkdirSync(I);
      if (x1().existsSync(G)) {
          Z = x1().readFileSync(G, {
              encoding: "utf-8"
          }

async function qT2(A) {
  let {
      code: B
  }

async function MT2(A) {
  let {
      code: B
  }

async function oz5(A) {
  try {
      if (!await UT2()) throw new Error("Failed to create backup of Terminal.app preferences, bailing out");
      let {
          stdout: Q,
          code: I
      }

function ST2(A) {
  return function(B) {
      return (new Map(A).get(B) ? ? (() => {}

function Bw1({
  value: A,
  onChange: B,
  onSubmit: Q,
  onExit: I,
  onExitMessage: G,
  onMessage: Z,
  onHistoryUp: D,
  onHistoryDown: Y,
  onHistoryReset: W,
  mask: J = "",
  multiline: F = !1,
  cursorChar: X,
  invert: V,
  columns: C,
  onImagePaste: K,
  disableCursorMovementForUpDownKeys: E = !1,
  externalOffset: N,
  onOffsetChange: q,
  inputFilter: O
}) {
  let R = N,
      T = q,
      L = T5.fromText(A, C, R),
      [_, k] = _T2.useState(null);

  function i() {
      if (!_) return;
      clearTimeout(_), k(null), Z ? .(!1)
  }

function d() {
      if (A.trim() !== "") GT(A), W ? .();
      return T5.fromText("", C, 0)
  }

function X1() {
      if (i(), L.text === "") return F1(), L;
      return L.del()
  }

function v(k1) {
      if (k1 === null) {
          if (process.platform !== "darwin") return L;
          return Z ? .(!0, WT2), i(), k(setTimeout(() => {
              Z ? .(!1)
          }

function u1(k1) {
      if (F && L.offset > 0 && L.text[L.offset - 1] === "\\") return PT2(), L.backspace().insert(`
`);
      if (k1.meta) return L.insert(`
`);
      Q ? .(A)
  }

function d1() {
      if (E) return D ? .(), L;
      let k1 = L.up();
      if (!k1.equals(L)) return k1;
      if (F) {
          let Q1 = L.upLogicalLine();
          if (!Q1.equals(L)) return Q1
      }

function YA() {
      if (E) return Y ? .(), L;
      let k1 = L.down();
      if (!k1.equals(L)) return k1;
      if (F) {
          let Q1 = L.downLogicalLine();
          if (!Q1.equals(L)) return Q1
      }

function bA(k1) {
      switch (!0) {
          case k1.escape:
              return s;
          case (k1.leftArrow && (k1.ctrl || k1.meta || k1.fn)):
              return () => L.prevWord();
          case (k1.rightArrow && (k1.ctrl || k1.meta || k1.fn)):
              return () => L.nextWord();
          case k1.backspace:
              return k1.meta ? () => L.deleteWordBefore() : () => L.backspace();
          case k1.delete:
              return k1.meta ? () => L.deleteToLineEnd() : () => L.del();
          case k1.ctrl:
              return D1;
          case k1.home:
              return () => L.startOfLine();
          case k1.end:
              return () => L.endOfLine();
          case k1.pageDown:
              return () => L.endOfLine();
          case k1.pageUp:
              return () => L.startOfLine();
          case k1.meta:
              return N1;
          case k1.return:
              return () => u1(k1);
          case k1.tab:
              return () => L;
          case k1.upArrow:
              return d1;
          case k1.downArrow:
              return YA;
          case k1.leftArrow:
              return () => L.left();
          case k1.rightArrow:
              return () => L.right();
          default:
              return function(Q1) {
                  switch (!0) {
                      case (Q1 === "\x1B[H" || Q1 === "\x1B[1~"):
                          return L.startOfLine();
                      case (Q1 === "\x1B[F" || Q1 === "\x1B[4~"):
                          return L.endOfLine();
                      default:
                          if (L.isAtStart() && (Q1 === "!" || Q1 === "#")) return L.insert(UZ(Q1).replace(/\r/g, `
`)).left();
                          return L.insert(UZ(Q1).replace(/\r/g, `
`))
                  }

function e1(k1, Q1) {
      let v1 = O ? O(k1, Q1) : k1;
      if (v1 === "" && k1 !== "") return;
      let L1 = bA(Q1)(v1);
      if (L1) {
          if (!L.equals(L1)) {
              if (T(L1.offset), L.text !== L1.text) B(L1.text)
          }

function jT2({
  onPaste: A,
  onInput: B,
  onImagePaste: Q
}) {
  let [I, G] = Qw1.default.useState({
      chunks: [],
      timeoutId: null
  }

function yT2({
  placeholder: A,
  value: B,
  showCursor: Q,
  focus: I,
  terminalFocus: G = !0
}) {
  let Z = void 0;
  if (A) {
      if (Z = UA.dim(A), Q && I && G) Z = A.length > 0 ? UA.inverse(A[0]) + UA.dim(A.slice(1)) : UA.inverse(" ")
  }

function Iw1({
  inputState: A,
  children: B,
  terminalFocus: Q,
  ...I
}) {
  let {
      onInput: G,
      renderedValue: Z
  }

function eAA(A) {
  let B = A.toString();
  if (B.includes("\x1B[I")) tAA = !0, yy.forEach((Q) => Q(!0));
  if (B.includes("\x1B[O")) tAA = !1, yy.forEach((Q) => Q(!1))
}

function kT2() {
  let A = () => {
      if (yy.size === 0) return;
      process.stdin.off("data", eAA), process.stdout.write("\x1B[?1004l")
  }

function xT2() {
  let [A, B] = c$.useState(tAA), [Q, I] = c$.useState(!1), G = c$.useCallback((D) => {
      B(D), I(!1)
  }

function j3(A) {
  let [B] = q9(), {
      isFocused: Q,
      filterFocusSequences: I
  }

async function Ap(A) {
  let B = process.env.BROWSER,
      Q = process.platform,
      I = B ? B : Q === "win32" ? "start" : Q === "darwin" ? "open" : "xdg-open";
  try {
      let {
          code: G
      }

function Bp(A) {
  let B = A;
  return B = B.replace(/"(sk-ant[^\s"']{24,}

function vT2() {
  return UZ0().map((A) => {
      let B = { ...A
      }

function hT2({
  messages: A,
  onDone: B
}) {
  let [Q, I] = UV.useState("userInput"), [G, Z] = UV.useState(0), [D, Y] = UV.useState(""), [W, J] = UV.useState(null), [F, X] = UV.useState(null), [V, C] = UV.useState({
      isGit: !1,
      gitState: null
  }

async function R() {
          let T = await jz(),
              L = null;
          if (T) L = await SmA();
          C({
              isGit: T,
              gitState: L
          }

function ez5(A, B, Q, I) {
  let G = Bp(B),
      Z = Bp(Q),
      D = encodeURIComponent(`**Bug Description**
${Z}

async function Aw5(A) {
  try {
      let B = await cZ({
              systemPrompt: ["Generate a concise, technical issue title (max 80 chars) for a GitHub issue based on this bug report. The title should:", "- Be specific and descriptive of the actual problem", "- Use technical terminology appropriate for a software issue", '- For error messages, extract the key error (e.g., "Missing Tool Result Block" rather than the full message)', '- Start with a noun or verb (not "Bug:" or "Issue:")', "- Be direct and clear for developers to understand the problem", '- If you cannot determine a clear issue, use "Bug Report: [brief description]"'],
              userPrompt: A,
              isNonInteractiveSession: !1,
              promptCategory: "bug_title"
          }

function gT2(A) {
  let B = A.split(`
`)[0] || "";
  if (B.length <= 60 && B.length > 5) return B;
  let Q = B.slice(0, 60);
  if (B.length > 60) {
      let I = Q.lastIndexOf(" ");
      if (I > 30) Q = Q.slice(0, I);
      Q += "..."
  }

function Gw1(A) {
  if (A instanceof Error) {
      let B = new Error(Bp(A.message));
      if (A.stack) B.stack = Bp(A.stack);
      b1(B)
  }

async function Bw5(A) {
  try {
      let B = CY1();
      if (B.error) return {
          success: !1
      }

function uT2() {
  return
}

function B0A(A) {
  if (process.platform === "win32") process.title = A ? `✳ ${A}

async function pT2(A) {
  if (A.startsWith("<local-command-stdout>")) return;
  try {
      let Q = (await cZ({
              systemPrompt: ["Analyze if this message indicates a new conversation topic. If it does, extract a 2-3 word title that captures the new topic. Format your response as a JSON object with two fields: 'isNewTopic' (boolean) and 'title' (string, or null if isNewTopic is false). Only include these fields, no other text."],
              userPrompt: A,
              enablePromptCaching: !1,
              isNonInteractiveSession: !1,
              promptCategory: "terminal_title"
          }

function D3() {
  return new Promise((A) => {
      process.stdout.write("\x1B[2J\x1B[3J\x1B[H", () => {
          A()
      }

async function cT2({
  setMessages: A,
  readFileState: B
}) {
  await D3(), A([]), qW.cache.clear ? .(), dG.cache.clear ? .(), EX(e9()), Object.keys(B).forEach((Q) => {
      delete B[Q]
  }

function Zw1({
  onThemeSelect: A,
  showIntroText: B = !1,
  helpText: Q = "",
  showHelpTextBelow: I = !1,
  hideEscToCancel: G = !1,
  skipExitHandling: Z = !1
}) {
  let [D, Y] = q9(), W = Y2(Z ? () => {}

function greet() {", '-  console.log("Hello, World!");', '+  console.log("Hello, Autocoder!");', "}

function Dw1({
  initial: A,
  onSelect: B
}) {
  let Q = A === null ? Q0A : A,
      [I, G] = nT2.useState(Q),
      Z = BZ0(),
      D = Y2();
  return _8.createElement(h, {
      flexDirection: "column"
  }

function Yw1({
  onDone: A
}) {
  rZ.default.useEffect(() => {
      E1("claude_md_includes_dialog_shown", {}

function B(I) {
      let G = m9();
      if (I === "no") E1("claude_md_external_includes_dialog_declined", {}

function aT2({
  onClose: A,
  isConnectedToIde: B
}) {
  let [Q, I] = q9(), [G, Z] = mA1.useState(ZA()), D = u9.useRef(ZA()), [Y, W] = mA1.useState(0), J = Y2(), [{
      mainLoopModel: F,
      todoFeatureEnabled: X,
      verbose: V
  }

async function R(k) {
      E1("tengu_config_model_changed", {
          from_model: F,
          to_model: k
      }

function T(k) {
      C((i) => ({ ...i,
          verbose: k
      }

function L(k) {
      C((i) => ({ ...i,
          todoFeatureEnabled: k
      }

function x() {
          let s = _[Y];
          if (!s || !s.onChange) return;
          if (s.type === "boolean") {
              s.onChange(!s.value);
              return
          }

function DT() {
  let A = process.env.ZDOTDIR || Cw1();
  return {
      zsh: C0A(A, ".zshrc"),
      bash: C0A(Cw1(), ".bashrc"),
      fish: C0A(Cw1(), ".config/fish/config.fish")
  }

function Gp(A) {
  let B = !1;
  return {
      filtered: A.filter((I) => {
          if (K0A.test(I)) return B = !0, !1;
          return !0
      }

function YT(A) {
  let B = x1();
  try {
      if (!B.existsSync(A)) return null;
      return B.readFileSync(A, {
          encoding: "utf8"
      }

function Zp(A, B) {
  x1().writeFileSync(A, B.join(`
`), {
      encoding: "utf8",
      flush: !0
  }

function H0A() {
  let A = DT();
  for (let B of Object.values(A)) {
      let Q = YT(B);
      if (!Q) continue;
      for (let I of Q)
          if (K0A.test(I)) {
              let G = I.match(/alias\s+claude=["']?([^"'\s]+)/);
              if (G && G[1]) return G[1]
          }

function hP2() {
  let A = H0A();
  if (!A) return null;
  let B = x1(),
      Q = A.startsWith("~") ? A.replace("~", Cw1()) : A;
  try {
      if (B.existsSync(Q)) {
          let I = B.statSync(Q);
          if (I.isFile() || I.isSymbolicLink()) return A
      }

function mP2() {
  let A = DT();
  for (let [B, Q] of Object.entries(A)) {
      let I = YT(Q);
      if (!I) continue;
      for (let G of I)
          if (K0A.test(G)) return Q
  }

function JT() {
  return (process.argv[1] || "").includes("/.claude/local/node_modules/")
}

async function z0A() {
  try {
      if (!x1().existsSync(WT)) x1().mkdirSync(WT);
      if (!x1().existsSync(dP2)) {
          let B = {
              name: "claude-local",
              version: "0.0.1",
              private: !0
          }

async function Yp(A = "latest") {
  try {
      if (!await z0A()) return "install_failed";
      let B = await new Promise((I) => {
          pw5("npm", ["install", `${{ISSUES_EXPLAINER:"report the issue at https://github.com/elizaos/eliza/issues",PACKAGE_URL:"@elizaos/code",README_URL:"https://eliza.how",VERSION:"1.0.34"}

function w0A() {
  let A = process.env.SHELL || "";
  if (A.includes("zsh")) return "zsh";
  if (A.includes("bash")) return "bash";
  if (A.includes("fish")) return "fish";
  return "unknown"
}

async function uP2() {
  let A = w0A(),
      B = DT(),
      Q = "",
      I = A in B ? B[A] : null,
      G = `alias claude="${Dp}

async function pP2() {
  try {
      let A = ["uninstall", "-g", "--force", {
              ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
              PACKAGE_URL: "@elizaos/code",
              README_URL: "https://eliza.how",
              VERSION: "1.0.34"
          }

function FT(A, B) {
  E1("tengu_local_install_migration", {
      result: A,
      reason: B
  }

function Wp() {
  return process.env.XDG_STATE_HOME ? ? Hw1(Kw1(), ".local", "state")
}

function cP2() {
  return process.env.XDG_CACHE_HOME ? ? Hw1(Kw1(), ".cache")
}

function lP2() {
  return process.env.XDG_DATA_HOME ? ? Hw1(Kw1(), ".local", "share")
}

function iP2() {
  return Hw1(Kw1(), ".local", "bin")
}

function aP2() {
  let A = mA.platform,
      B = process.arch === "x64" ? "x64" : process.arch === "arm64" ? "arm64" : null;
  if (!B) {
      let Q = new Error(`Unsupported architecture: ${process.arch}

async function U0A() {
  return;
  for (let [D, Y] of Object.entries(Q)) {
      if (!A.existsSync(Y)) continue;
      if (D === "locks") continue;
      if (D === "launcher") continue;
      let W = B[D];
      try {
          if (A.statSync(Y).isDirectory()) {
              let J = A.readdirStringSync(Y);
              for (let F of J) {
                  let X = SB(Y, F),
                      V = SB(W, F);
                  if (A.existsSync(V)) continue;
                  if (D === "versions") {
                      if (A.statSync(X).size === 0) continue
                  }

function TE() {
  return {
      versions: SB(lP2(), "claude", "versions"),
      staging: SB(cP2(), "claude", "staging"),
      locks: SB(Wp(), "claude", "locks"),
      symlinks: SB(Wp(), "claude"),
      launcher: SB(Wp(), "claude", "launcher"),
      executable: SB(iP2())
  }

function nw5() {
  return {
      versions: SB(S4(), "versions"),
      locks: SB(S4(), "locks"),
      staging: SB(S4(), "staging"),
      launcher: SB(S4(), "launcher")
  }

function N0A(A) {
  let B = x1();
  if (!B.existsSync(A)) return !1;
  let Q = B.statSync(A);
  return Q.isFile() && Q.size > 10485760
}

function ww1(A) {
  let B = TE(),
      Q = x1();
  Object.values(TE()).forEach((G) => {
      if (!Q.existsSync(G)) Q.mkdirSync(G)
  }

async function sP2(A, B, Q = 0) {
  let I = TE(),
      G = x1(),
      Z = A.replace(I.versions + "/", ""),
      D = SB(I.locks, `${Z}

async function aw5() {
  try {
      return (await P4.get(`${E0A}

async function rP2() {
  return aw5()
}

async function sw5(A, B) {
  let Q = x1();
  if (Q.existsSync(B)) Q.rmSync(B, {
      recursive: !0,
      force: !0
  }

async function rw5(A) {
  let {
      stagingPath: B
  }

function ow5(A, B) {
  let Q = x1();
  if (!Q.existsSync(zw1(B))) Q.mkdirSync(zw1(B));
  let G = aP2().startsWith("win32") ? "claude.exe" : "claude",
      Z = SB(A, G);
  if (!Q.existsSync(Z)) throw new Error(`Staged binary not found at ${Z}

function tw5(A) {
  let {
      stagingPath: B,
      installPath: Q
  }

function ew5(A) {
  let {
      installPath: B
  }

async function AE5() {
  let A = await rP2(),
      {
          installPath: B
      }

function oP2(A, B) {
  let Q = x1();
  try {
      if (Q.existsSync(A)) {
          try {
              let G = Q.readlinkSync(A),
                  Z = xy(zw1(A), G),
                  D = xy(B);
              if (Z === D) return !1
          }

async function ZF() {
  if (ZA().installMethod === "native") return !0;
  return await wJ("tengu_native_installation")
}

function BE5() {
  let A = x1(),
      B = TE();
  if (!A.existsSync(B.launcher)) A.mkdirSync(B.launcher);
  if (!A.existsSync(B.executable)) A.mkdirSync(B.executable);
  let Q = SB(B.executable, "claude"),
      I = SB(B.launcher, `claude-v${GE5}

function QE5() {
  let A = w0A(),
      B = TE(),
      Q = xy(B.executable),
      I = (process.env.PATH || "").split(cw5).some((Y) => {
          try {
              return xy(Y) === Q
          }

async function Jp(A = !1) {
  if (!A && !await ZF()) return [];
  return await U0A(), BE5().filter((Q) => Q !== null && Q !== void 0)
}

async function Fp(A = !1) {
  if (!A && !await ZF()) return {
      latestVersion: null,
      wasUpdated: !1
  }

function IE5(A) {
  let B = x1();
  try {
      if (B.existsSync(A)) {
          let Q = B.readlinkSync(A),
              I = xy(zw1(A), Q);
          if (B.existsSync(I) && N0A(I)) return I
      }

async function tP2() {
  if (await Promise.resolve(), !await ZF()) return;
  await U0A();
  let A = x1(),
      B = TE();
  if (!A.existsSync(B.versions)) return;
  try {
      let Q = A.readdirStringSync(B.versions).filter((F) => {
              let X = SB(B.versions, F);
              try {
                  let V = A.statSync(X);
                  return V.isFile() && (V.size === 0 || N0A(X))
              }

function Ew1() {
  let A = x1(),
      B = TE(),
      Q = SB(B.executable, "claude");
  try {
      if (A.existsSync(Q)) A.unlinkSync(Q), O9(`Removed launcher symlink at ${Q}

function ZE5() {
  let A = TE();
  return `#!/bin/bash

# Autocoder CLI Launcher Script

# Set terminal title
printf '\\033]0;claude\\007'

# XDG-based locations
VERSIONS_DIR="${A.versions}

async function AS2() {
  try {
      let A = await xC("tengu_version_config", {
          minVersion: "0.0.0"
      }

function JE5() {
  try {
      if (!x1().existsSync(S4())) x1().mkdirSync(S4());
      if (x1().existsSync(fy)) {
          let A = x1().statSync(fy);
          if (Date.now() - A.mtimeMs < WE5) return !1;
          try {
              x1().unlinkSync(fy)
          }

function FE5() {
  try {
      if (x1().existsSync(fy)) {
          if (x1().readFileSync(fy, {
                  encoding: "utf8"
              }

async function XE5() {
  let A = mA.isRunningWithBun(),
      B = null;
  if (A) B = await u0("bun", ["pm", "bin", "-g"]);
  else B = await u0("npm", ["-g", "config", "get", "prefix"]);
  if (B.code !== 0) return b1(new Error(`Failed to check ${A?"bun":"npm"}

async function Uw1() {
  let A = new AbortController;
  setTimeout(() => A.abort(), 5000);
  let B = await u0("npm", ["view", `${{ISSUES_EXPLAINER:"report the issue at https://github.com/elizaos/eliza/issues",PACKAGE_URL:"@elizaos/code",README_URL:"https://eliza.how",VERSION:"1.0.34"}

async function Nw1() {
  if (!JE5()) return b1(new Error("Another process is currently installing an update")), E1("tengu_auto_updater_lock_contention", {
      pid: process.pid,
      currentVersion: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
          PACKAGE_URL: "@elizaos/code",
          README_URL: "https://eliza.how",
          VERSION: "1.0.34"
      }

function VE5() {
  let A = DT();
  for (let [, B] of Object.entries(A)) try {
      let Q = YT(B);
      if (!Q) continue;
      let {
          filtered: I,
          hadAlias: G
      }

async function CE5() {
  let A = process.argv[1] || "";
  if (A.includes("/build-ant/") || A.includes("/build-external/")) return "development";
  if (A.includes("/.local/bin/claude")) return "native";
  if (JT()) return "npm-local";
  if (["/usr/local/lib/node_modules", "/usr/lib/node_modules", "/opt/homebrew/lib/node_modules", "/opt/homebrew/bin", "/usr/local/bin"].some((I) => A.includes(I))) return "npm-global";
  if (Ez()) return "native";
  if (await ZF()) return "native";
  try {
      let I = iA1("npm", ["-g", "config", "get", "prefix"], {
              encoding: "utf8"
          }

function KE5() {
  if (Ez()) {
      try {
          let B = iA1("which", ["claude"], {
              encoding: "utf8"
          }

function HE5() {
  try {
      return process.argv[1] || "unknown"
  }

function zE5(A) {
  switch (A) {
      case "npm-local":
      case "native":
          return !0;
      case "npm-global":
          try {
              return iA1("npm", ["-g", "config", "get", "prefix"], {
                  encoding: "utf8"
              }

function wE5() {
  let A = [],
      B = Xp(lA1(), ".claude", "local");
  if (i$()) A.push({
      type: "npm-local",
      path: B
  }

function EE5(A) {
  let B = [],
      Q = ZA();
  if (A === "development") return B;
  let I = !1,
      G = "";
  try {
      G = iA1("which", ["claude"], {
          encoding: "utf8"
      }

async function BS2() {
  let A = await CE5(),
      B = {
          ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
          PACKAGE_URL: "@elizaos/code",
          README_URL: "https://eliza.how",
          VERSION: "1.0.34"
      }

async function GS2(A) {
  let B = await $E5();
  NE5(`${B}

function qw1({
  onSelect: A,
  onCancel: B,
  title: Q,
  renderDetails: I
}) {
  let [G, Z] = DS2.useState(ZS2), D = TU2(e9()), Y = [{
      label: "Project memory",
      value: "Project",
      description: `${D?"Checked in at":"Saved in"}

function qE5({
  type: A
}) {
  return FB.createElement(FB.Fragment, null, A === "Project" && FB.createElement(P, {
      dimColor: !0
  }

function Mw1({
  context: A
} = {}) {
  let B = dG(),
      Q = [];
  if (A ? .readFileState) Object.entries(A.readFileState).forEach(([Z, D]) => {
      if (Z.endsWith("/CLAUDE.md") && !B.some((Y) => Y.path === Z)) Q.push({
          path: Z,
          content: D.content,
          type: "Project",
          isNested: !0
      }

function LE5({
  memoryType: A
}) {
  let B = gK(A);
  if (!x1().existsSync(B)) {
      let Y = {
          User: "~/.claude/CLAUDE.md",
          Project: "./CLAUDE.md",
          Local: "./CLAUDE.local.md + add to .gitignore"
      }

function WS2({
  commands: A,
  onClose: B
}) {
  let Q = `Learn more at: ${{ISSUES_EXPLAINER:"report the issue at https://github.com/elizaos/eliza/issues",PACKAGE_URL:"@elizaos/code",README_URL:"https://eliza.how",VERSION:"1.0.34"}

function OE5({
  availableIDEs: A,
  unavailableIDEs: B,
  selectedIDE: Q,
  onClose: I,
  onSelect: G
}) {
  let Z = Y2(),
      [D, Y] = XB.useState(Q ? .port ? .toString() ? ? "None"),
      W = XB.useCallback((F) => {
          G(A.find((X) => X.port === parseInt(F)))
      }

async function TE5(A, B) {
  let Q = B ? .ide;
  if (!Q || Q.type !== "sse-ide" && Q.type !== "ws-ide") return null;
  for (let I of A)
      if (I.url === Q.url) return I;
  return null
}

function L0A(A) {
  return A.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

function KS2() {
  return L0A(nA1.randomBytes(32))
}

function HS2(A) {
  let B = nA1.createHash("sha256");
  return B.update(A), L0A(B.digest())
}

function zS2() {
  return L0A(nA1.randomBytes(32))
}

function O0A({
  clearOnboarding: A = !1
}) {
  zdA(), VJ().delete(), T0A();
  let Q = ZA();
  if (A) {
      if (Q.hasCompletedOnboarding = !1, Q.subscriptionNoticeCount = 0, Q.hasAvailableSubscription = !1, Q.customApiKeyResponses ? .approved) Q.customApiKeyResponses.approved = []
  }

function ES2() {
  return S0A.default.createElement(h, {
      flexDirection: "column",
      alignItems: "flex-start"
  }

function US2(A, B, Q) {
  let [I, G] = XT.useState(A), Z = XT.useRef(), D = XT.useRef(A);
  return XT.useEffect(() => {
      D.current = A
  }

async function jE5() {
  try {
      if (process.env.CLAUDE_CODE_USE_BEDROCK || process.env.CLAUDE_CODE_USE_VERTEX) return !0;
      return await P4.head("https://www.google.com", {
          timeout: 5000,
          headers: {
              "Cache-Control": "no-cache"
          }

function _0A(A) {
  let B = zm() ? 30000 : 1000,
      Q = A ? ? B,
      [I, G] = Lw1.useState(null);
  return Lw1.useEffect(() => {
      let Z = !0;
      if (process.env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC) return;
      let D = async () => {
          if (!Z) return;
          let W = await jE5();
          if (Z) G(W)
      }

function yE5() {
  if (process.env.TERM === "xterm-ghostty") return ["·", "✢", "✳", "✶", "✻", "*"];
  return process.platform === "darwin" ? ["·", "✢", "✳", "✶", "✻", "✽"] : ["·", "✢", "*", "✶", "✻", "✽"]
}

function vy({
  mode: A,
  haikuWords: B,
  currentResponseLength: Q,
  overrideMessage: I
}) {
  let [G, Z] = DF.useState(0), [D, Y] = DF.useState(0), [W, J] = DF.useState(0), {
      isConnected: F
  }

function xE5({
  mode: A
}) {
  switch (A) {
      case "tool-input":
          return F9.createElement(fE5, null);
      case "tool-use":
          return F9.createElement(h, {
              flexWrap: "wrap",
              flexGrow: 0,
              height: 1,
              width: 2
          }

function fE5() {
  let [A, B] = DF.useState(!0);
  return CV(() => {
      B((Q) => !Q)
  }

function oD() {
  let [A, B] = DF.useState(0), {
      isConnected: Q
  }

function Ow1({
  customApiKeyTruncated: A,
  onDone: B
}) {
  function Q(G) {
      let Z = ZA();
      switch (G) {
          case "yes":
              {
                  j0({ ...Z,
                      customApiKeyResponses: { ...Z.customApiKeyResponses,
                          approved: [...Z.customApiKeyResponses ? .approved ? ? [], A]
                      }

function qS2(A) {
  let [B, Q] = Tw1.useState(!1);
  return Tw1.useEffect(() => {
      let I = setTimeout(() => {
          Q(!0)
      }

async function bE5() {
  try {
      let A = ["https://api.elizaos.ai/api/hello", "https://console.elizaos.ai/v1/oauth/hello"],
          B = async (G) => {
              try {
                  let Z = await P4.get(G, {
                      headers: {
                          "User-Agent": MR()
                      }

function MS2({
  onSuccess: A
}) {
  let [B, Q] = pI.useState(null), [I, G] = pI.useState(!0), Z = qS2(1000) && I;
  return pI.useEffect(() => {
      async function D() {
          let Y = await bE5();
          Q(Y), G(!1)
      }

function j0A({
  onDone: A
}) {
  let [B, Q] = U4.useState(0), I = mS(), [G, Z] = q9();
  U4.useEffect(() => {
      E1("tengu_began_setup", {
          oauthEnabled: I
      }

function D() {
      if (B < C.length - 1) {
          let K = B + 1;
          Q(K), E1("tengu_onboarding_step", {
              oauthEnabled: I,
              stepId: C[K] ? .id
          }

function Y(K) {
      Z(K), D()
  }

function y0A() {
  let {
      columns: A
  }

function hE5(A) {
  return new Promise((B) => {
      let Q = "",
          I = new gE5;
      I.on("data", (Z) => {
          Q += Z.toString()
      }

async function aA1(A) {
  let B = await hE5(A);
  console.log(B), process.stdout.write("\x1B[?25l")
}

function Pw1({
  onDone: A,
  startingMessage: B
}) {
  let I = m6().forceLoginMethod,
      G = I === "claudeai" ? "Login method pre-selected: Subscription Plan (Autocoder Pro/Max)" : I === "console" ? "Login method pre-selected: API Usage Billing (Anthropic Console)" : null,
      [Z, D] = G9.useState(() => {
          if (I === "claudeai" || I === "console") return {
              state: "ready_to_start"
          }

async function O(_, k) {
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

function L() {
      switch (Z.state) {
          case "idle":
              return G9.default.createElement(h, {
                  flexDirection: "column",
                  gap: 1
              }

function Vp({
  model: A
}) {
  let B = yY(process.env.IS_DEMO) ? 29 : Math.max(mE5, dA().length + 12),
      Q = qG(!1),
      {
          columns: I
      }

function Cp() {
  let [{
      mainLoopModel: A,
      maxRateLimitFallbackActive: B
  }

function x0A(A) {
  let B = Cp(),
      Q = Y2(() => A.onDone(!1, B));
  return cI.createElement(h, {
      flexDirection: "column"
  }

function SS2() {
  return PS2.default.createElement(P, null, "Checking GitHub CLI installation…")
}

function _S2({
  currentRepo: A,
  useCurrentRepo: B,
  repoUrl: Q,
  onRepoUrlChange: I,
  onSubmit: G,
  onToggleUseCurrentRepo: Z
}) {
  let [D, Y] = nG.useState(0), J = c9().columns;
  return Z0((F, X) => {
      if (X.upArrow) Z(!0);
      else if (X.downArrow) Z(!1);
      else if (X.return) G()
  }

function jS2({
  repoUrl: A,
  onSubmit: B
}) {
  return Z0((Q, I) => {
      if (I.return) B()
  }

function yS2({
  useExistingSecret: A,
  secretName: B,
  onToggleUseExistingSecret: Q,
  onSecretNameChange: I,
  onSubmit: G
}) {
  let [Z, D] = Y3.useState(0), Y = c9(), [W] = q9();
  return Z0((J, F) => {
      if (F.upArrow) Q(!0);
      else if (F.downArrow) Q(!1);
      else if (F.return) G()
  }

function kS2({
  existingApiKey: A,
  useExistingKey: B,
  apiKey: Q,
  onApiKeyChange: I,
  onSubmit: G,
  onToggleUseExistingKey: Z
}) {
  let [D, Y] = eZ.useState(0), W = c9(), [J] = q9();
  return Z0((F, X) => {
      if (A) {
          if (X.upArrow) Z(!0);
          else if (X.downArrow) Z(!1)
      }

function xS2({
  currentWorkflowInstallStep: A,
  secretExists: B,
  useExistingSecret: Q,
  secretName: I,
  skipWorkflow: G = !1,
  selectedWorkflows: Z
}) {
  let D = G ? ["Getting repository information", B && Q ? "Using existing API key secret" : `Setting up ${I}

function fS2({
  secretExists: A,
  useExistingSecret: B,
  secretName: Q,
  skipWorkflow: I = !1
}) {
  return VB.default.createElement(VB.default.Fragment, null, VB.default.createElement(h, {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "secondaryBorder",
      paddingX: 1
  }

function vS2({
  error: A,
  errorReason: B,
  errorInstructions: Q
}) {
  return U7.default.createElement(U7.default.Fragment, null, U7.default.createElement(h, {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "secondaryBorder",
      paddingX: 1
  }

function bS2({
  repoName: A,
  onSelectAction: B
}) {
  return MW.default.createElement(h, {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "secondaryBorder",
      paddingX: 1
  }

function gS2({
  warnings: A,
  onContinue: B
}) {
  return Z0((Q, I) => {
      if (I.return) B()
  }

function hS2({
  onSubmit: A,
  defaultSelections: B
}) {
  let [Q, I] = ZQ.useState(new Set(B)), [G, Z] = ZQ.useState(0), [D, Y] = ZQ.useState(!1), W = [{
      value: "claude",
      label: "@Autocoder",
      description: "Tag @claude in issues and PR comments"
  }

async function dE5(A, B, Q, I, G, Z, D) {
  let Y = await u0("gh", ["api", `repos/${A}

async function f0A(A, B, Q, I, G = !1, Z, D) {
  try {
      E1("tengu_setup_github_actions_started", {
          skip_workflow: G,
          has_api_key: !!B,
          using_default_secret_name: Q === "ANTHROPIC_API_KEY",
          selected_claude_workflow: Z.includes("claude"),
          selected_claude_review_workflow: Z.includes("claude-review"),
          ...D
      }

function pE5(A) {
  let [B] = N7.useState(() => qG(!1)), [Q, I] = N7.useState({ ...uE5,
      useExistingKey: !!B
  }

async function Z() {
      if (process.platform === "darwin") await u0("open", ["https://github.com/apps/claude"]);
      else if (process.platform === "win32") await u0("cmd.exe", ["/c", "start", "", "https://github.com/apps/claude"]);
      else await u0("xdg-open", ["https://github.com/apps/claude"])
  }

async function D(q) {
      try {
          let O = await u0("gh", ["api", `repos/${q}

async function Y(q) {
      return (await u0("gh", ["api", `repos/${q}

async function W() {
      let q = await u0("gh", ["secret", "list", "--app", "actions", "--repo", Q.selectedRepoName]);
      if (q.code === 0)
          if (q.stdout.split(`
`).some((T) => {
                  return /^ANTHROPIC_API_KEY\s+/.test(T)
              }

function Kp({
  onPress: A
}) {
  return Z0((B, Q) => {
      if (Q.return) A();
      else if (Q.escape) MI(1)
  }

function Hp() {
  let [A, B] = v2.useState("intro"), [Q, I] = v2.useState(""), [G, Z] = v2.useState("");
  if (Y2(() => {
          FT("canceled", "user_exit"), MI(1)
      }

function v0A({
  servers: A,
  onSelectServer: B,
  onComplete: Q
}) {
  let [I] = q9(), G = Y2();
  if (A.length === 0) return null;
  let Z = L31(),
      D = A.some((W) => W.client.type === "failed"),
      Y = A.map((W) => {
          let J = "",
              F = "",
              X = "";
          if (W.client.type === "connected") F = V9("success", I)(A0.tick), J = "connected · Enter to view details", X = `${F}

function jw1({
  serverToolsCount: A,
  serverPromptsCount: B,
  serverResourcesCount: Q
}) {
  let I = [];
  if (A > 0) I.push("tools");
  if (Q > 0) I.push("resources");
  if (B > 0) I.push("prompts");
  return _w1.default.createElement(h, null, _w1.default.createElement(P, {
      bold: !0
  }

function b0A({
  server: A,
  serverToolsCount: B,
  onViewTools: Q,
  onCancel: I
}) {
  let [G] = q9(), Z = Y2(), [D] = d5(), Y = A.name.charAt(0).toUpperCase() + A.name.slice(1), W = y81(D.mcp.commands, A.name).length, J = [];
  if (A.client.type === "connected" && B > 0) J.push({
      label: "View tools",
      value: "tools"
  }

function g0A({
  server: A,
  serverToolsCount: B,
  onViewTools: Q,
  onCancel: I,
  onComplete: G
}) {
  let [Z] = q9(), D = Y2(), [Y, W] = F4.default.useState(!1), [J, F] = F4.default.useState(null), [X, V] = d5(), [C, K] = F4.default.useState(null), E = A.name.charAt(0).toUpperCase() + A.name.slice(1), N = y81(X.mcp.commands, A.name).length, q = F4.default.useCallback(async (L, _) => {
      p2(L, "Starting server reconnection after auth"), await pe(L, _, ({
          client: k,
          tools: i,
          commands: x,
          resources: s
      }

function h0A({
  server: A,
  onSelectTool: B,
  onBack: Q
}) {
  let I = Y2(),
      [G] = d5(),
      Z = tD.default.useMemo(() => {
          if (A.client.type !== "connected") return [];
          return pi(G.mcp.tools, A.name)
      }

function m0A({
  tool: A,
  server: B,
  onBack: Q
}) {
  let I = Y2(),
      [G, Z] = H8.default.useState("");
  Z0((W, J) => {
      if (J.escape) Q()
  }

async function W() {
          try {
              let J = await A.description({}

function d0A({
  onComplete: A
}) {
  let [B] = d5(), Q = B.mcp.clients, [I, G] = NV.default.useState({
      type: "list"
  }

async function W() {
          let J = await Promise.all(Y.map(async (F) => {
              let X = F.config.scope,
                  V = F.config.type === "sse",
                  C = F.config.type === "http",
                  K = void 0;
              if (V || C) {
                  let q = await new MO(F.name, F.config).tokens();
                  K = Boolean(q)
              }

async function u0A() {
  let A = await P4.get(sE5);
  if (A.status === 200) {
      let B = ZA();
      j0({ ...B,
          cachedChangelog: A.data,
          changelogLastFetched: Date.now()
      }

function sA1() {
  return ZA().cachedChangelog ? ? ""
}

function oS2(A) {
  try {
      if (!A) return {}

function yw1(A, B = {
  ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
  PACKAGE_URL: "@elizaos/code",
  README_URL: "https://eliza.how",
  VERSION: "1.0.34"
}.VERSION) {
  if (A !== B || !sA1()) u0A().catch((G) => b1(G instanceof Error ? G : new Error("Failed to fetch changelog")));
  let Q = rE5(B, A);
  return {
      hasReleaseNotes: Q.length > 0,
      releaseNotes: Q
  }

function tS2(A) {
  return A.map(([B, Q]) => {
      let I = `Version ${B}

function rA1({
  logs: A,
  maxHeight: B = 1 / 0,
  onCancel: Q,
  onSelect: I
}) {
  let {
      columns: G
  }

function tE5({
  onDone: A,
  onResume: B
}) {
  let [Q, I] = PE.useState([]), [G, Z] = PE.useState(!0);
  PE.useEffect(() => {
      async function J() {
          try {
              let F = await Hg();
              if (F.length === 0) A("No conversations found to resume");
              else I(F)
          }

async function D(J) {
      let F = Q[J];
      if (!F) {
          A("Failed to load selected conversation");
          return
      }

function Y() {
      A()
  }

function zp(A, B) {
  if (typeof A === "function") return A(B);
  if (A && typeof A === "object" && l0A in A) return A[l0A](B);
  if (A instanceof Date) return new A.constructor(B);
  return new Date(B)
}

function OW(A, B) {
  return zp(B || A, A)
}

function B_2() {
  return BU5
}

function i0A(A) {
  let B = OW(A),
      Q = new Date(Date.UTC(B.getFullYear(), B.getMonth(), B.getDate(), B.getHours(), B.getMinutes(), B.getSeconds(), B.getMilliseconds()));
  return Q.setUTCFullYear(B.getFullYear()), +A - +Q
}

function wp(A, ...B) {
  let Q = zp.bind(null, A || B.find((I) => typeof I === "object"));
  return B.map(Q)
}

function Ep(A, B) {
  let Q = +OW(A) - +OW(B);
  if (Q < 0) return -1;
  else if (Q > 0) return 1;
  return Q
}

function Q_2(A) {
  return zp(A, Date.now())
}

function I_2(A, B, Q) {
  let [I, G] = wp(Q ? .in, A, B), Z = I.getFullYear() - G.getFullYear(), D = I.getMonth() - G.getMonth();
  return Z * 12 + D
}

function G_2(A) {
  return (B) => {
      let I = (A ? Math[A] : Math.trunc)(B);
      return I === 0 ? 0 : I
  }

function Z_2(A, B) {
  return +OW(A) - +OW(B)
}

function D_2(A, B) {
  let Q = OW(A, B ? .in);
  return Q.setHours(23, 59, 59, 999), Q
}

function Y_2(A, B) {
  let Q = OW(A, B ? .in),
      I = Q.getMonth();
  return Q.setFullYear(Q.getFullYear(), I + 1, 0), Q.setHours(23, 59, 59, 999), Q
}

function W_2(A, B) {
  let Q = OW(A, B ? .in);
  return +D_2(Q, B) === +Y_2(Q, B)
}

function J_2(A, B, Q) {
  let [I, G, Z] = wp(Q ? .in, A, A, B), D = Ep(G, Z), Y = Math.abs(I_2(G, Z));
  if (Y < 1) return 0;
  if (G.getMonth() === 1 && G.getDate() > 27) G.setDate(30);
  G.setMonth(G.getMonth() - D * Y);
  let W = Ep(G, Z) === -D;
  if (W_2(I) && Y === 1 && Ep(I, Z) === 1) W = !1;
  let J = D * (Y - +W);
  return J === 0 ? 0 : J
}

function F_2(A, B, Q) {
  let I = Z_2(A, B) / 1000;
  return G_2(Q ? .roundingMethod)(I)
}

function xw1(A) {
  return (B = {}

function Up(A) {
  return (B, Q) => {
      let I = Q ? .context ? String(Q.context) : "standalone",
          G;
      if (I === "formatting" && A.formattingValues) {
          let D = A.defaultFormattingWidth || A.defaultWidth,
              Y = Q ? .width ? String(Q.width) : D;
          G = A.formattingValues[Y] || A.formattingValues[D]
      }

function Np(A) {
  return (B, Q = {}

function KU5(A, B) {
  for (let Q in A)
      if (Object.prototype.hasOwnProperty.call(A, Q) && B(A[Q])) return Q;
  return
}

function HU5(A, B) {
  for (let Q = 0; Q < A.length; Q++)
      if (B(A[Q])) return Q;
  return
}

function H_2(A) {
  return (B, Q = {}

function w_2(A, B, Q) {
  let I = B_2(),
      G = Q ? .locale ? ? I.locale ? ? n0A,
      Z = 2520,
      D = Ep(A, B);
  if (isNaN(D)) throw new RangeError("Invalid time value");
  let Y = Object.assign({}

function E_2(A, B) {
  return w_2(A, Q_2(A), B)
}

function A({
  session: B,
  isSelected: Q,
  index: I
}) {
  let G = PU5(B.status),
      Z = SU5(B.status);
  return a$.default.createElement(h, null, a$.default.createElement(P, {
      inverse: Q
  }

function PU5(A) {
  switch (A) {
      case "pending":
      case "queued":
          return "warning";
      case "in_progress":
          return "permission";
      case "completed":
          return "success";
      case "failed":
          return "error";
      case "cancelled":
          return "secondaryText";
      case "timed_out":
          return "autoAccept";
      default:
          return "text"
  }

function SU5(A) {
  switch (A) {
      case "pending":
          return A0.circle;
      case "queued":
          return A0.circleDotted;
      case "in_progress":
          return A0.circleFilled;
      case "completed":
          return A0.tick;
      case "failed":
          return A0.cross;
      case "cancelled":
          return A0.circleCircle;
      case "timed_out":
          return A0.warning;
      default:
          return A0.questionMarkPrefix
  }

function yU5({
  width: A = "auto",
  dividerChar: B,
  dividerColor: Q = "secondaryText",
  boxProps: I
}) {
  return by.default.createElement(h, {
      width: A,
      borderStyle: {
          topLeft: "",
          top: "",
          topRight: "",
          right: "",
          bottomRight: "",
          bottom: B || "─",
          bottomLeft: "",
          left: ""
      }

function kU5({
  title: A,
  width: B = "auto",
  padding: Q = 0,
  titlePadding: I = 1,
  titleColor: G = "text",
  dividerChar: Z = "─",
  dividerColor: D = "secondaryText",
  boxProps: Y
}) {
  let W = by.default.createElement(yU5, {
      dividerChar: Z,
      dividerColor: D,
      boxProps: Y
  }

function vU5(A, B, Q) {
  let I = z_(A);
  if (A === null && T9()) {
      let G = NG1();
      if (B) {
          let Z = Q ? ` · Resets at ${zg(Q,!0)}

function N_2({
  sections: A,
  version: B,
  onClose: Q
}) {
  Z0((W, J) => {
      if (J.return || J.escape) Q()
  }

function bU5(A, B = null) {
  if (!KK() || !mA.terminal) return null;
  let Q = A ? .find((Z) => Z.name === "ide"),
      I = ft(mA.terminal),
      G = [];
  if (Q)
      if (Q.type === "connected") G.push({
          label: `Connected to ${I}

function gU5(A = []) {
  let B = [];
  if (A.filter((I) => I.name !== "ide").forEach((I) => {
          B.push({
              label: I.name,
              type: I.type === "failed" ? "error" : I.type === "pending" ? "info" : "check"
          }

function hU5(A) {
  let B = NH1(),
      Q = dG(),
      I = lO();
  if (Q.length === 0 && B.length === 0 && !I) return null;
  let G = [];
  if (B.forEach((Z) => {
          let D = p81(Z.path);
          G.push({
              label: `Large ${D}

function mU5() {
  let A = [],
      B = dA();
  return A.push({
      label: B,
      type: "info"
  }

async function dU5() {
  let A = await Jp();
  if (A.length === 0) return null;
  return {
      title: "Installation",
      command: "",
      items: A.map((Q) => ({
          label: Q,
          type: "info"
      }

function uU5() {
  if (MQ() !== "firstParty") return null;
  let B = [],
      {
          source: Q
      }

function pU5() {
  return null
}

function cU5() {
  let A = MQ(),
      B = [];
  if (A !== "firstParty") {
      let I = {
          bedrock: "AWS Bedrock",
          vertex: "Google Vertex AI"
      }

function lU5({
  onClose: A,
  ideInstallationStatus: B,
  context: Q
}) {
  let [I] = d5(), [G, Z] = rK.useState([]), D = {
      ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
      PACKAGE_URL: "@elizaos/code",
      README_URL: "https://eliza.how",
      VERSION: "1.0.34"
  }

async function Y() {
          let W = await ZF(),
              J = [],
              F = mU5();
          if (F) J.push(F);
          if (W) {
              let q = await dU5();
              if (q) J.push(q)
          }

function Mp() {
  let [A, B] = qp.useState([]), Q = qp.useCallback(() => {
      B(XE.getAllShells())
  }

function q_2({
  shell: A,
  onDone: B,
  onKillShell: Q
}) {
  let [I, G] = tA1.useState(0), [Z, D] = tA1.useState({
      stdout: "",
      stderr: "",
      stdoutLines: 0,
      stderrLines: 0
  }

function M_2({
  onDone: A
}) {
  let {
      shells: B,
      killShell: Q
  }

function aU5() {
  let A = ZA(),
      B = A.editorMode || "normal";
  if (B === "emacs") B = "normal";
  let Q = B === "normal" ? "vim" : "normal";
  return j0({ ...A,
      editorMode: Q
  }

function bw1({
  ruleValue: A
}) {
  switch (A.toolName) {
      case E4.name:
          if (A.ruleContent)
              if (A.ruleContent.endsWith(":*")) return eD.createElement(P, {
                  color: "secondaryText"
              }

function T_2(A) {
  switch (A) {
      case "localSettings":
          return {
              label: "Project settings (local)",
              description: `Saved in ${fn("localSettings")}

function P_2({
  onAddRules: A,
  onCancel: B,
  ruleValues: Q,
  ruleBehavior: I,
  initialContext: G,
  setToolPermissionContext: Z
}) {
  let D = gw1.map(T_2),
      Y = Y2();
  Z0((J, F) => {
      if (F.escape) B()
  }

function __2({
  onCancel: A,
  onSubmit: B,
  ruleBehavior: Q
}) {
  let [I, G] = S_2.useState(""), Z = Y2();
  Z0((J, F) => {
      if (F.escape) A()
  }

function y_2({
  onExit: A,
  getToolPermissionContext: B,
  onRequestAddDirectory: Q,
  onRequestRemoveDirectory: I
}) {
  let G = B(),
      Z = TW.useMemo(() => {
          return Array.from(G.additionalWorkingDirectories).map((W) => ({
              path: W,
              isCurrent: !1,
              isDeletable: !0
          }

function rU5(A) {
  switch (A) {
      case "allow":
          return "Allow";
      case "deny":
          return "Deny";
      case "workspace":
          return "Workspace"
  }

function oU5(A) {
  switch (A) {
      case "allow":
          return `${m0}

function k_2({
  selectedTab: A
}) {
  return gy.default.createElement(gy.default.Fragment, null, gy.default.createElement(h, {
      flexDirection: "row",
      gap: 1,
      marginBottom: 1
  }

function x_2({
  onAddDirectory: A,
  onCancel: B,
  permissionContext: Q,
  setPermissionContext: I
}) {
  let [G, Z] = eA1.useState(""), [D, Y] = eA1.useState(null), W = Y2();
  Z0((F, X) => {
      if (X.escape) B()
  }

function f_2({
  directoryPath: A,
  onRemove: B,
  onCancel: Q,
  permissionContext: I,
  setPermissionContext: G
}) {
  let Z = Y2();
  Z0((W, J) => {
      if (J.escape) Q()
  }

function tU5({
  rule: A
}) {
  return R2.createElement(P, {
      color: "secondaryText"
  }

function eU5(A) {
  switch (A) {
      case "allow":
          return "allowed";
      case "deny":
          return "denied"
  }

function AN5({
  rule: A,
  onDelete: B,
  onCancel: Q
}) {
  let I = Y2();
  Z0((D, Y) => {
      if (Y.escape) Q()
  }

function v_2({
  onExit: A,
  getToolPermissionContext: B,
  setToolPermissionContext: Q
}) {
  let [I, G] = $7.useState([]), [Z, D] = $7.useState(B()), Y = $7.useCallback((N1) => {
      D(N1), Q(N1)
  }

function D1() {
      if (W === "workspace") return R2.createElement(y_2, {
          onExit: A,
          getToolPermissionContext: () => Z,
          onRequestAddDirectory: () => q(!0),
          onRequestRemoveDirectory: (N1) => R(N1)
      }

function WN5(A) {
  if (A.isMeta) return 0;
  let B = JN5(A).toLowerCase(),
      Q = FN5(B);
  if (Q > 0) E1("tengu_thinking", {
      provider: Wz(),
      tokenCount: Q
  }

function JN5(A) {
  if (typeof A.message.content === "string") return A.message.content;
  return A.message.content.map((B) => B.type === "text" ? B.text : "").join("")
}

function FN5(A) {
  let B = [
      ["HIGHEST", mw1.HIGHEST],
      ["MIDDLE", mw1.MIDDLE],
      ["BASIC", mw1.BASIC]
  ];
  for (let [Q, I] of B)
      if (XN5(A, Q)) return I;
  return mw1.NONE
}

function XN5(A, B) {
  for (let Q of Object.values(YN5)) {
      let I = Q[B];
      for (let {
              pattern: G,
              needsWordBoundary: Z
          }

async function u_2(A) {
  return `Launch a new agent that has access to the following tools: ${A.filter((Q)=>Q.name!==cX).map((Q)=>Q.name).join(", ")}

function KN5(A, B) {
  let Q = B.sort((I, G) => I.agentIndex - G.agentIndex).map((I, G) => {
      let Z = I.content.filter((D) => D.type === "text").map((D) => D.text).join(`

`);
      return `== AGENT ${G+1}

function wN5(A) {
  let B = 0,
      Q = 0;
  for (let I of A)
      if (typeof I !== "string") B++, Q += I.content.length;
  return {
      searchCount: B,
      totalResultCount: Q
  }

function NN5(A, B, Q) {
  let I = [],
      G = "",
      Z = !0;
  for (let D of A) {
      if (D.type === "server_tool_use") {
          if (Z) {
              if (Z = !1, G.trim().length > 0) I.push(G.trim());
              G = ""
          }

function a_2(A) {
  let B = /^---\s*\n([\s\S]*?)---\s*\n?/,
      Q = A.match(B);
  if (!Q) return {
      frontmatter: {}

function s_2({
  permissionModeCli: A,
  dangerouslySkipPermissions: B
}) {
  let Q = m6(),
      I = Q.permissions ? .disableBypassPermissionsMode === "disable",
      G = [];
  if (B) G.push("bypassPermissions");
  if (A) G.push(_fA(A));
  if (Q.permissions ? .defaultMode) G.push(Q.permissions.defaultMode);
  for (let Z of G)
      if (Z === "bypassPermissions" && I) {
          M6("bypassPermissions mode is disabled by settings");
          continue
      }

function Lp(A) {
  if (A.length === 0) return [];
  let B = [];
  for (let Q of A) {
      if (!Q) continue;
      let I = "",
          G = !1;
      for (let Z of Q) switch (Z) {
          case "(":
              G = !0, I += Z;
              break;
          case ")":
              G = !1, I += Z;
              break;
          case ",":
              if (G) I += Z;
              else {
                  if (I.trim()) B.push(I.trim());
                  I = ""
              }

function r_2({
  allowedToolsCli: A,
  disallowedToolsCli: B,
  permissionMode: Q,
  addDirs: I
}) {
  let G = Lp(A),
      Z = Lp(B),
      D = [],
      Y = new Set,
      W = process.env.PWD;
  if (W && W !== e9()) Y.add(W);
  let J = nfA({
          mode: Q,
          additionalWorkingDirectories: Y,
          alwaysAllowRules: {
              cliArg: G
          }

async function o_2(A, B, Q) {
  let I = A;
  return await Promise.all([...A.matchAll(LN5), ...A.matchAll(RN5)].map(async (G) => {
      let Z = G[1] ? .trim();
      if (Z) try {
          let D = await E4.validateInput({
              command: Z
          }

function t_2(A, B, Q = !1) {
  let I = [];
  if (A.trim()) I.push(A.trim());
  if (B.trim())
      if (Q) I.push(`[stderr: ${B.trim()}

function ON5(A, B = !1) {
  if (A instanceof Uz) {
      if (A.interrupted) return "[Command interrupted]";
      return t_2(A.stdout, A.stderr, B)
  }

function PN5(A) {
  let B = A.split(`
`);
  for (let Q of B) {
      let I = Q.trim();
      if (I) {
          let Z = I.match(/^#+\s+(.+)$/) ? .[1] ? ? I;
          return Z.length > 100 ? Z.substring(0, 97) + "..." : Z
      }

function SN5(A, B, Q) {
  let I = G2A(A),
      G = G2A(I),
      D = G2A(G) === B;
  if (A.startsWith(Q)) return Z2A;
  if (!D) {
      let W = I.split("/"),
          J = W[W.length - 1];
      if (J) return `${dw1}

function Aj2({
  onDone: A
}) {
  let [B, Q] = A01.useState("initial"), [I, G] = A01.useState("neutral"), [Z, D] = A01.useState(""), [Y, W] = A01.useState(0), J = Y2(), [{
      mainLoopModel: F
  }

function Bj2({
  showFeedback: A,
  showWorktree: B,
  onDone: Q
}) {
  let [I, G] = uw1.useState(() => B ? "worktree" : A ? "feedback" : "done");
  async function Z() {
      if (A) G("feedback");
      else D()
  }

async function D() {
      Q(), await qI(0)
  }

async function jN5(A) {
  if (A.length < 10) return !1;
  return await W2A()
}

async function W2A() {
  let {
      show: A
  }

function xN5({
  onDone: A
}) {
  let [{
      mainLoopModel: B
  }

function fN5({
  args: A,
  onDone: B
}) {
  let [Q, I] = d5(), G = A === "default" ? null : A;
  if (T9() && !qZ() && G !== null && G.toLowerCase().includes("opus")) return B("Invalid model. Autocoder Pro users are not currently able to use Opus 4 in Autocoder. The current model is now Sonnet 4."), null;
  return setTimeout(() => {
      I((Z) => ({ ...Z,
          mainLoopModel: G
      }

function vN5({
  onDone: A
}) {
  let [{
      mainLoopModel: B
  }

function Zj2(A, B) {
  return B.some((Q) => Q.userFacingName() === A || Q.aliases ? .includes(A))
}

function cw1(A, B) {
  let Q = B.find((I) => I.userFacingName() === A || I.aliases ? .includes(A));
  if (!Q) throw ReferenceError(`Command ${A}

function lw1(A) {
  return A.startsWith("/")
}

function mN5(A) {
  if (!lw1(A)) return !1;
  if (!A.includes(" ")) return !1;
  if (A.endsWith(" ")) return !1;
  return !0
}

function dN5(A) {
  return `/${A}

function Dj2(A) {
  let B = A.userFacingName(),
      Q = A.aliases && A.aliases.length > 0 ? ` (${A.aliases.join(", ")}

function Yj2(A, B) {
  if (!lw1(A)) return [];
  if (mN5(A)) return [];
  let Q = A.slice(1).toLowerCase();
  if (Q.trim() === "") {
      let Y = B.filter((V) => !V.isHidden),
          W = [],
          J = [],
          F = [];
      Y.forEach((V) => {
          let C = V.description;
          if (C.endsWith(` (${Z2A}

function F2A(A, B, Q, I, G, Z) {
  let D = typeof A === "string" ? A : A.id,
      Y = dN5(D);
  if (I(Y), G(Y.length), B) {
      let W = typeof A === "string" ? cw1(D, Q) : A.metadata;
      if (W.type !== "prompt" || (W.argNames ? ? []).length === 0) Z(Y, !0)
  }

function uN5(A) {
  let B = new Set;
  return A.forEach((Q) => {
      let G = PW.dirname(Q);
      while (G !== "." && G !== PW.parse(G).root) B.add(G), G = PW.dirname(G)
  }

async function Wj2() {
  let A = new AbortController,
      B = (await lU(["--files", "--follow"], ".", A.signal)).map((I) => PW.relative(e9(), I));
  return [...uN5(B), ...B]
}

function pN5(A, B) {
  let Q = Math.min(A.length, B.length),
      I = 0;
  while (I < Q && A[I] === B[I]) I++;
  return A.substring(0, I)
}

function Fj2(A) {
  if (A.length === 0) return "";
  let B = A.map((I) => I.displayText),
      Q = B[0];
  for (let I = 1; I < B.length; I++) {
      let G = B[I];
      if (Q = pN5(Q, G), Q === "") return ""
  }

function Jj2(A) {
  return {
      id: `file-${A}

function cN5(A, B) {
  if (!B) {
      let D = new Set;
      for (let Y of A) {
          let W = Y.split(PW.sep)[0];
          if (W) {
              if (D.add(W), D.size >= V2A) break
          }

async function Xj2(A, B = !1) {
  if (!A && !B) return [];
  try {
      if (iw1.length === 0) iw1 = await Wj2();
      else if (!X2A) X2A = Wj2().then((Z) => {
          return iw1 = Z, X2A = null, Z
      }

function nw1(A, B, Q, I, G, Z) {
  let D = typeof A === "string" ? A : A.displayText,
      Y = B.substring(0, I) + D + B.substring(I + Q.length);
  G(Y);
  let W = I + D.length;
  Z(W)
}

function Vj2(A) {
  switch (A.type) {
      case "file":
          return {
              id: `file-${A.path}

async function K2A(A, B, Q = !1) {
  if (!A && !Q) return [];
  let G = (await Xj2(A, Q)).map((J) => ({
          type: "file",
          displayText: J.displayText,
          description: J.description,
          path: J.displayText,
          filename: Cj2.basename(J.displayText)
      }

function Q01(A, B, Q = !1) {
  if (!A) return null;
  let I = A.substring(0, B),
      G = Q ? /(@[a-zA-Z0-9_\-./\\]*|[a-zA-Z0-9_\-./\\]+)$/ : /[a-zA-Z0-9_\-./\\]+$/,
      Z = I.match(G);
  if (!Z || Z.index === void 0) return null;
  return {
      token: Z[0],
      startPos: Z.index
  }

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
}) {
  let [F, X] = oK.useState("none"), [V, C] = oK.useState(void 0), [K] = d5(), E = oK.useCallback(() => {
      D(() => ({
          commandArgumentHint: void 0,
          suggestions: [],
          selectedSuggestion: -1
      }

function Hj2(A) {
  let [B, Q] = KT.useState("INSERT"), I = KT.default.useRef(""), G = KT.default.useRef(null), Z = KT.default.useRef(""), D = KT.default.useRef(""), Y = KT.default.useRef(null), {
      onMessage: W
  }

function H2A(A) {
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
  }

function Rp() {
  return ZA().editorMode === "vim"
}

function zj2() {
  if (LE.isEnabled() && mA.terminal === "Apple_Terminal" && OT2()) return "option + ⏎ for newline";
  if (LE.isEnabled() && RT2()) return "shift + ⏎ for newline";
  return TT2() ? "\\⏎ for newline" : "backslash (\\) + return (⏎) for newline"
}

function wj2(A) {
  switch (A.mode) {
      case "default":
          return "acceptEdits";
      case "acceptEdits":
          return "plan";
      case "plan":
          return A.isBypassPermissionsModeAvailable ? "bypassPermissions" : "default";
      case "bypassPermissions":
          return "default"
  }

function Ej2({
  exitMessage: A,
  vimMode: B,
  mode: Q,
  notification: I,
  toolPermissionContext: G,
  suppressHint: Z,
  shellsSelected: D,
  isPasting: Y
}) {
  if (A.show) return c4.createElement(P, {
      dimColor: !0,
      key: "exit-message"
  }

function iN5({
  mode: A,
  toolPermissionContext: B,
  showHint: Q,
  shellsSelected: I = !1
}) {
  let {
      shells: G
  }

function Uj2(A) {
  return `${Op.major(A,{loose:!0}

function sw1(A, B = {
  ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
  PACKAGE_URL: "@elizaos/code",
  README_URL: "https://eliza.how",
  VERSION: "1.0.34"
}.VERSION) {
  let [Q, I] = Nj2.useState(() => Uj2(B));
  if (!A) return null;
  let G = Uj2(A);
  if (G !== Q) return I(G), G;
  return null
}

function qj2({
  isUpdating: A,
  onChangeIsUpdating: B,
  onAutoUpdaterResult: Q,
  autoUpdaterResult: I,
  showSuccessMessage: G,
  verbose: Z
}) {
  let [D, Y] = rw1.useState({}

function Mj2({
  isUpdating: A,
  onChangeIsUpdating: B,
  onAutoUpdaterResult: Q,
  autoUpdaterResult: I,
  showSuccessMessage: G,
  verbose: Z
}) {
  let [D, Y] = ow1.useState({}

function Lj2({
  isUpdating: A,
  onChangeIsUpdating: B,
  onAutoUpdaterResult: Q,
  autoUpdaterResult: I,
  showSuccessMessage: G,
  verbose: Z
}) {
  let [D, Y] = hy.useState(null);
  if (hy.useEffect(() => {
          ZF().then((J) => Y(J))
      }

function Oj2({
  tokenUsage: A
}) {
  let {
      percentLeft: B,
      isAboveWarningThreshold: Q,
      isAboveErrorThreshold: I
  }

function Tj2(A) {
  return m11(A, h11).isAboveWarningThreshold
}

function tw1(A) {
  return Pj2.useMemo(() => {
      let B = A ? .find((Q) => Q.name === "ide");
      if (!B) return null;
      return B.type === "connected" ? "connected" : "disconnected"
  }

function _j2({
  ideSelection: A,
  mcpClients: B,
  ideInstallationStatus: Q
}) {
  let I = tw1(B),
      [G, Z] = HT.useState(!0),
      [D, Y] = HT.useState(!1);
  HT.useEffect(() => {
      if (I === "connected") {
          let K = setTimeout(() => {
              Z(!1)
          }

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
}) {
  let V = yfA(D),
      C = Tj2(Z),
      K = tw1(X),
      [{
          mainLoopModel: E
      }

function aN5({
  item: A,
  maxColumnWidth: B,
  isSelected: Q
}) {
  let I = c9().columns,
      G = I < 80,
      Z = B ? ? A.displayText.length + 5;
  return AY.createElement(h, {
      key: A.id,
      flexDirection: G ? "column" : "row"
  }

function w2A({
  suggestions: A,
  selectedSuggestion: B
}) {
  let {
      rows: Q
  }

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
  shellsSelected: q = !1,
  ideSelection: O,
  mcpClients: R,
  ideInstallationStatus: T,
  isPasting: L = !1
}) {
  if (X.length) return S9.createElement(h, {
      paddingX: 2,
      paddingY: 0
  }

async function Tp(A, B, Q, I, G, Z, D) {
  let W = B !== "prompt" || !A.startsWith("/") ? await Ne1(x11(A, I, Z, [])) : [];
  if (B === "bash") {
      E1("tengu_input_bash", {}

async function rN5(A, B, Q, I) {
  try {
      let G = cw1(A, I.options.commands);
      switch (G.type) {
          case "local-jsx":
              return new Promise((Z) => {
                  G.call((D, Y) => {
                      if (Q(null), Y ? .skipMessage) {
                          Z({
                              messages: [],
                              shouldQuery: !1,
                              skipHistory: !0
                          }

function fj2(A, B) {
  let Q = ew1.useRef();
  ew1.useEffect(() => {
      let I = IW(A);
      if (Q.current !== I) Q.current = I;
      if (I) I.client.setNotificationHandler(tN5, (G) => {
          if (Q.current !== I) return;
          try {
              let Z = G.params,
                  D = Z.lineStart !== void 0 ? Z.lineStart + 1 : void 0,
                  Y = Z.lineEnd !== void 0 ? Z.lineEnd + 1 : void 0;
              B({
                  filePath: Z.filePath,
                  lineStart: D,
                  lineEnd: Y
              }

function vj2({
  maxBufferSize: A,
  debounceMs: B
}) {
  let [Q, I] = _E.useState([]), [G, Z] = _E.useState(-1), D = _E.useRef(0), Y = _E.useRef(null), W = _E.useCallback((V, C, K = {}

function eN5(A, B) {
  let Q = Object.keys(B).map(Number),
      I = Q.length > 0 ? Math.max(...Q) + 1 : 1,
      {
          truncatedText: G,
          placeholderContent: Z
      }

function N2(x0, d0) {
      E1("tengu_paste_image", {}

function h9(x0) {
      let d0 = UZ(x0).replace(/\r/g, `
`).replaceAll("\t", "    ");
      if (d0.length > sz1) {
          let L9 = {
                  id: MA,
                  type: "text",
                  content: d0
              }

function z5(x0) {
      y1(C, v1, d);
      let d0 = C.slice(0, v1) + x0 + C.slice(v1);
      K(d0), L1(v1 + x0.length)
  }

function mj2() {
  hj2.useEffect(() => {
      let A = Math.round(process.uptime() * 1000);
      E1("tengu_timer", {
          event: "startup",
          durationMs: A
      }

function dj2() {
  let [A, B] = I01.useState(() => {
      let Z = qG(!1);
      if (!mS() || T9()) return "valid";
      if (Z) return "loading";
      return "missing"
  }

function uj2(A, B, Q, I, G, Z, D, Y) {
  Z0((W, J) => {
      if (!J.escape) return;
      if (Z ? .aborted) return;
      if (!Z) return;
      if (!Q) return;
      if (I) return;
      if (Rp() && Y === "INSERT") return;
      if (G.length > 0) {
          if (D) D()
      }

function G01(A) {
  return Q$5.includes(A)
}

function Z01(A, B, Q, I) {
  let G;
  if (A.getPath && B) {
      let Z = A.inputSchema.safeParse(B);
      if (Z.success) {
          let D = A.getPath(Z.data);
          if (D) G = $G(D)
      }

async function D01(A, B, Q) {
  await bK("tool_decision", {
      decision: B,
      source: Q,
      tool_name: A
  }

function D() {
              E1("tengu_tool_use_cancelled", {
                  messageID: G.message.id,
                  toolName: B.name
              }

function Y() {
              Z({
                  behavior: "ask",
                  message: N11
              }

function ij2(A, B) {
  return lj2.useMemo(() => {
      if (A && B && B.length > 0) return UP([...A, ...B], "name");
      return A || []
  }

function aj2(A, B) {
  return nj2.useMemo(() => {
      return UP([...A, ...B], "name")
  }

function rj2(A, B) {
  return sj2.useMemo(() => {
      if (B.length > 0) return UP([...A, ...B], "name");
      return A
  }

function oj2({
  message: A,
  screen: B
}) {
  let Q = B === "transcript",
      I = vw2(A) || "";
  return t7.createElement(h, {
      flexDirection: "column"
  }

function tj2() {
  let A = ZA(),
      {
          hasReleaseNotes: B,
          releaseNotes: Q
      }

function ej2() {
  return ZA().tipsHistory || {}

function Ay2(A) {
  let B = ej2(),
      Q = ZA().numStartups;
  B[A] = Q, J$5(B)
}

function E2A(A) {
  let B = F$5(A);
  if (B === 0) return 1 / 0;
  return ZA().numStartups - B
}

async function By2(A, B = !1) {
  if (!K$5() || B) return;
  let Q = await V$5(A),
      I = C$5(Q);
  if (I.length === 0) return;
  let G = I.find((Z) => Z.id === "claude-opus-welcome");
  if (G) return G;
  return H$5(I)
}

function Qy2(A) {
  Ay2(A.id), E1("tengu_tip_shown", {
      tipIdLength: A.id,
      cooldownSessions: A.cooldownSessions
  }

function Iy2({
  tip: A
}) {
  zT.useEffect(() => {
      if (!A) return;
      Qy2(A)
  }

function Gy2() {
  let [A] = $V.useState(() => {
      let B = ZA(),
          Q = B.subscriptionNoticeCount ? ? 0,
          I = B.hasAvailableSubscription;
      if (Q >= 3) return !1;
      return I ? ? !1
  }

function Zy2() {
  return $V.useEffect(() => {
      E1("tengu_switch_to_subscription_notice_shown", {}

function Dy2({
  message: A,
  isTranscriptMode: B
}) {
  if (!(B && A.timestamp && A.type === "assistant" && A.message.content.some((G) => G.type === "text"))) return null;
  let I = new Date(A.timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: !1
  }

function N2A({
  messages: A,
  normalizedMessageHistory: B,
  tools: Q,
  verbose: I,
  toolJSX: G,
  toolUseConfirmQueue: Z,
  inProgressToolUseIDs: D,
  isMessageSelectorVisible: Y,
  tipOfTheDay: W,
  conversationId: J,
  screen: F,
  screenToggleId: X,
  streamingToolUses: V,
  showAllInTranscript: C = !1
}) {
  let K = Cp(),
      {
          columns: E
      }

function Yy2(A, B, Q, I, G) {
  Z0(async (Z, D) => {
      if (D.ctrl && Z === "r") B((Y) => Y === "transcript" ? "prompt" : "transcript"), Q((Y) => Y + 1), I(!1), await G();
      if (D.ctrl && Z === "e" && A === "transcript") I((Y) => !Y), Q((Y) => Y + 1), await G();
      if (D.ctrl && Z === "c" && A === "transcript") B("prompt"), Q((Y) => Y + 1), I(!1), await G()
  }

function Wy2(A, B) {
  let Q = W01.useRef(!1),
      I = W01.useRef(null);
  W01.useEffect(() => {
      let G = IW(A);
      if (I.current !== G) Q.current = !1, I.current = G || null, B({
          lineCount: 0,
          text: void 0,
          filePath: void 0
      }

function AE1(A) {
  Pp = A
}

function BE1(A, B) {
  try {
      let Q = fw2(A);
      if (Q[Q.length - 1] ? .type === "user") Q.push(xK({
          content: $11
      }

async function ET(A, B) {
  try {
      let Q;
      if (A === void 0) Q = await $Z0(0);
      else if (typeof A === "string") Q = await NZ0(A);
      else Q = A;
      if (!Q) return null;
      return WJ1(Q), {
          messages: BE1(Q.messages, B),
          log: Q
      }

function Jy2() {
  let [A, B] = Sp.useState([]), Q = Sp.useRef([]), I = Sp.useCallback((G) => {
      Q.current = G(Q.current), B(Q.current)
  }

function _p({
  commands: A,
  debug: B,
  initialPrompt: Q,
  shouldShowPromptInput: I,
  initialTools: G,
  initialMessages: Z,
  initialTodos: D,
  tipOfTheDay: Y,
  mcpClients: W,
  dynamicMcpConfig: J
}) {
  let [F, X] = d5(), {
      todoFeatureEnabled: V,
      toolPermissionContext: C,
      verbose: K,
      mainLoopModel: E,
      maxRateLimitFallbackActive: N,
      mcp: q,
      rateLimitResetsAt: O
  }

function NA(SA) {
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

function nI() {
      if (!MA) return;
      if (t(!1), y0(0), L1([]), V0(null), e[0]) e[0].onAbort(), y1([]);
      else BA ? .abort()
  }

async function rG() {
      WQ();
      let NA = dG();
      for (let z2 of NA) j8.current[z2.path] = {
          content: z2.content,
          timestamp: Date.now()
      }

async function zB(NA, SA, uA, W2, c0) {
      if (h1((DA) => [...DA, ...NA]), y0(0), L1([]), uA) {
          SK.handleQueryStart(u1);
          let DA = IW(u1);
          if (DA) Le0(DA)
      }

function Py2({
  servers: A,
  scope: B,
  onDone: Q
}) {
  let I = Object.keys(A),
      G = sG.useMemo(() => DV(), []),
      Z = I.filter((F) => G[F] !== void 0);

  function D(F) {
      let X = 0;
      for (let V of F) {
          let C = A[V];
          if (C) {
              let K = V;
              if (G[K] !== void 0) {
                  let E = 1;
                  while (G[`${V}

function J(F) {
      if (F > 0) EC(`
${V9("success",W)(`Successfully imported ${F}

function Wq5() {
  let A = Z7();
  if (!uS1.includes(A)) throw new Error(`Unsupported platform: ${A}

function _y2() {
  if (!uS1.includes(Z7())) throw new Error("Unsupported platform - Autocoder Desktop integration only works on macOS and WSL.");
  try {
      let A = Wq5();
      if (!x1().existsSync(A)) return {}

function IE1() {
  let A = x1(),
      B = dA(),
      Q = jy2(S4(), "projects", B.replace(/[^a-zA-Z0-9]/g, "-"));
  if (!A.existsSync(Q)) return !1;
  let G = A.readdirSync(Q).filter((D) => D.name.endsWith(".jsonl")).map((D) => jy2(Q, D.name));
  if (G.length === 0) return !1;
  let Z = new Date("2025-05-12");
  for (let D of G) try {
      if (A.statSync(D).birthtime < Z) return !0
  }

function yy2({
  onDismiss: A
}) {
  let {
      columns: B
  }

function Jq5({
  onDismiss: A
}) {
  let {
      columns: B
  }

function j2A({
  stats: A,
  width: B
}) {
  let Q = Math.max(...A.map((D) => D.usesN)),
      G = Math.max(...A.map((D) => D.toolName.length)) + 5,
      Z = B - G - 2;
  return q0.default.createElement(h, {
      flexDirection: "column",
      gap: 1
  }

function Fq5({
  width: A,
  percent: B,
  text: Q
}) {
  let I = Math.ceil(A * B),
      G = A - I,
      Z = Math.max(0, I - Q.length - 1),
      D = " " + Q + " ".repeat(Z),
      Y = " ".repeat(Math.max(0, G));
  return q0.default.createElement(P, null, q0.default.createElement(P, {
      backgroundColor: "claude"
  }

function Xq5({
  onDismiss: A
}) {
  let {
      columns: B
  }

function Vq5({
  onDismiss: A
}) {
  let {
      columns: B
  }

function y2A() {
  return q0.default.createElement(P, null, q0.default.createElement(P, {
      color: "claude"
  }

function k2A() {
  return q0.default.createElement(h, {
      flexDirection: "column",
      gap: 1
  }

function xy2({
  onDone: A
}) {
  let B = vC(),
      Q = Object.keys(B).length > 0;
  lI.default.useEffect(() => {
      let Z = ky2() === dA();
      E1("trust_dialog_shown", {
          isHomeDir: Z,
          hasMcpServers: Q
      }

function I(Z) {
      let D = m9();
      if (Z === "no") {
          MI(1);
          return
      }

function fy2({
  context: A,
  commands: B,
  logs: Q,
  initialTools: I,
  mcpClients: G,
  dynamicMcpConfig: Z,
  appState: D,
  onChangeAppState: Y,
  debug: W
}) {
  let {
      rows: J
  }

function X() {
      process.exit(1)
  }

async function V(C) {
      let K = Q[C];
      if (!K) return;
      try {
          A.unmount ? .();
          let E = await ET(K, I);
          if (!E) throw new Error("Failed to load conversation");
          let N = jJ(y9());
          await D3(), n5(GE1.default.createElement(c3, {
              initialState: D,
              onChangeAppState: Y
          }

async function hy2(A, B, Q) {
  if (!process.env.CLAUDE_CODE_ENTRYPOINT) process.env.CLAUDE_CODE_ENTRYPOINT = "mcp";
  EX(A);
  let I = new f2A({
      name: "claude/tengu",
      version: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
          PACKAGE_URL: "@elizaos/code",
          README_URL: "https://eliza.how",
          VERSION: "1.0.34"
      }

async function G() {
      let Z = new v2A;
      await I.connect(Z)
  }

function dy2() {
  let Q = (m6().cleanupPeriodDays ? ? Cq5) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - Q)
}

function Kq5(A, B) {
  return {
      messages: A.messages + B.messages,
      errors: A.errors + B.errors
  }

function Hq5(A) {
  let B = A.split(".")[0].replace(/T(\d{2}

function my2(A, B, Q) {
  let I = {
      messages: 0,
      errors: 0
  }

async function zq5() {
  let A = x1(),
      B = dy2(),
      Q = Mz.errors(),
      I = Mz.baseLogs(),
      G = my2(Q, B, !1);
  try {
      if (A.existsSync(I)) {
          let D = A.readdirSync(I).filter((Y) => Y.isDirectory() && Y.name.startsWith("mcp-logs-")).map((Y) => ZE1(I, Y.name));
          for (let Y of D) {
              G = Kq5(G, my2(Y, B, !0));
              try {
                  if (A.isDirEmptySync(Y)) A.rmdirSync(Y)
              }

function wq5() {
  let A = dy2(),
      B = {
          messages: 0,
          errors: 0
      }

function uy2() {
  setImmediate(() => {
      zq5(), wq5()
  }

async function Nq5(A) {
  if (!A.length) throw new Error("Can't summarize empty conversation");
  let Q = [`Please write a 5-10 word title the following conversation:

${AQ(A).map((G)=>{if(G.type==="user"){if(typeof G.message.content==="string")return`User: ${G.message.content}

function qq5(A) {
  let B = x1();
  try {
      B.statSync(A)
  }

function Mq5(A, B) {
  let Q = [],
      I = A;
  while (I) {
      let {
          isSidechain: G,
          parentUuid: Z,
          ...D
      }

function Lq5(A) {
  let B = new Set([...A.values()].map((Q) => Q.parentUuid).filter((Q) => Q !== null));
  return [...A.values()].filter((Q) => !B.has(Q.uuid))
}

function Rq5(A) {
  let B = x1();
  try {
      let {
          buffer: Q
      }

async function cy2() {
  let A = $q5(dA()),
      B = qq5(A);
  for (let Q of B) try {
      if (Rq5(Q)) break;
      if (!fC(Eq5(Q, ".jsonl"))) continue;
      let {
          messages: Z,
          summaries: D
      }

function DE1() {
  return b2A.default.createElement(P, null, "MCP servers may execute code or access system resources. All tool calls require approval. Learn more in the", " ", b2A.default.createElement(BJ1, {
      url: "https://eliza.how-mcp"
  }

function ly2({
  serverNames: A,
  onDone: B
}) {
  function Q(G) {
      let Z = m6() || {}

function iy2({
  serverName: A,
  onDone: B
}) {
  function Q(G) {
      switch (E1("tengu_mcp_dialog_choice", {
          choice: G
      }

async function ny2() {
  let A = vC(),
      B = Object.keys(A).filter((Q) => rC1(Q) === "pending");
  if (B.length === 0) return;
  await new Promise((Q) => {
      let I = () => {
          process.stdout.write("\x1B[2J\x1B[3J\x1B[H", () => {
              Q()
          }

function ay2({
  onAccept: A
}) {
  iI.default.useEffect(() => {
      E1("bypass_permissions_mode_dialog_shown", {}

function B(I) {
      let G = ZA();
      switch (I) {
          case "accept":
              {
                  E1("bypass_permissions_mode_dialog_accept", {}

function sy2() {
  return YE1.default.createElement(h, {
      flexDirection: "row"
  }

function NT({
  newState: A,
  oldState: B
}) {
  if (B !== null && A.mainLoopModel !== B.mainLoopModel && A.mainLoopModel === null) qB("userSettings", {
      model: void 0
  }

function oy2() {
  let A = ZA();
  if (!A.apiKeyHelper) return;
  try {
      qB("userSettings", {
          apiKeyHelper: A.apiKeyHelper
      }

function ty2() {
  let A = ZA();
  if (!A.env || Object.keys(A.env).length === 0) return;
  try {
      let B = KC("userSettings"),
          Q = B ? .env || {}

async function ey2() {
  if (!(await wJ("force_local_installation_migration") && !JT() && !print && !0 && !0 && !ZF())) return;
  console.log(UA.yellow("⚠️ Migrating Autocoder CLI to local installation...")), console.log("This improves auto-updates and removes dependency on global npm permissions."), console.log("Your existing configuration and history will be preserved.");
  try {
      E1("tengu_forced_migration_start", {
          gateControlled: !0
      }

function Ak2() {
  let A = m9(),
      B = A.enableAllProjectMcpServers !== void 0,
      Q = A.enabledMcpjsonServers && A.enabledMcpjsonServers.length > 0,
      I = A.disabledMcpjsonServers && A.disabledMcpjsonServers.length > 0;
  if (!B && !Q && !I) return;
  try {
      let G = KC("localSettings") || {}

function Bk2(A) {
  console.error(A), process.exit(1)
}

function Ik2(A, B) {
  let Q = {
      type: "permissionPromptTool",
      permissionPromptToolName: B,
      toolResult: A
  }

function jq5(A) {
  return A.flatMap((B) => {
      switch (B.type) {
          case "assistant":
              return [{
                  type: "assistant",
                  message: B.message,
                  uuid: Gk2(),
                  timestamp: new Date().toISOString()
              }

function Dk2(A) {
  return A.flatMap((B) => {
      switch (B.type) {
          case "assistant":
              return [{
                  type: "assistant",
                  message: B.message,
                  session_id: y9()
              }

async function Yk2(A, B, Q, I, G, Z, D, Y) {
  let W = [];
  if (Y.continue) try {
      E1("tengu_continue_print", {}

function kq5(A, B, Q, I, G, Z, D, Y) {
  let W = [],
      J = () => W,
      F = (N) => {
          W = W.filter((q) => !N.includes(q))
      }

async function Wk2() {
  if (E1("tengu_update_check", {}

async function vq5() {
  let A = [],
      B = 0;
  O9("Attempting to remove global npm installation of @elizaos/code");
  let {
      code: Q,
      stderr: I
  }

async function bq5() {
  let {
      stdout: A
  }

function gq5({
  onDone: A,
  force: B
}) {
  let [Q, I] = z6.useState({
      type: "checking"
  }

async function G() {
          try {
              O9(`Install: Starting installation process (force=${B}

function hq5() {
  let A = process.execArgv.some((Q) => /--inspect(-brk)?|--debug(-brk)?/.test(Q)),
      B = process.env.NODE_OPTIONS && /--inspect(-brk)?|--debug(-brk)?/.test(process.env.NODE_OPTIONS);
  try {
      return !!global.require("inspector").url() || A || B
  }

function cq5() {
  let A = ZA();
  j0({ ...A,
      hasCompletedOnboarding: !0,
      lastOnboardingVersion: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/elizaos/eliza/issues",
          PACKAGE_URL: "@elizaos/code",
          README_URL: "https://eliza.how",
          VERSION: "1.0.34"
      }

async function lq5(A) {
  if (!1 === "true" || process.env.IS_DEMO) return !1;
  let B = ZA(),
      Q = !1;
  if (!B.theme || !B.hasCompletedOnboarding) Q = !0, await D3(), await new Promise((I) => {
      let {
          unmount: G
      }

function iq5() {
  let A = ZA();
  j0({ ...A,
      numStartups: (A.numStartups ? ? 0) + 1
  }

async function nq5() {
  let [A, B] = await Promise.all([jz(), kn()]);
  E1("tengu_startup_telemetry", {
      is_git: A,
      worktree_count: B
  }

function aq5() {
  oy2(), ty2(), ey2(), Ak2(), hfA()
}

async function qT(A, B, Q, I) {
  let G = process.version.match(/^v(\d+)\./) ? .[1];
  if (!G || parseInt(G) < 18) console.error(UA.bold.red("Error: Autocoder requires Node.js version 18 or higher.")), process.exit(1);
  let Z = $T2();
  if (Z.status === "restored") console.log(UA.yellow("Detected an interrupted iTerm2 setup. Your original settings have been restored. You may need to restart iTerm2 for the changes to take effect."));
  else if (Z.status === "failed") console.error(UA.red(`Failed to restore iTerm2 settings. Please manually restore your original settings with: defaults import com.googlecode.iterm2 ${Z.backupPath}

async function sq5() {
  if (process.argv[2] === "--ripgrep") {
      let B = process.argv.slice(3);
      process.exit(Ba0(B))
  }

function rq5(A) {
  let B = {
      exitOnCtrlC: A,
      onFlicker() {
          E1("tengu_flicker", {}

async function oq5(A, B) {
  if (!process.stdin.isTTY && !process.argv.includes("mcp")) {
      if (B === "stream-json") return process.stdin;
      let Q = "";
      for await (let I of process.stdin) Q += I;
      return [A, Q].filter(Boolean).join(`
`)
  }

async function tq5() {
  aq5();
  let A = new Ty2;
  A.name("claude").description(`${m0}

function eq5() {
  (process.stderr.isTTY ? process.stderr : process.stdout.isTTY ? process.stdout : void 0) ? .write(`\x1B[?25h${OP1}

// Classes  
class pA1 {
      constructor(A) {
          this.setOptions(A), this.x = null, this.y = null
      }

class Fw1 {
      constructor() {}

class Xw1 {
      constructor(A) {
          this.originalCell = A
      }

class V0A extends Array {
      constructor(A) {
          super();
          let B = dw5.mergeOptions(A);
          if (Object.defineProperty(this, "options", {
                  value: B,
                  enumerable: B.debug
              }

class q2A extends Error {
      constructor(A, B, Q) {
          super(Q);
          Error.captureStackTrace(this, this.constructor), this.name = this.constructor.name, this.code = B, this.exitCode = A, this.nestedError = void 0
      }

class Fy2 extends q2A {
      constructor(A) {
          super(1, "commander.invalidArgument", A);
          Error.captureStackTrace(this, this.constructor), this.name = this.constructor.name
      }

class Xy2 {
      constructor(A, B) {
          switch (this.description = B || "", this.variadic = !1, this.parseArg = void 0, this.defaultValue = void 0, this.defaultValueDescription = void 0, this.argChoices = void 0, A[0]) {
              case "<":
                  this.required = !0, this._name = A.slice(1, -1);
                  break;
              case "[":
                  this.required = !1, this._name = A.slice(1, -1);
                  break;
              default:
                  this.required = !0, this._name = A;
                  break
          }

class Vy2 {
      constructor() {
          this.helpWidth = void 0, this.sortSubcommands = !1, this.sortOptions = !1, this.showGlobalOptions = !1
      }

class Cy2 {
      constructor(A, B) {
          this.flags = A, this.description = B || "", this.required = A.includes("<"), this.optional = A.includes("["), this.variadic = /\w\.\.\.[>\]]$/.test(A), this.mandatory = !1;
          let Q = k$5(A);
          if (this.short = Q.shortFlag, this.long = Q.longFlag, this.negate = !1, this.long) this.negate = this.long.startsWith("--no-");
          this.defaultValue = void 0, this.defaultValueDescription = void 0, this.presetArg = void 0, this.envVar = void 0, this.parseArg = void 0, this.hidden = !1, this.argChoices = void 0, this.conflictsWith = [], this.implied = void 0
      }

class Ky2 {
      constructor(A) {
          this.positiveOptions = new Map, this.negativeOptions = new Map, this.dualOptions = new Set, A.forEach((B) => {
              if (B.negate) this.negativeOptions.set(B.attributeName(), B);
              else this.positiveOptions.set(B.attributeName(), B)
          }

class zVA {
  constructor() {
      this.handlers = []
  }

class Ol {
  constructor(A) {
      A && this.set(A)
  }

class nVA {
  constructor(A, B) {
      let {
          escapeName: Q
      }

class gl {
  constructor(A) {
      this.defaults = A, this.interceptors = {
          request: new ZM1,
          response: new ZM1
      }

class bM1 {
  constructor(A) {
      if (typeof A !== "function") throw new TypeError("executor must be a function.");
      let B;
      this.promise = new Promise(function I(G) {
          B = G
      }

class LL1 {
  cache = new Map;
  ready = !1;
  constructor() {
      try {
          if (!GzA(Cf())) eN9(Cf(), {
              recursive: !0
          }

class KG {
  type;#
  A;#
  B;#
  Q = !1;#
  I = [];#
  G;#
  W;#
  Z;#
  F = !1;#
  J;#
  X;#
  Y = !1;
  constructor(A, B, Q = {}

class iF {
  options;
  set;
  pattern;
  windowsPathsNoEscape;
  nonegate;
  negate;
  comment;
  empty;
  preserveMultipleSlashes;
  partial;
  globSet;
  globParts;
  nocase;
  isWindows;
  platform;
  windowsNoMagicRoot;
  regexp;
  constructor(A, B = {}

class Q {
      onabort;
      _onabort = [];
      reason;
      aborted = !1;
      addEventListener(I, G) {
          this._onabort.push(G)
      }

class Q {
      constructor() {
          B()
      }

class el extends Array {
  constructor(A) {
      super(A);
      this.fill(0)
  }

class Ef {
  heap;
  length;
  static# A = !1;
  static create(A) {
      let B = gzA(A);
      if (!B) return [];
      Ef.#A = !0;
      let Q = new Ef(A, B);
      return Ef.#A = !1, Q
  }

class Ai {#
  A;#
  B;#
  Q;#
  I;#
  G;#
  W;
  ttl;
  ttlResolution;
  ttlAutopurge;
  updateAgeOnGet;
  updateAgeOnHas;
  allowStale;
  noDisposeOnSet;
  noUpdateTTL;
  maxEntrySize;
  sizeCalculation;
  noDeleteOnFetchRejection;
  noDeleteOnStaleGet;
  allowStaleOnFetchAbort;
  allowStaleOnFetchRejection;
  ignoreFetchAbort;#
  Z;#
  F;#
  J;#
  X;#
  Y;#
  w;#
  E;#
  K;#
  C;#
  M;#
  z;#
  L;#
  R;#
  N;#
  $;#
  q;#
  H;
  static unsafeExposeInternals(A) {
      return {
          starts: A.#R,
          ttls: A.#N,
          sizes: A.#L,
          keyMap: A.#J,
          keyList: A.#X,
          valList: A.#Y,
          next: A.#w,
          prev: A.#E,
          get head() {
              return A.#K
          }

class gL1 {
  src;
  dest;
  opts;
  ondrain;
  constructor(A, B, Q) {
      this.src = A, this.dest = B, this.opts = Q, this.ondrain = () => A[Nf](), this.dest.on("drain", this.ondrain)
  }

class czA extends gL1 {
  unpipe() {
      this.src.removeListener("error", this.proxyErrors), super.unpipe()
  }

class WS extends bL1 {
  [KI] = !1;
  [Qi] = !1;
  [MD] = [];
  [HI] = [];
  [zZ];
  [DC];
  [Jz];
  [Uf];
  [gU] = !1;
  [EM] = !1;
  [X51] = !1;
  [V51] = !1;
  [Bi] = null;
  [zI] = 0;
  [LQ] = !1;
  [Ii];
  [H51] = !1;
  [YS] = 0;
  [ZJ] = !1;
  writable = !0;
  readable = !0;
  constructor(...A) {
      let B = A[0] || {}

class uL1 extends Ai {
  constructor() {
      super({
          max: 256
      }

class QwA extends Ai {
  constructor(A = 16384) {
      super({
          maxSize: A,
          sizeCalculation: (B) => B.length + 1
      }

class LD {
  name;
  root;
  roots;
  parent;
  nocase;
  isCWD = !1;#
  A;#
  B;
  get dev() {
      return this.#B
  }

class U51 extends LD {
  sep = "\\";
  splitSep = Mq9;
  constructor(A, B = aF, Q, I, G, Z, D) {
      super(A, B, Q, I, G, Z, D)
  }

class N51 extends LD {
  splitSep = "/";
  sep = "/";
  constructor(A, B = aF, Q, I, G, Z, D) {
      super(A, B, Q, I, G, Z, D)
  }

class pL1 {
  root;
  rootPath;
  roots;
  cwd;#
  A;#
  B;#
  Q;
  nocase;#
  I;
  constructor(A = process.cwd(), B, Q, {
      nocase: I,
      childrenCacheSize: G = 16384,
      fs: Z = Di
  }

class Ji extends pL1 {
  sep = "\\";
  constructor(A = process.cwd(), B = {}

class Fi extends pL1 {
  sep = "/";
  constructor(A = process.cwd(), B = {}

class Xi {
  relative;
  relativeChildren;
  absolute;
  absoluteChildren;
  platform;
  mmopts;
  constructor(A, {
      nobrace: B,
      nocase: Q,
      noext: I,
      noglobstar: G,
      platform: Z = Tq9
  }

class cL1 {
  store;
  constructor(A = new Map) {
      this.store = A
  }

class ZwA {
  store = new Map;
  add(A, B, Q) {
      let I = (B ? 2 : 0) | (Q ? 1 : 0),
          G = this.store.get(A);
      this.store.set(A, G === void 0 ? I : I & G)
  }

class DwA {
  store = new Map;
  add(A, B) {
      if (!A.canReaddir()) return;
      let Q = this.store.get(A);
      if (Q) {
          if (!Q.find((I) => I.globString() === B.globString())) Q.push(B)
      }

class Vi {
  hasWalkedCache;
  matches = new ZwA;
  subwalks = new DwA;
  patterns;
  follow;
  dot;
  opts;
  constructor(A, B) {
      this.opts = A, this.follow = !!A.follow, this.dot = !!A.dot, this.hasWalkedCache = B ? B.copy() : new cL1
  }

class lL1 {
  path;
  patterns;
  opts;
  seen = new Set;
  paused = !1;
  aborted = !1;#
  A = [];#
  B;#
  Q;
  signal;
  maxDepth;
  includeChildMatches;
  constructor(A, B, Q) {
      if (this.patterns = A, this.path = B, this.opts = Q, this.#Q = !Q.posix && Q.platform === "win32" ? "\\" : "/", this.includeChildMatches = Q.includeChildMatches !== !1, Q.ignore || !this.includeChildMatches) {
          if (this.#B = Pq9(Q.ignore ? ? [], Q), !this.includeChildMatches && typeof this.#B.add !== "function") throw new Error("cannot ignore child matches, ignore lacks add() method.")
      }

class q51 extends lL1 {
  matches = new Set;
  constructor(A, B, Q) {
      super(A, B, Q)
  }

class M51 extends lL1 {
  results;
  constructor(A, B, Q) {
      super(A, B, Q);
      this.results = new WS({
          signal: this.signal,
          objectMode: !0
      }

class Xz {
  absolute;
  cwd;
  root;
  dot;
  dotRelative;
  follow;
  ignore;
  magicalBraces;
  mark;
  matchBase;
  maxDepth;
  nobrace;
  nocase;
  nodir;
  noext;
  noglobstar;
  pattern;
  platform;
  realpath;
  scurry;
  stat;
  signal;
  windowsPathsNoEscape;
  withFileTypes;
  includeChildMatches;
  opts;
  patterns;
  constructor(A, B) {
      if (!B) throw new TypeError("glob options required");
      if (this.withFileTypes = !!B.withFileTypes, this.signal = B.signal, this.follow = !!B.follow, this.dot = !!B.dot, this.dotRelative = !!B.dotRelative, this.nodir = !!B.nodir, this.mark = !!B.mark, !B.cwd) this.cwd = "";
      else if (B.cwd instanceof URL || B.cwd.startsWith("file://")) B.cwd = Sq9(B.cwd);
      if (this.cwd = B.cwd || "", this.root = B.root, this.magicalBraces = !!B.magicalBraces, this.nobrace = !!B.nobrace, this.noext = !!B.noext, this.realpath = !!B.realpath, this.absolute = B.absolute, this.includeChildMatches = B.includeChildMatches !== !1, this.noglobstar = !!B.noglobstar, this.matchBase = !!B.matchBase, this.maxDepth = typeof B.maxDepth === "number" ? B.maxDepth : 1 / 0, this.stat = !!B.stat, this.ignore = B.ignore, this.withFileTypes && this.absolute !== void 0) throw new Error("cannot set absolute and withFileTypes:true");
      if (typeof A === "string") A = [A];
      if (this.windowsPathsNoEscape = !!B.windowsPathsNoEscape || B.allowWindowsEscape === !1, this.windowsPathsNoEscape) A = A.map((Y) => Y.replace(/\\/g, "/"));
      if (this.matchBase) {
          if (B.noglobstar) throw new TypeError("base matching requires globstar");
          A = A.map((Y) => Y.includes("/") ? Y : `./**/${Y}

class KfA {
  cache = new Map;
  maxCacheSize = 1000;
  readFile(A) {
      let B = x1(),
          Q;
      try {
          Q = B.statSync(A)
      }

class Vv extends Error {
  filePath;
  defaultConfig;
  constructor(A, B, Q) {
      super(A);
      this.name = "ConfigParseError", this.filePath = B, this.defaultConfig = Q
  }

class Uz extends Error {
  stdout;
  stderr;
  code;
  interrupted;
  constructor(A, B, Q, I) {
      super("Shell command failed");
      this.stdout = A;
      this.stderr = B;
      this.code = Q;
      this.interrupted = I;
      this.name = "ShellError"
  }

class WJ extends Error {
  get errors() {
      return this.issues
  }

class wZ {
  constructor() {
      this.value = "valid"
  }

class CC {
  constructor(A, B, Q, I) {
      this._cachedPath = [], this.parent = A, this.data = B, this._path = Q, this._key = I
  }

class i4 {
  get description() {
      return this._def.description
  }

class XC extends i4 {
  _parse(A) {
      if (this._def.coerce) A.data = String(A.data);
      if (this._getType(A) !== T2.string) {
          let G = this._getOrReturnCtx(A);
          return X2(G, {
              code: $0.invalid_type,
              expected: T2.string,
              received: G.parsedType
          }

class cM extends i4 {
  constructor() {
      super(...arguments);
      this.min = this.gte, this.max = this.lte, this.step = this.multipleOf
  }

class lM extends i4 {
  constructor() {
      super(...arguments);
      this.min = this.gte, this.max = this.lte
  }

class wv extends i4 {
  _parse(A) {
      if (this._def.coerce) A.data = Boolean(A.data);
      if (this._getType(A) !== T2.boolean) {
          let Q = this._getOrReturnCtx(A);
          return X2(Q, {
              code: $0.invalid_type,
              expected: T2.boolean,
              received: Q.parsedType
          }

class zS extends i4 {
  _parse(A) {
      if (this._def.coerce) A.data = new Date(A.data);
      if (this._getType(A) !== T2.date) {
          let G = this._getOrReturnCtx(A);
          return X2(G, {
              code: $0.invalid_type,
              expected: T2.date,
              received: G.parsedType
          }

class bi extends i4 {
  _parse(A) {
      if (this._getType(A) !== T2.symbol) {
          let Q = this._getOrReturnCtx(A);
          return X2(Q, {
              code: $0.invalid_type,
              expected: T2.symbol,
              received: Q.parsedType
          }

class Ev extends i4 {
  _parse(A) {
      if (this._getType(A) !== T2.undefined) {
          let Q = this._getOrReturnCtx(A);
          return X2(Q, {
              code: $0.invalid_type,
              expected: T2.undefined,
              received: Q.parsedType
          }

class Uv extends i4 {
  _parse(A) {
      if (this._getType(A) !== T2.null) {
          let Q = this._getOrReturnCtx(A);
          return X2(Q, {
              code: $0.invalid_type,
              expected: T2.null,
              received: Q.parsedType
          }

class wS extends i4 {
  constructor() {
      super(...arguments);
      this._any = !0
  }

class pM extends i4 {
  constructor() {
      super(...arguments);
      this._unknown = !0
  }

class Nz extends i4 {
  _parse(A) {
      let B = this._getOrReturnCtx(A);
      return X2(B, {
          code: $0.invalid_type,
          expected: T2.never,
          received: B.parsedType
      }

class gi extends i4 {
  _parse(A) {
      if (this._getType(A) !== T2.undefined) {
          let Q = this._getOrReturnCtx(A);
          return X2(Q, {
              code: $0.invalid_type,
              expected: T2.void,
              received: Q.parsedType
          }

class VC extends i4 {
  _parse(A) {
      let {
          ctx: B,
          status: Q
      }

class U3 extends i4 {
  constructor() {
      super(...arguments);
      this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend
  }

class Nv extends i4 {
  _parse(A) {
      let {
          ctx: B
      }

class T81 extends i4 {
  _parse(A) {
      let {
          ctx: B
      }

class hi extends i4 {
  get keySchema() {
      return this._def.keyType
  }

class mi extends i4 {
  get keySchema() {
      return this._def.keyType
  }

class ES extends i4 {
  _parse(A) {
      let {
          status: B,
          ctx: Q
      }

class Hv extends i4 {
  constructor() {
      super(...arguments);
      this.validate = this.implement
  }

class qv extends i4 {
  get schema() {
      return this._def.getter()
  }

class Mv extends i4 {
  _parse(A) {
      if (A.data !== this._def.value) {
          let B = this._getOrReturnCtx(A);
          return X2(B, {
              received: B.data,
              code: $0.invalid_literal,
              expected: this._def.value
          }

class iM extends i4 {
  constructor() {
      super(...arguments);
      xi.set(this, void 0)
  }

class Lv extends i4 {
  constructor() {
      super(...arguments);
      fi.set(this, void 0)
  }

class US extends i4 {
  unwrap() {
      return this._def.type
  }

class tF extends i4 {
  innerType() {
      return this._def.schema
  }

class JJ extends i4 {
  _parse(A) {
      if (this._getType(A) === T2.undefined) return OD(void 0);
      return this._def.innerType._parse(A)
  }

class rU extends i4 {
  _parse(A) {
      if (this._getType(A) === T2.null) return OD(null);
      return this._def.innerType._parse(A)
  }

class Rv extends i4 {
  _parse(A) {
      let {
          ctx: B
      }

class Ov extends i4 {
  _parse(A) {
      let {
          ctx: B
      }

class di extends i4 {
  _parse(A) {
      if (this._getType(A) !== T2.nan) {
          let Q = this._getOrReturnCtx(A);
          return X2(Q, {
              code: $0.invalid_type,
              expected: T2.nan,
              received: Q.parsedType
          }

class P81 extends i4 {
  _parse(A) {
      let {
          ctx: B
      }

class ui extends i4 {
  _parse(A) {
      let {
          status: B,
          ctx: Q
      }

class Tv extends i4 {
  _parse(A) {
      let B = this._def.innerType._parse(A),
          Q = (I) => {
              if (HS(I)) I.value = Object.freeze(I.value);
              return I
          }

class bvA {
  emitted = {
      afterExit: !1,
      exit: !1
  }

class gvA extends jP1 {
  onExit() {
      return () => {}

class hvA extends jP1 {#
  A = _P1.platform === "win32" ? "SIGINT" : "SIGHUP";#
  B = new bvA;#
  Q;#
  I;#
  G;#
  W = {}

class Sn {
  width;
  height;
  operations = [];
  charCache = {}

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
          }

class VZ0 {
  summaries;
  messages;
  sessionMessages;
  didLoad = !1;
  sessionFile = null;
  constructor() {
      this.summaries = new Map, this.messages = new Map, this.sessionMessages = new Map
  }

class gZ0 {
  profilePath;
  defaultProfile = `(version 1)
;; Default deny (whitelist approach)
(deny default)

;; Essential filesystem operations
(allow file-read*)
(allow file-read-metadata)
(allow file-ioctl)

;; Allow writes to /dev/null
(allow file-write* (literal "/dev/null"))
(allow file-read-data (subpath "/dev/fd"))

;; Limited sys operations needed for basic functionality
(allow sysctl-read)
(allow mach-lookup)
(allow process-exec)
(allow process-fork)

;; Allow signals to self and process group (descendants)
(allow signal (target pgrp))`;
  constructor() {
      let A = Math.floor(Math.random() * 65536).toString(16).padStart(4, "0");
      this.profilePath = bZ0.join(vZ0.tmpdir(), `claude-sandbox-${A}

class Ys extends Map {
  first;
  constructor(A) {
      let B = [],
          Q, I, G = 0;
      for (let Z of A) {
          let D = { ...Z,
              previous: I,
              next: void 0,
              index: G
          }

class mG1 extends Map {
  first;
  constructor(A) {
      let B = [],
          Q, I, G = 0;
      for (let Z of A) {
          let D = { ...Z,
              previous: I,
              next: void 0,
              index: G
          }

class Au1 {
  error(A, ...B) {
      b1(new Error(A))
  }

class Bu1 {
  endpoint;
  timeout;
  pendingExports = [];
  isShutdown = !1;
  constructor(A = {}

class p6 extends P9 {
  constructor(A, B, Q, I) {
      super(`${p6.makeMessage(A,B,Q)}

class _I extends p6 {
  constructor({
      message: A
  }

class eN extends p6 {
  constructor({
      message: A,
      cause: B
  }

class vo extends eN {
  constructor({
      message: A
  }

class iR {
  constructor() {
      kJ.set(this, void 0), xJ.set(this, void 0), Q4(this, kJ, new Uint8Array, "f"), Q4(this, xJ, null, "f")
  }

class bD {
  constructor(A, B) {
      this.iterator = A, this.controller = B
  }

class gs0 {
  constructor() {
      this.event = null, this.data = [], this.chunks = []
  }

class kj extends Promise {
  constructor(A, B, Q = $J1) {
      super((I) => {
          I(null)
      }

class hs0 {
  constructor(A, B, Q, I) {
      qJ1.set(this, void 0), Q4(this, qJ1, A, "f"), this.options = I, this.response = B, this.body = Q
  }

class MJ1 extends kj {
  constructor(A, B, Q) {
      super(A, B, async (I, G) => new Q(I, G.response, await $J1(I, G), G.options))
  }

class kG {
  constructor(A) {
      this._client = A
  }

class ro extends kG {
  retrieve(A, B = {}

class oo extends kG {
  create(A, B) {
      let {
          betas: Q,
          ...I
      }

class It {
  constructor() {
      iX.add(this), this.messages = [], this.receivedMessages = [], nR.set(this, void 0), this.controller = new AbortController, to.set(this, void 0), TJ1.set(this, () => {}

class Lm extends kG {
  constructor() {
      super(...arguments);
      this.batches = new oo(this._client)
  }

class nX extends kG {
  constructor() {
      super(...arguments);
      this.models = new ro(this._client), this.messages = new Lm(this._client)
  }

class aR extends kG {
  create(A, B) {
      let {
          betas: Q,
          ...I
      }

class Gt extends kG {
  create(A, B) {
      return this._client.post("/v1/messages/batches", {
          body: A,
          ...B
      }

class Om {
  constructor() {
      aX.add(this), this.messages = [], this.receivedMessages = [], sR.set(this, void 0), this.controller = new AbortController, Zt.set(this, void 0), kJ1.set(this, () => {}

class WK extends kG {
  constructor() {
      super(...arguments);
      this.batches = new Gt(this._client)
  }

class Tm extends kG {
  retrieve(A, B = {}

class R8 {
  constructor({
      baseURL: A = Ft("ANTHROPIC_BASE_URL"),
      apiKey: B = Ft("ANTHROPIC_API_KEY") ? ? null,
      authToken: Q = Ft("ANTHROPIC_AUTH_TOKEN") ? ? null,
      ...I
  }

class kw extends R8 {
  constructor() {
      super(...arguments);
      this.completions = new aR(this), this.messages = new WK(this), this.models = new Tm(this), this.beta = new nX(this)
  }

class _m extends Error {
  constructor(A, B, Q) {
      super(`MCP error ${A}

class wt {
  constructor(A) {
      this._options = A, this._requestMessageId = 0, this._requestHandlers = new Map, this._requestHandlerAbortControllers = new Map, this._notificationHandlers = new Map, this._responseHandlers = new Map, this._progressHandlers = new Map, this._timeoutInfo = new Map, this.setNotificationHandler(aJ1, (B) => {
          let Q = this._requestHandlerAbortControllers.get(B.params.requestId);
          Q === null || Q === void 0 || Q.abort(B.params.reason)
      }

class Ll1 extends wt {
  constructor(A, B) {
      var Q;
      super(B);
      this._clientInfo = A, this._capabilities = (Q = B === null || B === void 0 ? void 0 : B.capabilities) !== null && Q !== void 0 ? Q : {}

class Et {
  append(A) {
      this._buffer = this._buffer ? Buffer.concat([this._buffer, A]) : A
  }

class xl1 {
  constructor(A) {
      if (this._abortController = new AbortController, this._readBuffer = new Et, this._stderrStream = null, this._serverParams = A, A.stderr === "pipe" || A.stderr === "overlapped") this._stderrStream = new FO6
  }

class vl1 extends Error {
  constructor(A, B) {
      super(A), this.name = "ParseError", this.type = B.type, this.field = B.field, this.value = B.value, this.line = B.line
  }

class bl1 extends Event {
  constructor(A, B) {
      var Q, I;
      super(A), this.code = (Q = B == null ? void 0 : B.code) != null ? Q : void 0, this.message = (I = B == null ? void 0 : B.message) != null ? I : void 0
  }

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
          }

class vJ extends Error {
  constructor(A) {
      super(A !== null && A !== void 0 ? A : "Unauthorized")
  }

class Ho0 extends Error {
  constructor(A, B, Q) {
      super(`SSE error: ${B}

class FF1 {
  constructor(A, B) {
      this._url = A, this._eventSourceInit = B === null || B === void 0 ? void 0 : B.eventSourceInit, this._requestInit = B === null || B === void 0 ? void 0 : B.requestInit, this._authProvider = B === null || B === void 0 ? void 0 : B.authProvider
  }

class ol1 extends TransformStream {
  constructor({
      onError: A,
      onRetry: B,
      onComment: Q
  }

class XF1 extends Error {
  constructor(A, B) {
      super(`Streamable HTTP error: ${B}

class tl1 {
  constructor(A, B) {
      var Q;
      this._url = A, this._requestInit = B === null || B === void 0 ? void 0 : B.requestInit, this._authProvider = B === null || B === void 0 ? void 0 : B.authProvider, this._sessionId = B === null || B === void 0 ? void 0 : B.sessionId, this._reconnectionOptions = (Q = B === null || B === void 0 ? void 0 : B.reconnectionOptions) !== null && Q !== void 0 ? Q : TO6
  }

class iV1 extends bD {
  static fromSSEResponse(A, B) {
      let Q = !1;
      async function* I() {
          if (!A.body) throw B.abort(), new P9("Attempted to iterate over a response with no body");
          let Z = ID2(A.body),
              D = QD2(Z, Vo6());
          for await (let Y of D) if (Y.chunk && Y.chunk.bytes) yield {
              event: "chunk",
              data: Zs1(Y.chunk.bytes),
              raw: []
          }

class nV1 extends R8 {
  constructor({
      awsRegion: A = Ds1("AWS_REGION") ? ? "us-east-1",
      baseURL: B = Ds1("ANTHROPIC_BEDROCK_BASE_URL") ? ? `https://bedrock-runtime.${A}

class jC1 extends R8 {
  constructor({
      baseURL: A = SC1("ANTHROPIC_VERTEX_BASE_URL"),
      region: B = SC1("CLOUD_ML_REGION") ? ? null,
      projectId: Q = SC1("ANTHROPIC_VERTEX_PROJECT_ID") ? ? null,
      ...I
  }

class he extends Error {
  constructor(A, B) {
      super(`MCP tool "${A}

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
          }

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

class PK {
  static instance;
  baseline = new Map;
  initialized = !1;
  mcpClient;
  lastProcessedTimestamps = new Map;
  lastDiagnosticsByUri = new Map;
  rightFileDiagnosticsState = new Map;
  static getInstance() {
      if (!PK.instance) PK.instance = new PK;
      return PK.instance
  }

class dK1 extends Error {
  tokenCount;
  maxTokens;
  constructor(A, B) {
      super(`File content (${A}

class H11 {
  options;
  rules;
  lexer;
  constructor(A) {
      this.options = A || Xy
  }

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
      }

class z11 {
  options;
  parser;
  constructor(A) {
      this.options = A || Xy
  }

class nK1 {
  strong({
      text: A
  }

class XV {
  options;
  renderer;
  textRenderer;
  constructor(A) {
      this.options = A || Xy, this.options.renderer = this.options.renderer || new z11, this.renderer = this.options.renderer, this.renderer.options = this.options, this.renderer.parser = this, this.textRenderer = new nK1
  }

class K11 {
  options;
  block;
  constructor(A) {
      this.options = A || Xy
  }

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

class pw2 {
  id;
  command;
  startTime;
  status;
  result;
  shellCommand;
  stdout = "";
  stderr = "";
  constructor(A, B, Q, I) {
      this.id = A;
      this.command = B;
      this.status = "running", this.startTime = Date.now(), this.shellCommand = Q, O9(`BackgroundShell ${A}

class Xu {
  static instance = null;
  shells = new Map;
  shellCounter = 0;
  subscribers = new Set;
  constructor() {}

class cO extends Error {
  originalError;
  retryContext;
  constructor(A, B) {
      let Q = A instanceof Error ? A.message : String(A);
      super(Q);
      this.originalError = A;
      this.retryContext = B;
      if (this.name = "RetryError", A instanceof Error && A.stack) this.stack = A.stack
  }

class wH1 extends Error {
  originalModel;
  fallbackModel;
  constructor(A, B) {
      super(`Model fallback triggered: ${A}

class mO2 {
  constructor(A) {
      this._keys = [], this._keyMap = {}

class iz1 {
  constructor({
      getFn: A = M4.getFn,
      fieldNormWeight: B = M4.fieldNormWeight
  }

class dAA {
  constructor(A, {
      location: B = M4.location,
      threshold: Q = M4.threshold,
      distance: I = M4.distance,
      includeMatches: G = M4.includeMatches,
      findAllMatches: Z = M4.findAllMatches,
      minMatchCharLength: D = M4.minMatchCharLength,
      isCaseSensitive: Y = M4.isCaseSensitive,
      ignoreLocation: W = M4.ignoreLocation
  }

class sO2 {
  constructor(A, {
      isCaseSensitive: B = M4.isCaseSensitive,
      includeMatches: Q = M4.includeMatches,
      minMatchCharLength: I = M4.minMatchCharLength,
      ignoreLocation: G = M4.ignoreLocation,
      findAllMatches: Z = M4.findAllMatches,
      location: D = M4.location,
      threshold: Y = M4.threshold,
      distance: W = M4.distance
  }

class EV {
  constructor(A, B = {}

class T5 {
  measuredText;
  selection;
  offset;
  constructor(A, B = 0, Q = 0) {
      this.measuredText = A;
      this.selection = Q;
      this.offset = Math.max(0, Math.min(this.measuredText.text.length, B))
  }

class nz1 {
  text;
  startOffset;
  isPrecededByNewline;
  endsWithNewline;
  constructor(A, B, Q, I = !1) {
      this.text = A;
      this.startOffset = B;
      this.isPrecededByNewline = Q;
      this.endsWithNewline = I
  }

class YT2 {
  text;
  columns;
  wrappedLines;
  constructor(A, B) {
      this.text = A;
      this.columns = B;
      this.wrappedLines = this.measureWrappedText()
  }

class M0A {
  localServer = null;
  promiseResolver = null;
  promiseRejecter = null;
  expectedState = null;
  pendingResponse = null;
  hasPendingResponse() {
      return this.pendingResponse !== null
  }

class P0A {
  codeVerifier;
  authCodeListener;
  manualAuthCodeResolver = null;
  constructor() {
      this.codeVerifier = KS2(), this.authCodeListener = new M0A
  }

class k0A {
  alreadyRendered = {}

class f2A extends wt {
  constructor(A, B) {
      var Q;
      super(B);
      this._serverInfo = A, this._capabilities = (Q = B === null || B === void 0 ? void 0 : B.capabilities) !== null && Q !== void 0 ? Q : {}

class v2A {
  constructor(A = vy2.stdin, B = vy2.stdout) {
      this._stdin = A, this._stdout = B, this._readBuffer = new Et, this._started = !1, this._ondata = (Q) => {
          this._readBuffer.append(Q), this.processReadBuffer()
      }

class g2A {
  input;
  structuredInput;
  constructor(A) {
      this.input = A;
      this.input = A, this.structuredInput = this.read()
  }

class h2A {
  returned;
  queue = [];
  readResolve;
  readReject;
  isDone = !1;
  hasError;
  started = !1;
  constructor(A) {
      this.returned = A
  }

// Constants

