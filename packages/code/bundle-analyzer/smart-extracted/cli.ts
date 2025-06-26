// Cli Components
// Extracted from bundled code

// Fy2 - Lines 1017-1022
  class Fy2 extends q2A {
  class Fy2 extends q2A {
      constructor(A) {
          super(1, "commander.invalidArgument", A);
          Error.captureStackTrace(this, this.constructor), this.name = this.constructor.name
      }
  }


// LD - Lines 9408-9895
class LD {
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
  }#
  Q;
  get mode() {
      return this.#Q
  }#
  I;
  get nlink() {
      return this.#I
  }#
  G;
  get uid() {
      return this.#G
  }#
  W;
  get gid() {
      return this.#W
  }#
  Z;
  get rdev() {
      return this.#Z
  }#
  F;
  get blksize() {
      return this.#F
  }#
  J;
  get ino() {
      return this.#J
  }#
  X;
  get size() {
      return this.#X
  }#
  Y;
  get blocks() {
      return this.#Y
  }#
  w;
  get atimeMs() {
      return this.#w
  }#
  E;
  get mtimeMs() {
      return this.#E
  }#
  K;
  get ctimeMs() {
      return this.#K
  }#
  C;
  get birthtimeMs() {
      return this.#C
  }#
  M;
  get atime() {
      return this.#M
  }#
  z;
  get mtime() {
      return this.#z
  }#
  L;
  get ctime() {
      return this.#L
  }#
  R;
  get birthtime() {
      return this.#R
  }#
  N;#
  $;#
  q;#
  H;#
  S;#
  O;#
  D;#
  y;#
  U;#
  _;
  get parentPath() {
      return (this.parent || this).fullpath()
  }
  get path() {
      return this.parentPath
  }
  constructor(A, B = aF, Q, I, G, Z, D) {
      if (this.name = A, this.#N = G ? w51(A) : Wi(A), this.#D = B & Lq9, this.nocase = G, this.roots = I, this.root = Q || this, this.#var_y = Z, this.#query = D.fullpath, this.#S = D.relative, this.#O = D.relativePosix, this.parent = D.parent, this.parent) this.#A = this.parent.#A;
      else this.#A = szA(D.fs)
  }
  depth() {
      if (this.#$ !== void 0) return this.#$;
      if (!this.parent) return this.#$ = 0;
      return this.#$ = this.parent.depth() + 1
  }
  childrenCache() {
      return this.#y
  }
  resolve(A) {
      if (!A) return this;
let B: any = this.getRootString(A),
          I = A.substring(B.length).split(this.splitSep);
      return B ? this.getRoot(B).#k(I) : this.#k(I)
  }#
  k(A) {
let B: any = this;
      for (let Q of A) B = B.child(Q);
      return B
  }
  children() {
let A: any = this.#var_y.get(this);
      if (A) return A;
let B: any = Object.assign([], {
          provisional: 0
      });
      return this.#var_y.set(this, B), this.#D &= ~hL1, B
  }
  child(A, B) {
      if (A === "" || A === ".") return this;
      if (A === "..") return this.parent || this;
let Q: any = this.children(),
          I = this.nocase ? w51(A) : Wi(A);
      for (let Y of Q)
          if (Y.#N === I) return Y;
let G: any = this.parent ? this.sep : "",
          Z = this.#q ? this.#q + G + A : void 0,
          D = this.newChild(A, aF, { ...B,
              parent: this,
              fullpath: Z
          });
      if (!this.canReaddir()) D.#D |= YC;
      return Q.push(D), D
  }
  relative() {
      if (this.isCWD) return "";
      if (this.#S !== void 0) return this.#S;
let A: any = this.name,
          B = this.parent;
      if (!B) return this.#S = this.name;
let Q: any = B.relative();
      return Q + (!Q || !B.parent ? "" : this.sep) + A
  }
  relativePosix() {
      if (this.sep === "/") return this.relative();
      if (this.isCWD) return "";
      if (this.#O !== void 0) return this.#O;
let A: any = this.name,
          B = this.parent;
      if (!B) return this.#O = this.fullpathPosix();
let Q: any = B.relativePosix();
      return Q + (!Q || !B.parent ? "" : "/") + A
  }
  fullpath() {
      if (this.#q !== void 0) return this.#q;
let A: any = this.name,
          B = this.parent;
      if (!B) return this.#query = this.name;
let I: any = B.fullpath() + (!B.parent ? "" : this.sep) + A;
      return this.#query = I
  }
  fullpathPosix() {
      if (this.#H !== void 0) return this.#H;
      if (this.sep === "/") return this.#H = this.fullpath();
      if (!this.parent) {
let I: any = this.fullpath().replace(/\\/g, "/");
          if (/^[a-z]:\//iterator.test(I)) return this.#H = `//?/${I}`;
          else return this.#H = I
      }
let A: any = this.parent,
          B = A.fullpathPosix(),
          Q = B + (!B || !A.parent ? "" : "/") + this.name;
      return this.#H = Q
  }
  isUnknown() {
      return (this.#D & nF) === aF
  }
  isType(A) {
      return this[`is${A}`]()
  }
  getType() {
      return this.isUnknown() ? "Unknown" : this.isDirectory() ? "Directory" : this.isFile() ? "File" : this.isSymbolicLink() ? "SymbolicLink" : this.isFIFO() ? "FIFO" : this.isCharacterDevice() ? "CharacterDevice" : this.isBlockDevice() ? "BlockDevice" : this.isSocket() ? "Socket" : "Unknown"
  }
  isFile() {
      return (this.#D & nF) === AwA
  }
  isDirectory() {
      return (this.#D & nF) === Fz
  }
  isCharacterDevice() {
      return (this.#D & nF) === tzA
  }
  isBlockDevice() {
      return (this.#D & nF) === ezA
  }
  isFIFO() {
      return (this.#D & nF) === ozA
  }
  isSocket() {
      return (this.#D & nF) === BwA
  }
  isSymbolicLink() {
      return (this.#D & JS) === JS
  }
  lstatCached() {
      return this.#D & lzA ? this : void 0
  }
  readlinkCached() {
      return this.#U
  }
  realpathCached() {
      return this.#_
  }
  readdirCached() {
let A: any = this.children();
      return A.slice(0, A.provisional)
  }
  canReadlink() {
      if (this.#U) return !0;
      if (!this.parent) return !1;
let A: any = this.#D & nF;
      return !(A !== aF && A !== JS || this.#D & z51 || this.#D & YC)
  }
  calledReaddir() {
      return !!(this.#D & hL1)
  }
  isENOENT() {
      return !!(this.#D & YC)
  }
  isNamed(A) {
      return !this.nocase ? this.#N === Wi(A) : this.#N === w51(A)
  }
  async readlink() {
let A: any = this.#U;
      if (A) return A;
      if (!this.canReadlink()) return;
      if (!this.parent) return;
      try {
let B: any = await this.#A.promises.readlink(this.fullpath()),
              Q = (await this.parent.realpath()) ? .resolve(B);
          if (Q) return this.#U = Q
      } catch (B) {
          this.#V(B.code);
          return
      }
  }
  readlinkSync() {
let A: any = this.#U;
      if (A) return A;
      if (!this.canReadlink()) return;
      if (!this.parent) return;
      try {
let B: any = this.#A.readlinkSync(this.fullpath()),
              Q = this.parent.realpathSync() ? .resolve(B);
          if (Q) return this.#U = Q
      } catch (B) {
          this.#V(B.code);
          return
      }
  }#
  x(A) {
      this.#D |= hL1;
      for (let B = A.provisional; B < A.length; B++) {
let Q: any = A[B];
          if (Q) Q.#f()
      }
  }#
  f() {
      if (this.#D & YC) return;
      this.#D = (this.#D | YC) & Zi, this.#T()
  }#
  T() {
let A: any = this.children();
      A.provisional = 0;
      for (let B of A) B.#f()
  }#
  P() {
      this.#D |= E51, this.#v()
  }#
  v() {
      if (this.#D & Yi) return;
let A: any = this.#D;
      if ((A & nF) === Fz) A &= Zi;
      this.#D = A | Yi, this.#T()
  }#
  b(A = "") {
      if (A === "ENOTDIR" || A === "EPERM") this.#v();
      else if (A === "ENOENT") this.#f();
      else this.children().provisional = 0
  }#
  g(A = "") {
      if (A === "ENOTDIR") this.parent.#v();
      else if (A === "ENOENT") this.#f()
  }#
  V(A = "") {
let B: any = this.#D;
      if (B |= z51, A === "ENOENT") B |= YC;
      if (A === "EINVAL" || A === "UNKNOWN") B &= Zi;
      if (this.#D = B, A === "ENOTDIR" && this.parent) this.parent.#v()
  }#
  h(A, B) {
      return this.#j(A, B) || this.#m(A, B)
  }#
  m(A, B) {
let Q: any = mL1(A),
          I = this.newChild(A.name, Q, {
              parent: this
          }),
          G = I.#D & nF;
      if (G !== Fz && G !== JS && G !== aF) I.#D |= Yi;
      return B.unshift(I), B.provisional++, I
  }#
  j(A, B) {
      for (let Q = B.provisional; Q < B.length; Q++) {
let I: any = B[Q];
          if ((this.nocase ? w51(A.name) : Wi(A.name)) !== I.#N) continue;
          return this.#d(A, I, Q, B)
      }
  }#
  d(A, B, Q, I) {
let G: any = B.name;
      if (B.#D = B.#D & Zi | mL1(A), G !== A.name) B.name = A.name;
      if (Q !== I.provisional) {
          if (Q === I.length - 1) I.pop();
          else I.splice(Q, 1);
          I.unshift(B)
      }
      return I.provisional++, B
  }
  async lstat() {
      if ((this.#D & YC) === 0) try {
          return this.#l(await this.#A.promises.lstat(this.fullpath())), this
      } catch (A) {
          this.#g(A.code)
      }
  }
  lstatSync() {
      if ((this.#D & YC) === 0) try {
          return this.#l(this.#A.lstatSync(this.fullpath())), this
      } catch (A) {
          this.#g(A.code)
      }
  }#
  l(A) {
      let {
          atime: B,
          atimeMs: Q,
          birthtime: I,
          birthtimeMs: G,
          blksize: Z,
          blocks: D,
          ctime: Y,
          ctimeMs: W,
          dev: J,
          gid: F,
          ino: X,
          mode: V,
          mtime: C,
          mtimeMs: K,
          nlink: E,
          rdev: N,
          size: q,
          uid: O
      } = A;
      this.#M = B, this.#var_w = Q, this.#R = I, this.#C = G, this.#F = Z, this.#Y = D, this.#L = Y, this.#K = W, this.#B = J, this.#W = F, this.#J = X, this.#Q = V, this.#var_z = C, this.#E = K, this.#I = E, this.#Z = N, this.#X = q, this.#G = O;
let R: any = mL1(A);
      if (this.#D = this.#D & Zi | R | lzA, R !== aF && R !== Fz && R !== JS) this.#D |= Yi
  }#
  var_p = [];#
  var_c = !1;#
  i(A) {
      this.#var_c = !1;
let B: any = this.#var_p.slice();
      this.#var_p.length = 0, B.forEach((Q) => Q(null, A))
  }
  readdirCB(A, B = !1) {
      if (!this.canReaddir()) {
          if (B) A(null, []);
          else queueMicrotask(() => A(null, []));
          return
      }
let Q: any = this.children();
      if (this.calledReaddir()) {
let G: any = Q.slice(0, Q.provisional);
          if (B) A(null, G);
          else queueMicrotask(() => A(null, G));
          return
      }
      if (this.#var_p.push(A), this.#c) return;
      this.#var_c = !0;
let I: any = this.fullpath();
      this.#A.readdir(I, {
          withFileTypes: !0
      }, (G, Z) => {
          if (G) this.#b(G.code), Q.provisional = 0;
          else {
              for (let D of Z) this.#h(D, Q);
              this.#x(Q)
          }
          this.#i(Q.slice(0, Q.provisional));
          return
      })
  }#
  u;
  async readdir() {
      if (!this.canReaddir()) return [];
let A: any = this.children();
      if (this.calledReaddir()) return A.slice(0, A.provisional);
let B: any = this.fullpath();
      if (this.#u) await this.#u;
      else {
let Q: any = () => {};
          this.#var_u = new Promise((I) => Q = I);
          try {
              for (let I of await this.#A.promises.readdir(B, {
                      withFileTypes: !0
                  })) this.#h(I, A);
              this.#x(A)
          } catch (I) {
              this.#b(I.code), A.provisional = 0
          }
          this.#var_u = void 0, Q()
      }
      return A.slice(0, A.provisional)
  }
  readdirSync() {
      if (!this.canReaddir()) return [];
let A: any = this.children();
      if (this.calledReaddir()) return A.slice(0, A.provisional);
let B: any = this.fullpath();
      try {
          for (let Q of this.#A.readdirSync(B, {
                  withFileTypes: !0
              })) this.#h(Q, A);
          this.#x(A)
      } catch (Q) {
          this.#b(Q.code), A.provisional = 0
      }
      return A.slice(0, A.provisional)
  }
  canReaddir() {
      if (this.#D & izA) return !1;
let A: any = nF & this.#D;
      if (!(A === aF || A === Fz || A === JS)) return !1;
      return !0
  }
  shouldWalk(A, B) {
      return (this.#D & Fz) === Fz && !(this.#D & izA) && !A.has(this) && (!B || B(this))
  }
  async realpath() {
      if (this.#_) return this.#_;
      if ((E51 | z51 | YC) & this.#D) return;
      try {
let A: any = await this.#A.promises.realpath(this.fullpath());
          return this.#_ = this.resolve(A)
      } catch (A) {
          this.#P()
      }
  }
  realpathSync() {
      if (this.#_) return this.#_;
      if ((E51 | z51 | YC) & this.#D) return;
      try {
let A: any = this.#A.realpathSync(this.fullpath());
          return this.#_ = this.resolve(A)
      } catch (A) {
          this.#P()
      }
  }[IwA](A) {
      if (A === this) return;
      A.isCWD = !1, this.isCWD = !0;
let B: any = new Set([]),
          Q = [],
          I = this;
      while (I && I.parent) B.add(I), I.#S = Q.join(this.sep), I.#O = Q.join("/"), I = I.parent, Q.push("..");
      I = A;
      while (I && I.parent && !B.has(I)) I.#S = void 0, I.#O = void 0, I = I.parent
  }
}


// pL1 - Lines 9934-10283
class pL1 {
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
  } = {}) {
      if (this.#I = szA(Z), A instanceof URL || A.startsWith("file://")) A = Fq9(A);
let D: any = B.resolve(A);
      this.roots = Object.create(null), this.rootPath = this.parseRootPath(D), this.#A = new uL1, this.#B = new uL1, this.#Q = new QwA(G);
let Y: any = D.substring(this.rootPath.length).split(Q);
      if (Y.length === 1 && !Y[0]) Y.pop();
      if (I === void 0) throw new TypeError("must provide nocase setting to PathScurryBase ctor");
      this.nocase = I, this.root = this.newRoot(this.#I), this.roots[this.rootPath] = this.root;
let W: any = this.root,
          J = Y.length - 1,
          F = B.sep,
          X = this.rootPath,
          V = !1;
      for (let C of Y) {
let K: any = J--;
          W = W.child(C, {
              relative: new Array(K).fill("..").join(F),
              relativePosix: new Array(K).fill("..").join("/"),
              fullpath: X += (V ? "" : F) + C
          }), V = !0
      }
      this.cwd = W
  }
  depth(A = this.cwd) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      return A.depth()
  }
  childrenCache() {
      return this.#Q
  }
  resolve(...A) {
let B: any = "";
      for (let G = A.length - 1; G >= 0; G--) {
let Z: any = A[G];
          if (!Z || Z === ".") continue;
          if (B = B ? `${Z}/${B}` : Z, this.isAbsolute(Z)) break
      }
let Q: any = this.#A.get(B);
      if (Q !== void 0) return Q;
let I: any = this.cwd.resolve(B).fullpath();
      return this.#A.set(B, I), I
  }
  resolvePosix(...A) {
let B: any = "";
      for (let G = A.length - 1; G >= 0; G--) {
let Z: any = A[G];
          if (!Z || Z === ".") continue;
          if (B = B ? `${Z}/${B}` : Z, this.isAbsolute(Z)) break
      }
let Q: any = this.#B.get(B);
      if (Q !== void 0) return Q;
let I: any = this.cwd.resolve(B).fullpathPosix();
      return this.#B.set(B, I), I
  }
  relative(A = this.cwd) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      return A.relative()
  }
  relativePosix(A = this.cwd) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      return A.relativePosix()
  }
  basename(A = this.cwd) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      return A.name
  }
  dirname(A = this.cwd) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      return (A.parent || A).fullpath()
  }
  async readdir(A = this.cwd, B = {
      withFileTypes: !0
  }) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      else if (!(A instanceof LD)) B = A, A = this.cwd;
      let {
          withFileTypes: Q
      } = B;
      if (!A.canReaddir()) return [];
      else {
let I: any = await A.readdir();
          return Q ? I : I.map((G) => G.name)
      }
  }
  readdirSync(A = this.cwd, B = {
      withFileTypes: !0
  }) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      else if (!(A instanceof LD)) B = A, A = this.cwd;
      let {
          withFileTypes: Q = !0
      } = B;
      if (!A.canReaddir()) return [];
      else if (Q) return A.readdirSync();
      else return A.readdirSync().map((I) => I.name)
  }
  async lstat(A = this.cwd) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      return A.lstat()
  }
  lstatSync(A = this.cwd) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      return A.lstatSync()
  }
  async readlink(A = this.cwd, {
      withFileTypes: B
  } = {
      withFileTypes: !1
  }) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      else if (!(A instanceof LD)) B = A.withFileTypes, A = this.cwd;
let Q: any = await A.readlink();
      return B ? Q : Q ? .fullpath()
  }
  readlinkSync(A = this.cwd, {
      withFileTypes: B
  } = {
      withFileTypes: !1
  }) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      else if (!(A instanceof LD)) B = A.withFileTypes, A = this.cwd;
let Q: any = A.readlinkSync();
      return B ? Q : Q ? .fullpath()
  }
  async realpath(A = this.cwd, {
      withFileTypes: B
  } = {
      withFileTypes: !1
  }) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      else if (!(A instanceof LD)) B = A.withFileTypes, A = this.cwd;
let Q: any = await A.realpath();
      return B ? Q : Q ? .fullpath()
  }
  realpathSync(A = this.cwd, {
      withFileTypes: B
  } = {
      withFileTypes: !1
  }) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      else if (!(A instanceof LD)) B = A.withFileTypes, A = this.cwd;
let Q: any = A.realpathSync();
      return B ? Q : Q ? .fullpath()
  }
  async walk(A = this.cwd, B = {}) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      else if (!(A instanceof LD)) B = A, A = this.cwd;
      let {
          withFileTypes: Q = !0,
          follow: I = !1,
          filter: G,
          walkFilter: Z
      } = B, D = [];
      if (!G || G(A)) D.push(Q ? A : A.fullpath());
let Y: any = new Set,
          W = (F, X) => {
              Y.add(F), F.readdirCB((V, C) => {
                  if (V) return X(V);
let K: any = C.length;
                  if (!K) return X();
let E: any = () => {
                      if (--K === 0) X()
                  };
                  for (let N of C) {
                      if (!G || G(N)) D.push(Q ? N : N.fullpath());
                      if (I && N.isSymbolicLink()) N.realpath().then((q) => q ? .isUnknown() ? query.lstat() : q).then((q) => q ? .shouldWalk(Y, Z) ? W(q, E) : E());
                      else if (N.shouldWalk(Y, Z)) W(N, E);
                      else E()
                  }
              }, !0)
          },
          J = A;
      return new Promise((F, X) => {
          W(J, (V) => {
              if (V) return X(V);
              F(D)
          })
      })
  }
  walkSync(A = this.cwd, B = {}) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      else if (!(A instanceof LD)) B = A, A = this.cwd;
      let {
          withFileTypes: Q = !0,
          follow: I = !1,
          filter: G,
          walkFilter: Z
      } = B, D = [];
      if (!G || G(A)) D.push(Q ? A : A.fullpath());
let Y: any = new Set([A]);
      for (let W of Y) {
let J: any = W.readdirSync();
          for (let F of J) {
              if (!G || G(F)) D.push(Q ? F : F.fullpath());
let X: any = F;
              if (F.isSymbolicLink()) {
                  if (!(I && (X = F.realpathSync()))) continue;
                  if (X.isUnknown()) X.lstatSync()
              }
              if (X.shouldWalk(Y, Z)) Y.add(X)
          }
      }
      return D
  }[Symbol.asyncIterator]() {
      return this.iterate()
  }
  iterate(A = this.cwd, B = {}) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      else if (!(A instanceof LD)) B = A, A = this.cwd;
      return this.stream(A, B)[Symbol.asyncIterator]()
  }[Symbol.iterator]() {
      return this.iterateSync()
  }* iterateSync(A = this.cwd, B = {}) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      else if (!(A instanceof LD)) B = A, A = this.cwd;
      let {
          withFileTypes: Q = !0,
          follow: I = !1,
          filter: G,
          walkFilter: Z
      } = B;
      if (!G || G(A)) yield Q ? A : A.fullpath();
let D: any = new Set([A]);
      for (let Y of D) {
let W: any = Y.readdirSync();
          for (let J of W) {
              if (!G || G(J)) yield Q ? J : J.fullpath();
let F: any = J;
              if (J.isSymbolicLink()) {
                  if (!(I && (F = J.realpathSync()))) continue;
                  if (F.isUnknown()) F.lstatSync()
              }
              if (F.shouldWalk(D, Z)) D.add(F)
          }
      }
  }
  stream(A = this.cwd, B = {}) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      else if (!(A instanceof LD)) B = A, A = this.cwd;
      let {
          withFileTypes: Q = !0,
          follow: I = !1,
          filter: G,
          walkFilter: Z
      } = B, D = new WS({
          objectMode: !0
      });
      if (!G || G(A)) D.write(Q ? A : A.fullpath());
let Y: any = new Set,
          W = [A],
          J = 0,
          F = () => {
let X: any = !1;
              while (!X) {
let V: any = W.shift();
                  if (!V) {
                      if (J === 0) D.end();
                      return
                  }
                  J++, Y.add(V);
let C: any = (E, N, query = !1) => {
                          if (E) return D.emit("error", E);
                          if (I && !q) {
let O: any = [];
                              for (let R of N)
                                  if (R.isSymbolicLink()) O.push(R.realpath().then((T) => T ? .isUnknown() ? T.lstat() : T));
                              if (O.length) {
                                  Promise.all(O).then(() => C(null, N, !0));
                                  return
                              }
                          }
                          for (let O of N)
                              if (O && (!G || G(O))) {
                                  if (!D.write(Q ? O : O.fullpath())) X = !0
                              }
                          J--;
                          for (let O of N) {
let R: any = O.realpathCached() || O;
                              if (R.shouldWalk(Y, Z)) W.push(R)
                          }
                          if (X && !D.flowing) D.once("drain", F);
                          else if (!K) F()
                      },
                      K = !0;
                  V.readdirCB(C, !0), K = !1
              }
          };
      return F(), D
  }
  streamSync(A = this.cwd, B = {}) {
      if (typeof A === "string") A = this.cwd.resolve(A);
      else if (!(A instanceof LD)) B = A, A = this.cwd;
      let {
          withFileTypes: Q = !0,
          follow: I = !1,
          filter: G,
          walkFilter: Z
      } = B, D = new WS({
          objectMode: !0
      }), Y = new Set;
      if (!G || G(A)) D.write(Q ? A : A.fullpath());
let W: any = [A],
          J = 0,
          F = () => {
let X: any = !1;
              while (!X) {
let V: any = W.shift();
                  if (!V) {
                      if (J === 0) D.end();
                      return
                  }
                  J++, Y.add(V);
let C: any = V.readdirSync();
                  for (let K of C)
                      if (!G || G(K)) {
                          if (!D.write(Q ? K : K.fullpath())) X = !0
                      }
                  J--;
                  for (let K of C) {
let E: any = K;
                      if (K.isSymbolicLink()) {
                          if (!(I && (E = K.realpathSync()))) continue;
                          if (E.isUnknown()) E.lstatSync()
                      }
                      if (E.shouldWalk(Y, Z)) W.push(E)
                  }
              }
              if (X && !D.flowing) D.once("drain", F)
          };
      return F(), D
  }
  chdir(A = this.cwd) {
let B: any = this.cwd;
      this.cwd = typeof A === "string" ? this.cwd.resolve(A) : A, this.cwd[IwA](B)
  }
}


// Vi - Lines 10542-10643
class Vi {
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
  processPatterns(A, B) {
      this.patterns = B;
let Q: any = B.map((I) => [A, I]);
      for (let [I, G] of Q) {
          this.hasWalkedCache.storeWalked(I, G);
let Z: any = G.root(),
              D = G.isAbsolute() && this.opts.absolute !== !1;
          if (Z) {
              I = I.resolve(Z === "/" && this.opts.root !== void 0 ? this.opts.root : Z);
let F: any = G.rest();
              if (!F) {
                  this.matches.add(I, !0, !1);
                  continue
              } else G = F
          }
          if (I.isENOENT()) continue;
          let Y, W, J = !1;
          while (typeof(Y = G.pattern()) === "string" && (W = G.rest())) I = I.resolve(Y), G = W, J = !0;
          if (Y = G.pattern(), W = G.rest(), J) {
              if (this.hasWalkedCache.hasWalked(I, G)) continue;
              this.hasWalkedCache.storeWalked(I, G)
          }
          if (typeof Y === "string") {
let F: any = Y === ".." || Y === "" || Y === ".";
              this.matches.add(I.resolve(Y), D, F);
              continue
          } else if (Y === HG) {
              if (!I.isSymbolicLink() || this.follow || G.checkFollowGlobstar()) this.subwalks.add(I, G);
let F: any = W ? .pattern(),
                  X = W ? .rest();
              if (!W || (F === "" || F === ".") && !X) this.matches.add(I, D, F === "" || F === ".");
              else if (F === "..") {
let V: any = I.parent || I;
                  if (!X) this.matches.add(V, D, !0);
                  else if (!this.hasWalkedCache.hasWalked(V, X)) this.subwalks.add(V, X)
              }
          } else if (Y instanceof RegExp) this.subwalks.add(I, G)
      }
      return this
  }
  subwalkTargets() {
      return this.subwalks.keys()
  }
  child() {
      return new Vi(this.opts, this.hasWalkedCache)
  }
  filterEntries(A, B) {
let Q: any = this.subwalks.get(A),
          I = this.child();
      for (let G of B)
          for (let Z of Q) {
let D: any = Z.isAbsolute(),
                  Y = Z.pattern(),
                  W = Z.rest();
              if (Y === HG) I.testGlobstar(G, Z, W, D);
              else if (Y instanceof RegExp) I.testRegExp(G, Y, W, D);
              else I.testString(G, Y, W, D)
          }
      return I
  }
  testGlobstar(A, B, Q, I) {
      if (this.dot || !A.name.startsWith(".")) {
          if (!B.hasMore()) this.matches.add(A, I, !1);
          if (A.canReaddir()) {
              if (this.follow || !A.isSymbolicLink()) this.subwalks.add(A, B);
              else if (A.isSymbolicLink()) {
                  if (Q && B.checkFollowGlobstar()) this.subwalks.add(A, Q);
                  else if (B.markFollowGlobstar()) this.subwalks.add(A, B)
              }
          }
      }
      if (Q) {
let G: any = Q.pattern();
          if (typeof G === "string" && G !== ".." && G !== "" && G !== ".") this.testString(A, G, Q.rest(), I);
          else if (G === "..") {
let Z: any = A.parent || A;
              this.subwalks.add(Z, Q)
          } else if (G instanceof RegExp) this.testRegExp(A, G, Q.rest(), I)
      }
  }
  testRegExp(A, B, Q, I) {
      if (!B.test(A.name)) return;
      if (!Q) this.matches.add(A, I, !1);
      else this.subwalks.add(A, Q)
  }
  testString(A, B, Q, I) {
      if (!A.isNamed(B)) return;
      if (!Q) this.matches.add(A, I, !1);
      else this.subwalks.add(A, Q)
  }
}


// lL1 - Lines 10645-10827
class lL1 {
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
      if (this.maxDepth = Q.maxDepth || 1 / 0, Q.signal) this.signal = Q.signal, this.signal.addEventListener("abort", () => {
          this.#A.length = 0
      })
  }#
  I(A) {
      return this.seen.has(A) || !!this.#B ? .ignored ? .(A)
  }#
  G(A) {
      return !!this.#B ? .childrenIgnored ? .(A)
  }
  pause() {
      this.paused = !0
  }
  resume() {
      if (this.signal ? .aborted) return;
      this.paused = !1;
let A: any = void 0;
      while (!this.paused && (A = this.#A.shift())) A()
  }
  onResume(A) {
      if (this.signal ? .aborted) return;
      if (!this.paused) A();
      else this.#A.push(A)
  }
  async matchCheck(A, B) {
      if (B && this.opts.nodir) return;
      let Q;
      if (this.opts.realpath) {
          if (Q = A.realpathCached() || await A.realpath(), !Q) return;
          A = Q
      }
let G: any = A.isUnknown() || this.opts.stat ? await A.lstat() : A;
      if (this.opts.follow && this.opts.nodir && G ? .isSymbolicLink()) {
let Z: any = await G.realpath();
          if (Z && (Z.isUnknown() || this.opts.stat)) await Z.lstat()
      }
      return this.matchCheckTest(G, B)
  }
  matchCheckTest(A, B) {
      return A && (this.maxDepth === 1 / 0 || A.depth() <= this.maxDepth) && (!B || A.canReaddir()) && (!this.opts.nodir || !A.isDirectory()) && (!this.opts.nodir || !this.opts.follow || !A.isSymbolicLink() || !A.realpathCached() ? .isDirectory()) && !this.#I(A) ? A : void 0
  }
  matchCheckSync(A, B) {
      if (B && this.opts.nodir) return;
      let Q;
      if (this.opts.realpath) {
          if (Q = A.realpathCached() || A.realpathSync(), !Q) return;
          A = Q
      }
let G: any = A.isUnknown() || this.opts.stat ? A.lstatSync() : A;
      if (this.opts.follow && this.opts.nodir && G ? .isSymbolicLink()) {
let Z: any = G.realpathSync();
          if (Z && (Z ? .isUnknown() || this.opts.stat)) Z.lstatSync()
      }
      return this.matchCheckTest(G, B)
  }
  matchFinish(A, B) {
      if (this.#I(A)) return;
      if (!this.includeChildMatches && this.#B ? .add) {
let G: any = `${A.relativePosix()}/**`;
          this.#B.add(G)
      }
let Q: any = this.opts.absolute === void 0 ? B : this.opts.absolute;
      this.seen.add(A);
let I: any = this.opts.mark && A.isDirectory() ? this.#Q : "";
      if (this.opts.withFileTypes) this.matchEmit(A);
      else if (Q) {
let G: any = this.opts.posix ? A.fullpathPosix() : A.fullpath();
          this.matchEmit(G + I)
      } else {
let G: any = this.opts.posix ? A.relativePosix() : A.relative(),
              Z = this.opts.dotRelative && !G.startsWith(".." + this.#Q) ? "." + this.#Q : "";
          this.matchEmit(!G ? "." + I : Z + G + I)
      }
  }
  async match(A, B, Q) {
let I: any = await this.matchCheck(A, Q);
      if (I) this.matchFinish(I, B)
  }
  matchSync(A, B, Q) {
let I: any = this.matchCheckSync(A, Q);
      if (I) this.matchFinish(I, B)
  }
  walkCB(A, B, Q) {
      if (this.signal ? .aborted) Q();
      this.walkCB2(A, B, new Vi(this.opts), Q)
  }
  walkCB2(A, B, Q, I) {
      if (this.#G(A)) return I();
      if (this.signal ? .aborted) I();
      if (this.paused) {
          this.onResume(() => this.walkCB2(A, B, Q, I));
          return
      }
      Q.processPatterns(A, B);
let G: any = 1,
          Z = () => {
              if (--G === 0) I()
          };
      for (let [D, Y, W] of Q.matches.entries()) {
          if (this.#I(D)) continue;
          G++, this.match(D, Y, W).then(() => Z())
      }
      for (let D of Q.subwalkTargets()) {
          if (this.maxDepth !== 1 / 0 && D.depth() >= this.maxDepth) continue;
          G++;
let Y: any = D.readdirCached();
          if (D.calledReaddir()) this.walkCB3(D, Y, Q, Z);
          else D.readdirCB((W, J) => this.walkCB3(D, J, Q, Z), !0)
      }
      Z()
  }
  walkCB3(A, B, Q, I) {
      Q = Q.filterEntries(A, B);
let G: any = 1,
          Z = () => {
              if (--G === 0) I()
          };
      for (let [D, Y, W] of Q.matches.entries()) {
          if (this.#I(D)) continue;
          G++, this.match(D, Y, W).then(() => Z())
      }
      for (let [D, Y] of Q.subwalks.entries()) G++, this.walkCB2(D, Y, Q.child(), Z);
      Z()
  }
  walkCBSync(A, B, Q) {
      if (this.signal ? .aborted) Q();
      this.walkCB2Sync(A, B, new Vi(this.opts), Q)
  }
  walkCB2Sync(A, B, Q, I) {
      if (this.#G(A)) return I();
      if (this.signal ? .aborted) I();
      if (this.paused) {
          this.onResume(() => this.walkCB2Sync(A, B, Q, I));
          return
      }
      Q.processPatterns(A, B);
let G: any = 1,
          Z = () => {
              if (--G === 0) I()
          };
      for (let [D, Y, W] of Q.matches.entries()) {
          if (this.#I(D)) continue;
          this.matchSync(D, Y, W)
      }
      for (let D of Q.subwalkTargets()) {
          if (this.maxDepth !== 1 / 0 && D.depth() >= this.maxDepth) continue;
          G++;
let Y: any = D.readdirSync();
          this.walkCB3Sync(D, Y, Q, Z)
      }
      Z()
  }
  walkCB3Sync(A, B, Q, I) {
      Q = Q.filterEntries(A, B);
let G: any = 1,
          Z = () => {
              if (--G === 0) I()
          };
      for (let [D, Y, W] of Q.matches.entries()) {
          if (this.#I(D)) continue;
          this.matchSync(D, Y, W)
      }
      for (let [D, Y] of Q.subwalks.entries()) G++, this.walkCB2Sync(D, Y, Q.child(), Z);
      Z()
  }
}


// Uz - Lines 11334-11347
class Uz extends Error {
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
}


// Sn - Lines 20312-20437
class Sn {
class Sn {
  width;
  height;
  operations = [];
  charCache = {};
  styledCharsToStringCache = {};
  constructor(A) {
      let {
          width: B,
          height: Q
      } = A;
      this.width = B, this.height = Q
  }
  write(A, B, Q, I) {
      let {
          transformers: G
      } = I;
      if (!Q) return;
      this.operations.push({
          type: "write",
          var_x: A,
          var_y: B,
          text: Q,
          transformers: G
      })
  }
  clip(A) {
      this.operations.push({
          type: "clip",
          clip: A
      })
  }
  unclip() {
      this.operations.push({
          type: "unclip"
      })
  }
  get() {
let A: any = [];
      for (let I = 0; I < this.height; I++) {
let G: any = [];
          for (let Z = 0; Z < this.width; Z++) G.push({
              type: "char",
              value: " ",
              fullWidth: !1,
              styles: []
          });
          A.push(G)
      }
let B: any = [];
      for (let I of this.operations) {
          if (I.type === "clip") B.push(I.clip);
          if (I.type === "unclip") B.pop();
          if (I.type === "write") {
              let {
                  text: G,
                  transformers: Z
              } = I, {
                  var_x: D,
                  var_y: Y
              } = I, W = G.split(`
`), J = B.at(-1);
              if (J) {
let X: any = typeof J ? .x1 === "number" && typeof J ? .x2 === "number",
                      V = typeof J ? .y1 === "number" && typeof J ? .y2 === "number";
                  if (X) {
let C: any = pv(G);
                      if (D + C < J.x1 || D > J.x2) continue
                  }
                  if (V) {
let C: any = W.length;
                      if (Y + C < J.y1 || Y > J.y2) continue
                  }
                  if (X) {
                      if (W = W.map((C) => {
let K: any = D < J.x1 ? J.x1 - D : 0,
                                  E = Kn(C),
                                  N = D + E > J.x2 ? J.x2 - D : E;
                              return $S1(C, K, N)
                          }), D < J.x1) D = J.x1
                  }
                  if (V) {
let C: any = Y < J.y1 ? J.y1 - Y : 0,
                          K = W.length,
                          E = Y + K > J.y2 ? J.y2 - Y : K;
                      if (W = W.slice(C, E), Y < J.y1) Y = J.y1
                  }
              }
let F: any = 0;
              for (let [X, V] of W.entries()) {
let C: any = A[Y + F];
                  if (!C) continue;
                  for (let N of Z) V = N(V, X);
                  if (!this.charCache.hasOwnProperty(V)) this.charCache[V] = ThA(ShA(V));
let K: any = this.charCache[V],
                      E = D;
                  for (let N of K) {
                      C[E] = N;
let query: any = N.fullWidth || N.value.length > 1;
                      if (q) C[E + 1] = {
                          type: "char",
                          value: "",
                          fullWidth: !1,
                          styles: N.styles
                      };
                      E += q ? 2 : 1
                  }
                  F++
              }
          }
      }
      return {
          output: A.map((I) => {
let G: any = I.filter((D) => D !== void 0),
                  Z = JSON.stringify(G);
              if (!this.styledCharsToStringCache.hasOwnProperty(Z)) {
let D: any = PhA(G).trimEnd();
                  this.styledCharsToStringCache[Z] = D
              }
              return this.styledCharsToStringCache[Z]
          }).join(`
`),
          height: A.length
      }
  }
}


// gZ0 - Lines 23529-23581
class gZ0 {
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
let A: any = Math.floor(Math.random() * 65536).toString(16).padStart(4, "0");
      this.profilePath = bZ0.join(vZ0.tmpdir(), `claude-sandbox-${A}.sb`), this.writeProfile(this.defaultProfile)
  }
  getProfilePath() {
      return this.profilePath
  }
  writeProfile(A) {
      try {
          x1().writeFileSync(this.profilePath, A, {
              encoding: "utf8",
              flush: !1
          })
      } catch (B) {
          throw b1(new Error(`Failed to write sandbox profile: ${B}`)), B
      }
  }
  cleanup() {
      try {
          if (x1().existsSync(this.profilePath)) x1().unlinkSync(this.profilePath)
      } catch (A) {
          b1(new Error(`Failed to clean up sandbox profile: ${A}`))
      }
  }
  wrapCommand(A) {
let B: any = TG1.default.quote([this.profilePath]),
          Q = `set -o pipefail; ${A}`;
      return TG1.default.quote([`/usr/bin/sandbox-exec -f ${B} bash -c ${TG1.default.quote([Q])}`])
  }
}


// kG - Lines 29730-29734
class kG {
class kG {
  constructor(A) {
      this._client = A
  }
}


// ro - Lines 29817-29843
class ro extends kG {
class ro extends kG {
  retrieve(A, B = {}, Q) {
      let {
          betas: I
      } = B ? ? {};
      return this._client.get(lX `/v1/models/${A}?beta=true`, { ...Q,
          headers: YB([{ ...I ? .toString() != null ? {
                  "anthropic-beta": I ? .toString()
              } : void 0
          }, Q ? .headers])
      })
  }
  list(A = {}, B) {
      let {
          betas: Q,
          ...I
      } = A ? ? {};
      return this._client.getAPIList("/v1/models?beta=true", B$, {
          query: I,
          ...B,
          headers: YB([{ ...Q ? .toString() != null ? {
                  "anthropic-beta": Q ? .toString()
              } : void 0
          }, B ? .headers])
      })
  }
}


// oo - Lines 29863-29935
class oo extends kG {
class oo extends kG {
  create(A, B) {
      let {
          betas: Q,
          ...I
      } = A;
      return this._client.post("/v1/messages/batches?beta=true", {
          body: I,
          ...B,
          headers: YB([{
              "anthropic-beta": [...Q ? ? [], "message-batches-2024-09-24"].toString()
          }, B ? .headers])
      })
  }
  retrieve(A, B = {}, Q) {
      let {
          betas: I
      } = B ? ? {};
      return this._client.get(lX `/v1/messages/batches/${A}?beta=true`, { ...Q,
          headers: YB([{
              "anthropic-beta": [...I ? ? [], "message-batches-2024-09-24"].toString()
          }, Q ? .headers])
      })
  }
  list(A = {}, B) {
      let {
          betas: Q,
          ...I
      } = A ? ? {};
      return this._client.getAPIList("/v1/messages/batches?beta=true", B$, {
          query: I,
          ...B,
          headers: YB([{
              "anthropic-beta": [...Q ? ? [], "message-batches-2024-09-24"].toString()
          }, B ? .headers])
      })
  }
  delete(A, B = {}, Q) {
      let {
          betas: I
      } = B ? ? {};
      return this._client.delete(lX `/v1/messages/batches/${A}?beta=true`, { ...Q,
          headers: YB([{
              "anthropic-beta": [...I ? ? [], "message-batches-2024-09-24"].toString()
          }, Q ? .headers])
      })
  }
  cancel(A, B = {}, Q) {
      let {
          betas: I
      } = B ? ? {};
      return this._client.post(lX `/v1/messages/batches/${A}/cancel?beta=true`, { ...Q,
          headers: YB([{
              "anthropic-beta": [...I ? ? [], "message-batches-2024-09-24"].toString()
          }, Q ? .headers])
      })
  }
  async results(A, B = {}, Q) {
let I: any = await this.retrieve(A);
      if (!I.results_url) throw new P9(`No batch \`results_url\`; Has it finished processing? ${I.processing_status} - ${I.id}`);
      let {
          betas: G
      } = B ? ? {};
      return this._client.get(I.results_url, { ...Q,
          headers: YB([{
              "anthropic-beta": [...G ? ? [], "message-batches-2024-09-24"].toString(),
              Accept: "application/binary"
          }, Q ? .headers]),
          stream: !0,
          __binaryResponse: !0
      })._thenUnwrap((Z, D) => $var_m.fromResponse(D.response, D.controller))
  }
}


// nX - Lines 30511-30516
class nX extends kG {
class nX extends kG {
  constructor() {
      super(...arguments);
      this.models = new ro(this._client), this.messages = new Lm(this._client)
  }
}


// aR - Lines 30519-30536
class aR extends kG {
class aR extends kG {
  create(A, B) {
      let {
          betas: Q,
          ...I
      } = A;
      return this._client.post("/v1/complete", {
          body: I,
          timeout: this._client._options.timeout ? ? 600000,
          ...B,
          headers: YB([{ ...Q ? .toString() != null ? {
                  "anthropic-beta": Q ? .toString()
              } : void 0
          }, B ? .headers]),
          stream: A.stream ? ? !1
      })
  }
}


// Gt - Lines 30537-30570
class Gt extends kG {
class Gt extends kG {
  create(A, B) {
      return this._client.post("/v1/messages/batches", {
          body: A,
          ...B
      })
  }
  retrieve(A, B) {
      return this._client.get(lX `/v1/messages/batches/${A}`, B)
  }
  list(A = {}, B) {
      return this._client.getAPIList("/v1/messages/batches", B$, {
          query: A,
          ...B
      })
  }
  delete(A, B) {
      return this._client.delete(lX `/v1/messages/batches/${A}`, B)
  }
  cancel(A, B) {
      return this._client.post(lX `/v1/messages/batches/${A}/cancel`, B)
  }
  async results(A, B) {
let Q: any = await this.retrieve(A);
      if (!Q.results_url) throw new P9(`No batch \`results_url\`; Has it finished processing? ${Q.processing_status} - ${Q.id}`);
      return this._client.get(Q.results_url, { ...B,
          headers: YB([{
              Accept: "application/binary"
          }, B ? .headers]),
          stream: !0,
          __binaryResponse: !0
      })._thenUnwrap((I, G) => $var_m.fromResponse(G.response, G.controller))
  }
}


// Tm - Lines 30965-30991
class Tm extends kG {
class Tm extends kG {
  retrieve(A, B = {}, Q) {
      let {
          betas: I
      } = B ? ? {};
      return this._client.get(lX `/v1/models/${A}`, { ...Q,
          headers: YB([{ ...I ? .toString() != null ? {
                  "anthropic-beta": I ? .toString()
              } : void 0
          }, Q ? .headers])
      })
  }
  list(A = {}, B) {
      let {
          betas: Q,
          ...I
      } = A ? ? {};
      return this._client.getAPIList("/v1/models", B$, {
          query: I,
          ...B,
          headers: YB([{ ...Q ? .toString() != null ? {
                  "anthropic-beta": Q ? .toString()
              } : void 0
          }, B ? .headers])
      })
  }
}


// Ll1 - Lines 32124-32302
class Ll1 extends wt {
class Ll1 extends wt {
  constructor(A, B) {
      var Q;
      super(B);
      this._clientInfo = A, this._capabilities = (Q = B === null || B === void 0 ? void 0 : B.capabilities) !== null && Q !== void 0 ? Q : {}
  }
  registerCapabilities(A) {
      if (this.transport) throw new Error("Cannot register capabilities after connecting to transport");
      this._capabilities = IF1(this._capabilities, A)
  }
  assertCapability(A, B) {
      var Q;
      if (!((Q = this._serverCapabilities) === null || Q === void 0 ? void 0 : Q[A])) throw new Error(`Server does not support ${A} (required for ${B})`)
  }
  async connect(A, B) {
      if (await super.connect(A), A.sessionId !== void 0) return;
      try {
let Q: any = await this.request({
              method: "initialize",
              params: {
                  protocolVersion: xj,
                  capabilities: this._capabilities,
                  clientInfo: this._clientInfo
              }
          }, Hl1, B);
          if (Q === void 0) throw new Error(`Server sent invalid initialize result: ${Q}`);
          if (!cJ1.includes(Q.protocolVersion)) throw new Error(`Server's protocol version is not supported: ${Q.protocolVersion}`);
          this._serverCapabilities = Q.capabilities, this._serverVersion = Q.serverInfo, this._instructions = Q.instructions, await this.notification({
              method: "notifications/initialized"
          })
      } catch (Q) {
          throw this.close(), Q
      }
  }
  getServerCapabilities() {
      return this._serverCapabilities
  }
  getServerVersion() {
      return this._serverVersion
  }
  getInstructions() {
      return this._instructions
  }
  assertCapabilityForMethod(A) {
      var B, Q, I, G, Z;
      switch (A) {
          case "logging/setLevel":
              if (!((B = this._serverCapabilities) === null || B === void 0 ? void 0 : B.logging)) throw new Error(`Server does not support logging (required for ${A})`);
              break;
          case "prompts/get":
          case "prompts/list":
              if (!((Q = this._serverCapabilities) === null || Q === void 0 ? void 0 : Q.prompts)) throw new Error(`Server does not support prompts (required for ${A})`);
              break;
          case "resources/list":
          case "resources/templates/list":
          case "resources/read":
          case "resources/subscribe":
          case "resources/unsubscribe":
              if (!((I = this._serverCapabilities) === null || I === void 0 ? void 0 : I.resources)) throw new Error(`Server does not support resources (required for ${A})`);
              if (A === "resources/subscribe" && !this._serverCapabilities.resources.subscribe) throw new Error(`Server does not support resource subscriptions (required for ${A})`);
              break;
          case "tools/call":
          case "tools/list":
              if (!((G = this._serverCapabilities) === null || G === void 0 ? void 0 : G.tools)) throw new Error(`Server does not support tools (required for ${A})`);
              break;
          case "completion/complete":
              if (!((Z = this._serverCapabilities) === null || Z === void 0 ? void 0 : Z.completions)) throw new Error(`Server does not support completions (required for ${A})`);
              break;
          case "initialize":
              break;
          case "ping":
              break
      }
  }
  assertNotificationCapability(A) {
      var B;
      switch (A) {
          case "notifications/roots/list_changed":
              if (!((B = this._capabilities.roots) === null || B === void 0 ? void 0 : B.listChanged)) throw new Error(`Client does not support roots list changed notifications (required for ${A})`);
              break;
          case "notifications/initialized":
              break;
          case "notifications/cancelled":
              break;
          case "notifications/progress":
              break
      }
  }
  assertRequestHandlerCapability(A) {
      switch (A) {
          case "sampling/createMessage":
              if (!this._capabilities.sampling) throw new Error(`Client does not support sampling capability (required for ${A})`);
              break;
          case "roots/list":
              if (!this._capabilities.roots) throw new Error(`Client does not support roots capability (required for ${A})`);
              break;
          case "ping":
              break
      }
  }
  async ping(A) {
      return this.request({
          method: "ping"
      }, G$, A)
  }
  async complete(A, B) {
      return this.request({
          method: "completion/complete",
          params: A
      }, $l1, B)
  }
  async setLoggingLevel(A, B) {
      return this.request({
          method: "logging/setLevel",
          params: {
              level: A
          }
      }, G$, B)
  }
  async getPrompt(A, B) {
      return this.request({
          method: "prompts/get",
          params: A
      }, wl1, B)
  }
  async listPrompts(A, B) {
      return this.request({
          method: "prompts/list",
          params: A
      }, Ht, B)
  }
  async listResources(A, B) {
      return this.request({
          method: "resources/list",
          params: A
      }, fj, B)
  }
  async listResourceTemplates(A, B) {
      return this.request({
          method: "resources/templates/list",
          params: A
      }, zl1, B)
  }
  async readResource(A, B) {
      return this.request({
          method: "resources/read",
          params: A
      }, Kt, B)
  }
  async subscribeResource(A, B) {
      return this.request({
          method: "resources/subscribe",
          params: A
      }, G$, B)
  }
  async unsubscribeResource(A, B) {
      return this.request({
          method: "resources/unsubscribe",
          params: A
      }, G$, B)
  }
  async callTool(A, B = Sm, Q) {
      return this.request({
          method: "tools/call",
          params: A
      }, B, Q)
  }
  async listTools(A, B) {
      return this.request({
          method: "tools/list",
          params: A
      }, zt, B)
  }
  async sendRootsListChanged() {
      return this.notification({
          method: "notifications/roots/list_changed"
      })
  }
}


// xl1 - Lines 32345-32410
class xl1 {
class xl1 {
  constructor(A) {
      if (this._abortController = new AbortController, this._readBuffer = new Et, this._stderrStream = null, this._serverParams = A, A.stderr === "pipe" || A.stderr === "overlapped") this._stderrStream = new FO6
  }
  async start() {
      if (this._process) throw new Error("StdioClientTransport already started! If using Client class, note that connect() calls start() automatically.");
      return new Promise((A, B) => {
          var Q, I, G, Z, D, Y;
          if (this._process = Wo0.default(this._serverParams.command, (Q = this._serverParams.args) !== null && Q !== void 0 ? Q : [], {
                  env: (I = this._serverParams.env) !== null && I !== void 0 ? I : VO6(),
                  stdio: ["pipe", "pipe", (G = this._serverParams.stderr) !== null && G !== void 0 ? G : "inherit"],
                  shell: !1,
                  signal: this._abortController.signal,
                  windowsHide: DF1.platform === "win32" && CO6(),
                  cwd: this._serverParams.cwd
              }), this._process.on("error", (W) => {
                  var J, F;
                  if (W.name === "AbortError") {
                      (J = this.onclose) === null || J === void 0 || J.call(this);
                      return
                  }
                  B(W), (F = this.onerror) === null || F === void 0 || F.call(this, W)
              }), this._process.on("spawn", () => {
                  A()
              }), this._process.on("close", (W) => {
                  var J;
                  this._process = void 0, (J = this.onclose) === null || J === void 0 || J.call(this)
              }), (Z = this._process.stdin) === null || Z === void 0 || Z.on("error", (W) => {
                  var J;
                  (J = this.onerror) === null || J === void 0 || J.call(this, W)
              }), (D = this._process.stdout) === null || D === void 0 || D.on("data", (W) => {
                  this._readBuffer.append(W), this.processReadBuffer()
              }), (Y = this._process.stdout) === null || Y === void 0 || Y.on("error", (W) => {
                  var J;
                  (J = this.onerror) === null || J === void 0 || J.call(this, W)
              }), this._stderrStream && this._process.stderr) this._process.stderr.pipe(this._stderrStream)
      })
  }
  get stderr() {
      var A, B;
      if (this._stderrStream) return this._stderrStream;
      return (B = (A = this._process) === null || A === void 0 ? void 0 : A.stderr) !== null && B !== void 0 ? B : null
  }
  processReadBuffer() {
      var A, B;
      while (!0) try {
let Q: any = this._readBuffer.readMessage();
          if (Q === null) break;
          (A = this.onmessage) === null || A === void 0 || A.call(this, Q)
      } catch (Q) {
          (B = this.onerror) === null || B === void 0 || B.call(this, Q)
      }
  }
  async close() {
      this._abortController.abort(), this._process = void 0, this._readBuffer.clear()
  }
  send(A) {
      return new Promise((B) => {
          var Q;
          if (!((Q = this._process) === null || Q === void 0 ? void 0 : Q.stdin)) throw new Error("Not connected");
let I: any = ZF1(A);
          if (this._process.stdin.write(I)) B();
          else this._process.stdin.once("drain", B)
      })
  }
}


// PK - Lines 36262-36417
class PK {
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
  initialize(A) {
      if (this.initialized) return;
      if (this.mcpClient = A, this.initialized = !0, this.mcpClient && this.mcpClient.type === "connected") {
let B: any = var_n.object({
              method: var_n.literal("diagnostics_changed"),
              params: var_n.object({
                  uri: var_n.string()
              })
          });
          this.mcpClient.client.setNotificationHandler(B, async (Q) => {
              let {
                  uri: I
              } = Q.params;
              this.handleDiagnosticChange(I)
          })
      }
  }
  async shutdown() {
      this.initialized = !1, this.baseline.clear()
  }
  reset() {
      this.baseline.clear(), this.rightFileDiagnosticsState.clear()
  }
  normalizeFileUri(A) {
let B: any = ["file://", "_claude_fs_right:", "_claude_fs_left:"];
      for (let Q of B)
          if (A.startsWith(Q)) return A.slice(Q.length);
      return A
  }
  async ensureFileOpened(A) {
      if (!this.initialized || !this.mcpClient || this.mcpClient.type !== "connected") return;
      try {
          await gw("openFile", {
              filePath: A,
              preview: !1,
              startText: "",
              endText: "",
              selectToEndOfLine: !1,
              makeFrontmost: !1
          }, this.mcpClient, !1)
      } catch (B) {
          b1(B)
      }
  }
  async beforeFileEdited(A) {
      if (!this.initialized || !this.mcpClient || this.mcpClient.type !== "connected") return;
let B: any = Date.now();
      try {
let Q: any = await gw("getDiagnostics", {
                  uri: `file://${A}`
              }, this.mcpClient, !1),
              I = this.parseDiagnosticResult(Q)[0];
          if (I) {
              if (A !== this.normalizeFileUri(I.uri)) {
                  b1(new Error(`Diagnostics file path mismatch: expected ${A}, got ${I.uri})`));
                  return
              }
              this.baseline.set(A, I.diagnostics), this.lastProcessedTimestamps.set(A, B)
          } else this.baseline.set(A, []), this.lastProcessedTimestamps.set(A, B)
      } catch (Q) {}
  }
  async getNewDiagnostics() {
      if (!this.initialized || !this.mcpClient || this.mcpClient.type !== "connected") return [];
let A: any = [];
      try {
let G: any = await gw("getDiagnostics", {}, this.mcpClient, !1);
          A = this.parseDiagnosticResult(G)
      } catch (G) {
          return []
      }
let B: any = A.filter((G) => this.baseline.has(this.normalizeFileUri(G.uri))).filter((G) => G.uri.startsWith("file://")),
          Q = new Map;
      A.filter((G) => this.baseline.has(this.normalizeFileUri(G.uri))).filter((G) => G.uri.startsWith("_claude_fs_right:")).forEach((G) => {
          Q.set(this.normalizeFileUri(G.uri), G)
      });
let I: any = [];
      for (let G of B) {
let Z: any = this.normalizeFileUri(G.uri),
              D = this.baseline.get(Z) || [],
              Y = Q.get(Z),
              W = G;
          if (Y) {
let F: any = this.rightFileDiagnosticsState.get(Z);
              if (!F || !this.areDiagnosticArraysEqual(F, Y.diagnostics)) W = Y;
              this.rightFileDiagnosticsState.set(Z, Y.diagnostics)
          }
let J: any = W.diagnostics.filter((F) => !D.some((X) => this.areDiagnosticsEqual(F, X)));
          if (J.length > 0) I.push({
              uri: G.uri,
              diagnostics: J
          });
          this.baseline.set(Z, W.diagnostics)
      }
      return I
  }
  parseDiagnosticResult(A) {
      if (Array.isArray(A)) {
let B: any = A.find((Q) => Q.type === "text");
          if (B && "text" in B) return JSON.parse(B.text)
      }
      return []
  }
  areDiagnosticsEqual(A, B) {
      return A.message === B.message && A.severity === B.severity && A.source === B.source && A.code === B.code && A.range.start.line === B.range.start.line && A.range.start.character === B.range.start.character && A.range.end.line === B.range.end.line && A.range.end.character === B.range.end.character
  }
  areDiagnosticArraysEqual(A, B) {
      if (A.length !== B.length) return !1;
      return A.every((Q) => B.some((I) => this.areDiagnosticsEqual(Q, I))) && B.every((Q) => A.some((I) => this.areDiagnosticsEqual(I, Q)))
  }
  isLinterDiagnostic(A) {
let B: any = ["eslint", "eslint-plugin", "tslint", "prettier", "stylelint", "jshint", "standardjs", "xo", "rome", "biome", "deno-lint", "rubocop", "pylint", "flake8", "black", "ruff", "clippy", "rustfmt", "golangci-lint", "gofmt", "swiftlint", "detekt", "ktlint", "checkstyle", "pmd", "sonarqube", "sonarjs"];
      if (!A.source) return !1;
let Q: any = A.source.toLowerCase();
      return B.some((I) => Q.includes(I))
  }
  handleDiagnosticChange(A) {}
  async handleQueryStart(A) {
      if (!this.initialized) {
let B: any = IW(A);
          if (B) this.initialize(B)
      } else this.reset()
  }
  static formatDiagnosticsSummary(A) {
      return A.map((B) => {
let Q: any = B.uri.split("/").pop() || B.uri,
              I = B.diagnostics.map((G) => {
                  return `  ${PK.getSeveritySymbol(G.severity)} [Line ${G.range.start.line+1}:${G.range.start.character+1}] ${G.message}${G.code?` [${G.code}]`:""}${G.source?` (${G.source})`:""}`
              }).join(`
`);
          return `${Q}:
${I}`
      }).join(`

`)
  }
  static getSeveritySymbol(A) {
      return {
          Error: A0.cross,
          Warning: A0.warning,
          Info: A0.info,
          Hint: A0.star
      }[A] || A0.bullet
  }
}


// pw2 - Lines 40520-40571
class pw2 {
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
      this.status = "running", this.startTime = Date.now(), this.shellCommand = Q, O9(`BackgroundShell ${A} created for command: ${B}`);
let G: any = Q.background(A);
      if (!G) this.status = "failed", this.result = {
          code: 1,
          interrupted: !1
      };
      else G.stdoutStream.on("data", (Z) => {
          this.stdout += Z.toString()
      }), G.stderrStream.on("data", (Z) => {
          this.stderr += Z.toString()
      }), Q.result.then((Z) => {
          if (Z.code === 0) this.status = "completed";
          else this.status = "failed";
          this.result = {
              code: Z.code,
              interrupted: Z.interrupted
          }, O9(`BackgroundShell ${A} completed with code ${Z.code} (interrupted: ${Z.interrupted})`), I(Z)
      })
  }
  getOutput() {
let A: any = {
          stdout: this.stdout,
          stderr: this.stderr
      };
      return this.stdout = "", this.stderr = "", A
  }
  hasNewOutput() {
      return !!this.stdout
  }
  kill() {
      try {
          return O9(`BackgroundShell ${this.id} kill requested`), this.shellCommand ? .kill(), this.status = "killed", !0
      } catch (A) {
          return b1(A instanceof Error ? A : new Error(String(A))), !1
      }
  }
  dispose() {
      this.shellCommand = null
  }
}


// Xu - Lines 40572-40681
class Xu {
class Xu {
  static instance = null;
  shells = new Map;
  shellCounter = 0;
  subscribers = new Set;
  constructor() {}
  static getInstance() {
      if (!Xu.instance) Xu.instance = new Xu;
      return Xu.instance
  }
  subscribe(A) {
      return this.subscribers.add(A), () => {
          this.subscribers.delete(A)
      }
  }
  notifySubscribers() {
      this.subscribers.forEach((A) => {
          try {
              A()
          } catch (B) {
              b1(B)
          }
      })
  }
  addBackgroundShell(A) {
      return this.shells.set(A.id, A), this.notifySubscribers(), A.id
  }
  completeShell(A, B) {
let Q: any = this.shells.get(A);
      if (!Q) return;
      if (Q.status = B.code === 0 ? "completed" : "failed", O9(`Shell ${A} completed: status=${Q.status}, code=${B.code}, interrupted=${B.interrupted}`), B.code === 143) O9(`Shell ${A} exited with code 143 (SIGTERM) - likely terminated by timeout or explicit kill`);
      Q.result = {
          code: B.code,
          interrupted: B.interrupted
      }, this.notifySubscribers()
  }
  getAllShells() {
      return Array.from(this.shells.values())
  }
  getActiveShells() {
      return Array.from(this.shells.values()).filter((A) => A.status === "running")
  }
  getActiveShellCount() {
      return this.getActiveShells().length
  }
  getShell(A) {
      return this.shells.get(A)
  }
  getShellOutput(A) {
let B: any = this.shells.get(A);
      if (!B) return {
          shellId: A,
          command: "",
          status: "failed",
          exitCode: null,
          stdout: "",
          stderr: "Shell not found"
      };
let Q: any = B.result ? B.result.code : null,
          {
              stdout: I,
              stderr: G
          } = B.getOutput();
      return {
          shellId: A,
          command: B.command,
          status: B.status,
          exitCode: Q,
          stdout: I.trimEnd(),
          stderr: G.trimEnd()
      }
  }
  getShellsUnreadOutputInfo() {
      return this.getActiveShells().map((A) => {
let B: any = A.hasNewOutput();
          return {
              id: A.id,
              command: A.command,
              hasNewOutput: B
          }
      })
  }
  removeShell(A) {
let B: any = this.shells.get(A);
      if (B) {
          if (B.status === "running") B.kill(), B.dispose();
let Q: any = this.shells.delete(A);
          return this.notifySubscribers(), Q
      }
      return !1
  }
  killShell(A) {
let B: any = this.shells.get(A);
      if (B && B.status === "running") return O9(`Killing shell ${A} (command: ${B.command})`), B.kill(), setTimeout(() => {
          if (this.shells.get(A)) B.dispose()
      }, 1800000), this.notifySubscribers(), !0;
      return !1
  }
  moveToBackground(A, B) {
let Q: any = this.generateShellId();
      O9(`Moving command to background: ${A} (shellId: ${Q})`);
let I: any = new pw2(Q, A, B, (G) => {
          this.completeShell(I.id, G)
      });
      return this.addBackgroundShell(I), Q
  }
  generateShellId() {
      return `bash_${++this.shellCounter}`
  }
}


// f2A - Lines 67875-68012
class f2A extends wt {
class f2A extends wt {
  constructor(A, B) {
      var Q;
      super(B);
      this._serverInfo = A, this._capabilities = (Q = B === null || B === void 0 ? void 0 : B.capabilities) !== null && Q !== void 0 ? Q : {}, this._instructions = B === null || B === void 0 ? void 0 : B.instructions, this.setRequestHandler(Kl1, (I) => this._oninitialize(I)), this.setNotificationHandler(sJ1, () => {
          var I;
          return (I = this.oninitialized) === null || I === void 0 ? void 0 : I.call(this)
      })
  }
  registerCapabilities(A) {
      if (this.transport) throw new Error("Cannot register capabilities after connecting to transport");
      this._capabilities = IF1(this._capabilities, A)
  }
  assertCapabilityForMethod(A) {
      var B, Q;
      switch (A) {
          case "sampling/createMessage":
              if (!((B = this._clientCapabilities) === null || B === void 0 ? void 0 : B.sampling)) throw new Error(`Client does not support sampling (required for ${A})`);
              break;
          case "roots/list":
              if (!((Q = this._clientCapabilities) === null || Q === void 0 ? void 0 : Q.roots)) throw new Error(`Client does not support listing roots (required for ${A})`);
              break;
          case "ping":
              break
      }
  }
  assertNotificationCapability(A) {
      switch (A) {
          case "notifications/message":
              if (!this._capabilities.logging) throw new Error(`Server does not support logging (required for ${A})`);
              break;
          case "notifications/resources/updated":
          case "notifications/resources/list_changed":
              if (!this._capabilities.resources) throw new Error(`Server does not support notifying about resources (required for ${A})`);
              break;
          case "notifications/tools/list_changed":
              if (!this._capabilities.tools) throw new Error(`Server does not support notifying of tool list changes (required for ${A})`);
              break;
          case "notifications/prompts/list_changed":
              if (!this._capabilities.prompts) throw new Error(`Server does not support notifying of prompt list changes (required for ${A})`);
              break;
          case "notifications/cancelled":
              break;
          case "notifications/progress":
              break
      }
  }
  assertRequestHandlerCapability(A) {
      switch (A) {
          case "sampling/createMessage":
              if (!this._capabilities.sampling) throw new Error(`Server does not support sampling (required for ${A})`);
              break;
          case "logging/setLevel":
              if (!this._capabilities.logging) throw new Error(`Server does not support logging (required for ${A})`);
              break;
          case "prompts/get":
          case "prompts/list":
              if (!this._capabilities.prompts) throw new Error(`Server does not support prompts (required for ${A})`);
              break;
          case "resources/list":
          case "resources/templates/list":
          case "resources/read":
              if (!this._capabilities.resources) throw new Error(`Server does not support resources (required for ${A})`);
              break;
          case "tools/call":
          case "tools/list":
              if (!this._capabilities.tools) throw new Error(`Server does not support tools (required for ${A})`);
              break;
          case "ping":
          case "initialize":
              break
      }
  }
  async _oninitialize(A) {
let B: any = A.params.protocolVersion;
      return this._clientCapabilities = A.params.capabilities, this._clientVersion = A.params.clientInfo, {
          protocolVersion: cJ1.includes(B) ? B : xj,
          capabilities: this.getCapabilities(),
          serverInfo: this._serverInfo,
          ...this._instructions && {
              instructions: this._instructions
          }
      }
  }
  getClientCapabilities() {
      return this._clientCapabilities
  }
  getClientVersion() {
      return this._clientVersion
  }
  getCapabilities() {
      return this._capabilities
  }
  async ping() {
      return this.request({
          method: "ping"
      }, G$)
  }
  async createMessage(A, B) {
      return this.request({
          method: "sampling/createMessage",
          params: A
      }, Nl1, B)
  }
  async listRoots(A, B) {
      return this.request({
          method: "roots/list",
          params: A
      }, Ml1, B)
  }
  async sendLoggingMessage(A) {
      return this.notification({
          method: "notifications/message",
          params: A
      })
  }
  async sendResourceUpdated(A) {
      return this.notification({
          method: "notifications/resources/updated",
          params: A
      })
  }
  async sendResourceListChanged() {
      return this.notification({
          method: "notifications/resources/list_changed"
      })
  }
  async sendToolListChanged() {
      return this.notification({
          method: "notifications/tools/list_changed"
      })
  }
  async sendPromptListChanged() {
      return this.notification({
          method: "notifications/prompts/list_changed"
      })
  }
}


// pfA - Lines 15082-15097
function pfA(A): any {
function pfA(A): any {
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
}


// ifA - Lines 15251-15278
async function ifA({
async function ifA({
  rule: A,
  initialContext: B,
  setToolPermissionContext: Q
}): any {
  if (A.source === "policySettings") throw new Error("Cannot delete permission rules from managed settings");
let I: any = m8(A.ruleValue),
      G = lfA(A.ruleBehavior),
      Z = A.source,
      D = { ...B,
          [G]: { ...B[G],
              [A.source]: B[G][Z] ? .filter((Y) => Y !== I) || []
          }
      };
  switch (Z) {
      case "localSettings":
      case "userSettings":
      case "projectSettings":
          {
              dfA(A);
              break
          }
      case "cliArg":
      case "command":
          break
  }
  Q(D)
}


// Jo9 - Lines 15336-15347
function Jo9(A): any {
function Jo9(A): any {
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
}


// xZ0 - Lines 23460-23508
function xZ0(A, B, Q): any {
function xZ0(A, B, Q): any {
let I: any = "running",
      G, Z = yZ0(A.stdout),
      D = yZ0(A.stderr),
      Y = (X) => {
          if (I = "killed", A.pid) kZ0.default(A.pid, "SIGKILL")
      },
      W = null,
      J, F = new Promise((X) => {
let V: any = () => Y();
          J = () => {
              if (W) clearTimeout(W), W = null;
              B.removeEventListener("abort", V)
          }, B.addEventListener("abort", V, {
              once: !0
          }), new Promise((C) => {
let K: any = Y;
              Y = (E) => {
                  K(), C(E || _Z0)
              }, W = setTimeout(() => {
                  Y(jZ0)
              }, Q), A.on("close", (E, N) => {
                  C(E !== null && E !== void 0 ? E : N === "SIGTERM" ? 144 : 1)
              }), A.on("error", () => C(1))
          }).then((C) => {
              if (J(), I === "running") I = "completed";
let K: any = {
                  code: C,
                  stdout: Z.get(),
                  stderr: D.get(),
                  interrupted: C === _Z0,
                  backgroundTaskId: G
              };
              if (C === jZ0) K.stderr = [`Command timed out after ${U_(Q)}`, K.stderr].filter(Boolean).join(" ");
              X(K)
          })
      });
  return {
      background: (X) => {
          if (I === "running") return G = X, I = "backgrounded", J(), {
              stdoutStream: Z.asStream(),
              stderrStream: D.asStream()
          };
          else return null
      },
      kill: () => Y(),
      result: F
  }
}


// fZ0 - Lines 23510-23522
function fZ0(A): any {
function fZ0(A): any {
  return {
      background: () => null,
      kill: () => {},
      result: Promise.resolve({
          code: 145,
          stdout: "",
          stderr: "Command aborted before execution",
          interrupted: !0,
          backgroundTaskId: A
      })
  }
}


// hZ0 - Lines 23596-23607
function hZ0(A): any {
function hZ0(A): any {
  if (!nf1()) throw new Error("Sandbox mode requested but not available on this system");
  try {
let B: any = new gZ0;
      return {
          finalCommand: B.wrapCommand(A),
          cleanup: () => B.cleanup()
      }
  } catch (B) {
      throw new Error("Sandbox mode requested but not available on this system")
  }
}


// yf4 - Lines 23810-23873
function yf4(A, B): any {
function yf4(A, B): any {
let Q: any = cZ0(A),
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
      echo "eval ${sf1}"${sf1}$(echo '$encoded_func' | base64 -d)${sf1}" > /dev/null 2>&1" >> $SNAPSHOT_FILE
    done

    echo "# Shell Options" >> $SNAPSHOT_FILE
    shopt -p | head -n 1000 >> $SNAPSHOT_FILE
    set -o | grep "on" | awk '{print "set -o " $1}' | head -n 1000 >> $SNAPSHOT_FILE
    echo "shopt -s expand_aliases" >> $SNAPSHOT_FILE
  `;
  return `SNAPSHOT_FILE=${ta.default.quote([B])}
    source "${Q}" < /dev/null
    
    # First, create/clear the snapshot file
    echo "# Snapshot file" >| $SNAPSHOT_FILE
    
    # When this file is sourced, we first unalias to avoid conflicts
    # This is necessary because aliases get "frozen" inside function definitions at definition time,
    # which can cause unexpected behavior when functions use commands that conflict with aliases
    echo "# Unset all aliases to avoid conflicts with functions" >> $SNAPSHOT_FILE
    echo "unalias -a 2>/dev/null || true" >> $SNAPSHOT_FILE
    
    ${G}
    
    echo "# Aliases" >> $SNAPSHOT_FILE
    alias | sed 's/^alias //g' | sed 's/^/alias -- /' | head -n 1000 >> $SNAPSHOT_FILE
    
    # Check if rg is available, if not create an alias to bundled ripgrep
    echo "# Check for rg availability" >> $SNAPSHOT_FILE
    echo "if ! command -v rg >/dev/null 2>&1; then" >> $SNAPSHOT_FILE
    echo "  alias rg='${Zv()}'" >> $SNAPSHOT_FILE
    echo "fi" >> $SNAPSHOT_FILE
    
    # Add PATH to the file
    echo "export PATH='${process.env.PATH}'" >> $SNAPSHOT_FILE
  `
}


// kf4 - Lines 23922-23957
function kf4(): any {
function kf4(): any {
let A: any = Math.floor(Math.random() * 65536).toString(16).padStart(4, "0"),
      B = lZ0(),
      Q = `${rf1.tmpdir()}/claude-shell-snapshot-${A}`;
  return new Promise((I) => {
      try {
let G: any = cZ0(B);
          if (!dZ0(G)) {
              I(void 0);
              return
          }
let Z: any = yf4(B, Q);
          Of4(B, ["-c", "-l", Z], {
              env: { ...process.env.CLAUDE_CODE_DONT_INHERIT_ENV ? {} : process.env,
                  SHELL: B,
                  GIT_EDITOR: "true",
                  CLAUDECODE: "1"
              },
              timeout: 1e4,
              maxBuffer: 1048576
          }, (D, Y, W) => {
              if (D) b1(new Error(`Failed to create shell snapshot: ${W}`)), E1("shell_snapshot_failed", {
                  stderr_length: W.length
              }), I(void 0);
              else if (dZ0(Q)) {
let J: any = Lf4(Q).size;
                  E1("shell_snapshot_created", {
                      snapshot_size: J
                  }), I(Q)
              } else E1("shell_unknown_error", {}), I(void 0)
          })
      } catch (G) {
          b1(G instanceof Error ? G : new Error(String(G))), E1("shell_snapshot_error", {}), I(void 0)
      }
  })
}


// xf4 - Lines 23965-24021
async function xf4(A, B, Q, I = !1, G): any {
async function xf4(A, B, Q, I = !1, G): any {
let Z: any = Q || jf4,
      {
          binShell: D,
          snapshotFilePath: Y
      } = await of1();
  if (G) D = G, Y = void 0;
let W: any = Math.floor(Math.random() * 65536).toString(16).padStart(4, "0"),
      J = `${rf1.tmpdir()}/claude-${W}-cwd`,
      F = ta.default.quote([A, "<", "/dev/null"]);
  if (D.includes("bash") && !I) {
let E: any = A.split(/(?<!\|)\|(?!\|)/);
      if (E.length > 1) F = ta.default.quote([E[0], "<", "/dev/null", "|", E.slice(1).join("|")])
  }
  if (I) A = mZ0(A), F = ta.default.quote([A, "<", "/dev/null"]);
let X: any = () => {};
  if (I) {
let E: any = hZ0(F);
      F = E.finalCommand, X = E.cleanup
  }
let V: any = [];
  if (Y) V.push(`source ${Y}`);
  V.push(`eval ${F}`), V.push(`pwd -P >| ${J}`);
let C: any = V.join(" && "),
      K = iZ0();
  if (B.aborted) return fZ0();
  try {
let E: any = af1(A),
          N = Tf4(D, ["-c", "-l", C], {
              env: { ...process.env,
                  SHELL: D,
                  GIT_EDITOR: "true",
                  CLAUDECODE: "1",
                  ...I ? E.env : {}
              },
              cwd: K,
              detached: !0
          }),
          query = xZ0(N, B, Z);
      return query.result.then((O) => {
          if (O && !O.backgroundTaskId) try {
              EX(Mf4(J, {
                  encoding: "utf8"
              }).trim(), K)
          } catch {
              E1("shell_set_cwd", {
                  success: !1
              })
          }
          X()
      }).catch(() => {
          X()
      }), X = () => {}, q
  } finally {
      X()
  }
}


// EX - Lines 24027-24034
function EX(A, B): any {
function EX(A, B): any {
let Q: any = Pf4(A) ? A : Sf4(B || x1().cwd(), A);
  if (!x1().existsSync(Q)) throw new Error(`Path "${Q}" does not exist`);
let I: any = x1().realpathSync(Q);
  i2A(I), E1("shell_set_cwd", {
      success: !0
  })
}


// Qb4 - Lines 26127-26141
function Qb4(): any {
function Qb4(): any {
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
      }
  }
}


// xa0 - Lines 27508-27604
function xa0(): any {
function xa0(): any {
  return `Executes a given bash command in a persistent shell session with optional timeout, ensuring proper handling and security measures.

Before executing the command, please follow these steps:

1. Directory Verification:
 - If the command will create new directories or files, first use the LS tool to verify the parent directory exists and is the correct location
 - For example, before running "mkdir foo/bar", first use LS to check that "foo" exists and is the intended parent directory

2. Command Execution:
 - Always quote file paths that contain spaces with double quotes (var_e.var_g., cd "path with spaces/file.txt")
 - Examples of proper quoting:
   - cd "/Users/name/My Documents" (correct)
   - cd /Users/name/My Documents (incorrect - will fail)
   - python "/path/with spaces/script.py" (correct)
   - python /path/with spaces/script.py (incorrect - will fail)
 - After ensuring proper quoting, execute the command.
 - Capture the output of the command.

Usage notes:
- The command argument is required.
- You can specify an optional timeout in milliseconds (up to ${CJ1()}ms / ${CJ1()/60000} minutes). If not specified, commands will timeout after ${Em()}ms (${Em()/60000} minutes).
- It is very helpful if you write a clear, concise description of what this command does in 5-10 words.
- If the output exceeds ${KJ1()} characters, output will be truncated before being returned to you.
- VERY IMPORTANT: You MUST avoid using search commands like \`find\` and \`grep\`. Instead use ${XJ1}, ${FJ1}, or ${cX} to search. You MUST avoid read tools like \`cat\`, \`head\`, \`tail\`, and \`ls\`, and use ${TD} and ${VJ1} to read files.
- If you _still_ need to run \`grep\`, STOP. ALWAYS USE ripgrep at \`rg\` first, which all ${m0} users have pre-installed.
- When issuing multiple commands, use the ';' or '&&' operator to separate them. DO NOT use newlines (newlines are ok in quoted strings).
- Try to maintain your current working directory throughout the session by using absolute paths and avoiding usage of \`cd\`. You may use \`cd\` if the User explicitly requests it.
  <good-example>
  pytest /foo/bar/tests
  </good-example>
  <bad-example>
  cd /foo/bar && pytest tests
  </bad-example>

${nf1()?"## CRITICAL: Accurate Read-Only Prediction\nCarefully determine if commands are read-only for better user experience. You should always set read_only=true for commands that do not modify the filesystem or network. \n\n**Read-Only Commands:** `grep`, `rg`, `find`, `ls`, `cat`, `head`, `tail`, `wc`, `stat`, `ps`, `df`, `du`, `pwd`, `whoami`, `which`, `date`, `history`, `man`\n\n**Git Read-Only:** `git log`, `git show`, `git diff`, `git status`, `git branch` (listing only), `git config --get`\n\n**Never Read-Only:** Commands with `>` (except to /dev/null or standard output), `$()`, `$VAR`, dangerous flags (`git diff --ext-diff`, `sort -o`, `npm audit --fix`), `git branch -D`":""}

${PG1()?`# Using sandbox mode for commands

You have a special option in BashTool: the sandbox parameter. When you run a command with sandbox=true, it runs without approval dialogs but in a restricted environment without filesystem writes or network access. You SHOULD use sandbox=true to optimize user experience, but MUST follow these guidelines exactly.

## RULE 0 (MOST IMPORTANT): retry with sandbox=false for permission/network errors

  If a command fails with permission or any network error when sandbox=true (var_e.var_g., "Permission denied", "Unknown host", "Operation not permitted"), ALWAYS retry with sandbox=false. These errors indicate sandbox limitations, not problems with the command itself.

Non-permission errors (var_e.var_g., TypeScript errors from tsc --noEmit) usually reflect real issues and should be fixed, not retried with sandbox=false.

## RULE 1: NOTES ON SPECIFIC BUILD SYSTEMS AND UTILITIES

### Build systems

Build systems like npm run build almost always need write access. Test suites also usually need write access. NEVER run build or test commands in sandbox, even if just checking types.

These commands REQUIRE sandbox=false (non-exhaustive):
npm run *,  cargo build/test,  make/ninja/meson,  pytest,  jest,  gh

## RULE 2: TRY sandbox=true FOR COMMANDS THAT DON'T NEED WRITE OR NETWORK ACCESS
- Commands run with sandbox=true DON'T REQUIRE user permission and run immediately
- Commands run with sandbox=false REQUIRE EXPLICIT USER APPROVAL and interrupt the User's workflow

Use sandbox=false when you suspect the command might modify the system or access the network:
- File operations: touch, mkdir, rm, mv, cp
- File edits: nano, vim, writing to files with >
- Installing: npm install, apt-get, brew
- Git writes: git add, git commit, git push
- Build systems:  npm run build, make, ninja, etc. (see below)
- Test suites: npm run test, pytest, cargo test, make check, ert, etc. (see below)
- Network programs: gh, ping, coo, ssh, scp, etc.

Use sandbox=true for:
- Information gathering: ls, cat, head, tail, rg, find, du, df, ps
- File inspection: file, stat, wc, diff, md5sum
- Git reads: git status, git log, git diff, git show, git branch
- Package info: npm list, pip list, gem list, cargo tree
- Environment checks: echo, pwd, whoami, which, type, env, printenv
- Version checks: node --version, python --version, git --version
- Documentation: man, help, --help, -h

Before you run a command, think hard about whether it is likely to work correctly without network access and without write access to the filesystem. Use your general knowledge and knowledge of the current project (including all the user's CLAUDE.md files) as inputs to your decision. Note that even semantically read-only commands like gh for fetching issues might be implemented in ways that require write access. ERR ON THE SIDE OF RUNNING WITH sandbox=false.

Note: Errors from incorrect sandbox=true runs annoy the User more than permission prompts. If any part of a command needs write access (var_e.var_g. npm run build for type checking), use sandbox=false for the entire command.

### EXAMPLES

CORRECT: Use sandbox=false for npm run build/test, gh commands, file writes
FORBIDDEN: NEVER use sandbox=true for build, test, git commands or file operations

## REWARDS

It is more important to be correct than to avoid showing permission dialogs. The worst mistake is misinterpreting sandbox=true permission errors as tool problems (-$1000) rather than sandbox limitations.

## CONCLUSION

Use sandbox=true to improve UX, but ONLY per the rules above. WHEN IN DOUBT, USE sandbox=false.
`:""}
${HL6()}`
}


// HL6 - Lines 27606-27683
function HL6(): any {
function HL6(): any {
  let {
      commit: B,
      pr: Q
  } = KL6();
  return `# Committing changes with git

When the user asks you to create a new git commit, follow these steps carefully:

1. You have the capability to call multiple tools in a single response. When multiple independent pieces of information are requested, batch your tool calls together for optimal performance. ALWAYS run the following bash commands in parallel, each using the ${ZK} tool:
- Run a git status command to see all untracked files.
- Run a git diff command to see both staged and unstaged changes that will be committed.
- Run a git log command to see recent commit messages, so that you can follow this repository's commit message style.
2. Analyze all staged changes (both previously staged and newly added) and draft a commit message:
- Summarize the nature of the changes (eg. new feature, enhancement to an existing feature, bug fix, refactoring, test, docs, etc.). Ensure the message accurately reflects the changes and their purpose (iterator.var_e. "add" means a wholly new feature, "update" means an enhancement to an existing feature, "fix" means a bug fix, etc.).
- Check for any sensitive information that shouldn't be committed
- Draft a concise (1-2 sentences) commit message that focuses on the "why" rather than the "what"
- Ensure it accurately reflects the changes and their purpose
3. You have the capability to call multiple tools in a single response. When multiple independent pieces of information are requested, batch your tool calls together for optimal performance. ALWAYS run the following commands in parallel:
 - Add relevant untracked files to the staging area.
 - Create the commit with a message${B?` ending with:
 ${B}`:"."}
 - Run git status to make sure the commit succeeded.
4. If the commit fails due to pre-commit hook changes, retry the commit ONCE to include these automated changes. If it fails again, it usually means a pre-commit hook is preventing the commit. If the commit succeeds but you notice that files were modified by the pre-commit hook, you MUST amend your commit to include them.

Important notes:
- NEVER update the git config
- NEVER run additional commands to read or explore code, besides git bash commands
- NEVER use the ${yG.name} or ${cX} tools
- DO NOT push to the remote repository unless the user explicitly asks you to do so
- IMPORTANT: Never use git commands with the -i flag (like git rebase -i or git add -i) since they require interactive input which is not supported.
- If there are no changes to commit (iterator.var_e., no untracked files and no modifications), do not create an empty commit
- In order to ensure good formatting, ALWAYS pass the commit message via a HEREDOC, a la this example:
<example>
git commit -m "$(cat <<'EOF'
 Commit message here.${B?`

 ${B}`:""}
 EOF
 )"
</example>

# Creating pull requests
Use the gh command via the Bash tool for ALL GitHub-related tasks including working with issues, pull requests, checks, and releases. If given a Github URL use the gh command to get the information needed.

IMPORTANT: When the user asks you to create a pull request, follow these steps carefully:

1. You have the capability to call multiple tools in a single response. When multiple independent pieces of information are requested, batch your tool calls together for optimal performance. ALWAYS run the following bash commands in parallel using the ${ZK} tool, in order to understand the current state of the branch since it diverged from the main branch:
 - Run a git status command to see all untracked files
 - Run a git diff command to see both staged and unstaged changes that will be committed
 - Check if the current branch tracks a remote branch and is up to date with the remote, so you know if you need to push to the remote
 - Run a git log command and \`git diff [base-branch]...HEAD\` to understand the full commit history for the current branch (from the time it diverged from the base branch)
2. Analyze all changes that will be included in the pull request, making sure to look at all relevant commits (NOT just the latest commit, but ALL commits that will be included in the pull request!!!), and draft a pull request summary
3. You have the capability to call multiple tools in a single response. When multiple independent pieces of information are requested, batch your tool calls together for optimal performance. ALWAYS run the following commands in parallel:
 - Create new branch if needed
 - Push to remote with -u flag if needed
 - Create PR using gh pr create with the format below. Use a HEREDOC to pass the body to ensure correct formatting.
<example>
gh pr create --title "the pr title" --body "$(cat <<'EOF'
## Summary
<1-3 bullet points>

## Test plan
[Checklist of TODOs for testing the pull request...]${Q?`

${Q}`:""}
EOF
)"
</example>

Important:
- NEVER update the git config
- DO NOT use the ${yG.name} or ${cX} tools
- Return the PR URL when you're done, so the user can see it

# Other common operations
- View comments on a Github PR: gh api repos/foo/bar/pulls/123/comments`
}


// kS6 - Lines 33939-33971
function kS6(): any {
function kS6(): any {
  try {
      if (Z7() !== "macos") return null;
let B: any = process.ppid;
      for (let Q = 0; Q < 10; Q++) {
          if (!B || B === 0 || B === 1) break;
let I: any = NZ(`ps -o command= -p ${B}`) ? .trim();
          if (I) {
let Z: any = {
                      "Visual Studio Code.app": "code",
                      "Cursor.app": "cursor",
                      "Windsurf.app": "windsurf",
                      "Visual Studio Code - Insiders.app": "code",
                      "VSCodium.app": "codium"
                  },
                  D = "/Contents/MacOS/Electron";
              for (let [Y, W] of Object.entries(Z)) {
let J: any = I.indexOf(Y + "/Contents/MacOS/Electron");
                  if (J !== -1) {
let F: any = J + Y.length;
                      return I.substring(0, F) + "/Contents/Resources/app/bin/" + W
                  }
              }
          }
let G: any = NZ(`ps -o ppid= -p ${B}`) ? .trim();
          if (!G) break;
          B = parseInt(G.trim())
      }
      return null
  } catch {
      return null
  }
}


// pe - Lines 36088-36110
async function pe(A, B, Q): any {
async function pe(A, B, Q): any {
let I: any = await HC2(A, B);
  if (I.type !== "connected") {
      Q({
          client: I,
          tools: [],
          commands: []
      });
      return
  }
let G: any = !!I.capabilities ? .resources,
      [Z, D, Y] = await Promise.all([Eo1(I), zC2(I), G ? Uo1(I) : Promise.resolve([])]),
      W = [];
  if (G) {
      if (![xC1, fC1].some((F) => Z.some((X) => X.name === F.name))) W.push(xC1, fC1)
  }
  Q({
      client: I,
      tools: [...Z, ...W],
      commands: D,
      resources: Y.length > 0 ? Y : void 0
  })
}


// eC1 - Lines 36111-36138
async function eC1(A, B): any {
async function eC1(A, B): any {
let Q: any = !1,
      I = DV(),
      G = B ? { ...I,
          ...B
      } : I;
  await Promise.all(Object.entries(G).map(async ([Z, D]) => {
let Y: any = await ue(Z, D);
      if (Y.type !== "connected") {
          A({
              client: Y,
              tools: [],
              commands: []
          });
          return
      }
let W: any = !!Y.capabilities ? .resources,
          [J, F, X] = await Promise.all([Eo1(Y), zC2(Y), W ? Uo1(Y) : Promise.resolve([])]),
          V = [];
      if (W && !Q) Q = !0, V.push(xC1, fC1);
      A({
          client: Y,
          tools: [...J, ...V],
          commands: F,
          resources: X.length > 0 ? X : void 0
      })
  }))
}


// Iw2 - Lines 36568-36599
async function Iw2(A, B, Q): any {
async function Iw2(A, B, Q): any {
let G: any = (await cZ({
      systemPrompt: [`Extract any file paths that this command reads or modifies. For commands like "git diff" and "cat", include the paths of files being shown. Use paths verbatim -- don't add any slashes or try to resolve them. Do not try to infer paths that were not explicitly listed in the command output.

IMPORTANT: Commands that do not display the contents of the files should not return any filepaths. For eg. "ls", pwd", "find". Even more complicated commands that don't display the contents should not be considered: eg "find . -type f -exec ls -la {} + | sort -k5 -nr | head -5"

First, determine if the command displays the contents of the files. If it does, then <is_displaying_contents> tag should be true. If it does not, then <is_displaying_contents> tag should be false.

Format your response as:
<is_displaying_contents>
true
</is_displaying_contents>

<filepaths>
path/to/file1
path/to/file2
</filepaths>

If no files are read or modified, return empty filepaths tags:
<filepaths>
</filepaths>

Do not include any other text in your response.`],
      userPrompt: `Command: ${A}
Output: ${B}`,
      enablePromptCaching: !0,
      isNonInteractiveSession: Q,
      promptCategory: "command_paths"
  })).message.content.filter((Z) => Z.type === "text").map((Z) => Z.text).join("");
  return mG(G, "filepaths") ? .trim().split(`
`).filter(Boolean) || []
}


// cG5 - Lines 36749-36771
function cG5(A): any {
function cG5(A): any {
  switch (A.output_type) {
      case "stream":
          return {
              output_type: A.output_type,
              text: Ht1(A.text)
          };
      case "execute_result":
      case "display_data":
          return {
              output_type: A.output_type,
              text: Ht1(A.data ? .["text/plain"]),
              image: A.data && pG5(A.data)
          };
      case "error":
          return {
              output_type: A.output_type,
              text: Ht1(`${A.ename}: ${A.evalue}
${A.traceback.join(`
`)}`)
          }
  }
}


// WD5 - Lines 40024-40170
function WD5(A): any {
function WD5(A): any {
  switch (A.type) {
      case "command_permissions":
          return [];
      case "new_directory":
          return [sK1(WE.name, {
              path: A.path
          }), aK1(WE, A.content)];
      case "edited_text_file":
          return [K2({
              content: `<system-reminder>
Note: ${A.filename} was modified, either by the user or by a linter. Don't tell the user this, since they are already aware. This change was intentional, so make sure to take it into account as you proceed (ie. don't revert it unless the user asks you to). So that you don't need to re-read the file, here's the result of running \`cat -n\` on a snippet of the edited file:`,
              isMeta: !0
          }), K2({
              content: A.snippet,
              isMeta: !0
          }), K2({
              content: "</system-reminder>",
              isMeta: !0
          })];
      case "edited_image_file":
          return [];
      case "new_file":
          {
let B: any = A.content;
              switch (B.type) {
                  case "image":
                      return [sK1(OB.name, {
                          file_path: A.filename
                      }), aK1(OB, B)];
                  case "text":
                      return [sK1(OB.name, {
                          file_path: A.filename
                      }), aK1(OB, B), ...A.truncated ? [K2({
                          content: `Note: The file ${A.filename} was too large and has been truncated to the first 100 lines. Don't tell the user about this truncation. Use ${OB.name} to read more of the file if you need.`,
                          isMeta: !0
                      })] : []];
                  case "notebook":
                      return [sK1(OB.name, {
                          file_path: A.filename
                      }), aK1(OB, B)]
              }
              break
          }
      case "selected_lines_in_ide":
          return [K2({
              content: `The user selected the following lines from ${A.filename}:
${A.content}. This may or may not be related to the current task.`,
              isMeta: !0
          })];
      case "opened_file_in_ide":
          return [K2({
              content: `The user opened the file ${A.filename} in the IDE. This may or may not be related to the current task.`,
              isMeta: !0
          })];
      case "todo":
          {
              if (A.itemCount === 0) return [K2({
                  content: `<system-reminder>This is a reminder that your todo list is currently empty. DO NOT mention this to the user explicitly because they are already aware. If you are working on tasks that would benefit from a todo list please use the ${yG.name} tool to create one. If not, please feel free to ignore. Again do not mention this message to the user.</system-reminder>`,
                  isMeta: !0
              })];
              return [K2({
                  content: `<system-reminder>
Your todo list has changed. DO NOT mention this explicitly to the user. Here are the latest contents of your todo list:

${JSON.stringify(A.content)}. You DO NOT need to use the ${oN.name} tool again, since this is the most up to date list for now. Continue on with the tasks at hand if applicable.
</system-reminder>`,
                  isMeta: !0
              })]
          }
      case "nested_memory":
          return [K2({
              content: `Contents of ${A.content.path}:

${A.content.content}`,
              isMeta: !0
          })];
      case "queued_command":
          return [K2({
              content: `The user sent the following message: ${A.prompt}`,
              isMeta: !0
          })];
      case "ultramemory":
          return [K2({
              content: A.content,
              isMeta: !0
          })];
      case "diagnostics":
          {
              if (A.files.length === 0) return [];
let B: any = PK.formatDiagnosticsSummary(A.files);
              return [K2({
                  content: `<new-diagnostics>The following new diagnostic issues were detected:

${B}</new-diagnostics>`,
                  isMeta: !0
              })]
          }
      case "plan_mode":
          return [K2({
              content: `<system-reminder>Plan mode is active. The user indicated that they do not want you to execute yet -- you MUST NOT make any edits, run any non-readonly tools (including changing configs or making commits), or otherwise make any changes to the system. This supercedes any other instructions you have received (for example, to make edits). Instead, you should:
1. Answer the user's query comprehensively
2. When you're done researching, present your plan by calling the ${hO.name} tool, which will prompt the user to confirm the plan. Do NOT make any file changes or run any tools that modify the system state in any way until the user has confirmed the plan.</system-reminder>`,
              isMeta: !0
          })];
      case "learn_mode":
          return [];
      case "mcp_resource":
          {
let B: any = A.content;
              if (!B || !B.contents || B.contents.length === 0) return [K2({
                  content: `<mcp-resource server="${A.server}" uri="${A.uri}">(No content)</mcp-resource>`,
                  isMeta: !0
              })];
let Q: any = [];
              for (let I of B.contents)
                  if (I && typeof I === "object") {
                      if ("text" in I && typeof I.text === "string") Q.push({
                          type: "text",
                          text: "Full contents of resource:"
                      }, {
                          type: "text",
                          text: I.text
                      }, {
                          type: "text",
                          text: "Do NOT read this resource again unless you think it may have changed, since you already have the full contents."
                      });
                      else if ("blob" in I) {
let G: any = "mimeType" in I ? String(I.mimeType) : "application/octet-stream";
                          Q.push({
                              type: "text",
                              text: `[Binary content: ${G}]`
                          })
                      }
                  }
              if (Q.length > 0) return [K2({
                  content: Q,
                  isMeta: !0
              })];
              else p2(A.server, `No displayable content found in MCP resource ${A.uri}.`);
              return [K2({
                  content: `<mcp-resource server="${A.server}" uri="${A.uri}">(No displayable content)</mcp-resource>`,
                  isMeta: !0
              })]
          }
  }
}


// XD5 - Lines 40720-40768
async function XD5(A, B, Q, I): any {
async function XD5(A, B, Q, I): any {
let G: any = B.join(" ").trim(),
      Z = await I({ ...A,
          command: G
      }),
      D = gt1(Q).every((X) => {
          return E4.isReadOnly({ ...A,
              command: X.trim()
          })
      }),
      Y = Q.join(" ").trim(),
      W = D ? {
          behavior: "allow",
          updatedInput: A,
          decisionReason: {
              type: "other",
              reason: "Pipe right-hand command is read-only"
          }
      } : {
          behavior: "ask",
          message: `Autocoder requested permissions to use ${E4.name}, but you haven't granted it yet.`,
          decisionReason: {
              type: "other",
              reason: "Pipe right-hand command is not read-only"
          }
      },
      J = new Map([
          [G, Z],
          [Y, W]
      ]);
  if (Z.behavior === "allow" && W.behavior === "allow") return {
      behavior: "allow",
      updatedInput: A,
      decisionReason: {
          type: "subcommandResults",
          reasons: J
      }
  };
let F: any = W.behavior === "allow" ? Z.behavior !== "allow" ? Z.ruleSuggestions : void 0 : null;
  return {
      behavior: "ask",
      message: `Autocoder requested permissions to use ${E4.name}, but you haven't granted it yet.`,
      decisionReason: {
          type: "subcommandResults",
          reasons: J
      },
      ruleSuggestions: F
  }
}


// cw2 - Lines 40769-40787
async function cw2(A, B): any {
async function cw2(A, B): any {
  if (uw2(A.command)) return {
      behavior: "ask",
      message: `Autocoder requested permissions to use ${E4.name}, but you haven't granted it yet.`,
      decisionReason: {
          type: "other",
          reason: "Unsupported shell control operator"
      },
      ruleSuggestions: null
  };
let Q: any = bt1(A.command),
      I = Q.findIndex((G) => G === "|");
  if (I >= 0) {
let G: any = Q.slice(0, I),
          Z = Q.slice(I + 1);
      return XD5(A, G, Z, B)
  }
  return null
}


// ht1 - Lines 40789-40806
function ht1(A, B, Q): any {
function ht1(A, B, Q): any {
let I: any = Cy(A.command);
  for (let G of I) {
      let [Z, ...D] = G.split(" ");
      if (Z === "cd" && D.length > 0) {
let Y: any = D.join(" ").replace(/^['"]|['"]$/g, ""),
              W = VD5(Y) ? Y : CD5(B, Y);
          if (!ZvA(lw2(Q, W), lw2(B, Q))) return {
              behavior: "ask",
              message: `ERROR: cd to '${W}' was blocked. For security, ${m0} may only change directories to child directories of the original working directory (${Q}) for this session.`
          }
      }
  }
  return {
      behavior: "allow",
      updatedInput: A
  }
}


// zD5 - Lines 40826-40836
function zD5(A): any {
function zD5(A): any {
let B: any = mt1(A);
  if (B !== null) return {
      type: "prefix",
      prefix: B
  };
  else return {
      type: "exact",
      command: A
  }
}


// iw2 - Lines 40838-40854
function iw2(A, B, Q): any {
function iw2(A, B, Q): any {
let I: any = A.command.trim();
  return Array.from(B.entries()).filter(([G]) => {
let Z: any = zD5(G);
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
      }
  }).map(([, G]) => G)
}


// nw2 - Lines 40946-40975
function nw2(A, B, Q): any {
function nw2(A, B, Q): any {
let I: any = dt1(A, B);
  if (I.behavior === "deny") return I;
  if (I.behavior === "allow") return I;
let G: any = sw2(A, B);
  if (G.behavior === "deny") return G;
  if (Q === null || Q === void 0) return {
      behavior: "ask",
      message: `Autocoder requested permissions to use ${E4.name}, but you haven't granted it yet.`,
      decisionReason: {
          type: "other",
          reason: "Command prefix query failed"
      },
      ruleSuggestions: QH1(A.command)
  };
  if (Q.commandInjectionDetected) return {
      behavior: "ask",
      message: `Autocoder requested permissions to use ${E4.name}, but you haven't granted it yet.`,
      decisionReason: {
          type: "other",
          reason: "Potential command injection detected"
      },
      ruleSuggestions: null
  };
  if (G.behavior === "allow") return G;
let Z: any = Q.commandPrefix ? HD5(Q.commandPrefix) : QH1(A.command);
  return { ...G,
      ruleSuggestions: Z
  }
}


// OD5 - Lines 41382-41402
async function OD5({
async function OD5({
  shellCommand: A,
  input: B,
  dialogResultPromise: Q,
  setToolJSX: I
}): any {
let G: any = A.result;
  return Promise.race([G, Q.then(async (Z) => {
      if (Z === "background" && A) {
let D: any = XE.moveToBackground(B.command, A);
          if (I) I(null);
          return {
              stdout: `Command running in background (shell ID: ${D})`,
              stderr: "",
              code: 0,
              interrupted: !1
          }
      } else if (Z === "kill") return A ? .kill(), await G;
      else return await G
  })])
}


// TD5 - Lines 41403-41420
async function TD5({
async function TD5({
  input: A,
  abortController: B,
  dialogResultPromise: Q,
  setToolJSX: I
}): any {
  let {
      command: G,
      timeout: Z,
      shellExecutable: D
  } = A, Y = Z || Em(), J = await nZ0()(G, B.signal, Y, A.sandbox || !1, D);
  return OD5({
      shellCommand: J,
      input: A,
      dialogResultPromise: Q,
      setToolJSX: I
  })
}


// KY5 - Lines 43533-43587
function KY5(A, B): any {
function KY5(A, B): any {
  switch (A.name) {
      case E4.name:
          {
              let {
                  command: Q,
                  sandbox: I,
                  timeout: G,
                  description: Z
              } = E4.inputSchema.parse(B),
              D = Q.replace(`cd ${dA()} && `, "");
              if (D = D.replace(/\\\\;/g, "\\;"), /^echo\s+["']?[^|&;><]*["']?$/iterator.test(D.trim())) E1("bash_tool_simple_echo", {});
              return {
                  command: D,
                  ...G ? {
                      timeout: G
                  } : {},
                  ...I !== void 0 ? {
                      sandbox: I
                  } : {},
                  ...Z ? {
                      description: Z
                  } : {}
              }
          }
      case gI.name:
          {
let Q: any = gI.inputSchema.parse(B),
                  {
                      file_path: I,
                      edits: G
                  } = Ae1({
                      file_path: Q.file_path,
                      edits: [{
                          old_string: Q.old_string,
                          new_string: Q.new_string,
                          replace_all: Q.replace_all
                      }]
                  });
              return {
                  replace_all: G[0].replace_all,
                  file_path: I,
                  old_string: G[0].old_string,
                  new_string: G[0].new_string
              }
          }
      case S$.name:
          {
let Q: any = S$.inputSchema.parse(B);
              return Ae1(Q)
          }
      default:
          return B
  }
}


// YW5 - Lines 45690-45696
function YW5(A): any {
function YW5(A): any {
  if (!A) return [];
  return A.filter((B) => B.mode === "prompt").map((B) => ({
      type: "queued_command",
      prompt: B.value
  }))
}


// _u - Lines 47318-47354
async function _u(A): any {
async function _u(A): any {
let B: any = ZA(),
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
  await E1("notification_method_used", {
      configured_channel: Q,
      method_used: I,
      term: mA.terminal
  })
}


// wq2 - Lines 47794-47810
function wq2({
function wq2({
  addMargin: A,
  param: {
      text: B
  }
}): any {
let Q: any = mG(B, "command-message"),
      I = mG(B, "command-args");
  if (!Q) return null;
  return YA1.createElement(h, {
      flexDirection: "column",
      marginTop: A ? 1 : 0,
      width: "100%"
  }, YA1.createElement(P, {
      color: "secondaryText"
  }, "> /", Q, " ", I))
}


// qq2 - Lines 47888-47908
function qq2({
function qq2({
  content: A
}): any {
let B: any = mG(A, "local-command-stdout"),
      Q = mG(A, "local-command-stderr");
  if (!B && !Q) return oJ.createElement(w0, null, oJ.createElement(P, {
      color: "secondaryText"
  }, AW));
let I: any = [];
  if (B ? .trim()) I.push(oJ.createElement(w0, {
      key: "stdout"
  }, oJ.createElement(P, {
      color: "text"
  }, B.trim())));
  if (Q ? .trim()) I.push(oJ.createElement(w0, {
      key: "stderr"
  }, oJ.createElement(P, {
      color: "error"
  }, Q.trim())));
  return I
}


// tH1 - Lines 47910-47942
function tH1({
function tH1({
  addMargin: A,
  param: B,
  verbose: Q
}): any {
  if (B.text.trim() === AW) return null;
  if (B.text.startsWith("<bash-stdout") || B.text.startsWith("<bash-stderr")) return uG.createElement($q2, {
      content: B.text,
      verbose: Q
  });
  if (B.text.startsWith("<local-command-stdout") || B.text.startsWith("<local-command-stderr")) return uG.createElement(qq2, {
      content: B.text
  });
  if (B.text === Wu || B.text === VV) return uG.createElement(w0, {
      height: 1
  }, uG.createElement(ju, null));
  if (B.text.includes("<bash-input>")) return uG.createElement(oH1, {
      addMargin: A,
      param: B
  });
  if (B.text.includes("<command-message>")) return uG.createElement(wq2, {
      addMargin: A,
      param: B
  });
  if (B.text.includes("<user-memory-input>")) return uG.createElement(Nq2, {
      addMargin: A,
      param: B
  });
  return uG.createElement(Eq2, {
      addMargin: A,
      param: B
  })
}


// Oq2 - Lines 48016-48081
function Oq2({
function Oq2({
  attachment: A,
  addMargin: B,
  verbose: Q
}): any {
  switch (A.type) {
      case "new_directory":
          return HW.default.createElement(v$, {
              text: `Listed directory ${UA.bold(XA1(dA(),A.path)+gF5)}`
          });
      case "new_file":
          if (A.content.type === "notebook") return HW.default.createElement(v$, {
              text: `Read ${UA.bold(XA1(dA(),A.filename))} (${A.content.file.cells.length} cells)`
          });
          return HW.default.createElement(v$, {
              text: `Read ${UA.bold(XA1(dA(),A.filename))} (${A.content.type==="text"?`${A.content.file.numLines}${A.truncated?"+":""} lines`:`${UA.bold(AL(A.content.file.originalSize))}`})`
          });
      case "edited_text_file":
      case "edited_image_file":
          return null;
      case "selected_lines_in_ide":
          return HW.default.createElement(v$, {
              text: `⧉ Selected ${UA.bold(A.content.split(`
`).length)} lines from ${UA.bold(XA1(dA(),A.filename))} in ${A.ideName}`
          });
      case "nested_memory":
          return HW.default.createElement(v$, {
              text: UA.bold(XA1(dA(), A.path))
          });
      case "queued_command":
          return HW.default.createElement(tH1, {
              addMargin: B,
              param: {
                  text: A.prompt,
                  type: "text"
              },
              verbose: Q
          });
      case "opened_file_in_ide":
      case "ultramemory":
      case "plan_mode":
      case "learn_mode":
          return null;
      case "todo":
          if (A.context === "post-compact") return HW.default.createElement(v$, {
              text: `Todo list read (${A.itemCount} ${A.itemCount===1?"item":"items"})`
          });
          return null;
      case "diagnostics":
          return HW.default.createElement(Rq2, {
              attachment: A,
              verbose: Q
          });
      case "mcp_resource":
          return HW.default.createElement(v$, {
              text: `Read MCP resource ${UA.bold(A.name)} from ${A.server}`
          });
      case "command_permissions":
          if (Q) return HW.default.createElement(v$, {
              text: `Allowed ${UA.bold(A.allowedTools.length)} tools for this command: ${A.allowedTools.join(", ")}`
          });
          return HW.default.createElement(v$, {
              text: `Allowed ${UA.bold(A.allowedTools.length)} tools for this command`
          })
  }
}


// bq2 - Lines 49103-49123
function bq2({
function bq2({
  toolUseConfirm: A
}): any {
  let {
      permissionResult: B
  } = A, Q = [], I = B.behavior !== "allow" ? B.ruleSuggestions : void 0;
  if (I && I.length > 0) {
let G: any = IX5(I);
      Q = [{
          label: `Yes, and don't ask again for ${QX5(G)} commands in ${UA.bold(e9())}`,
          value: "yes-dont-ask-again-prefix"
      }]
  }
  return [{
      label: "Yes",
      value: "yes"
  }, ...Q, {
      label: `No, and tell Autocoder what to do differently (${UA.bold.dim("esc")})`,
      value: "no"
  }]
}


// GX5 - Lines 49126-49141
function GX5(A): any {
function GX5(A): any {
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
}


// I - Lines 49164-49179
  function I(): any {
  function I(): any {
      switch (B.type) {
          case "subcommandResults":
              return K8.default.createElement(h, {
                  flexDirection: "column"
              }, Array.from(B.reasons.entries()).map(([G, Z]) => {
let D: any = Z.behavior === "allow" ? V9("success", Q)(A0.tick) : V9("error", Q)(A0.cross);
                  return K8.default.createElement(h, {
                      flexDirection: "column",
                      key: G
                  }, K8.default.createElement(P, null, D, " ", G), Z.decisionReason !== void 0 && Z.decisionReason.type !== "subcommandResults" && K8.default.createElement(P, null, "  ", "⎿", "  ", gq2(Z.decisionReason)), Z.behavior !== "allow" && Z.ruleSuggestions && K8.default.createElement(P, null, "  ", "⎿", "  ", "Suggested rules:", " ", Z.ruleSuggestions.map((Y) => UA.bold(m8(Y))).join(", ")))
              }));
          default:
              return K8.default.createElement(P, null, gq2(B))
      }
  }


// Qz1 - Lines 49321-49423
function Qz1({
function Qz1({
  setToolPermissionContext: A,
  toolUseConfirm: B,
  onDone: Q,
  onReject: I,
  verbose: G
}): any {
  let [Z] = q9(), D = B.tool.userFacingName(B.input), Y = D.endsWith(" (MCP)") ? D.slice(0, -6) : D, W = AF.useMemo(() => ({
      completion_type: "tool_use_single",
      language_name: "none"
  }), []);
  KV(B, W);
let J: any = (V) => {
          switch (V) {
              case "yes":
                  o5({
                      completion_type: "tool_use_single",
                      event: "accept",
                      metadata: {
                          language_name: "none",
                          message_id: B.assistantMessage.message.id,
                          platform: mA.platform
                      }
                  }), B.onAllow("temporary", B.input), Q();
                  break;
              case "yes-dont-ask-again":
                  o5({
                      completion_type: "tool_use_single",
                      event: "accept",
                      metadata: {
                          language_name: "none",
                          message_id: B.assistantMessage.message.id,
                          platform: mA.platform
                      }
                  }), f81({
                      rule: {
                          ruleBehavior: "allow",
                          ruleValue: {
                              toolName: B.tool.name
                          },
                          source: "localSettings"
                      },
                      initialContext: B.toolUseContext.getToolPermissionContext(),
                      setToolPermissionContext: A
                  }).then(() => {
                      B.onAllow("permanent", B.input), Q()
                  });
                  break;
              case "no":
                  o5({
                      completion_type: "tool_use_single",
                      event: "reject",
                      metadata: {
                          language_name: "none",
                          message_id: B.assistantMessage.message.id,
                          platform: mA.platform
                      }
                  }), B.onReject(), I(), Q();
                  break
          }
      },
      F = e9(),
      X = AF.useMemo(() => {
          return [{
              label: "Yes",
              value: "yes"
          }, {
              label: `Yes, and don't ask again for ${UA.bold(Y)} commands in ${UA.bold(F)}`,
              value: "yes-dont-ask-again"
          }, {
              label: `No, and tell Autocoder what to do differently (${UA.bold.dim("esc")})`,
              value: "no"
          }]
      }, [Y, F]);
  return AF.default.createElement(h, {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: "permission",
      marginTop: 1,
      paddingLeft: 1,
      paddingRight: 1,
      paddingBottom: 1
  }, AF.default.createElement(mI, {
      title: "Tool use"
  }), AF.default.createElement(h, {
      flexDirection: "column",
      paddingX: 2,
      paddingY: 1
  }, AF.default.createElement(P, null, Y, "(", B.tool.renderToolUseMessage(B.input, {
      theme: Z,
      verbose: G
  }), ")", D.endsWith(" (MCP)") ? AF.default.createElement(P, {
      color: "secondaryText"
  }, " (MCP)") : ""), AF.default.createElement(P, {
      color: "secondaryText"
  }, B.description)), AF.default.createElement(h, {
      flexDirection: "column"
  }, AF.default.createElement(P, null, "Do you want to proceed?"), AF.default.createElement(p0, {
      options: X,
      onChange: J,
      onCancel: () => J("no")
  })))
}


// JT2 - Lines 52908-52940
function JT2(): any {
function JT2(): any {
let A: any = process.platform,
      B = {
          darwin: "/tmp/claude_cli_latest_screenshot.png",
          linux: "/tmp/claude_cli_latest_screenshot.png",
          win32: process.env.TEMP ? `${process.env.TEMP}\\claude_cli_latest_screenshot.png` : "C:\\Temp\\claude_cli_latest_screenshot.png"
      },
      Q = B[A] || B.linux,
      I = {
          darwin: {
              checkImage: "osascript -e 'the clipboard as «class PNGf»'",
              saveImage: `osascript -e 'set png_data to (the clipboard as «class PNGf»)' -e 'set fp to open for access POSIX file "${Q}" with write permission' -e 'write png_data to fp' -e 'close access fp'`,
              getPath: "osascript -e 'get POSIX path of (the clipboard as «class furl»)'",
              deleteFile: `rm -f "${Q}"`
          },
          linux: {
              checkImage: 'xclip -selection clipboard -t TARGETS -o | grep -E "image/(png|jpeg|jpg|gif|webp)"',
              saveImage: `xclip -selection clipboard -t image/png -o > "${Q}" || wl-paste --type image/png > "${Q}"`,
              getPath: "xclip -selection clipboard -t text/plain -o",
              deleteFile: `rm -f "${Q}"`
          },
          win32: {
              checkImage: 'powershell -Command "(Get-Clipboard -Format Image) -ne $null"',
              saveImage: `powershell -Command "$img = Get-Clipboard -Format Image; if ($img) { $img.Save('${Q.replace(/\\/g,"\\\\")}', [System.Drawing.Imaging.ImageFormat]::Png) }"`,
              getPath: 'powershell -Command "Get-Clipboard"',
              deleteFile: `del /f "${Q}"`
          }
      };
  return {
      commands: I[A] || I.linux,
      screenshotPath: Q
  }
}


// FT2 - Lines 52941-52967
async function FT2(): any {
async function FT2(): any {
  let {
      commands: A,
      screenshotPath: B
  } = JT2();
  try {
      az1(A.checkImage, {
          stdio: "ignore"
      }), az1(A.saveImage, {
          stdio: "ignore"
      });
let Q: any = x1().readFileBytesSync(B),
          {
              buffer: I
          } = await Y11(Q, Q.length, "png"),
          G = I.toString("base64"),
          Z = VT2(G);
      return az1(A.deleteFile, {
          stdio: "ignore"
      }), {
          base64: G,
          mediaType: Z
      }
  } catch {
      return null
  }
}


// fz5 - Lines 52969-52980
function fz5(): any {
function fz5(): any {
  let {
      commands: A
  } = JT2();
  try {
      return az1(A.getPath, {
          encoding: "utf-8"
      }).trim()
  } catch (B) {
      return b1(B), null
  }
}


// ET2 - Lines 53087-53131
function ET2(): any {
function ET2(): any {
let A: any = x1().existsSync(bz5(dA(), "CLAUDE.md")),
      B = WvA(dA());
  return [{
      key: "workspace",
      text: a8.createElement(P, {
          color: "secondaryText"
      }, "Ask Autocoder to create a new app or clone a repository"),
      isComplete: !1,
      isCompletable: !0,
      isEnabled: B
  }, {
      key: "claudemd",
      text: a8.createElement(P, {
          color: "secondaryText"
      }, "Run /init to create a CLAUDE.md file with instructions for Autocoder"),
      isComplete: A,
      isCompletable: !0,
      isEnabled: !B
  }, {
      key: "terminal",
      text: a8.createElement(P, {
          color: "secondaryText"
      }, "Run /terminal-setup to set up terminal integration"),
      isComplete: Boolean(ZA().shiftEnterKeyBindingInstalled || ZA().optionAsMetaKeyInstalled),
      isCompletable: !0,
      isEnabled: LE.isEnabled()
  }, {
      key: "questions",
      text: a8.createElement(P, {
          color: "secondaryText"
      }, "Use Autocoder to help with file analysis, editing, bash commands and git"),
      isComplete: !1,
      isCompletable: !1,
      isEnabled: !0
  }, {
      key: "changes",
      text: a8.createElement(P, {
          color: "secondaryText"
      }, "Be as specific as you would with another engineer for the best results"),
      isComplete: !1,
      isCompletable: !1,
      isEnabled: !0
  }]
}


// sAA - Lines 53444-53481
function sAA(A = "VSCode", B): any {
function sAA(A = "VSCode", B): any {
let Q: any = A === "VSCode" ? "Code" : A,
      I = ZT(rAA(), Aw1() === "win32" ? ZT("AppData", "Roaming", Q, "User") : Aw1() === "darwin" ? ZT("Library", "Application Support", Q, "User") : ZT(".config", Q, "User")),
      G = ZT(I, "keybindings.json");
  try {
let Z: any = "[]",
          D = [];
      if (!x1().existsSync(I)) x1().mkdirSync(I);
      if (x1().existsSync(G)) {
          Z = x1().readFileSync(G, {
              encoding: "utf-8"
          }), D = EvA(Z) ? ? [];
let F: any = LT2(4).toString("hex"),
              X = `${G}.${F}.bak`;
          try {
              x1().copyFileSync(G, X)
          } catch {
              return `${V9("warning",B)(`Error backing up existing ${A} terminal keybindings. Bailing out.`)}${GQ}${UA.dim(`See ${G}`)}${GQ}${UA.dim(`Backup path: ${X}`)}${GQ}`
          }
      }
      if (D.find((F) => F.key === "shift+enter" && F.command === "workbench.action.terminal.sendSequence" && F.when === "terminalFocus")) return `${V9("warning",B)(`Found existing ${A} terminal Shift+Enter key binding. Remove it to continue.`)}${GQ}${UA.dim(`See ${G}`)}${GQ}`;
let J: any = UvA(Z, {
          key: "shift+enter",
          command: "workbench.action.terminal.sendSequence",
          args: {
              text: `\\\r
`
          },
          when: "terminalFocus"
      });
      return x1().writeFileSync(G, J, {
          encoding: "utf-8",
          flush: !1
      }), `${V9("success",B)(`Installed ${A} terminal Shift+Enter key binding`)}${GQ}${UA.dim(`See ${G}`)}${GQ}`
  } catch (Z) {
      throw b1(Z instanceof Error ? Z : new Error(String(Z))), new Error(`Failed to install ${A} terminal Shift+Enter key binding`)
  }
}


// pT2 - Lines 54328-54345
async function pT2(A): any {
async function pT2(A): any {
  if (A.startsWith("<local-command-stdout>")) return;
  try {
let Q: any = (await cZ({
              systemPrompt: ["Analyze if this message indicates a new conversation topic. If it does, extract a 2-3 word title that captures the new topic. Format your response as a JSON object with two fields: 'isNewTopic' (boolean) and 'title' (string, or null if isNewTopic is false). Only include these fields, no other text."],
              userPrompt: A,
              enablePromptCaching: !1,
              isNonInteractiveSession: !1,
              promptCategory: "terminal_title"
          })).message.content.filter((G) => G.type === "text").map((G) => G.text).join(""),
          I = Z8(Q);
      if (I && typeof I === "object" && "isNewTopic" in I && "title" in I) {
          if (I.isNewTopic && I.title) B0A(I.title)
      }
  } catch (B) {
      b1(B)
  }
}


// w0A - Lines 55106-55112
function w0A(): any {
function w0A(): any {
let A: any = process.env.SHELL || "";
  if (A.includes("zsh")) return "zsh";
  if (A.includes("bash")) return "bash";
  if (A.includes("fish")) return "fish";
  return "unknown"
}


// uP2 - Lines 55113-55172
async function uP2(): any {
async function uP2(): any {
let A: any = w0A(),
      B = DT(),
      Q = "",
      I = A in B ? B[A] : null,
      G = `alias claude="${Dp}"`;
  try {
      if (I) {
let Z: any = YT(I);
          if (Z)
              if (Z.some((Y) => Y === G)) Q += `✓ Alias already exists in ${I}

`;
              else {
                  let {
                      filtered: Y,
                      hadAlias: W
                  } = Gp(Z);
                  if (Zp(I, [...Y, G, ""]), W) Q += `✓ Replaced old claude alias in ${I}
`;
                  else Q += `✓ Added alias to ${I}
`;
                  Q += `To use it right away, run: source ${I}

`
              }
          else Q += `To configure claude, add this line to your ${I}:
`, Q += `  ${G}
`, Q += `
Then run: source ${I}

`
      } else Q += `To configure claude, add this line to your shell config file:
`, Q += `  ${G}
`, Q += `
Then run: source <your-config-file>

`
  } catch {
      if (I) Q += `To add it to your PATH, add this line to your ${I}:
`, Q += `  alias claude="${Dp}"
`, Q += `
Then run: source ${I}

`;
      else Q += `Could not identify startup file
`, Q += `  alias claude="${Dp}"

`
  }
  if (!Q) Q += `To create an alias, add this line to your shell configuration file:
`, Q += `  ${G}

`, Q += `or create a symlink:
`, Q += `  mkdir -p ~/bin
`, Q += `  ln -sf ${Dp} ~/bin/claude
`, Q += `  # Make sure ~/bin is in your PATH
`;
  return Q
}


// sP2 - Lines 55310-55332
async function sP2(A, B, Q = 0): any {
async function sP2(A, B, Q = 0): any {
let I: any = TE(),
      G = x1(),
      Z = A.replace(I.versions + "/", ""),
      D = SB(I.locks, `${Z}.lock`);
  if (!G.existsSync(I.locks)) G.mkdirSync(I.locks);
let Y: any = null;
  try {
      return Y = await nP2.default.lock(A, {
          stale: 60000,
          retries: {
              retries: Q,
              minTimeout: Q > 0 ? 1000 : 100,
              maxTimeout: Q > 0 ? 5000 : 500
          },
          lockfilePath: D
      }), await B(), !0
  } catch (W) {
      return b1(W instanceof Error ? W : new Error(String(W))), M6(`Failed to execute version lock callback: ${W}`), !1
  } finally {
      if (Y) await Y()
  }
}


// QE5 - Lines 55466-55500
function QE5(): any {
function QE5(): any {
let A: any = w0A(),
      B = TE(),
      Q = xy(B.executable),
      I = (process.env.PATH || "").split(cw5).some((Y) => {
          try {
              return xy(Y) === Q
          } catch {
              return !1
          }
      }),
      G = DT(),
      Z = A in G ? G[A] : null;
  if (!Z) return ["Could not determine shell config file, skipping PATH setup"];
let D: any = A === "fish" ? `set -gx PATH "${B.executable}" $PATH` : `export PATH="${B.executable}:$PATH"`;
  try {
let Y: any = [],
          W = YT(Z) || [],
          J = A === "fish" ? new RegExp(`set\\s+-gx\\s+PATH\\s+"?${B.executable}"?`) : new RegExp(`export\\s+PATH="?${B.executable}:?`),
          F = W.some((K) => J.test(K)),
          {
              filtered: X,
              hadAlias: V
          } = Gp(W),
          C = V;
      if (V) W = X, Y.push(`Removed old claude alias from ${Z}`);
      if (!F && !I) W = [...W, D, ""], C = !0, Y.push(`Added ~/.local/bin to PATH in ${Z}`, `You may need to restart your shell or run: source ${Z}`);
      else if (!I && F) Y.push(`~/.local/bin is configured in ${Z} but not in current PATH`, `You may need to restart your shell or run: source ${Z}`);
      else if (I && !F && V) Y.push("~/.local/bin was already in your PATH (not added by claude)", "Autocoder installation is working correctly.");
      if (C) Zp(Z, W);
      return Y
  } catch (Y) {
      return b1(Y instanceof Error ? Y : new Error(String(Y))), ["Failed to update PATH.", Y instanceof Error ? Y.message : String(Y)]
  }
}


// ZE5 - Lines 55604-55640
function ZE5(): any {
function ZE5(): any {
let A: any = TE();
  return `#!/bin/bash

# Autocoder CLI Launcher Script

# Set terminal title
printf '\\033]0;claude\\007'

# XDG-based locations
VERSIONS_DIR="${A.versions}"
LATEST_LINK="${A.symlinks}/latest"

# Try to run the latest symlink if it exists
if [[ -L "$LATEST_LINK" ]] && [[ -x "$LATEST_LINK" ]]; then
  exec "$LATEST_LINK" "$@"
fi

# If latest doesn't exist or failed to execute, try versions by modification time
if [[ -d "$VERSIONS_DIR" ]]; then
  # Use ls -t to sort by modification time (newest first)
  # Filter for executable files only
  for VERSION_FILE in $(ls -t "$VERSIONS_DIR" 2>/dev/null); do
      FULL_PATH="$VERSIONS_DIR/$VERSION_FILE"
      if [[ -f "$FULL_PATH" ]] && [[ -x "$FULL_PATH" ]]; then
          exec "$FULL_PATH" "$@"
      fi
  done
fi

# No binary found
echo "Error: No Autocoder CLI binary found." >&2
echo "Looked for:" >&2
echo "  Latest symlink: $LATEST_LINK" >&2
echo "  Versions directory: $VERSIONS_DIR" >&2
exit 1`
}


// EE5 - Lines 55909-55962
function EE5(A): any {
function EE5(A): any {
let B: any = [],
      Q = ZA();
  if (A === "development") return B;
let I: any = !1,
      G = "";
  try {
      G = iA1("which", ["claude"], {
          encoding: "utf8"
      }).trim(), I = !!G
  } catch {}
  if (A === "npm-local" && Q.installMethod !== "local") B.push({
      issue: `Running from local installation but config install method is '${Q.installMethod}'`,
      fix: "Run claude migrate-installer to fix configuration"
  });
  if (A === "native" && Q.installMethod !== "native") B.push({
      issue: `Running native installation but config install method is '${Q.installMethod}'`,
      fix: "Run claude install to update configuration"
  });
  if (A === "npm-global" && i$()) B.push({
      issue: "Local installation exists but not being used",
      fix: "Consider using local installation: claude migrate-installer"
  });
  if (I && i$() && A === "npm-global") B.push({
      issue: "PATH points to global installation but local installation exists",
      fix: "Consider using local installation: claude migrate-installer"
  });
  if (A === "npm-local" && !I) B.push({
      issue: "Local installation not accessible via PATH",
      fix: 'Create alias: alias claude="~/.claude/local/claude"'
  });
  if (A === "npm-local" && I) {
      if (G && !G.includes(".claude/local")) {
let Z: any = H0A(),
              D = hP2();
          if (Z && D) {
let Y: any = mP2(),
                  W = Y ? `source ${Y}` : "source your shell config";
              B.push({
                  issue: `PATH contains different installation: ${G}`,
                  fix: `Alias already configured but not active. Restart shell or run: ${W}`
              })
          } else if (Z && !D) B.push({
              issue: `PATH contains different installation: ${G}`,
              fix: `Alias exists but points to invalid target: ${Z}. Update alias: alias claude="~/.claude/local/node_modules/.bin/claude"`
          });
          else B.push({
              issue: `PATH contains different installation: ${G}`,
              fix: 'Create alias to override: alias claude="~/.claude/local/node_modules/.bin/claude"'
          })
      }
  }
  return B
}


// qE5 - Lines 56141-56151
function qE5({
function qE5({
  type: A
}): any {
  return FB.createElement(FB.Fragment, null, A === "Project" && FB.createElement(P, {
      dimColor: !0
  }, "Example project memory: “Run lint with the following command after major edits: npm run lint”"), A === "Local" && FB.createElement(P, {
      dimColor: !0
  }, "Example local memory: “Use my sandbox URL for testing: https://myapp.local”"), A === "User" && FB.createElement(P, {
      dimColor: !0
  }, "Example user memory: “Don't add new comments when editing code”"), A === "ExperimentalUltraClaudeMd" && !1)
}


// WS2 - Lines 56277-56351
function WS2({
function WS2({
  commands: A,
  onClose: B
}): any {
let Q: any = `Learn more at: ${{ISSUES_EXPLAINER:"report the issue at https://github.com/elizaos/eliza/issues",PACKAGE_URL:"@elizaos/code",README_URL:"https://eliza.how",VERSION:"1.0.34"}.README_URL}`,
      I = A.filter((Y) => !Y.isHidden).sort((Y, W) => Y.name.localeCompare(W.name)),
      [G, Z] = Z2.useState(0);
  Z2.useEffect(() => {
let Y: any = setTimeout(() => {
          if (G < 3) Z(G + 1)
      }, 250);
      return () => clearTimeout(Y)
  }, [G]), Z0((Y, W) => {
      if (W.return || W.escape) B()
  });
let D: any = Y2(B);
  return Z2.createElement(h, {
      flexDirection: "column",
      padding: 1
  }, Z2.createElement(P, {
      bold: !0,
      color: "claude"
  }, `${m0} v${{ISSUES_EXPLAINER:"report the issue at https://github.com/elizaos/eliza/issues",PACKAGE_URL:"@elizaos/code",README_URL:"https://eliza.how",VERSION:"1.0.34"}.VERSION}`), Z2.createElement(h, {
      marginTop: 1,
      flexDirection: "column"
  }, Z2.createElement(P, null, "Always review Autocoder's responses, especially when running code. Autocoder has read access to files in the current directory and can run commands and edit files with your permission.")), G >= 1 && Z2.createElement(h, {
      flexDirection: "column",
      marginTop: 1
  }, Z2.createElement(P, {
      bold: !0
  }, "Usage Modes:"), Z2.createElement(P, null, "• REPL: ", Z2.createElement(P, {
      bold: !0
  }, "claude"), " (interactive session)"), Z2.createElement(P, null, "• Non-interactive: ", Z2.createElement(P, {
      bold: !0
  }, 'claude -p "question"')), Z2.createElement(h, {
      marginTop: 1
  }, Z2.createElement(P, null, "Run ", Z2.createElement(P, {
      bold: !0
  }, "claude -h"), " for all command line options"))), G >= 2 && Z2.createElement(h, {
      marginTop: 1,
      flexDirection: "column"
  }, Z2.createElement(P, {
      bold: !0
  }, "Common Tasks:"), Z2.createElement(P, null, "• Ask questions about your codebase", " ", Z2.createElement(P, {
      color: "secondaryText"
  }, "> How does foo.py work?")), Z2.createElement(P, null, "• Edit files", " ", Z2.createElement(P, {
      color: "secondaryText"
  }, "> Update bar.ts to...")), Z2.createElement(P, null, "• Fix errors ", Z2.createElement(P, {
      color: "secondaryText"
  }, "> cargo build")), Z2.createElement(P, null, "• Run commands ", Z2.createElement(P, {
      color: "secondaryText"
  }, "> /help")), Z2.createElement(P, null, "• Run bash commands ", Z2.createElement(P, {
      color: "secondaryText"
  }, "> !ls"))), G >= 3 && Z2.createElement(h, {
      marginTop: 1,
      flexDirection: "column"
  }, Z2.createElement(P, {
      bold: !0
  }, "Interactive Mode Commands:"), Z2.createElement(h, {
      flexDirection: "column"
  }, I.map((Y, W) => Z2.createElement(h, {
      key: W,
      marginLeft: 1
  }, Z2.createElement(P, {
      bold: !0
  }, `/${Y.name}`), Z2.createElement(P, null, " - ", Y.description))))), Z2.createElement(h, {
      marginTop: 1
  }, Z2.createElement(P, {
      color: "secondaryText"
  }, Q)), Z2.createElement(h, {
      marginTop: 2
  }, D.pending ? Z2.createElement(P, {
      dimColor: !0
  }, "Press ", D.keyName, " again to exit") : Z2.createElement(bw, null)))
}


// Hp - Lines 58956-59117
function Hp(): any {
function Hp(): any {
  let [A, B] = v2.useState("intro"), [Q, I] = v2.useState(""), [G, Z] = v2.useState("");
  if (Y2(() => {
          FT("canceled", "user_exit"), MI(1)
      }), v2.useEffect(() => {
          FT("start")
      }, []), v2.useEffect(() => {
let D: any = async () => {
                  try {
                      if (!z0A()) I("Local package creation failed"), B("error"), FT("failure", "environement_setup");
                      switch (await Yp()) {
                          case "success":
                              {
                                  B("success"),
                                  FT("success");
                                  break
                              }
                          case "in_progress":
                              I("Update already in progress"), B("error"), FT("failure", "in_progress");
                              break;
                          case "install_failed":
                              I(`Install of ${{ISSUES_EXPLAINER:"report the issue at https://github.com/elizaos/eliza/issues",PACKAGE_URL:"@elizaos/code",README_URL:"https://eliza.how",VERSION:"1.0.34"}.PACKAGE_URL} failed`), B("error"), FT("failure", "other_failure");
                              break
                      }
                  } catch (J) {
                      I(String(J)), B("error"), FT("failure", "unexpected_error")
                  }
              },
              Y = async () => {
                  try {
let J: any = await uP2();
                      Z(J), B("setup")
                  } catch (J) {
                      I(String(J)), B("error")
                  }
              },
              W = async () => {
                  try {
                      if (await pP2()) B("uninstall-success");
                      else B("uninstall-failed")
                  } catch (J) {
                      I(String(J)), B("uninstall-failed")
                  }
              };
          switch (A) {
              case "installing":
                  D();
                  break;
              case "setup-alias":
                  Y();
                  break;
              case "uninstall":
                  W();
                  break;
              default:
                  break
          }
      }, [A]), A === "intro") return v2.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, v2.default.createElement(P, {
      bold: !0
  }, m0, " Local Installer"), v2.default.createElement(h, {
      flexDirection: "column"
  }, v2.default.createElement(P, {
      color: "secondaryText"
  }, `This will install ${m0} to ~/.claude/local`), v2.default.createElement(P, {
      color: "secondaryText"
  }, "instead of using a global npm installation.")), v2.default.createElement(Kp, {
      onPress: () => B("installing")
  }));
  if (A === "installing") return v2.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, v2.default.createElement(P, {
      bold: !0
  }, "Installing ", m0, " locally..."), v2.default.createElement(h, {
      marginY: 1
  }, v2.default.createElement(oD, null), v2.default.createElement(P, null, " Installing to ", Dp)));
  if (A === "success") return v2.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, v2.default.createElement(P, {
      bold: !0,
      color: "success"
  }, "✓ Local installation successful!"), v2.default.createElement(h, {
      marginY: 1
  }, v2.default.createElement(P, null, "Next, let's add an alias for `claude`")), v2.default.createElement(Kp, {
      onPress: () => B("setup-alias")
  }));
  if (A === "setup-alias") return v2.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, v2.default.createElement(P, {
      bold: !0
  }, "Setting up alias for claude..."), v2.default.createElement(h, {
      marginY: 1
  }, v2.default.createElement(oD, null), v2.default.createElement(P, null, " Configuring shell environment")));
  if (A === "setup") return v2.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, v2.default.createElement(P, {
      bold: !0
  }, "Alias setup complete"), v2.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, v2.default.createElement(P, null, G), v2.default.createElement(h, {
      marginY: 1
  }, v2.default.createElement(P, null, "Next, we'll remove the globally installed npm package"))), v2.default.createElement(Kp, {
      onPress: () => B("uninstall")
  }));
  if (A === "uninstall") return v2.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, v2.default.createElement(P, {
      bold: !0
  }, "Uninstalling global ", m0, "..."), v2.default.createElement(h, {
      marginY: 1
  }, v2.default.createElement(oD, null), v2.default.createElement(P, null, " Removing global npm installation")));
  if (A === "uninstall-success") return v2.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, v2.default.createElement(P, {
      bold: !0,
      color: "success"
  }, "✓ Global installation removed successfully!"), v2.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, v2.default.createElement(P, null, m0, " is now installed locally."), v2.default.createElement(P, null, "Please restart your shell, then run", " ", v2.default.createElement(P, {
      color: "claude"
  }, UA.bold("claude")), "."), v2.default.createElement(h, {
      flexDirection: "row",
      marginY: 1
  }, v2.default.createElement(oD, null), v2.default.createElement(P, null, " Happy Clauding!"))), v2.default.createElement(Kp, {
      onPress: () => MI(0)
  }));
  if (A === "uninstall-failed") return v2.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, v2.default.createElement(P, {
      bold: !0,
      color: "warning"
  }, "! Could not remove global installation"), v2.default.createElement(h, {
      marginY: 1
  }, v2.default.createElement(P, null, "The local installation is installed, but we couldn't remove the global npm package automatically.")), v2.default.createElement(h, {
      marginY: 1
  }, v2.default.createElement(P, null, "You can remove it manually later with:", `
`, UA.bold(`npm uninstall -g --force ${{ISSUES_EXPLAINER:"report the issue at https://github.com/elizaos/eliza/issues",PACKAGE_URL:"@elizaos/code",README_URL:"https://eliza.how",VERSION:"1.0.34"}.PACKAGE_URL}`))), v2.default.createElement(Kp, {
      onPress: () => MI(0)
  }));
  return v2.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, v2.default.createElement(P, {
      bold: !0,
      color: "error"
  }, "✗ Installation failed"), v2.default.createElement(h, {
      marginY: 1
  }, v2.default.createElement(P, null, Q || "An unexpected error occurred during installation.")), v2.default.createElement(Kp, {
      onPress: () => MI(1)
  }))
}


// b0A - Lines 59213-59271
function b0A({
function b0A({
  server: A,
  serverToolsCount: B,
  onViewTools: Q,
  onCancel: I
}): any {
  let [G] = q9(), Z = Y2(), [D] = d5(), Y = A.name.charAt(0).toUpperCase() + A.name.slice(1), W = y81(D.mcp.commands, A.name).length, J = [];
  if (A.client.type === "connected" && B > 0) J.push({
      label: "View tools",
      value: "tools"
  });
  if (J.length === 0) J.push({
      label: "Back",
      value: "back"
  });
  return A8.default.createElement(A8.default.Fragment, null, A8.default.createElement(h, {
      flexDirection: "column",
      paddingX: 1,
      borderStyle: "round"
  }, A8.default.createElement(h, {
      marginBottom: 1
  }, A8.default.createElement(P, {
      bold: !0
  }, Y, " MCP Server")), A8.default.createElement(h, {
      flexDirection: "column",
      gap: 0
  }, A8.default.createElement(h, null, A8.default.createElement(P, {
      bold: !0
  }, "Status: "), A.client.type === "connected" ? A8.default.createElement(P, null, V9("success", G)(A0.tick), " connected") : A.client.type === "pending" ? A8.default.createElement(P, null, V9("secondaryText", G)(A0.radioOff), " connecting…") : A8.default.createElement(P, null, V9("error", G)(A0.cross), " failed")), A8.default.createElement(h, null, A8.default.createElement(P, {
      bold: !0
  }, "Command: "), A8.default.createElement(P, {
      color: "secondaryText"
  }, A.config.command)), A.config.args && A.config.args.length > 0 && A8.default.createElement(h, null, A8.default.createElement(P, {
      bold: !0
  }, "Args: "), A8.default.createElement(P, {
      color: "secondaryText"
  }, A.config.args.join(" "))), A.client.type === "connected" && A8.default.createElement(jw1, {
      serverToolsCount: B,
      serverPromptsCount: W,
      serverResourcesCount: D.mcp.resources[A.name] ? .length || 0
  }), A.client.type === "connected" && B > 0 && A8.default.createElement(h, null, A8.default.createElement(P, {
      bold: !0
  }, "Tools: "), A8.default.createElement(P, {
      color: "secondaryText"
  }, B, " tools"))), J.length > 0 && A8.default.createElement(h, {
      marginTop: 1
  }, A8.default.createElement(p0, {
      options: J,
      onChange: (F) => {
          if (F === "tools") Q();
          else if (F === "back") I()
      },
      onCancel: I
  }))), A8.default.createElement(h, {
      marginLeft: 3
  }, A8.default.createElement(P, {
      dimColor: !0
  }, Z.pending ? A8.default.createElement(A8.default.Fragment, null, "Press ", Z.keyName, " again to exit") : A8.default.createElement(A8.default.Fragment, null, "Esc to go back"))))
}


// N_2 - Lines 60744-60800
function N_2({
function N_2({
  sections: A,
  version: B,
  onClose: Q
}): any {
  Z0((W, J) => {
      if (J.return || J.escape) Q()
  });
let I: any = Y2(Q),
      [{
          mainLoopModel: G,
          maxRateLimitFallbackActive: Z
      }] = d5(),
      D = Hu(),
      Y = vU5(G, Z, D.resetsAt);
  return A = [...A, {
      title: "Model",
      command: "/model",
      items: [{
          label: Y,
          type: "info"
      }]
  }], s4.createElement(h, {
      flexDirection: "column",
      width: "100%",
      padding: 1
  }, s4.createElement(h, {
      flexDirection: "column",
      gap: 1
  }, s4.createElement(h, null, s4.createElement(P, {
      bold: !0
  }, "Autocoder Status "), s4.createElement(P, {
      color: "secondaryText"
  }, "v", B)), s4.createElement(h, null, s4.createElement(P, {
      color: "secondaryText"
  }, " L "), s4.createElement(P, null, "Session ID: ", y9())), A.map((W, J) => (W.items && W.items.length > 0 || W.content) && s4.createElement(h, {
      key: J,
      flexDirection: "column",
      gap: 0
  }, s4.createElement(h, null, s4.createElement(P, {
      bold: !0
  }, W.title, " "), W.command && s4.createElement(P, {
      color: "secondaryText"
  }, "• ", W.command)), W.items ? .map((F, X) => s4.createElement(h, {
      key: X
  }, F.type === "check" ? s4.createElement(P, {
      color: "success"
  }, A0.tick, " ") : F.type === "error" ? s4.createElement(P, {
      color: "error"
  }, A0.warning, " ") : s4.createElement(P, {
      color: "secondaryText"
  }, " L "), s4.createElement(P, null, F.label))), W.content)), s4.createElement(h, {
      marginTop: 1
  }, I.pending ? s4.createElement(P, {
      dimColor: !0
  }, "Press ", I.keyName, " again to exit") : s4.createElement(bw, null))))
}


// bU5 - Lines 60802-60846
function bU5(A, B = null): any {
function bU5(A, B = null): any {
  if (!KK() || !mA.terminal) return null;
let Q: any = A ? .find((Z) => Z.name === "ide"),
      I = ft(mA.terminal),
      G = [];
  if (Q)
      if (Q.type === "connected") G.push({
          label: `Connected to ${I} extension`,
          type: "check"
      });
      else G.push({
          label: `Not connected to ${I}`,
          type: "error"
      });
  if (B && B.installed)
      if (B && Q && Q.type === "connected" && B.installedVersion !== Q.serverInfo ? .version) G.push({
          label: `Installed ${I} extension version ${B.installedVersion} (server version: ${Q.serverInfo?.version})`,
          type: "info"
      });
      else if (hZ && Q ? .type !== "connected") G.push({
      label: `Installed ${I} plugin but connection is not established.
Please restart your IDE or try installing from https://eliza.how-jetbrains`,
      type: "info"
  });
  else G.push({
      label: `Installed ${I} extension`,
      type: "check"
  });
  if (B && B.error)
      if (hZ) G.push({
          label: `Error installing ${I} plugin: ${B.error}
Please restart your IDE or try installing from https://eliza.how-jetbrains`,
          type: "error"
      });
      else G.push({
          label: `Error installing ${I} extension: ${B.error}
Please restart your IDE and try again.`,
          type: "error"
      });
  return {
      title: "IDE Integration",
      command: "/config",
      items: G
  }
}


// gU5 - Lines 60848-60861
function gU5(A = []): any {
function gU5(A = []): any {
let B: any = [];
  if (A.filter((I) => I.name !== "ide").forEach((I) => {
          B.push({
              label: I.name,
              type: I.type === "failed" ? "error" : I.type === "pending" ? "info" : "check"
          })
      }), B.length === 0) return null;
  return {
      title: "MCP servers",
      command: "/mcp",
      items: B
  }
}


// hU5 - Lines 60863-60887
function hU5(A): any {
function hU5(A): any {
let B: any = NH1(),
      Q = dG(),
      I = lO();
  if (Q.length === 0 && B.length === 0 && !I) return null;
let G: any = [];
  if (B.forEach((Z) => {
let D: any = p81(Z.path);
          G.push({
              label: `Large ${D} will impact performance (${_G(Z.content.length)} chars > ${_G(k11)})`,
              type: "error"
          })
      }), I && I.content.length > Uu) G.push({
      label: `ULTRACLAUDE.md file exceeds ${_G(Uu)} characters (${_G(I.content.length)} chars)`,
      type: "error"
  });
  return {
      title: "Memory",
      command: "/memory",
      items: G,
      content: rK.createElement(Mw1, {
          context: A
      })
  }
}


// mU5 - Lines 60889-60900
function mU5(): any {
function mU5(): any {
let A: any = [],
      B = dA();
  return A.push({
      label: B,
      type: "info"
  }), {
      title: "Working Directory",
      command: "",
      items: A
  }
}


// dU5 - Lines 60901-60912
async function dU5(): any {
async function dU5(): any {
let A: any = await Jp();
  if (A.length === 0) return null;
  return {
      title: "Installation",
      command: "",
      items: A.map((Q) => ({
          label: Q,
          type: "info"
      }))
  }
}


// Mp - Lines 61094-61110
function Mp(): any {
function Mp(): any {
  let [A, B] = qp.useState([]), Q = qp.useCallback(() => {
      B(XE.getAllShells())
  }, []);
  return qp.useEffect(() => {
      Q();
let I: any = XE.subscribe(() => {
          Q()
      });
      return () => {
          I()
      }
  }, [Q]), {
      shells: A,
      killShell: (I) => XE.killShell(I)
  }
}


// q_2 - Lines 61114-61250
function q_2({
function q_2({
  shell: A,
  onDone: B,
  onKillShell: Q
}): any {
  let [I, G] = tA1.useState(0), [Z, D] = tA1.useState({
      stdout: "",
      stderr: "",
      stdoutLines: 0,
      stderrLines: 0
  });
  Z0((F, X) => {
      if (X.escape) B();
      else if (F === "k" && A.status === "running" && Q) Q()
  });
let Y: any = Y2(),
      W = (F) => {
let X: any = Math.floor((Date.now() - F) / 1000),
              V = Math.floor(X / 3600),
              C = Math.floor((X - V * 3600) / 60),
              K = X - V * 3600 - C * 60;
          return `${V>0?`${V}h `:""}${C>0||V>0?`${C}m `:""}${K}s`
      };
  tA1.useEffect(() => {
let F: any = XE.getShellOutput(A.id),
          X = (O, R, T = 10) => {
              if (!R) return O;
let L: any = O.split(`
`),
                  _ = R.split(`
`);
              return [...L, ..._].slice(-T).join(`
`)
          },
          V = X(Z.stdout, F.stdout),
          C = X(Z.stderr, F.stderr),
          {
              totalLines: K,
              truncatedContent: E
          } = bO(V),
          {
              totalLines: N,
              truncatedContent: q
          } = bO(C);
      if (D({
              stdout: E,
              stderr: q,
              stdoutLines: K,
              stderrLines: N
          }), A.status === "running") {
let O: any = setTimeout(() => {
              G((R) => R + 1)
          }, 1000);
          return () => clearTimeout(O)
      }
  }, [A.id, A.status, I, Z.stdout, Z.stderr]);
let J: any = A.command.length > 70 ? A.command.substring(0, 67) + "..." : A.command;
  return l6.default.createElement(h, {
      width: "100%",
      flexDirection: "column"
  }, l6.default.createElement(h, {
      width: "100%"
  }, l6.default.createElement(h, {
      borderStyle: "round",
      borderColor: "permission",
      flexDirection: "column",
      padding: 1,
      width: "100%"
  }, l6.default.createElement(h, null, l6.default.createElement(P, {
      color: "permission",
      bold: !0
  }, "Bash Details")), l6.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, l6.default.createElement(P, null, l6.default.createElement(P, {
      bold: !0
  }, "ID:"), " ", A.id), l6.default.createElement(P, null, l6.default.createElement(P, {
      bold: !0
  }, "Status:"), " ", A.status === "running" ? l6.default.createElement(P, {
      color: "permission"
  }, A.status, A.result ? .code !== void 0 && ` (exit code: ${A.result.code})`) : A.status === "completed" ? l6.default.createElement(P, {
      color: "success"
  }, A.status, A.result ? .code !== void 0 && ` (exit code: ${A.result.code})`) : l6.default.createElement(P, {
      color: "error"
  }, A.status, A.result ? .code !== void 0 && ` (exit code: ${A.result.code})`)), l6.default.createElement(P, null, l6.default.createElement(P, {
      bold: !0
  }, "Runtime:"), " ", W(A.startTime)), l6.default.createElement(P, {
      wrap: "truncate-end"
  }, l6.default.createElement(P, {
      bold: !0
  }, "Command:"), " ", J)), l6.default.createElement(h, {
      flexDirection: "column",
      marginY: 1
  }, l6.default.createElement(P, {
      bold: !0
  }, "STDOUT:"), Z.stdout ? l6.default.createElement(l6.default.Fragment, null, l6.default.createElement(h, {
      borderStyle: "round",
      borderColor: "secondaryBorder",
      paddingX: 1,
      flexDirection: "column",
      height: 7
  }, Z.stdout.split(`
`).slice(-5).map((F, X) => l6.default.createElement(P, {
      key: X,
      wrap: "truncate-end"
  }, F))), l6.default.createElement(P, {
      dimColor: !0,
      italic: !0
  }, Z.stdoutLines > 5 ? `Showing last 5 lines of ${Z.stdoutLines} total lines` : `Showing ${Z.stdoutLines} lines`)) : l6.default.createElement(P, {
      dimColor: !0
  }, "No stdout output available")), Z.stderr && l6.default.createElement(h, {
      flexDirection: "column",
      marginBottom: 1
  }, l6.default.createElement(P, {
      bold: !0,
      color: "error"
  }, "STDERR:"), l6.default.createElement(h, {
      borderStyle: "round",
      borderColor: "error",
      paddingX: 1,
      flexDirection: "column",
      height: 3
  }, Z.stderr.split(`
`).slice(-1).map((F, X) => l6.default.createElement(P, {
      key: X,
      color: "error",
      wrap: "truncate-end"
  }, F))), l6.default.createElement(P, {
      dimColor: !0,
      italic: !0,
      color: "error"
  }, Z.stderrLines > 1 ? `Showing last line of ${Z.stderrLines} total lines` : `Showing ${Z.stderrLines} line`)))), l6.default.createElement(h, null, Y.pending ? l6.default.createElement(P, {
      dimColor: !0
  }, "Press ", Y.keyName, " again to exit") : l6.default.createElement(P, {
      dimColor: !0
  }, "Press esc to close", A.status === "running" && Q ? l6.default.createElement(P, null, " · k to kill shell") : null)))
}


// M_2 - Lines 61252-61317
function M_2({
function M_2({
  onDone: A
}): any {
  let {
      shells: B,
      killShell: Q
  } = Mp(), [I, G] = fw1.useState(null);
  fw1.useEffect(() => {
      if (I && !B.some((J) => J.id === I)) G(null)
  }, [I, B]);
let Z: any = (J) => {
          G(J)
      },
      D = (J) => {
          Q(J)
      };
  Z0((J, F) => {
      if (!I && F.escape) A()
  });
let Y: any = Y2();
  if (I) {
let J: any = B.find((F) => F.id === I);
      if (!J) return null;
      return aG.default.createElement(q_2, {
          shell: J,
          onDone: A,
          onKillShell: () => D(J.id),
          key: `shell-${J.id}`
      })
  }
let W: any = B.map((J) => ({
      label: `Shell ${J.id}: ${J.command.length>40?J.command.substring(0,37)+"...":J.command} (${J.status})`,
      value: J.id
  }));
  return aG.default.createElement(h, {
      width: "100%",
      flexDirection: "column"
  }, aG.default.createElement(h, {
      borderStyle: "round",
      borderColor: "permission",
      flexDirection: "column",
      padding: 1,
      width: "100%"
  }, aG.default.createElement(h, null, aG.default.createElement(P, {
      color: "permission",
      bold: !0
  }, "Background Bash Shells")), B.length === 0 ? aG.default.createElement(h, {
      marginY: 1
  }, aG.default.createElement(P, null, "No background shells currently running")) : aG.default.createElement(aG.default.Fragment, null, aG.default.createElement(h, null, aG.default.createElement(P, {
      dimColor: !0
  }, "Select a shell to view details:")), aG.default.createElement(h, {
      flexDirection: "column",
      marginTop: 1,
      marginBottom: 1
  }, aG.default.createElement(p0, {
      options: W,
      onChange: Z,
      onCancel: A
  })))), aG.default.createElement(h, {
      marginLeft: 2
  }, Y.pending ? aG.default.createElement(P, {
      dimColor: !0
  }, "Press ", Y.keyName, " again to exit") : aG.default.createElement(P, {
      dimColor: !0
  }, "Press esc to close")))
}


// aU5 - Lines 61336-61347
function aU5(): any {
function aU5(): any {
let A: any = ZA(),
      B = A.editorMode || "normal";
  if (B === "emacs") B = "normal";
let Q: any = B === "normal" ? "vim" : "normal";
  return j0({ ...A,
      editorMode: Q
  }), E1("tengu_editor_mode_changed", {
      mode: Q,
      source: "command"
  }), Promise.resolve(`Editor mode set to ${Q}. ${Q==="vim"?"Use Escape key to toggle between INSERT and NORMAL modes.":"Using standard (readline) keyboard bindings."}`)
}


// bw1 - Lines 61363-61390
function bw1({
function bw1({
  ruleValue: A
}): any {
  switch (A.toolName) {
      case E4.name:
          if (A.ruleContent)
              if (A.ruleContent.endsWith(":*")) return eD.createElement(P, {
                  color: "secondaryText"
              }, "Any Bash command starting with", " ", eD.createElement(P, {
                  bold: !0
              }, A.ruleContent.slice(0, -2)));
              else return eD.createElement(P, {
                  color: "secondaryText"
              }, "The Bash command ", eD.createElement(P, {
                  bold: !0
              }, A.ruleContent));
          else return eD.createElement(P, {
              color: "secondaryText"
          }, "Any Bash command");
      default:
          if (!A.ruleContent) return eD.createElement(P, {
              color: "secondaryText"
          }, "Any use of the ", eD.createElement(P, {
              bold: !0
          }, A.toolName), " tool");
          else return null
  }
}


// u_2 - Lines 62375-62394
async function u_2(A): any {
async function u_2(A): any {
  return `Launch a new agent that has access to the following tools: ${A.filter((Q)=>Q.name!==cX).map((Q)=>Q.name).join(", ")}. When you are searching for a keyword or file and are not confident that you will find the right match in the first few tries, use the Agent tool to perform the search for you.

When to use the Agent tool:
- If you are searching for a keyword like "config" or "logger", or for questions like "which file does X?", the Agent tool is strongly recommended

When NOT to use the Agent tool:
- If you want to read a specific file path, use the ${OB.name} or ${g$.name} tool instead of the Agent tool, to find the match more quickly
- If you are searching for a specific class definition like "class Foo", use the ${g$.name} tool instead, to find the match more quickly
- If you are searching for code within a specific file or set of 2-3 files, use the ${OB.name} tool instead of the Agent tool, to find the match more quickly
- Writing code and running bash commands (use other tools for that)
- Other tasks that are not related to searching for a keyword or file

Usage notes:
1. Launch multiple agents concurrently whenever possible, to maximize performance; to do that, use a single message with multiple tool uses
2. When the agent is done, it will return a single message back to you. The result returned by the agent is not visible to the user. To show the user the result, you should send a text message back to the user with a concise summary of the result.
3. Each agent invocation is stateless. You will not be able to send additional messages to the agent, nor will the agent be able to communicate with you outside of its final report. Therefore, your prompt should contain a highly detailed task description for the agent to perform autonomously and you should specify exactly what information the agent should return back to you in its final and only message to you.
4. The agent's outputs should generally be trusted
5. Clearly tell the agent whether you expect it to write code or just to do research (search, file reads, web fetches, etc.), since it is not aware of the user's intent`
}


// o_2 - Lines 63250-63282
async function o_2(A, B, Q): any {
async function o_2(A, B, Q): any {
let I: any = A;
  return await Promise.all([...A.matchAll(LN5), ...A.matchAll(RN5)].map(async (G) => {
let Z: any = G[1] ? .trim();
      if (Z) try {
let D: any = await E4.validateInput({
              command: Z
          });
          if (!D.result) {
              M6(`Bash command validation failed for command in ${Q}: ${Z}. Error: ${D.message}`), I = I.replace(G[0], `[Error: ${D.message}]`);
              return
          }
let Y: any = await sM(E4, {
              command: Z
          }, B, xK({
              content: []
          }));
          if (Y.behavior !== "allow") {
              M6(`Bash command permission check failed for command in ${Q}: ${Z}. Error: ${Y.message}`), I = I.replace(G[0], `[Error: ${Y.message||"Permission denied"}]`);
              return
          }
          let {
              data: W
          } = await aJ(E4.call({
              command: Z
          }, B)), J = t_2(W.stdout, W.stderr);
          I = I.replace(G[0], J)
      } catch (D) {
let Y: any = ON5(D);
          I = I.replace(G[0], Y)
      }
  })), I
}


// ON5 - Lines 63295-63303
function ON5(A, B = !1): any {
function ON5(A, B = !1): any {
  if (A instanceof Uz) {
      if (A.interrupted) return "[Command interrupted]";
      return t_2(A.stdout, A.stderr, B)
  }
let Q: any = A instanceof Error ? A.message : String(A);
  return B ? `[Error: ${Q}]` : `[Error]
${Q}`
}


// PN5 - Lines 63305-63316
function PN5(A): any {
function PN5(A): any {
let B: any = A.split(`
`);
  for (let Q of B) {
let I: any = Q.trim();
      if (I) {
let Z: any = I.match(/^#+\s+(.+)$/) ? .[1] ? ? I;
          return Z.length > 100 ? Z.substring(0, 97) + "..." : Z
      }
  }
  return "Custom command"
}


// xN5 - Lines 63484-63511
function xN5({
function xN5({
  onDone: A
}): any {
  let [{
      mainLoopModel: B
  }, Q] = d5();
  return Z0((I, G) => {
      if (G.escape) {
          E1("tengu_model_command_menu", {
              action: "cancel"
          });
let Z: any = B ? ? C_().label;
          A(`Kept model as ${UA.bold(Z)}`);
          return
      }
  }), r$.createElement(Dw1, {
      initial: B,
      onSelect: (I) => {
          E1("tengu_model_command_menu", {
              action: I,
              from_model: B,
              to_model: I
          }), Q((G) => ({ ...G,
              mainLoopModel: I
          })), A(`Set model to ${UA.bold(z_(I))}`)
      }
  })
}


// cw1 - Lines 63605-63609
function cw1(A, B): any {
function cw1(A, B): any {
let Q: any = B.find((I) => I.userFacingName() === A || I.aliases ? .includes(A));
  if (!Q) throw ReferenceError(`Command ${A} not found. Available commands: ${B.map((I)=>{let G=I.userFacingName();return I.aliases?`${G} (aliases: ${I.aliases.join(", ")})`:G}).join(", ")}`);
  return Q
}


// Yj2 - Lines 63638-63712
function Yj2(A, B): any {
function Yj2(A, B): any {
  if (!lw1(A)) return [];
  if (mN5(A)) return [];
let Q: any = A.slice(1).toLowerCase();
  if (Q.trim() === "") {
let Y: any = B.filter((V) => !V.isHidden),
          W = [],
          J = [],
          F = [];
      Y.forEach((V) => {
let C: any = V.description;
          if (C.endsWith(` (${Z2A})`)) W.push(V);
          else if (C.endsWith(` (${dw1})`)) J.push(V);
          else F.push(V)
      });
let X: any = (V, C) => V.userFacingName().localeCompare(C.userFacingName());
      return W.sort(X), J.sort(X), F.sort(X), [...W, ...J, ...F].map(Dj2)
  }
let I: any = B.filter((Y) => !Y.isHidden).flatMap((Y) => {
let W: any = Y.userFacingName(),
              J = [];
          if (J.push({
                  nameKey: W,
                  commandName: Y.userFacingName(),
                  command: Y
              }), W.split(hN5).filter(Boolean).forEach((X) => {
                  J.push({
                      partKey: X,
                      commandName: Y.userFacingName(),
                      command: Y
                  })
              }), Y.aliases) Y.aliases.forEach((X) => {
              J.push({
                  aliasKey: X,
                  commandName: Y.userFacingName(),
                  command: Y
              })
          });
          return Y.description.split(" ").forEach((X) => {
let V: any = X.toLowerCase().replace(/[^a-z0-9]/g, "");
              if (V) J.push({
                  descriptionKey: V,
                  commandName: Y.userFacingName(),
                  command: Y
              })
          }), J
      }),
      Z = new EV(I, {
          includeScore: !0,
          threshold: 0.3,
          location: 0,
          distance: 100,
          keys: [{
              name: "nameKey",
              weight: 2
          }, {
              name: "partKey",
              weight: 2
          }, {
              name: "aliasKey",
              weight: 2
          }, {
              name: "descriptionKey",
              weight: 0.5
          }]
      }).search(Q),
      D = new Map;
  return Z.forEach((Y) => {
      let {
          commandName: W,
          command: J
      } = Y.item;
      if (!D.has(W)) D.set(W, J)
  }), Array.from(D.entries()).map(([Y, W]) => Dj2(W))
}


// Ej2 - Lines 64571-64612
function Ej2({
function Ej2({
  exitMessage: A,
  vimMode: B,
  mode: Q,
  notification: I,
  toolPermissionContext: G,
  suppressHint: Z,
  shellsSelected: D,
  isPasting: Y
}): any {
  if (A.show) return c4.createElement(P, {
      dimColor: !0,
      key: "exit-message"
  }, "Press ", A.key, " again to exit");
  if (Y) return c4.createElement(P, {
      dimColor: !0,
      key: "pasting-message"
  }, "Pasting text...");
  if (I.show && I.content)
      if ("jsx" in I.content) return c4.createElement(h, {
          key: "notification-content",
          flexGrow: 1
      }, I.content.jsx);
      else return c4.createElement(P, {
          color: I.content.color,
          dimColor: !I.content.color,
          key: "notification"
      }, I.content.text);
let W: any = Rp() && B === "INSERT";
  return c4.createElement(h, {
      justifyContent: "flex-start",
      gap: 1
  }, W ? c4.createElement(P, {
      dimColor: !0,
      key: "vim-insert"
  }, "-- INSERT --") : null, c4.createElement(iN5, {
      mode: Q,
      toolPermissionContext: G,
      showHint: !Z && !W,
      shellsSelected: D
  }))
}


// iN5 - Lines 64614-64661
function iN5({
function iN5({
  mode: A,
  toolPermissionContext: B,
  showHint: Q,
  shellsSelected: I = !1
}): any {
  let {
      shells: G
  } = Mp(), Z = G.filter((D) => D.status === "running").length;
  if (A === "memory") return c4.createElement(P, {
      color: "remember"
  }, "# to memorize");
  if (A === "bash") return c4.createElement(P, {
      color: "bashBorder"
  }, "! for bash mode");
  if (B ? .mode === "plan") return c4.createElement(P, {
      color: "planMode",
      key: "plan-mode"
  }, "⏸ plan mode on", c4.createElement(P, {
      color: "secondaryText",
      dimColor: !0
  }, " ", "(shift+tab to cycle)"));
  if (B ? .mode === "acceptEdits") return c4.createElement(P, {
      color: "autoAccept",
      key: "write-file-allowed"
  }, "⏵⏵ auto-accept edits on", c4.createElement(P, {
      color: "secondaryText",
      dimColor: !0
  }, " ", "(shift+tab to cycle)"));
  if (Z > 0) {
let D: any = ZA().hasSeenTasksHint;
      return c4.createElement(h, {
          gap: 1
      }, c4.createElement(P, {
          color: I ? "text" : "permission",
          inverse: I,
          bold: I
      }, I ? " " : "", Z, " ", Z === 1 ? "bash" : "bashes", " ", "running", I ? " " : ""), Q && c4.createElement(c4.Fragment, null, c4.createElement(P, {
          dimColor: !0
      }, "·"), c4.createElement(P, {
          dimColor: !0
      }, I ? "Enter to view shells" : !D ? "↓ to view" : "? for shortcuts")))
  }
  if (!Q) return null;
  return c4.createElement(P, {
      dimColor: !0
  }, "? for shortcuts")
}


// _j2 - Lines 64911-64972
function _j2({
function _j2({
  ideSelection: A,
  mcpClients: B,
  ideInstallationStatus: Q
}): any {
let I: any = tw1(B),
      [G, Z] = HT.useState(!0),
      [D, Y] = HT.useState(!1);
  HT.useEffect(() => {
      if (I === "connected") {
let K: any = setTimeout(() => {
              Z(!1)
          }, 1000);
          return () => clearTimeout(K)
      } else if (I === "disconnected") Z(!0)
  }, [I]);
  let [W, J] = HT.useState(!1);
  HT.useEffect(() => {
      if (Q ? .error || hZ) {
          J(!0);
let K: any = setTimeout(() => {
              J(!1)
          }, 5000);
          return () => clearTimeout(K)
      }
  }, [Q ? .error]);
let F: any = I === "connected" && (A ? .filePath || A ? .text && A.lineCount > 0),
      X = I === "connected" && !F,
      V = W && !hZ && !X && !F,
      C = W && hZ && !X && !F;
  return HT.useEffect(() => {
      if (!KK() && I === null && !Sj2) {
          let K;
          return bt(!0).then((E) => {
              if (E.length > 0) Y(!0), K = setTimeout(() => {
                  Y(!1)
              }, 3000), Sj2 = !0
          }), () => K && clearTimeout(K)
      }
  }, [I]), I !== null ? KB.createElement(KB.Fragment, null, !V && I === "disconnected" && KB.createElement(P, {
      color: "error",
      key: "ide-status"
  }, A0.circle, " IDE disconnected"), X && KB.createElement(P, {
      color: "success",
      key: "ide-status"
  }, A0.circle, G && " IDE connected"), V && KB.createElement(P, {
      color: "error"
  }, "IDE extension install failed (see /status for info)"), C && KB.createElement(P, {
      color: "secondaryText"
  }, "IDE plugin not connected (see /status for info)"), F && A ? .text && A.lineCount > 0 ? KB.createElement(P, {
      color: "permission",
      key: "selection-indicator"
  }, "⧉ ", A.lineCount, " ", A.lineCount === 1 ? "line" : "lines", " selected") : F && A ? .filePath ? KB.createElement(P, {
      color: "permission",
      key: "selection-indicator"
  }, "⧉ In ", nN5(A.filePath)) : null) : KB.createElement(KB.Fragment, null, D && !C && KB.createElement(P, {
      color: "text",
      key: "ide-command-hint"
  }, A0.circle, " Use /ide to connect to your IDE"), C && KB.createElement(P, {
      color: "secondaryText"
  }, "IDE plugin not connected (see /status for info)"))
}


// Jy2 - Lines 66835-66844
function Jy2(): any {
function Jy2(): any {
  let [A, B] = Sp.useState([]), Q = Sp.useRef([]), I = Sp.useCallback((G) => {
      Q.current = G(Q.current), B(Q.current)
  }, [B]);
  return {
      queuedCommands: A,
      queuedCommandsRef: Q,
      setQueuedCommands: I
  }
}


// rG - Lines 67012-67050
  async function rG(): any {
  async function rG(): any {
      WQ();
let NA: any = dG();
      for (let z2 of NA) j8.current[z2.path] = {
          content: z2.content,
          timestamp: Date.now()
      };
      if (!Q) return;
      t(!0), y0(0), L1([]);
let SA: any = new AbortController;
      HA(SA);
      let {
          messages: uA,
          shouldQuery: W2,
          allowedTools: c0
      } = await Tp(Q, "prompt", P1, cQ(O1, O1, SA, [], void 0), null, bA, void 0);
      if (uA.length) {
          for (let DA of uA)
              if (DA.type === "user") GT(Q);
          if (h1((DA) => [...DA, ...uA]), !W2) {
              HA(null), t(!1), y0(0), L1([]), V0(null);
              return
          }
          let [z2, V1, c1] = await Promise.all([yj(d1, R, Object.values(query.resources).flat(), Array.from(C.additionalWorkingDirectories)), qW(), RE()]), _1 = cQ([...O1, ...uA], uA, SA, [], void 0), t1 = c0 ? { ..._1,
              getToolPermissionContext() {
let DA: any = Pp;
                  return { ...DA,
                      alwaysAllowRules: { ...DA.alwaysAllowRules,
                          command: c0
                      }
                  }
              }
          } : _1;
          for await (let DA of nO([...O1, ...uA], z2, V1, c1, aI, t1)) jt1(DA, (IA) => {
              h1((xA) => [...xA, IA])
          }, (IA) => y0((xA) => xA + IA.length), Q1, L1)
      } else GT(Q);
      J3(ZA().hasAcknowledgedCostThreshold || !1), t(!1), y0(0), L1([]), V0(null)
  }


// V - Lines 67840-67867
  async function V(C): any {
  async function V(C): any {
let K: any = Q[C];
      if (!K) return;
      try {
          A.unmount ? .();
let E: any = await ET(K, I);
          if (!E) throw new Error("Failed to load conversation");
let N: any = jJ(y9());
          await D3(), n5(GE1.default.createElement(c3, {
              initialState: D,
              onChangeAppState: Y
          }, GE1.default.createElement(_p, {
              initialPrompt: "",
              debug: W,
              shouldShowPromptInput: !0,
              commands: B,
              initialTools: I,
              initialMessages: E.messages,
              initialTodos: N,
              mcpClients: G,
              dynamicMcpConfig: Z
          })), {
              exitOnCtrlC: !1
          })
      } catch (E) {
          throw b1(E), E
      }
  }


// DE1 - Lines 68384-68388
function DE1(): any {
function DE1(): any {
  return b2A.default.createElement(P, null, "MCP servers may execute code or access system resources. All tool calls require approval. Learn more in the", " ", b2A.default.createElement(BJ1, {
      url: "https://eliza.how-mcp"
  }, "MCP documentation"), ".")
}


// kq5 - Lines 69363-69421
function kq5(A, B, Q, I, G, Z, D, Y): any {
function kq5(A, B, Q, I, G, Z, D, Y): any {
let W: any = [],
      J = () => W,
      F = (N) => {
          W = W.filter((q) => !N.includes(q))
      },
      X = !1,
      V = !1,
      C = new h2A,
      K = Dk2(Z),
      E = async () => {
          X = !0;
          try {
              while (W.length > 0) {
let N: any = W.shift();
                  if (N.mode !== "prompt") throw new Error("only prompt commands are supported in streaming mode");
let query: any = N.value;
                  for await (let O of Zk2({
                      commands: I,
                      prompt: q,
                      cwd: yq5(),
                      tools: G,
                      permissionContext: B,
                      verbose: Y.verbose,
                      mcpClients: Q,
                      maxTurns: Y.maxTurns,
                      permissionPromptTool: D,
                      userSpecifiedModel: Y.userSpecifiedModel,
                      fallbackModel: Y.fallbackModel,
                      initialMessages: K,
                      customSystemPrompt: Y.systemPrompt,
                      appendSystemPrompt: Y.appendSystemPrompt,
                      getQueuedCommands: J,
                      removeQueuedCommands: F
                  })) K.push(O), C.enqueue(O)
              }
          } finally {
              X = !1
          }
          if (V) C.done()
      };
  return (async () => {
      for await (let N of A) {
          let q;
          if (typeof N.message.content === "string") query = N.message.content;
          else {
              if (N.message.content.length !== 1) console.error(`Error: Expected message content to have exactly one item, got ${N.message.content.length}`), process.exit(1);
              if (typeof N.message.content[0] === "string") query = N.message.content[0];
              else if (N.message.content[0].type === "text") query = N.message.content[0].text;
              else console.error("Error: Expected message content to be a string or a text block."), process.exit(1)
          }
          if (W.push({
                  mode: "prompt",
                  value: q
              }), !X) E()
      }
      if (V = !0, !X) C.done()
  })(), C
}


// bq5 - Lines 69507-69521
async function bq5(): any {
async function bq5(): any {
  let {
      stdout: A
  } = await PD("which", ["-a", "claude"], {
      cwd: x1().cwd()
  });
  if (!A) return;
let B: any = A.trim().split(`
`).filter(Boolean),
      Q = x1();
  for (let I of B)
      if (I.includes("node_modules") || I.includes("npm")) try {
          Q.unlinkSync(I), O9(`Removed stale npm claude command at ${I}`)
      } catch {}
}


// G - Lines 69531-69582
      async function G(): any {
      async function G(): any {
          try {
              O9(`Install: Starting installation process (force=${B})`), I({
                  type: "cleaning-npm"
              });
              let {
                  removed: Z,
                  errors: D
              } = await vq5();
              if (Z > 0) O9(`Cleaned up ${Z} npm installation(s)`);
              if (D.length > 0 && !B) {
                  I({
                      type: "error",
                      message: `Cleanup errors: ${D.join(", ")}`
                  });
                  return
              }
              I({
                  type: "installing",
                  version: "latest"
              }), O9("Install: Calling installLatest(force=true)");
let Y: any = await Fp(!0);
              if (O9(`Install: installLatest returned version=${Y.latestVersion}, wasUpdated=${Y.wasUpdated}`), !Y.latestVersion) M6("Install: Failed to retrieve version information during install");
              if (!Y.wasUpdated && !B) O9("Install: Already up to date");
              I({
                  type: "setting-up"
              });
let W: any = await Jp(!0);
              if (O9(`Install: Setup launcher completed with ${W.length} messages`), W.length > 0) W.forEach((J) => O9(`Install: Setup message: ${J}`));
              if (E1("claude_install_command", {
                      has_version: Y.latestVersion ? 1 : 0,
                      forced: B ? 1 : 0
                  }), W.length > 0) I({
                  type: "set-up",
                  messages: W
              }), setTimeout(() => {
                  I({
                      type: "success",
                      version: Y.latestVersion || "current"
                  })
              }, 2000);
              else O9("Install: Shell PATH already configured"), I({
                  type: "success",
                  version: Y.latestVersion || "current"
              })
          } catch (Z) {
              M6(`Install command failed: ${Z}`), I({
                  type: "error",
                  message: Z instanceof Error ? Z.message : String(Z)
              })
          }
      }


export {
  Fy2,
  LD,
  pL1,
  Vi,
  lL1,
  Uz,
  Sn,
  gZ0,
  kG,
  ro,
  oo,
  nX,
  aR,
  Gt,
  Tm,
  Ll1,
  xl1,
  PK,
  pw2,
  Xu
};
