var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod2) => function __require() {
  return mod2 || (0, cb[__getOwnPropNames(cb)[0]])((mod2 = { exports: {} }).exports, mod2), mod2.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
  mod2
));

// ../../node_modules/bech32/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/bech32/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.bech32m = exports.bech32 = void 0;
    var ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    var ALPHABET_MAP = {};
    for (let z = 0; z < ALPHABET.length; z++) {
      const x = ALPHABET.charAt(z);
      ALPHABET_MAP[x] = z;
    }
    function polymodStep(pre) {
      const b = pre >> 25;
      return (pre & 33554431) << 5 ^ -(b >> 0 & 1) & 996825010 ^ -(b >> 1 & 1) & 642813549 ^ -(b >> 2 & 1) & 513874426 ^ -(b >> 3 & 1) & 1027748829 ^ -(b >> 4 & 1) & 705979059;
    }
    function prefixChk(prefix) {
      let chk = 1;
      for (let i2 = 0; i2 < prefix.length; ++i2) {
        const c = prefix.charCodeAt(i2);
        if (c < 33 || c > 126)
          return "Invalid prefix (" + prefix + ")";
        chk = polymodStep(chk) ^ c >> 5;
      }
      chk = polymodStep(chk);
      for (let i2 = 0; i2 < prefix.length; ++i2) {
        const v2 = prefix.charCodeAt(i2);
        chk = polymodStep(chk) ^ v2 & 31;
      }
      return chk;
    }
    function convert(data, inBits, outBits, pad) {
      let value2 = 0;
      let bits = 0;
      const maxV = (1 << outBits) - 1;
      const result = [];
      for (let i2 = 0; i2 < data.length; ++i2) {
        value2 = value2 << inBits | data[i2];
        bits += inBits;
        while (bits >= outBits) {
          bits -= outBits;
          result.push(value2 >> bits & maxV);
        }
      }
      if (pad) {
        if (bits > 0) {
          result.push(value2 << outBits - bits & maxV);
        }
      } else {
        if (bits >= inBits)
          return "Excess padding";
        if (value2 << outBits - bits & maxV)
          return "Non-zero padding";
      }
      return result;
    }
    function toWords(bytes) {
      return convert(bytes, 8, 5, true);
    }
    function fromWordsUnsafe(words) {
      const res = convert(words, 5, 8, false);
      if (Array.isArray(res))
        return res;
    }
    function fromWords(words) {
      const res = convert(words, 5, 8, false);
      if (Array.isArray(res))
        return res;
      throw new Error(res);
    }
    function getLibraryFromEncoding(encoding) {
      let ENCODING_CONST;
      if (encoding === "bech32") {
        ENCODING_CONST = 1;
      } else {
        ENCODING_CONST = 734539939;
      }
      function encode(prefix, words, LIMIT) {
        LIMIT = LIMIT || 90;
        if (prefix.length + 7 + words.length > LIMIT)
          throw new TypeError("Exceeds length limit");
        prefix = prefix.toLowerCase();
        let chk = prefixChk(prefix);
        if (typeof chk === "string")
          throw new Error(chk);
        let result = prefix + "1";
        for (let i2 = 0; i2 < words.length; ++i2) {
          const x = words[i2];
          if (x >> 5 !== 0)
            throw new Error("Non 5-bit word");
          chk = polymodStep(chk) ^ x;
          result += ALPHABET.charAt(x);
        }
        for (let i2 = 0; i2 < 6; ++i2) {
          chk = polymodStep(chk);
        }
        chk ^= ENCODING_CONST;
        for (let i2 = 0; i2 < 6; ++i2) {
          const v2 = chk >> (5 - i2) * 5 & 31;
          result += ALPHABET.charAt(v2);
        }
        return result;
      }
      function __decode(str, LIMIT) {
        LIMIT = LIMIT || 90;
        if (str.length < 8)
          return str + " too short";
        if (str.length > LIMIT)
          return "Exceeds length limit";
        const lowered = str.toLowerCase();
        const uppered = str.toUpperCase();
        if (str !== lowered && str !== uppered)
          return "Mixed-case string " + str;
        str = lowered;
        const split2 = str.lastIndexOf("1");
        if (split2 === -1)
          return "No separator character for " + str;
        if (split2 === 0)
          return "Missing prefix for " + str;
        const prefix = str.slice(0, split2);
        const wordChars = str.slice(split2 + 1);
        if (wordChars.length < 6)
          return "Data too short";
        let chk = prefixChk(prefix);
        if (typeof chk === "string")
          return chk;
        const words = [];
        for (let i2 = 0; i2 < wordChars.length; ++i2) {
          const c = wordChars.charAt(i2);
          const v2 = ALPHABET_MAP[c];
          if (v2 === void 0)
            return "Unknown character " + c;
          chk = polymodStep(chk) ^ v2;
          if (i2 + 6 >= wordChars.length)
            continue;
          words.push(v2);
        }
        if (chk !== ENCODING_CONST)
          return "Invalid checksum for " + str;
        return { prefix, words };
      }
      function decodeUnsafe(str, LIMIT) {
        const res = __decode(str, LIMIT);
        if (typeof res === "object")
          return res;
      }
      function decode(str, LIMIT) {
        const res = __decode(str, LIMIT);
        if (typeof res === "object")
          return res;
        throw new Error(res);
      }
      return {
        decodeUnsafe,
        decode,
        encode,
        toWords,
        fromWordsUnsafe,
        fromWords
      };
    }
    exports.bech32 = getLibraryFromEncoding("bech32");
    exports.bech32m = getLibraryFromEncoding("bech32m");
  }
});

// src/index.ts
import bodyParser3 from "body-parser";
import cors3 from "cors";
import express4 from "express";
import multer from "multer";
import {
  elizaLogger as elizaLogger2,
  getEmbeddingZeroVector
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateMessageResponse } from "@elizaos/core";
import { messageCompletionFooter } from "@elizaos/core";
import {
  ModelClass
} from "@elizaos/core";
import { stringToUuid as stringToUuid2 } from "@elizaos/core";
import { settings } from "@elizaos/core";

// src/routes/agent.ts
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import {
  elizaLogger,
  getEnvVariable,
  validateCharacterConfig
} from "@elizaos/core";
import { REST, Routes } from "discord.js";
import { stringToUuid } from "@elizaos/core";
function createAgentRouter(agents, directClient) {
  const router = express.Router();
  router.use(cors());
  router.use(bodyParser.json());
  router.use(bodyParser.urlencoded({ extended: true }));
  router.use(
    express.json({
      limit: getEnvVariable("EXPRESS_MAX_PAYLOAD") || "100kb"
    })
  );
  router.get("/", (req, res) => {
    const agentsList = Array.from(agents.values()).map((agent) => ({
      id: agent.agentId,
      name: agent.character.name,
      clients: Object.keys(agent.clients)
    }));
    res.json({ agents: agentsList });
  });
  router.get("/:agentId", (req, res) => {
    const agentId = req.params.agentId;
    const agent = agents.get(agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json({
      id: agent.agentId,
      character: agent.character
    });
  });
  router.post("/:agentId/set", async (req, res) => {
    const agentId = req.params.agentId;
    console.log("agentId", agentId);
    let agent = agents.get(agentId);
    if (agent) {
      agent.stop();
      directClient.unregisterAgent(agent);
    }
    const character = req.body;
    try {
      validateCharacterConfig(character);
    } catch (e3) {
      elizaLogger.error(`Error parsing character: ${e3}`);
      res.status(400).json({
        success: false,
        message: e3.message
      });
      return;
    }
    agent = await directClient.startAgent(character);
    elizaLogger.log(`${character.name} started`);
    res.json({
      id: character.id,
      character
    });
  });
  router.get("/:agentId/stop", async (req, res) => {
    const agentId = req.params.agentId;
    console.log("agentId", agentId);
    const agent = agents.get(agentId);
    try {
      if (agent) {
        agent.stop();
        directClient.unregisterAgent(agent);
      }
      res.json({
        code: 200,
        status: "success",
        message: "Agent stopped"
      });
    } catch (error2) {
      console.log("/:agentId/stop", error2);
      res.json({
        code: 400,
        status: "success",
        message: "Agent stopped"
      });
    }
  });
  router.post("/new", async (req, res) => {
    const character = req.body;
    try {
      validateCharacterConfig(character);
    } catch (e3) {
      elizaLogger.error(`Error parsing character: ${e3}`);
      res.status(400).json({
        success: false,
        message: e3.message
      });
      return;
    }
    await directClient.startAgent(character);
    elizaLogger.log(`${character.name} started`);
    res.json({
      id: character.id,
      character
    });
  });
  router.get("/:agentId/channels", async (req, res) => {
    const agentId = req.params.agentId;
    const runtime = agents.get(agentId);
    if (!runtime) {
      res.status(404).json({ error: "Runtime not found" });
      return;
    }
    const API_TOKEN = runtime.getSetting("DISCORD_API_TOKEN");
    const rest = new REST({ version: "10" }).setToken(API_TOKEN);
    try {
      const guilds = await rest.get(Routes.userGuilds());
      res.json({
        id: runtime.agentId,
        guilds,
        serverCount: guilds.length
      });
    } catch (error2) {
      console.error("Error fetching guilds:", error2);
      res.status(500).json({ error: "Failed to fetch guilds" });
    }
  });
  router.get("/:agentId/:roomId/memories", async (req, res) => {
    const agentId = req.params.agentId;
    const roomId = stringToUuid(req.params.roomId);
    let runtime = agents.get(agentId);
    if (!runtime) {
      runtime = Array.from(agents.values()).find(
        (a3) => a3.character.name.toLowerCase() === agentId.toLowerCase()
      );
    }
    if (!runtime) {
      res.status(404).send("Agent not found");
      return;
    }
    try {
      const memories = await runtime.messageManager.getMemories({
        roomId
      });
      const response = {
        agentId,
        roomId,
        memories: memories.map((memory) => ({
          id: memory.id,
          userId: memory.userId,
          agentId: memory.agentId,
          createdAt: memory.createdAt,
          content: {
            text: memory.content.text,
            action: memory.content.action,
            source: memory.content.source,
            url: memory.content.url,
            inReplyTo: memory.content.inReplyTo,
            attachments: memory.content.attachments?.map(
              (attachment) => ({
                id: attachment.id,
                url: attachment.url,
                title: attachment.title,
                source: attachment.source,
                description: attachment.description,
                text: attachment.text,
                contentType: attachment.contentType
              })
            )
          },
          embedding: memory.embedding,
          roomId: memory.roomId,
          unique: memory.unique,
          similarity: memory.similarity
        }))
      };
      res.json(response);
    } catch (error2) {
      console.error("Error fetching memories:", error2);
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });
  router.get("/agents/:agentId/:userId", async (req, res) => {
  });
  return router;
}

// src/routes/user.ts
import express2 from "express";
import bodyParser2 from "body-parser";

// ../../node_modules/@mysten/sui/dist/esm/utils/sui-types.js
import { fromBase58, splitGenericParameters } from "@mysten/bcs";
var SUI_ADDRESS_LENGTH = 32;
function isValidSuiAddress(value2) {
  return isHex(value2) && getHexByteLength(value2) === SUI_ADDRESS_LENGTH;
}
function normalizeSuiAddress(value2, forceAdd0x = false) {
  let address = value2.toLowerCase();
  if (!forceAdd0x && address.startsWith("0x")) {
    address = address.slice(2);
  }
  return `0x${address.padStart(SUI_ADDRESS_LENGTH * 2, "0")}`;
}
function isHex(value2) {
  return /^(0x|0X)?[a-fA-F0-9]+$/.test(value2) && value2.length % 2 === 0;
}
function getHexByteLength(value2) {
  return /^(0x|0X)/.test(value2) ? (value2.length - 2) / 2 : value2.length / 2;
}

// ../../node_modules/@mysten/sui/dist/esm/utils/index.js
import {
  fromB64,
  toB64,
  fromHEX,
  toHex as toHex2,
  toHEX,
  fromHex as fromHex2,
  fromBase64 as fromBase642,
  toBase64 as toBase642,
  fromBase58 as fromBase583,
  toBase58 as toBase582
} from "@mysten/bcs";

// ../../node_modules/@noble/hashes/esm/_assert.js
function anumber(n2) {
  if (!Number.isSafeInteger(n2) || n2 < 0)
    throw new Error("positive integer expected, got " + n2);
}
function isBytes(a3) {
  return a3 instanceof Uint8Array || ArrayBuffer.isView(a3) && a3.constructor.name === "Uint8Array";
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function ahash(h) {
  if (typeof h !== "function" || typeof h.create !== "function")
    throw new Error("Hash should be wrapped by utils.wrapConstructor");
  anumber(h.outputLen);
  anumber(h.blockLen);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}

// ../../node_modules/@noble/hashes/esm/cryptoNode.js
import * as nc from "node:crypto";
var crypto2 = nc && typeof nc === "object" && "webcrypto" in nc ? nc.webcrypto : nc && typeof nc === "object" && "randomBytes" in nc ? nc : void 0;

// ../../node_modules/@noble/hashes/esm/utils.js
var u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
var createView = (arr) => new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
var rotr = (word, shift) => word << 32 - shift | word >>> shift;
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
var byteSwap = (word) => word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
var byteSwapIfBE = isLE ? (n2) => n2 : (n2) => byteSwap(n2);
function byteSwap32(arr) {
  for (let i2 = 0; i2 < arr.length; i2++) {
    arr[i2] = byteSwap(arr[i2]);
  }
}
var hexes = /* @__PURE__ */ Array.from({ length: 256 }, (_, i2) => i2.toString(16).padStart(2, "0"));
function bytesToHex(bytes) {
  abytes(bytes);
  let hex = "";
  for (let i2 = 0; i2 < bytes.length; i2++) {
    hex += hexes[bytes[i2]];
  }
  return hex;
}
var asciis = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function asciiToBase16(ch) {
  if (ch >= asciis._0 && ch <= asciis._9)
    return ch - asciis._0;
  if (ch >= asciis.A && ch <= asciis.F)
    return ch - (asciis.A - 10);
  if (ch >= asciis.a && ch <= asciis.f)
    return ch - (asciis.a - 10);
  return;
}
function hexToBytes(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    throw new Error("hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase16(hex.charCodeAt(hi));
    const n2 = asciiToBase16(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("utf8ToBytes expected string, got " + typeof str);
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
function concatBytes(...arrays) {
  let sum = 0;
  for (let i2 = 0; i2 < arrays.length; i2++) {
    const a3 = arrays[i2];
    abytes(a3);
    sum += a3.length;
  }
  const res = new Uint8Array(sum);
  for (let i2 = 0, pad = 0; i2 < arrays.length; i2++) {
    const a3 = arrays[i2];
    res.set(a3, pad);
    pad += a3.length;
  }
  return res;
}
var Hash = class {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
};
function wrapConstructor(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
function wrapConstructorWithOpts(hashCons) {
  const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
  const tmp = hashCons({});
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (opts) => hashCons(opts);
  return hashC;
}
function randomBytes(bytesLength = 32) {
  if (crypto2 && typeof crypto2.getRandomValues === "function") {
    return crypto2.getRandomValues(new Uint8Array(bytesLength));
  }
  if (crypto2 && typeof crypto2.randomBytes === "function") {
    return crypto2.randomBytes(bytesLength);
  }
  throw new Error("crypto.getRandomValues must be defined");
}

// ../../node_modules/@noble/hashes/esm/_blake.js
var SIGMA = /* @__PURE__ */ new Uint8Array([
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3,
  11,
  8,
  12,
  0,
  5,
  2,
  15,
  13,
  10,
  14,
  3,
  6,
  7,
  1,
  9,
  4,
  7,
  9,
  3,
  1,
  13,
  12,
  11,
  14,
  2,
  6,
  5,
  10,
  4,
  0,
  15,
  8,
  9,
  0,
  5,
  7,
  2,
  4,
  10,
  15,
  14,
  1,
  11,
  12,
  6,
  8,
  3,
  13,
  2,
  12,
  6,
  10,
  0,
  11,
  8,
  3,
  4,
  13,
  7,
  5,
  15,
  14,
  1,
  9,
  12,
  5,
  1,
  15,
  14,
  13,
  4,
  10,
  0,
  7,
  6,
  3,
  9,
  2,
  8,
  11,
  13,
  11,
  7,
  14,
  12,
  1,
  3,
  9,
  5,
  0,
  15,
  4,
  8,
  6,
  2,
  10,
  6,
  15,
  14,
  9,
  11,
  3,
  0,
  8,
  12,
  2,
  13,
  7,
  1,
  4,
  10,
  5,
  10,
  2,
  8,
  4,
  7,
  6,
  1,
  5,
  15,
  11,
  9,
  14,
  3,
  12,
  13,
  0,
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  14,
  10,
  4,
  8,
  9,
  15,
  13,
  6,
  1,
  12,
  0,
  2,
  11,
  7,
  5,
  3
]);
var BLAKE = class extends Hash {
  constructor(blockLen, outputLen, opts = {}, keyLen, saltLen, persLen) {
    super();
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.length = 0;
    this.pos = 0;
    this.finished = false;
    this.destroyed = false;
    anumber(blockLen);
    anumber(outputLen);
    anumber(keyLen);
    if (outputLen < 0 || outputLen > keyLen)
      throw new Error("outputLen bigger than keyLen");
    if (opts.key !== void 0 && (opts.key.length < 1 || opts.key.length > keyLen))
      throw new Error("key length must be undefined or 1.." + keyLen);
    if (opts.salt !== void 0 && opts.salt.length !== saltLen)
      throw new Error("salt must be undefined or " + saltLen);
    if (opts.personalization !== void 0 && opts.personalization.length !== persLen)
      throw new Error("personalization must be undefined or " + persLen);
    this.buffer = new Uint8Array(blockLen);
    this.buffer32 = u32(this.buffer);
  }
  update(data) {
    aexists(this);
    const { blockLen, buffer, buffer32 } = this;
    data = toBytes(data);
    const len = data.length;
    const offset = data.byteOffset;
    const buf = data.buffer;
    for (let pos = 0; pos < len; ) {
      if (this.pos === blockLen) {
        if (!isLE)
          byteSwap32(buffer32);
        this.compress(buffer32, 0, false);
        if (!isLE)
          byteSwap32(buffer32);
        this.pos = 0;
      }
      const take = Math.min(blockLen - this.pos, len - pos);
      const dataOffset = offset + pos;
      if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
        const data32 = new Uint32Array(buf, dataOffset, Math.floor((len - pos) / 4));
        if (!isLE)
          byteSwap32(data32);
        for (let pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
          this.length += blockLen;
          this.compress(data32, pos32, false);
        }
        if (!isLE)
          byteSwap32(data32);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      this.length += take;
      pos += take;
    }
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    const { pos, buffer32 } = this;
    this.finished = true;
    this.buffer.subarray(pos).fill(0);
    if (!isLE)
      byteSwap32(buffer32);
    this.compress(buffer32, 0, true);
    if (!isLE)
      byteSwap32(buffer32);
    const out32 = u32(out);
    this.get().forEach((v2, i2) => out32[i2] = byteSwapIfBE(v2));
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to) {
    const { buffer, length, finished, destroyed, outputLen, pos } = this;
    to || (to = new this.constructor({ dkLen: outputLen }));
    to.set(...this.get());
    to.length = length;
    to.finished = finished;
    to.destroyed = destroyed;
    to.outputLen = outputLen;
    to.buffer.set(buffer);
    to.pos = pos;
    return to;
  }
};

// ../../node_modules/@noble/hashes/esm/_u64.js
var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n2, le = false) {
  if (le)
    return { h: Number(n2 & U32_MASK64), l: Number(n2 >> _32n & U32_MASK64) };
  return { h: Number(n2 >> _32n & U32_MASK64) | 0, l: Number(n2 & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  let Ah = new Uint32Array(lst.length);
  let Al = new Uint32Array(lst.length);
  for (let i2 = 0; i2 < lst.length; i2++) {
    const { h, l: l2 } = fromBig(lst[i2], le);
    [Ah[i2], Al[i2]] = [h, l2];
  }
  return [Ah, Al];
}
var toBig = (h, l2) => BigInt(h >>> 0) << _32n | BigInt(l2 >>> 0);
var shrSH = (h, _l, s2) => h >>> s2;
var shrSL = (h, l2, s2) => h << 32 - s2 | l2 >>> s2;
var rotrSH = (h, l2, s2) => h >>> s2 | l2 << 32 - s2;
var rotrSL = (h, l2, s2) => h << 32 - s2 | l2 >>> s2;
var rotrBH = (h, l2, s2) => h << 64 - s2 | l2 >>> s2 - 32;
var rotrBL = (h, l2, s2) => h >>> s2 - 32 | l2 << 64 - s2;
var rotr32H = (_h, l2) => l2;
var rotr32L = (h, _l) => h;
var rotlSH = (h, l2, s2) => h << s2 | l2 >>> 32 - s2;
var rotlSL = (h, l2, s2) => l2 << s2 | h >>> 32 - s2;
var rotlBH = (h, l2, s2) => l2 << s2 - 32 | h >>> 64 - s2;
var rotlBL = (h, l2, s2) => h << s2 - 32 | l2 >>> 64 - s2;
function add(Ah, Al, Bh, Bl) {
  const l2 = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l2 / 2 ** 32 | 0) | 0, l: l2 | 0 };
}
var add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
var add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
var add4L = (Al, Bl, Cl, Dl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0);
var add4H = (low, Ah, Bh, Ch, Dh) => Ah + Bh + Ch + Dh + (low / 2 ** 32 | 0) | 0;
var add5L = (Al, Bl, Cl, Dl, El) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0) + (Dl >>> 0) + (El >>> 0);
var add5H = (low, Ah, Bh, Ch, Dh, Eh) => Ah + Bh + Ch + Dh + Eh + (low / 2 ** 32 | 0) | 0;
var u64 = {
  fromBig,
  split,
  toBig,
  shrSH,
  shrSL,
  rotrSH,
  rotrSL,
  rotrBH,
  rotrBL,
  rotr32H,
  rotr32L,
  rotlSH,
  rotlSL,
  rotlBH,
  rotlBL,
  add,
  add3L,
  add3H,
  add4L,
  add4H,
  add5H,
  add5L
};
var u64_default = u64;

// ../../node_modules/@noble/hashes/esm/blake2b.js
var B2B_IV = /* @__PURE__ */ new Uint32Array([
  4089235720,
  1779033703,
  2227873595,
  3144134277,
  4271175723,
  1013904242,
  1595750129,
  2773480762,
  2917565137,
  1359893119,
  725511199,
  2600822924,
  4215389547,
  528734635,
  327033209,
  1541459225
]);
var BBUF = /* @__PURE__ */ new Uint32Array(32);
function G1b(a3, b, c, d2, msg, x) {
  const Xl = msg[x], Xh = msg[x + 1];
  let Al = BBUF[2 * a3], Ah = BBUF[2 * a3 + 1];
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
  let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
  let Dl = BBUF[2 * d2], Dh = BBUF[2 * d2 + 1];
  let ll = u64_default.add3L(Al, Bl, Xl);
  Ah = u64_default.add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
  ({ Dh, Dl } = { Dh: u64_default.rotr32H(Dh, Dl), Dl: u64_default.rotr32L(Dh, Dl) });
  ({ h: Ch, l: Cl } = u64_default.add(Ch, Cl, Dh, Dl));
  ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
  ({ Bh, Bl } = { Bh: u64_default.rotrSH(Bh, Bl, 24), Bl: u64_default.rotrSL(Bh, Bl, 24) });
  BBUF[2 * a3] = Al, BBUF[2 * a3 + 1] = Ah;
  BBUF[2 * b] = Bl, BBUF[2 * b + 1] = Bh;
  BBUF[2 * c] = Cl, BBUF[2 * c + 1] = Ch;
  BBUF[2 * d2] = Dl, BBUF[2 * d2 + 1] = Dh;
}
function G2b(a3, b, c, d2, msg, x) {
  const Xl = msg[x], Xh = msg[x + 1];
  let Al = BBUF[2 * a3], Ah = BBUF[2 * a3 + 1];
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
  let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
  let Dl = BBUF[2 * d2], Dh = BBUF[2 * d2 + 1];
  let ll = u64_default.add3L(Al, Bl, Xl);
  Ah = u64_default.add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
  ({ Dh, Dl } = { Dh: u64_default.rotrSH(Dh, Dl, 16), Dl: u64_default.rotrSL(Dh, Dl, 16) });
  ({ h: Ch, l: Cl } = u64_default.add(Ch, Cl, Dh, Dl));
  ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
  ({ Bh, Bl } = { Bh: u64_default.rotrBH(Bh, Bl, 63), Bl: u64_default.rotrBL(Bh, Bl, 63) });
  BBUF[2 * a3] = Al, BBUF[2 * a3 + 1] = Ah;
  BBUF[2 * b] = Bl, BBUF[2 * b + 1] = Bh;
  BBUF[2 * c] = Cl, BBUF[2 * c + 1] = Ch;
  BBUF[2 * d2] = Dl, BBUF[2 * d2 + 1] = Dh;
}
var BLAKE2b = class extends BLAKE {
  constructor(opts = {}) {
    super(128, opts.dkLen === void 0 ? 64 : opts.dkLen, opts, 64, 16, 16);
    this.v0l = B2B_IV[0] | 0;
    this.v0h = B2B_IV[1] | 0;
    this.v1l = B2B_IV[2] | 0;
    this.v1h = B2B_IV[3] | 0;
    this.v2l = B2B_IV[4] | 0;
    this.v2h = B2B_IV[5] | 0;
    this.v3l = B2B_IV[6] | 0;
    this.v3h = B2B_IV[7] | 0;
    this.v4l = B2B_IV[8] | 0;
    this.v4h = B2B_IV[9] | 0;
    this.v5l = B2B_IV[10] | 0;
    this.v5h = B2B_IV[11] | 0;
    this.v6l = B2B_IV[12] | 0;
    this.v6h = B2B_IV[13] | 0;
    this.v7l = B2B_IV[14] | 0;
    this.v7h = B2B_IV[15] | 0;
    const keyLength = opts.key ? opts.key.length : 0;
    this.v0l ^= this.outputLen | keyLength << 8 | 1 << 16 | 1 << 24;
    if (opts.salt) {
      const salt = u32(toBytes(opts.salt));
      this.v4l ^= byteSwapIfBE(salt[0]);
      this.v4h ^= byteSwapIfBE(salt[1]);
      this.v5l ^= byteSwapIfBE(salt[2]);
      this.v5h ^= byteSwapIfBE(salt[3]);
    }
    if (opts.personalization) {
      const pers = u32(toBytes(opts.personalization));
      this.v6l ^= byteSwapIfBE(pers[0]);
      this.v6h ^= byteSwapIfBE(pers[1]);
      this.v7l ^= byteSwapIfBE(pers[2]);
      this.v7h ^= byteSwapIfBE(pers[3]);
    }
    if (opts.key) {
      const tmp = new Uint8Array(this.blockLen);
      tmp.set(toBytes(opts.key));
      this.update(tmp);
    }
  }
  // prettier-ignore
  get() {
    let { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
    return [v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h];
  }
  // prettier-ignore
  set(v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h) {
    this.v0l = v0l | 0;
    this.v0h = v0h | 0;
    this.v1l = v1l | 0;
    this.v1h = v1h | 0;
    this.v2l = v2l | 0;
    this.v2h = v2h | 0;
    this.v3l = v3l | 0;
    this.v3h = v3h | 0;
    this.v4l = v4l | 0;
    this.v4h = v4h | 0;
    this.v5l = v5l | 0;
    this.v5h = v5h | 0;
    this.v6l = v6l | 0;
    this.v6h = v6h | 0;
    this.v7l = v7l | 0;
    this.v7h = v7h | 0;
  }
  compress(msg, offset, isLast) {
    this.get().forEach((v2, i2) => BBUF[i2] = v2);
    BBUF.set(B2B_IV, 16);
    let { h, l: l2 } = u64_default.fromBig(BigInt(this.length));
    BBUF[24] = B2B_IV[8] ^ l2;
    BBUF[25] = B2B_IV[9] ^ h;
    if (isLast) {
      BBUF[28] = ~BBUF[28];
      BBUF[29] = ~BBUF[29];
    }
    let j = 0;
    const s2 = SIGMA;
    for (let i2 = 0; i2 < 12; i2++) {
      G1b(0, 4, 8, 12, msg, offset + 2 * s2[j++]);
      G2b(0, 4, 8, 12, msg, offset + 2 * s2[j++]);
      G1b(1, 5, 9, 13, msg, offset + 2 * s2[j++]);
      G2b(1, 5, 9, 13, msg, offset + 2 * s2[j++]);
      G1b(2, 6, 10, 14, msg, offset + 2 * s2[j++]);
      G2b(2, 6, 10, 14, msg, offset + 2 * s2[j++]);
      G1b(3, 7, 11, 15, msg, offset + 2 * s2[j++]);
      G2b(3, 7, 11, 15, msg, offset + 2 * s2[j++]);
      G1b(0, 5, 10, 15, msg, offset + 2 * s2[j++]);
      G2b(0, 5, 10, 15, msg, offset + 2 * s2[j++]);
      G1b(1, 6, 11, 12, msg, offset + 2 * s2[j++]);
      G2b(1, 6, 11, 12, msg, offset + 2 * s2[j++]);
      G1b(2, 7, 8, 13, msg, offset + 2 * s2[j++]);
      G2b(2, 7, 8, 13, msg, offset + 2 * s2[j++]);
      G1b(3, 4, 9, 14, msg, offset + 2 * s2[j++]);
      G2b(3, 4, 9, 14, msg, offset + 2 * s2[j++]);
    }
    this.v0l ^= BBUF[0] ^ BBUF[16];
    this.v0h ^= BBUF[1] ^ BBUF[17];
    this.v1l ^= BBUF[2] ^ BBUF[18];
    this.v1h ^= BBUF[3] ^ BBUF[19];
    this.v2l ^= BBUF[4] ^ BBUF[20];
    this.v2h ^= BBUF[5] ^ BBUF[21];
    this.v3l ^= BBUF[6] ^ BBUF[22];
    this.v3h ^= BBUF[7] ^ BBUF[23];
    this.v4l ^= BBUF[8] ^ BBUF[24];
    this.v4h ^= BBUF[9] ^ BBUF[25];
    this.v5l ^= BBUF[10] ^ BBUF[26];
    this.v5h ^= BBUF[11] ^ BBUF[27];
    this.v6l ^= BBUF[12] ^ BBUF[28];
    this.v6h ^= BBUF[13] ^ BBUF[29];
    this.v7l ^= BBUF[14] ^ BBUF[30];
    this.v7h ^= BBUF[15] ^ BBUF[31];
    BBUF.fill(0);
  }
  destroy() {
    this.destroyed = true;
    this.buffer32.fill(0);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
var blake2b = /* @__PURE__ */ wrapConstructorWithOpts((opts) => new BLAKE2b(opts));

// ../../node_modules/@mysten/sui/dist/esm/bcs/index.js
import { bcs as bcs3 } from "@mysten/bcs";

// ../../node_modules/@mysten/sui/dist/esm/bcs/bcs.js
import { bcs, fromBase58 as fromBase582, fromBase64, fromHex, toBase58, toBase64, toHex } from "@mysten/bcs";

// ../../node_modules/@mysten/sui/dist/esm/bcs/type-tag-serializer.js
import { splitGenericParameters as splitGenericParameters2 } from "@mysten/bcs";
var VECTOR_REGEX = /^vector<(.+)>$/;
var STRUCT_REGEX = /^([^:]+)::([^:]+)::([^<]+)(<(.+)>)?/;
var TypeTagSerializer = class _TypeTagSerializer {
  static parseFromStr(str, normalizeAddress = false) {
    if (str === "address") {
      return { address: null };
    } else if (str === "bool") {
      return { bool: null };
    } else if (str === "u8") {
      return { u8: null };
    } else if (str === "u16") {
      return { u16: null };
    } else if (str === "u32") {
      return { u32: null };
    } else if (str === "u64") {
      return { u64: null };
    } else if (str === "u128") {
      return { u128: null };
    } else if (str === "u256") {
      return { u256: null };
    } else if (str === "signer") {
      return { signer: null };
    }
    const vectorMatch = str.match(VECTOR_REGEX);
    if (vectorMatch) {
      return {
        vector: _TypeTagSerializer.parseFromStr(vectorMatch[1], normalizeAddress)
      };
    }
    const structMatch = str.match(STRUCT_REGEX);
    if (structMatch) {
      const address = normalizeAddress ? normalizeSuiAddress(structMatch[1]) : structMatch[1];
      return {
        struct: {
          address,
          module: structMatch[2],
          name: structMatch[3],
          typeParams: structMatch[5] === void 0 ? [] : _TypeTagSerializer.parseStructTypeArgs(structMatch[5], normalizeAddress)
        }
      };
    }
    throw new Error(`Encountered unexpected token when parsing type args for ${str}`);
  }
  static parseStructTypeArgs(str, normalizeAddress = false) {
    return splitGenericParameters2(str).map(
      (tok) => _TypeTagSerializer.parseFromStr(tok, normalizeAddress)
    );
  }
  static tagToString(tag) {
    if ("bool" in tag) {
      return "bool";
    }
    if ("u8" in tag) {
      return "u8";
    }
    if ("u16" in tag) {
      return "u16";
    }
    if ("u32" in tag) {
      return "u32";
    }
    if ("u64" in tag) {
      return "u64";
    }
    if ("u128" in tag) {
      return "u128";
    }
    if ("u256" in tag) {
      return "u256";
    }
    if ("address" in tag) {
      return "address";
    }
    if ("signer" in tag) {
      return "signer";
    }
    if ("vector" in tag) {
      return `vector<${_TypeTagSerializer.tagToString(tag.vector)}>`;
    }
    if ("struct" in tag) {
      const struct = tag.struct;
      const typeParams = struct.typeParams.map(_TypeTagSerializer.tagToString).join(", ");
      return `${struct.address}::${struct.module}::${struct.name}${typeParams ? `<${typeParams}>` : ""}`;
    }
    throw new Error("Invalid TypeTag");
  }
};

// ../../node_modules/@mysten/sui/dist/esm/bcs/bcs.js
function unsafe_u64(options) {
  return bcs.u64({
    name: "unsafe_u64",
    ...options
  }).transform({
    input: (val) => val,
    output: (val) => Number(val)
  });
}
function optionEnum(type2) {
  return bcs.enum("Option", {
    None: null,
    Some: type2
  });
}
var Address = bcs.bytes(SUI_ADDRESS_LENGTH).transform({
  validate: (val) => {
    const address = typeof val === "string" ? val : toHex(val);
    if (!address || !isValidSuiAddress(normalizeSuiAddress(address))) {
      throw new Error(`Invalid Sui address ${address}`);
    }
  },
  input: (val) => typeof val === "string" ? fromHex(normalizeSuiAddress(val)) : val,
  output: (val) => normalizeSuiAddress(toHex(val))
});
var ObjectDigest = bcs.vector(bcs.u8()).transform({
  name: "ObjectDigest",
  input: (value2) => fromBase582(value2),
  output: (value2) => toBase58(new Uint8Array(value2)),
  validate: (value2) => {
    if (fromBase582(value2).length !== 32) {
      throw new Error("ObjectDigest must be 32 bytes");
    }
  }
});
var SuiObjectRef = bcs.struct("SuiObjectRef", {
  objectId: Address,
  version: bcs.u64(),
  digest: ObjectDigest
});
var SharedObjectRef = bcs.struct("SharedObjectRef", {
  objectId: Address,
  initialSharedVersion: bcs.u64(),
  mutable: bcs.bool()
});
var ObjectArg = bcs.enum("ObjectArg", {
  ImmOrOwnedObject: SuiObjectRef,
  SharedObject: SharedObjectRef,
  Receiving: SuiObjectRef
});
var CallArg = bcs.enum("CallArg", {
  Pure: bcs.struct("Pure", {
    bytes: bcs.vector(bcs.u8()).transform({
      input: (val) => typeof val === "string" ? fromBase64(val) : val,
      output: (val) => toBase64(new Uint8Array(val))
    })
  }),
  Object: ObjectArg
});
var InnerTypeTag = bcs.enum("TypeTag", {
  bool: null,
  u8: null,
  u64: null,
  u128: null,
  address: null,
  signer: null,
  vector: bcs.lazy(() => InnerTypeTag),
  struct: bcs.lazy(() => StructTag),
  u16: null,
  u32: null,
  u256: null
});
var TypeTag = InnerTypeTag.transform({
  input: (typeTag) => typeof typeTag === "string" ? TypeTagSerializer.parseFromStr(typeTag, true) : typeTag,
  output: (typeTag) => TypeTagSerializer.tagToString(typeTag)
});
var Argument = bcs.enum("Argument", {
  GasCoin: null,
  Input: bcs.u16(),
  Result: bcs.u16(),
  NestedResult: bcs.tuple([bcs.u16(), bcs.u16()])
});
var ProgrammableMoveCall = bcs.struct("ProgrammableMoveCall", {
  package: Address,
  module: bcs.string(),
  function: bcs.string(),
  typeArguments: bcs.vector(TypeTag),
  arguments: bcs.vector(Argument)
});
var Command = bcs.enum("Command", {
  /**
   * A Move Call - any public Move function can be called via
   * this transaction. The results can be used that instant to pass
   * into the next transaction.
   */
  MoveCall: ProgrammableMoveCall,
  /**
   * Transfer vector of objects to a receiver.
   */
  TransferObjects: bcs.struct("TransferObjects", {
    objects: bcs.vector(Argument),
    address: Argument
  }),
  // /**
  //  * Split `amount` from a `coin`.
  //  */
  SplitCoins: bcs.struct("SplitCoins", {
    coin: Argument,
    amounts: bcs.vector(Argument)
  }),
  // /**
  //  * Merge Vector of Coins (`sources`) into a `destination`.
  //  */
  MergeCoins: bcs.struct("MergeCoins", {
    destination: Argument,
    sources: bcs.vector(Argument)
  }),
  // /**
  //  * Publish a Move module.
  //  */
  Publish: bcs.struct("Publish", {
    modules: bcs.vector(
      bcs.vector(bcs.u8()).transform({
        input: (val) => typeof val === "string" ? fromBase64(val) : val,
        output: (val) => toBase64(new Uint8Array(val))
      })
    ),
    dependencies: bcs.vector(Address)
  }),
  // /**
  //  * Build a vector of objects using the input arguments.
  //  * It is impossible to export construct a `vector<T: key>` otherwise,
  //  * so this call serves a utility function.
  //  */
  MakeMoveVec: bcs.struct("MakeMoveVec", {
    type: optionEnum(TypeTag).transform({
      input: (val) => val === null ? {
        None: true
      } : {
        Some: val
      },
      output: (val) => val.Some ?? null
    }),
    elements: bcs.vector(Argument)
  }),
  Upgrade: bcs.struct("Upgrade", {
    modules: bcs.vector(
      bcs.vector(bcs.u8()).transform({
        input: (val) => typeof val === "string" ? fromBase64(val) : val,
        output: (val) => toBase64(new Uint8Array(val))
      })
    ),
    dependencies: bcs.vector(Address),
    package: Address,
    ticket: Argument
  })
});
var ProgrammableTransaction = bcs.struct("ProgrammableTransaction", {
  inputs: bcs.vector(CallArg),
  commands: bcs.vector(Command)
});
var TransactionKind = bcs.enum("TransactionKind", {
  ProgrammableTransaction,
  ChangeEpoch: null,
  Genesis: null,
  ConsensusCommitPrologue: null
});
var TransactionExpiration = bcs.enum("TransactionExpiration", {
  None: null,
  Epoch: unsafe_u64()
});
var StructTag = bcs.struct("StructTag", {
  address: Address,
  module: bcs.string(),
  name: bcs.string(),
  typeParams: bcs.vector(InnerTypeTag)
});
var GasData = bcs.struct("GasData", {
  payment: bcs.vector(SuiObjectRef),
  owner: Address,
  price: bcs.u64(),
  budget: bcs.u64()
});
var TransactionDataV1 = bcs.struct("TransactionDataV1", {
  kind: TransactionKind,
  sender: Address,
  gasData: GasData,
  expiration: TransactionExpiration
});
var TransactionData = bcs.enum("TransactionData", {
  V1: TransactionDataV1
});
var IntentScope = bcs.enum("IntentScope", {
  TransactionData: null,
  TransactionEffects: null,
  CheckpointSummary: null,
  PersonalMessage: null
});
var IntentVersion = bcs.enum("IntentVersion", {
  V0: null
});
var AppId = bcs.enum("AppId", {
  Sui: null
});
var Intent = bcs.struct("Intent", {
  scope: IntentScope,
  version: IntentVersion,
  appId: AppId
});
function IntentMessage(T) {
  return bcs.struct(`IntentMessage<${T.name}>`, {
    intent: Intent,
    value: T
  });
}
var CompressedSignature = bcs.enum("CompressedSignature", {
  ED25519: bcs.fixedArray(64, bcs.u8()),
  Secp256k1: bcs.fixedArray(64, bcs.u8()),
  Secp256r1: bcs.fixedArray(64, bcs.u8()),
  ZkLogin: bcs.vector(bcs.u8())
});
var PublicKey = bcs.enum("PublicKey", {
  ED25519: bcs.fixedArray(32, bcs.u8()),
  Secp256k1: bcs.fixedArray(33, bcs.u8()),
  Secp256r1: bcs.fixedArray(33, bcs.u8()),
  ZkLogin: bcs.vector(bcs.u8())
});
var MultiSigPkMap = bcs.struct("MultiSigPkMap", {
  pubKey: PublicKey,
  weight: bcs.u8()
});
var MultiSigPublicKey = bcs.struct("MultiSigPublicKey", {
  pk_map: bcs.vector(MultiSigPkMap),
  threshold: bcs.u16()
});
var MultiSig = bcs.struct("MultiSig", {
  sigs: bcs.vector(CompressedSignature),
  bitmap: bcs.u16(),
  multisig_pk: MultiSigPublicKey
});
var base64String = bcs.vector(bcs.u8()).transform({
  input: (val) => typeof val === "string" ? fromBase64(val) : val,
  output: (val) => toBase64(new Uint8Array(val))
});
var SenderSignedTransaction = bcs.struct("SenderSignedTransaction", {
  intentMessage: IntentMessage(TransactionData),
  txSignatures: bcs.vector(base64String)
});
var SenderSignedData = bcs.vector(SenderSignedTransaction, {
  name: "SenderSignedData"
});
var PasskeyAuthenticator = bcs.struct("PasskeyAuthenticator", {
  authenticatorData: bcs.vector(bcs.u8()),
  clientDataJson: bcs.string(),
  userSignature: bcs.vector(bcs.u8())
});

// ../../node_modules/@mysten/sui/dist/esm/bcs/effects.js
import { bcs as bcs2 } from "@mysten/bcs";
var PackageUpgradeError = bcs2.enum("PackageUpgradeError", {
  UnableToFetchPackage: bcs2.struct("UnableToFetchPackage", { packageId: Address }),
  NotAPackage: bcs2.struct("NotAPackage", { objectId: Address }),
  IncompatibleUpgrade: null,
  DigestDoesNotMatch: bcs2.struct("DigestDoesNotMatch", { digest: bcs2.vector(bcs2.u8()) }),
  UnknownUpgradePolicy: bcs2.struct("UnknownUpgradePolicy", { policy: bcs2.u8() }),
  PackageIDDoesNotMatch: bcs2.struct("PackageIDDoesNotMatch", {
    packageId: Address,
    ticketId: Address
  })
});
var ModuleId = bcs2.struct("ModuleId", {
  address: Address,
  name: bcs2.string()
});
var MoveLocation = bcs2.struct("MoveLocation", {
  module: ModuleId,
  function: bcs2.u16(),
  instruction: bcs2.u16(),
  functionName: bcs2.option(bcs2.string())
});
var CommandArgumentError = bcs2.enum("CommandArgumentError", {
  TypeMismatch: null,
  InvalidBCSBytes: null,
  InvalidUsageOfPureArg: null,
  InvalidArgumentToPrivateEntryFunction: null,
  IndexOutOfBounds: bcs2.struct("IndexOutOfBounds", { idx: bcs2.u16() }),
  SecondaryIndexOutOfBounds: bcs2.struct("SecondaryIndexOutOfBounds", {
    resultIdx: bcs2.u16(),
    secondaryIdx: bcs2.u16()
  }),
  InvalidResultArity: bcs2.struct("InvalidResultArity", { resultIdx: bcs2.u16() }),
  InvalidGasCoinUsage: null,
  InvalidValueUsage: null,
  InvalidObjectByValue: null,
  InvalidObjectByMutRef: null,
  SharedObjectOperationNotAllowed: null
});
var TypeArgumentError = bcs2.enum("TypeArgumentError", {
  TypeNotFound: null,
  ConstraintNotSatisfied: null
});
var ExecutionFailureStatus = bcs2.enum("ExecutionFailureStatus", {
  InsufficientGas: null,
  InvalidGasObject: null,
  InvariantViolation: null,
  FeatureNotYetSupported: null,
  MoveObjectTooBig: bcs2.struct("MoveObjectTooBig", {
    objectSize: bcs2.u64(),
    maxObjectSize: bcs2.u64()
  }),
  MovePackageTooBig: bcs2.struct("MovePackageTooBig", {
    objectSize: bcs2.u64(),
    maxObjectSize: bcs2.u64()
  }),
  CircularObjectOwnership: bcs2.struct("CircularObjectOwnership", { object: Address }),
  InsufficientCoinBalance: null,
  CoinBalanceOverflow: null,
  PublishErrorNonZeroAddress: null,
  SuiMoveVerificationError: null,
  MovePrimitiveRuntimeError: bcs2.option(MoveLocation),
  MoveAbort: bcs2.tuple([MoveLocation, bcs2.u64()]),
  VMVerificationOrDeserializationError: null,
  VMInvariantViolation: null,
  FunctionNotFound: null,
  ArityMismatch: null,
  TypeArityMismatch: null,
  NonEntryFunctionInvoked: null,
  CommandArgumentError: bcs2.struct("CommandArgumentError", {
    argIdx: bcs2.u16(),
    kind: CommandArgumentError
  }),
  TypeArgumentError: bcs2.struct("TypeArgumentError", {
    argumentIdx: bcs2.u16(),
    kind: TypeArgumentError
  }),
  UnusedValueWithoutDrop: bcs2.struct("UnusedValueWithoutDrop", {
    resultIdx: bcs2.u16(),
    secondaryIdx: bcs2.u16()
  }),
  InvalidPublicFunctionReturnType: bcs2.struct("InvalidPublicFunctionReturnType", {
    idx: bcs2.u16()
  }),
  InvalidTransferObject: null,
  EffectsTooLarge: bcs2.struct("EffectsTooLarge", { currentSize: bcs2.u64(), maxSize: bcs2.u64() }),
  PublishUpgradeMissingDependency: null,
  PublishUpgradeDependencyDowngrade: null,
  PackageUpgradeError: bcs2.struct("PackageUpgradeError", { upgradeError: PackageUpgradeError }),
  WrittenObjectsTooLarge: bcs2.struct("WrittenObjectsTooLarge", {
    currentSize: bcs2.u64(),
    maxSize: bcs2.u64()
  }),
  CertificateDenied: null,
  SuiMoveVerificationTimedout: null,
  SharedObjectOperationNotAllowed: null,
  InputObjectDeleted: null,
  ExecutionCancelledDueToSharedObjectCongestion: bcs2.struct(
    "ExecutionCancelledDueToSharedObjectCongestion",
    {
      congestedObjects: bcs2.vector(Address)
    }
  ),
  AddressDeniedForCoin: bcs2.struct("AddressDeniedForCoin", {
    address: Address,
    coinType: bcs2.string()
  }),
  CoinTypeGlobalPause: bcs2.struct("CoinTypeGlobalPause", { coinType: bcs2.string() }),
  ExecutionCancelledDueToRandomnessUnavailable: null
});
var ExecutionStatus = bcs2.enum("ExecutionStatus", {
  Success: null,
  Failed: bcs2.struct("ExecutionFailed", {
    error: ExecutionFailureStatus,
    command: bcs2.option(bcs2.u64())
  })
});
var GasCostSummary = bcs2.struct("GasCostSummary", {
  computationCost: bcs2.u64(),
  storageCost: bcs2.u64(),
  storageRebate: bcs2.u64(),
  nonRefundableStorageFee: bcs2.u64()
});
var Owner = bcs2.enum("Owner", {
  AddressOwner: Address,
  ObjectOwner: Address,
  Shared: bcs2.struct("Shared", {
    initialSharedVersion: bcs2.u64()
  }),
  Immutable: null
});
var TransactionEffectsV1 = bcs2.struct("TransactionEffectsV1", {
  status: ExecutionStatus,
  executedEpoch: bcs2.u64(),
  gasUsed: GasCostSummary,
  modifiedAtVersions: bcs2.vector(bcs2.tuple([Address, bcs2.u64()])),
  sharedObjects: bcs2.vector(SuiObjectRef),
  transactionDigest: ObjectDigest,
  created: bcs2.vector(bcs2.tuple([SuiObjectRef, Owner])),
  mutated: bcs2.vector(bcs2.tuple([SuiObjectRef, Owner])),
  unwrapped: bcs2.vector(bcs2.tuple([SuiObjectRef, Owner])),
  deleted: bcs2.vector(SuiObjectRef),
  unwrappedThenDeleted: bcs2.vector(SuiObjectRef),
  wrapped: bcs2.vector(SuiObjectRef),
  gasObject: bcs2.tuple([SuiObjectRef, Owner]),
  eventsDigest: bcs2.option(ObjectDigest),
  dependencies: bcs2.vector(ObjectDigest)
});
var VersionDigest = bcs2.tuple([bcs2.u64(), ObjectDigest]);
var ObjectIn = bcs2.enum("ObjectIn", {
  NotExist: null,
  Exist: bcs2.tuple([VersionDigest, Owner])
});
var ObjectOut = bcs2.enum("ObjectOut", {
  NotExist: null,
  ObjectWrite: bcs2.tuple([ObjectDigest, Owner]),
  PackageWrite: VersionDigest
});
var IDOperation = bcs2.enum("IDOperation", {
  None: null,
  Created: null,
  Deleted: null
});
var EffectsObjectChange = bcs2.struct("EffectsObjectChange", {
  inputState: ObjectIn,
  outputState: ObjectOut,
  idOperation: IDOperation
});
var UnchangedSharedKind = bcs2.enum("UnchangedSharedKind", {
  ReadOnlyRoot: VersionDigest,
  MutateDeleted: bcs2.u64(),
  ReadDeleted: bcs2.u64(),
  Cancelled: bcs2.u64(),
  PerEpochConfig: null
});
var TransactionEffectsV2 = bcs2.struct("TransactionEffectsV2", {
  status: ExecutionStatus,
  executedEpoch: bcs2.u64(),
  gasUsed: GasCostSummary,
  transactionDigest: ObjectDigest,
  gasObjectIndex: bcs2.option(bcs2.u32()),
  eventsDigest: bcs2.option(ObjectDigest),
  dependencies: bcs2.vector(ObjectDigest),
  lamportVersion: bcs2.u64(),
  changedObjects: bcs2.vector(bcs2.tuple([Address, EffectsObjectChange])),
  unchangedSharedObjects: bcs2.vector(bcs2.tuple([Address, UnchangedSharedKind])),
  auxDataDigest: bcs2.option(ObjectDigest)
});
var TransactionEffects = bcs2.enum("TransactionEffects", {
  V1: TransactionEffectsV1,
  V2: TransactionEffectsV2
});

// ../../node_modules/@mysten/sui/dist/esm/bcs/index.js
import { BcsType } from "@mysten/bcs";
var suiBcs = {
  ...bcs3,
  U8: bcs3.u8(),
  U16: bcs3.u16(),
  U32: bcs3.u32(),
  U64: bcs3.u64(),
  U128: bcs3.u128(),
  U256: bcs3.u256(),
  ULEB128: bcs3.uleb128(),
  Bool: bcs3.bool(),
  String: bcs3.string(),
  Address,
  AppId,
  Argument,
  CallArg,
  CompressedSignature,
  GasData,
  Intent,
  IntentMessage,
  IntentScope,
  IntentVersion,
  MultiSig,
  MultiSigPkMap,
  MultiSigPublicKey,
  ObjectArg,
  ObjectDigest,
  ProgrammableMoveCall,
  ProgrammableTransaction,
  PublicKey,
  SenderSignedData,
  SenderSignedTransaction,
  SharedObjectRef,
  StructTag,
  SuiObjectRef,
  Command,
  TransactionData,
  TransactionDataV1,
  TransactionExpiration,
  TransactionKind,
  TypeTag,
  TransactionEffects,
  PasskeyAuthenticator
};

// src/routes/user.ts
import cors2 from "cors";

// ../../node_modules/@mysten/sui/dist/esm/verify/verify.js
import { fromBase64 as fromBase6412 } from "@mysten/bcs";

// ../../node_modules/@mysten/sui/dist/esm/cryptography/signature.js
import { fromBase64 as fromBase647, toBase64 as toBase647 } from "@mysten/bcs";

// ../../node_modules/@mysten/sui/dist/esm/keypairs/passkey/publickey.js
import { fromBase64 as fromBase644, toBase64 as toBase644 } from "@mysten/bcs";

// ../../node_modules/@noble/hashes/esm/_md.js
function setBigUint64(view, byteOffset, value2, isLE2) {
  if (typeof view.setBigUint64 === "function")
    return view.setBigUint64(byteOffset, value2, isLE2);
  const _32n2 = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value2 >> _32n2 & _u32_max);
  const wl = Number(value2 & _u32_max);
  const h = isLE2 ? 4 : 0;
  const l2 = isLE2 ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE2);
  view.setUint32(byteOffset + l2, wl, isLE2);
}
var Chi = (a3, b, c) => a3 & b ^ ~a3 & c;
var Maj = (a3, b, c) => a3 & b ^ a3 & c ^ b & c;
var HashMD = class extends Hash {
  constructor(blockLen, outputLen, padOffset, isLE2) {
    super();
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE2;
    this.finished = false;
    this.length = 0;
    this.pos = 0;
    this.destroyed = false;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    const { view, buffer, blockLen } = this;
    data = toBytes(data);
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
      }
    }
    this.length += data.length;
    this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE: isLE2 } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    this.buffer.subarray(pos).fill(0);
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      pos = 0;
    }
    for (let i2 = pos; i2 < blockLen; i2++)
      buffer[i2] = 0;
    setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE2);
    this.process(view, 0);
    const oview = createView(out);
    const len = this.outputLen;
    if (len % 4)
      throw new Error("_sha2: outputLen should be aligned to 32bit");
    const outLen = len / 4;
    const state = this.get();
    if (outLen > state.length)
      throw new Error("_sha2: outputLen bigger than state");
    for (let i2 = 0; i2 < outLen; i2++)
      oview.setUint32(4 * i2, state[i2], isLE2);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to) {
    to || (to = new this.constructor());
    to.set(...this.get());
    const { blockLen, buffer, length, finished, destroyed, pos } = this;
    to.length = length;
    to.pos = pos;
    to.finished = finished;
    to.destroyed = destroyed;
    if (length % blockLen)
      to.buffer.set(buffer);
    return to;
  }
};

// ../../node_modules/@noble/hashes/esm/sha256.js
var SHA256_K = /* @__PURE__ */ new Uint32Array([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_IV = /* @__PURE__ */ new Uint32Array([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA256 = class extends HashMD {
  constructor() {
    super(64, 32, 8, false);
    this.A = SHA256_IV[0] | 0;
    this.B = SHA256_IV[1] | 0;
    this.C = SHA256_IV[2] | 0;
    this.D = SHA256_IV[3] | 0;
    this.E = SHA256_IV[4] | 0;
    this.F = SHA256_IV[5] | 0;
    this.G = SHA256_IV[6] | 0;
    this.H = SHA256_IV[7] | 0;
  }
  get() {
    const { A, B, C, D, E, F, G, H } = this;
    return [A, B, C, D, E, F, G, H];
  }
  // prettier-ignore
  set(A, B, C, D, E, F, G, H) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H | 0;
  }
  process(view, offset) {
    for (let i2 = 0; i2 < 16; i2++, offset += 4)
      SHA256_W[i2] = view.getUint32(offset, false);
    for (let i2 = 16; i2 < 64; i2++) {
      const W15 = SHA256_W[i2 - 15];
      const W2 = SHA256_W[i2 - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i2] = s1 + SHA256_W[i2 - 7] + s0 + SHA256_W[i2 - 16] | 0;
    }
    let { A, B, C, D, E, F, G, H } = this;
    for (let i2 = 0; i2 < 64; i2++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i2] + SHA256_W[i2] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C) | 0;
      H = G;
      G = F;
      F = E;
      E = D + T1 | 0;
      D = C;
      C = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G = G + this.G | 0;
    H = H + this.H | 0;
    this.set(A, B, C, D, E, F, G, H);
  }
  roundClean() {
    SHA256_W.fill(0);
  }
  destroy() {
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    this.buffer.fill(0);
  }
};
var sha256 = /* @__PURE__ */ wrapConstructor(() => new SHA256());

// ../../node_modules/@noble/hashes/esm/hmac.js
var HMAC = class extends Hash {
  constructor(hash, _key) {
    super();
    this.finished = false;
    this.destroyed = false;
    ahash(hash);
    const key = toBytes(_key);
    this.iHash = hash.create();
    if (typeof this.iHash.update !== "function")
      throw new Error("Expected instance of class which extends utils.Hash");
    this.blockLen = this.iHash.blockLen;
    this.outputLen = this.iHash.outputLen;
    const blockLen = this.blockLen;
    const pad = new Uint8Array(blockLen);
    pad.set(key.length > blockLen ? hash.create().update(key).digest() : key);
    for (let i2 = 0; i2 < pad.length; i2++)
      pad[i2] ^= 54;
    this.iHash.update(pad);
    this.oHash = hash.create();
    for (let i2 = 0; i2 < pad.length; i2++)
      pad[i2] ^= 54 ^ 92;
    this.oHash.update(pad);
    pad.fill(0);
  }
  update(buf) {
    aexists(this);
    this.iHash.update(buf);
    return this;
  }
  digestInto(out) {
    aexists(this);
    abytes(out, this.outputLen);
    this.finished = true;
    this.iHash.digestInto(out);
    this.oHash.update(out);
    this.oHash.digestInto(out);
    this.destroy();
  }
  digest() {
    const out = new Uint8Array(this.oHash.outputLen);
    this.digestInto(out);
    return out;
  }
  _cloneInto(to) {
    to || (to = Object.create(Object.getPrototypeOf(this), {}));
    const { oHash, iHash, finished, destroyed, blockLen, outputLen } = this;
    to = to;
    to.finished = finished;
    to.destroyed = destroyed;
    to.blockLen = blockLen;
    to.outputLen = outputLen;
    to.oHash = oHash._cloneInto(to.oHash);
    to.iHash = iHash._cloneInto(to.iHash);
    return to;
  }
  destroy() {
    this.destroyed = true;
    this.oHash.destroy();
    this.iHash.destroy();
  }
};
var hmac = (hash, key, message) => new HMAC(hash, key).update(message).digest();
hmac.create = (hash, key) => new HMAC(hash, key);

// ../../node_modules/@noble/curves/esm/abstract/utils.js
var utils_exports = {};
__export(utils_exports, {
  aInRange: () => aInRange,
  abool: () => abool,
  abytes: () => abytes2,
  bitGet: () => bitGet,
  bitLen: () => bitLen,
  bitMask: () => bitMask,
  bitSet: () => bitSet,
  bytesToHex: () => bytesToHex2,
  bytesToNumberBE: () => bytesToNumberBE,
  bytesToNumberLE: () => bytesToNumberLE,
  concatBytes: () => concatBytes2,
  createHmacDrbg: () => createHmacDrbg,
  ensureBytes: () => ensureBytes,
  equalBytes: () => equalBytes,
  hexToBytes: () => hexToBytes2,
  hexToNumber: () => hexToNumber,
  inRange: () => inRange,
  isBytes: () => isBytes2,
  memoized: () => memoized,
  notImplemented: () => notImplemented,
  numberToBytesBE: () => numberToBytesBE,
  numberToBytesLE: () => numberToBytesLE,
  numberToHexUnpadded: () => numberToHexUnpadded,
  numberToVarBytesBE: () => numberToVarBytesBE,
  utf8ToBytes: () => utf8ToBytes2,
  validateObject: () => validateObject
});
var _0n = /* @__PURE__ */ BigInt(0);
var _1n = /* @__PURE__ */ BigInt(1);
var _2n = /* @__PURE__ */ BigInt(2);
function isBytes2(a3) {
  return a3 instanceof Uint8Array || ArrayBuffer.isView(a3) && a3.constructor.name === "Uint8Array";
}
function abytes2(item) {
  if (!isBytes2(item))
    throw new Error("Uint8Array expected");
}
function abool(title, value2) {
  if (typeof value2 !== "boolean")
    throw new Error(title + " boolean expected, got " + value2);
}
var hexes2 = /* @__PURE__ */ Array.from({ length: 256 }, (_, i2) => i2.toString(16).padStart(2, "0"));
function bytesToHex2(bytes) {
  abytes2(bytes);
  let hex = "";
  for (let i2 = 0; i2 < bytes.length; i2++) {
    hex += hexes2[bytes[i2]];
  }
  return hex;
}
function numberToHexUnpadded(num) {
  const hex = num.toString(16);
  return hex.length & 1 ? "0" + hex : hex;
}
function hexToNumber(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  return hex === "" ? _0n : BigInt("0x" + hex);
}
var asciis2 = { _0: 48, _9: 57, A: 65, F: 70, a: 97, f: 102 };
function asciiToBase162(ch) {
  if (ch >= asciis2._0 && ch <= asciis2._9)
    return ch - asciis2._0;
  if (ch >= asciis2.A && ch <= asciis2.F)
    return ch - (asciis2.A - 10);
  if (ch >= asciis2.a && ch <= asciis2.f)
    return ch - (asciis2.a - 10);
  return;
}
function hexToBytes2(hex) {
  if (typeof hex !== "string")
    throw new Error("hex string expected, got " + typeof hex);
  const hl = hex.length;
  const al = hl / 2;
  if (hl % 2)
    throw new Error("hex string expected, got unpadded hex of length " + hl);
  const array = new Uint8Array(al);
  for (let ai = 0, hi = 0; ai < al; ai++, hi += 2) {
    const n1 = asciiToBase162(hex.charCodeAt(hi));
    const n2 = asciiToBase162(hex.charCodeAt(hi + 1));
    if (n1 === void 0 || n2 === void 0) {
      const char = hex[hi] + hex[hi + 1];
      throw new Error('hex string expected, got non-hex character "' + char + '" at index ' + hi);
    }
    array[ai] = n1 * 16 + n2;
  }
  return array;
}
function bytesToNumberBE(bytes) {
  return hexToNumber(bytesToHex2(bytes));
}
function bytesToNumberLE(bytes) {
  abytes2(bytes);
  return hexToNumber(bytesToHex2(Uint8Array.from(bytes).reverse()));
}
function numberToBytesBE(n2, len) {
  return hexToBytes2(n2.toString(16).padStart(len * 2, "0"));
}
function numberToBytesLE(n2, len) {
  return numberToBytesBE(n2, len).reverse();
}
function numberToVarBytesBE(n2) {
  return hexToBytes2(numberToHexUnpadded(n2));
}
function ensureBytes(title, hex, expectedLength) {
  let res;
  if (typeof hex === "string") {
    try {
      res = hexToBytes2(hex);
    } catch (e3) {
      throw new Error(title + " must be hex string or Uint8Array, cause: " + e3);
    }
  } else if (isBytes2(hex)) {
    res = Uint8Array.from(hex);
  } else {
    throw new Error(title + " must be hex string or Uint8Array");
  }
  const len = res.length;
  if (typeof expectedLength === "number" && len !== expectedLength)
    throw new Error(title + " of length " + expectedLength + " expected, got " + len);
  return res;
}
function concatBytes2(...arrays) {
  let sum = 0;
  for (let i2 = 0; i2 < arrays.length; i2++) {
    const a3 = arrays[i2];
    abytes2(a3);
    sum += a3.length;
  }
  const res = new Uint8Array(sum);
  for (let i2 = 0, pad = 0; i2 < arrays.length; i2++) {
    const a3 = arrays[i2];
    res.set(a3, pad);
    pad += a3.length;
  }
  return res;
}
function equalBytes(a3, b) {
  if (a3.length !== b.length)
    return false;
  let diff = 0;
  for (let i2 = 0; i2 < a3.length; i2++)
    diff |= a3[i2] ^ b[i2];
  return diff === 0;
}
function utf8ToBytes2(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
var isPosBig = (n2) => typeof n2 === "bigint" && _0n <= n2;
function inRange(n2, min, max) {
  return isPosBig(n2) && isPosBig(min) && isPosBig(max) && min <= n2 && n2 < max;
}
function aInRange(title, n2, min, max) {
  if (!inRange(n2, min, max))
    throw new Error("expected valid " + title + ": " + min + " <= n < " + max + ", got " + n2);
}
function bitLen(n2) {
  let len;
  for (len = 0; n2 > _0n; n2 >>= _1n, len += 1)
    ;
  return len;
}
function bitGet(n2, pos) {
  return n2 >> BigInt(pos) & _1n;
}
function bitSet(n2, pos, value2) {
  return n2 | (value2 ? _1n : _0n) << BigInt(pos);
}
var bitMask = (n2) => (_2n << BigInt(n2 - 1)) - _1n;
var u8n = (data) => new Uint8Array(data);
var u8fr = (arr) => Uint8Array.from(arr);
function createHmacDrbg(hashLen, qByteLen, hmacFn) {
  if (typeof hashLen !== "number" || hashLen < 2)
    throw new Error("hashLen must be a number");
  if (typeof qByteLen !== "number" || qByteLen < 2)
    throw new Error("qByteLen must be a number");
  if (typeof hmacFn !== "function")
    throw new Error("hmacFn must be a function");
  let v2 = u8n(hashLen);
  let k = u8n(hashLen);
  let i2 = 0;
  const reset = () => {
    v2.fill(1);
    k.fill(0);
    i2 = 0;
  };
  const h = (...b) => hmacFn(k, v2, ...b);
  const reseed = (seed = u8n()) => {
    k = h(u8fr([0]), seed);
    v2 = h();
    if (seed.length === 0)
      return;
    k = h(u8fr([1]), seed);
    v2 = h();
  };
  const gen = () => {
    if (i2++ >= 1e3)
      throw new Error("drbg: tried 1000 values");
    let len = 0;
    const out = [];
    while (len < qByteLen) {
      v2 = h();
      const sl = v2.slice();
      out.push(sl);
      len += v2.length;
    }
    return concatBytes2(...out);
  };
  const genUntil = (seed, pred) => {
    reset();
    reseed(seed);
    let res = void 0;
    while (!(res = pred(gen())))
      reseed();
    reset();
    return res;
  };
  return genUntil;
}
var validatorFns = {
  bigint: (val) => typeof val === "bigint",
  function: (val) => typeof val === "function",
  boolean: (val) => typeof val === "boolean",
  string: (val) => typeof val === "string",
  stringOrUint8Array: (val) => typeof val === "string" || isBytes2(val),
  isSafeInteger: (val) => Number.isSafeInteger(val),
  array: (val) => Array.isArray(val),
  field: (val, object) => object.Fp.isValid(val),
  hash: (val) => typeof val === "function" && Number.isSafeInteger(val.outputLen)
};
function validateObject(object, validators, optValidators = {}) {
  const checkField = (fieldName, type2, isOptional) => {
    const checkVal = validatorFns[type2];
    if (typeof checkVal !== "function")
      throw new Error("invalid validator function");
    const val = object[fieldName];
    if (isOptional && val === void 0)
      return;
    if (!checkVal(val, object)) {
      throw new Error("param " + String(fieldName) + " is invalid. Expected " + type2 + ", got " + val);
    }
  };
  for (const [fieldName, type2] of Object.entries(validators))
    checkField(fieldName, type2, false);
  for (const [fieldName, type2] of Object.entries(optValidators))
    checkField(fieldName, type2, true);
  return object;
}
var notImplemented = () => {
  throw new Error("not implemented");
};
function memoized(fn) {
  const map = /* @__PURE__ */ new WeakMap();
  return (arg, ...args) => {
    const val = map.get(arg);
    if (val !== void 0)
      return val;
    const computed = fn(arg, ...args);
    map.set(arg, computed);
    return computed;
  };
}

// ../../node_modules/@noble/curves/esm/abstract/modular.js
var _0n2 = BigInt(0);
var _1n2 = BigInt(1);
var _2n2 = /* @__PURE__ */ BigInt(2);
var _3n = /* @__PURE__ */ BigInt(3);
var _4n = /* @__PURE__ */ BigInt(4);
var _5n = /* @__PURE__ */ BigInt(5);
var _8n = /* @__PURE__ */ BigInt(8);
var _9n = /* @__PURE__ */ BigInt(9);
var _16n = /* @__PURE__ */ BigInt(16);
function mod(a3, b) {
  const result = a3 % b;
  return result >= _0n2 ? result : b + result;
}
function pow(num, power, modulo) {
  if (power < _0n2)
    throw new Error("invalid exponent, negatives unsupported");
  if (modulo <= _0n2)
    throw new Error("invalid modulus");
  if (modulo === _1n2)
    return _0n2;
  let res = _1n2;
  while (power > _0n2) {
    if (power & _1n2)
      res = res * num % modulo;
    num = num * num % modulo;
    power >>= _1n2;
  }
  return res;
}
function pow2(x, power, modulo) {
  let res = x;
  while (power-- > _0n2) {
    res *= res;
    res %= modulo;
  }
  return res;
}
function invert(number, modulo) {
  if (number === _0n2)
    throw new Error("invert: expected non-zero number");
  if (modulo <= _0n2)
    throw new Error("invert: expected positive modulus, got " + modulo);
  let a3 = mod(number, modulo);
  let b = modulo;
  let x = _0n2, y = _1n2, u2 = _1n2, v2 = _0n2;
  while (a3 !== _0n2) {
    const q = b / a3;
    const r = b % a3;
    const m = x - u2 * q;
    const n2 = y - v2 * q;
    b = a3, a3 = r, x = u2, y = v2, u2 = m, v2 = n2;
  }
  const gcd = b;
  if (gcd !== _1n2)
    throw new Error("invert: does not exist");
  return mod(x, modulo);
}
function tonelliShanks(P) {
  const legendreC = (P - _1n2) / _2n2;
  let Q, S, Z;
  for (Q = P - _1n2, S = 0; Q % _2n2 === _0n2; Q /= _2n2, S++)
    ;
  for (Z = _2n2; Z < P && pow(Z, legendreC, P) !== P - _1n2; Z++) {
    if (Z > 1e3)
      throw new Error("Cannot find square root: likely non-prime P");
  }
  if (S === 1) {
    const p1div4 = (P + _1n2) / _4n;
    return function tonelliFast(Fp2, n2) {
      const root = Fp2.pow(n2, p1div4);
      if (!Fp2.eql(Fp2.sqr(root), n2))
        throw new Error("Cannot find square root");
      return root;
    };
  }
  const Q1div2 = (Q + _1n2) / _2n2;
  return function tonelliSlow(Fp2, n2) {
    if (Fp2.pow(n2, legendreC) === Fp2.neg(Fp2.ONE))
      throw new Error("Cannot find square root");
    let r = S;
    let g = Fp2.pow(Fp2.mul(Fp2.ONE, Z), Q);
    let x = Fp2.pow(n2, Q1div2);
    let b = Fp2.pow(n2, Q);
    while (!Fp2.eql(b, Fp2.ONE)) {
      if (Fp2.eql(b, Fp2.ZERO))
        return Fp2.ZERO;
      let m = 1;
      for (let t22 = Fp2.sqr(b); m < r; m++) {
        if (Fp2.eql(t22, Fp2.ONE))
          break;
        t22 = Fp2.sqr(t22);
      }
      const ge = Fp2.pow(g, _1n2 << BigInt(r - m - 1));
      g = Fp2.sqr(ge);
      x = Fp2.mul(x, ge);
      b = Fp2.mul(b, g);
      r = m;
    }
    return x;
  };
}
function FpSqrt(P) {
  if (P % _4n === _3n) {
    const p1div4 = (P + _1n2) / _4n;
    return function sqrt3mod4(Fp2, n2) {
      const root = Fp2.pow(n2, p1div4);
      if (!Fp2.eql(Fp2.sqr(root), n2))
        throw new Error("Cannot find square root");
      return root;
    };
  }
  if (P % _8n === _5n) {
    const c1 = (P - _5n) / _8n;
    return function sqrt5mod8(Fp2, n2) {
      const n22 = Fp2.mul(n2, _2n2);
      const v2 = Fp2.pow(n22, c1);
      const nv = Fp2.mul(n2, v2);
      const i2 = Fp2.mul(Fp2.mul(nv, _2n2), v2);
      const root = Fp2.mul(nv, Fp2.sub(i2, Fp2.ONE));
      if (!Fp2.eql(Fp2.sqr(root), n2))
        throw new Error("Cannot find square root");
      return root;
    };
  }
  if (P % _16n === _9n) {
  }
  return tonelliShanks(P);
}
var isNegativeLE = (num, modulo) => (mod(num, modulo) & _1n2) === _1n2;
var FIELD_FIELDS = [
  "create",
  "isValid",
  "is0",
  "neg",
  "inv",
  "sqrt",
  "sqr",
  "eql",
  "add",
  "sub",
  "mul",
  "pow",
  "div",
  "addN",
  "subN",
  "mulN",
  "sqrN"
];
function validateField(field) {
  const initial = {
    ORDER: "bigint",
    MASK: "bigint",
    BYTES: "isSafeInteger",
    BITS: "isSafeInteger"
  };
  const opts = FIELD_FIELDS.reduce((map, val) => {
    map[val] = "function";
    return map;
  }, initial);
  return validateObject(field, opts);
}
function FpPow(f, num, power) {
  if (power < _0n2)
    throw new Error("invalid exponent, negatives unsupported");
  if (power === _0n2)
    return f.ONE;
  if (power === _1n2)
    return num;
  let p = f.ONE;
  let d2 = num;
  while (power > _0n2) {
    if (power & _1n2)
      p = f.mul(p, d2);
    d2 = f.sqr(d2);
    power >>= _1n2;
  }
  return p;
}
function FpInvertBatch(f, nums) {
  const tmp = new Array(nums.length);
  const lastMultiplied = nums.reduce((acc, num, i2) => {
    if (f.is0(num))
      return acc;
    tmp[i2] = acc;
    return f.mul(acc, num);
  }, f.ONE);
  const inverted = f.inv(lastMultiplied);
  nums.reduceRight((acc, num, i2) => {
    if (f.is0(num))
      return acc;
    tmp[i2] = f.mul(acc, tmp[i2]);
    return f.mul(acc, num);
  }, inverted);
  return tmp;
}
function nLength(n2, nBitLength) {
  const _nBitLength = nBitLength !== void 0 ? nBitLength : n2.toString(2).length;
  const nByteLength = Math.ceil(_nBitLength / 8);
  return { nBitLength: _nBitLength, nByteLength };
}
function Field(ORDER, bitLen2, isLE2 = false, redef = {}) {
  if (ORDER <= _0n2)
    throw new Error("invalid field: expected ORDER > 0, got " + ORDER);
  const { nBitLength: BITS, nByteLength: BYTES } = nLength(ORDER, bitLen2);
  if (BYTES > 2048)
    throw new Error("invalid field: expected ORDER of <= 2048 bytes");
  let sqrtP;
  const f = Object.freeze({
    ORDER,
    isLE: isLE2,
    BITS,
    BYTES,
    MASK: bitMask(BITS),
    ZERO: _0n2,
    ONE: _1n2,
    create: (num) => mod(num, ORDER),
    isValid: (num) => {
      if (typeof num !== "bigint")
        throw new Error("invalid field element: expected bigint, got " + typeof num);
      return _0n2 <= num && num < ORDER;
    },
    is0: (num) => num === _0n2,
    isOdd: (num) => (num & _1n2) === _1n2,
    neg: (num) => mod(-num, ORDER),
    eql: (lhs, rhs) => lhs === rhs,
    sqr: (num) => mod(num * num, ORDER),
    add: (lhs, rhs) => mod(lhs + rhs, ORDER),
    sub: (lhs, rhs) => mod(lhs - rhs, ORDER),
    mul: (lhs, rhs) => mod(lhs * rhs, ORDER),
    pow: (num, power) => FpPow(f, num, power),
    div: (lhs, rhs) => mod(lhs * invert(rhs, ORDER), ORDER),
    // Same as above, but doesn't normalize
    sqrN: (num) => num * num,
    addN: (lhs, rhs) => lhs + rhs,
    subN: (lhs, rhs) => lhs - rhs,
    mulN: (lhs, rhs) => lhs * rhs,
    inv: (num) => invert(num, ORDER),
    sqrt: redef.sqrt || ((n2) => {
      if (!sqrtP)
        sqrtP = FpSqrt(ORDER);
      return sqrtP(f, n2);
    }),
    invertBatch: (lst) => FpInvertBatch(f, lst),
    // TODO: do we really need constant cmov?
    // We don't have const-time bigints anyway, so probably will be not very useful
    cmov: (a3, b, c) => c ? b : a3,
    toBytes: (num) => isLE2 ? numberToBytesLE(num, BYTES) : numberToBytesBE(num, BYTES),
    fromBytes: (bytes) => {
      if (bytes.length !== BYTES)
        throw new Error("Field.fromBytes: expected " + BYTES + " bytes, got " + bytes.length);
      return isLE2 ? bytesToNumberLE(bytes) : bytesToNumberBE(bytes);
    }
  });
  return Object.freeze(f);
}
function getFieldBytesLength(fieldOrder) {
  if (typeof fieldOrder !== "bigint")
    throw new Error("field order must be bigint");
  const bitLength = fieldOrder.toString(2).length;
  return Math.ceil(bitLength / 8);
}
function getMinHashLength(fieldOrder) {
  const length = getFieldBytesLength(fieldOrder);
  return length + Math.ceil(length / 2);
}
function mapHashToField(key, fieldOrder, isLE2 = false) {
  const len = key.length;
  const fieldLen = getFieldBytesLength(fieldOrder);
  const minLen = getMinHashLength(fieldOrder);
  if (len < 16 || len < minLen || len > 1024)
    throw new Error("expected " + minLen + "-1024 bytes of input, got " + len);
  const num = isLE2 ? bytesToNumberLE(key) : bytesToNumberBE(key);
  const reduced = mod(num, fieldOrder - _1n2) + _1n2;
  return isLE2 ? numberToBytesLE(reduced, fieldLen) : numberToBytesBE(reduced, fieldLen);
}

// ../../node_modules/@noble/curves/esm/abstract/curve.js
var _0n3 = BigInt(0);
var _1n3 = BigInt(1);
function constTimeNegate(condition, item) {
  const neg = item.negate();
  return condition ? neg : item;
}
function validateW(W, bits) {
  if (!Number.isSafeInteger(W) || W <= 0 || W > bits)
    throw new Error("invalid window size, expected [1.." + bits + "], got W=" + W);
}
function calcWOpts(W, bits) {
  validateW(W, bits);
  const windows = Math.ceil(bits / W) + 1;
  const windowSize = 2 ** (W - 1);
  return { windows, windowSize };
}
function validateMSMPoints(points, c) {
  if (!Array.isArray(points))
    throw new Error("array expected");
  points.forEach((p, i2) => {
    if (!(p instanceof c))
      throw new Error("invalid point at index " + i2);
  });
}
function validateMSMScalars(scalars, field) {
  if (!Array.isArray(scalars))
    throw new Error("array of scalars expected");
  scalars.forEach((s2, i2) => {
    if (!field.isValid(s2))
      throw new Error("invalid scalar at index " + i2);
  });
}
var pointPrecomputes = /* @__PURE__ */ new WeakMap();
var pointWindowSizes = /* @__PURE__ */ new WeakMap();
function getW(P) {
  return pointWindowSizes.get(P) || 1;
}
function wNAF(c, bits) {
  return {
    constTimeNegate,
    hasPrecomputes(elm) {
      return getW(elm) !== 1;
    },
    // non-const time multiplication ladder
    unsafeLadder(elm, n2, p = c.ZERO) {
      let d2 = elm;
      while (n2 > _0n3) {
        if (n2 & _1n3)
          p = p.add(d2);
        d2 = d2.double();
        n2 >>= _1n3;
      }
      return p;
    },
    /**
     * Creates a wNAF precomputation window. Used for caching.
     * Default window size is set by `utils.precompute()` and is equal to 8.
     * Number of precomputed points depends on the curve size:
     * 2^(𝑊−1) * (Math.ceil(𝑛 / 𝑊) + 1), where:
     * - 𝑊 is the window size
     * - 𝑛 is the bitlength of the curve order.
     * For a 256-bit curve and window size 8, the number of precomputed points is 128 * 33 = 4224.
     * @param elm Point instance
     * @param W window size
     * @returns precomputed point tables flattened to a single array
     */
    precomputeWindow(elm, W) {
      const { windows, windowSize } = calcWOpts(W, bits);
      const points = [];
      let p = elm;
      let base = p;
      for (let window = 0; window < windows; window++) {
        base = p;
        points.push(base);
        for (let i2 = 1; i2 < windowSize; i2++) {
          base = base.add(p);
          points.push(base);
        }
        p = base.double();
      }
      return points;
    },
    /**
     * Implements ec multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @returns real and fake (for const-time) points
     */
    wNAF(W, precomputes, n2) {
      const { windows, windowSize } = calcWOpts(W, bits);
      let p = c.ZERO;
      let f = c.BASE;
      const mask = BigInt(2 ** W - 1);
      const maxNumber = 2 ** W;
      const shiftBy = BigInt(W);
      for (let window = 0; window < windows; window++) {
        const offset = window * windowSize;
        let wbits = Number(n2 & mask);
        n2 >>= shiftBy;
        if (wbits > windowSize) {
          wbits -= maxNumber;
          n2 += _1n3;
        }
        const offset1 = offset;
        const offset2 = offset + Math.abs(wbits) - 1;
        const cond1 = window % 2 !== 0;
        const cond2 = wbits < 0;
        if (wbits === 0) {
          f = f.add(constTimeNegate(cond1, precomputes[offset1]));
        } else {
          p = p.add(constTimeNegate(cond2, precomputes[offset2]));
        }
      }
      return { p, f };
    },
    /**
     * Implements ec unsafe (non const-time) multiplication using precomputed tables and w-ary non-adjacent form.
     * @param W window size
     * @param precomputes precomputed tables
     * @param n scalar (we don't check here, but should be less than curve order)
     * @param acc accumulator point to add result of multiplication
     * @returns point
     */
    wNAFUnsafe(W, precomputes, n2, acc = c.ZERO) {
      const { windows, windowSize } = calcWOpts(W, bits);
      const mask = BigInt(2 ** W - 1);
      const maxNumber = 2 ** W;
      const shiftBy = BigInt(W);
      for (let window = 0; window < windows; window++) {
        const offset = window * windowSize;
        if (n2 === _0n3)
          break;
        let wbits = Number(n2 & mask);
        n2 >>= shiftBy;
        if (wbits > windowSize) {
          wbits -= maxNumber;
          n2 += _1n3;
        }
        if (wbits === 0)
          continue;
        let curr = precomputes[offset + Math.abs(wbits) - 1];
        if (wbits < 0)
          curr = curr.negate();
        acc = acc.add(curr);
      }
      return acc;
    },
    getPrecomputes(W, P, transform) {
      let comp = pointPrecomputes.get(P);
      if (!comp) {
        comp = this.precomputeWindow(P, W);
        if (W !== 1)
          pointPrecomputes.set(P, transform(comp));
      }
      return comp;
    },
    wNAFCached(P, n2, transform) {
      const W = getW(P);
      return this.wNAF(W, this.getPrecomputes(W, P, transform), n2);
    },
    wNAFCachedUnsafe(P, n2, transform, prev) {
      const W = getW(P);
      if (W === 1)
        return this.unsafeLadder(P, n2, prev);
      return this.wNAFUnsafe(W, this.getPrecomputes(W, P, transform), n2, prev);
    },
    // We calculate precomputes for elliptic curve point multiplication
    // using windowed method. This specifies window size and
    // stores precomputed values. Usually only base point would be precomputed.
    setWindowSize(P, W) {
      validateW(W, bits);
      pointWindowSizes.set(P, W);
      pointPrecomputes.delete(P);
    }
  };
}
function pippenger(c, fieldN, points, scalars) {
  validateMSMPoints(points, c);
  validateMSMScalars(scalars, fieldN);
  if (points.length !== scalars.length)
    throw new Error("arrays of points and scalars must have equal length");
  const zero = c.ZERO;
  const wbits = bitLen(BigInt(points.length));
  const windowSize = wbits > 12 ? wbits - 3 : wbits > 4 ? wbits - 2 : wbits ? 2 : 1;
  const MASK = (1 << windowSize) - 1;
  const buckets = new Array(MASK + 1).fill(zero);
  const lastBits = Math.floor((fieldN.BITS - 1) / windowSize) * windowSize;
  let sum = zero;
  for (let i2 = lastBits; i2 >= 0; i2 -= windowSize) {
    buckets.fill(zero);
    for (let j = 0; j < scalars.length; j++) {
      const scalar = scalars[j];
      const wbits2 = Number(scalar >> BigInt(i2) & BigInt(MASK));
      buckets[wbits2] = buckets[wbits2].add(points[j]);
    }
    let resI = zero;
    for (let j = buckets.length - 1, sumI = zero; j > 0; j--) {
      sumI = sumI.add(buckets[j]);
      resI = resI.add(sumI);
    }
    sum = sum.add(resI);
    if (i2 !== 0)
      for (let j = 0; j < windowSize; j++)
        sum = sum.double();
  }
  return sum;
}
function validateBasic(curve) {
  validateField(curve.Fp);
  validateObject(curve, {
    n: "bigint",
    h: "bigint",
    Gx: "field",
    Gy: "field"
  }, {
    nBitLength: "isSafeInteger",
    nByteLength: "isSafeInteger"
  });
  return Object.freeze({
    ...nLength(curve.n, curve.nBitLength),
    ...curve,
    ...{ p: curve.Fp.ORDER }
  });
}

// ../../node_modules/@noble/curves/esm/abstract/weierstrass.js
function validateSigVerOpts(opts) {
  if (opts.lowS !== void 0)
    abool("lowS", opts.lowS);
  if (opts.prehash !== void 0)
    abool("prehash", opts.prehash);
}
function validatePointOpts(curve) {
  const opts = validateBasic(curve);
  validateObject(opts, {
    a: "field",
    b: "field"
  }, {
    allowedPrivateKeyLengths: "array",
    wrapPrivateKey: "boolean",
    isTorsionFree: "function",
    clearCofactor: "function",
    allowInfinityPoint: "boolean",
    fromBytes: "function",
    toBytes: "function"
  });
  const { endo, Fp: Fp2, a: a3 } = opts;
  if (endo) {
    if (!Fp2.eql(a3, Fp2.ZERO)) {
      throw new Error("invalid endomorphism, can only be defined for Koblitz curves that have a=0");
    }
    if (typeof endo !== "object" || typeof endo.beta !== "bigint" || typeof endo.splitScalar !== "function") {
      throw new Error("invalid endomorphism, expected beta: bigint and splitScalar: function");
    }
  }
  return Object.freeze({ ...opts });
}
var { bytesToNumberBE: b2n, hexToBytes: h2b } = utils_exports;
var DERErr = class extends Error {
  constructor(m = "") {
    super(m);
  }
};
var DER = {
  // asn.1 DER encoding utils
  Err: DERErr,
  // Basic building block is TLV (Tag-Length-Value)
  _tlv: {
    encode: (tag, data) => {
      const { Err: E } = DER;
      if (tag < 0 || tag > 256)
        throw new E("tlv.encode: wrong tag");
      if (data.length & 1)
        throw new E("tlv.encode: unpadded data");
      const dataLen = data.length / 2;
      const len = numberToHexUnpadded(dataLen);
      if (len.length / 2 & 128)
        throw new E("tlv.encode: long form length too big");
      const lenLen = dataLen > 127 ? numberToHexUnpadded(len.length / 2 | 128) : "";
      const t3 = numberToHexUnpadded(tag);
      return t3 + lenLen + len + data;
    },
    // v - value, l - left bytes (unparsed)
    decode(tag, data) {
      const { Err: E } = DER;
      let pos = 0;
      if (tag < 0 || tag > 256)
        throw new E("tlv.encode: wrong tag");
      if (data.length < 2 || data[pos++] !== tag)
        throw new E("tlv.decode: wrong tlv");
      const first = data[pos++];
      const isLong = !!(first & 128);
      let length = 0;
      if (!isLong)
        length = first;
      else {
        const lenLen = first & 127;
        if (!lenLen)
          throw new E("tlv.decode(long): indefinite length not supported");
        if (lenLen > 4)
          throw new E("tlv.decode(long): byte length is too big");
        const lengthBytes = data.subarray(pos, pos + lenLen);
        if (lengthBytes.length !== lenLen)
          throw new E("tlv.decode: length bytes not complete");
        if (lengthBytes[0] === 0)
          throw new E("tlv.decode(long): zero leftmost byte");
        for (const b of lengthBytes)
          length = length << 8 | b;
        pos += lenLen;
        if (length < 128)
          throw new E("tlv.decode(long): not minimal encoding");
      }
      const v2 = data.subarray(pos, pos + length);
      if (v2.length !== length)
        throw new E("tlv.decode: wrong value length");
      return { v: v2, l: data.subarray(pos + length) };
    }
  },
  // https://crypto.stackexchange.com/a/57734 Leftmost bit of first byte is 'negative' flag,
  // since we always use positive integers here. It must always be empty:
  // - add zero byte if exists
  // - if next byte doesn't have a flag, leading zero is not allowed (minimal encoding)
  _int: {
    encode(num) {
      const { Err: E } = DER;
      if (num < _0n4)
        throw new E("integer: negative integers are not allowed");
      let hex = numberToHexUnpadded(num);
      if (Number.parseInt(hex[0], 16) & 8)
        hex = "00" + hex;
      if (hex.length & 1)
        throw new E("unexpected DER parsing assertion: unpadded hex");
      return hex;
    },
    decode(data) {
      const { Err: E } = DER;
      if (data[0] & 128)
        throw new E("invalid signature integer: negative");
      if (data[0] === 0 && !(data[1] & 128))
        throw new E("invalid signature integer: unnecessary leading zero");
      return b2n(data);
    }
  },
  toSig(hex) {
    const { Err: E, _int: int, _tlv: tlv } = DER;
    const data = typeof hex === "string" ? h2b(hex) : hex;
    abytes2(data);
    const { v: seqBytes, l: seqLeftBytes } = tlv.decode(48, data);
    if (seqLeftBytes.length)
      throw new E("invalid signature: left bytes after parsing");
    const { v: rBytes, l: rLeftBytes } = tlv.decode(2, seqBytes);
    const { v: sBytes, l: sLeftBytes } = tlv.decode(2, rLeftBytes);
    if (sLeftBytes.length)
      throw new E("invalid signature: left bytes after parsing");
    return { r: int.decode(rBytes), s: int.decode(sBytes) };
  },
  hexFromSig(sig) {
    const { _tlv: tlv, _int: int } = DER;
    const rs = tlv.encode(2, int.encode(sig.r));
    const ss = tlv.encode(2, int.encode(sig.s));
    const seq = rs + ss;
    return tlv.encode(48, seq);
  }
};
var _0n4 = BigInt(0);
var _1n4 = BigInt(1);
var _2n3 = BigInt(2);
var _3n2 = BigInt(3);
var _4n2 = BigInt(4);
function weierstrassPoints(opts) {
  const CURVE = validatePointOpts(opts);
  const { Fp: Fp2 } = CURVE;
  const Fn = Field(CURVE.n, CURVE.nBitLength);
  const toBytes2 = CURVE.toBytes || ((_c, point, _isCompressed) => {
    const a3 = point.toAffine();
    return concatBytes2(Uint8Array.from([4]), Fp2.toBytes(a3.x), Fp2.toBytes(a3.y));
  });
  const fromBytes = CURVE.fromBytes || ((bytes) => {
    const tail = bytes.subarray(1);
    const x = Fp2.fromBytes(tail.subarray(0, Fp2.BYTES));
    const y = Fp2.fromBytes(tail.subarray(Fp2.BYTES, 2 * Fp2.BYTES));
    return { x, y };
  });
  function weierstrassEquation(x) {
    const { a: a3, b } = CURVE;
    const x2 = Fp2.sqr(x);
    const x3 = Fp2.mul(x2, x);
    return Fp2.add(Fp2.add(x3, Fp2.mul(x, a3)), b);
  }
  if (!Fp2.eql(Fp2.sqr(CURVE.Gy), weierstrassEquation(CURVE.Gx)))
    throw new Error("bad generator point: equation left != right");
  function isWithinCurveOrder(num) {
    return inRange(num, _1n4, CURVE.n);
  }
  function normPrivateKeyToScalar(key) {
    const { allowedPrivateKeyLengths: lengths, nByteLength, wrapPrivateKey, n: N } = CURVE;
    if (lengths && typeof key !== "bigint") {
      if (isBytes2(key))
        key = bytesToHex2(key);
      if (typeof key !== "string" || !lengths.includes(key.length))
        throw new Error("invalid private key");
      key = key.padStart(nByteLength * 2, "0");
    }
    let num;
    try {
      num = typeof key === "bigint" ? key : bytesToNumberBE(ensureBytes("private key", key, nByteLength));
    } catch (error2) {
      throw new Error("invalid private key, expected hex or " + nByteLength + " bytes, got " + typeof key);
    }
    if (wrapPrivateKey)
      num = mod(num, N);
    aInRange("private key", num, _1n4, N);
    return num;
  }
  function assertPrjPoint(other) {
    if (!(other instanceof Point2))
      throw new Error("ProjectivePoint expected");
  }
  const toAffineMemo = memoized((p, iz) => {
    const { px: x, py: y, pz: z } = p;
    if (Fp2.eql(z, Fp2.ONE))
      return { x, y };
    const is0 = p.is0();
    if (iz == null)
      iz = is0 ? Fp2.ONE : Fp2.inv(z);
    const ax = Fp2.mul(x, iz);
    const ay = Fp2.mul(y, iz);
    const zz = Fp2.mul(z, iz);
    if (is0)
      return { x: Fp2.ZERO, y: Fp2.ZERO };
    if (!Fp2.eql(zz, Fp2.ONE))
      throw new Error("invZ was invalid");
    return { x: ax, y: ay };
  });
  const assertValidMemo = memoized((p) => {
    if (p.is0()) {
      if (CURVE.allowInfinityPoint && !Fp2.is0(p.py))
        return;
      throw new Error("bad point: ZERO");
    }
    const { x, y } = p.toAffine();
    if (!Fp2.isValid(x) || !Fp2.isValid(y))
      throw new Error("bad point: x or y not FE");
    const left = Fp2.sqr(y);
    const right = weierstrassEquation(x);
    if (!Fp2.eql(left, right))
      throw new Error("bad point: equation left != right");
    if (!p.isTorsionFree())
      throw new Error("bad point: not in prime-order subgroup");
    return true;
  });
  class Point2 {
    constructor(px, py, pz) {
      this.px = px;
      this.py = py;
      this.pz = pz;
      if (px == null || !Fp2.isValid(px))
        throw new Error("x required");
      if (py == null || !Fp2.isValid(py))
        throw new Error("y required");
      if (pz == null || !Fp2.isValid(pz))
        throw new Error("z required");
      Object.freeze(this);
    }
    // Does not validate if the point is on-curve.
    // Use fromHex instead, or call assertValidity() later.
    static fromAffine(p) {
      const { x, y } = p || {};
      if (!p || !Fp2.isValid(x) || !Fp2.isValid(y))
        throw new Error("invalid affine point");
      if (p instanceof Point2)
        throw new Error("projective point not allowed");
      const is0 = (i2) => Fp2.eql(i2, Fp2.ZERO);
      if (is0(x) && is0(y))
        return Point2.ZERO;
      return new Point2(x, y, Fp2.ONE);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    /**
     * Takes a bunch of Projective Points but executes only one
     * inversion on all of them. Inversion is very slow operation,
     * so this improves performance massively.
     * Optimization: converts a list of projective points to a list of identical points with Z=1.
     */
    static normalizeZ(points) {
      const toInv = Fp2.invertBatch(points.map((p) => p.pz));
      return points.map((p, i2) => p.toAffine(toInv[i2])).map(Point2.fromAffine);
    }
    /**
     * Converts hash string or Uint8Array to Point.
     * @param hex short/long ECDSA hex
     */
    static fromHex(hex) {
      const P = Point2.fromAffine(fromBytes(ensureBytes("pointHex", hex)));
      P.assertValidity();
      return P;
    }
    // Multiplies generator point by privateKey.
    static fromPrivateKey(privateKey) {
      return Point2.BASE.multiply(normPrivateKeyToScalar(privateKey));
    }
    // Multiscalar Multiplication
    static msm(points, scalars) {
      return pippenger(Point2, Fn, points, scalars);
    }
    // "Private method", don't use it directly
    _setWindowSize(windowSize) {
      wnaf.setWindowSize(this, windowSize);
    }
    // A point on curve is valid if it conforms to equation.
    assertValidity() {
      assertValidMemo(this);
    }
    hasEvenY() {
      const { y } = this.toAffine();
      if (Fp2.isOdd)
        return !Fp2.isOdd(y);
      throw new Error("Field doesn't support isOdd");
    }
    /**
     * Compare one point to another.
     */
    equals(other) {
      assertPrjPoint(other);
      const { px: X1, py: Y1, pz: Z1 } = this;
      const { px: X2, py: Y2, pz: Z2 } = other;
      const U1 = Fp2.eql(Fp2.mul(X1, Z2), Fp2.mul(X2, Z1));
      const U2 = Fp2.eql(Fp2.mul(Y1, Z2), Fp2.mul(Y2, Z1));
      return U1 && U2;
    }
    /**
     * Flips point to one corresponding to (x, -y) in Affine coordinates.
     */
    negate() {
      return new Point2(this.px, Fp2.neg(this.py), this.pz);
    }
    // Renes-Costello-Batina exception-free doubling formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 3
    // Cost: 8M + 3S + 3*a + 2*b3 + 15add.
    double() {
      const { a: a3, b } = CURVE;
      const b3 = Fp2.mul(b, _3n2);
      const { px: X1, py: Y1, pz: Z1 } = this;
      let X3 = Fp2.ZERO, Y3 = Fp2.ZERO, Z3 = Fp2.ZERO;
      let t0 = Fp2.mul(X1, X1);
      let t1 = Fp2.mul(Y1, Y1);
      let t22 = Fp2.mul(Z1, Z1);
      let t3 = Fp2.mul(X1, Y1);
      t3 = Fp2.add(t3, t3);
      Z3 = Fp2.mul(X1, Z1);
      Z3 = Fp2.add(Z3, Z3);
      X3 = Fp2.mul(a3, Z3);
      Y3 = Fp2.mul(b3, t22);
      Y3 = Fp2.add(X3, Y3);
      X3 = Fp2.sub(t1, Y3);
      Y3 = Fp2.add(t1, Y3);
      Y3 = Fp2.mul(X3, Y3);
      X3 = Fp2.mul(t3, X3);
      Z3 = Fp2.mul(b3, Z3);
      t22 = Fp2.mul(a3, t22);
      t3 = Fp2.sub(t0, t22);
      t3 = Fp2.mul(a3, t3);
      t3 = Fp2.add(t3, Z3);
      Z3 = Fp2.add(t0, t0);
      t0 = Fp2.add(Z3, t0);
      t0 = Fp2.add(t0, t22);
      t0 = Fp2.mul(t0, t3);
      Y3 = Fp2.add(Y3, t0);
      t22 = Fp2.mul(Y1, Z1);
      t22 = Fp2.add(t22, t22);
      t0 = Fp2.mul(t22, t3);
      X3 = Fp2.sub(X3, t0);
      Z3 = Fp2.mul(t22, t1);
      Z3 = Fp2.add(Z3, Z3);
      Z3 = Fp2.add(Z3, Z3);
      return new Point2(X3, Y3, Z3);
    }
    // Renes-Costello-Batina exception-free addition formula.
    // There is 30% faster Jacobian formula, but it is not complete.
    // https://eprint.iacr.org/2015/1060, algorithm 1
    // Cost: 12M + 0S + 3*a + 3*b3 + 23add.
    add(other) {
      assertPrjPoint(other);
      const { px: X1, py: Y1, pz: Z1 } = this;
      const { px: X2, py: Y2, pz: Z2 } = other;
      let X3 = Fp2.ZERO, Y3 = Fp2.ZERO, Z3 = Fp2.ZERO;
      const a3 = CURVE.a;
      const b3 = Fp2.mul(CURVE.b, _3n2);
      let t0 = Fp2.mul(X1, X2);
      let t1 = Fp2.mul(Y1, Y2);
      let t22 = Fp2.mul(Z1, Z2);
      let t3 = Fp2.add(X1, Y1);
      let t4 = Fp2.add(X2, Y2);
      t3 = Fp2.mul(t3, t4);
      t4 = Fp2.add(t0, t1);
      t3 = Fp2.sub(t3, t4);
      t4 = Fp2.add(X1, Z1);
      let t5 = Fp2.add(X2, Z2);
      t4 = Fp2.mul(t4, t5);
      t5 = Fp2.add(t0, t22);
      t4 = Fp2.sub(t4, t5);
      t5 = Fp2.add(Y1, Z1);
      X3 = Fp2.add(Y2, Z2);
      t5 = Fp2.mul(t5, X3);
      X3 = Fp2.add(t1, t22);
      t5 = Fp2.sub(t5, X3);
      Z3 = Fp2.mul(a3, t4);
      X3 = Fp2.mul(b3, t22);
      Z3 = Fp2.add(X3, Z3);
      X3 = Fp2.sub(t1, Z3);
      Z3 = Fp2.add(t1, Z3);
      Y3 = Fp2.mul(X3, Z3);
      t1 = Fp2.add(t0, t0);
      t1 = Fp2.add(t1, t0);
      t22 = Fp2.mul(a3, t22);
      t4 = Fp2.mul(b3, t4);
      t1 = Fp2.add(t1, t22);
      t22 = Fp2.sub(t0, t22);
      t22 = Fp2.mul(a3, t22);
      t4 = Fp2.add(t4, t22);
      t0 = Fp2.mul(t1, t4);
      Y3 = Fp2.add(Y3, t0);
      t0 = Fp2.mul(t5, t4);
      X3 = Fp2.mul(t3, X3);
      X3 = Fp2.sub(X3, t0);
      t0 = Fp2.mul(t3, t1);
      Z3 = Fp2.mul(t5, Z3);
      Z3 = Fp2.add(Z3, t0);
      return new Point2(X3, Y3, Z3);
    }
    subtract(other) {
      return this.add(other.negate());
    }
    is0() {
      return this.equals(Point2.ZERO);
    }
    wNAF(n2) {
      return wnaf.wNAFCached(this, n2, Point2.normalizeZ);
    }
    /**
     * Non-constant-time multiplication. Uses double-and-add algorithm.
     * It's faster, but should only be used when you don't care about
     * an exposed private key e.g. sig verification, which works over *public* keys.
     */
    multiplyUnsafe(sc) {
      const { endo, n: N } = CURVE;
      aInRange("scalar", sc, _0n4, N);
      const I = Point2.ZERO;
      if (sc === _0n4)
        return I;
      if (this.is0() || sc === _1n4)
        return this;
      if (!endo || wnaf.hasPrecomputes(this))
        return wnaf.wNAFCachedUnsafe(this, sc, Point2.normalizeZ);
      let { k1neg, k1, k2neg, k2 } = endo.splitScalar(sc);
      let k1p = I;
      let k2p = I;
      let d2 = this;
      while (k1 > _0n4 || k2 > _0n4) {
        if (k1 & _1n4)
          k1p = k1p.add(d2);
        if (k2 & _1n4)
          k2p = k2p.add(d2);
        d2 = d2.double();
        k1 >>= _1n4;
        k2 >>= _1n4;
      }
      if (k1neg)
        k1p = k1p.negate();
      if (k2neg)
        k2p = k2p.negate();
      k2p = new Point2(Fp2.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
      return k1p.add(k2p);
    }
    /**
     * Constant time multiplication.
     * Uses wNAF method. Windowed method may be 10% faster,
     * but takes 2x longer to generate and consumes 2x memory.
     * Uses precomputes when available.
     * Uses endomorphism for Koblitz curves.
     * @param scalar by which the point would be multiplied
     * @returns New point
     */
    multiply(scalar) {
      const { endo, n: N } = CURVE;
      aInRange("scalar", scalar, _1n4, N);
      let point, fake;
      if (endo) {
        const { k1neg, k1, k2neg, k2 } = endo.splitScalar(scalar);
        let { p: k1p, f: f1p } = this.wNAF(k1);
        let { p: k2p, f: f2p } = this.wNAF(k2);
        k1p = wnaf.constTimeNegate(k1neg, k1p);
        k2p = wnaf.constTimeNegate(k2neg, k2p);
        k2p = new Point2(Fp2.mul(k2p.px, endo.beta), k2p.py, k2p.pz);
        point = k1p.add(k2p);
        fake = f1p.add(f2p);
      } else {
        const { p, f } = this.wNAF(scalar);
        point = p;
        fake = f;
      }
      return Point2.normalizeZ([point, fake])[0];
    }
    /**
     * Efficiently calculate `aP + bQ`. Unsafe, can expose private key, if used incorrectly.
     * Not using Strauss-Shamir trick: precomputation tables are faster.
     * The trick could be useful if both P and Q are not G (not in our case).
     * @returns non-zero affine point
     */
    multiplyAndAddUnsafe(Q, a3, b) {
      const G = Point2.BASE;
      const mul = (P, a4) => a4 === _0n4 || a4 === _1n4 || !P.equals(G) ? P.multiplyUnsafe(a4) : P.multiply(a4);
      const sum = mul(this, a3).add(mul(Q, b));
      return sum.is0() ? void 0 : sum;
    }
    // Converts Projective point to affine (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    // (x, y, z) ∋ (x=x/z, y=y/z)
    toAffine(iz) {
      return toAffineMemo(this, iz);
    }
    isTorsionFree() {
      const { h: cofactor, isTorsionFree } = CURVE;
      if (cofactor === _1n4)
        return true;
      if (isTorsionFree)
        return isTorsionFree(Point2, this);
      throw new Error("isTorsionFree() has not been declared for the elliptic curve");
    }
    clearCofactor() {
      const { h: cofactor, clearCofactor } = CURVE;
      if (cofactor === _1n4)
        return this;
      if (clearCofactor)
        return clearCofactor(Point2, this);
      return this.multiplyUnsafe(CURVE.h);
    }
    toRawBytes(isCompressed = true) {
      abool("isCompressed", isCompressed);
      this.assertValidity();
      return toBytes2(Point2, this, isCompressed);
    }
    toHex(isCompressed = true) {
      abool("isCompressed", isCompressed);
      return bytesToHex2(this.toRawBytes(isCompressed));
    }
  }
  Point2.BASE = new Point2(CURVE.Gx, CURVE.Gy, Fp2.ONE);
  Point2.ZERO = new Point2(Fp2.ZERO, Fp2.ONE, Fp2.ZERO);
  const _bits = CURVE.nBitLength;
  const wnaf = wNAF(Point2, CURVE.endo ? Math.ceil(_bits / 2) : _bits);
  return {
    CURVE,
    ProjectivePoint: Point2,
    normPrivateKeyToScalar,
    weierstrassEquation,
    isWithinCurveOrder
  };
}
function validateOpts(curve) {
  const opts = validateBasic(curve);
  validateObject(opts, {
    hash: "hash",
    hmac: "function",
    randomBytes: "function"
  }, {
    bits2int: "function",
    bits2int_modN: "function",
    lowS: "boolean"
  });
  return Object.freeze({ lowS: true, ...opts });
}
function weierstrass(curveDef) {
  const CURVE = validateOpts(curveDef);
  const { Fp: Fp2, n: CURVE_ORDER } = CURVE;
  const compressedLen = Fp2.BYTES + 1;
  const uncompressedLen = 2 * Fp2.BYTES + 1;
  function modN(a3) {
    return mod(a3, CURVE_ORDER);
  }
  function invN(a3) {
    return invert(a3, CURVE_ORDER);
  }
  const { ProjectivePoint: Point2, normPrivateKeyToScalar, weierstrassEquation, isWithinCurveOrder } = weierstrassPoints({
    ...CURVE,
    toBytes(_c, point, isCompressed) {
      const a3 = point.toAffine();
      const x = Fp2.toBytes(a3.x);
      const cat = concatBytes2;
      abool("isCompressed", isCompressed);
      if (isCompressed) {
        return cat(Uint8Array.from([point.hasEvenY() ? 2 : 3]), x);
      } else {
        return cat(Uint8Array.from([4]), x, Fp2.toBytes(a3.y));
      }
    },
    fromBytes(bytes) {
      const len = bytes.length;
      const head = bytes[0];
      const tail = bytes.subarray(1);
      if (len === compressedLen && (head === 2 || head === 3)) {
        const x = bytesToNumberBE(tail);
        if (!inRange(x, _1n4, Fp2.ORDER))
          throw new Error("Point is not on curve");
        const y2 = weierstrassEquation(x);
        let y;
        try {
          y = Fp2.sqrt(y2);
        } catch (sqrtError) {
          const suffix = sqrtError instanceof Error ? ": " + sqrtError.message : "";
          throw new Error("Point is not on curve" + suffix);
        }
        const isYOdd = (y & _1n4) === _1n4;
        const isHeadOdd = (head & 1) === 1;
        if (isHeadOdd !== isYOdd)
          y = Fp2.neg(y);
        return { x, y };
      } else if (len === uncompressedLen && head === 4) {
        const x = Fp2.fromBytes(tail.subarray(0, Fp2.BYTES));
        const y = Fp2.fromBytes(tail.subarray(Fp2.BYTES, 2 * Fp2.BYTES));
        return { x, y };
      } else {
        const cl = compressedLen;
        const ul = uncompressedLen;
        throw new Error("invalid Point, expected length of " + cl + ", or uncompressed " + ul + ", got " + len);
      }
    }
  });
  const numToNByteStr = (num) => bytesToHex2(numberToBytesBE(num, CURVE.nByteLength));
  function isBiggerThanHalfOrder(number) {
    const HALF = CURVE_ORDER >> _1n4;
    return number > HALF;
  }
  function normalizeS(s2) {
    return isBiggerThanHalfOrder(s2) ? modN(-s2) : s2;
  }
  const slcNum = (b, from, to) => bytesToNumberBE(b.slice(from, to));
  class Signature {
    constructor(r, s2, recovery) {
      this.r = r;
      this.s = s2;
      this.recovery = recovery;
      this.assertValidity();
    }
    // pair (bytes of r, bytes of s)
    static fromCompact(hex) {
      const l2 = CURVE.nByteLength;
      hex = ensureBytes("compactSignature", hex, l2 * 2);
      return new Signature(slcNum(hex, 0, l2), slcNum(hex, l2, 2 * l2));
    }
    // DER encoded ECDSA signature
    // https://bitcoin.stackexchange.com/questions/57644/what-are-the-parts-of-a-bitcoin-transaction-input-script
    static fromDER(hex) {
      const { r, s: s2 } = DER.toSig(ensureBytes("DER", hex));
      return new Signature(r, s2);
    }
    assertValidity() {
      aInRange("r", this.r, _1n4, CURVE_ORDER);
      aInRange("s", this.s, _1n4, CURVE_ORDER);
    }
    addRecoveryBit(recovery) {
      return new Signature(this.r, this.s, recovery);
    }
    recoverPublicKey(msgHash) {
      const { r, s: s2, recovery: rec } = this;
      const h = bits2int_modN(ensureBytes("msgHash", msgHash));
      if (rec == null || ![0, 1, 2, 3].includes(rec))
        throw new Error("recovery id invalid");
      const radj = rec === 2 || rec === 3 ? r + CURVE.n : r;
      if (radj >= Fp2.ORDER)
        throw new Error("recovery id 2 or 3 invalid");
      const prefix = (rec & 1) === 0 ? "02" : "03";
      const R = Point2.fromHex(prefix + numToNByteStr(radj));
      const ir = invN(radj);
      const u1 = modN(-h * ir);
      const u2 = modN(s2 * ir);
      const Q = Point2.BASE.multiplyAndAddUnsafe(R, u1, u2);
      if (!Q)
        throw new Error("point at infinify");
      Q.assertValidity();
      return Q;
    }
    // Signatures should be low-s, to prevent malleability.
    hasHighS() {
      return isBiggerThanHalfOrder(this.s);
    }
    normalizeS() {
      return this.hasHighS() ? new Signature(this.r, modN(-this.s), this.recovery) : this;
    }
    // DER-encoded
    toDERRawBytes() {
      return hexToBytes2(this.toDERHex());
    }
    toDERHex() {
      return DER.hexFromSig({ r: this.r, s: this.s });
    }
    // padded bytes of r, then padded bytes of s
    toCompactRawBytes() {
      return hexToBytes2(this.toCompactHex());
    }
    toCompactHex() {
      return numToNByteStr(this.r) + numToNByteStr(this.s);
    }
  }
  const utils = {
    isValidPrivateKey(privateKey) {
      try {
        normPrivateKeyToScalar(privateKey);
        return true;
      } catch (error2) {
        return false;
      }
    },
    normPrivateKeyToScalar,
    /**
     * Produces cryptographically secure private key from random of size
     * (groupLen + ceil(groupLen / 2)) with modulo bias being negligible.
     */
    randomPrivateKey: () => {
      const length = getMinHashLength(CURVE.n);
      return mapHashToField(CURVE.randomBytes(length), CURVE.n);
    },
    /**
     * Creates precompute table for an arbitrary EC point. Makes point "cached".
     * Allows to massively speed-up `point.multiply(scalar)`.
     * @returns cached point
     * @example
     * const fast = utils.precompute(8, ProjectivePoint.fromHex(someonesPubKey));
     * fast.multiply(privKey); // much faster ECDH now
     */
    precompute(windowSize = 8, point = Point2.BASE) {
      point._setWindowSize(windowSize);
      point.multiply(BigInt(3));
      return point;
    }
  };
  function getPublicKey(privateKey, isCompressed = true) {
    return Point2.fromPrivateKey(privateKey).toRawBytes(isCompressed);
  }
  function isProbPub(item) {
    const arr = isBytes2(item);
    const str = typeof item === "string";
    const len = (arr || str) && item.length;
    if (arr)
      return len === compressedLen || len === uncompressedLen;
    if (str)
      return len === 2 * compressedLen || len === 2 * uncompressedLen;
    if (item instanceof Point2)
      return true;
    return false;
  }
  function getSharedSecret(privateA, publicB, isCompressed = true) {
    if (isProbPub(privateA))
      throw new Error("first arg must be private key");
    if (!isProbPub(publicB))
      throw new Error("second arg must be public key");
    const b = Point2.fromHex(publicB);
    return b.multiply(normPrivateKeyToScalar(privateA)).toRawBytes(isCompressed);
  }
  const bits2int = CURVE.bits2int || function(bytes) {
    if (bytes.length > 8192)
      throw new Error("input is too large");
    const num = bytesToNumberBE(bytes);
    const delta = bytes.length * 8 - CURVE.nBitLength;
    return delta > 0 ? num >> BigInt(delta) : num;
  };
  const bits2int_modN = CURVE.bits2int_modN || function(bytes) {
    return modN(bits2int(bytes));
  };
  const ORDER_MASK = bitMask(CURVE.nBitLength);
  function int2octets(num) {
    aInRange("num < 2^" + CURVE.nBitLength, num, _0n4, ORDER_MASK);
    return numberToBytesBE(num, CURVE.nByteLength);
  }
  function prepSig(msgHash, privateKey, opts = defaultSigOpts) {
    if (["recovered", "canonical"].some((k) => k in opts))
      throw new Error("sign() legacy options not supported");
    const { hash, randomBytes: randomBytes2 } = CURVE;
    let { lowS, prehash, extraEntropy: ent } = opts;
    if (lowS == null)
      lowS = true;
    msgHash = ensureBytes("msgHash", msgHash);
    validateSigVerOpts(opts);
    if (prehash)
      msgHash = ensureBytes("prehashed msgHash", hash(msgHash));
    const h1int = bits2int_modN(msgHash);
    const d2 = normPrivateKeyToScalar(privateKey);
    const seedArgs = [int2octets(d2), int2octets(h1int)];
    if (ent != null && ent !== false) {
      const e3 = ent === true ? randomBytes2(Fp2.BYTES) : ent;
      seedArgs.push(ensureBytes("extraEntropy", e3));
    }
    const seed = concatBytes2(...seedArgs);
    const m = h1int;
    function k2sig(kBytes) {
      const k = bits2int(kBytes);
      if (!isWithinCurveOrder(k))
        return;
      const ik = invN(k);
      const q = Point2.BASE.multiply(k).toAffine();
      const r = modN(q.x);
      if (r === _0n4)
        return;
      const s2 = modN(ik * modN(m + r * d2));
      if (s2 === _0n4)
        return;
      let recovery = (q.x === r ? 0 : 2) | Number(q.y & _1n4);
      let normS = s2;
      if (lowS && isBiggerThanHalfOrder(s2)) {
        normS = normalizeS(s2);
        recovery ^= 1;
      }
      return new Signature(r, normS, recovery);
    }
    return { seed, k2sig };
  }
  const defaultSigOpts = { lowS: CURVE.lowS, prehash: false };
  const defaultVerOpts = { lowS: CURVE.lowS, prehash: false };
  function sign(msgHash, privKey, opts = defaultSigOpts) {
    const { seed, k2sig } = prepSig(msgHash, privKey, opts);
    const C = CURVE;
    const drbg = createHmacDrbg(C.hash.outputLen, C.nByteLength, C.hmac);
    return drbg(seed, k2sig);
  }
  Point2.BASE._setWindowSize(8);
  function verify(signature, msgHash, publicKey, opts = defaultVerOpts) {
    const sg = signature;
    msgHash = ensureBytes("msgHash", msgHash);
    publicKey = ensureBytes("publicKey", publicKey);
    const { lowS, prehash, format } = opts;
    validateSigVerOpts(opts);
    if ("strict" in opts)
      throw new Error("options.strict was renamed to lowS");
    if (format !== void 0 && format !== "compact" && format !== "der")
      throw new Error("format must be compact or der");
    const isHex2 = typeof sg === "string" || isBytes2(sg);
    const isObj = !isHex2 && !format && typeof sg === "object" && sg !== null && typeof sg.r === "bigint" && typeof sg.s === "bigint";
    if (!isHex2 && !isObj)
      throw new Error("invalid signature, expected Uint8Array, hex string or Signature instance");
    let _sig = void 0;
    let P;
    try {
      if (isObj)
        _sig = new Signature(sg.r, sg.s);
      if (isHex2) {
        try {
          if (format !== "compact")
            _sig = Signature.fromDER(sg);
        } catch (derError) {
          if (!(derError instanceof DER.Err))
            throw derError;
        }
        if (!_sig && format !== "der")
          _sig = Signature.fromCompact(sg);
      }
      P = Point2.fromHex(publicKey);
    } catch (error2) {
      return false;
    }
    if (!_sig)
      return false;
    if (lowS && _sig.hasHighS())
      return false;
    if (prehash)
      msgHash = CURVE.hash(msgHash);
    const { r, s: s2 } = _sig;
    const h = bits2int_modN(msgHash);
    const is = invN(s2);
    const u1 = modN(h * is);
    const u2 = modN(r * is);
    const R = Point2.BASE.multiplyAndAddUnsafe(P, u1, u2)?.toAffine();
    if (!R)
      return false;
    const v2 = modN(R.x);
    return v2 === r;
  }
  return {
    CURVE,
    getPublicKey,
    getSharedSecret,
    sign,
    verify,
    ProjectivePoint: Point2,
    Signature,
    utils
  };
}

// ../../node_modules/@noble/curves/esm/_shortw_utils.js
function getHash(hash) {
  return {
    hash,
    hmac: (key, ...msgs) => hmac(hash, key, concatBytes(...msgs)),
    randomBytes
  };
}
function createCurve(curveDef, defHash) {
  const create = (hash) => weierstrass({ ...curveDef, ...getHash(hash) });
  return { ...create(defHash), create };
}

// ../../node_modules/@noble/curves/esm/p256.js
var Fp256 = Field(BigInt("0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff"));
var CURVE_A = Fp256.create(BigInt("-3"));
var CURVE_B = BigInt("0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b");
var p256 = createCurve({
  a: CURVE_A,
  // Equation params: a, b
  b: CURVE_B,
  Fp: Fp256,
  // Field: 2n**224n * (2n**32n-1n) + 2n**192n + 2n**96n-1n
  // Curve order, total count of valid points in the field
  n: BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551"),
  // Base (generator) point (x, y)
  Gx: BigInt("0x6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296"),
  Gy: BigInt("0x4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5"),
  h: BigInt(1),
  lowS: false
}, sha256);
var secp256r1 = p256;

// ../../node_modules/@mysten/sui/dist/esm/cryptography/publickey.js
import { fromBase64 as fromBase643, toBase64 as toBase643 } from "@mysten/bcs";

// ../../node_modules/@mysten/sui/dist/esm/cryptography/intent.js
function messageWithIntent(scope, message) {
  return suiBcs.IntentMessage(suiBcs.fixedArray(message.length, suiBcs.u8())).serialize({
    intent: {
      scope: { [scope]: true },
      version: { V0: true },
      appId: { Sui: true }
    },
    value: message
  }).toBytes();
}

// ../../node_modules/@mysten/sui/dist/esm/cryptography/signature-scheme.js
var SIGNATURE_SCHEME_TO_FLAG = {
  ED25519: 0,
  Secp256k1: 1,
  Secp256r1: 2,
  MultiSig: 3,
  ZkLogin: 5,
  Passkey: 6
};
var SIGNATURE_SCHEME_TO_SIZE = {
  ED25519: 32,
  Secp256k1: 33,
  Secp256r1: 33
};
var SIGNATURE_FLAG_TO_SCHEME = {
  0: "ED25519",
  1: "Secp256k1",
  2: "Secp256r1",
  3: "MultiSig",
  5: "ZkLogin",
  6: "Passkey"
};

// ../../node_modules/@mysten/sui/dist/esm/cryptography/publickey.js
function bytesEqual(a3, b) {
  if (a3 === b) return true;
  if (a3.length !== b.length) {
    return false;
  }
  for (let i2 = 0; i2 < a3.length; i2++) {
    if (a3[i2] !== b[i2]) {
      return false;
    }
  }
  return true;
}
var PublicKey2 = class {
  /**
   * Checks if two public keys are equal
   */
  equals(publicKey) {
    return bytesEqual(this.toRawBytes(), publicKey.toRawBytes());
  }
  /**
   * Return the base-64 representation of the public key
   */
  toBase64() {
    return toBase643(this.toRawBytes());
  }
  toString() {
    throw new Error(
      "`toString` is not implemented on public keys. Use `toBase64()` or `toRawBytes()` instead."
    );
  }
  /**
   * Return the Sui representation of the public key encoded in
   * base-64. A Sui public key is formed by the concatenation
   * of the scheme flag with the raw bytes of the public key
   */
  toSuiPublicKey() {
    const bytes = this.toSuiBytes();
    return toBase643(bytes);
  }
  verifyWithIntent(bytes, signature, intent) {
    const intentMessage = messageWithIntent(intent, bytes);
    const digest = blake2b(intentMessage, { dkLen: 32 });
    return this.verify(digest, signature);
  }
  /**
   * Verifies that the signature is valid for for the provided PersonalMessage
   */
  verifyPersonalMessage(message, signature) {
    return this.verifyWithIntent(
      suiBcs.vector(suiBcs.u8()).serialize(message).toBytes(),
      signature,
      "PersonalMessage"
    );
  }
  /**
   * Verifies that the signature is valid for for the provided Transaction
   */
  verifyTransaction(transaction, signature) {
    return this.verifyWithIntent(transaction, signature, "TransactionData");
  }
  /**
   * Verifies that the public key is associated with the provided address
   */
  verifyAddress(address) {
    return this.toSuiAddress() === address;
  }
  /**
   * Returns the bytes representation of the public key
   * prefixed with the signature scheme flag
   */
  toSuiBytes() {
    const rawBytes = this.toRawBytes();
    const suiBytes = new Uint8Array(rawBytes.length + 1);
    suiBytes.set([this.flag()]);
    suiBytes.set(rawBytes, 1);
    return suiBytes;
  }
  /**
   * Return the Sui address associated with this Ed25519 public key
   */
  toSuiAddress() {
    return normalizeSuiAddress(
      bytesToHex(blake2b(this.toSuiBytes(), { dkLen: 32 })).slice(0, SUI_ADDRESS_LENGTH * 2)
    );
  }
};
function parseSerializedKeypairSignature(serializedSignature) {
  const bytes = fromBase643(serializedSignature);
  const signatureScheme = SIGNATURE_FLAG_TO_SCHEME[bytes[0]];
  switch (signatureScheme) {
    case "ED25519":
    case "Secp256k1":
    case "Secp256r1":
      const size = SIGNATURE_SCHEME_TO_SIZE[signatureScheme];
      const signature = bytes.slice(1, bytes.length - size);
      const publicKey = bytes.slice(1 + signature.length);
      return {
        serializedSignature,
        signatureScheme,
        signature,
        publicKey,
        bytes
      };
    default:
      throw new Error("Unsupported signature scheme");
  }
}

// ../../node_modules/@mysten/sui/dist/esm/keypairs/passkey/publickey.js
var PASSKEY_PUBLIC_KEY_SIZE = 33;
var PASSKEY_SIGNATURE_SIZE = 64;
var SECP256R1_SPKI_HEADER = new Uint8Array([
  48,
  89,
  // SEQUENCE, length 89
  48,
  19,
  // SEQUENCE, length 19
  6,
  7,
  // OID, length 7
  42,
  134,
  72,
  206,
  61,
  2,
  1,
  // OID: 1.2.840.10045.2.1 (ecPublicKey)
  6,
  8,
  // OID, length 8
  42,
  134,
  72,
  206,
  61,
  3,
  1,
  7,
  // OID: 1.2.840.10045.3.1.7 (prime256v1/secp256r1)
  3,
  66,
  // BIT STRING, length 66
  0
  // no unused bits
]);
var PasskeyPublicKey = class extends PublicKey2 {
  /**
   * Create a new PasskeyPublicKey object
   * @param value passkey public key as buffer or base-64 encoded string
   */
  constructor(value2) {
    super();
    if (typeof value2 === "string") {
      this.data = fromBase644(value2);
    } else if (value2 instanceof Uint8Array) {
      this.data = value2;
    } else {
      this.data = Uint8Array.from(value2);
    }
    if (this.data.length !== PASSKEY_PUBLIC_KEY_SIZE) {
      throw new Error(
        `Invalid public key input. Expected ${PASSKEY_PUBLIC_KEY_SIZE} bytes, got ${this.data.length}`
      );
    }
  }
  /**
   * Checks if two passkey public keys are equal
   */
  equals(publicKey) {
    return super.equals(publicKey);
  }
  /**
   * Return the byte array representation of the Secp256r1 public key
   */
  toRawBytes() {
    return this.data;
  }
  /**
   * Return the Sui address associated with this Secp256r1 public key
   */
  flag() {
    return SIGNATURE_SCHEME_TO_FLAG["Passkey"];
  }
  /**
   * Verifies that the signature is valid for for the provided message
   */
  async verify(message, signature) {
    const parsed = parseSerializedPasskeySignature(signature);
    const clientDataJSON = JSON.parse(parsed.clientDataJson);
    if (clientDataJSON.type !== "webauthn.get") {
      return false;
    }
    const parsedChallenge = fromBase644(
      clientDataJSON.challenge.replace(/-/g, "+").replace(/_/g, "/")
    );
    if (!bytesEqual(message, parsedChallenge)) {
      return false;
    }
    const pk = parsed.userSignature.slice(1 + PASSKEY_SIGNATURE_SIZE);
    if (!bytesEqual(this.toRawBytes(), pk)) {
      return false;
    }
    const payload = new Uint8Array([...parsed.authenticatorData, ...sha256(parsed.clientDataJson)]);
    const sig = parsed.userSignature.slice(1, PASSKEY_SIGNATURE_SIZE + 1);
    return secp256r1.verify(sig, sha256(payload), pk);
  }
};
PasskeyPublicKey.SIZE = PASSKEY_PUBLIC_KEY_SIZE;
function parseSerializedPasskeySignature(signature) {
  const bytes = typeof signature === "string" ? fromBase644(signature) : signature;
  if (bytes[0] !== SIGNATURE_SCHEME_TO_FLAG.Passkey) {
    throw new Error("Invalid signature scheme");
  }
  const dec = PasskeyAuthenticator.parse(bytes.slice(1));
  return {
    signatureScheme: "Passkey",
    serializedSignature: toBase644(bytes),
    signature: bytes,
    authenticatorData: dec.authenticatorData,
    clientDataJson: dec.clientDataJson,
    userSignature: new Uint8Array(dec.userSignature),
    publicKey: new Uint8Array(dec.userSignature.slice(1 + PASSKEY_SIGNATURE_SIZE))
  };
}

// ../../node_modules/@mysten/sui/dist/esm/zklogin/publickey.js
import { fromBase64 as fromBase646, toBase64 as toBase646, toHex as toHex3 } from "@mysten/bcs";

// ../../node_modules/graphql/jsutils/devAssert.mjs
function devAssert(condition, message) {
  const booleanCondition = Boolean(condition);
  if (!booleanCondition) {
    throw new Error(message);
  }
}

// ../../node_modules/graphql/language/ast.mjs
var QueryDocumentKeys = {
  Name: [],
  Document: ["definitions"],
  OperationDefinition: [
    "name",
    "variableDefinitions",
    "directives",
    "selectionSet"
  ],
  VariableDefinition: ["variable", "type", "defaultValue", "directives"],
  Variable: ["name"],
  SelectionSet: ["selections"],
  Field: ["alias", "name", "arguments", "directives", "selectionSet"],
  Argument: ["name", "value"],
  FragmentSpread: ["name", "directives"],
  InlineFragment: ["typeCondition", "directives", "selectionSet"],
  FragmentDefinition: [
    "name",
    // Note: fragment variable definitions are deprecated and will removed in v17.0.0
    "variableDefinitions",
    "typeCondition",
    "directives",
    "selectionSet"
  ],
  IntValue: [],
  FloatValue: [],
  StringValue: [],
  BooleanValue: [],
  NullValue: [],
  EnumValue: [],
  ListValue: ["values"],
  ObjectValue: ["fields"],
  ObjectField: ["name", "value"],
  Directive: ["name", "arguments"],
  NamedType: ["name"],
  ListType: ["type"],
  NonNullType: ["type"],
  SchemaDefinition: ["description", "directives", "operationTypes"],
  OperationTypeDefinition: ["type"],
  ScalarTypeDefinition: ["description", "name", "directives"],
  ObjectTypeDefinition: [
    "description",
    "name",
    "interfaces",
    "directives",
    "fields"
  ],
  FieldDefinition: ["description", "name", "arguments", "type", "directives"],
  InputValueDefinition: [
    "description",
    "name",
    "type",
    "defaultValue",
    "directives"
  ],
  InterfaceTypeDefinition: [
    "description",
    "name",
    "interfaces",
    "directives",
    "fields"
  ],
  UnionTypeDefinition: ["description", "name", "directives", "types"],
  EnumTypeDefinition: ["description", "name", "directives", "values"],
  EnumValueDefinition: ["description", "name", "directives"],
  InputObjectTypeDefinition: ["description", "name", "directives", "fields"],
  DirectiveDefinition: ["description", "name", "arguments", "locations"],
  SchemaExtension: ["directives", "operationTypes"],
  ScalarTypeExtension: ["name", "directives"],
  ObjectTypeExtension: ["name", "interfaces", "directives", "fields"],
  InterfaceTypeExtension: ["name", "interfaces", "directives", "fields"],
  UnionTypeExtension: ["name", "directives", "types"],
  EnumTypeExtension: ["name", "directives", "values"],
  InputObjectTypeExtension: ["name", "directives", "fields"]
};
var kindValues = new Set(Object.keys(QueryDocumentKeys));
function isNode(maybeNode) {
  const maybeKind = maybeNode === null || maybeNode === void 0 ? void 0 : maybeNode.kind;
  return typeof maybeKind === "string" && kindValues.has(maybeKind);
}
var OperationTypeNode;
(function(OperationTypeNode2) {
  OperationTypeNode2["QUERY"] = "query";
  OperationTypeNode2["MUTATION"] = "mutation";
  OperationTypeNode2["SUBSCRIPTION"] = "subscription";
})(OperationTypeNode || (OperationTypeNode = {}));

// ../../node_modules/graphql/language/kinds.mjs
var Kind;
(function(Kind2) {
  Kind2["NAME"] = "Name";
  Kind2["DOCUMENT"] = "Document";
  Kind2["OPERATION_DEFINITION"] = "OperationDefinition";
  Kind2["VARIABLE_DEFINITION"] = "VariableDefinition";
  Kind2["SELECTION_SET"] = "SelectionSet";
  Kind2["FIELD"] = "Field";
  Kind2["ARGUMENT"] = "Argument";
  Kind2["FRAGMENT_SPREAD"] = "FragmentSpread";
  Kind2["INLINE_FRAGMENT"] = "InlineFragment";
  Kind2["FRAGMENT_DEFINITION"] = "FragmentDefinition";
  Kind2["VARIABLE"] = "Variable";
  Kind2["INT"] = "IntValue";
  Kind2["FLOAT"] = "FloatValue";
  Kind2["STRING"] = "StringValue";
  Kind2["BOOLEAN"] = "BooleanValue";
  Kind2["NULL"] = "NullValue";
  Kind2["ENUM"] = "EnumValue";
  Kind2["LIST"] = "ListValue";
  Kind2["OBJECT"] = "ObjectValue";
  Kind2["OBJECT_FIELD"] = "ObjectField";
  Kind2["DIRECTIVE"] = "Directive";
  Kind2["NAMED_TYPE"] = "NamedType";
  Kind2["LIST_TYPE"] = "ListType";
  Kind2["NON_NULL_TYPE"] = "NonNullType";
  Kind2["SCHEMA_DEFINITION"] = "SchemaDefinition";
  Kind2["OPERATION_TYPE_DEFINITION"] = "OperationTypeDefinition";
  Kind2["SCALAR_TYPE_DEFINITION"] = "ScalarTypeDefinition";
  Kind2["OBJECT_TYPE_DEFINITION"] = "ObjectTypeDefinition";
  Kind2["FIELD_DEFINITION"] = "FieldDefinition";
  Kind2["INPUT_VALUE_DEFINITION"] = "InputValueDefinition";
  Kind2["INTERFACE_TYPE_DEFINITION"] = "InterfaceTypeDefinition";
  Kind2["UNION_TYPE_DEFINITION"] = "UnionTypeDefinition";
  Kind2["ENUM_TYPE_DEFINITION"] = "EnumTypeDefinition";
  Kind2["ENUM_VALUE_DEFINITION"] = "EnumValueDefinition";
  Kind2["INPUT_OBJECT_TYPE_DEFINITION"] = "InputObjectTypeDefinition";
  Kind2["DIRECTIVE_DEFINITION"] = "DirectiveDefinition";
  Kind2["SCHEMA_EXTENSION"] = "SchemaExtension";
  Kind2["SCALAR_TYPE_EXTENSION"] = "ScalarTypeExtension";
  Kind2["OBJECT_TYPE_EXTENSION"] = "ObjectTypeExtension";
  Kind2["INTERFACE_TYPE_EXTENSION"] = "InterfaceTypeExtension";
  Kind2["UNION_TYPE_EXTENSION"] = "UnionTypeExtension";
  Kind2["ENUM_TYPE_EXTENSION"] = "EnumTypeExtension";
  Kind2["INPUT_OBJECT_TYPE_EXTENSION"] = "InputObjectTypeExtension";
})(Kind || (Kind = {}));

// ../../node_modules/graphql/language/characterClasses.mjs
function isWhiteSpace(code) {
  return code === 9 || code === 32;
}

// ../../node_modules/graphql/language/blockString.mjs
function printBlockString(value2, options) {
  const escapedValue = value2.replace(/"""/g, '\\"""');
  const lines = escapedValue.split(/\r\n|[\n\r]/g);
  const isSingleLine = lines.length === 1;
  const forceLeadingNewLine = lines.length > 1 && lines.slice(1).every((line) => line.length === 0 || isWhiteSpace(line.charCodeAt(0)));
  const hasTrailingTripleQuotes = escapedValue.endsWith('\\"""');
  const hasTrailingQuote = value2.endsWith('"') && !hasTrailingTripleQuotes;
  const hasTrailingSlash = value2.endsWith("\\");
  const forceTrailingNewline = hasTrailingQuote || hasTrailingSlash;
  const printAsMultipleLines = !(options !== null && options !== void 0 && options.minimize) && // add leading and trailing new lines only if it improves readability
  (!isSingleLine || value2.length > 70 || forceTrailingNewline || forceLeadingNewLine || hasTrailingTripleQuotes);
  let result = "";
  const skipLeadingNewLine = isSingleLine && isWhiteSpace(value2.charCodeAt(0));
  if (printAsMultipleLines && !skipLeadingNewLine || forceLeadingNewLine) {
    result += "\n";
  }
  result += escapedValue;
  if (printAsMultipleLines || forceTrailingNewline) {
    result += "\n";
  }
  return '"""' + result + '"""';
}

// ../../node_modules/graphql/jsutils/inspect.mjs
var MAX_ARRAY_LENGTH = 10;
var MAX_RECURSIVE_DEPTH = 2;
function inspect(value2) {
  return formatValue(value2, []);
}
function formatValue(value2, seenValues) {
  switch (typeof value2) {
    case "string":
      return JSON.stringify(value2);
    case "function":
      return value2.name ? `[function ${value2.name}]` : "[function]";
    case "object":
      return formatObjectValue(value2, seenValues);
    default:
      return String(value2);
  }
}
function formatObjectValue(value2, previouslySeenValues) {
  if (value2 === null) {
    return "null";
  }
  if (previouslySeenValues.includes(value2)) {
    return "[Circular]";
  }
  const seenValues = [...previouslySeenValues, value2];
  if (isJSONable(value2)) {
    const jsonValue = value2.toJSON();
    if (jsonValue !== value2) {
      return typeof jsonValue === "string" ? jsonValue : formatValue(jsonValue, seenValues);
    }
  } else if (Array.isArray(value2)) {
    return formatArray(value2, seenValues);
  }
  return formatObject(value2, seenValues);
}
function isJSONable(value2) {
  return typeof value2.toJSON === "function";
}
function formatObject(object, seenValues) {
  const entries = Object.entries(object);
  if (entries.length === 0) {
    return "{}";
  }
  if (seenValues.length > MAX_RECURSIVE_DEPTH) {
    return "[" + getObjectTag(object) + "]";
  }
  const properties = entries.map(
    ([key, value2]) => key + ": " + formatValue(value2, seenValues)
  );
  return "{ " + properties.join(", ") + " }";
}
function formatArray(array, seenValues) {
  if (array.length === 0) {
    return "[]";
  }
  if (seenValues.length > MAX_RECURSIVE_DEPTH) {
    return "[Array]";
  }
  const len = Math.min(MAX_ARRAY_LENGTH, array.length);
  const remaining = array.length - len;
  const items = [];
  for (let i2 = 0; i2 < len; ++i2) {
    items.push(formatValue(array[i2], seenValues));
  }
  if (remaining === 1) {
    items.push("... 1 more item");
  } else if (remaining > 1) {
    items.push(`... ${remaining} more items`);
  }
  return "[" + items.join(", ") + "]";
}
function getObjectTag(object) {
  const tag = Object.prototype.toString.call(object).replace(/^\[object /, "").replace(/]$/, "");
  if (tag === "Object" && typeof object.constructor === "function") {
    const name = object.constructor.name;
    if (typeof name === "string" && name !== "") {
      return name;
    }
  }
  return tag;
}

// ../../node_modules/graphql/language/printString.mjs
function printString(str) {
  return `"${str.replace(escapedRegExp, escapedReplacer)}"`;
}
var escapedRegExp = /[\x00-\x1f\x22\x5c\x7f-\x9f]/g;
function escapedReplacer(str) {
  return escapeSequences[str.charCodeAt(0)];
}
var escapeSequences = [
  "\\u0000",
  "\\u0001",
  "\\u0002",
  "\\u0003",
  "\\u0004",
  "\\u0005",
  "\\u0006",
  "\\u0007",
  "\\b",
  "\\t",
  "\\n",
  "\\u000B",
  "\\f",
  "\\r",
  "\\u000E",
  "\\u000F",
  "\\u0010",
  "\\u0011",
  "\\u0012",
  "\\u0013",
  "\\u0014",
  "\\u0015",
  "\\u0016",
  "\\u0017",
  "\\u0018",
  "\\u0019",
  "\\u001A",
  "\\u001B",
  "\\u001C",
  "\\u001D",
  "\\u001E",
  "\\u001F",
  "",
  "",
  '\\"',
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  // 2F
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  // 3F
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  // 4F
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "\\\\",
  "",
  "",
  "",
  // 5F
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  // 6F
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "\\u007F",
  "\\u0080",
  "\\u0081",
  "\\u0082",
  "\\u0083",
  "\\u0084",
  "\\u0085",
  "\\u0086",
  "\\u0087",
  "\\u0088",
  "\\u0089",
  "\\u008A",
  "\\u008B",
  "\\u008C",
  "\\u008D",
  "\\u008E",
  "\\u008F",
  "\\u0090",
  "\\u0091",
  "\\u0092",
  "\\u0093",
  "\\u0094",
  "\\u0095",
  "\\u0096",
  "\\u0097",
  "\\u0098",
  "\\u0099",
  "\\u009A",
  "\\u009B",
  "\\u009C",
  "\\u009D",
  "\\u009E",
  "\\u009F"
];

// ../../node_modules/graphql/language/visitor.mjs
var BREAK = Object.freeze({});
function visit(root, visitor, visitorKeys = QueryDocumentKeys) {
  const enterLeaveMap = /* @__PURE__ */ new Map();
  for (const kind of Object.values(Kind)) {
    enterLeaveMap.set(kind, getEnterLeaveForKind(visitor, kind));
  }
  let stack = void 0;
  let inArray = Array.isArray(root);
  let keys = [root];
  let index = -1;
  let edits = [];
  let node = root;
  let key = void 0;
  let parent = void 0;
  const path2 = [];
  const ancestors = [];
  do {
    index++;
    const isLeaving = index === keys.length;
    const isEdited = isLeaving && edits.length !== 0;
    if (isLeaving) {
      key = ancestors.length === 0 ? void 0 : path2[path2.length - 1];
      node = parent;
      parent = ancestors.pop();
      if (isEdited) {
        if (inArray) {
          node = node.slice();
          let editOffset = 0;
          for (const [editKey, editValue] of edits) {
            const arrayKey = editKey - editOffset;
            if (editValue === null) {
              node.splice(arrayKey, 1);
              editOffset++;
            } else {
              node[arrayKey] = editValue;
            }
          }
        } else {
          node = Object.defineProperties(
            {},
            Object.getOwnPropertyDescriptors(node)
          );
          for (const [editKey, editValue] of edits) {
            node[editKey] = editValue;
          }
        }
      }
      index = stack.index;
      keys = stack.keys;
      edits = stack.edits;
      inArray = stack.inArray;
      stack = stack.prev;
    } else if (parent) {
      key = inArray ? index : keys[index];
      node = parent[key];
      if (node === null || node === void 0) {
        continue;
      }
      path2.push(key);
    }
    let result;
    if (!Array.isArray(node)) {
      var _enterLeaveMap$get, _enterLeaveMap$get2;
      isNode(node) || devAssert(false, `Invalid AST Node: ${inspect(node)}.`);
      const visitFn = isLeaving ? (_enterLeaveMap$get = enterLeaveMap.get(node.kind)) === null || _enterLeaveMap$get === void 0 ? void 0 : _enterLeaveMap$get.leave : (_enterLeaveMap$get2 = enterLeaveMap.get(node.kind)) === null || _enterLeaveMap$get2 === void 0 ? void 0 : _enterLeaveMap$get2.enter;
      result = visitFn === null || visitFn === void 0 ? void 0 : visitFn.call(visitor, node, key, parent, path2, ancestors);
      if (result === BREAK) {
        break;
      }
      if (result === false) {
        if (!isLeaving) {
          path2.pop();
          continue;
        }
      } else if (result !== void 0) {
        edits.push([key, result]);
        if (!isLeaving) {
          if (isNode(result)) {
            node = result;
          } else {
            path2.pop();
            continue;
          }
        }
      }
    }
    if (result === void 0 && isEdited) {
      edits.push([key, node]);
    }
    if (isLeaving) {
      path2.pop();
    } else {
      var _node$kind;
      stack = {
        inArray,
        index,
        keys,
        edits,
        prev: stack
      };
      inArray = Array.isArray(node);
      keys = inArray ? node : (_node$kind = visitorKeys[node.kind]) !== null && _node$kind !== void 0 ? _node$kind : [];
      index = -1;
      edits = [];
      if (parent) {
        ancestors.push(parent);
      }
      parent = node;
    }
  } while (stack !== void 0);
  if (edits.length !== 0) {
    return edits[edits.length - 1][1];
  }
  return root;
}
function getEnterLeaveForKind(visitor, kind) {
  const kindVisitor = visitor[kind];
  if (typeof kindVisitor === "object") {
    return kindVisitor;
  } else if (typeof kindVisitor === "function") {
    return {
      enter: kindVisitor,
      leave: void 0
    };
  }
  return {
    enter: visitor.enter,
    leave: visitor.leave
  };
}

// ../../node_modules/graphql/language/printer.mjs
function print(ast) {
  return visit(ast, printDocASTReducer);
}
var MAX_LINE_LENGTH = 80;
var printDocASTReducer = {
  Name: {
    leave: (node) => node.value
  },
  Variable: {
    leave: (node) => "$" + node.name
  },
  // Document
  Document: {
    leave: (node) => join(node.definitions, "\n\n")
  },
  OperationDefinition: {
    leave(node) {
      const varDefs = wrap("(", join(node.variableDefinitions, ", "), ")");
      const prefix = join(
        [
          node.operation,
          join([node.name, varDefs]),
          join(node.directives, " ")
        ],
        " "
      );
      return (prefix === "query" ? "" : prefix + " ") + node.selectionSet;
    }
  },
  VariableDefinition: {
    leave: ({ variable, type: type2, defaultValue, directives: directives2 }) => variable + ": " + type2 + wrap(" = ", defaultValue) + wrap(" ", join(directives2, " "))
  },
  SelectionSet: {
    leave: ({ selections }) => block(selections)
  },
  Field: {
    leave({ alias, name, arguments: args, directives: directives2, selectionSet: selectionSet2 }) {
      const prefix = wrap("", alias, ": ") + name;
      let argsLine = prefix + wrap("(", join(args, ", "), ")");
      if (argsLine.length > MAX_LINE_LENGTH) {
        argsLine = prefix + wrap("(\n", indent(join(args, "\n")), "\n)");
      }
      return join([argsLine, join(directives2, " "), selectionSet2], " ");
    }
  },
  Argument: {
    leave: ({ name, value: value2 }) => name + ": " + value2
  },
  // Fragments
  FragmentSpread: {
    leave: ({ name, directives: directives2 }) => "..." + name + wrap(" ", join(directives2, " "))
  },
  InlineFragment: {
    leave: ({ typeCondition, directives: directives2, selectionSet: selectionSet2 }) => join(
      [
        "...",
        wrap("on ", typeCondition),
        join(directives2, " "),
        selectionSet2
      ],
      " "
    )
  },
  FragmentDefinition: {
    leave: ({ name, typeCondition, variableDefinitions, directives: directives2, selectionSet: selectionSet2 }) => (
      // or removed in the future.
      `fragment ${name}${wrap("(", join(variableDefinitions, ", "), ")")} on ${typeCondition} ${wrap("", join(directives2, " "), " ")}` + selectionSet2
    )
  },
  // Value
  IntValue: {
    leave: ({ value: value2 }) => value2
  },
  FloatValue: {
    leave: ({ value: value2 }) => value2
  },
  StringValue: {
    leave: ({ value: value2, block: isBlockString }) => isBlockString ? printBlockString(value2) : printString(value2)
  },
  BooleanValue: {
    leave: ({ value: value2 }) => value2 ? "true" : "false"
  },
  NullValue: {
    leave: () => "null"
  },
  EnumValue: {
    leave: ({ value: value2 }) => value2
  },
  ListValue: {
    leave: ({ values }) => "[" + join(values, ", ") + "]"
  },
  ObjectValue: {
    leave: ({ fields }) => "{" + join(fields, ", ") + "}"
  },
  ObjectField: {
    leave: ({ name, value: value2 }) => name + ": " + value2
  },
  // Directive
  Directive: {
    leave: ({ name, arguments: args }) => "@" + name + wrap("(", join(args, ", "), ")")
  },
  // Type
  NamedType: {
    leave: ({ name }) => name
  },
  ListType: {
    leave: ({ type: type2 }) => "[" + type2 + "]"
  },
  NonNullType: {
    leave: ({ type: type2 }) => type2 + "!"
  },
  // Type System Definitions
  SchemaDefinition: {
    leave: ({ description, directives: directives2, operationTypes }) => wrap("", description, "\n") + join(["schema", join(directives2, " "), block(operationTypes)], " ")
  },
  OperationTypeDefinition: {
    leave: ({ operation, type: type2 }) => operation + ": " + type2
  },
  ScalarTypeDefinition: {
    leave: ({ description, name, directives: directives2 }) => wrap("", description, "\n") + join(["scalar", name, join(directives2, " ")], " ")
  },
  ObjectTypeDefinition: {
    leave: ({ description, name, interfaces, directives: directives2, fields }) => wrap("", description, "\n") + join(
      [
        "type",
        name,
        wrap("implements ", join(interfaces, " & ")),
        join(directives2, " "),
        block(fields)
      ],
      " "
    )
  },
  FieldDefinition: {
    leave: ({ description, name, arguments: args, type: type2, directives: directives2 }) => wrap("", description, "\n") + name + (hasMultilineItems(args) ? wrap("(\n", indent(join(args, "\n")), "\n)") : wrap("(", join(args, ", "), ")")) + ": " + type2 + wrap(" ", join(directives2, " "))
  },
  InputValueDefinition: {
    leave: ({ description, name, type: type2, defaultValue, directives: directives2 }) => wrap("", description, "\n") + join(
      [name + ": " + type2, wrap("= ", defaultValue), join(directives2, " ")],
      " "
    )
  },
  InterfaceTypeDefinition: {
    leave: ({ description, name, interfaces, directives: directives2, fields }) => wrap("", description, "\n") + join(
      [
        "interface",
        name,
        wrap("implements ", join(interfaces, " & ")),
        join(directives2, " "),
        block(fields)
      ],
      " "
    )
  },
  UnionTypeDefinition: {
    leave: ({ description, name, directives: directives2, types }) => wrap("", description, "\n") + join(
      ["union", name, join(directives2, " "), wrap("= ", join(types, " | "))],
      " "
    )
  },
  EnumTypeDefinition: {
    leave: ({ description, name, directives: directives2, values }) => wrap("", description, "\n") + join(["enum", name, join(directives2, " "), block(values)], " ")
  },
  EnumValueDefinition: {
    leave: ({ description, name, directives: directives2 }) => wrap("", description, "\n") + join([name, join(directives2, " ")], " ")
  },
  InputObjectTypeDefinition: {
    leave: ({ description, name, directives: directives2, fields }) => wrap("", description, "\n") + join(["input", name, join(directives2, " "), block(fields)], " ")
  },
  DirectiveDefinition: {
    leave: ({ description, name, arguments: args, repeatable, locations }) => wrap("", description, "\n") + "directive @" + name + (hasMultilineItems(args) ? wrap("(\n", indent(join(args, "\n")), "\n)") : wrap("(", join(args, ", "), ")")) + (repeatable ? " repeatable" : "") + " on " + join(locations, " | ")
  },
  SchemaExtension: {
    leave: ({ directives: directives2, operationTypes }) => join(
      ["extend schema", join(directives2, " "), block(operationTypes)],
      " "
    )
  },
  ScalarTypeExtension: {
    leave: ({ name, directives: directives2 }) => join(["extend scalar", name, join(directives2, " ")], " ")
  },
  ObjectTypeExtension: {
    leave: ({ name, interfaces, directives: directives2, fields }) => join(
      [
        "extend type",
        name,
        wrap("implements ", join(interfaces, " & ")),
        join(directives2, " "),
        block(fields)
      ],
      " "
    )
  },
  InterfaceTypeExtension: {
    leave: ({ name, interfaces, directives: directives2, fields }) => join(
      [
        "extend interface",
        name,
        wrap("implements ", join(interfaces, " & ")),
        join(directives2, " "),
        block(fields)
      ],
      " "
    )
  },
  UnionTypeExtension: {
    leave: ({ name, directives: directives2, types }) => join(
      [
        "extend union",
        name,
        join(directives2, " "),
        wrap("= ", join(types, " | "))
      ],
      " "
    )
  },
  EnumTypeExtension: {
    leave: ({ name, directives: directives2, values }) => join(["extend enum", name, join(directives2, " "), block(values)], " ")
  },
  InputObjectTypeExtension: {
    leave: ({ name, directives: directives2, fields }) => join(["extend input", name, join(directives2, " "), block(fields)], " ")
  }
};
function join(maybeArray, separator = "") {
  var _maybeArray$filter$jo;
  return (_maybeArray$filter$jo = maybeArray === null || maybeArray === void 0 ? void 0 : maybeArray.filter((x) => x).join(separator)) !== null && _maybeArray$filter$jo !== void 0 ? _maybeArray$filter$jo : "";
}
function block(array) {
  return wrap("{\n", indent(join(array, "\n")), "\n}");
}
function wrap(start, maybeString, end = "") {
  return maybeString != null && maybeString !== "" ? start + maybeString + end : "";
}
function indent(str) {
  return wrap("  ", str.replace(/\n/g, "\n  "));
}
function hasMultilineItems(maybeArray) {
  var _maybeArray$some;
  return (_maybeArray$some = maybeArray === null || maybeArray === void 0 ? void 0 : maybeArray.some((str) => str.includes("\n"))) !== null && _maybeArray$some !== void 0 ? _maybeArray$some : false;
}

// ../../node_modules/@mysten/sui/dist/esm/graphql/client.js
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value2) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value2);
var __privateSet = (obj, member, value2, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value2) : member.set(obj, value2), value2);
var _url;
var _queries;
var _headers;
var _fetch;
var SuiGraphQLRequestError = class extends Error {
};
var SuiGraphQLClient = class {
  constructor({
    url,
    fetch: fetchFn = fetch,
    headers = {},
    queries = {}
  }) {
    __privateAdd(this, _url);
    __privateAdd(this, _queries);
    __privateAdd(this, _headers);
    __privateAdd(this, _fetch);
    __privateSet(this, _url, url);
    __privateSet(this, _queries, queries);
    __privateSet(this, _headers, headers);
    __privateSet(this, _fetch, (...args) => fetchFn(...args));
  }
  async query(options) {
    const res = await __privateGet(this, _fetch).call(this, __privateGet(this, _url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...__privateGet(this, _headers)
      },
      body: JSON.stringify({
        query: typeof options.query === "string" ? String(options.query) : print(options.query),
        variables: options.variables,
        extensions: options.extensions,
        operationName: options.operationName
      })
    });
    if (!res.ok) {
      throw new SuiGraphQLRequestError(`GraphQL request failed: ${res.statusText} (${res.status})`);
    }
    return await res.json();
  }
  async execute(query, options) {
    return this.query({
      ...options,
      query: __privateGet(this, _queries)[query]
    });
  }
};
_url = /* @__PURE__ */ new WeakMap();
_queries = /* @__PURE__ */ new WeakMap();
_headers = /* @__PURE__ */ new WeakMap();
_fetch = /* @__PURE__ */ new WeakMap();

// ../../node_modules/@0no-co/graphql.web/dist/graphql.web.mjs
var e = {
  NAME: "Name",
  DOCUMENT: "Document",
  OPERATION_DEFINITION: "OperationDefinition",
  VARIABLE_DEFINITION: "VariableDefinition",
  SELECTION_SET: "SelectionSet",
  FIELD: "Field",
  ARGUMENT: "Argument",
  FRAGMENT_SPREAD: "FragmentSpread",
  INLINE_FRAGMENT: "InlineFragment",
  FRAGMENT_DEFINITION: "FragmentDefinition",
  VARIABLE: "Variable",
  INT: "IntValue",
  FLOAT: "FloatValue",
  STRING: "StringValue",
  BOOLEAN: "BooleanValue",
  NULL: "NullValue",
  ENUM: "EnumValue",
  LIST: "ListValue",
  OBJECT: "ObjectValue",
  OBJECT_FIELD: "ObjectField",
  DIRECTIVE: "Directive",
  NAMED_TYPE: "NamedType",
  LIST_TYPE: "ListType",
  NON_NULL_TYPE: "NonNullType"
};
var GraphQLError = class extends Error {
  constructor(e3, r, n2, i2, t3, a3, l2) {
    super(e3);
    this.name = "GraphQLError";
    this.message = e3;
    if (t3) {
      this.path = t3;
    }
    if (r) {
      this.nodes = Array.isArray(r) ? r : [r];
    }
    if (n2) {
      this.source = n2;
    }
    if (i2) {
      this.positions = i2;
    }
    if (a3) {
      this.originalError = a3;
    }
    var o2 = l2;
    if (!o2 && a3) {
      var u2 = a3.extensions;
      if (u2 && "object" == typeof u2) {
        o2 = u2;
      }
    }
    this.extensions = o2 || {};
  }
  toJSON() {
    return {
      ...this,
      message: this.message
    };
  }
  toString() {
    return this.message;
  }
  get [Symbol.toStringTag]() {
    return "GraphQLError";
  }
};
var n;
var i;
function error(e3) {
  return new GraphQLError(`Syntax Error: Unexpected token at ${i} in ${e3}`);
}
function advance(e3) {
  e3.lastIndex = i;
  if (e3.test(n)) {
    return n.slice(i, i = e3.lastIndex);
  }
}
var t = / +(?=[^\s])/y;
function blockString(e3) {
  var r = e3.split("\n");
  var n2 = "";
  var i2 = 0;
  var a3 = 0;
  var l2 = r.length - 1;
  for (var o2 = 0; o2 < r.length; o2++) {
    t.lastIndex = 0;
    if (t.test(r[o2])) {
      if (o2 && (!i2 || t.lastIndex < i2)) {
        i2 = t.lastIndex;
      }
      a3 = a3 || o2;
      l2 = o2;
    }
  }
  for (var u2 = a3; u2 <= l2; u2++) {
    if (u2 !== a3) {
      n2 += "\n";
    }
    n2 += r[u2].slice(i2).replace(/\\"""/g, '"""');
  }
  return n2;
}
function ignored() {
  for (var e3 = 0 | n.charCodeAt(i++); 9 === e3 || 10 === e3 || 13 === e3 || 32 === e3 || 35 === e3 || 44 === e3 || 65279 === e3; e3 = 0 | n.charCodeAt(i++)) {
    if (35 === e3) {
      while (10 !== (e3 = n.charCodeAt(i++)) && 13 !== e3) {
      }
    }
  }
  i--;
}
var a = /[_A-Za-z]\w*/y;
var l = new RegExp("(?:(null|true|false)|\\$(" + a.source + ')|(-?\\d+)((?:\\.\\d+)?[eE][+-]?\\d+|\\.\\d+)?|("""(?:"""|(?:[\\s\\S]*?[^\\\\])"""))|("(?:"|[^\\r\\n]*?[^\\\\]"))|(' + a.source + "))", "y");
var o = function(e3) {
  e3[e3.Const = 1] = "Const";
  e3[e3.Var = 2] = "Var";
  e3[e3.Int = 3] = "Int";
  e3[e3.Float = 4] = "Float";
  e3[e3.BlockString = 5] = "BlockString";
  e3[e3.String = 6] = "String";
  e3[e3.Enum = 7] = "Enum";
  return e3;
}(o || {});
var u = /\\/;
function value(e3) {
  var r;
  var t3;
  l.lastIndex = i;
  if (91 === n.charCodeAt(i)) {
    i++;
    ignored();
    var d2 = [];
    while (93 !== n.charCodeAt(i)) {
      d2.push(value(e3));
    }
    i++;
    ignored();
    return {
      kind: "ListValue",
      values: d2
    };
  } else if (123 === n.charCodeAt(i)) {
    i++;
    ignored();
    var s2 = [];
    while (125 !== n.charCodeAt(i)) {
      if (null == (r = advance(a))) {
        throw error("ObjectField");
      }
      ignored();
      if (58 !== n.charCodeAt(i++)) {
        throw error("ObjectField");
      }
      ignored();
      s2.push({
        kind: "ObjectField",
        name: {
          kind: "Name",
          value: r
        },
        value: value(e3)
      });
    }
    i++;
    ignored();
    return {
      kind: "ObjectValue",
      fields: s2
    };
  } else if (null != (t3 = l.exec(n))) {
    i = l.lastIndex;
    ignored();
    if (null != (r = t3[o.Const])) {
      return "null" === r ? {
        kind: "NullValue"
      } : {
        kind: "BooleanValue",
        value: "true" === r
      };
    } else if (null != (r = t3[o.Var])) {
      if (e3) {
        throw error("Variable");
      } else {
        return {
          kind: "Variable",
          name: {
            kind: "Name",
            value: r
          }
        };
      }
    } else if (null != (r = t3[o.Int])) {
      var v2;
      if (null != (v2 = t3[o.Float])) {
        return {
          kind: "FloatValue",
          value: r + v2
        };
      } else {
        return {
          kind: "IntValue",
          value: r
        };
      }
    } else if (null != (r = t3[o.BlockString])) {
      return {
        kind: "StringValue",
        value: blockString(r.slice(3, -3)),
        block: true
      };
    } else if (null != (r = t3[o.String])) {
      return {
        kind: "StringValue",
        value: u.test(r) ? JSON.parse(r) : r.slice(1, -1),
        block: false
      };
    } else if (null != (r = t3[o.Enum])) {
      return {
        kind: "EnumValue",
        value: r
      };
    }
  }
  throw error("Value");
}
function arguments_(e3) {
  if (40 === n.charCodeAt(i)) {
    var r = [];
    i++;
    ignored();
    var t3;
    do {
      if (null == (t3 = advance(a))) {
        throw error("Argument");
      }
      ignored();
      if (58 !== n.charCodeAt(i++)) {
        throw error("Argument");
      }
      ignored();
      r.push({
        kind: "Argument",
        name: {
          kind: "Name",
          value: t3
        },
        value: value(e3)
      });
    } while (41 !== n.charCodeAt(i));
    i++;
    ignored();
    return r;
  }
}
function directives(e3) {
  if (64 === n.charCodeAt(i)) {
    var r = [];
    var t3;
    do {
      i++;
      if (null == (t3 = advance(a))) {
        throw error("Directive");
      }
      ignored();
      r.push({
        kind: "Directive",
        name: {
          kind: "Name",
          value: t3
        },
        arguments: arguments_(e3)
      });
    } while (64 === n.charCodeAt(i));
    return r;
  }
}
function type() {
  var e3;
  var r = 0;
  while (91 === n.charCodeAt(i)) {
    r++;
    i++;
    ignored();
  }
  if (null == (e3 = advance(a))) {
    throw error("NamedType");
  }
  ignored();
  var t3 = {
    kind: "NamedType",
    name: {
      kind: "Name",
      value: e3
    }
  };
  do {
    if (33 === n.charCodeAt(i)) {
      i++;
      ignored();
      t3 = {
        kind: "NonNullType",
        type: t3
      };
    }
    if (r) {
      if (93 !== n.charCodeAt(i++)) {
        throw error("NamedType");
      }
      ignored();
      t3 = {
        kind: "ListType",
        type: t3
      };
    }
  } while (r--);
  return t3;
}
var d = new RegExp("(?:(\\.{3})|(" + a.source + "))", "y");
var s = function(e3) {
  e3[e3.Spread = 1] = "Spread";
  e3[e3.Name = 2] = "Name";
  return e3;
}(s || {});
function selectionSet() {
  var e3 = [];
  var r;
  var t3;
  do {
    d.lastIndex = i;
    if (null != (t3 = d.exec(n))) {
      i = d.lastIndex;
      if (null != t3[s.Spread]) {
        ignored();
        var l2 = advance(a);
        if (null != l2 && "on" !== l2) {
          ignored();
          e3.push({
            kind: "FragmentSpread",
            name: {
              kind: "Name",
              value: l2
            },
            directives: directives(false)
          });
        } else {
          ignored();
          if ("on" === l2) {
            if (null == (l2 = advance(a))) {
              throw error("NamedType");
            }
            ignored();
          }
          var o2 = directives(false);
          if (123 !== n.charCodeAt(i++)) {
            throw error("InlineFragment");
          }
          ignored();
          e3.push({
            kind: "InlineFragment",
            typeCondition: l2 ? {
              kind: "NamedType",
              name: {
                kind: "Name",
                value: l2
              }
            } : void 0,
            directives: o2,
            selectionSet: selectionSet()
          });
        }
      } else if (null != (r = t3[s.Name])) {
        var u2 = void 0;
        ignored();
        if (58 === n.charCodeAt(i)) {
          i++;
          ignored();
          u2 = r;
          if (null == (r = advance(a))) {
            throw error("Field");
          }
          ignored();
        }
        var v2 = arguments_(false);
        ignored();
        var c = directives(false);
        var f = void 0;
        if (123 === n.charCodeAt(i)) {
          i++;
          ignored();
          f = selectionSet();
        }
        e3.push({
          kind: "Field",
          alias: u2 ? {
            kind: "Name",
            value: u2
          } : void 0,
          name: {
            kind: "Name",
            value: r
          },
          arguments: v2,
          directives: c,
          selectionSet: f
        });
      }
    } else {
      throw error("SelectionSet");
    }
  } while (125 !== n.charCodeAt(i));
  i++;
  ignored();
  return {
    kind: "SelectionSet",
    selections: e3
  };
}
function fragmentDefinition() {
  var e3;
  var r;
  if (null == (e3 = advance(a))) {
    throw error("FragmentDefinition");
  }
  ignored();
  if ("on" !== advance(a)) {
    throw error("FragmentDefinition");
  }
  ignored();
  if (null == (r = advance(a))) {
    throw error("FragmentDefinition");
  }
  ignored();
  var t3 = directives(false);
  if (123 !== n.charCodeAt(i++)) {
    throw error("FragmentDefinition");
  }
  ignored();
  return {
    kind: "FragmentDefinition",
    name: {
      kind: "Name",
      value: e3
    },
    typeCondition: {
      kind: "NamedType",
      name: {
        kind: "Name",
        value: r
      }
    },
    directives: t3,
    selectionSet: selectionSet()
  };
}
var v = /(?:query|mutation|subscription|fragment)/y;
function operationDefinition(e3) {
  var r;
  var t3;
  var l2;
  if (e3) {
    ignored();
    r = advance(a);
    t3 = function variableDefinitions() {
      ignored();
      if (40 === n.charCodeAt(i)) {
        var e4 = [];
        i++;
        ignored();
        var r2;
        do {
          if (36 !== n.charCodeAt(i++)) {
            throw error("Variable");
          }
          if (null == (r2 = advance(a))) {
            throw error("Variable");
          }
          ignored();
          if (58 !== n.charCodeAt(i++)) {
            throw error("VariableDefinition");
          }
          ignored();
          var t4 = type();
          var l3 = void 0;
          if (61 === n.charCodeAt(i)) {
            i++;
            ignored();
            l3 = value(true);
          }
          ignored();
          e4.push({
            kind: "VariableDefinition",
            variable: {
              kind: "Variable",
              name: {
                kind: "Name",
                value: r2
              }
            },
            type: t4,
            defaultValue: l3,
            directives: directives(true)
          });
        } while (41 !== n.charCodeAt(i));
        i++;
        ignored();
        return e4;
      }
    }();
    l2 = directives(false);
  }
  if (123 === n.charCodeAt(i)) {
    i++;
    ignored();
    return {
      kind: "OperationDefinition",
      operation: e3 || "query",
      name: r ? {
        kind: "Name",
        value: r
      } : void 0,
      variableDefinitions: t3,
      directives: l2,
      selectionSet: selectionSet()
    };
  }
}
function parse2(e3, r) {
  i = 0;
  return function document(e4, r2) {
    var n2;
    var t3;
    ignored();
    var a3 = [];
    do {
      if ("fragment" === (n2 = advance(v))) {
        ignored();
        a3.push(fragmentDefinition());
      } else if (null != (t3 = operationDefinition(n2))) {
        a3.push(t3);
      } else {
        throw error("Document");
      }
    } while (i < e4.length);
    if (!r2) {
      var l2;
      return {
        kind: "Document",
        definitions: a3,
        set loc(e5) {
          l2 = e5;
        },
        get loc() {
          if (!l2) {
            l2 = {
              start: 0,
              end: e4.length,
              startToken: void 0,
              endToken: void 0,
              source: {
                body: e4,
                name: "graphql.web",
                locationOffset: {
                  line: 1,
                  column: 1
                }
              }
            };
          }
          return l2;
        }
      };
    }
    return {
      kind: "Document",
      definitions: a3
    };
  }(n = "string" == typeof e3.body ? e3.body : e3, r && r.noLocation);
}

// ../../node_modules/gql.tada/dist/gql-tada.mjs
var a2 = 0;
var e2 = /* @__PURE__ */ new Set();
function initGraphQLTada() {
  function graphql2(t3, i2) {
    var o2 = parse2(t3).definitions;
    var s2 = /* @__PURE__ */ new Set();
    for (var f of i2 || []) {
      for (var u2 of f.definitions) {
        if (u2.kind === e.FRAGMENT_DEFINITION && !s2.has(u2)) {
          o2.push(u2);
          s2.add(u2);
        }
      }
    }
    var d2;
    if ((d2 = o2[0].kind === e.FRAGMENT_DEFINITION) && o2[0].directives) {
      o2[0].directives = o2[0].directives.filter((r) => "_unmask" !== r.name.value);
    }
    var c;
    return {
      kind: e.DOCUMENT,
      definitions: o2,
      get loc() {
        if (!c && d2) {
          var r = t3 + function concatLocSources(r2) {
            try {
              a2++;
              var n2 = "";
              for (var t4 of r2) {
                if (!e2.has(t4)) {
                  e2.add(t4);
                  var { loc: i3 } = t4;
                  if (i3) {
                    n2 += i3.source.body;
                  }
                }
              }
              return n2;
            } finally {
              if (0 == --a2) {
                e2.clear();
              }
            }
          }(i2 || []);
          return {
            start: 0,
            end: r.length,
            source: {
              body: r,
              name: "GraphQLTada",
              locationOffset: {
                line: 1,
                column: 1
              }
            }
          };
        }
        return c;
      },
      set loc(r) {
        c = r;
      }
    };
  }
  graphql2.scalar = function scalar(r, n2) {
    return n2;
  };
  graphql2.persisted = function persisted(n2, a3) {
    return {
      kind: e.DOCUMENT,
      definitions: a3 ? a3.definitions : [],
      documentId: n2
    };
  };
  return graphql2;
}
var t2 = initGraphQLTada();

// ../../node_modules/@mysten/sui/dist/esm/graphql/schemas/latest/index.js
var graphql = initGraphQLTada();

// ../../node_modules/@mysten/sui/dist/esm/zklogin/jwt-utils.js
function base64UrlCharTo6Bits(base64UrlChar) {
  if (base64UrlChar.length !== 1) {
    throw new Error("Invalid base64Url character: " + base64UrlChar);
  }
  const base64UrlCharacterSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  const index = base64UrlCharacterSet.indexOf(base64UrlChar);
  if (index === -1) {
    throw new Error("Invalid base64Url character: " + base64UrlChar);
  }
  const binaryString = index.toString(2).padStart(6, "0");
  const bits = Array.from(binaryString).map(Number);
  return bits;
}
function base64UrlStringToBitVector(base64UrlString) {
  let bitVector = [];
  for (let i2 = 0; i2 < base64UrlString.length; i2++) {
    const base64UrlChar = base64UrlString.charAt(i2);
    const bits = base64UrlCharTo6Bits(base64UrlChar);
    bitVector = bitVector.concat(bits);
  }
  return bitVector;
}
function decodeBase64URL(s2, i2) {
  if (s2.length < 2) {
    throw new Error(`Input (s = ${s2}) is not tightly packed because s.length < 2`);
  }
  let bits = base64UrlStringToBitVector(s2);
  const firstCharOffset = i2 % 4;
  if (firstCharOffset === 0) {
  } else if (firstCharOffset === 1) {
    bits = bits.slice(2);
  } else if (firstCharOffset === 2) {
    bits = bits.slice(4);
  } else {
    throw new Error(`Input (s = ${s2}) is not tightly packed because i%4 = 3 (i = ${i2}))`);
  }
  const lastCharOffset = (i2 + s2.length - 1) % 4;
  if (lastCharOffset === 3) {
  } else if (lastCharOffset === 2) {
    bits = bits.slice(0, bits.length - 2);
  } else if (lastCharOffset === 1) {
    bits = bits.slice(0, bits.length - 4);
  } else {
    throw new Error(
      `Input (s = ${s2}) is not tightly packed because (i + s.length - 1)%4 = 0 (i = ${i2}))`
    );
  }
  if (bits.length % 8 !== 0) {
    throw new Error(`We should never reach here...`);
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  let currentByteIndex = 0;
  for (let i22 = 0; i22 < bits.length; i22 += 8) {
    const bitChunk = bits.slice(i22, i22 + 8);
    const byte = parseInt(bitChunk.join(""), 2);
    bytes[currentByteIndex++] = byte;
  }
  return new TextDecoder().decode(bytes);
}
function verifyExtendedClaim(claim) {
  if (!(claim.slice(-1) === "}" || claim.slice(-1) === ",")) {
    throw new Error("Invalid claim");
  }
  const json = JSON.parse("{" + claim.slice(0, -1) + "}");
  if (Object.keys(json).length !== 1) {
    throw new Error("Invalid claim");
  }
  const key = Object.keys(json)[0];
  return [key, json[key]];
}
function extractClaimValue(claim, claimName) {
  const extendedClaim = decodeBase64URL(claim.value, claim.indexMod4);
  const [name, value2] = verifyExtendedClaim(extendedClaim);
  if (name !== claimName) {
    throw new Error(`Invalid field name: found ${name} expected ${claimName}`);
  }
  return value2;
}

// ../../node_modules/@mysten/sui/dist/esm/zklogin/signature.js
import { fromBase64 as fromBase645, toBase64 as toBase645 } from "@mysten/bcs";

// ../../node_modules/@mysten/sui/dist/esm/zklogin/bcs.js
import { bcs as bcs4 } from "@mysten/bcs";
var zkLoginSignature = bcs4.struct("ZkLoginSignature", {
  inputs: bcs4.struct("ZkLoginSignatureInputs", {
    proofPoints: bcs4.struct("ZkLoginSignatureInputsProofPoints", {
      a: bcs4.vector(bcs4.string()),
      b: bcs4.vector(bcs4.vector(bcs4.string())),
      c: bcs4.vector(bcs4.string())
    }),
    issBase64Details: bcs4.struct("ZkLoginSignatureInputsClaim", {
      value: bcs4.string(),
      indexMod4: bcs4.u8()
    }),
    headerBase64: bcs4.string(),
    addressSeed: bcs4.string()
  }),
  maxEpoch: bcs4.u64(),
  userSignature: bcs4.vector(bcs4.u8())
});

// ../../node_modules/@mysten/sui/dist/esm/zklogin/signature.js
function parseZkLoginSignature(signature) {
  return zkLoginSignature.parse(typeof signature === "string" ? fromBase645(signature) : signature);
}

// ../../node_modules/@mysten/sui/dist/esm/zklogin/utils.js
function findFirstNonZeroIndex(bytes) {
  for (let i2 = 0; i2 < bytes.length; i2++) {
    if (bytes[i2] !== 0) {
      return i2;
    }
  }
  return -1;
}
function toPaddedBigEndianBytes(num, width) {
  const hex = num.toString(16);
  return hexToBytes(hex.padStart(width * 2, "0").slice(-width * 2));
}
function toBigEndianBytes(num, width) {
  const bytes = toPaddedBigEndianBytes(num, width);
  const firstNonZeroIndex = findFirstNonZeroIndex(bytes);
  if (firstNonZeroIndex === -1) {
    return new Uint8Array([0]);
  }
  return bytes.slice(firstNonZeroIndex);
}

// ../../node_modules/@mysten/sui/dist/esm/zklogin/publickey.js
var __typeError2 = (msg) => {
  throw TypeError(msg);
};
var __accessCheck2 = (obj, member, msg) => member.has(obj) || __typeError2("Cannot " + msg);
var __privateGet2 = (obj, member, getter) => (__accessCheck2(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd2 = (obj, member, value2) => member.has(obj) ? __typeError2("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value2);
var __privateSet2 = (obj, member, value2, setter) => (__accessCheck2(obj, member, "write to private field"), setter ? setter.call(obj, value2) : member.set(obj, value2), value2);
var __privateMethod = (obj, member, method) => (__accessCheck2(obj, member, "access private method"), method);
var _data;
var _client;
var _legacyAddress;
var _ZkLoginPublicIdentifier_instances;
var toLegacyAddress_fn;
var _ZkLoginPublicIdentifier = class _ZkLoginPublicIdentifier2 extends PublicKey2 {
  /**
   * Create a new ZkLoginPublicIdentifier object
   * @param value zkLogin public identifier as buffer or base-64 encoded string
   */
  constructor(value2, { client } = {}) {
    super();
    __privateAdd2(this, _ZkLoginPublicIdentifier_instances);
    __privateAdd2(this, _data);
    __privateAdd2(this, _client);
    __privateAdd2(this, _legacyAddress);
    __privateSet2(this, _client, client);
    if (typeof value2 === "string") {
      __privateSet2(this, _data, fromBase646(value2));
    } else if (value2 instanceof Uint8Array) {
      __privateSet2(this, _data, value2);
    } else {
      __privateSet2(this, _data, Uint8Array.from(value2));
    }
    __privateSet2(this, _legacyAddress, __privateGet2(this, _data).length !== __privateGet2(this, _data)[0] + 1 + 32);
    if (__privateGet2(this, _legacyAddress)) {
      __privateSet2(this, _data, normalizeZkLoginPublicKeyBytes(__privateGet2(this, _data)));
    }
  }
  /**
   * Checks if two zkLogin public identifiers are equal
   */
  equals(publicKey) {
    return super.equals(publicKey);
  }
  toSuiAddress() {
    if (__privateGet2(this, _legacyAddress)) {
      return __privateMethod(this, _ZkLoginPublicIdentifier_instances, toLegacyAddress_fn).call(this);
    }
    return super.toSuiAddress();
  }
  /**
   * Return the byte array representation of the zkLogin public identifier
   */
  toRawBytes() {
    return __privateGet2(this, _data);
  }
  /**
   * Return the Sui address associated with this ZkLogin public identifier
   */
  flag() {
    return SIGNATURE_SCHEME_TO_FLAG["ZkLogin"];
  }
  /**
   * Verifies that the signature is valid for for the provided message
   */
  async verify(_message, _signature) {
    throw Error("does not support");
  }
  /**
   * Verifies that the signature is valid for for the provided PersonalMessage
   */
  verifyPersonalMessage(message, signature) {
    const parsedSignature = parseSerializedZkLoginSignature(signature);
    const address = new _ZkLoginPublicIdentifier2(parsedSignature.publicKey).toSuiAddress();
    return graphqlVerifyZkLoginSignature({
      address,
      bytes: toBase646(message),
      signature: parsedSignature.serializedSignature,
      intentScope: "PERSONAL_MESSAGE",
      client: __privateGet2(this, _client)
    });
  }
  /**
   * Verifies that the signature is valid for for the provided Transaction
   */
  verifyTransaction(transaction, signature) {
    const parsedSignature = parseSerializedZkLoginSignature(signature);
    const address = new _ZkLoginPublicIdentifier2(parsedSignature.publicKey).toSuiAddress();
    return graphqlVerifyZkLoginSignature({
      address,
      bytes: toBase646(transaction),
      signature: parsedSignature.serializedSignature,
      intentScope: "TRANSACTION_DATA",
      client: __privateGet2(this, _client)
    });
  }
  /**
   * Verifies that the public key is associated with the provided address
   */
  verifyAddress(address) {
    return address === super.toSuiAddress() || address === __privateMethod(this, _ZkLoginPublicIdentifier_instances, toLegacyAddress_fn).call(this);
  }
};
_data = /* @__PURE__ */ new WeakMap();
_client = /* @__PURE__ */ new WeakMap();
_legacyAddress = /* @__PURE__ */ new WeakMap();
_ZkLoginPublicIdentifier_instances = /* @__PURE__ */ new WeakSet();
toLegacyAddress_fn = function() {
  const legacyBytes = normalizeZkLoginPublicKeyBytes(__privateGet2(this, _data), true);
  const addressBytes = new Uint8Array(legacyBytes.length + 1);
  addressBytes[0] = this.flag();
  addressBytes.set(legacyBytes, 1);
  return normalizeSuiAddress(
    bytesToHex(blake2b(addressBytes, { dkLen: 32 })).slice(0, SUI_ADDRESS_LENGTH * 2)
  );
};
var ZkLoginPublicIdentifier = _ZkLoginPublicIdentifier;
function toZkLoginPublicIdentifier(addressSeed, iss, options) {
  const addressSeedBytesBigEndian = options?.legacyAddress ? toBigEndianBytes(addressSeed, 32) : toPaddedBigEndianBytes(addressSeed, 32);
  const issBytes = new TextEncoder().encode(iss);
  const tmp = new Uint8Array(1 + issBytes.length + addressSeedBytesBigEndian.length);
  tmp.set([issBytes.length], 0);
  tmp.set(issBytes, 1);
  tmp.set(addressSeedBytesBigEndian, 1 + issBytes.length);
  return new ZkLoginPublicIdentifier(tmp, options);
}
var VerifyZkLoginSignatureQuery = graphql(`
	query Zklogin(
		$bytes: Base64!
		$signature: Base64!
		$intentScope: ZkLoginIntentScope!
		$author: SuiAddress!
	) {
		verifyZkloginSignature(
			bytes: $bytes
			signature: $signature
			intentScope: $intentScope
			author: $author
		) {
			success
			errors
		}
	}
`);
function normalizeZkLoginPublicKeyBytes(bytes, legacyAddress = false) {
  const issByteLength = bytes[0] + 1;
  const addressSeed = BigInt(`0x${toHex3(bytes.slice(issByteLength))}`);
  const seedBytes = legacyAddress ? toBigEndianBytes(addressSeed, 32) : toPaddedBigEndianBytes(addressSeed, 32);
  const data = new Uint8Array(issByteLength + seedBytes.length);
  data.set(bytes.slice(0, issByteLength), 0);
  data.set(seedBytes, issByteLength);
  return data;
}
async function graphqlVerifyZkLoginSignature({
  address,
  bytes,
  signature,
  intentScope,
  client = new SuiGraphQLClient({
    url: "https://sui-mainnet.mystenlabs.com/graphql"
  })
}) {
  const resp = await client.query({
    query: VerifyZkLoginSignatureQuery,
    variables: {
      bytes,
      signature,
      intentScope,
      author: address
    }
  });
  return resp.data?.verifyZkloginSignature.success === true && resp.data?.verifyZkloginSignature.errors.length === 0;
}
function parseSerializedZkLoginSignature(signature) {
  const bytes = typeof signature === "string" ? fromBase646(signature) : signature;
  if (bytes[0] !== SIGNATURE_SCHEME_TO_FLAG.ZkLogin) {
    throw new Error("Invalid signature scheme");
  }
  const signatureBytes = bytes.slice(1);
  const { inputs, maxEpoch, userSignature } = parseZkLoginSignature(signatureBytes);
  const { issBase64Details, addressSeed } = inputs;
  const iss = extractClaimValue(issBase64Details, "iss");
  const publicIdentifer = toZkLoginPublicIdentifier(BigInt(addressSeed), iss);
  return {
    serializedSignature: toBase646(bytes),
    signatureScheme: "ZkLogin",
    zkLogin: {
      inputs,
      maxEpoch,
      userSignature,
      iss,
      addressSeed: BigInt(addressSeed)
    },
    signature: bytes,
    publicKey: publicIdentifer.toRawBytes()
  };
}

// ../../node_modules/@mysten/sui/dist/esm/cryptography/signature.js
function toSerializedSignature({
  signature,
  signatureScheme,
  publicKey
}) {
  if (!publicKey) {
    throw new Error("`publicKey` is required");
  }
  const pubKeyBytes = publicKey.toRawBytes();
  const serializedSignature = new Uint8Array(1 + signature.length + pubKeyBytes.length);
  serializedSignature.set([SIGNATURE_SCHEME_TO_FLAG[signatureScheme]]);
  serializedSignature.set(signature, 1);
  serializedSignature.set(pubKeyBytes, 1 + signature.length);
  return toBase647(serializedSignature);
}
function parseSerializedSignature(serializedSignature) {
  const bytes = fromBase647(serializedSignature);
  const signatureScheme = SIGNATURE_FLAG_TO_SCHEME[bytes[0]];
  switch (signatureScheme) {
    case "Passkey":
      return parseSerializedPasskeySignature(serializedSignature);
    case "MultiSig":
      const multisig = suiBcs.MultiSig.parse(bytes.slice(1));
      return {
        serializedSignature,
        signatureScheme,
        multisig,
        bytes,
        signature: void 0
      };
    case "ZkLogin":
      return parseSerializedZkLoginSignature(serializedSignature);
    case "ED25519":
    case "Secp256k1":
    case "Secp256r1":
      return parseSerializedKeypairSignature(serializedSignature);
    default:
      throw new Error("Unsupported signature scheme");
  }
}

// ../../node_modules/@noble/hashes/esm/sha512.js
var [SHA512_Kh, SHA512_Kl] = /* @__PURE__ */ (() => u64_default.split([
  "0x428a2f98d728ae22",
  "0x7137449123ef65cd",
  "0xb5c0fbcfec4d3b2f",
  "0xe9b5dba58189dbbc",
  "0x3956c25bf348b538",
  "0x59f111f1b605d019",
  "0x923f82a4af194f9b",
  "0xab1c5ed5da6d8118",
  "0xd807aa98a3030242",
  "0x12835b0145706fbe",
  "0x243185be4ee4b28c",
  "0x550c7dc3d5ffb4e2",
  "0x72be5d74f27b896f",
  "0x80deb1fe3b1696b1",
  "0x9bdc06a725c71235",
  "0xc19bf174cf692694",
  "0xe49b69c19ef14ad2",
  "0xefbe4786384f25e3",
  "0x0fc19dc68b8cd5b5",
  "0x240ca1cc77ac9c65",
  "0x2de92c6f592b0275",
  "0x4a7484aa6ea6e483",
  "0x5cb0a9dcbd41fbd4",
  "0x76f988da831153b5",
  "0x983e5152ee66dfab",
  "0xa831c66d2db43210",
  "0xb00327c898fb213f",
  "0xbf597fc7beef0ee4",
  "0xc6e00bf33da88fc2",
  "0xd5a79147930aa725",
  "0x06ca6351e003826f",
  "0x142929670a0e6e70",
  "0x27b70a8546d22ffc",
  "0x2e1b21385c26c926",
  "0x4d2c6dfc5ac42aed",
  "0x53380d139d95b3df",
  "0x650a73548baf63de",
  "0x766a0abb3c77b2a8",
  "0x81c2c92e47edaee6",
  "0x92722c851482353b",
  "0xa2bfe8a14cf10364",
  "0xa81a664bbc423001",
  "0xc24b8b70d0f89791",
  "0xc76c51a30654be30",
  "0xd192e819d6ef5218",
  "0xd69906245565a910",
  "0xf40e35855771202a",
  "0x106aa07032bbd1b8",
  "0x19a4c116b8d2d0c8",
  "0x1e376c085141ab53",
  "0x2748774cdf8eeb99",
  "0x34b0bcb5e19b48a8",
  "0x391c0cb3c5c95a63",
  "0x4ed8aa4ae3418acb",
  "0x5b9cca4f7763e373",
  "0x682e6ff3d6b2b8a3",
  "0x748f82ee5defb2fc",
  "0x78a5636f43172f60",
  "0x84c87814a1f0ab72",
  "0x8cc702081a6439ec",
  "0x90befffa23631e28",
  "0xa4506cebde82bde9",
  "0xbef9a3f7b2c67915",
  "0xc67178f2e372532b",
  "0xca273eceea26619c",
  "0xd186b8c721c0c207",
  "0xeada7dd6cde0eb1e",
  "0xf57d4f7fee6ed178",
  "0x06f067aa72176fba",
  "0x0a637dc5a2c898a6",
  "0x113f9804bef90dae",
  "0x1b710b35131c471b",
  "0x28db77f523047d84",
  "0x32caab7b40c72493",
  "0x3c9ebe0a15c9bebc",
  "0x431d67c49c100d4c",
  "0x4cc5d4becb3e42b6",
  "0x597f299cfc657e2a",
  "0x5fcb6fab3ad6faec",
  "0x6c44198c4a475817"
].map((n2) => BigInt(n2))))();
var SHA512_W_H = /* @__PURE__ */ new Uint32Array(80);
var SHA512_W_L = /* @__PURE__ */ new Uint32Array(80);
var SHA512 = class extends HashMD {
  constructor() {
    super(128, 64, 16, false);
    this.Ah = 1779033703 | 0;
    this.Al = 4089235720 | 0;
    this.Bh = 3144134277 | 0;
    this.Bl = 2227873595 | 0;
    this.Ch = 1013904242 | 0;
    this.Cl = 4271175723 | 0;
    this.Dh = 2773480762 | 0;
    this.Dl = 1595750129 | 0;
    this.Eh = 1359893119 | 0;
    this.El = 2917565137 | 0;
    this.Fh = 2600822924 | 0;
    this.Fl = 725511199 | 0;
    this.Gh = 528734635 | 0;
    this.Gl = 4215389547 | 0;
    this.Hh = 1541459225 | 0;
    this.Hl = 327033209 | 0;
  }
  // prettier-ignore
  get() {
    const { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    return [Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl];
  }
  // prettier-ignore
  set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl) {
    this.Ah = Ah | 0;
    this.Al = Al | 0;
    this.Bh = Bh | 0;
    this.Bl = Bl | 0;
    this.Ch = Ch | 0;
    this.Cl = Cl | 0;
    this.Dh = Dh | 0;
    this.Dl = Dl | 0;
    this.Eh = Eh | 0;
    this.El = El | 0;
    this.Fh = Fh | 0;
    this.Fl = Fl | 0;
    this.Gh = Gh | 0;
    this.Gl = Gl | 0;
    this.Hh = Hh | 0;
    this.Hl = Hl | 0;
  }
  process(view, offset) {
    for (let i2 = 0; i2 < 16; i2++, offset += 4) {
      SHA512_W_H[i2] = view.getUint32(offset);
      SHA512_W_L[i2] = view.getUint32(offset += 4);
    }
    for (let i2 = 16; i2 < 80; i2++) {
      const W15h = SHA512_W_H[i2 - 15] | 0;
      const W15l = SHA512_W_L[i2 - 15] | 0;
      const s0h = u64_default.rotrSH(W15h, W15l, 1) ^ u64_default.rotrSH(W15h, W15l, 8) ^ u64_default.shrSH(W15h, W15l, 7);
      const s0l = u64_default.rotrSL(W15h, W15l, 1) ^ u64_default.rotrSL(W15h, W15l, 8) ^ u64_default.shrSL(W15h, W15l, 7);
      const W2h = SHA512_W_H[i2 - 2] | 0;
      const W2l = SHA512_W_L[i2 - 2] | 0;
      const s1h = u64_default.rotrSH(W2h, W2l, 19) ^ u64_default.rotrBH(W2h, W2l, 61) ^ u64_default.shrSH(W2h, W2l, 6);
      const s1l = u64_default.rotrSL(W2h, W2l, 19) ^ u64_default.rotrBL(W2h, W2l, 61) ^ u64_default.shrSL(W2h, W2l, 6);
      const SUMl = u64_default.add4L(s0l, s1l, SHA512_W_L[i2 - 7], SHA512_W_L[i2 - 16]);
      const SUMh = u64_default.add4H(SUMl, s0h, s1h, SHA512_W_H[i2 - 7], SHA512_W_H[i2 - 16]);
      SHA512_W_H[i2] = SUMh | 0;
      SHA512_W_L[i2] = SUMl | 0;
    }
    let { Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl } = this;
    for (let i2 = 0; i2 < 80; i2++) {
      const sigma1h = u64_default.rotrSH(Eh, El, 14) ^ u64_default.rotrSH(Eh, El, 18) ^ u64_default.rotrBH(Eh, El, 41);
      const sigma1l = u64_default.rotrSL(Eh, El, 14) ^ u64_default.rotrSL(Eh, El, 18) ^ u64_default.rotrBL(Eh, El, 41);
      const CHIh = Eh & Fh ^ ~Eh & Gh;
      const CHIl = El & Fl ^ ~El & Gl;
      const T1ll = u64_default.add5L(Hl, sigma1l, CHIl, SHA512_Kl[i2], SHA512_W_L[i2]);
      const T1h = u64_default.add5H(T1ll, Hh, sigma1h, CHIh, SHA512_Kh[i2], SHA512_W_H[i2]);
      const T1l = T1ll | 0;
      const sigma0h = u64_default.rotrSH(Ah, Al, 28) ^ u64_default.rotrBH(Ah, Al, 34) ^ u64_default.rotrBH(Ah, Al, 39);
      const sigma0l = u64_default.rotrSL(Ah, Al, 28) ^ u64_default.rotrBL(Ah, Al, 34) ^ u64_default.rotrBL(Ah, Al, 39);
      const MAJh = Ah & Bh ^ Ah & Ch ^ Bh & Ch;
      const MAJl = Al & Bl ^ Al & Cl ^ Bl & Cl;
      Hh = Gh | 0;
      Hl = Gl | 0;
      Gh = Fh | 0;
      Gl = Fl | 0;
      Fh = Eh | 0;
      Fl = El | 0;
      ({ h: Eh, l: El } = u64_default.add(Dh | 0, Dl | 0, T1h | 0, T1l | 0));
      Dh = Ch | 0;
      Dl = Cl | 0;
      Ch = Bh | 0;
      Cl = Bl | 0;
      Bh = Ah | 0;
      Bl = Al | 0;
      const All = u64_default.add3L(T1l, sigma0l, MAJl);
      Ah = u64_default.add3H(All, T1h, sigma0h, MAJh);
      Al = All | 0;
    }
    ({ h: Ah, l: Al } = u64_default.add(this.Ah | 0, this.Al | 0, Ah | 0, Al | 0));
    ({ h: Bh, l: Bl } = u64_default.add(this.Bh | 0, this.Bl | 0, Bh | 0, Bl | 0));
    ({ h: Ch, l: Cl } = u64_default.add(this.Ch | 0, this.Cl | 0, Ch | 0, Cl | 0));
    ({ h: Dh, l: Dl } = u64_default.add(this.Dh | 0, this.Dl | 0, Dh | 0, Dl | 0));
    ({ h: Eh, l: El } = u64_default.add(this.Eh | 0, this.El | 0, Eh | 0, El | 0));
    ({ h: Fh, l: Fl } = u64_default.add(this.Fh | 0, this.Fl | 0, Fh | 0, Fl | 0));
    ({ h: Gh, l: Gl } = u64_default.add(this.Gh | 0, this.Gl | 0, Gh | 0, Gl | 0));
    ({ h: Hh, l: Hl } = u64_default.add(this.Hh | 0, this.Hl | 0, Hh | 0, Hl | 0));
    this.set(Ah, Al, Bh, Bl, Ch, Cl, Dh, Dl, Eh, El, Fh, Fl, Gh, Gl, Hh, Hl);
  }
  roundClean() {
    SHA512_W_H.fill(0);
    SHA512_W_L.fill(0);
  }
  destroy() {
    this.buffer.fill(0);
    this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
  }
};
var sha512 = /* @__PURE__ */ wrapConstructor(() => new SHA512());

// ../../node_modules/@mysten/sui/dist/esm/cryptography/keypair.js
import { bcs as bcs5, toBase64 as toBase648 } from "@mysten/bcs";
var import_bech32 = __toESM(require_dist(), 1);
var Signer = class {
  /**
   * Sign messages with a specific intent. By combining the message bytes with the intent before hashing and signing,
   * it ensures that a signed message is tied to a specific purpose and domain separator is provided
   */
  async signWithIntent(bytes, intent) {
    const intentMessage = messageWithIntent(intent, bytes);
    const digest = blake2b(intentMessage, { dkLen: 32 });
    const signature = toSerializedSignature({
      signature: await this.sign(digest),
      signatureScheme: this.getKeyScheme(),
      publicKey: this.getPublicKey()
    });
    return {
      signature,
      bytes: toBase648(bytes)
    };
  }
  /**
   * Signs provided transaction by calling `signWithIntent()` with a `TransactionData` provided as intent scope
   */
  async signTransaction(bytes) {
    return this.signWithIntent(bytes, "TransactionData");
  }
  /**
   * Signs provided personal message by calling `signWithIntent()` with a `PersonalMessage` provided as intent scope
   */
  async signPersonalMessage(bytes) {
    const { signature } = await this.signWithIntent(
      bcs5.vector(bcs5.u8()).serialize(bytes).toBytes(),
      "PersonalMessage"
    );
    return {
      bytes: toBase648(bytes),
      signature
    };
  }
  toSuiAddress() {
    return this.getPublicKey().toSuiAddress();
  }
};

// ../../node_modules/@mysten/sui/dist/esm/keypairs/ed25519/publickey.js
import { fromBase64 as fromBase648 } from "@mysten/bcs";

// ../../node_modules/@noble/curves/esm/abstract/edwards.js
var _0n5 = BigInt(0);
var _1n5 = BigInt(1);
var _2n4 = BigInt(2);
var _8n2 = BigInt(8);
var VERIFY_DEFAULT = { zip215: true };
function validateOpts2(curve) {
  const opts = validateBasic(curve);
  validateObject(curve, {
    hash: "function",
    a: "bigint",
    d: "bigint",
    randomBytes: "function"
  }, {
    adjustScalarBytes: "function",
    domain: "function",
    uvRatio: "function",
    mapToCurve: "function"
  });
  return Object.freeze({ ...opts });
}
function twistedEdwards(curveDef) {
  const CURVE = validateOpts2(curveDef);
  const { Fp: Fp2, n: CURVE_ORDER, prehash, hash: cHash, randomBytes: randomBytes2, nByteLength, h: cofactor } = CURVE;
  const MASK = _2n4 << BigInt(nByteLength * 8) - _1n5;
  const modP = Fp2.create;
  const Fn = Field(CURVE.n, CURVE.nBitLength);
  const uvRatio2 = CURVE.uvRatio || ((u2, v2) => {
    try {
      return { isValid: true, value: Fp2.sqrt(u2 * Fp2.inv(v2)) };
    } catch (e3) {
      return { isValid: false, value: _0n5 };
    }
  });
  const adjustScalarBytes2 = CURVE.adjustScalarBytes || ((bytes) => bytes);
  const domain = CURVE.domain || ((data, ctx, phflag) => {
    abool("phflag", phflag);
    if (ctx.length || phflag)
      throw new Error("Contexts/pre-hash are not supported");
    return data;
  });
  function aCoordinate(title, n2) {
    aInRange("coordinate " + title, n2, _0n5, MASK);
  }
  function assertPoint(other) {
    if (!(other instanceof Point2))
      throw new Error("ExtendedPoint expected");
  }
  const toAffineMemo = memoized((p, iz) => {
    const { ex: x, ey: y, ez: z } = p;
    const is0 = p.is0();
    if (iz == null)
      iz = is0 ? _8n2 : Fp2.inv(z);
    const ax = modP(x * iz);
    const ay = modP(y * iz);
    const zz = modP(z * iz);
    if (is0)
      return { x: _0n5, y: _1n5 };
    if (zz !== _1n5)
      throw new Error("invZ was invalid");
    return { x: ax, y: ay };
  });
  const assertValidMemo = memoized((p) => {
    const { a: a3, d: d2 } = CURVE;
    if (p.is0())
      throw new Error("bad point: ZERO");
    const { ex: X, ey: Y, ez: Z, et: T } = p;
    const X2 = modP(X * X);
    const Y2 = modP(Y * Y);
    const Z2 = modP(Z * Z);
    const Z4 = modP(Z2 * Z2);
    const aX2 = modP(X2 * a3);
    const left = modP(Z2 * modP(aX2 + Y2));
    const right = modP(Z4 + modP(d2 * modP(X2 * Y2)));
    if (left !== right)
      throw new Error("bad point: equation left != right (1)");
    const XY = modP(X * Y);
    const ZT = modP(Z * T);
    if (XY !== ZT)
      throw new Error("bad point: equation left != right (2)");
    return true;
  });
  class Point2 {
    constructor(ex, ey, ez, et) {
      this.ex = ex;
      this.ey = ey;
      this.ez = ez;
      this.et = et;
      aCoordinate("x", ex);
      aCoordinate("y", ey);
      aCoordinate("z", ez);
      aCoordinate("t", et);
      Object.freeze(this);
    }
    get x() {
      return this.toAffine().x;
    }
    get y() {
      return this.toAffine().y;
    }
    static fromAffine(p) {
      if (p instanceof Point2)
        throw new Error("extended point not allowed");
      const { x, y } = p || {};
      aCoordinate("x", x);
      aCoordinate("y", y);
      return new Point2(x, y, _1n5, modP(x * y));
    }
    static normalizeZ(points) {
      const toInv = Fp2.invertBatch(points.map((p) => p.ez));
      return points.map((p, i2) => p.toAffine(toInv[i2])).map(Point2.fromAffine);
    }
    // Multiscalar Multiplication
    static msm(points, scalars) {
      return pippenger(Point2, Fn, points, scalars);
    }
    // "Private method", don't use it directly
    _setWindowSize(windowSize) {
      wnaf.setWindowSize(this, windowSize);
    }
    // Not required for fromHex(), which always creates valid points.
    // Could be useful for fromAffine().
    assertValidity() {
      assertValidMemo(this);
    }
    // Compare one point to another.
    equals(other) {
      assertPoint(other);
      const { ex: X1, ey: Y1, ez: Z1 } = this;
      const { ex: X2, ey: Y2, ez: Z2 } = other;
      const X1Z2 = modP(X1 * Z2);
      const X2Z1 = modP(X2 * Z1);
      const Y1Z2 = modP(Y1 * Z2);
      const Y2Z1 = modP(Y2 * Z1);
      return X1Z2 === X2Z1 && Y1Z2 === Y2Z1;
    }
    is0() {
      return this.equals(Point2.ZERO);
    }
    negate() {
      return new Point2(modP(-this.ex), this.ey, this.ez, modP(-this.et));
    }
    // Fast algo for doubling Extended Point.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#doubling-dbl-2008-hwcd
    // Cost: 4M + 4S + 1*a + 6add + 1*2.
    double() {
      const { a: a3 } = CURVE;
      const { ex: X1, ey: Y1, ez: Z1 } = this;
      const A = modP(X1 * X1);
      const B = modP(Y1 * Y1);
      const C = modP(_2n4 * modP(Z1 * Z1));
      const D = modP(a3 * A);
      const x1y1 = X1 + Y1;
      const E = modP(modP(x1y1 * x1y1) - A - B);
      const G2 = D + B;
      const F = G2 - C;
      const H = D - B;
      const X3 = modP(E * F);
      const Y3 = modP(G2 * H);
      const T3 = modP(E * H);
      const Z3 = modP(F * G2);
      return new Point2(X3, Y3, Z3, T3);
    }
    // Fast algo for adding 2 Extended Points.
    // https://hyperelliptic.org/EFD/g1p/auto-twisted-extended.html#addition-add-2008-hwcd
    // Cost: 9M + 1*a + 1*d + 7add.
    add(other) {
      assertPoint(other);
      const { a: a3, d: d2 } = CURVE;
      const { ex: X1, ey: Y1, ez: Z1, et: T1 } = this;
      const { ex: X2, ey: Y2, ez: Z2, et: T2 } = other;
      if (a3 === BigInt(-1)) {
        const A2 = modP((Y1 - X1) * (Y2 + X2));
        const B2 = modP((Y1 + X1) * (Y2 - X2));
        const F2 = modP(B2 - A2);
        if (F2 === _0n5)
          return this.double();
        const C2 = modP(Z1 * _2n4 * T2);
        const D2 = modP(T1 * _2n4 * Z2);
        const E2 = D2 + C2;
        const G3 = B2 + A2;
        const H2 = D2 - C2;
        const X32 = modP(E2 * F2);
        const Y32 = modP(G3 * H2);
        const T32 = modP(E2 * H2);
        const Z32 = modP(F2 * G3);
        return new Point2(X32, Y32, Z32, T32);
      }
      const A = modP(X1 * X2);
      const B = modP(Y1 * Y2);
      const C = modP(T1 * d2 * T2);
      const D = modP(Z1 * Z2);
      const E = modP((X1 + Y1) * (X2 + Y2) - A - B);
      const F = D - C;
      const G2 = D + C;
      const H = modP(B - a3 * A);
      const X3 = modP(E * F);
      const Y3 = modP(G2 * H);
      const T3 = modP(E * H);
      const Z3 = modP(F * G2);
      return new Point2(X3, Y3, Z3, T3);
    }
    subtract(other) {
      return this.add(other.negate());
    }
    wNAF(n2) {
      return wnaf.wNAFCached(this, n2, Point2.normalizeZ);
    }
    // Constant-time multiplication.
    multiply(scalar) {
      const n2 = scalar;
      aInRange("scalar", n2, _1n5, CURVE_ORDER);
      const { p, f } = this.wNAF(n2);
      return Point2.normalizeZ([p, f])[0];
    }
    // Non-constant-time multiplication. Uses double-and-add algorithm.
    // It's faster, but should only be used when you don't care about
    // an exposed private key e.g. sig verification.
    // Does NOT allow scalars higher than CURVE.n.
    // Accepts optional accumulator to merge with multiply (important for sparse scalars)
    multiplyUnsafe(scalar, acc = Point2.ZERO) {
      const n2 = scalar;
      aInRange("scalar", n2, _0n5, CURVE_ORDER);
      if (n2 === _0n5)
        return I;
      if (this.is0() || n2 === _1n5)
        return this;
      return wnaf.wNAFCachedUnsafe(this, n2, Point2.normalizeZ, acc);
    }
    // Checks if point is of small order.
    // If you add something to small order point, you will have "dirty"
    // point with torsion component.
    // Multiplies point by cofactor and checks if the result is 0.
    isSmallOrder() {
      return this.multiplyUnsafe(cofactor).is0();
    }
    // Multiplies point by curve order and checks if the result is 0.
    // Returns `false` is the point is dirty.
    isTorsionFree() {
      return wnaf.unsafeLadder(this, CURVE_ORDER).is0();
    }
    // Converts Extended point to default (x, y) coordinates.
    // Can accept precomputed Z^-1 - for example, from invertBatch.
    toAffine(iz) {
      return toAffineMemo(this, iz);
    }
    clearCofactor() {
      const { h: cofactor2 } = CURVE;
      if (cofactor2 === _1n5)
        return this;
      return this.multiplyUnsafe(cofactor2);
    }
    // Converts hash string or Uint8Array to Point.
    // Uses algo from RFC8032 5.1.3.
    static fromHex(hex, zip215 = false) {
      const { d: d2, a: a3 } = CURVE;
      const len = Fp2.BYTES;
      hex = ensureBytes("pointHex", hex, len);
      abool("zip215", zip215);
      const normed = hex.slice();
      const lastByte = hex[len - 1];
      normed[len - 1] = lastByte & ~128;
      const y = bytesToNumberLE(normed);
      const max = zip215 ? MASK : Fp2.ORDER;
      aInRange("pointHex.y", y, _0n5, max);
      const y2 = modP(y * y);
      const u2 = modP(y2 - _1n5);
      const v2 = modP(d2 * y2 - a3);
      let { isValid, value: x } = uvRatio2(u2, v2);
      if (!isValid)
        throw new Error("Point.fromHex: invalid y coordinate");
      const isXOdd = (x & _1n5) === _1n5;
      const isLastByteOdd = (lastByte & 128) !== 0;
      if (!zip215 && x === _0n5 && isLastByteOdd)
        throw new Error("Point.fromHex: x=0 and x_0=1");
      if (isLastByteOdd !== isXOdd)
        x = modP(-x);
      return Point2.fromAffine({ x, y });
    }
    static fromPrivateKey(privKey) {
      return getExtendedPublicKey(privKey).point;
    }
    toRawBytes() {
      const { x, y } = this.toAffine();
      const bytes = numberToBytesLE(y, Fp2.BYTES);
      bytes[bytes.length - 1] |= x & _1n5 ? 128 : 0;
      return bytes;
    }
    toHex() {
      return bytesToHex2(this.toRawBytes());
    }
  }
  Point2.BASE = new Point2(CURVE.Gx, CURVE.Gy, _1n5, modP(CURVE.Gx * CURVE.Gy));
  Point2.ZERO = new Point2(_0n5, _1n5, _1n5, _0n5);
  const { BASE: G, ZERO: I } = Point2;
  const wnaf = wNAF(Point2, nByteLength * 8);
  function modN(a3) {
    return mod(a3, CURVE_ORDER);
  }
  function modN_LE(hash) {
    return modN(bytesToNumberLE(hash));
  }
  function getExtendedPublicKey(key) {
    const len = Fp2.BYTES;
    key = ensureBytes("private key", key, len);
    const hashed = ensureBytes("hashed private key", cHash(key), 2 * len);
    const head = adjustScalarBytes2(hashed.slice(0, len));
    const prefix = hashed.slice(len, 2 * len);
    const scalar = modN_LE(head);
    const point = G.multiply(scalar);
    const pointBytes = point.toRawBytes();
    return { head, prefix, scalar, point, pointBytes };
  }
  function getPublicKey(privKey) {
    return getExtendedPublicKey(privKey).pointBytes;
  }
  function hashDomainToScalar(context = new Uint8Array(), ...msgs) {
    const msg = concatBytes2(...msgs);
    return modN_LE(cHash(domain(msg, ensureBytes("context", context), !!prehash)));
  }
  function sign(msg, privKey, options = {}) {
    msg = ensureBytes("message", msg);
    if (prehash)
      msg = prehash(msg);
    const { prefix, scalar, pointBytes } = getExtendedPublicKey(privKey);
    const r = hashDomainToScalar(options.context, prefix, msg);
    const R = G.multiply(r).toRawBytes();
    const k = hashDomainToScalar(options.context, R, pointBytes, msg);
    const s2 = modN(r + k * scalar);
    aInRange("signature.s", s2, _0n5, CURVE_ORDER);
    const res = concatBytes2(R, numberToBytesLE(s2, Fp2.BYTES));
    return ensureBytes("result", res, Fp2.BYTES * 2);
  }
  const verifyOpts = VERIFY_DEFAULT;
  function verify(sig, msg, publicKey, options = verifyOpts) {
    const { context, zip215 } = options;
    const len = Fp2.BYTES;
    sig = ensureBytes("signature", sig, 2 * len);
    msg = ensureBytes("message", msg);
    publicKey = ensureBytes("publicKey", publicKey, len);
    if (zip215 !== void 0)
      abool("zip215", zip215);
    if (prehash)
      msg = prehash(msg);
    const s2 = bytesToNumberLE(sig.slice(len, 2 * len));
    let A, R, SB;
    try {
      A = Point2.fromHex(publicKey, zip215);
      R = Point2.fromHex(sig.slice(0, len), zip215);
      SB = G.multiplyUnsafe(s2);
    } catch (error2) {
      return false;
    }
    if (!zip215 && A.isSmallOrder())
      return false;
    const k = hashDomainToScalar(context, R.toRawBytes(), A.toRawBytes(), msg);
    const RkA = R.add(A.multiplyUnsafe(k));
    return RkA.subtract(SB).clearCofactor().equals(Point2.ZERO);
  }
  G._setWindowSize(8);
  const utils = {
    getExtendedPublicKey,
    // ed25519 private keys are uniform 32b. No need to check for modulo bias, like in secp256k1.
    randomPrivateKey: () => randomBytes2(Fp2.BYTES),
    /**
     * We're doing scalar multiplication (used in getPublicKey etc) with precomputed BASE_POINT
     * values. This slows down first getPublicKey() by milliseconds (see Speed section),
     * but allows to speed-up subsequent getPublicKey() calls up to 20x.
     * @param windowSize 2, 4, 8, 16
     */
    precompute(windowSize = 8, point = Point2.BASE) {
      point._setWindowSize(windowSize);
      point.multiply(BigInt(3));
      return point;
    }
  };
  return {
    CURVE,
    getPublicKey,
    sign,
    verify,
    ExtendedPoint: Point2,
    utils
  };
}

// ../../node_modules/@noble/curves/esm/ed25519.js
var ED25519_P = BigInt("57896044618658097711785492504343953926634992332820282019728792003956564819949");
var ED25519_SQRT_M1 = /* @__PURE__ */ BigInt("19681161376707505956807079304988542015446066515923890162744021073123829784752");
var _0n6 = BigInt(0);
var _1n6 = BigInt(1);
var _2n5 = BigInt(2);
var _3n3 = BigInt(3);
var _5n2 = BigInt(5);
var _8n3 = BigInt(8);
function ed25519_pow_2_252_3(x) {
  const _10n = BigInt(10), _20n = BigInt(20), _40n = BigInt(40), _80n = BigInt(80);
  const P = ED25519_P;
  const x2 = x * x % P;
  const b2 = x2 * x % P;
  const b4 = pow2(b2, _2n5, P) * b2 % P;
  const b5 = pow2(b4, _1n6, P) * x % P;
  const b10 = pow2(b5, _5n2, P) * b5 % P;
  const b20 = pow2(b10, _10n, P) * b10 % P;
  const b40 = pow2(b20, _20n, P) * b20 % P;
  const b80 = pow2(b40, _40n, P) * b40 % P;
  const b160 = pow2(b80, _80n, P) * b80 % P;
  const b240 = pow2(b160, _80n, P) * b80 % P;
  const b250 = pow2(b240, _10n, P) * b10 % P;
  const pow_p_5_8 = pow2(b250, _2n5, P) * x % P;
  return { pow_p_5_8, b2 };
}
function adjustScalarBytes(bytes) {
  bytes[0] &= 248;
  bytes[31] &= 127;
  bytes[31] |= 64;
  return bytes;
}
function uvRatio(u2, v2) {
  const P = ED25519_P;
  const v3 = mod(v2 * v2 * v2, P);
  const v7 = mod(v3 * v3 * v2, P);
  const pow3 = ed25519_pow_2_252_3(u2 * v7).pow_p_5_8;
  let x = mod(u2 * v3 * pow3, P);
  const vx2 = mod(v2 * x * x, P);
  const root1 = x;
  const root2 = mod(x * ED25519_SQRT_M1, P);
  const useRoot1 = vx2 === u2;
  const useRoot2 = vx2 === mod(-u2, P);
  const noRoot = vx2 === mod(-u2 * ED25519_SQRT_M1, P);
  if (useRoot1)
    x = root1;
  if (useRoot2 || noRoot)
    x = root2;
  if (isNegativeLE(x, P))
    x = mod(-x, P);
  return { isValid: useRoot1 || useRoot2, value: x };
}
var Fp = /* @__PURE__ */ (() => Field(ED25519_P, void 0, true))();
var ed25519Defaults = /* @__PURE__ */ (() => ({
  // Param: a
  a: BigInt(-1),
  // Fp.create(-1) is proper; our way still works and is faster
  // d is equal to -121665/121666 over finite field.
  // Negative number is P - number, and division is invert(number, P)
  d: BigInt("37095705934669439343138083508754565189542113879843219016388785533085940283555"),
  // Finite field 𝔽p over which we'll do calculations; 2n**255n - 19n
  Fp,
  // Subgroup order: how many points curve has
  // 2n**252n + 27742317777372353535851937790883648493n;
  n: BigInt("7237005577332262213973186563042994240857116359379907606001950938285454250989"),
  // Cofactor
  h: _8n3,
  // Base point (x, y) aka generator point
  Gx: BigInt("15112221349535400772501151409588531511454012693041857206046113283949847762202"),
  Gy: BigInt("46316835694926478169428394003475163141307993866256225615783033603165251855960"),
  hash: sha512,
  randomBytes,
  adjustScalarBytes,
  // dom2
  // Ratio of u to v. Allows us to combine inversion and square root. Uses algo from RFC8032 5.1.3.
  // Constant-time, u/√v
  uvRatio
}))();
var ed25519 = /* @__PURE__ */ (() => twistedEdwards(ed25519Defaults))();

// ../../node_modules/@mysten/sui/dist/esm/keypairs/ed25519/publickey.js
var PUBLIC_KEY_SIZE = 32;
var Ed25519PublicKey = class extends PublicKey2 {
  /**
   * Create a new Ed25519PublicKey object
   * @param value ed25519 public key as buffer or base-64 encoded string
   */
  constructor(value2) {
    super();
    if (typeof value2 === "string") {
      this.data = fromBase648(value2);
    } else if (value2 instanceof Uint8Array) {
      this.data = value2;
    } else {
      this.data = Uint8Array.from(value2);
    }
    if (this.data.length !== PUBLIC_KEY_SIZE) {
      throw new Error(
        `Invalid public key input. Expected ${PUBLIC_KEY_SIZE} bytes, got ${this.data.length}`
      );
    }
  }
  /**
   * Checks if two Ed25519 public keys are equal
   */
  equals(publicKey) {
    return super.equals(publicKey);
  }
  /**
   * Return the byte array representation of the Ed25519 public key
   */
  toRawBytes() {
    return this.data;
  }
  /**
   * Return the Sui address associated with this Ed25519 public key
   */
  flag() {
    return SIGNATURE_SCHEME_TO_FLAG["ED25519"];
  }
  /**
   * Verifies that the signature is valid for for the provided message
   */
  async verify(message, signature) {
    let bytes;
    if (typeof signature === "string") {
      const parsed = parseSerializedKeypairSignature(signature);
      if (parsed.signatureScheme !== "ED25519") {
        throw new Error("Invalid signature scheme");
      }
      if (!bytesEqual(this.toRawBytes(), parsed.publicKey)) {
        throw new Error("Signature does not match public key");
      }
      bytes = parsed.signature;
    } else {
      bytes = signature;
    }
    return ed25519.verify(bytes, message, this.toRawBytes());
  }
};
Ed25519PublicKey.SIZE = PUBLIC_KEY_SIZE;

// ../../node_modules/@mysten/sui/dist/esm/keypairs/secp256k1/publickey.js
import { fromBase64 as fromBase649 } from "@mysten/bcs";

// ../../node_modules/@noble/curves/esm/secp256k1.js
var secp256k1P = BigInt("0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f");
var secp256k1N = BigInt("0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141");
var _1n7 = BigInt(1);
var _2n6 = BigInt(2);
var divNearest = (a3, b) => (a3 + b / _2n6) / b;
function sqrtMod(y) {
  const P = secp256k1P;
  const _3n4 = BigInt(3), _6n = BigInt(6), _11n = BigInt(11), _22n = BigInt(22);
  const _23n = BigInt(23), _44n = BigInt(44), _88n = BigInt(88);
  const b2 = y * y * y % P;
  const b3 = b2 * b2 * y % P;
  const b6 = pow2(b3, _3n4, P) * b3 % P;
  const b9 = pow2(b6, _3n4, P) * b3 % P;
  const b11 = pow2(b9, _2n6, P) * b2 % P;
  const b22 = pow2(b11, _11n, P) * b11 % P;
  const b44 = pow2(b22, _22n, P) * b22 % P;
  const b88 = pow2(b44, _44n, P) * b44 % P;
  const b176 = pow2(b88, _88n, P) * b88 % P;
  const b220 = pow2(b176, _44n, P) * b44 % P;
  const b223 = pow2(b220, _3n4, P) * b3 % P;
  const t1 = pow2(b223, _23n, P) * b22 % P;
  const t22 = pow2(t1, _6n, P) * b2 % P;
  const root = pow2(t22, _2n6, P);
  if (!Fpk1.eql(Fpk1.sqr(root), y))
    throw new Error("Cannot find square root");
  return root;
}
var Fpk1 = Field(secp256k1P, void 0, void 0, { sqrt: sqrtMod });
var secp256k1 = createCurve({
  a: BigInt(0),
  // equation params: a, b
  b: BigInt(7),
  Fp: Fpk1,
  // Field's prime: 2n**256n - 2n**32n - 2n**9n - 2n**8n - 2n**7n - 2n**6n - 2n**4n - 1n
  n: secp256k1N,
  // Curve order, total count of valid points in the field
  // Base point (x, y) aka generator point
  Gx: BigInt("55066263022277343669578718895168534326250603453777594175500187360389116729240"),
  Gy: BigInt("32670510020758816978083085130507043184471273380659243275938904335757337482424"),
  h: BigInt(1),
  // Cofactor
  lowS: true,
  // Allow only low-S signatures by default in sign() and verify()
  endo: {
    // Endomorphism, see above
    beta: BigInt("0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee"),
    splitScalar: (k) => {
      const n2 = secp256k1N;
      const a1 = BigInt("0x3086d221a7d46bcde86c90e49284eb15");
      const b1 = -_1n7 * BigInt("0xe4437ed6010e88286f547fa90abfe4c3");
      const a22 = BigInt("0x114ca50f7a8e2f3f657c1108d9d44cfd8");
      const b2 = a1;
      const POW_2_128 = BigInt("0x100000000000000000000000000000000");
      const c1 = divNearest(b2 * k, n2);
      const c2 = divNearest(-b1 * k, n2);
      let k1 = mod(k - c1 * a1 - c2 * a22, n2);
      let k2 = mod(-c1 * b1 - c2 * b2, n2);
      const k1neg = k1 > POW_2_128;
      const k2neg = k2 > POW_2_128;
      if (k1neg)
        k1 = n2 - k1;
      if (k2neg)
        k2 = n2 - k2;
      if (k1 > POW_2_128 || k2 > POW_2_128) {
        throw new Error("splitScalar: Endomorphism failed, k=" + k);
      }
      return { k1neg, k1, k2neg, k2 };
    }
  }
}, sha256);
var _0n7 = BigInt(0);
var Point = secp256k1.ProjectivePoint;

// ../../node_modules/@mysten/sui/dist/esm/keypairs/secp256k1/publickey.js
var SECP256K1_PUBLIC_KEY_SIZE = 33;
var Secp256k1PublicKey = class extends PublicKey2 {
  /**
   * Create a new Secp256k1PublicKey object
   * @param value secp256k1 public key as buffer or base-64 encoded string
   */
  constructor(value2) {
    super();
    if (typeof value2 === "string") {
      this.data = fromBase649(value2);
    } else if (value2 instanceof Uint8Array) {
      this.data = value2;
    } else {
      this.data = Uint8Array.from(value2);
    }
    if (this.data.length !== SECP256K1_PUBLIC_KEY_SIZE) {
      throw new Error(
        `Invalid public key input. Expected ${SECP256K1_PUBLIC_KEY_SIZE} bytes, got ${this.data.length}`
      );
    }
  }
  /**
   * Checks if two Secp256k1 public keys are equal
   */
  equals(publicKey) {
    return super.equals(publicKey);
  }
  /**
   * Return the byte array representation of the Secp256k1 public key
   */
  toRawBytes() {
    return this.data;
  }
  /**
   * Return the Sui address associated with this Secp256k1 public key
   */
  flag() {
    return SIGNATURE_SCHEME_TO_FLAG["Secp256k1"];
  }
  /**
   * Verifies that the signature is valid for for the provided message
   */
  async verify(message, signature) {
    let bytes;
    if (typeof signature === "string") {
      const parsed = parseSerializedKeypairSignature(signature);
      if (parsed.signatureScheme !== "Secp256k1") {
        throw new Error("Invalid signature scheme");
      }
      if (!bytesEqual(this.toRawBytes(), parsed.publicKey)) {
        throw new Error("Signature does not match public key");
      }
      bytes = parsed.signature;
    } else {
      bytes = signature;
    }
    return secp256k1.verify(
      secp256k1.Signature.fromCompact(bytes),
      sha256(message),
      this.toRawBytes()
    );
  }
};
Secp256k1PublicKey.SIZE = SECP256K1_PUBLIC_KEY_SIZE;

// ../../node_modules/@mysten/sui/dist/esm/keypairs/secp256r1/publickey.js
import { fromBase64 as fromBase6410 } from "@mysten/bcs";
var SECP256R1_PUBLIC_KEY_SIZE = 33;
var Secp256r1PublicKey = class extends PublicKey2 {
  /**
   * Create a new Secp256r1PublicKey object
   * @param value secp256r1 public key as buffer or base-64 encoded string
   */
  constructor(value2) {
    super();
    if (typeof value2 === "string") {
      this.data = fromBase6410(value2);
    } else if (value2 instanceof Uint8Array) {
      this.data = value2;
    } else {
      this.data = Uint8Array.from(value2);
    }
    if (this.data.length !== SECP256R1_PUBLIC_KEY_SIZE) {
      throw new Error(
        `Invalid public key input. Expected ${SECP256R1_PUBLIC_KEY_SIZE} bytes, got ${this.data.length}`
      );
    }
  }
  /**
   * Checks if two Secp256r1 public keys are equal
   */
  equals(publicKey) {
    return super.equals(publicKey);
  }
  /**
   * Return the byte array representation of the Secp256r1 public key
   */
  toRawBytes() {
    return this.data;
  }
  /**
   * Return the Sui address associated with this Secp256r1 public key
   */
  flag() {
    return SIGNATURE_SCHEME_TO_FLAG["Secp256r1"];
  }
  /**
   * Verifies that the signature is valid for for the provided message
   */
  async verify(message, signature) {
    let bytes;
    if (typeof signature === "string") {
      const parsed = parseSerializedSignature(signature);
      if (parsed.signatureScheme !== "Secp256r1") {
        throw new Error("Invalid signature scheme");
      }
      if (!bytesEqual(this.toRawBytes(), parsed.publicKey)) {
        throw new Error("Signature does not match public key");
      }
      bytes = parsed.signature;
    } else {
      bytes = signature;
    }
    return secp256r1.verify(
      secp256r1.Signature.fromCompact(bytes),
      sha256(message),
      this.toRawBytes()
    );
  }
};
Secp256r1PublicKey.SIZE = SECP256R1_PUBLIC_KEY_SIZE;

// ../../node_modules/@mysten/sui/dist/esm/multisig/publickey.js
import { fromBase64 as fromBase6411, toBase64 as toBase6410 } from "@mysten/bcs";

// ../../node_modules/@mysten/sui/dist/esm/multisig/signer.js
import { toBase64 as toBase649 } from "@mysten/bcs";
var __typeError3 = (msg) => {
  throw TypeError(msg);
};
var __accessCheck3 = (obj, member, msg) => member.has(obj) || __typeError3("Cannot " + msg);
var __privateGet3 = (obj, member, getter) => (__accessCheck3(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd3 = (obj, member, value2) => member.has(obj) ? __typeError3("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value2);
var __privateSet3 = (obj, member, value2, setter) => (__accessCheck3(obj, member, "write to private field"), setter ? setter.call(obj, value2) : member.set(obj, value2), value2);
var _pubkey;
var _signers;
var MultiSigSigner = class extends Signer {
  constructor(pubkey, signers = []) {
    super();
    __privateAdd3(this, _pubkey);
    __privateAdd3(this, _signers);
    __privateSet3(this, _pubkey, pubkey);
    __privateSet3(this, _signers, signers);
    let uniqueKeys = /* @__PURE__ */ new Set();
    let combinedWeight = 0;
    const weights = pubkey.getPublicKeys().map(({ weight, publicKey }) => ({
      weight,
      address: publicKey.toSuiAddress()
    }));
    for (let signer of signers) {
      const address = signer.toSuiAddress();
      if (uniqueKeys.has(address)) {
        throw new Error(`Can't create MultiSigSigner with duplicate signers`);
      }
      uniqueKeys.add(address);
      const weight = weights.find((w) => w.address === address)?.weight;
      if (!weight) {
        throw new Error(`Signer ${address} is not part of the MultiSig public key`);
      }
      combinedWeight += weight;
    }
    if (combinedWeight < pubkey.getThreshold()) {
      throw new Error(`Combined weight of signers is less than threshold`);
    }
  }
  getKeyScheme() {
    return "MultiSig";
  }
  getPublicKey() {
    return __privateGet3(this, _pubkey);
  }
  sign(_data2) {
    throw new Error(
      "MultiSigSigner does not support signing directly. Use signTransaction or signPersonalMessage instead"
    );
  }
  signData(_data2) {
    throw new Error(
      "MultiSigSigner does not support signing directly. Use signTransaction or signPersonalMessage instead"
    );
  }
  async signTransaction(bytes) {
    const signature = __privateGet3(this, _pubkey).combinePartialSignatures(
      await Promise.all(
        __privateGet3(this, _signers).map(async (signer) => (await signer.signTransaction(bytes)).signature)
      )
    );
    return {
      signature,
      bytes: toBase649(bytes)
    };
  }
  async signPersonalMessage(bytes) {
    const signature = __privateGet3(this, _pubkey).combinePartialSignatures(
      await Promise.all(
        __privateGet3(this, _signers).map(async (signer) => (await signer.signPersonalMessage(bytes)).signature)
      )
    );
    return {
      signature,
      bytes: toBase649(bytes)
    };
  }
};
_pubkey = /* @__PURE__ */ new WeakMap();
_signers = /* @__PURE__ */ new WeakMap();

// ../../node_modules/@mysten/sui/dist/esm/multisig/publickey.js
var MAX_SIGNER_IN_MULTISIG = 10;
var MIN_SIGNER_IN_MULTISIG = 1;
var MultiSigPublicKey2 = class _MultiSigPublicKey extends PublicKey2 {
  /**
   * Create a new MultiSigPublicKey object
   */
  constructor(value2, options = {}) {
    super();
    if (typeof value2 === "string") {
      this.rawBytes = fromBase6411(value2);
      this.multisigPublicKey = suiBcs.MultiSigPublicKey.parse(this.rawBytes);
    } else if (value2 instanceof Uint8Array) {
      this.rawBytes = value2;
      this.multisigPublicKey = suiBcs.MultiSigPublicKey.parse(this.rawBytes);
    } else {
      this.multisigPublicKey = value2;
      this.rawBytes = suiBcs.MultiSigPublicKey.serialize(value2).toBytes();
    }
    if (this.multisigPublicKey.threshold < 1) {
      throw new Error("Invalid threshold");
    }
    const seenPublicKeys = /* @__PURE__ */ new Set();
    this.publicKeys = this.multisigPublicKey.pk_map.map(({ pubKey, weight }) => {
      const [scheme, bytes] = Object.entries(pubKey).filter(([name]) => name !== "$kind")[0];
      const publicKeyStr = Uint8Array.from(bytes).toString();
      if (seenPublicKeys.has(publicKeyStr)) {
        throw new Error(`Multisig does not support duplicate public keys`);
      }
      seenPublicKeys.add(publicKeyStr);
      if (weight < 1) {
        throw new Error(`Invalid weight`);
      }
      return {
        publicKey: publicKeyFromRawBytes(scheme, Uint8Array.from(bytes), options),
        weight
      };
    });
    const totalWeight = this.publicKeys.reduce((sum, { weight }) => sum + weight, 0);
    if (this.multisigPublicKey.threshold > totalWeight) {
      throw new Error(`Unreachable threshold`);
    }
    if (this.publicKeys.length > MAX_SIGNER_IN_MULTISIG) {
      throw new Error(`Max number of signers in a multisig is ${MAX_SIGNER_IN_MULTISIG}`);
    }
    if (this.publicKeys.length < MIN_SIGNER_IN_MULTISIG) {
      throw new Error(`Min number of signers in a multisig is ${MIN_SIGNER_IN_MULTISIG}`);
    }
  }
  /**
   * 	A static method to create a new MultiSig publickey instance from a set of public keys and their associated weights pairs and threshold.
   */
  static fromPublicKeys({
    threshold,
    publicKeys
  }) {
    return new _MultiSigPublicKey({
      pk_map: publicKeys.map(({ publicKey, weight }) => {
        const scheme = SIGNATURE_FLAG_TO_SCHEME[publicKey.flag()];
        return {
          pubKey: { [scheme]: Array.from(publicKey.toRawBytes()) },
          weight
        };
      }),
      threshold
    });
  }
  /**
   * Checks if two MultiSig public keys are equal
   */
  equals(publicKey) {
    return super.equals(publicKey);
  }
  /**
   * Return the byte array representation of the MultiSig public key
   */
  toRawBytes() {
    return this.rawBytes;
  }
  getPublicKeys() {
    return this.publicKeys;
  }
  getThreshold() {
    return this.multisigPublicKey.threshold;
  }
  getSigner(...signers) {
    return new MultiSigSigner(this, signers);
  }
  /**
   * Return the Sui address associated with this MultiSig public key
   */
  toSuiAddress() {
    const maxLength = 1 + (64 + 1) * MAX_SIGNER_IN_MULTISIG + 2;
    const tmp = new Uint8Array(maxLength);
    tmp.set([SIGNATURE_SCHEME_TO_FLAG["MultiSig"]]);
    tmp.set(suiBcs.u16().serialize(this.multisigPublicKey.threshold).toBytes(), 1);
    let i2 = 3;
    for (const { publicKey, weight } of this.publicKeys) {
      const bytes = publicKey.toSuiBytes();
      tmp.set(bytes, i2);
      i2 += bytes.length;
      tmp.set([weight], i2++);
    }
    return normalizeSuiAddress(bytesToHex(blake2b(tmp.slice(0, i2), { dkLen: 32 })));
  }
  /**
   * Return the Sui address associated with this MultiSig public key
   */
  flag() {
    return SIGNATURE_SCHEME_TO_FLAG["MultiSig"];
  }
  /**
   * Verifies that the signature is valid for for the provided message
   */
  async verify(message, multisigSignature) {
    const parsed = parseSerializedSignature(multisigSignature);
    if (parsed.signatureScheme !== "MultiSig") {
      throw new Error("Invalid signature scheme");
    }
    const { multisig } = parsed;
    let signatureWeight = 0;
    if (!bytesEqual(
      suiBcs.MultiSigPublicKey.serialize(this.multisigPublicKey).toBytes(),
      suiBcs.MultiSigPublicKey.serialize(multisig.multisig_pk).toBytes()
    )) {
      return false;
    }
    for (const { publicKey, weight, signature } of parsePartialSignatures(multisig)) {
      if (!await publicKey.verify(message, signature)) {
        return false;
      }
      signatureWeight += weight;
    }
    return signatureWeight >= this.multisigPublicKey.threshold;
  }
  /**
   * Combines multiple partial signatures into a single multisig, ensuring that each public key signs only once
   * and that all the public keys involved are known and valid, and then serializes multisig into the standard format
   */
  combinePartialSignatures(signatures) {
    if (signatures.length > MAX_SIGNER_IN_MULTISIG) {
      throw new Error(`Max number of signatures in a multisig is ${MAX_SIGNER_IN_MULTISIG}`);
    }
    let bitmap = 0;
    const compressedSignatures = new Array(signatures.length);
    for (let i2 = 0; i2 < signatures.length; i2++) {
      let parsed = parseSerializedSignature(signatures[i2]);
      if (parsed.signatureScheme === "MultiSig") {
        throw new Error("MultiSig is not supported inside MultiSig");
      }
      let publicKey;
      if (parsed.signatureScheme === "ZkLogin") {
        publicKey = toZkLoginPublicIdentifier(
          parsed.zkLogin?.addressSeed,
          parsed.zkLogin?.iss
        ).toRawBytes();
      } else {
        publicKey = parsed.publicKey;
      }
      compressedSignatures[i2] = {
        [parsed.signatureScheme]: Array.from(parsed.signature.map((x) => Number(x)))
      };
      let publicKeyIndex;
      for (let j = 0; j < this.publicKeys.length; j++) {
        if (bytesEqual(publicKey, this.publicKeys[j].publicKey.toRawBytes())) {
          if (bitmap & 1 << j) {
            throw new Error("Received multiple signatures from the same public key");
          }
          publicKeyIndex = j;
          break;
        }
      }
      if (publicKeyIndex === void 0) {
        throw new Error("Received signature from unknown public key");
      }
      bitmap |= 1 << publicKeyIndex;
    }
    let multisig = {
      sigs: compressedSignatures,
      bitmap,
      multisig_pk: this.multisigPublicKey
    };
    const bytes = suiBcs.MultiSig.serialize(multisig, { maxSize: 8192 }).toBytes();
    let tmp = new Uint8Array(bytes.length + 1);
    tmp.set([SIGNATURE_SCHEME_TO_FLAG["MultiSig"]]);
    tmp.set(bytes, 1);
    return toBase6410(tmp);
  }
};
function parsePartialSignatures(multisig, options = {}) {
  let res = new Array(multisig.sigs.length);
  for (let i2 = 0; i2 < multisig.sigs.length; i2++) {
    const [signatureScheme, signature] = Object.entries(multisig.sigs[i2]).filter(
      ([name]) => name !== "$kind"
    )[0];
    const pkIndex = asIndices(multisig.bitmap).at(i2);
    const pair = multisig.multisig_pk.pk_map[pkIndex];
    const pkBytes = Uint8Array.from(Object.values(pair.pubKey)[0]);
    if (signatureScheme === "MultiSig") {
      throw new Error("MultiSig is not supported inside MultiSig");
    }
    const publicKey = publicKeyFromRawBytes(signatureScheme, pkBytes, options);
    res[i2] = {
      signatureScheme,
      signature: Uint8Array.from(signature),
      publicKey,
      weight: pair.weight
    };
  }
  return res;
}
function asIndices(bitmap) {
  if (bitmap < 0 || bitmap > 1024) {
    throw new Error("Invalid bitmap");
  }
  let res = [];
  for (let i2 = 0; i2 < 10; i2++) {
    if ((bitmap & 1 << i2) !== 0) {
      res.push(i2);
    }
  }
  return Uint8Array.from(res);
}

// ../../node_modules/@mysten/sui/dist/esm/verify/verify.js
async function verifyPersonalMessageSignature(message, signature, options = {}) {
  const parsedSignature = parseSignature(signature, options);
  if (!await parsedSignature.publicKey.verifyPersonalMessage(
    message,
    parsedSignature.serializedSignature
  )) {
    throw new Error(`Signature is not valid for the provided message`);
  }
  if (options?.address && !parsedSignature.publicKey.verifyAddress(options.address)) {
    throw new Error(`Signature is not valid for the provided address`);
  }
  return parsedSignature.publicKey;
}
function parseSignature(signature, options = {}) {
  const parsedSignature = parseSerializedSignature(signature);
  if (parsedSignature.signatureScheme === "MultiSig") {
    return {
      ...parsedSignature,
      publicKey: new MultiSigPublicKey2(parsedSignature.multisig.multisig_pk)
    };
  }
  const publicKey = publicKeyFromRawBytes(
    parsedSignature.signatureScheme,
    parsedSignature.publicKey,
    options
  );
  return {
    ...parsedSignature,
    publicKey
  };
}
function publicKeyFromRawBytes(signatureScheme, bytes, options = {}) {
  switch (signatureScheme) {
    case "ED25519":
      return new Ed25519PublicKey(bytes);
    case "Secp256k1":
      return new Secp256k1PublicKey(bytes);
    case "Secp256r1":
      return new Secp256r1PublicKey(bytes);
    case "MultiSig":
      return new MultiSigPublicKey2(bytes);
    case "ZkLogin":
      return new ZkLoginPublicIdentifier(bytes, options);
    case "Passkey":
      return new PasskeyPublicKey(bytes);
    default:
      throw new Error(`Unsupported signature scheme ${signatureScheme}`);
  }
}

// src/routes/user.ts
import {
  getEnvVariable as getEnvVariable2
} from "@elizaos/core";
import { RedisClient } from "@elizaos/adapter-redis";
function createAgentRouter2() {
  const router = express2.Router();
  router.use(cors2());
  router.use(bodyParser2.json());
  router.use(bodyParser2.urlencoded({ extended: true }));
  router.use(
    express2.json({
      limit: getEnvVariable2("EXPRESS_MAX_PAYLOAD") || "100kb"
    })
  );
  router.get("/:address/nonce", (req, res) => {
    const address = req.params.address;
    const msgPayload = {
      seed: `0x${randomValue(address)}`,
      nonce: Date.now()
    };
    const msg = LOGIN_STRUCT.serialize(msgPayload).toHex();
    const redisClient = new RedisClient(process.env.REDIS_URL);
    redisClient.setValue({ key: `login_signature_${address}`, value: msg });
    res.json({
      nonce: msg
    });
  });
  router.post("/login", async (req, res) => {
    const { address, signature } = req.body;
    const redisClient = new RedisClient(process.env.REDIS_URL);
    const msg = await redisClient.getValue({ key: `login_signature_${address}` });
    if (!msg) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
    const nonce = await verifyLoginSignature(signature, msg);
    if (!nonce) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  });
  return router;
}
function randomValue(seed) {
  return toHex2(crypto.getRandomValues(fromHex2(seed)));
}
async function verifyLoginSignature(signature, msg) {
  try {
    const message = new Uint8Array(Buffer.from(msg, "hex"));
    await verifyPersonalMessageSignature(message, signature);
    const user = LOGIN_STRUCT.parse(message);
    return Number(user.nonce);
  } catch (error2) {
    console.error("Error verifying signature:", error2);
    return false;
  }
}
var LOGIN_STRUCT = suiBcs.struct("RefreshSignature", {
  nonce: suiBcs.u64(),
  seed: suiBcs.Address
});

// src/routes/index.ts
import express3 from "express";
function createApiRouter(agents, directClient) {
  const router = express3.Router();
  const agentRouter = createAgentRouter(agents, directClient);
  const userRouter = createAgentRouter2();
  router.use("/agents", agentRouter);
  router.use("/users", userRouter);
  return router;
}

// src/index.ts
import * as fs from "fs";
import * as path from "path";
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});
var upload = multer({ storage });
var messageHandlerTemplate = (
  // {{goals}}
  `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.

` + messageCompletionFooter
);
var DirectClient = class {
  app;
  agents;
  // container management
  server;
  // Store server instance
  startAgent;
  // Store startAgent functor
  constructor() {
    elizaLogger2.log("DirectClient constructor");
    this.app = express4();
    this.app.use(cors3());
    this.agents = /* @__PURE__ */ new Map();
    this.app.use(bodyParser3.json());
    this.app.use(bodyParser3.urlencoded({ extended: true }));
    this.app.use(
      "/media/uploads",
      express4.static(path.join(process.cwd(), "/data/uploads"))
    );
    this.app.use(
      "/media/generated",
      express4.static(path.join(process.cwd(), "/generatedImages"))
    );
    const apiRouter = createApiRouter(this.agents, this);
    this.app.use(apiRouter);
    this.app.post(
      "/:agentId/message",
      upload.single("file"),
      async (req, res) => {
        elizaLogger2.log("Validate ...");
        const agentId = req.params.agentId;
        const roomId = stringToUuid2(
          req.body.roomId ?? "default-room-" + agentId
        );
        const userId = stringToUuid2(req.body.userId ?? "user");
        let runtime = this.agents.get(agentId);
        if (!runtime) {
          runtime = Array.from(this.agents.values()).find(
            (a3) => a3.character.name.toLowerCase() === agentId.toLowerCase()
          );
        }
        if (!runtime) {
          res.status(404).send("Agent not found");
          return;
        }
        await runtime.ensureConnection(
          userId,
          roomId,
          req.body.userName,
          req.body.name,
          "direct"
        );
        const text = req.body.text;
        const messageId = stringToUuid2(Date.now().toString());
        const attachments = [];
        if (req.file) {
          const filePath = path.join(
            process.cwd(),
            "data",
            "uploads",
            req.file.filename
          );
          attachments.push({
            id: Date.now().toString(),
            url: filePath,
            title: req.file.originalname,
            source: "direct",
            description: `Uploaded file: ${req.file.originalname}`,
            text: "",
            contentType: req.file.mimetype
          });
        }
        const content = {
          text,
          attachments,
          source: "direct",
          inReplyTo: void 0
        };
        const userMessage = {
          content,
          userId,
          roomId,
          agentId: runtime.agentId
        };
        const memory = {
          id: stringToUuid2(messageId + "-" + userId),
          ...userMessage,
          agentId: runtime.agentId,
          userId,
          roomId,
          content,
          createdAt: Date.now()
        };
        elizaLogger2.log("---msg sniffer start ----");
        elizaLogger2.log(JSON.stringify(memory));
        elizaLogger2.log("---msg sniffer end ----");
        elizaLogger2.log("Validate ... done!");
        elizaLogger2.log("addEmbeddingToMemory...");
        await runtime.messageManager.addEmbeddingToMemory(memory);
        elizaLogger2.log("addEmbeddingToMemory ...done!");
        elizaLogger2.log("createMemory ...");
        await runtime.messageManager.createMemory(memory);
        elizaLogger2.log("createMemory ...done!");
        elizaLogger2.log("ai compose state ...");
        let state = await runtime.composeState(userMessage, {
          agentName: runtime.character.name
        });
        elizaLogger2.log("ai compose state ...done!");
        elizaLogger2.log("ai compose context ...");
        const context = composeContext({
          state,
          template: messageHandlerTemplate
        });
        elizaLogger2.log("ai compose context ...done!");
        elizaLogger2.log("ai generate msg response ...");
        const response = await generateMessageResponse({
          runtime,
          context,
          modelClass: ModelClass.SMALL
        });
        elizaLogger2.log("ai generate msg response ...done!");
        if (!response) {
          res.status(500).send(
            "No response from generateMessageResponse"
          );
          return;
        }
        elizaLogger2.log("create memory ...");
        const responseMessage = {
          id: stringToUuid2(messageId + "-" + runtime.agentId),
          ...userMessage,
          userId: runtime.agentId,
          content: response,
          embedding: getEmbeddingZeroVector(),
          createdAt: Date.now()
        };
        await runtime.messageManager.createMemory(responseMessage);
        elizaLogger2.log("create memory ...done!");
        elizaLogger2.log("update recent msgs...");
        state = await runtime.updateRecentMessageState(state);
        elizaLogger2.log("update recent msgs...done!");
        elizaLogger2.log("process actions...");
        let message = null;
        await runtime.processActions(
          memory,
          [responseMessage],
          state,
          async (newMessages) => {
            message = newMessages;
            return [memory];
          }
        );
        elizaLogger2.log("process actions...done!");
        elizaLogger2.log("evaluate...");
        await runtime.evaluate(memory, state);
        elizaLogger2.log("evaluate...done!");
        const action = runtime.actions.find(
          (a3) => a3.name === response.action
        );
        const shouldSuppressInitialMessage = action?.suppressInitialMessage;
        if (!shouldSuppressInitialMessage) {
          if (message) {
            res.json([response, message]);
          } else {
            res.json([response]);
          }
        } else {
          if (message) {
            res.json([message]);
          } else {
            res.json([]);
          }
        }
      }
    );
  }
  // agent/src/index.ts:startAgent calls this
  registerAgent(runtime) {
    this.agents.set(runtime.agentId, runtime);
  }
  unregisterAgent(runtime) {
    this.agents.delete(runtime.agentId);
  }
  start(port) {
    this.server = this.app.listen(port, "0.0.0.0", () => {
      elizaLogger2.success(
        `REST API bound to 0.0.0.0:${port}. If running locally, access it at http://localhost:${port}.`
      );
    });
    const gracefulShutdown = () => {
      elizaLogger2.log("Received shutdown signal, closing server...");
      this.server.close(() => {
        elizaLogger2.success("Server closed successfully");
        process.exit(0);
      });
      setTimeout(() => {
        elizaLogger2.error(
          "Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 5e3);
    };
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
  }
  stop() {
    if (this.server) {
      this.server.close(() => {
        elizaLogger2.success("Server stopped");
      });
    }
  }
};
var DirectClientInterface = {
  start: async (_runtime) => {
    elizaLogger2.log("DirectClientInterface start");
    const client = new DirectClient();
    const serverPort = parseInt(settings.SERVER_PORT || "3000");
    client.start(serverPort);
    return client;
  },
  stop: async (_runtime, client) => {
    if (client instanceof DirectClient) {
      client.stop();
    }
  }
};
var index_default = DirectClientInterface;
export {
  DirectClient,
  DirectClientInterface,
  index_default as default,
  messageHandlerTemplate
};
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/utils.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/modular.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/curve.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/weierstrass.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/_shortw_utils.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/p256.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/abstract/edwards.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/ed25519.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/curves/esm/secp256k1.js:
  (*! noble-curves - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=index.js.map