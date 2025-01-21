// src/actions/coinInfo.ts
import {
  ModelClass,
  composeContext,
  elizaLogger,
  generateObject
} from "@elizaos/core";

// ../../node_modules/zod/lib/index.mjs
var util;
(function(util2) {
  util2.assertEqual = (val) => val;
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object2) => {
    const keys = [];
    for (const key in object2) {
      if (Object.prototype.hasOwnProperty.call(object2, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && isFinite(val) && Math.floor(val) === val;
  function joinValues(array2, separator = " | ") {
    return array2.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data2) => {
  const t = typeof data2;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return isNaN(data2) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data2)) {
        return ZodParsedType.array;
      }
      if (data2 === null) {
        return ZodParsedType.null;
      }
      if (data2.then && typeof data2.then === "function" && data2.catch && typeof data2.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data2 instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data2 instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data2 instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  get errors() {
    return this.issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var overrideErrorMap = errorMap;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var makeIssue = (params) => {
  const { data: data2, path: path3, errorMaps, issueData } = params;
  const fullPath = [...path3, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data: data2, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      ctx.schemaErrorMap,
      overrideMap,
      overrideMap === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message === null || message === void 0 ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));
var _ZodEnum_cache;
var _ZodNativeEnum_cache;
var ParseInputLazyPath = class {
  constructor(parent, value, path3, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path3;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (this._key instanceof Array) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    var _a, _b;
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message !== null && message !== void 0 ? message : ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0 ? _a : ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0 ? _b : ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
  }
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data2, params) {
    const result = this.safeParse(data2, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data2, params) {
    var _a;
    const ctx = {
      common: {
        issues: [],
        async: (_a = params === null || params === void 0 ? void 0 : params.async) !== null && _a !== void 0 ? _a : false,
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: data2,
      parsedType: getParsedType(data2)
    };
    const result = this._parseSync({ data: data2, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  async parseAsync(data2, params) {
    const result = await this.safeParseAsync(data2, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data2, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
        async: true
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data: data2,
      parsedType: getParsedType(data2)
    };
    const maybeAsyncResult = this._parse({ data: data2, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check2, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check2(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data2) => {
          if (!data2) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check2, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check2(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this, this._def);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform2) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform: transform2 }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv6Regex = /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let regex = `([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d`;
  if (args.precision) {
    regex = `${regex}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    regex = `${regex}(\\.\\d+)?`;
  }
  return regex;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check2 of this._def.checks) {
      if (check2.kind === "min") {
        if (input.data.length < check2.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check2.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "max") {
        if (input.data.length > check2.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check2.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "length") {
        const tooBig = input.data.length > check2.value;
        const tooSmall = input.data.length < check2.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check2.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check2.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check2.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check2.message
            });
          }
          status.dirty();
        }
      } else if (check2.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "url") {
        try {
          new URL(input.data);
        } catch (_a) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "regex") {
        check2.regex.lastIndex = 0;
        const testResult = check2.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "trim") {
        input.data = input.data.trim();
      } else if (check2.kind === "includes") {
        if (!input.data.includes(check2.value, check2.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check2.value, position: check2.position },
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check2.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check2.kind === "startsWith") {
        if (!input.data.startsWith(check2.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check2.value },
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "endsWith") {
        if (!input.data.endsWith(check2.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check2.value },
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "datetime") {
        const regex = datetimeRegex(check2);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "time") {
        const regex = timeRegex(check2);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "ip") {
        if (!isValidIP(input.data, check2.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check2.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check2);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data2) => regex.test(data2), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check2) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check2]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    var _a, _b;
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      offset: (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : false,
      local: (_b = options === null || options === void 0 ? void 0 : options.local) !== null && _b !== void 0 ? _b : false,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options === null || options === void 0 ? void 0 : options.position,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * @deprecated Use z.string().min(1) instead.
   * @see {@link ZodString.min}
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  var _a;
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / Math.pow(10, decCount);
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check2 of this._def.checks) {
      if (check2.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "min") {
        const tooSmall = check2.inclusive ? input.data < check2.value : input.data <= check2.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check2.value,
            type: "number",
            inclusive: check2.inclusive,
            exact: false,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "max") {
        const tooBig = check2.inclusive ? input.data > check2.value : input.data >= check2.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check2.value,
            type: "number",
            inclusive: check2.inclusive,
            exact: false,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check2.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check2.value,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check2.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check2);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check2) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check2]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null, min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = BigInt(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check2 of this._def.checks) {
      if (check2.kind === "min") {
        const tooSmall = check2.inclusive ? input.data < check2.value : input.data <= check2.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check2.value,
            inclusive: check2.inclusive,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "max") {
        const tooBig = check2.inclusive ? input.data > check2.value : input.data >= check2.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check2.value,
            inclusive: check2.inclusive,
            message: check2.message
          });
          status.dirty();
        }
      } else if (check2.kind === "multipleOf") {
        if (input.data % check2.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check2.value,
            message: check2.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check2);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check2) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check2]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  var _a;
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check2 of this._def.checks) {
      if (check2.kind === "min") {
        if (input.data.getTime() < check2.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check2.message,
            inclusive: true,
            exact: false,
            minimum: check2.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check2.kind === "max") {
        if (input.data.getTime() > check2.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check2.message,
            inclusive: true,
            exact: false,
            maximum: check2.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check2);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check2) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check2]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    return this._cached = { shape, keys };
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") ;
      else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          var _a, _b, _c, _d;
          const defaultError = (_c = (_b = (_a = this._def).errorMap) === null || _b === void 0 ? void 0 : _b.call(_a, issue, ctx).message) !== null && _c !== void 0 ? _c : ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: (_d = errorUtil.errToObj(message).message) !== null && _d !== void 0 ? _d : defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    util.objectKeys(mask).forEach((key) => {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  constructor() {
    super(...arguments);
    _ZodEnum_cache.set(this, void 0);
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
_ZodEnum_cache = /* @__PURE__ */ new WeakMap();
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  constructor() {
    super(...arguments);
    _ZodNativeEnum_cache.set(this, void 0);
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
_ZodNativeEnum_cache = /* @__PURE__ */ new WeakMap();
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data2) => {
      return this._def.type.parseAsync(data2, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return base;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return base;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({ status: status.value, value: result }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data2 = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data2 = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data: data2,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data2 = ctx.data;
    return this._def.type._parse({
      data: data2,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data2) => {
      if (isValid(data2)) {
        data2.value = Object.freeze(data2.value);
      }
      return data2;
    };
    return isAsync(result) ? result.then((data2) => freeze(data2)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function custom(check2, params = {}, fatal) {
  if (check2)
    return ZodAny.create().superRefine((data2, ctx) => {
      var _a, _b;
      if (!check2(data2)) {
        const p = typeof params === "function" ? params(data2) : typeof params === "string" ? { message: params } : params;
        const _fatal = (_b = (_a = p.fatal) !== null && _a !== void 0 ? _a : fatal) !== null && _b !== void 0 ? _b : true;
        const p2 = typeof p === "string" ? { message: p } : p;
        ctx.addIssue({ code: "custom", ...p2, fatal: _fatal });
      }
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data2) => data2 instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;
var z = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: errorMap,
  setErrorMap,
  getErrorMap,
  makeIssue,
  EMPTY_PATH,
  addIssueToContext,
  ParseStatus,
  INVALID,
  DIRTY,
  OK,
  isAborted,
  isDirty,
  isValid,
  isAsync,
  get util() {
    return util;
  },
  get objectUtil() {
    return objectUtil;
  },
  ZodParsedType,
  getParsedType,
  ZodType,
  datetimeRegex,
  ZodString,
  ZodNumber,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodSymbol,
  ZodUndefined,
  ZodNull,
  ZodAny,
  ZodUnknown,
  ZodNever,
  ZodVoid,
  ZodArray,
  ZodObject,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodTuple,
  ZodRecord,
  ZodMap,
  ZodSet,
  ZodFunction,
  ZodLazy,
  ZodLiteral,
  ZodEnum,
  ZodNativeEnum,
  ZodPromise,
  ZodEffects,
  ZodTransformer: ZodEffects,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodCatch,
  ZodNaN,
  BRAND,
  ZodBranded,
  ZodPipeline,
  ZodReadonly,
  custom,
  Schema: ZodType,
  ZodSchema: ZodType,
  late,
  get ZodFirstPartyTypeKind() {
    return ZodFirstPartyTypeKind;
  },
  coerce,
  any: anyType,
  array: arrayType,
  bigint: bigIntType,
  boolean: booleanType,
  date: dateType,
  discriminatedUnion: discriminatedUnionType,
  effect: effectsType,
  "enum": enumType,
  "function": functionType,
  "instanceof": instanceOfType,
  intersection: intersectionType,
  lazy: lazyType,
  literal: literalType,
  map: mapType,
  nan: nanType,
  nativeEnum: nativeEnumType,
  never: neverType,
  "null": nullType,
  nullable: nullableType,
  number: numberType,
  object: objectType,
  oboolean,
  onumber,
  optional: optionalType,
  ostring,
  pipeline: pipelineType,
  preprocess: preprocessType,
  promise: promiseType,
  record: recordType,
  set: setType,
  strictObject: strictObjectType,
  string: stringType,
  symbol: symbolType,
  transformer: effectsType,
  tuple: tupleType,
  "undefined": undefinedType,
  union: unionType,
  unknown: unknownType,
  "void": voidType,
  NEVER,
  ZodIssueCode,
  quotelessJson,
  ZodError
});

// src/providers/coingeckoProvider.ts
import axios from "axios";
var CoingeckoProvider = class {
  axiosInstance;
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: "https://api.coingecko.com/api/v3",
      timeout: 5e3
    });
  }
  async fetchMarketData(currency = "usd", limit = 10) {
    try {
      const response = await this.axiosInstance.get("/coins/markets", {
        params: {
          vs_currency: currency,
          order: "market_cap_desc",
          per_page: limit,
          page: 1,
          sparkline: false
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching market data:", error);
      throw new Error("Failed to fetch market data");
    }
  }
  async getTrendingCoins() {
    try {
      const response = await this.axiosInstance.get("/search/trending");
      return response.data.coins.map((coin) => ({
        id: coin.item.id,
        name: coin.item.name,
        symbol: coin.item.symbol.toUpperCase(),
        market_cap_rank: coin.item.market_cap_rank,
        price: coin.item.data.price,
        total_volume: coin.item.data.total_volume,
        market_cap: coin.item.data.market_cap
      }));
    } catch (error) {
      console.error("Error fetching trending tokens:", error);
      throw new Error("Failed to fetch trending tokens");
    }
  }
  async getToken(coinId) {
    try {
      const response = await this.axiosInstance.get(`/simple/price`, {
        params: {
          ids: coinId,
          vs_currencies: "usd",
          include_market_cap: true,
          include_24hr_vol: true,
          include_24hr_change: true,
          include_last_updated_at: true
        }
      });
      return response.data[coinId];
    } catch (error) {
      console.error(`Error fetching details for coin ${coinId}:`, error);
      throw new Error("Failed to fetch coin details");
    }
  }
  async getTrendingNFTs() {
    try {
      const response = await this.axiosInstance.get("/search/trending");
      return response.data.nfts.map((nft) => ({
        id: nft.id,
        name: nft.name,
        symbol: nft.symbol.toUpperCase(),
        // market_cap_rank: nft.item.market_cap_rank,
        // price: nft.item.data.price,
        // total_volume: nft.item.data.total_volume,
        // market_cap: nft.item.data.market_cap,
        thumb: nft.thumb,
        native_currency_symbol: nft.native_currency_symbol,
        floor_price_in_native_currency: nft.floor_price_in_native_currency,
        floor_price_24h_percentage_change: nft.floor_price_24h_percentage_change,
        data: {
          floor_price: nft.data.floor_price,
          floor_price_in_usd_24h_percentage_change: nft.data.floor_price_in_usd_24h_percentage_change,
          h24_volume: nft.data.h24_volume
        }
      }));
    } catch (error) {
      console.error("Error fetching trending NFTs:", error);
      throw new Error("Failed to fetch trending NFTs");
    }
  }
  async getNFTDetails(nftId) {
    try {
      const response = await this.axiosInstance.get(`/nfts/${nftId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching details for NFT ${nftId}:`, error);
      throw new Error("Failed to fetch NFT details");
    }
  }
  async getTrendingCategories(limit = 5) {
    try {
      const response = await this.axiosInstance.get("/coins/categories");
      return response.data.slice(0, limit);
    } catch (error) {
      console.error("Error fetching trending categories:", error);
      throw new Error("Failed to fetch trending categories");
    }
  }
  //@fixme
  async getTrendingMemeCoinsOnSui(limit = 10) {
    try {
      const categoriesResponse = await this.axiosInstance.get(`/coins/categories`);
      const memeCategory = categoriesResponse.data.find(
        (category) => category.name.toLowerCase() === "meme"
      );
      if (!memeCategory) {
        throw new Error("Meme category not found");
      }
      const coinsResponse = await this.axiosInstance.get(`/coins/markets`, {
        params: {
          vs_currency: "usd",
          category: "meme",
          order: "market_cap_desc",
          per_page: 100,
          page: 1
        }
      });
      const suiMemeCoins = coinsResponse.data.filter(
        (coin) => coin.asset_platform_id === "sui"
      );
      return suiMemeCoins.slice(0, limit);
    } catch (error) {
      console.error("Error fetching trending meme coins on Sui:", error);
      throw new Error("Failed to fetch trending meme coins on Sui network");
    }
  }
  async getTopMarketInfo(currency = "usd", ids = "bitcoin,ethereum,solana,bnb,cardano,sui", category = "layer-1", order = "market_cap_desc", per_page = 10, page = 1, price_change_percentage = "1h", locale = "en", precision = "8") {
    try {
      const response = await this.axiosInstance.get("/coins/markets", {
        params: {
          vs_currency: currency,
          order,
          per_page,
          page,
          sparkline: false,
          ids,
          category,
          price_change_percentage,
          locale,
          precision
        }
      });
      return response.data.map((coin) => ({
        name: coin.name,
        symbol: coin.symbol.toUpperCase(),
        current_price: coin.current_price,
        market_cap: coin.market_cap,
        price_change_percentage_24h: coin.price_change_percentage_24h
      }));
    } catch (error) {
      console.error("Error fetching top market info:", error);
      throw new Error("Failed to fetch top market info");
    }
  }
  //@fixme exactly evaluate content to decide AI tokens
  async topAiTokens(runtime, message, state, currency = "usd", limit = 10) {
    try {
      const categoriesResponse = await this.axiosInstance.get("/coins/categories");
      const aiCategory = categoriesResponse.data.find(
        (category) => category.name.toLowerCase().includes(" ai ")
      );
      if (!aiCategory) {
        throw new Error("AI category not found");
      }
      const marketsResponse = await this.axiosInstance.get("/coins/markets", {
        params: {
          vs_currency: currency,
          category: aiCategory.id,
          order: "market_cap_desc",
          per_page: limit,
          page: 1
        }
      });
      return marketsResponse.data.map((token) => ({
        name: token.name,
        symbol: token.symbol.toUpperCase(),
        price: token.current_price,
        market_cap: token.market_cap,
        price_change_24h: token.price_change_percentage_24h
      }));
    } catch (error) {
      console.error("Error fetching AI tokens:", error);
      throw new Error("Failed to fetch AI tokens");
    }
  }
  //@fixme exactly evaluate content to decide AI tokens
  async topMemeTokens(runtime, message, state, currency = "usd", limit = 10) {
    try {
      const categoriesResponse = await this.axiosInstance.get("/coins/categories");
      const aiCategory = categoriesResponse.data.find(
        (category) => true
        // category.name.toLowerCase().includes(" meme ")
      );
      if (!aiCategory) {
        throw new Error("AI category not found");
      }
      const marketsResponse = await this.axiosInstance.get("/coins/markets", {
        params: {
          vs_currency: currency,
          category: aiCategory.id,
          order: "market_cap_desc",
          per_page: limit,
          page: 1
        }
      });
      return marketsResponse.data.filter(
        (coin) => coin.asset_platform_id === "sui"
      ).map((token) => ({
        name: token.name,
        symbol: token.symbol.toUpperCase(),
        price: token.current_price,
        market_cap: token.market_cap,
        price_change_24h: token.price_change_percentage_24h
      }));
    } catch (error) {
      console.error("Error fetching AI tokens:", error);
      throw new Error("Failed to fetch AI tokens");
    }
  }
};

// src/providers/searchCoinIdInFileJson.ts
import fs from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var files = [
  path.join(__dirname, "../src/coin_list/coin_list.json")
];
var searchCoinInFileJsonProvider = async (coinSymbol) => {
  const results = await Promise.all(
    files.map(async (file2) => {
      try {
        const data2 = await fs.readFile(file2, "utf8");
        const coins = JSON.parse(data2);
        const foundCoin = coins.find(
          (coin) => coin.symbol.toLowerCase() === coinSymbol.toLowerCase()
        );
        return foundCoin || null;
      } catch (err) {
        console.error(`Error reading file ${file2}:`, err);
        return null;
      }
    })
  );
  return results.find((result) => result !== null) || null;
};
var searchCoinInFileJsonProvider2 = async (coinSymbol, coinName) => {
  const results = await Promise.all(
    files.map(async (file2) => {
      try {
        const data2 = await fs.readFile(file2, "utf8");
        const coins = JSON.parse(data2);
        const foundCoin = coins.find(
          (coin) => (coin.symbol.toLowerCase() === coinSymbol.toLowerCase() || coin.name.toLowerCase() === coinName.toLowerCase()) && coin.verified === true
        );
        return foundCoin || null;
      } catch (err) {
        console.error(`Error reading file ${file2}:`, err);
        return null;
      }
    })
  );
  return results.find((result) => result !== null) || null;
};

// src/actions/coinInfo.ts
function isInfoContent(content) {
  console.log("Content for transfer", content);
  return typeof content.coin_symbol === "string" && typeof content.coin_name === "string";
}
var coinInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "coin_symbol": "btc"
    "coin_name":"Bitcoin"
}
\`\`\`


{{recentMessages}}

Based on the user's current question, extract the following cryptocurrency information:
    coin_symbol:
        Cryptocurrency symbol in lowercase format
        Return bitcoin if no valid cryptocurrency symbol is found
    coin_name:
        - Full name of the cryptocurrency with proper capitalization (e.g., Bitcoin, Ethereum, Solana)
        - Must match the corresponding symbol
        - Return Bitcoin if no valid cryptocurrency name is found

Only extract information explicitly mentioned in the current question. Do not use historical context or assumed information.
Respond with a JSON markdown block containing only the extracted values.`;
var coinInfo = {
  name: "GET_COIN_INFO_BY_SYMBOL",
  similes: [
    "GET_COIN",
    "COIN_DATA",
    "COIN_DETAILS",
    "SHOW_COIN",
    "CHECK_COIN",
    "COIN_STATUS",
    "COIN_LOOKUP",
    "FIND_COIN",
    "COIN_PRICE",
    "PRICE_CHECK",
    "GET_PRICE",
    "PRICE_INFO",
    "COIN_METRICS",
    "COIN_STATS"
  ],
  examples: [],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Get detail of token",
  handler: async (runtime, message, state, _options2, callback) => {
    elizaLogger.log("[tokenInfo]");
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const _schema2 = z.object({
      coin_symbol: z.string(),
      coin_name: z.string()
    });
    const _context = composeContext({
      state,
      template: coinInfoTemplate
    });
    const content = await generateObject({
      runtime,
      context: _context,
      schema: _schema2,
      modelClass: ModelClass.MEDIUM
    });
    const parsedContent = content.object;
    if (!isInfoContent(parsedContent)) {
      console.error("Invalid content for coin info");
      if (callback) {
        callback({
          text: "Unable to process coin info request. Invalid content provided.",
          content: { error: "Invalid transfer content" }
        });
      }
      return false;
    }
    elizaLogger.log("[coinInfo] parsed content: ", parsedContent);
    let coinObject = await searchCoinInFileJsonProvider2(parsedContent.coin_symbol, parsedContent.coin_name);
    console.log("coinObject", coinObject);
    if (coinObject === null) {
      coinObject = await searchCoinInFileJsonProvider(parsedContent.coin_symbol);
      if (coinObject === null) {
        callback({
          text: `I cant find infomation of coin symbol`
        });
        return false;
      }
    }
    const coinGecko = new CoingeckoProvider();
    const info = await coinGecko.getToken(coinObject.id);
    elizaLogger.info("[coinInfo] details: ", JSON.stringify(info));
    if (callback) {
      callback({
        text: `${coinObject.name} is a cryptocurrency that operates on blockchain technology. Its price is determined by various factors, including supply, demand, and network activity.`,
        action: "coinInfo",
        result: {
          type: "info_coin",
          data: info
        }
      });
    }
    return true;
  }
};

// src/actions/topMarkets.ts
import {
  ModelClass as ModelClass2,
  composeContext as composeContext2,
  elizaLogger as elizaLogger2
} from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
var topMarketPromptTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
    Example response:
    \`\`\`json
    {
        vs_currency:"usd",
        ids: "bitcoin,ethereum,solana,bnb,cardano,sui,
        category: "layer-1",
        order: "market_cap_desc",
        per_page: 5,
        page: 1,
        price_change_percentage: "1h",
        locale: "en",
        precision: "8"
    }
    \`\`\`
    {{recentMessages}}

    Extract ONLY from the current message (ignore any previous context or messages):

Given the recent messages, extract the following information:

        vs_currency: Extract currency symbols, following these rules:
            Look for common fiat currency symbols (USD, EUR, VND, etc.)
            Convert all symbols to lowercase
            If multiple currencies found, use the first one only
            Must be wrapped in double quotes
            If no currency specified, return "usd"

        ids: Extract coin IDs, following these rules:
            Must be lowercase
            Comma-separated for multiple coins
            Must be wrapped in double quotes
            Example: "bitcoin,ethereum,solana"
            If no coins specified, return "bitcoin,ethereum,solana,bnb,cardano,sui"

        category: Must be one of:
            layer-1
            layer-2
            ai
            aiagent
            Must be wrapped in double quotes
            If not specified, return layer-1

        order: Must be one of:
            market_cap_desc (default)
            market_cap_asc
            volume_asc
            volume_desc
            id_asc
            id_desc
            Must be wrapped in double quotes

        per_page: Must be:
            Automatically calculated based on number of IDs
            Maximum value of 10 per page
            If IDs count \u2264 10, per_page = number of IDs
            If IDs count > 10, per_page = 10
            No quotes
            Example 1: ids="btc,eth,xrp" \u2192 per_page=3
            Example 2: ids="btc,eth,xrp,bnb,sui,sol,cube,wemix,wld,arb,op" \u2192 per_page=10

        page: Must be:
            Calculated based on IDs count and per_page
            If IDs count \u2264 10, page=1
            If IDs count > 10, use multiple pages
            No quotes
            Example: 12 IDs \u2192 page 1 (first 10 IDs) and page 2 (remaining 2 IDs)

        price_change_percentage: Must be one of:
            1h (default)
            24h
            7d
            14d
            30d
            200d
            1y
            Must be wrapped in double quotes
            Can be comma-separated for multiple timeframes

        locale: Must be:
            Valid language code
            Must be wrapped in double quotes
            Default to "en" if not specified

        precision: Must be:
            String representation of number
            Must be wrapped in double quotes
            Default to "8" if not specified

        VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON

    Respond with a JSON markdown block containing only the extracted values.`;
var topMarkets = {
  name: "TOP_COIN_MARKET",
  similes: [
    "FETCH_TOP_MARKETS",
    "GET_MARKET_RANKINGS",
    "SHOW_TOP_COINS",
    "LIST_TRENDING_MARKETS",
    "DISPLAY_MARKET_LEADERS",
    "GET_CRYPTOCURRENCY_RANKINGS",
    "SHOW_MARKET_CAPS",
    "FETCH_COIN_RANKINGS",
    "GET_TOP_CRYPTOCURRENCIES",
    "DISPLAY_MARKET_OVERVIEW",
    "SHOW_COIN_MARKET_DATA",
    "LIST_TOP_TRADING_PAIRS",
    "GET_MARKET_STATISTICS",
    "FETCH_MARKET_PERFORMANCE",
    "SHOW_CRYPTO_LEADERBOARD"
  ],
  examples: [],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Retrieves top cryptocurrency markets data from CoinGecko including price, market cap, volume and other key metrics",
  handler: async (runtime, message, state, _options2, callback) => {
    elizaLogger2.log("[topMarkets]");
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const topMarketsContext = composeContext2({
      state,
      template: topMarketPromptTemplate
    });
    const content = await generateObjectDeprecated({
      runtime,
      context: topMarketsContext,
      modelClass: ModelClass2.LARGE
    });
    elizaLogger2.log("content: ", content);
    const coinGecko = new CoingeckoProvider();
    const info = await coinGecko.getTopMarketInfo(
      content.vs_currency,
      content.ids,
      content.category,
      content.order,
      content.per_page,
      content.page,
      content.price_change_percentage,
      content.locale,
      content.precision
    );
    if (callback) {
      callback({
        text: `\u{1FA99} Top Coins in the Market

Here are some of the top cryptocurrencies in the market based on market capitalization and trading volume:`,
        action: "TOP_COIN_MARKET",
        result: {
          type: "marketStatisticsTable",
          data: info
        }
      });
    }
    return true;
  }
};

// src/actions/trendingCoins.ts
import {
  ModelClass as ModelClass3,
  composeContext as composeContext3,
  elizaLogger as elizaLogger3
} from "@elizaos/core";
import { generateObjectDeprecated as generateObjectDeprecated2 } from "@elizaos/core";
var trendingPromptTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.
    Example response:
    \`\`\`json
    {
        size:1
    }
    \`\`\`
    {{recentMessages}}

    Extract ONLY from the current message (ignore any previous context or messages):

        Given the recent messages, extract the following information:

        size: Number of news items to return: Must be a positive integer Default is 1 if not specified Maximum value is 100 Minimum value is 1 If mentioned in message, use that number If not mentioned, use default value 10

        VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON

    Respond with a JSON markdown block containing only the extracted values.`;
var trendingTokens = {
  name: "TOP_TRENDING_TOKENS",
  description: "Get trending tokens",
  similes: [
    "SHOW_TRENDING_COINS",
    "GET_HOT_TOKENS",
    "FETCH_TRENDING_CRYPTO",
    "DISPLAY_POPULAR_TOKENS",
    "SHOW_WHATS_TRENDING",
    "GET_MOST_SEARCHED_TOKENS",
    "LIST_VIRAL_CRYPTOCURRENCIES",
    "SHOW_BUZZING_TOKENS",
    "GET_HYPED_COINS",
    "DISPLAY_TRENDING_GAINERS",
    "FETCH_TRENDING_MOVERS",
    "SHOW_TRENDING_MOMENTUM",
    "GET_VIRAL_TOKENS",
    "DISPLAY_TRENDING_MARKETS",
    "SHOW_BREAKOUT_TOKENS"
  ],
  examples: [],
  validate: async (_runtime, _message) => {
    return true;
  },
  handler: async (runtime, message, state, _options2, callback) => {
    elizaLogger3.log("[trendingTokens]");
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const newsCryptoPannicContext = composeContext3({
      state,
      template: trendingPromptTemplate
    });
    const content = await generateObjectDeprecated2({
      runtime,
      context: newsCryptoPannicContext,
      modelClass: ModelClass3.SMALL
    });
    elizaLogger3.log("content: ", content);
    const coinGecko = new CoingeckoProvider();
    const info = await coinGecko.getTrendingCoins();
    if (callback) {
      callback({
        text: `Below are ${content.size} trending coins we have collected:`,
        action: "TOP_TRENDING_TOKENS",
        result: {
          type: "trendingTokens",
          data: info.slice(0, content.size)
        }
      });
    }
    return true;
  }
};

// src/actions/searchSuiTokenSymbol.ts
import {
  ModelClass as ModelClass4,
  composeContext as composeContext4,
  elizaLogger as elizaLogger4,
  generateObjectDeprecated as generateObjectDeprecated3
} from "@elizaos/core";

// src/providers/coingeckoTerminalProvider2.ts
import axios2 from "axios";
var GeckoTerminalProvider2 = class {
  api;
  constructor() {
    this.api = axios2.create({
      baseURL: "https://api.geckoterminal.com/api/v2",
      timeout: 5e3
    });
  }
  async queryTokens(networkId = "sui-network", page = 1, query = null) {
    let url;
    if (query == null) {
      url = `/networks/${networkId}/pools?include=base_token&page=${page}`;
    } else {
      url = `/search/pools?query=${query}&network=${networkId}&include=base_token&page=${page}`;
    }
    try {
      const response = await this.api.get(url);
      if (!Array.isArray(response.data.included)) {
        console.error("The 'included' field is missing or invalid in the API response.");
        return [];
      }
      const tokens = response.data.included.map((token) => ({
        base_token_id: token.id.split("_")[1],
        address: token.attributes.address,
        name: token.attributes.name,
        symbol: token.attributes.symbol,
        decimals: token.attributes.decimals,
        image_url: token.attributes.image_url,
        coingecko_coin_id: token.attributes.coingecko_coin_id
      }));
      return tokens;
    } catch (error) {
      console.error("Error querying tokens:", error.message);
      return [];
    }
  }
  async getTokenDetails(networkId = "sui-network", tokenId = "0x7123ef5ec546c363f270ef770472dfad231eeb86469a2d1fba566d6fd74cb9e1::craft::CRAFT") {
    const url = `/networks/${networkId}/tokens/${encodeURIComponent(tokenId)}/info`;
    try {
      const response = await this.api.get(url);
      const tokenDetail = response.data.data;
      return {
        id: tokenDetail.id,
        address: tokenDetail.attributes.address,
        name: tokenDetail.attributes.name,
        symbol: tokenDetail.attributes.symbol,
        decimals: tokenDetail.attributes.decimals,
        image_url: tokenDetail.attributes.image_url,
        coingecko_coin_id: tokenDetail.attributes.coingecko_coin_id,
        websites: tokenDetail.attributes.websites,
        description: tokenDetail.attributes.description,
        gt_score: tokenDetail.attributes.gt_score,
        discord_url: tokenDetail.attributes.discord_url,
        telegram_handle: tokenDetail.attributes.telegram_handle,
        twitter_handle: tokenDetail.attributes.twitter_handle,
        categories: tokenDetail.attributes.categories,
        gt_category_ids: tokenDetail.attributes.gt_category_ids
      };
    } catch (error) {
      console.error(`Error fetching token details for ${tokenId}:`, error.message);
      return null;
    }
  }
  async trendingTokens(networkId = "sui-network", page = 1, query = null) {
  }
  async trendingPools(networkId = "sui-network", page = 1, query = null) {
  }
};
var coingeckoTerminalProvider2_default = GeckoTerminalProvider2;

// src/actions/searchSuiTokenSymbol.ts
var searchSuiTokenSymbolPromptTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
Example response:
    \`\`\`json
    {
        size:1
        token_name:"meme"
    }
    \`\`\`
{{recentMessages}}
Extract ONLY from the current message (ignore any previous context or messages):

Given the recent messages, extract the following information:

size:

Number of records to return
Must be a positive integer
Default is 1 if not specified
Maximum value is 100
Minimum value is 1
If mentioned in message, use that number
If not mentioned, use default value 1
token_name:

Name of the token
Must be a string
Default is null if not specified
Case sensitive
If not mentioned, use null
VALIDATION RULES:

All property names must use double quotes
All string values must use double quotes
null values should not use quotes
No trailing commas allowed
No single quotes anywhere in the JSON
Respond with a JSON markdown block containing only the extracted values.

`;
var searchSuiTokenSymbol = {
  name: "SEARCH_SUI_TOKEN_SYMBOL",
  description: "Search pool by Token Symbol",
  similes: [
    // Basic search patterns
    "FIND_SUI_TOKEN_{TOKEN_NAME}",
    "SEARCH_SUI_TOKEN_{TOKEN_NAME}",
    "LOOKUP_SUI_TOKEN_{TOKEN_NAME}",
    "SHOW_SUI_TOKEN_{TOKEN_NAME}",
    "GET_SUI_TOKEN_INFO_{TOKEN_NAME}",
    "CHECK_SUI_TOKEN_{TOKEN_NAME}",
    "LOCATE_SUI_TOKEN_{TOKEN_NAME}"
  ],
  examples: [],
  validate: async (_runtime, _message) => {
    return true;
  },
  handler: async (runtime, message, state, _options2, callback) => {
    elizaLogger4.log("[suiPools]");
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const searchSuiTokenSymbolPromptTemplateContext = composeContext4({
      state,
      template: searchSuiTokenSymbolPromptTemplate
    });
    const content = await generateObjectDeprecated3({
      runtime,
      context: searchSuiTokenSymbolPromptTemplateContext,
      modelClass: ModelClass4.SMALL
    });
    elizaLogger4.log("content: ", content);
    const coinGecko = new GeckoTerminalProvider2();
    const info = await coinGecko.queryTokens("sui-network", 1, content.token_name);
    if (callback) {
      callback({
        text: "Here is a list of tokens available on the Sui Network. You can explore their contract addresses, liquidity, trading volume, and other key details",
        action: "searchSuiTokenSymbol",
        result: {
          type: "pools",
          data: info.slice(0, content.size)
        }
      });
    }
    return true;
  }
};

// src/actions/suiTokenInfo.ts
import {
  ModelClass as ModelClass5,
  composeContext as composeContext5,
  elizaLogger as elizaLogger5,
  generateObjectDeprecated as generateObjectDeprecated4
} from "@elizaos/core";
var promptSuiTokenInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
    \`\`\`json
    {
        "token_address": "0x7123ef5ec546c363f270ef770472dfad231eeb86469a2d1fba566d6fd74cb9e1::craft::CRAFT"
    }
    \`\`\`
{{recentMessages}}
Extract ONLY from the current message (ignore any previous context or messages):

Given the recent messages, extract the following information:

token_address:

Full contract address of the token
Must be a string
Include module and token name if present
Default is null if not specified

VALIDATION RULES:

All property names must use double quotes
All string values must use double quotes
null values should not use quotes
No trailing commas allowed
No single quotes anywhere in the JSON
Respond with a JSON markdown block containing only the extracted values.`;
var suiTokenInfo = {
  name: "TOKEN_INFO_SUI_NETWORK",
  description: "query tokens on Sui",
  similes: [
    "PARSE_SUI_TOKEN_{INPUT}",
    "EXTRACT_SUI_TOKEN_DETAILS_{INPUT}",
    "GET_SUI_TOKEN_DATA_{INPUT}",
    "IDENTIFY_SUI_TOKEN_{INPUT}",
    "FIND_SUI_TOKEN_INFO_{INPUT}"
  ],
  examples: [],
  validate: async (_runtime, _message) => {
    return true;
  },
  handler: async (runtime, message, state, _options2, callback) => {
    elizaLogger5.log("[suiPools]");
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const searchSuiTokenSymbolPromptTemplateContext = composeContext5({
      state,
      template: promptSuiTokenInfoTemplate
    });
    const content = await generateObjectDeprecated4({
      runtime,
      context: searchSuiTokenSymbolPromptTemplateContext,
      modelClass: ModelClass5.SMALL
    });
    elizaLogger5.log("content: ", content);
    let coinGecko = new coingeckoTerminalProvider2_default();
    let info = await coinGecko.getTokenDetails("sui-network", content.token_address);
    if (callback) {
      callback({
        text: `\u{1F50D} Token Details Information

Here are the detailed insights for the selected token:`,
        action: "suiTokenInfo",
        result: {
          type: "token_info",
          data: info
        }
      });
    }
    return true;
  }
};

// src/actions/swapBySymbol.ts
import {
  composeContext as composeContext6,
  elizaLogger as elizaLogger6,
  generateObjectDeprecated as generateObjectDeprecated5,
  ModelClass as ModelClass6
} from "@elizaos/core";

// src/providers/searchCoinInAggre.ts
import fs2 from "fs";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var file = path2.join(__dirname2, "../src/coin-info-sui.json");
var data = JSON.parse(fs2.readFileSync(file, "utf8"));
async function findByVerifiedAndSymbol(symbol) {
  const matchingItems = data.filter((item) => item.symbol === symbol);
  if (matchingItems.length === 0) {
    return null;
  }
  const verifiedItem = matchingItems.find((item) => item.verified === true);
  return verifiedItem || matchingItems[0];
}
var searchCoinInAggre_default = findByVerifiedAndSymbol;

// src/actions/swapBySymbol.ts
var swapTemplate = `Please extract the following swap details for SUI network:

{
    "inputTokenSymbol": string | null,     // Token being sold (e.g. "SUI")
    "outputTokenSymbol": string | null,    // Token being bought
    "amount": number | 0,               // Amount to swap
}

Recent messages: {{recentMessages}}

Extract the swap parameters from the conversation and wallet context above. Return only a JSON object with the specified fields. Use null for any values that cannot be determined.

Ensure that all token symbols are converted to uppercase.

Example response:
{
    "inputTokenSymbol": "SUI",
    "outputTokenSymbol": "USDC",
    "amount": 1.5,
}
\`\`\`
VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON


`;
var executeSwap = {
  name: "SUI_EXECUTE_SWAP_BY_SYMBOL",
  similes: ["SUI_SWAP_TOKENS_BY_SYMBOL", "SUI_TOKEN_SWAP_BY_SYMBOL", "SUI_TRADE_TOKENS_BY_SYMBOL", "SUI_EXCHANGE_TOKENS+BY_SYMBOL"],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Perform a token swap.",
  handler: async (runtime, message, state, _options2, callback) => {
    elizaLogger6.log("compose history...");
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const swapContext = composeContext6({
      state,
      template: swapTemplate
    });
    elizaLogger6.log("compose history...done!");
    elizaLogger6.log("extract content ...");
    const content = await generateObjectDeprecated5({
      runtime,
      context: swapContext,
      modelClass: ModelClass6.LARGE
    });
    elizaLogger6.log("extract content ...done -> ", content);
    const inputTokenObject = await searchCoinInAggre_default(content.inputTokenSymbol);
    if (!inputTokenObject) {
      callback({
        text: `We do not support ${content.inputTokenSymbol} token in SUI network yet, We only support swapping token symbol to token symbol or token address to token address.`
      });
      return false;
    }
    const outputTokenObject = await searchCoinInAggre_default(content.outputTokenSymbol);
    if (!outputTokenObject) {
      callback({
        text: `We do not support ${content.outputTokenSymbol} token in SUI network yet, We only support swapping token symbol to token symbol or token address to token address. `
      });
      return false;
    }
    const responseData = {
      amount: content.amount,
      fromToken: inputTokenObject,
      toToken: outputTokenObject
    };
    try {
      callback({
        text: `Please double-check all details before swapping to avoid any loss`,
        action: "SUI_EXECUTE_SWAP_BY_SYMBOL",
        result: {
          type: "swap",
          data: responseData
        }
      });
      return true;
    } catch (error) {
      console.error("Error during token swap:", error);
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          inputTokenSymbol: "SUI",
          outputTokenSymbol: "USDT",
          amount: 10
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Initiating swap of 10 SUI for USDT on SUI network...",
          action: "SUI_EXECUTE_SWAP_BY_SYMBOL",
          params: {
            inputTokenSymbol: "SUI",
            outputTokenSymbol: "USDT",
            amount: "10"
          }
        }
      }
    ],
    [
      {
        "user": "{{user1}}",
        "content": {
          "inputTokenSymbol": "CETUS",
          "outputTokenSymbol": "DEEP",
          "amount": 0
        }
      },
      {
        "user": "{{user2}}",
        "content": {
          "text": "Initiating swap CeTUS for deep on SUI network...",
          "action": "SUI_EXECUTE_SWAP_BY_SYMBOL",
          "params": {
            "inputTokenSymbol": "CeTUS",
            "outputTokenSymbol": "deep",
            "amount": "0"
          }
        }
      }
    ]
  ]
};

// src/actions/swapByAddress.ts
import {
  composeContext as composeContext7,
  generateObjectDeprecated as generateObjectDeprecated6,
  ModelClass as ModelClass7
} from "@elizaos/core";

// ../../node_modules/@mysten/sui/dist/esm/version.js
var PACKAGE_VERSION = "1.19.0";
var TARGETED_RPC_VERSION = "1.41.0";

// ../../node_modules/@mysten/sui/dist/esm/client/errors.js
var CODE_TO_ERROR_TYPE = {
  "-32700": "ParseError",
  "-32701": "OversizedRequest",
  "-32702": "OversizedResponse",
  "-32600": "InvalidRequest",
  "-32601": "MethodNotFound",
  "-32602": "InvalidParams",
  "-32603": "InternalError",
  "-32604": "ServerBusy",
  "-32000": "CallExecutionFailed",
  "-32001": "UnknownError",
  "-32003": "SubscriptionClosed",
  "-32004": "SubscriptionClosedWithError",
  "-32005": "BatchesNotSupported",
  "-32006": "TooManySubscriptions",
  "-32050": "TransientError",
  "-32002": "TransactionExecutionClientError"
};
var SuiHTTPTransportError = class extends Error {
};
var JsonRpcError = class extends SuiHTTPTransportError {
  constructor(message, code) {
    super(message);
    this.code = code;
    this.type = CODE_TO_ERROR_TYPE[code] ?? "ServerError";
  }
};
var SuiHTTPStatusError = class extends SuiHTTPTransportError {
  constructor(message, status, statusText) {
    super(message);
    this.status = status;
    this.statusText = statusText;
  }
};

// ../../node_modules/@mysten/sui/dist/esm/client/rpc-websocket-client.js
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});
var _requestId;
var _disconnects;
var _webSocket;
var _connectionPromise;
var _subscriptions;
var _pendingRequests;
var _WebsocketClient_instances;
var setupWebSocket_fn;
var reconnect_fn;
function getWebsocketUrl(httpUrl) {
  const url = new URL(httpUrl);
  url.protocol = url.protocol.replace("http", "ws");
  return url.toString();
}
var DEFAULT_CLIENT_OPTIONS = {
  // We fudge the typing because we also check for undefined in the constructor:
  WebSocketConstructor: typeof WebSocket !== "undefined" ? WebSocket : void 0,
  callTimeout: 3e4,
  reconnectTimeout: 3e3,
  maxReconnects: 5
};
var WebsocketClient = class {
  constructor(endpoint, options = {}) {
    __privateAdd(this, _WebsocketClient_instances);
    __privateAdd(this, _requestId, 0);
    __privateAdd(this, _disconnects, 0);
    __privateAdd(this, _webSocket, null);
    __privateAdd(this, _connectionPromise, null);
    __privateAdd(this, _subscriptions, /* @__PURE__ */ new Set());
    __privateAdd(this, _pendingRequests, /* @__PURE__ */ new Map());
    this.endpoint = endpoint;
    this.options = { ...DEFAULT_CLIENT_OPTIONS, ...options };
    if (!this.options.WebSocketConstructor) {
      throw new Error("Missing WebSocket constructor");
    }
    if (this.endpoint.startsWith("http")) {
      this.endpoint = getWebsocketUrl(this.endpoint);
    }
  }
  async makeRequest(method, params) {
    const webSocket = await __privateMethod(this, _WebsocketClient_instances, setupWebSocket_fn).call(this);
    return new Promise((resolve, reject) => {
      __privateSet(this, _requestId, __privateGet(this, _requestId) + 1);
      __privateGet(this, _pendingRequests).set(__privateGet(this, _requestId), {
        resolve,
        reject,
        timeout: setTimeout(() => {
          __privateGet(this, _pendingRequests).delete(__privateGet(this, _requestId));
          reject(new Error(`Request timeout: ${method}`));
        }, this.options.callTimeout)
      });
      webSocket.send(JSON.stringify({ jsonrpc: "2.0", id: __privateGet(this, _requestId), method, params }));
    }).then(({ error, result }) => {
      if (error) {
        throw new JsonRpcError(error.message, error.code);
      }
      return result;
    });
  }
  async subscribe(input) {
    const subscription = new RpcSubscription(input);
    __privateGet(this, _subscriptions).add(subscription);
    await subscription.subscribe(this);
    return () => subscription.unsubscribe(this);
  }
};
_requestId = /* @__PURE__ */ new WeakMap();
_disconnects = /* @__PURE__ */ new WeakMap();
_webSocket = /* @__PURE__ */ new WeakMap();
_connectionPromise = /* @__PURE__ */ new WeakMap();
_subscriptions = /* @__PURE__ */ new WeakMap();
_pendingRequests = /* @__PURE__ */ new WeakMap();
_WebsocketClient_instances = /* @__PURE__ */ new WeakSet();
setupWebSocket_fn = function() {
  if (__privateGet(this, _connectionPromise)) {
    return __privateGet(this, _connectionPromise);
  }
  __privateSet(this, _connectionPromise, new Promise((resolve) => {
    __privateGet(this, _webSocket)?.close();
    __privateSet(this, _webSocket, new this.options.WebSocketConstructor(this.endpoint));
    __privateGet(this, _webSocket).addEventListener("open", () => {
      __privateSet(this, _disconnects, 0);
      resolve(__privateGet(this, _webSocket));
    });
    __privateGet(this, _webSocket).addEventListener("close", () => {
      __privateWrapper(this, _disconnects)._++;
      if (__privateGet(this, _disconnects) <= this.options.maxReconnects) {
        setTimeout(() => {
          __privateMethod(this, _WebsocketClient_instances, reconnect_fn).call(this);
        }, this.options.reconnectTimeout);
      }
    });
    __privateGet(this, _webSocket).addEventListener("message", ({ data: data2 }) => {
      let json;
      try {
        json = JSON.parse(data2);
      } catch (error) {
        console.error(new Error(`Failed to parse RPC message: ${data2}`, { cause: error }));
        return;
      }
      if ("id" in json && json.id != null && __privateGet(this, _pendingRequests).has(json.id)) {
        const { resolve: resolve2, timeout } = __privateGet(this, _pendingRequests).get(json.id);
        clearTimeout(timeout);
        resolve2(json);
      } else if ("params" in json) {
        const { params } = json;
        __privateGet(this, _subscriptions).forEach((subscription) => {
          if (subscription.subscriptionId === params.subscription) {
            if (params.subscription === subscription.subscriptionId) {
              subscription.onMessage(params.result);
            }
          }
        });
      }
    });
  }));
  return __privateGet(this, _connectionPromise);
};
reconnect_fn = async function() {
  __privateGet(this, _webSocket)?.close();
  __privateSet(this, _connectionPromise, null);
  return Promise.allSettled(
    [...__privateGet(this, _subscriptions)].map((subscription) => subscription.subscribe(this))
  );
};
var RpcSubscription = class {
  constructor(input) {
    this.subscriptionId = null;
    this.subscribed = false;
    this.input = input;
  }
  onMessage(message) {
    if (this.subscribed) {
      this.input.onMessage(message);
    }
  }
  async unsubscribe(client2) {
    const { subscriptionId } = this;
    this.subscribed = false;
    if (subscriptionId == null) return false;
    this.subscriptionId = null;
    return client2.makeRequest(this.input.unsubscribe, [subscriptionId]);
  }
  async subscribe(client2) {
    this.subscriptionId = null;
    this.subscribed = true;
    const newSubscriptionId = await client2.makeRequest(
      this.input.method,
      this.input.params
    );
    if (this.subscribed) {
      this.subscriptionId = newSubscriptionId;
    }
  }
};

// ../../node_modules/@mysten/sui/dist/esm/client/http-transport.js
var __typeError2 = (msg) => {
  throw TypeError(msg);
};
var __accessCheck2 = (obj, member, msg) => member.has(obj) || __typeError2("Cannot " + msg);
var __privateGet2 = (obj, member, getter) => (__accessCheck2(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd2 = (obj, member, value) => member.has(obj) ? __typeError2("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet2 = (obj, member, value, setter) => (__accessCheck2(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod2 = (obj, member, method) => (__accessCheck2(obj, member, "access private method"), method);
var _requestId2;
var _options;
var _websocketClient;
var _SuiHTTPTransport_instances;
var getWebsocketClient_fn;
var SuiHTTPTransport = class {
  constructor(options) {
    __privateAdd2(this, _SuiHTTPTransport_instances);
    __privateAdd2(this, _requestId2, 0);
    __privateAdd2(this, _options);
    __privateAdd2(this, _websocketClient);
    __privateSet2(this, _options, options);
  }
  fetch(input, init) {
    const fetchFn = __privateGet2(this, _options).fetch ?? fetch;
    if (!fetchFn) {
      throw new Error(
        "The current environment does not support fetch, you can provide a fetch implementation in the options for SuiHTTPTransport."
      );
    }
    return fetchFn(input, init);
  }
  async request(input) {
    __privateSet2(this, _requestId2, __privateGet2(this, _requestId2) + 1);
    const res = await this.fetch(__privateGet2(this, _options).rpc?.url ?? __privateGet2(this, _options).url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Sdk-Type": "typescript",
        "Client-Sdk-Version": PACKAGE_VERSION,
        "Client-Target-Api-Version": TARGETED_RPC_VERSION,
        "Client-Request-Method": input.method,
        ...__privateGet2(this, _options).rpc?.headers
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: __privateGet2(this, _requestId2),
        method: input.method,
        params: input.params
      })
    });
    if (!res.ok) {
      throw new SuiHTTPStatusError(
        `Unexpected status code: ${res.status}`,
        res.status,
        res.statusText
      );
    }
    const data2 = await res.json();
    if ("error" in data2 && data2.error != null) {
      throw new JsonRpcError(data2.error.message, data2.error.code);
    }
    return data2.result;
  }
  async subscribe(input) {
    const unsubscribe = await __privateMethod2(this, _SuiHTTPTransport_instances, getWebsocketClient_fn).call(this).subscribe(input);
    return async () => !!await unsubscribe();
  }
};
_requestId2 = /* @__PURE__ */ new WeakMap();
_options = /* @__PURE__ */ new WeakMap();
_websocketClient = /* @__PURE__ */ new WeakMap();
_SuiHTTPTransport_instances = /* @__PURE__ */ new WeakSet();
getWebsocketClient_fn = function() {
  if (!__privateGet2(this, _websocketClient)) {
    const WebSocketConstructor = __privateGet2(this, _options).WebSocketConstructor ?? WebSocket;
    if (!WebSocketConstructor) {
      throw new Error(
        "The current environment does not support WebSocket, you can provide a WebSocketConstructor in the options for SuiHTTPTransport."
      );
    }
    __privateSet2(this, _websocketClient, new WebsocketClient(
      __privateGet2(this, _options).websocket?.url ?? __privateGet2(this, _options).url,
      {
        WebSocketConstructor,
        ...__privateGet2(this, _options).websocket
      }
    ));
  }
  return __privateGet2(this, _websocketClient);
};

// ../../node_modules/@mysten/sui/dist/esm/client/network.js
function getFullnodeUrl(network) {
  switch (network) {
    case "mainnet":
      return "https://fullnode.mainnet.sui.io:443";
    case "testnet":
      return "https://fullnode.testnet.sui.io:443";
    case "devnet":
      return "https://fullnode.devnet.sui.io:443";
    case "localnet":
      return "http://127.0.0.1:9000";
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}

// ../../node_modules/@mysten/bcs/dist/esm/b58.js
import bs58 from "bs58";
var toBase58 = (buffer) => bs58.encode(buffer);
var fromBase58 = (str) => bs58.decode(str);

// ../../node_modules/@mysten/bcs/dist/esm/b64.js
function fromBase64(base64String2) {
  return Uint8Array.from(atob(base64String2), (char) => char.charCodeAt(0));
}
var CHUNK_SIZE = 8192;
function toBase64(bytes) {
  if (bytes.length < CHUNK_SIZE) {
    return btoa(String.fromCharCode(...bytes));
  }
  let output = "";
  for (var i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk2 = bytes.slice(i, i + CHUNK_SIZE);
    output += String.fromCharCode(...chunk2);
  }
  return btoa(output);
}

// ../../node_modules/@mysten/bcs/dist/esm/hex.js
function fromHex(hexStr) {
  const normalized = hexStr.startsWith("0x") ? hexStr.slice(2) : hexStr;
  const padded = normalized.length % 2 === 0 ? normalized : `0${normalized}`;
  const intArr = padded.match(/[0-9a-fA-F]{2}/g)?.map((byte) => parseInt(byte, 16)) ?? [];
  if (intArr.length !== padded.length / 2) {
    throw new Error(`Invalid hex string ${hexStr}`);
  }
  return Uint8Array.from(intArr);
}
function toHex(bytes) {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, "0"), "");
}

// ../../node_modules/@mysten/bcs/dist/esm/uleb.js
function ulebEncode(num) {
  let arr = [];
  let len = 0;
  if (num === 0) {
    return [0];
  }
  while (num > 0) {
    arr[len] = num & 127;
    if (num >>= 7) {
      arr[len] |= 128;
    }
    len += 1;
  }
  return arr;
}
function ulebDecode(arr) {
  let total = 0;
  let shift = 0;
  let len = 0;
  while (true) {
    let byte = arr[len];
    len += 1;
    total |= (byte & 127) << shift;
    if ((byte & 128) === 0) {
      break;
    }
    shift += 7;
  }
  return {
    value: total,
    length: len
  };
}

// ../../node_modules/@mysten/bcs/dist/esm/reader.js
var BcsReader = class {
  /**
   * @param {Uint8Array} data Data to use as a buffer.
   */
  constructor(data2) {
    this.bytePosition = 0;
    this.dataView = new DataView(data2.buffer);
  }
  /**
   * Shift current cursor position by `bytes`.
   *
   * @param {Number} bytes Number of bytes to
   * @returns {this} Self for possible chaining.
   */
  shift(bytes) {
    this.bytePosition += bytes;
    return this;
  }
  /**
   * Read U8 value from the buffer and shift cursor by 1.
   * @returns
   */
  read8() {
    let value = this.dataView.getUint8(this.bytePosition);
    this.shift(1);
    return value;
  }
  /**
   * Read U16 value from the buffer and shift cursor by 2.
   * @returns
   */
  read16() {
    let value = this.dataView.getUint16(this.bytePosition, true);
    this.shift(2);
    return value;
  }
  /**
   * Read U32 value from the buffer and shift cursor by 4.
   * @returns
   */
  read32() {
    let value = this.dataView.getUint32(this.bytePosition, true);
    this.shift(4);
    return value;
  }
  /**
   * Read U64 value from the buffer and shift cursor by 8.
   * @returns
   */
  read64() {
    let value1 = this.read32();
    let value2 = this.read32();
    let result = value2.toString(16) + value1.toString(16).padStart(8, "0");
    return BigInt("0x" + result).toString(10);
  }
  /**
   * Read U128 value from the buffer and shift cursor by 16.
   */
  read128() {
    let value1 = BigInt(this.read64());
    let value2 = BigInt(this.read64());
    let result = value2.toString(16) + value1.toString(16).padStart(16, "0");
    return BigInt("0x" + result).toString(10);
  }
  /**
   * Read U128 value from the buffer and shift cursor by 32.
   * @returns
   */
  read256() {
    let value1 = BigInt(this.read128());
    let value2 = BigInt(this.read128());
    let result = value2.toString(16) + value1.toString(16).padStart(32, "0");
    return BigInt("0x" + result).toString(10);
  }
  /**
   * Read `num` number of bytes from the buffer and shift cursor by `num`.
   * @param num Number of bytes to read.
   */
  readBytes(num) {
    let start = this.bytePosition + this.dataView.byteOffset;
    let value = new Uint8Array(this.dataView.buffer, start, num);
    this.shift(num);
    return value;
  }
  /**
   * Read ULEB value - an integer of varying size. Used for enum indexes and
   * vector lengths.
   * @returns {Number} The ULEB value.
   */
  readULEB() {
    let start = this.bytePosition + this.dataView.byteOffset;
    let buffer = new Uint8Array(this.dataView.buffer, start);
    let { value, length } = ulebDecode(buffer);
    this.shift(length);
    return value;
  }
  /**
   * Read a BCS vector: read a length and then apply function `cb` X times
   * where X is the length of the vector, defined as ULEB in BCS bytes.
   * @param cb Callback to process elements of vector.
   * @returns {Array<Any>} Array of the resulting values, returned by callback.
   */
  readVec(cb) {
    let length = this.readULEB();
    let result = [];
    for (let i = 0; i < length; i++) {
      result.push(cb(this, i, length));
    }
    return result;
  }
};

// ../../node_modules/@mysten/bcs/dist/esm/utils.js
function encodeStr(data2, encoding) {
  switch (encoding) {
    case "base58":
      return toBase58(data2);
    case "base64":
      return toBase64(data2);
    case "hex":
      return toHex(data2);
    default:
      throw new Error("Unsupported encoding, supported values are: base64, hex");
  }
}
function splitGenericParameters(str, genericSeparators = ["<", ">"]) {
  const [left, right] = genericSeparators;
  const tok = [];
  let word = "";
  let nestedAngleBrackets = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === left) {
      nestedAngleBrackets++;
    }
    if (char === right) {
      nestedAngleBrackets--;
    }
    if (nestedAngleBrackets === 0 && char === ",") {
      tok.push(word.trim());
      word = "";
      continue;
    }
    word += char;
  }
  tok.push(word.trim());
  return tok;
}

// ../../node_modules/@mysten/bcs/dist/esm/writer.js
var BcsWriter = class {
  constructor({
    initialSize = 1024,
    maxSize = Infinity,
    allocateSize = 1024
  } = {}) {
    this.bytePosition = 0;
    this.size = initialSize;
    this.maxSize = maxSize;
    this.allocateSize = allocateSize;
    this.dataView = new DataView(new ArrayBuffer(initialSize));
  }
  ensureSizeOrGrow(bytes) {
    const requiredSize = this.bytePosition + bytes;
    if (requiredSize > this.size) {
      const nextSize = Math.min(this.maxSize, this.size + this.allocateSize);
      if (requiredSize > nextSize) {
        throw new Error(
          `Attempting to serialize to BCS, but buffer does not have enough size. Allocated size: ${this.size}, Max size: ${this.maxSize}, Required size: ${requiredSize}`
        );
      }
      this.size = nextSize;
      const nextBuffer = new ArrayBuffer(this.size);
      new Uint8Array(nextBuffer).set(new Uint8Array(this.dataView.buffer));
      this.dataView = new DataView(nextBuffer);
    }
  }
  /**
   * Shift current cursor position by `bytes`.
   *
   * @param {Number} bytes Number of bytes to
   * @returns {this} Self for possible chaining.
   */
  shift(bytes) {
    this.bytePosition += bytes;
    return this;
  }
  /**
   * Write a U8 value into a buffer and shift cursor position by 1.
   * @param {Number} value Value to write.
   * @returns {this}
   */
  write8(value) {
    this.ensureSizeOrGrow(1);
    this.dataView.setUint8(this.bytePosition, Number(value));
    return this.shift(1);
  }
  /**
   * Write a U16 value into a buffer and shift cursor position by 2.
   * @param {Number} value Value to write.
   * @returns {this}
   */
  write16(value) {
    this.ensureSizeOrGrow(2);
    this.dataView.setUint16(this.bytePosition, Number(value), true);
    return this.shift(2);
  }
  /**
   * Write a U32 value into a buffer and shift cursor position by 4.
   * @param {Number} value Value to write.
   * @returns {this}
   */
  write32(value) {
    this.ensureSizeOrGrow(4);
    this.dataView.setUint32(this.bytePosition, Number(value), true);
    return this.shift(4);
  }
  /**
   * Write a U64 value into a buffer and shift cursor position by 8.
   * @param {bigint} value Value to write.
   * @returns {this}
   */
  write64(value) {
    toLittleEndian(BigInt(value), 8).forEach((el) => this.write8(el));
    return this;
  }
  /**
   * Write a U128 value into a buffer and shift cursor position by 16.
   *
   * @param {bigint} value Value to write.
   * @returns {this}
   */
  write128(value) {
    toLittleEndian(BigInt(value), 16).forEach((el) => this.write8(el));
    return this;
  }
  /**
   * Write a U256 value into a buffer and shift cursor position by 16.
   *
   * @param {bigint} value Value to write.
   * @returns {this}
   */
  write256(value) {
    toLittleEndian(BigInt(value), 32).forEach((el) => this.write8(el));
    return this;
  }
  /**
   * Write a ULEB value into a buffer and shift cursor position by number of bytes
   * written.
   * @param {Number} value Value to write.
   * @returns {this}
   */
  writeULEB(value) {
    ulebEncode(value).forEach((el) => this.write8(el));
    return this;
  }
  /**
   * Write a vector into a buffer by first writing the vector length and then calling
   * a callback on each passed value.
   *
   * @param {Array<Any>} vector Array of elements to write.
   * @param {WriteVecCb} cb Callback to call on each element of the vector.
   * @returns {this}
   */
  writeVec(vector, cb) {
    this.writeULEB(vector.length);
    Array.from(vector).forEach((el, i) => cb(this, el, i, vector.length));
    return this;
  }
  /**
   * Adds support for iterations over the object.
   * @returns {Uint8Array}
   */
  *[Symbol.iterator]() {
    for (let i = 0; i < this.bytePosition; i++) {
      yield this.dataView.getUint8(i);
    }
    return this.toBytes();
  }
  /**
   * Get underlying buffer taking only value bytes (in case initial buffer size was bigger).
   * @returns {Uint8Array} Resulting bcs.
   */
  toBytes() {
    return new Uint8Array(this.dataView.buffer.slice(0, this.bytePosition));
  }
  /**
   * Represent data as 'hex' or 'base64'
   * @param encoding Encoding to use: 'base64' or 'hex'
   */
  toString(encoding) {
    return encodeStr(this.toBytes(), encoding);
  }
};
function toLittleEndian(bigint2, size) {
  let result = new Uint8Array(size);
  let i = 0;
  while (bigint2 > 0) {
    result[i] = Number(bigint2 % BigInt(256));
    bigint2 = bigint2 / BigInt(256);
    i += 1;
  }
  return result;
}

// ../../node_modules/@mysten/bcs/dist/esm/bcs-type.js
var __typeError3 = (msg) => {
  throw TypeError(msg);
};
var __accessCheck3 = (obj, member, msg) => member.has(obj) || __typeError3("Cannot " + msg);
var __privateGet3 = (obj, member, getter) => (__accessCheck3(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd3 = (obj, member, value) => member.has(obj) ? __typeError3("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet3 = (obj, member, value, setter) => (__accessCheck3(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var _write;
var _serialize;
var _schema;
var _bytes;
var _BcsType = class _BcsType2 {
  constructor(options) {
    __privateAdd3(this, _write);
    __privateAdd3(this, _serialize);
    this.name = options.name;
    this.read = options.read;
    this.serializedSize = options.serializedSize ?? (() => null);
    __privateSet3(this, _write, options.write);
    __privateSet3(this, _serialize, options.serialize ?? ((value, options2) => {
      const writer = new BcsWriter({
        initialSize: this.serializedSize(value) ?? void 0,
        ...options2
      });
      __privateGet3(this, _write).call(this, value, writer);
      return writer.toBytes();
    }));
    this.validate = options.validate ?? (() => {
    });
  }
  write(value, writer) {
    this.validate(value);
    __privateGet3(this, _write).call(this, value, writer);
  }
  serialize(value, options) {
    this.validate(value);
    return new SerializedBcs(this, __privateGet3(this, _serialize).call(this, value, options));
  }
  parse(bytes) {
    const reader = new BcsReader(bytes);
    return this.read(reader);
  }
  fromHex(hex) {
    return this.parse(fromHex(hex));
  }
  fromBase58(b64) {
    return this.parse(fromBase58(b64));
  }
  fromBase64(b64) {
    return this.parse(fromBase64(b64));
  }
  transform({
    name,
    input,
    output,
    validate: validate2
  }) {
    return new _BcsType2({
      name: name ?? this.name,
      read: (reader) => output(this.read(reader)),
      write: (value, writer) => __privateGet3(this, _write).call(this, input(value), writer),
      serializedSize: (value) => this.serializedSize(input(value)),
      serialize: (value, options) => __privateGet3(this, _serialize).call(this, input(value), options),
      validate: (value) => {
        validate2?.(value);
        this.validate(input(value));
      }
    });
  }
};
_write = /* @__PURE__ */ new WeakMap();
_serialize = /* @__PURE__ */ new WeakMap();
var BcsType = _BcsType;
var SERIALIZED_BCS_BRAND = Symbol.for("@mysten/serialized-bcs");
function isSerializedBcs(obj) {
  return !!obj && typeof obj === "object" && obj[SERIALIZED_BCS_BRAND] === true;
}
var SerializedBcs = class {
  constructor(type, schema) {
    __privateAdd3(this, _schema);
    __privateAdd3(this, _bytes);
    __privateSet3(this, _schema, type);
    __privateSet3(this, _bytes, schema);
  }
  // Used to brand SerializedBcs so that they can be identified, even between multiple copies
  // of the @mysten/bcs package are installed
  get [SERIALIZED_BCS_BRAND]() {
    return true;
  }
  toBytes() {
    return __privateGet3(this, _bytes);
  }
  toHex() {
    return toHex(__privateGet3(this, _bytes));
  }
  toBase64() {
    return toBase64(__privateGet3(this, _bytes));
  }
  toBase58() {
    return toBase58(__privateGet3(this, _bytes));
  }
  parse() {
    return __privateGet3(this, _schema).parse(__privateGet3(this, _bytes));
  }
};
_schema = /* @__PURE__ */ new WeakMap();
_bytes = /* @__PURE__ */ new WeakMap();
function fixedSizeBcsType({
  size,
  ...options
}) {
  return new BcsType({
    ...options,
    serializedSize: () => size
  });
}
function uIntBcsType({
  readMethod,
  writeMethod,
  ...options
}) {
  return fixedSizeBcsType({
    ...options,
    read: (reader) => reader[readMethod](),
    write: (value, writer) => writer[writeMethod](value),
    validate: (value) => {
      if (value < 0 || value > options.maxValue) {
        throw new TypeError(
          `Invalid ${options.name} value: ${value}. Expected value in range 0-${options.maxValue}`
        );
      }
      options.validate?.(value);
    }
  });
}
function bigUIntBcsType({
  readMethod,
  writeMethod,
  ...options
}) {
  return fixedSizeBcsType({
    ...options,
    read: (reader) => reader[readMethod](),
    write: (value, writer) => writer[writeMethod](BigInt(value)),
    validate: (val) => {
      const value = BigInt(val);
      if (value < 0 || value > options.maxValue) {
        throw new TypeError(
          `Invalid ${options.name} value: ${value}. Expected value in range 0-${options.maxValue}`
        );
      }
      options.validate?.(value);
    }
  });
}
function dynamicSizeBcsType({
  serialize,
  ...options
}) {
  const type = new BcsType({
    ...options,
    serialize,
    write: (value, writer) => {
      for (const byte of type.serialize(value).toBytes()) {
        writer.write8(byte);
      }
    }
  });
  return type;
}
function stringLikeBcsType({
  toBytes: toBytes2,
  fromBytes,
  ...options
}) {
  return new BcsType({
    ...options,
    read: (reader) => {
      const length = reader.readULEB();
      const bytes = reader.readBytes(length);
      return fromBytes(bytes);
    },
    write: (hex, writer) => {
      const bytes = toBytes2(hex);
      writer.writeULEB(bytes.length);
      for (let i = 0; i < bytes.length; i++) {
        writer.write8(bytes[i]);
      }
    },
    serialize: (value) => {
      const bytes = toBytes2(value);
      const size = ulebEncode(bytes.length);
      const result = new Uint8Array(size.length + bytes.length);
      result.set(size, 0);
      result.set(bytes, size.length);
      return result;
    },
    validate: (value) => {
      if (typeof value !== "string") {
        throw new TypeError(`Invalid ${options.name} value: ${value}. Expected string`);
      }
      options.validate?.(value);
    }
  });
}
function lazyBcsType(cb) {
  let lazyType2 = null;
  function getType() {
    if (!lazyType2) {
      lazyType2 = cb();
    }
    return lazyType2;
  }
  return new BcsType({
    name: "lazy",
    read: (data2) => getType().read(data2),
    serializedSize: (value) => getType().serializedSize(value),
    write: (value, writer) => getType().write(value, writer),
    serialize: (value, options) => getType().serialize(value, options).toBytes()
  });
}

// ../../node_modules/@mysten/bcs/dist/esm/bcs.js
var bcs = {
  /**
   * Creates a BcsType that can be used to read and write an 8-bit unsigned integer.
   * @example
   * bcs.u8().serialize(255).toBytes() // Uint8Array [ 255 ]
   */
  u8(options) {
    return uIntBcsType({
      name: "u8",
      readMethod: "read8",
      writeMethod: "write8",
      size: 1,
      maxValue: 2 ** 8 - 1,
      ...options
    });
  },
  /**
   * Creates a BcsType that can be used to read and write a 16-bit unsigned integer.
   * @example
   * bcs.u16().serialize(65535).toBytes() // Uint8Array [ 255, 255 ]
   */
  u16(options) {
    return uIntBcsType({
      name: "u16",
      readMethod: "read16",
      writeMethod: "write16",
      size: 2,
      maxValue: 2 ** 16 - 1,
      ...options
    });
  },
  /**
   * Creates a BcsType that can be used to read and write a 32-bit unsigned integer.
   * @example
   * bcs.u32().serialize(4294967295).toBytes() // Uint8Array [ 255, 255, 255, 255 ]
   */
  u32(options) {
    return uIntBcsType({
      name: "u32",
      readMethod: "read32",
      writeMethod: "write32",
      size: 4,
      maxValue: 2 ** 32 - 1,
      ...options
    });
  },
  /**
   * Creates a BcsType that can be used to read and write a 64-bit unsigned integer.
   * @example
   * bcs.u64().serialize(1).toBytes() // Uint8Array [ 1, 0, 0, 0, 0, 0, 0, 0 ]
   */
  u64(options) {
    return bigUIntBcsType({
      name: "u64",
      readMethod: "read64",
      writeMethod: "write64",
      size: 8,
      maxValue: 2n ** 64n - 1n,
      ...options
    });
  },
  /**
   * Creates a BcsType that can be used to read and write a 128-bit unsigned integer.
   * @example
   * bcs.u128().serialize(1).toBytes() // Uint8Array [ 1, ..., 0 ]
   */
  u128(options) {
    return bigUIntBcsType({
      name: "u128",
      readMethod: "read128",
      writeMethod: "write128",
      size: 16,
      maxValue: 2n ** 128n - 1n,
      ...options
    });
  },
  /**
   * Creates a BcsType that can be used to read and write a 256-bit unsigned integer.
   * @example
   * bcs.u256().serialize(1).toBytes() // Uint8Array [ 1, ..., 0 ]
   */
  u256(options) {
    return bigUIntBcsType({
      name: "u256",
      readMethod: "read256",
      writeMethod: "write256",
      size: 32,
      maxValue: 2n ** 256n - 1n,
      ...options
    });
  },
  /**
   * Creates a BcsType that can be used to read and write boolean values.
   * @example
   * bcs.bool().serialize(true).toBytes() // Uint8Array [ 1 ]
   */
  bool(options) {
    return fixedSizeBcsType({
      name: "bool",
      size: 1,
      read: (reader) => reader.read8() === 1,
      write: (value, writer) => writer.write8(value ? 1 : 0),
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (typeof value !== "boolean") {
          throw new TypeError(`Expected boolean, found ${typeof value}`);
        }
      }
    });
  },
  /**
   * Creates a BcsType that can be used to read and write unsigned LEB encoded integers
   * @example
   *
   */
  uleb128(options) {
    return dynamicSizeBcsType({
      name: "uleb128",
      read: (reader) => reader.readULEB(),
      serialize: (value) => {
        return Uint8Array.from(ulebEncode(value));
      },
      ...options
    });
  },
  /**
   * Creates a BcsType representing a fixed length byte array
   * @param size The number of bytes this types represents
   * @example
   * bcs.bytes(3).serialize(new Uint8Array([1, 2, 3])).toBytes() // Uint8Array [1, 2, 3]
   */
  bytes(size, options) {
    return fixedSizeBcsType({
      name: `bytes[${size}]`,
      size,
      read: (reader) => reader.readBytes(size),
      write: (value, writer) => {
        const array2 = new Uint8Array(value);
        for (let i = 0; i < size; i++) {
          writer.write8(array2[i] ?? 0);
        }
      },
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (!value || typeof value !== "object" || !("length" in value)) {
          throw new TypeError(`Expected array, found ${typeof value}`);
        }
        if (value.length !== size) {
          throw new TypeError(`Expected array of length ${size}, found ${value.length}`);
        }
      }
    });
  },
  /**
   * Creates a BcsType that can ser/de string values.  Strings will be UTF-8 encoded
   * @example
   * bcs.string().serialize('a').toBytes() // Uint8Array [ 1, 97 ]
   */
  string(options) {
    return stringLikeBcsType({
      name: "string",
      toBytes: (value) => new TextEncoder().encode(value),
      fromBytes: (bytes) => new TextDecoder().decode(bytes),
      ...options
    });
  },
  /**
   * Creates a BcsType that represents a fixed length array of a given type
   * @param size The number of elements in the array
   * @param type The BcsType of each element in the array
   * @example
   * bcs.fixedArray(3, bcs.u8()).serialize([1, 2, 3]).toBytes() // Uint8Array [ 1, 2, 3 ]
   */
  fixedArray(size, type, options) {
    return new BcsType({
      name: `${type.name}[${size}]`,
      read: (reader) => {
        const result = new Array(size);
        for (let i = 0; i < size; i++) {
          result[i] = type.read(reader);
        }
        return result;
      },
      write: (value, writer) => {
        for (const item of value) {
          type.write(item, writer);
        }
      },
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (!value || typeof value !== "object" || !("length" in value)) {
          throw new TypeError(`Expected array, found ${typeof value}`);
        }
        if (value.length !== size) {
          throw new TypeError(`Expected array of length ${size}, found ${value.length}`);
        }
      }
    });
  },
  /**
   * Creates a BcsType representing an optional value
   * @param type The BcsType of the optional value
   * @example
   * bcs.option(bcs.u8()).serialize(null).toBytes() // Uint8Array [ 0 ]
   * bcs.option(bcs.u8()).serialize(1).toBytes() // Uint8Array [ 1, 1 ]
   */
  option(type) {
    return bcs.enum(`Option<${type.name}>`, {
      None: null,
      Some: type
    }).transform({
      input: (value) => {
        if (value == null) {
          return { None: true };
        }
        return { Some: value };
      },
      output: (value) => {
        if (value.$kind === "Some") {
          return value.Some;
        }
        return null;
      }
    });
  },
  /**
   * Creates a BcsType representing a variable length vector of a given type
   * @param type The BcsType of each element in the vector
   *
   * @example
   * bcs.vector(bcs.u8()).toBytes([1, 2, 3]) // Uint8Array [ 3, 1, 2, 3 ]
   */
  vector(type, options) {
    return new BcsType({
      name: `vector<${type.name}>`,
      read: (reader) => {
        const length = reader.readULEB();
        const result = new Array(length);
        for (let i = 0; i < length; i++) {
          result[i] = type.read(reader);
        }
        return result;
      },
      write: (value, writer) => {
        writer.writeULEB(value.length);
        for (const item of value) {
          type.write(item, writer);
        }
      },
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (!value || typeof value !== "object" || !("length" in value)) {
          throw new TypeError(`Expected array, found ${typeof value}`);
        }
      }
    });
  },
  /**
   * Creates a BcsType representing a tuple of a given set of types
   * @param types The BcsTypes for each element in the tuple
   *
   * @example
   * const tuple = bcs.tuple([bcs.u8(), bcs.string(), bcs.bool()])
   * tuple.serialize([1, 'a', true]).toBytes() // Uint8Array [ 1, 1, 97, 1 ]
   */
  tuple(types, options) {
    return new BcsType({
      name: `(${types.map((t) => t.name).join(", ")})`,
      serializedSize: (values) => {
        let total = 0;
        for (let i = 0; i < types.length; i++) {
          const size = types[i].serializedSize(values[i]);
          if (size == null) {
            return null;
          }
          total += size;
        }
        return total;
      },
      read: (reader) => {
        const result = [];
        for (const type of types) {
          result.push(type.read(reader));
        }
        return result;
      },
      write: (value, writer) => {
        for (let i = 0; i < types.length; i++) {
          types[i].write(value[i], writer);
        }
      },
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (!Array.isArray(value)) {
          throw new TypeError(`Expected array, found ${typeof value}`);
        }
        if (value.length !== types.length) {
          throw new TypeError(`Expected array of length ${types.length}, found ${value.length}`);
        }
      }
    });
  },
  /**
   * Creates a BcsType representing a struct of a given set of fields
   * @param name The name of the struct
   * @param fields The fields of the struct. The order of the fields affects how data is serialized and deserialized
   *
   * @example
   * const struct = bcs.struct('MyStruct', {
   *  a: bcs.u8(),
   *  b: bcs.string(),
   * })
   * struct.serialize({ a: 1, b: 'a' }).toBytes() // Uint8Array [ 1, 1, 97 ]
   */
  struct(name, fields, options) {
    const canonicalOrder = Object.entries(fields);
    return new BcsType({
      name,
      serializedSize: (values) => {
        let total = 0;
        for (const [field, type] of canonicalOrder) {
          const size = type.serializedSize(values[field]);
          if (size == null) {
            return null;
          }
          total += size;
        }
        return total;
      },
      read: (reader) => {
        const result = {};
        for (const [field, type] of canonicalOrder) {
          result[field] = type.read(reader);
        }
        return result;
      },
      write: (value, writer) => {
        for (const [field, type] of canonicalOrder) {
          type.write(value[field], writer);
        }
      },
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (typeof value !== "object" || value == null) {
          throw new TypeError(`Expected object, found ${typeof value}`);
        }
      }
    });
  },
  /**
   * Creates a BcsType representing an enum of a given set of options
   * @param name The name of the enum
   * @param values The values of the enum. The order of the values affects how data is serialized and deserialized.
   * null can be used to represent a variant with no data.
   *
   * @example
   * const enum = bcs.enum('MyEnum', {
   *   A: bcs.u8(),
   *   B: bcs.string(),
   *   C: null,
   * })
   * enum.serialize({ A: 1 }).toBytes() // Uint8Array [ 0, 1 ]
   * enum.serialize({ B: 'a' }).toBytes() // Uint8Array [ 1, 1, 97 ]
   * enum.serialize({ C: true }).toBytes() // Uint8Array [ 2 ]
   */
  enum(name, values, options) {
    const canonicalOrder = Object.entries(values);
    return new BcsType({
      name,
      read: (reader) => {
        const index = reader.readULEB();
        const enumEntry = canonicalOrder[index];
        if (!enumEntry) {
          throw new TypeError(`Unknown value ${index} for enum ${name}`);
        }
        const [kind, type] = enumEntry;
        return {
          [kind]: type?.read(reader) ?? true,
          $kind: kind
        };
      },
      write: (value, writer) => {
        const [name2, val] = Object.entries(value).filter(
          ([name3]) => Object.hasOwn(values, name3)
        )[0];
        for (let i = 0; i < canonicalOrder.length; i++) {
          const [optionName, optionType] = canonicalOrder[i];
          if (optionName === name2) {
            writer.writeULEB(i);
            optionType?.write(val, writer);
            return;
          }
        }
      },
      ...options,
      validate: (value) => {
        options?.validate?.(value);
        if (typeof value !== "object" || value == null) {
          throw new TypeError(`Expected object, found ${typeof value}`);
        }
        const keys = Object.keys(value).filter(
          (k) => value[k] !== void 0 && Object.hasOwn(values, k)
        );
        if (keys.length !== 1) {
          throw new TypeError(
            `Expected object with one key, but found ${keys.length} for type ${name}}`
          );
        }
        const [variant] = keys;
        if (!Object.hasOwn(values, variant)) {
          throw new TypeError(`Invalid enum variant ${variant}`);
        }
      }
    });
  },
  /**
   * Creates a BcsType representing a map of a given key and value type
   * @param keyType The BcsType of the key
   * @param valueType The BcsType of the value
   * @example
   * const map = bcs.map(bcs.u8(), bcs.string())
   * map.serialize(new Map([[2, 'a']])).toBytes() // Uint8Array [ 1, 2, 1, 97 ]
   */
  map(keyType, valueType) {
    return bcs.vector(bcs.tuple([keyType, valueType])).transform({
      name: `Map<${keyType.name}, ${valueType.name}>`,
      input: (value) => {
        return [...value.entries()];
      },
      output: (value) => {
        const result = /* @__PURE__ */ new Map();
        for (const [key, val] of value) {
          result.set(key, val);
        }
        return result;
      }
    });
  },
  /**
   * Creates a BcsType that wraps another BcsType which is lazily evaluated. This is useful for creating recursive types.
   * @param cb A callback that returns the BcsType
   */
  lazy(cb) {
    return lazyBcsType(cb);
  }
};

// ../../node_modules/@mysten/sui/dist/esm/utils/sui-types.js
var TX_DIGEST_LENGTH = 32;
function isValidTransactionDigest(value) {
  try {
    const buffer = fromBase58(value);
    return buffer.length === TX_DIGEST_LENGTH;
  } catch (e) {
    return false;
  }
}
var SUI_ADDRESS_LENGTH = 32;
function isValidSuiAddress(value) {
  return isHex(value) && getHexByteLength(value) === SUI_ADDRESS_LENGTH;
}
function isValidSuiObjectId(value) {
  return isValidSuiAddress(value);
}
function normalizeSuiAddress(value, forceAdd0x = false) {
  let address = value.toLowerCase();
  if (!forceAdd0x && address.startsWith("0x")) {
    address = address.slice(2);
  }
  return `0x${address.padStart(SUI_ADDRESS_LENGTH * 2, "0")}`;
}
function normalizeSuiObjectId(value, forceAdd0x = false) {
  return normalizeSuiAddress(value, forceAdd0x);
}
function isHex(value) {
  return /^(0x|0X)?[a-fA-F0-9]+$/.test(value) && value.length % 2 === 0;
}
function getHexByteLength(value) {
  return /^(0x|0X)/.test(value) ? (value.length - 2) / 2 : value.length / 2;
}

// ../../node_modules/@mysten/sui/dist/esm/bcs/type-tag-serializer.js
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
    return splitGenericParameters(str).map(
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
function optionEnum(type) {
  return bcs.enum("Option", {
    None: null,
    Some: type
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
  input: (value) => fromBase58(value),
  output: (value) => toBase58(new Uint8Array(value)),
  validate: (value) => {
    if (fromBase58(value).length !== 32) {
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
var PackageUpgradeError = bcs.enum("PackageUpgradeError", {
  UnableToFetchPackage: bcs.struct("UnableToFetchPackage", { packageId: Address }),
  NotAPackage: bcs.struct("NotAPackage", { objectId: Address }),
  IncompatibleUpgrade: null,
  DigestDoesNotMatch: bcs.struct("DigestDoesNotMatch", { digest: bcs.vector(bcs.u8()) }),
  UnknownUpgradePolicy: bcs.struct("UnknownUpgradePolicy", { policy: bcs.u8() }),
  PackageIDDoesNotMatch: bcs.struct("PackageIDDoesNotMatch", {
    packageId: Address,
    ticketId: Address
  })
});
var ModuleId = bcs.struct("ModuleId", {
  address: Address,
  name: bcs.string()
});
var MoveLocation = bcs.struct("MoveLocation", {
  module: ModuleId,
  function: bcs.u16(),
  instruction: bcs.u16(),
  functionName: bcs.option(bcs.string())
});
var CommandArgumentError = bcs.enum("CommandArgumentError", {
  TypeMismatch: null,
  InvalidBCSBytes: null,
  InvalidUsageOfPureArg: null,
  InvalidArgumentToPrivateEntryFunction: null,
  IndexOutOfBounds: bcs.struct("IndexOutOfBounds", { idx: bcs.u16() }),
  SecondaryIndexOutOfBounds: bcs.struct("SecondaryIndexOutOfBounds", {
    resultIdx: bcs.u16(),
    secondaryIdx: bcs.u16()
  }),
  InvalidResultArity: bcs.struct("InvalidResultArity", { resultIdx: bcs.u16() }),
  InvalidGasCoinUsage: null,
  InvalidValueUsage: null,
  InvalidObjectByValue: null,
  InvalidObjectByMutRef: null,
  SharedObjectOperationNotAllowed: null
});
var TypeArgumentError = bcs.enum("TypeArgumentError", {
  TypeNotFound: null,
  ConstraintNotSatisfied: null
});
var ExecutionFailureStatus = bcs.enum("ExecutionFailureStatus", {
  InsufficientGas: null,
  InvalidGasObject: null,
  InvariantViolation: null,
  FeatureNotYetSupported: null,
  MoveObjectTooBig: bcs.struct("MoveObjectTooBig", {
    objectSize: bcs.u64(),
    maxObjectSize: bcs.u64()
  }),
  MovePackageTooBig: bcs.struct("MovePackageTooBig", {
    objectSize: bcs.u64(),
    maxObjectSize: bcs.u64()
  }),
  CircularObjectOwnership: bcs.struct("CircularObjectOwnership", { object: Address }),
  InsufficientCoinBalance: null,
  CoinBalanceOverflow: null,
  PublishErrorNonZeroAddress: null,
  SuiMoveVerificationError: null,
  MovePrimitiveRuntimeError: bcs.option(MoveLocation),
  MoveAbort: bcs.tuple([MoveLocation, bcs.u64()]),
  VMVerificationOrDeserializationError: null,
  VMInvariantViolation: null,
  FunctionNotFound: null,
  ArityMismatch: null,
  TypeArityMismatch: null,
  NonEntryFunctionInvoked: null,
  CommandArgumentError: bcs.struct("CommandArgumentError", {
    argIdx: bcs.u16(),
    kind: CommandArgumentError
  }),
  TypeArgumentError: bcs.struct("TypeArgumentError", {
    argumentIdx: bcs.u16(),
    kind: TypeArgumentError
  }),
  UnusedValueWithoutDrop: bcs.struct("UnusedValueWithoutDrop", {
    resultIdx: bcs.u16(),
    secondaryIdx: bcs.u16()
  }),
  InvalidPublicFunctionReturnType: bcs.struct("InvalidPublicFunctionReturnType", {
    idx: bcs.u16()
  }),
  InvalidTransferObject: null,
  EffectsTooLarge: bcs.struct("EffectsTooLarge", { currentSize: bcs.u64(), maxSize: bcs.u64() }),
  PublishUpgradeMissingDependency: null,
  PublishUpgradeDependencyDowngrade: null,
  PackageUpgradeError: bcs.struct("PackageUpgradeError", { upgradeError: PackageUpgradeError }),
  WrittenObjectsTooLarge: bcs.struct("WrittenObjectsTooLarge", {
    currentSize: bcs.u64(),
    maxSize: bcs.u64()
  }),
  CertificateDenied: null,
  SuiMoveVerificationTimedout: null,
  SharedObjectOperationNotAllowed: null,
  InputObjectDeleted: null,
  ExecutionCancelledDueToSharedObjectCongestion: bcs.struct(
    "ExecutionCancelledDueToSharedObjectCongestion",
    {
      congestedObjects: bcs.vector(Address)
    }
  ),
  AddressDeniedForCoin: bcs.struct("AddressDeniedForCoin", {
    address: Address,
    coinType: bcs.string()
  }),
  CoinTypeGlobalPause: bcs.struct("CoinTypeGlobalPause", { coinType: bcs.string() }),
  ExecutionCancelledDueToRandomnessUnavailable: null
});
var ExecutionStatus = bcs.enum("ExecutionStatus", {
  Success: null,
  Failed: bcs.struct("ExecutionFailed", {
    error: ExecutionFailureStatus,
    command: bcs.option(bcs.u64())
  })
});
var GasCostSummary = bcs.struct("GasCostSummary", {
  computationCost: bcs.u64(),
  storageCost: bcs.u64(),
  storageRebate: bcs.u64(),
  nonRefundableStorageFee: bcs.u64()
});
var Owner = bcs.enum("Owner", {
  AddressOwner: Address,
  ObjectOwner: Address,
  Shared: bcs.struct("Shared", {
    initialSharedVersion: bcs.u64()
  }),
  Immutable: null
});
var TransactionEffectsV1 = bcs.struct("TransactionEffectsV1", {
  status: ExecutionStatus,
  executedEpoch: bcs.u64(),
  gasUsed: GasCostSummary,
  modifiedAtVersions: bcs.vector(bcs.tuple([Address, bcs.u64()])),
  sharedObjects: bcs.vector(SuiObjectRef),
  transactionDigest: ObjectDigest,
  created: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
  mutated: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
  unwrapped: bcs.vector(bcs.tuple([SuiObjectRef, Owner])),
  deleted: bcs.vector(SuiObjectRef),
  unwrappedThenDeleted: bcs.vector(SuiObjectRef),
  wrapped: bcs.vector(SuiObjectRef),
  gasObject: bcs.tuple([SuiObjectRef, Owner]),
  eventsDigest: bcs.option(ObjectDigest),
  dependencies: bcs.vector(ObjectDigest)
});
var VersionDigest = bcs.tuple([bcs.u64(), ObjectDigest]);
var ObjectIn = bcs.enum("ObjectIn", {
  NotExist: null,
  Exist: bcs.tuple([VersionDigest, Owner])
});
var ObjectOut = bcs.enum("ObjectOut", {
  NotExist: null,
  ObjectWrite: bcs.tuple([ObjectDigest, Owner]),
  PackageWrite: VersionDigest
});
var IDOperation = bcs.enum("IDOperation", {
  None: null,
  Created: null,
  Deleted: null
});
var EffectsObjectChange = bcs.struct("EffectsObjectChange", {
  inputState: ObjectIn,
  outputState: ObjectOut,
  idOperation: IDOperation
});
var UnchangedSharedKind = bcs.enum("UnchangedSharedKind", {
  ReadOnlyRoot: VersionDigest,
  MutateDeleted: bcs.u64(),
  ReadDeleted: bcs.u64(),
  Cancelled: bcs.u64(),
  PerEpochConfig: null
});
var TransactionEffectsV2 = bcs.struct("TransactionEffectsV2", {
  status: ExecutionStatus,
  executedEpoch: bcs.u64(),
  gasUsed: GasCostSummary,
  transactionDigest: ObjectDigest,
  gasObjectIndex: bcs.option(bcs.u32()),
  eventsDigest: bcs.option(ObjectDigest),
  dependencies: bcs.vector(ObjectDigest),
  lamportVersion: bcs.u64(),
  changedObjects: bcs.vector(bcs.tuple([Address, EffectsObjectChange])),
  unchangedSharedObjects: bcs.vector(bcs.tuple([Address, UnchangedSharedKind])),
  auxDataDigest: bcs.option(ObjectDigest)
});
var TransactionEffects = bcs.enum("TransactionEffects", {
  V1: TransactionEffectsV1,
  V2: TransactionEffectsV2
});

// ../../node_modules/@mysten/sui/dist/esm/bcs/index.js
var suiBcs = {
  ...bcs,
  U8: bcs.u8(),
  U16: bcs.u16(),
  U32: bcs.u32(),
  U64: bcs.u64(),
  U128: bcs.u128(),
  U256: bcs.u256(),
  ULEB128: bcs.uleb128(),
  Bool: bcs.bool(),
  String: bcs.string(),
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

// ../../node_modules/@mysten/sui/dist/esm/utils/suins.js
var SUI_NS_NAME_REGEX = /^(?!.*(^(?!@)|[-.@])($|[-.@]))(?:[a-z0-9-]{0,63}(?:\.[a-z0-9-]{0,63})*)?@[a-z0-9-]{0,63}$/i;
var SUI_NS_DOMAIN_REGEX = /^(?!.*(^|[-.])($|[-.]))(?:[a-z0-9-]{0,63}\.)+sui$/i;
function normalizeSuiNSName(name, format = "at") {
  const lowerCase = name.toLowerCase();
  let parts;
  if (lowerCase.includes("@")) {
    if (!SUI_NS_NAME_REGEX.test(lowerCase)) {
      throw new Error(`Invalid SuiNS name ${name}`);
    }
    const [labels, domain] = lowerCase.split("@");
    parts = [...labels ? labels.split(".") : [], domain];
  } else {
    if (!SUI_NS_DOMAIN_REGEX.test(lowerCase)) {
      throw new Error(`Invalid SuiNS name ${name}`);
    }
    parts = lowerCase.split(".").slice(0, -1);
  }
  if (format === "dot") {
    return `${parts.join(".")}.sui`;
  }
  return `${parts.slice(0, -1).join(".")}@${parts[parts.length - 1]}`;
}

// ../../node_modules/@mysten/sui/dist/esm/utils/constants.js
var MIST_PER_SUI = BigInt(1e9);
var MOVE_STDLIB_ADDRESS = "0x1";
var SUI_FRAMEWORK_ADDRESS = "0x2";
var SUI_CLOCK_OBJECT_ID = normalizeSuiObjectId("0x6");
var SUI_TYPE_ARG = `${SUI_FRAMEWORK_ADDRESS}::sui::SUI`;
var SUI_SYSTEM_STATE_OBJECT_ID = normalizeSuiObjectId("0x5");

// ../../node_modules/@noble/hashes/esm/_assert.js
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
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

// ../../node_modules/@noble/hashes/esm/utils.js
var u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
var byteSwap = (word) => word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
var byteSwapIfBE = isLE ? (n) => n : (n) => byteSwap(n);
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("utf8ToBytes expected string, got " + typeof str);
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes(data2) {
  if (typeof data2 === "string")
    data2 = utf8ToBytes(data2);
  abytes(data2);
  return data2;
}
var Hash = class {
  // Safe version that clones internal state
  clone() {
    return this._cloneInto();
  }
};
function wrapConstructorWithOpts(hashCons) {
  const hashC = (msg, opts) => hashCons(opts).update(toBytes(msg)).digest();
  const tmp = hashCons({});
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (opts) => hashCons(opts);
  return hashC;
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
  update(data2) {
    aexists(this);
    const { blockLen, buffer, buffer32 } = this;
    data2 = toBytes(data2);
    const len = data2.length;
    const offset = data2.byteOffset;
    const buf = data2.buffer;
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
      buffer.set(data2.subarray(pos, pos + take), this.pos);
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
    this.get().forEach((v, i) => out32[i] = byteSwapIfBE(v));
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
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  let Ah = new Uint32Array(lst.length);
  let Al = new Uint32Array(lst.length);
  for (let i = 0; i < lst.length; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var toBig = (h, l) => BigInt(h >>> 0) << _32n | BigInt(l >>> 0);
var shrSH = (h, _l, s) => h >>> s;
var shrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrSH = (h, l, s) => h >>> s | l << 32 - s;
var rotrSL = (h, l, s) => h << 32 - s | l >>> s;
var rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
var rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
var rotr32H = (_h, l) => l;
var rotr32L = (h, _l) => h;
var rotlSH = (h, l, s) => h << s | l >>> 32 - s;
var rotlSL = (h, l, s) => l << s | h >>> 32 - s;
var rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
var rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
function add(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
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
function G1b(a, b, c, d, msg, x) {
  const Xl = msg[x], Xh = msg[x + 1];
  let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
  let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
  let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
  let ll = u64_default.add3L(Al, Bl, Xl);
  Ah = u64_default.add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
  ({ Dh, Dl } = { Dh: u64_default.rotr32H(Dh, Dl), Dl: u64_default.rotr32L(Dh, Dl) });
  ({ h: Ch, l: Cl } = u64_default.add(Ch, Cl, Dh, Dl));
  ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
  ({ Bh, Bl } = { Bh: u64_default.rotrSH(Bh, Bl, 24), Bl: u64_default.rotrSL(Bh, Bl, 24) });
  BBUF[2 * a] = Al, BBUF[2 * a + 1] = Ah;
  BBUF[2 * b] = Bl, BBUF[2 * b + 1] = Bh;
  BBUF[2 * c] = Cl, BBUF[2 * c + 1] = Ch;
  BBUF[2 * d] = Dl, BBUF[2 * d + 1] = Dh;
}
function G2b(a, b, c, d, msg, x) {
  const Xl = msg[x], Xh = msg[x + 1];
  let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
  let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
  let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
  let ll = u64_default.add3L(Al, Bl, Xl);
  Ah = u64_default.add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
  ({ Dh, Dl } = { Dh: u64_default.rotrSH(Dh, Dl, 16), Dl: u64_default.rotrSL(Dh, Dl, 16) });
  ({ h: Ch, l: Cl } = u64_default.add(Ch, Cl, Dh, Dl));
  ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
  ({ Bh, Bl } = { Bh: u64_default.rotrBH(Bh, Bl, 63), Bl: u64_default.rotrBL(Bh, Bl, 63) });
  BBUF[2 * a] = Al, BBUF[2 * a + 1] = Ah;
  BBUF[2 * b] = Bl, BBUF[2 * b + 1] = Bh;
  BBUF[2 * c] = Cl, BBUF[2 * c + 1] = Ch;
  BBUF[2 * d] = Dl, BBUF[2 * d + 1] = Dh;
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
    this.get().forEach((v, i) => BBUF[i] = v);
    BBUF.set(B2B_IV, 16);
    let { h, l } = u64_default.fromBig(BigInt(this.length));
    BBUF[24] = B2B_IV[8] ^ l;
    BBUF[25] = B2B_IV[9] ^ h;
    if (isLast) {
      BBUF[28] = ~BBUF[28];
      BBUF[29] = ~BBUF[29];
    }
    let j = 0;
    const s = SIGMA;
    for (let i = 0; i < 12; i++) {
      G1b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
      G2b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
      G1b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
      G2b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
      G1b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
      G2b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
      G1b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
      G2b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
      G1b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
      G2b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
      G1b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
      G2b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
      G1b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
      G2b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
      G1b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
      G2b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
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

// ../../node_modules/@mysten/sui/dist/esm/transactions/serializer.js
var OBJECT_MODULE_NAME = "object";
var ID_STRUCT_NAME = "ID";
var STD_ASCII_MODULE_NAME = "ascii";
var STD_ASCII_STRUCT_NAME = "String";
var STD_UTF8_MODULE_NAME = "string";
var STD_UTF8_STRUCT_NAME = "String";
var STD_OPTION_MODULE_NAME = "option";
var STD_OPTION_STRUCT_NAME = "Option";
function isTxContext(param) {
  const struct = typeof param.body === "object" && "datatype" in param.body ? param.body.datatype : null;
  return !!struct && normalizeSuiAddress(struct.package) === normalizeSuiAddress("0x2") && struct.module === "tx_context" && struct.type === "TxContext";
}
function getPureBcsSchema(typeSignature) {
  if (typeof typeSignature === "string") {
    switch (typeSignature) {
      case "address":
        return suiBcs.Address;
      case "bool":
        return suiBcs.Bool;
      case "u8":
        return suiBcs.U8;
      case "u16":
        return suiBcs.U16;
      case "u32":
        return suiBcs.U32;
      case "u64":
        return suiBcs.U64;
      case "u128":
        return suiBcs.U128;
      case "u256":
        return suiBcs.U256;
      default:
        throw new Error(`Unknown type signature ${typeSignature}`);
    }
  }
  if ("vector" in typeSignature) {
    if (typeSignature.vector === "u8") {
      return suiBcs.vector(suiBcs.U8).transform({
        input: (val) => typeof val === "string" ? new TextEncoder().encode(val) : val,
        output: (val) => val
      });
    }
    const type = getPureBcsSchema(typeSignature.vector);
    return type ? suiBcs.vector(type) : null;
  }
  if ("datatype" in typeSignature) {
    const pkg = normalizeSuiAddress(typeSignature.datatype.package);
    if (pkg === normalizeSuiAddress(MOVE_STDLIB_ADDRESS)) {
      if (typeSignature.datatype.module === STD_ASCII_MODULE_NAME && typeSignature.datatype.type === STD_ASCII_STRUCT_NAME) {
        return suiBcs.String;
      }
      if (typeSignature.datatype.module === STD_UTF8_MODULE_NAME && typeSignature.datatype.type === STD_UTF8_STRUCT_NAME) {
        return suiBcs.String;
      }
      if (typeSignature.datatype.module === STD_OPTION_MODULE_NAME && typeSignature.datatype.type === STD_OPTION_STRUCT_NAME) {
        const type = getPureBcsSchema(typeSignature.datatype.typeParameters[0]);
        return type ? suiBcs.vector(type) : null;
      }
    }
    if (pkg === normalizeSuiAddress(SUI_FRAMEWORK_ADDRESS) && typeSignature.datatype.module === OBJECT_MODULE_NAME && typeSignature.datatype.type === ID_STRUCT_NAME) {
      return suiBcs.Address;
    }
  }
  return null;
}
function normalizedTypeToMoveTypeSignature(type) {
  if (typeof type === "object" && "Reference" in type) {
    return {
      ref: "&",
      body: normalizedTypeToMoveTypeSignatureBody(type.Reference)
    };
  }
  if (typeof type === "object" && "MutableReference" in type) {
    return {
      ref: "&mut",
      body: normalizedTypeToMoveTypeSignatureBody(type.MutableReference)
    };
  }
  return {
    ref: null,
    body: normalizedTypeToMoveTypeSignatureBody(type)
  };
}
function normalizedTypeToMoveTypeSignatureBody(type) {
  if (typeof type === "string") {
    switch (type) {
      case "Address":
        return "address";
      case "Bool":
        return "bool";
      case "U8":
        return "u8";
      case "U16":
        return "u16";
      case "U32":
        return "u32";
      case "U64":
        return "u64";
      case "U128":
        return "u128";
      case "U256":
        return "u256";
      default:
        throw new Error(`Unexpected type ${type}`);
    }
  }
  if ("Vector" in type) {
    return { vector: normalizedTypeToMoveTypeSignatureBody(type.Vector) };
  }
  if ("Struct" in type) {
    return {
      datatype: {
        package: type.Struct.address,
        module: type.Struct.module,
        type: type.Struct.name,
        typeParameters: type.Struct.typeArguments.map(normalizedTypeToMoveTypeSignatureBody)
      }
    };
  }
  if ("TypeParameter" in type) {
    return { typeParameter: type.TypeParameter };
  }
  throw new Error(`Unexpected type ${JSON.stringify(type)}`);
}

// ../../node_modules/@mysten/sui/dist/esm/transactions/Inputs.js
function Pure(data2) {
  return {
    $kind: "Pure",
    Pure: {
      bytes: data2 instanceof Uint8Array ? toBase64(data2) : data2.toBase64()
    }
  };
}
var Inputs = {
  Pure,
  ObjectRef({ objectId, digest, version }) {
    return {
      $kind: "Object",
      Object: {
        $kind: "ImmOrOwnedObject",
        ImmOrOwnedObject: {
          digest,
          version,
          objectId: normalizeSuiAddress(objectId)
        }
      }
    };
  },
  SharedObjectRef({
    objectId,
    mutable,
    initialSharedVersion
  }) {
    return {
      $kind: "Object",
      Object: {
        $kind: "SharedObject",
        SharedObject: {
          mutable,
          initialSharedVersion,
          objectId: normalizeSuiAddress(objectId)
        }
      }
    };
  },
  ReceivingRef({ objectId, digest, version }) {
    return {
      $kind: "Object",
      Object: {
        $kind: "Receiving",
        Receiving: {
          digest,
          version,
          objectId: normalizeSuiAddress(objectId)
        }
      }
    };
  }
};

// ../../node_modules/valibot/dist/index.js
var store;
function getGlobalConfig(config2) {
  return {
    lang: config2?.lang ?? store?.lang,
    message: config2?.message,
    abortEarly: config2?.abortEarly ?? store?.abortEarly,
    abortPipeEarly: config2?.abortPipeEarly ?? store?.abortPipeEarly
  };
}
var store2;
function getGlobalMessage(lang) {
  return store2?.get(lang);
}
var store3;
function getSchemaMessage(lang) {
  return store3?.get(lang);
}
var store4;
function getSpecificMessage(reference, lang) {
  return store4?.get(reference)?.get(lang);
}
function _stringify(input) {
  const type = typeof input;
  if (type === "string") {
    return `"${input}"`;
  }
  if (type === "number" || type === "bigint" || type === "boolean") {
    return `${input}`;
  }
  if (type === "object" || type === "function") {
    return (input && Object.getPrototypeOf(input)?.constructor?.name) ?? "null";
  }
  return type;
}
function _addIssue(context, label, dataset, config2, other) {
  const input = other && "input" in other ? other.input : dataset.value;
  const expected = other?.expected ?? context.expects ?? null;
  const received = other?.received ?? _stringify(input);
  const issue = {
    kind: context.kind,
    type: context.type,
    input,
    expected,
    received,
    message: `Invalid ${label}: ${expected ? `Expected ${expected} but r` : "R"}eceived ${received}`,
    // @ts-expect-error
    requirement: context.requirement,
    path: other?.path,
    issues: other?.issues,
    lang: config2.lang,
    abortEarly: config2.abortEarly,
    abortPipeEarly: config2.abortPipeEarly
  };
  const isSchema = context.kind === "schema";
  const message = other?.message ?? // @ts-expect-error
  context.message ?? getSpecificMessage(context.reference, issue.lang) ?? (isSchema ? getSchemaMessage(issue.lang) : null) ?? config2.message ?? getGlobalMessage(issue.lang);
  if (message) {
    issue.message = typeof message === "function" ? message(issue) : message;
  }
  if (isSchema) {
    dataset.typed = false;
  }
  if (dataset.issues) {
    dataset.issues.push(issue);
  } else {
    dataset.issues = [issue];
  }
}
function _isValidObjectKey(object2, key) {
  return Object.hasOwn(object2, key) && key !== "__proto__" && key !== "prototype" && key !== "constructor";
}
var ValiError = class extends Error {
  /**
   * The error issues.
   */
  issues;
  /**
   * Creates a Valibot error with useful information.
   *
   * @param issues The error issues.
   */
  constructor(issues) {
    super(issues[0].message);
    this.name = "ValiError";
    this.issues = issues;
  }
};
function check(requirement, message) {
  return {
    kind: "validation",
    type: "check",
    reference: check,
    async: false,
    expects: null,
    requirement,
    message,
    _run(dataset, config2) {
      if (dataset.typed && !this.requirement(dataset.value)) {
        _addIssue(this, "input", dataset, config2);
      }
      return dataset;
    }
  };
}
function integer(message) {
  return {
    kind: "validation",
    type: "integer",
    reference: integer,
    async: false,
    expects: null,
    requirement: Number.isInteger,
    message,
    _run(dataset, config2) {
      if (dataset.typed && !this.requirement(dataset.value)) {
        _addIssue(this, "integer", dataset, config2);
      }
      return dataset;
    }
  };
}
function transform(operation) {
  return {
    kind: "transformation",
    type: "transform",
    reference: transform,
    async: false,
    operation,
    _run(dataset) {
      dataset.value = this.operation(dataset.value);
      return dataset;
    }
  };
}
function getDefault(schema, dataset, config2) {
  return typeof schema.default === "function" ? (
    // @ts-expect-error
    schema.default(dataset, config2)
  ) : (
    // @ts-expect-error
    schema.default
  );
}
function is(schema, input) {
  return !schema._run({ typed: false, value: input }, { abortEarly: true }).issues;
}
function array(item, message) {
  return {
    kind: "schema",
    type: "array",
    reference: array,
    expects: "Array",
    async: false,
    item,
    message,
    _run(dataset, config2) {
      const input = dataset.value;
      if (Array.isArray(input)) {
        dataset.typed = true;
        dataset.value = [];
        for (let key = 0; key < input.length; key++) {
          const value2 = input[key];
          const itemDataset = this.item._run({ typed: false, value: value2 }, config2);
          if (itemDataset.issues) {
            const pathItem = {
              type: "array",
              origin: "value",
              input,
              key,
              value: value2
            };
            for (const issue of itemDataset.issues) {
              if (issue.path) {
                issue.path.unshift(pathItem);
              } else {
                issue.path = [pathItem];
              }
              dataset.issues?.push(issue);
            }
            if (!dataset.issues) {
              dataset.issues = itemDataset.issues;
            }
            if (config2.abortEarly) {
              dataset.typed = false;
              break;
            }
          }
          if (!itemDataset.typed) {
            dataset.typed = false;
          }
          dataset.value.push(itemDataset.value);
        }
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function bigint(message) {
  return {
    kind: "schema",
    type: "bigint",
    reference: bigint,
    expects: "bigint",
    async: false,
    message,
    _run(dataset, config2) {
      if (typeof dataset.value === "bigint") {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function boolean(message) {
  return {
    kind: "schema",
    type: "boolean",
    reference: boolean,
    expects: "boolean",
    async: false,
    message,
    _run(dataset, config2) {
      if (typeof dataset.value === "boolean") {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function lazy(getter) {
  return {
    kind: "schema",
    type: "lazy",
    reference: lazy,
    expects: "unknown",
    async: false,
    getter,
    _run(dataset, config2) {
      return this.getter(dataset.value)._run(dataset, config2);
    }
  };
}
function literal(literal_, message) {
  return {
    kind: "schema",
    type: "literal",
    reference: literal,
    expects: _stringify(literal_),
    async: false,
    literal: literal_,
    message,
    _run(dataset, config2) {
      if (dataset.value === this.literal) {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function nullable(wrapped, ...args) {
  const schema = {
    kind: "schema",
    type: "nullable",
    reference: nullable,
    expects: `${wrapped.expects} | null`,
    async: false,
    wrapped,
    _run(dataset, config2) {
      if (dataset.value === null) {
        if ("default" in this) {
          dataset.value = getDefault(
            this,
            dataset,
            config2
          );
        }
        if (dataset.value === null) {
          dataset.typed = true;
          return dataset;
        }
      }
      return this.wrapped._run(dataset, config2);
    }
  };
  if (0 in args) {
    schema.default = args[0];
  }
  return schema;
}
function nullish(wrapped, ...args) {
  const schema = {
    kind: "schema",
    type: "nullish",
    reference: nullish,
    expects: `${wrapped.expects} | null | undefined`,
    async: false,
    wrapped,
    _run(dataset, config2) {
      if (dataset.value === null || dataset.value === void 0) {
        if ("default" in this) {
          dataset.value = getDefault(
            this,
            dataset,
            config2
          );
        }
        if (dataset.value === null || dataset.value === void 0) {
          dataset.typed = true;
          return dataset;
        }
      }
      return this.wrapped._run(dataset, config2);
    }
  };
  if (0 in args) {
    schema.default = args[0];
  }
  return schema;
}
function number(message) {
  return {
    kind: "schema",
    type: "number",
    reference: number,
    expects: "number",
    async: false,
    message,
    _run(dataset, config2) {
      if (typeof dataset.value === "number" && !isNaN(dataset.value)) {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function object(entries, message) {
  return {
    kind: "schema",
    type: "object",
    reference: object,
    expects: "Object",
    async: false,
    entries,
    message,
    _run(dataset, config2) {
      const input = dataset.value;
      if (input && typeof input === "object") {
        dataset.typed = true;
        dataset.value = {};
        for (const key in this.entries) {
          const value2 = input[key];
          const valueDataset = this.entries[key]._run(
            { typed: false, value: value2 },
            config2
          );
          if (valueDataset.issues) {
            const pathItem = {
              type: "object",
              origin: "value",
              input,
              key,
              value: value2
            };
            for (const issue of valueDataset.issues) {
              if (issue.path) {
                issue.path.unshift(pathItem);
              } else {
                issue.path = [pathItem];
              }
              dataset.issues?.push(issue);
            }
            if (!dataset.issues) {
              dataset.issues = valueDataset.issues;
            }
            if (config2.abortEarly) {
              dataset.typed = false;
              break;
            }
          }
          if (!valueDataset.typed) {
            dataset.typed = false;
          }
          if (valueDataset.value !== void 0 || key in input) {
            dataset.value[key] = valueDataset.value;
          }
        }
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function optional(wrapped, ...args) {
  const schema = {
    kind: "schema",
    type: "optional",
    reference: optional,
    expects: `${wrapped.expects} | undefined`,
    async: false,
    wrapped,
    _run(dataset, config2) {
      if (dataset.value === void 0) {
        if ("default" in this) {
          dataset.value = getDefault(
            this,
            dataset,
            config2
          );
        }
        if (dataset.value === void 0) {
          dataset.typed = true;
          return dataset;
        }
      }
      return this.wrapped._run(dataset, config2);
    }
  };
  if (0 in args) {
    schema.default = args[0];
  }
  return schema;
}
function record(key, value2, message) {
  return {
    kind: "schema",
    type: "record",
    reference: record,
    expects: "Object",
    async: false,
    key,
    value: value2,
    message,
    _run(dataset, config2) {
      const input = dataset.value;
      if (input && typeof input === "object") {
        dataset.typed = true;
        dataset.value = {};
        for (const entryKey in input) {
          if (_isValidObjectKey(input, entryKey)) {
            const entryValue = input[entryKey];
            const keyDataset = this.key._run(
              { typed: false, value: entryKey },
              config2
            );
            if (keyDataset.issues) {
              const pathItem = {
                type: "object",
                origin: "key",
                input,
                key: entryKey,
                value: entryValue
              };
              for (const issue of keyDataset.issues) {
                issue.path = [pathItem];
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) {
                dataset.issues = keyDataset.issues;
              }
              if (config2.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            const valueDataset = this.value._run(
              { typed: false, value: entryValue },
              config2
            );
            if (valueDataset.issues) {
              const pathItem = {
                type: "object",
                origin: "value",
                input,
                key: entryKey,
                value: entryValue
              };
              for (const issue of valueDataset.issues) {
                if (issue.path) {
                  issue.path.unshift(pathItem);
                } else {
                  issue.path = [pathItem];
                }
                dataset.issues?.push(issue);
              }
              if (!dataset.issues) {
                dataset.issues = valueDataset.issues;
              }
              if (config2.abortEarly) {
                dataset.typed = false;
                break;
              }
            }
            if (!keyDataset.typed || !valueDataset.typed) {
              dataset.typed = false;
            }
            if (keyDataset.typed) {
              dataset.value[keyDataset.value] = valueDataset.value;
            }
          }
        }
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function string(message) {
  return {
    kind: "schema",
    type: "string",
    reference: string,
    expects: "string",
    async: false,
    message,
    _run(dataset, config2) {
      if (typeof dataset.value === "string") {
        dataset.typed = true;
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function tuple(items, message) {
  return {
    kind: "schema",
    type: "tuple",
    reference: tuple,
    expects: "Array",
    async: false,
    items,
    message,
    _run(dataset, config2) {
      const input = dataset.value;
      if (Array.isArray(input)) {
        dataset.typed = true;
        dataset.value = [];
        for (let key = 0; key < this.items.length; key++) {
          const value2 = input[key];
          const itemDataset = this.items[key]._run(
            { typed: false, value: value2 },
            config2
          );
          if (itemDataset.issues) {
            const pathItem = {
              type: "array",
              origin: "value",
              input,
              key,
              value: value2
            };
            for (const issue of itemDataset.issues) {
              if (issue.path) {
                issue.path.unshift(pathItem);
              } else {
                issue.path = [pathItem];
              }
              dataset.issues?.push(issue);
            }
            if (!dataset.issues) {
              dataset.issues = itemDataset.issues;
            }
            if (config2.abortEarly) {
              dataset.typed = false;
              break;
            }
          }
          if (!itemDataset.typed) {
            dataset.typed = false;
          }
          dataset.value.push(itemDataset.value);
        }
      } else {
        _addIssue(this, "type", dataset, config2);
      }
      return dataset;
    }
  };
}
function _subIssues(datasets) {
  let issues;
  if (datasets) {
    for (const dataset of datasets) {
      if (issues) {
        issues.push(...dataset.issues);
      } else {
        issues = dataset.issues;
      }
    }
  }
  return issues;
}
function union(options, message) {
  return {
    kind: "schema",
    type: "union",
    reference: union,
    expects: [...new Set(options.map((option) => option.expects))].join(" | ") || "never",
    async: false,
    options,
    message,
    _run(dataset, config2) {
      let validDataset;
      let typedDatasets;
      let untypedDatasets;
      for (const schema of this.options) {
        const optionDataset = schema._run(
          { typed: false, value: dataset.value },
          config2
        );
        if (optionDataset.typed) {
          if (optionDataset.issues) {
            if (typedDatasets) {
              typedDatasets.push(optionDataset);
            } else {
              typedDatasets = [optionDataset];
            }
          } else {
            validDataset = optionDataset;
            break;
          }
        } else {
          if (untypedDatasets) {
            untypedDatasets.push(optionDataset);
          } else {
            untypedDatasets = [optionDataset];
          }
        }
      }
      if (validDataset) {
        return validDataset;
      }
      if (typedDatasets) {
        if (typedDatasets.length === 1) {
          return typedDatasets[0];
        }
        _addIssue(this, "type", dataset, config2, {
          issues: _subIssues(typedDatasets)
        });
        dataset.typed = true;
      } else if (untypedDatasets?.length === 1) {
        return untypedDatasets[0];
      } else {
        _addIssue(this, "type", dataset, config2, {
          issues: _subIssues(untypedDatasets)
        });
      }
      return dataset;
    }
  };
}
function unknown() {
  return {
    kind: "schema",
    type: "unknown",
    reference: unknown,
    expects: "unknown",
    async: false,
    _run(dataset) {
      dataset.typed = true;
      return dataset;
    }
  };
}
function parse(schema, input, config2) {
  const dataset = schema._run(
    { typed: false, value: input },
    getGlobalConfig(config2)
  );
  if (dataset.issues) {
    throw new ValiError(dataset.issues);
  }
  return dataset.value;
}
function pipe(...pipe2) {
  return {
    ...pipe2[0],
    pipe: pipe2,
    _run(dataset, config2) {
      for (let index = 0; index < pipe2.length; index++) {
        if (dataset.issues && (pipe2[index].kind === "schema" || pipe2[index].kind === "transformation")) {
          dataset.typed = false;
          break;
        }
        if (!dataset.issues || !config2.abortEarly && !config2.abortPipeEarly) {
          dataset = pipe2[index]._run(dataset, config2);
        }
      }
      return dataset;
    }
  };
}

// ../../node_modules/@mysten/sui/dist/esm/transactions/data/internal.js
function safeEnum(options) {
  const unionOptions = Object.entries(options).map(([key, value]) => object({ [key]: value }));
  return pipe(
    union(unionOptions),
    transform((value) => ({
      ...value,
      $kind: Object.keys(value)[0]
    }))
  );
}
var SuiAddress = pipe(
  string(),
  transform((value) => normalizeSuiAddress(value)),
  check(isValidSuiAddress)
);
var ObjectID = SuiAddress;
var BCSBytes = string();
var JsonU64 = pipe(
  union([string(), pipe(number(), integer())]),
  check((val) => {
    try {
      BigInt(val);
      return BigInt(val) >= 0 && BigInt(val) <= 18446744073709551615n;
    } catch {
      return false;
    }
  }, "Invalid u64")
);
var ObjectRef = object({
  objectId: SuiAddress,
  version: JsonU64,
  digest: string()
});
var Argument2 = pipe(
  union([
    object({ GasCoin: literal(true) }),
    object({ Input: pipe(number(), integer()), type: optional(literal("pure")) }),
    object({ Input: pipe(number(), integer()), type: optional(literal("object")) }),
    object({ Result: pipe(number(), integer()) }),
    object({ NestedResult: tuple([pipe(number(), integer()), pipe(number(), integer())]) })
  ]),
  transform((value) => ({
    ...value,
    $kind: Object.keys(value)[0]
  }))
  // Defined manually to add `type?: 'pure' | 'object'` to Input
);
var GasData2 = object({
  budget: nullable(JsonU64),
  price: nullable(JsonU64),
  owner: nullable(SuiAddress),
  payment: nullable(array(ObjectRef))
});
var StructTag2 = object({
  address: string(),
  module: string(),
  name: string(),
  // type_params in rust, should be updated to use camelCase
  typeParams: array(string())
});
var OpenMoveTypeSignatureBody = union([
  literal("address"),
  literal("bool"),
  literal("u8"),
  literal("u16"),
  literal("u32"),
  literal("u64"),
  literal("u128"),
  literal("u256"),
  object({ vector: lazy(() => OpenMoveTypeSignatureBody) }),
  object({
    datatype: object({
      package: string(),
      module: string(),
      type: string(),
      typeParameters: array(lazy(() => OpenMoveTypeSignatureBody))
    })
  }),
  object({ typeParameter: pipe(number(), integer()) })
]);
var OpenMoveTypeSignature = object({
  ref: nullable(union([literal("&"), literal("&mut")])),
  body: OpenMoveTypeSignatureBody
});
var ProgrammableMoveCall2 = object({
  package: ObjectID,
  module: string(),
  function: string(),
  // snake case in rust
  typeArguments: array(string()),
  arguments: array(Argument2),
  _argumentTypes: optional(nullable(array(OpenMoveTypeSignature)))
});
var $Intent = object({
  name: string(),
  inputs: record(string(), union([Argument2, array(Argument2)])),
  data: record(string(), unknown())
});
var Command2 = safeEnum({
  MoveCall: ProgrammableMoveCall2,
  TransferObjects: object({
    objects: array(Argument2),
    address: Argument2
  }),
  SplitCoins: object({
    coin: Argument2,
    amounts: array(Argument2)
  }),
  MergeCoins: object({
    destination: Argument2,
    sources: array(Argument2)
  }),
  Publish: object({
    modules: array(BCSBytes),
    dependencies: array(ObjectID)
  }),
  MakeMoveVec: object({
    type: nullable(string()),
    elements: array(Argument2)
  }),
  Upgrade: object({
    modules: array(BCSBytes),
    dependencies: array(ObjectID),
    package: ObjectID,
    ticket: Argument2
  }),
  $Intent
});
var ObjectArg2 = safeEnum({
  ImmOrOwnedObject: ObjectRef,
  SharedObject: object({
    objectId: ObjectID,
    // snake case in rust
    initialSharedVersion: JsonU64,
    mutable: boolean()
  }),
  Receiving: ObjectRef
});
var CallArg2 = safeEnum({
  Object: ObjectArg2,
  Pure: object({
    bytes: BCSBytes
  }),
  UnresolvedPure: object({
    value: unknown()
  }),
  UnresolvedObject: object({
    objectId: ObjectID,
    version: optional(nullable(JsonU64)),
    digest: optional(nullable(string())),
    initialSharedVersion: optional(nullable(JsonU64))
  })
});
var NormalizedCallArg = safeEnum({
  Object: ObjectArg2,
  Pure: object({
    bytes: BCSBytes
  })
});
var TransactionExpiration2 = safeEnum({
  None: literal(true),
  Epoch: JsonU64
});
var TransactionData2 = object({
  version: literal(2),
  sender: nullish(SuiAddress),
  expiration: nullish(TransactionExpiration2),
  gasData: GasData2,
  inputs: array(CallArg2),
  commands: array(Command2)
});

// ../../node_modules/@mysten/sui/dist/esm/transactions/Commands.js
var Commands = {
  MoveCall(input) {
    const [pkg, mod = "", fn = ""] = "target" in input ? input.target.split("::") : [input.package, input.module, input.function];
    return {
      $kind: "MoveCall",
      MoveCall: {
        package: pkg,
        module: mod,
        function: fn,
        typeArguments: input.typeArguments ?? [],
        arguments: input.arguments ?? []
      }
    };
  },
  TransferObjects(objects, address) {
    return {
      $kind: "TransferObjects",
      TransferObjects: {
        objects: objects.map((o) => parse(Argument2, o)),
        address: parse(Argument2, address)
      }
    };
  },
  SplitCoins(coin, amounts) {
    return {
      $kind: "SplitCoins",
      SplitCoins: {
        coin: parse(Argument2, coin),
        amounts: amounts.map((o) => parse(Argument2, o))
      }
    };
  },
  MergeCoins(destination, sources) {
    return {
      $kind: "MergeCoins",
      MergeCoins: {
        destination: parse(Argument2, destination),
        sources: sources.map((o) => parse(Argument2, o))
      }
    };
  },
  Publish({
    modules,
    dependencies
  }) {
    return {
      $kind: "Publish",
      Publish: {
        modules: modules.map(
          (module) => typeof module === "string" ? module : toBase64(new Uint8Array(module))
        ),
        dependencies: dependencies.map((dep) => normalizeSuiObjectId(dep))
      }
    };
  },
  Upgrade({
    modules,
    dependencies,
    package: packageId,
    ticket
  }) {
    return {
      $kind: "Upgrade",
      Upgrade: {
        modules: modules.map(
          (module) => typeof module === "string" ? module : toBase64(new Uint8Array(module))
        ),
        dependencies: dependencies.map((dep) => normalizeSuiObjectId(dep)),
        package: packageId,
        ticket: parse(Argument2, ticket)
      }
    };
  },
  MakeMoveVec({
    type,
    elements
  }) {
    return {
      $kind: "MakeMoveVec",
      MakeMoveVec: {
        type: type ?? null,
        elements: elements.map((o) => parse(Argument2, o))
      }
    };
  },
  Intent({
    name,
    inputs = {},
    data: data2 = {}
  }) {
    return {
      $kind: "$Intent",
      $Intent: {
        name,
        inputs: Object.fromEntries(
          Object.entries(inputs).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.map((o) => parse(Argument2, o)) : parse(Argument2, value)
          ])
        ),
        data: data2
      }
    };
  }
};

// ../../node_modules/@mysten/sui/dist/esm/transactions/data/v1.js
var ObjectRef2 = object({
  digest: string(),
  objectId: string(),
  version: union([pipe(number(), integer()), string(), bigint()])
});
var ObjectArg3 = safeEnum({
  ImmOrOwned: ObjectRef2,
  Shared: object({
    objectId: ObjectID,
    initialSharedVersion: JsonU64,
    mutable: boolean()
  }),
  Receiving: ObjectRef2
});
var NormalizedCallArg2 = safeEnum({
  Object: ObjectArg3,
  Pure: array(pipe(number(), integer()))
});
var TransactionInput = union([
  object({
    kind: literal("Input"),
    index: pipe(number(), integer()),
    value: unknown(),
    type: optional(literal("object"))
  }),
  object({
    kind: literal("Input"),
    index: pipe(number(), integer()),
    value: unknown(),
    type: literal("pure")
  })
]);
var TransactionExpiration3 = union([
  object({ Epoch: pipe(number(), integer()) }),
  object({ None: nullable(literal(true)) })
]);
var StringEncodedBigint = pipe(
  union([number(), string(), bigint()]),
  check((val) => {
    if (!["string", "number", "bigint"].includes(typeof val)) return false;
    try {
      BigInt(val);
      return true;
    } catch {
      return false;
    }
  })
);
var TypeTag2 = union([
  object({ bool: nullable(literal(true)) }),
  object({ u8: nullable(literal(true)) }),
  object({ u64: nullable(literal(true)) }),
  object({ u128: nullable(literal(true)) }),
  object({ address: nullable(literal(true)) }),
  object({ signer: nullable(literal(true)) }),
  object({ vector: lazy(() => TypeTag2) }),
  object({ struct: lazy(() => StructTag3) }),
  object({ u16: nullable(literal(true)) }),
  object({ u32: nullable(literal(true)) }),
  object({ u256: nullable(literal(true)) })
]);
var StructTag3 = object({
  address: string(),
  module: string(),
  name: string(),
  typeParams: array(TypeTag2)
});
var GasConfig = object({
  budget: optional(StringEncodedBigint),
  price: optional(StringEncodedBigint),
  payment: optional(array(ObjectRef2)),
  owner: optional(string())
});
var TransactionArgumentTypes = [
  TransactionInput,
  object({ kind: literal("GasCoin") }),
  object({ kind: literal("Result"), index: pipe(number(), integer()) }),
  object({
    kind: literal("NestedResult"),
    index: pipe(number(), integer()),
    resultIndex: pipe(number(), integer())
  })
];
var TransactionArgument = union([...TransactionArgumentTypes]);
var MoveCallTransaction = object({
  kind: literal("MoveCall"),
  target: pipe(
    string(),
    check((target) => target.split("::").length === 3)
  ),
  typeArguments: array(string()),
  arguments: array(TransactionArgument)
});
var TransferObjectsTransaction = object({
  kind: literal("TransferObjects"),
  objects: array(TransactionArgument),
  address: TransactionArgument
});
var SplitCoinsTransaction = object({
  kind: literal("SplitCoins"),
  coin: TransactionArgument,
  amounts: array(TransactionArgument)
});
var MergeCoinsTransaction = object({
  kind: literal("MergeCoins"),
  destination: TransactionArgument,
  sources: array(TransactionArgument)
});
var MakeMoveVecTransaction = object({
  kind: literal("MakeMoveVec"),
  type: union([object({ Some: TypeTag2 }), object({ None: nullable(literal(true)) })]),
  objects: array(TransactionArgument)
});
var PublishTransaction = object({
  kind: literal("Publish"),
  modules: array(array(pipe(number(), integer()))),
  dependencies: array(string())
});
var UpgradeTransaction = object({
  kind: literal("Upgrade"),
  modules: array(array(pipe(number(), integer()))),
  dependencies: array(string()),
  packageId: string(),
  ticket: TransactionArgument
});
var TransactionTypes = [
  MoveCallTransaction,
  TransferObjectsTransaction,
  SplitCoinsTransaction,
  MergeCoinsTransaction,
  PublishTransaction,
  UpgradeTransaction,
  MakeMoveVecTransaction
];
var TransactionType = union([...TransactionTypes]);
var SerializedTransactionDataV1 = object({
  version: literal(1),
  sender: optional(string()),
  expiration: nullish(TransactionExpiration3),
  gasConfig: GasConfig,
  inputs: array(TransactionInput),
  transactions: array(TransactionType)
});
function serializeV1TransactionData(transactionData) {
  const inputs = transactionData.inputs.map(
    (input, index) => {
      if (input.Object) {
        return {
          kind: "Input",
          index,
          value: {
            Object: input.Object.ImmOrOwnedObject ? {
              ImmOrOwned: input.Object.ImmOrOwnedObject
            } : input.Object.Receiving ? {
              Receiving: {
                digest: input.Object.Receiving.digest,
                version: input.Object.Receiving.version,
                objectId: input.Object.Receiving.objectId
              }
            } : {
              Shared: {
                mutable: input.Object.SharedObject.mutable,
                initialSharedVersion: input.Object.SharedObject.initialSharedVersion,
                objectId: input.Object.SharedObject.objectId
              }
            }
          },
          type: "object"
        };
      }
      if (input.Pure) {
        return {
          kind: "Input",
          index,
          value: {
            Pure: Array.from(fromBase64(input.Pure.bytes))
          },
          type: "pure"
        };
      }
      if (input.UnresolvedPure) {
        return {
          kind: "Input",
          type: "pure",
          index,
          value: input.UnresolvedPure.value
        };
      }
      if (input.UnresolvedObject) {
        return {
          kind: "Input",
          type: "object",
          index,
          value: input.UnresolvedObject.objectId
        };
      }
      throw new Error("Invalid input");
    }
  );
  return {
    version: 1,
    sender: transactionData.sender ?? void 0,
    expiration: transactionData.expiration?.$kind === "Epoch" ? { Epoch: Number(transactionData.expiration.Epoch) } : transactionData.expiration ? { None: true } : null,
    gasConfig: {
      owner: transactionData.gasData.owner ?? void 0,
      budget: transactionData.gasData.budget ?? void 0,
      price: transactionData.gasData.price ?? void 0,
      payment: transactionData.gasData.payment ?? void 0
    },
    inputs,
    transactions: transactionData.commands.map((command) => {
      if (command.MakeMoveVec) {
        return {
          kind: "MakeMoveVec",
          type: command.MakeMoveVec.type === null ? { None: true } : { Some: TypeTagSerializer.parseFromStr(command.MakeMoveVec.type) },
          objects: command.MakeMoveVec.elements.map(
            (arg) => convertTransactionArgument(arg, inputs)
          )
        };
      }
      if (command.MergeCoins) {
        return {
          kind: "MergeCoins",
          destination: convertTransactionArgument(command.MergeCoins.destination, inputs),
          sources: command.MergeCoins.sources.map((arg) => convertTransactionArgument(arg, inputs))
        };
      }
      if (command.MoveCall) {
        return {
          kind: "MoveCall",
          target: `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`,
          typeArguments: command.MoveCall.typeArguments,
          arguments: command.MoveCall.arguments.map(
            (arg) => convertTransactionArgument(arg, inputs)
          )
        };
      }
      if (command.Publish) {
        return {
          kind: "Publish",
          modules: command.Publish.modules.map((mod) => Array.from(fromBase64(mod))),
          dependencies: command.Publish.dependencies
        };
      }
      if (command.SplitCoins) {
        return {
          kind: "SplitCoins",
          coin: convertTransactionArgument(command.SplitCoins.coin, inputs),
          amounts: command.SplitCoins.amounts.map((arg) => convertTransactionArgument(arg, inputs))
        };
      }
      if (command.TransferObjects) {
        return {
          kind: "TransferObjects",
          objects: command.TransferObjects.objects.map(
            (arg) => convertTransactionArgument(arg, inputs)
          ),
          address: convertTransactionArgument(command.TransferObjects.address, inputs)
        };
      }
      if (command.Upgrade) {
        return {
          kind: "Upgrade",
          modules: command.Upgrade.modules.map((mod) => Array.from(fromBase64(mod))),
          dependencies: command.Upgrade.dependencies,
          packageId: command.Upgrade.package,
          ticket: convertTransactionArgument(command.Upgrade.ticket, inputs)
        };
      }
      throw new Error(`Unknown transaction ${Object.keys(command)}`);
    })
  };
}
function convertTransactionArgument(arg, inputs) {
  if (arg.$kind === "GasCoin") {
    return { kind: "GasCoin" };
  }
  if (arg.$kind === "Result") {
    return { kind: "Result", index: arg.Result };
  }
  if (arg.$kind === "NestedResult") {
    return { kind: "NestedResult", index: arg.NestedResult[0], resultIndex: arg.NestedResult[1] };
  }
  if (arg.$kind === "Input") {
    return inputs[arg.Input];
  }
  throw new Error(`Invalid argument ${Object.keys(arg)}`);
}
function transactionDataFromV1(data2) {
  return parse(TransactionData2, {
    version: 2,
    sender: data2.sender ?? null,
    expiration: data2.expiration ? "Epoch" in data2.expiration ? { Epoch: data2.expiration.Epoch } : { None: true } : null,
    gasData: {
      owner: data2.gasConfig.owner ?? null,
      budget: data2.gasConfig.budget?.toString() ?? null,
      price: data2.gasConfig.price?.toString() ?? null,
      payment: data2.gasConfig.payment?.map((ref) => ({
        digest: ref.digest,
        objectId: ref.objectId,
        version: ref.version.toString()
      })) ?? null
    },
    inputs: data2.inputs.map((input) => {
      if (input.kind === "Input") {
        if (is(NormalizedCallArg2, input.value)) {
          const value = parse(NormalizedCallArg2, input.value);
          if (value.Object) {
            if (value.Object.ImmOrOwned) {
              return {
                Object: {
                  ImmOrOwnedObject: {
                    objectId: value.Object.ImmOrOwned.objectId,
                    version: String(value.Object.ImmOrOwned.version),
                    digest: value.Object.ImmOrOwned.digest
                  }
                }
              };
            }
            if (value.Object.Shared) {
              return {
                Object: {
                  SharedObject: {
                    mutable: value.Object.Shared.mutable ?? null,
                    initialSharedVersion: value.Object.Shared.initialSharedVersion,
                    objectId: value.Object.Shared.objectId
                  }
                }
              };
            }
            if (value.Object.Receiving) {
              return {
                Object: {
                  Receiving: {
                    digest: value.Object.Receiving.digest,
                    version: String(value.Object.Receiving.version),
                    objectId: value.Object.Receiving.objectId
                  }
                }
              };
            }
            throw new Error("Invalid object input");
          }
          return {
            Pure: {
              bytes: toBase64(new Uint8Array(value.Pure))
            }
          };
        }
        if (input.type === "object") {
          return {
            UnresolvedObject: {
              objectId: input.value
            }
          };
        }
        return {
          UnresolvedPure: {
            value: input.value
          }
        };
      }
      throw new Error("Invalid input");
    }),
    commands: data2.transactions.map((transaction) => {
      switch (transaction.kind) {
        case "MakeMoveVec":
          return {
            MakeMoveVec: {
              type: "Some" in transaction.type ? TypeTagSerializer.tagToString(transaction.type.Some) : null,
              elements: transaction.objects.map((arg) => parseV1TransactionArgument(arg))
            }
          };
        case "MergeCoins": {
          return {
            MergeCoins: {
              destination: parseV1TransactionArgument(transaction.destination),
              sources: transaction.sources.map((arg) => parseV1TransactionArgument(arg))
            }
          };
        }
        case "MoveCall": {
          const [pkg, mod, fn] = transaction.target.split("::");
          return {
            MoveCall: {
              package: pkg,
              module: mod,
              function: fn,
              typeArguments: transaction.typeArguments,
              arguments: transaction.arguments.map((arg) => parseV1TransactionArgument(arg))
            }
          };
        }
        case "Publish": {
          return {
            Publish: {
              modules: transaction.modules.map((mod) => toBase64(Uint8Array.from(mod))),
              dependencies: transaction.dependencies
            }
          };
        }
        case "SplitCoins": {
          return {
            SplitCoins: {
              coin: parseV1TransactionArgument(transaction.coin),
              amounts: transaction.amounts.map((arg) => parseV1TransactionArgument(arg))
            }
          };
        }
        case "TransferObjects": {
          return {
            TransferObjects: {
              objects: transaction.objects.map((arg) => parseV1TransactionArgument(arg)),
              address: parseV1TransactionArgument(transaction.address)
            }
          };
        }
        case "Upgrade": {
          return {
            Upgrade: {
              modules: transaction.modules.map((mod) => toBase64(Uint8Array.from(mod))),
              dependencies: transaction.dependencies,
              package: transaction.packageId,
              ticket: parseV1TransactionArgument(transaction.ticket)
            }
          };
        }
      }
      throw new Error(`Unknown transaction ${Object.keys(transaction)}`);
    })
  });
}
function parseV1TransactionArgument(arg) {
  switch (arg.kind) {
    case "GasCoin": {
      return { GasCoin: true };
    }
    case "Result":
      return { Result: arg.index };
    case "NestedResult": {
      return { NestedResult: [arg.index, arg.resultIndex] };
    }
    case "Input": {
      return { Input: arg.index };
    }
  }
}

// ../../node_modules/@mysten/sui/dist/esm/transactions/data/v2.js
function enumUnion(options) {
  return union(
    Object.entries(options).map(([key, value]) => object({ [key]: value }))
  );
}
var Argument3 = enumUnion({
  GasCoin: literal(true),
  Input: pipe(number(), integer()),
  Result: pipe(number(), integer()),
  NestedResult: tuple([pipe(number(), integer()), pipe(number(), integer())])
});
var GasData3 = object({
  budget: nullable(JsonU64),
  price: nullable(JsonU64),
  owner: nullable(SuiAddress),
  payment: nullable(array(ObjectRef))
});
var ProgrammableMoveCall3 = object({
  package: ObjectID,
  module: string(),
  function: string(),
  // snake case in rust
  typeArguments: array(string()),
  arguments: array(Argument3)
});
var $Intent2 = object({
  name: string(),
  inputs: record(string(), union([Argument3, array(Argument3)])),
  data: record(string(), unknown())
});
var Command3 = enumUnion({
  MoveCall: ProgrammableMoveCall3,
  TransferObjects: object({
    objects: array(Argument3),
    address: Argument3
  }),
  SplitCoins: object({
    coin: Argument3,
    amounts: array(Argument3)
  }),
  MergeCoins: object({
    destination: Argument3,
    sources: array(Argument3)
  }),
  Publish: object({
    modules: array(BCSBytes),
    dependencies: array(ObjectID)
  }),
  MakeMoveVec: object({
    type: nullable(string()),
    elements: array(Argument3)
  }),
  Upgrade: object({
    modules: array(BCSBytes),
    dependencies: array(ObjectID),
    package: ObjectID,
    ticket: Argument3
  }),
  $Intent: $Intent2
});
var ObjectArg4 = enumUnion({
  ImmOrOwnedObject: ObjectRef,
  SharedObject: object({
    objectId: ObjectID,
    // snake case in rust
    initialSharedVersion: JsonU64,
    mutable: boolean()
  }),
  Receiving: ObjectRef
});
var CallArg3 = enumUnion({
  Object: ObjectArg4,
  Pure: object({
    bytes: BCSBytes
  }),
  UnresolvedPure: object({
    value: unknown()
  }),
  UnresolvedObject: object({
    objectId: ObjectID,
    version: optional(nullable(JsonU64)),
    digest: optional(nullable(string())),
    initialSharedVersion: optional(nullable(JsonU64))
  })
});
var TransactionExpiration4 = enumUnion({
  None: literal(true),
  Epoch: JsonU64
});
var SerializedTransactionDataV2 = object({
  version: literal(2),
  sender: nullish(SuiAddress),
  expiration: nullish(TransactionExpiration4),
  gasData: GasData3,
  inputs: array(CallArg3),
  commands: array(Command3)
});

// ../../node_modules/@mysten/sui/dist/esm/transactions/json-rpc-resolver.js
var MAX_OBJECTS_PER_FETCH = 50;
var GAS_SAFE_OVERHEAD = 1000n;
var MAX_GAS = 5e10;
async function resolveTransactionData(transactionData, options, next) {
  await normalizeInputs(transactionData, options);
  await resolveObjectReferences(transactionData, options);
  if (!options.onlyTransactionKind) {
    await setGasPrice(transactionData, options);
    await setGasBudget(transactionData, options);
    await setGasPayment(transactionData, options);
  }
  await validate(transactionData);
  return await next();
}
async function setGasPrice(transactionData, options) {
  if (!transactionData.gasConfig.price) {
    transactionData.gasConfig.price = String(await getClient(options).getReferenceGasPrice());
  }
}
async function setGasBudget(transactionData, options) {
  if (transactionData.gasConfig.budget) {
    return;
  }
  const dryRunResult = await getClient(options).dryRunTransactionBlock({
    transactionBlock: transactionData.build({
      overrides: {
        gasData: {
          budget: String(MAX_GAS),
          payment: []
        }
      }
    })
  });
  if (dryRunResult.effects.status.status !== "success") {
    throw new Error(
      `Dry run failed, could not automatically determine a budget: ${dryRunResult.effects.status.error}`,
      { cause: dryRunResult }
    );
  }
  const safeOverhead = GAS_SAFE_OVERHEAD * BigInt(transactionData.gasConfig.price || 1n);
  const baseComputationCostWithOverhead = BigInt(dryRunResult.effects.gasUsed.computationCost) + safeOverhead;
  const gasBudget = baseComputationCostWithOverhead + BigInt(dryRunResult.effects.gasUsed.storageCost) - BigInt(dryRunResult.effects.gasUsed.storageRebate);
  transactionData.gasConfig.budget = String(
    gasBudget > baseComputationCostWithOverhead ? gasBudget : baseComputationCostWithOverhead
  );
}
async function setGasPayment(transactionData, options) {
  if (!transactionData.gasConfig.payment) {
    const coins = await getClient(options).getCoins({
      owner: transactionData.gasConfig.owner || transactionData.sender,
      coinType: SUI_TYPE_ARG
    });
    const paymentCoins = coins.data.filter((coin) => {
      const matchingInput = transactionData.inputs.find((input) => {
        if (input.Object?.ImmOrOwnedObject) {
          return coin.coinObjectId === input.Object.ImmOrOwnedObject.objectId;
        }
        return false;
      });
      return !matchingInput;
    }).map((coin) => ({
      objectId: coin.coinObjectId,
      digest: coin.digest,
      version: coin.version
    }));
    if (!paymentCoins.length) {
      throw new Error("No valid gas coins found for the transaction.");
    }
    transactionData.gasConfig.payment = paymentCoins.map((payment) => parse(ObjectRef, payment));
  }
}
async function resolveObjectReferences(transactionData, options) {
  const objectsToResolve = transactionData.inputs.filter((input) => {
    return input.UnresolvedObject && !(input.UnresolvedObject.version || input.UnresolvedObject?.initialSharedVersion);
  });
  const dedupedIds = [
    ...new Set(
      objectsToResolve.map((input) => normalizeSuiObjectId(input.UnresolvedObject.objectId))
    )
  ];
  const objectChunks = dedupedIds.length ? chunk(dedupedIds, MAX_OBJECTS_PER_FETCH) : [];
  const resolved = (await Promise.all(
    objectChunks.map(
      (chunk2) => getClient(options).multiGetObjects({
        ids: chunk2,
        options: { showOwner: true }
      })
    )
  )).flat();
  const responsesById = new Map(
    dedupedIds.map((id, index) => {
      return [id, resolved[index]];
    })
  );
  const invalidObjects = Array.from(responsesById).filter(([_, obj]) => obj.error).map(([_, obj]) => JSON.stringify(obj.error));
  if (invalidObjects.length) {
    throw new Error(`The following input objects are invalid: ${invalidObjects.join(", ")}`);
  }
  const objects = resolved.map((object2) => {
    if (object2.error || !object2.data) {
      throw new Error(`Failed to fetch object: ${object2.error}`);
    }
    const owner = object2.data.owner;
    const initialSharedVersion = owner && typeof owner === "object" && "Shared" in owner ? owner.Shared.initial_shared_version : null;
    return {
      objectId: object2.data.objectId,
      digest: object2.data.digest,
      version: object2.data.version,
      initialSharedVersion
    };
  });
  const objectsById = new Map(
    dedupedIds.map((id, index) => {
      return [id, objects[index]];
    })
  );
  for (const [index, input] of transactionData.inputs.entries()) {
    if (!input.UnresolvedObject) {
      continue;
    }
    let updated;
    const id = normalizeSuiAddress(input.UnresolvedObject.objectId);
    const object2 = objectsById.get(id);
    if (input.UnresolvedObject.initialSharedVersion ?? object2?.initialSharedVersion) {
      updated = Inputs.SharedObjectRef({
        objectId: id,
        initialSharedVersion: input.UnresolvedObject.initialSharedVersion || object2?.initialSharedVersion,
        mutable: isUsedAsMutable(transactionData, index)
      });
    } else if (isUsedAsReceiving(transactionData, index)) {
      updated = Inputs.ReceivingRef(
        {
          objectId: id,
          digest: input.UnresolvedObject.digest ?? object2?.digest,
          version: input.UnresolvedObject.version ?? object2?.version
        }
      );
    }
    transactionData.inputs[transactionData.inputs.indexOf(input)] = updated ?? Inputs.ObjectRef({
      objectId: id,
      digest: input.UnresolvedObject.digest ?? object2?.digest,
      version: input.UnresolvedObject.version ?? object2?.version
    });
  }
}
async function normalizeInputs(transactionData, options) {
  const { inputs, commands } = transactionData;
  const moveCallsToResolve = [];
  const moveFunctionsToResolve = /* @__PURE__ */ new Set();
  commands.forEach((command) => {
    if (command.MoveCall) {
      if (command.MoveCall._argumentTypes) {
        return;
      }
      const inputs2 = command.MoveCall.arguments.map((arg) => {
        if (arg.$kind === "Input") {
          return transactionData.inputs[arg.Input];
        }
        return null;
      });
      const needsResolution = inputs2.some(
        (input) => input?.UnresolvedPure || input?.UnresolvedObject
      );
      if (needsResolution) {
        const functionName = `${command.MoveCall.package}::${command.MoveCall.module}::${command.MoveCall.function}`;
        moveFunctionsToResolve.add(functionName);
        moveCallsToResolve.push(command.MoveCall);
      }
    }
    switch (command.$kind) {
      case "SplitCoins":
        command.SplitCoins.amounts.forEach((amount) => {
          normalizeRawArgument(amount, suiBcs.U64, transactionData);
        });
        break;
      case "TransferObjects":
        normalizeRawArgument(command.TransferObjects.address, suiBcs.Address, transactionData);
        break;
    }
  });
  const moveFunctionParameters = /* @__PURE__ */ new Map();
  if (moveFunctionsToResolve.size > 0) {
    const client2 = getClient(options);
    await Promise.all(
      [...moveFunctionsToResolve].map(async (functionName) => {
        const [packageId, moduleId, functionId] = functionName.split("::");
        const def = await client2.getNormalizedMoveFunction({
          package: packageId,
          module: moduleId,
          function: functionId
        });
        moveFunctionParameters.set(
          functionName,
          def.parameters.map((param) => normalizedTypeToMoveTypeSignature(param))
        );
      })
    );
  }
  if (moveCallsToResolve.length) {
    await Promise.all(
      moveCallsToResolve.map(async (moveCall) => {
        const parameters = moveFunctionParameters.get(
          `${moveCall.package}::${moveCall.module}::${moveCall.function}`
        );
        if (!parameters) {
          return;
        }
        const hasTxContext = parameters.length > 0 && isTxContext(parameters.at(-1));
        const params = hasTxContext ? parameters.slice(0, parameters.length - 1) : parameters;
        moveCall._argumentTypes = params;
      })
    );
  }
  commands.forEach((command) => {
    if (!command.MoveCall) {
      return;
    }
    const moveCall = command.MoveCall;
    const fnName = `${moveCall.package}::${moveCall.module}::${moveCall.function}`;
    const params = moveCall._argumentTypes;
    if (!params) {
      return;
    }
    if (params.length !== command.MoveCall.arguments.length) {
      throw new Error(`Incorrect number of arguments for ${fnName}`);
    }
    params.forEach((param, i) => {
      const arg = moveCall.arguments[i];
      if (arg.$kind !== "Input") return;
      const input = inputs[arg.Input];
      if (!input.UnresolvedPure && !input.UnresolvedObject) {
        return;
      }
      const inputValue = input.UnresolvedPure?.value ?? input.UnresolvedObject?.objectId;
      const schema = getPureBcsSchema(param.body);
      if (schema) {
        arg.type = "pure";
        inputs[inputs.indexOf(input)] = Inputs.Pure(schema.serialize(inputValue));
        return;
      }
      if (typeof inputValue !== "string") {
        throw new Error(
          `Expect the argument to be an object id string, got ${JSON.stringify(
            inputValue,
            null,
            2
          )}`
        );
      }
      arg.type = "object";
      const unresolvedObject = input.UnresolvedPure ? {
        $kind: "UnresolvedObject",
        UnresolvedObject: {
          objectId: inputValue
        }
      } : input;
      inputs[arg.Input] = unresolvedObject;
    });
  });
}
function validate(transactionData) {
  transactionData.inputs.forEach((input, index) => {
    if (input.$kind !== "Object" && input.$kind !== "Pure") {
      throw new Error(
        `Input at index ${index} has not been resolved.  Expected a Pure or Object input, but found ${JSON.stringify(
          input
        )}`
      );
    }
  });
}
function normalizeRawArgument(arg, schema, transactionData) {
  if (arg.$kind !== "Input") {
    return;
  }
  const input = transactionData.inputs[arg.Input];
  if (input.$kind !== "UnresolvedPure") {
    return;
  }
  transactionData.inputs[arg.Input] = Inputs.Pure(schema.serialize(input.UnresolvedPure.value));
}
function isUsedAsMutable(transactionData, index) {
  let usedAsMutable = false;
  transactionData.getInputUses(index, (arg, tx) => {
    if (tx.MoveCall && tx.MoveCall._argumentTypes) {
      const argIndex = tx.MoveCall.arguments.indexOf(arg);
      usedAsMutable = tx.MoveCall._argumentTypes[argIndex].ref !== "&" || usedAsMutable;
    }
    if (tx.$kind === "MakeMoveVec" || tx.$kind === "MergeCoins" || tx.$kind === "SplitCoins") {
      usedAsMutable = true;
    }
  });
  return usedAsMutable;
}
function isUsedAsReceiving(transactionData, index) {
  let usedAsReceiving = false;
  transactionData.getInputUses(index, (arg, tx) => {
    if (tx.MoveCall && tx.MoveCall._argumentTypes) {
      const argIndex = tx.MoveCall.arguments.indexOf(arg);
      usedAsReceiving = isReceivingType(tx.MoveCall._argumentTypes[argIndex]) || usedAsReceiving;
    }
  });
  return usedAsReceiving;
}
function isReceivingType(type) {
  if (typeof type.body !== "object" || !("datatype" in type.body)) {
    return false;
  }
  return type.body.datatype.package === "0x2" && type.body.datatype.module === "transfer" && type.body.datatype.type === "Receiving";
}
function getClient(options) {
  if (!options.client) {
    throw new Error(
      `No sui client passed to Transaction#build, but transaction data was not sufficient to build offline.`
    );
  }
  return options.client;
}
function chunk(arr, size) {
  return Array.from(
    { length: Math.ceil(arr.length / size) },
    (_, i) => arr.slice(i * size, i * size + size)
  );
}

// ../../node_modules/@mysten/sui/dist/esm/transactions/object.js
function createObjectMethods(makeObject) {
  function object2(value) {
    return makeObject(value);
  }
  object2.system = () => object2("0x5");
  object2.clock = () => object2("0x6");
  object2.random = () => object2("0x8");
  object2.denyList = () => object2("0x403");
  object2.option = ({ type, value }) => (tx) => tx.moveCall({
    typeArguments: [type],
    target: `0x1::option::${value === null ? "none" : "some"}`,
    arguments: value === null ? [] : [tx.object(value)]
  });
  return object2;
}

// ../../node_modules/@mysten/sui/dist/esm/transactions/pure.js
function createPure(makePure) {
  function pure(typeOrSerializedValue, value) {
    if (typeof typeOrSerializedValue === "string") {
      return makePure(schemaFromName(typeOrSerializedValue).serialize(value));
    }
    if (typeOrSerializedValue instanceof Uint8Array || isSerializedBcs(typeOrSerializedValue)) {
      return makePure(typeOrSerializedValue);
    }
    throw new Error("tx.pure must be called either a bcs type name, or a serialized bcs value");
  }
  pure.u8 = (value) => makePure(suiBcs.U8.serialize(value));
  pure.u16 = (value) => makePure(suiBcs.U16.serialize(value));
  pure.u32 = (value) => makePure(suiBcs.U32.serialize(value));
  pure.u64 = (value) => makePure(suiBcs.U64.serialize(value));
  pure.u128 = (value) => makePure(suiBcs.U128.serialize(value));
  pure.u256 = (value) => makePure(suiBcs.U256.serialize(value));
  pure.bool = (value) => makePure(suiBcs.Bool.serialize(value));
  pure.string = (value) => makePure(suiBcs.String.serialize(value));
  pure.address = (value) => makePure(suiBcs.Address.serialize(value));
  pure.id = pure.address;
  pure.vector = (type, value) => {
    return makePure(suiBcs.vector(schemaFromName(type)).serialize(value));
  };
  pure.option = (type, value) => {
    return makePure(suiBcs.option(schemaFromName(type)).serialize(value));
  };
  return pure;
}
function schemaFromName(name) {
  switch (name) {
    case "u8":
      return suiBcs.u8();
    case "u16":
      return suiBcs.u16();
    case "u32":
      return suiBcs.u32();
    case "u64":
      return suiBcs.u64();
    case "u128":
      return suiBcs.u128();
    case "u256":
      return suiBcs.u256();
    case "bool":
      return suiBcs.bool();
    case "string":
      return suiBcs.string();
    case "id":
    case "address":
      return suiBcs.Address;
  }
  const generic = name.match(/^(vector|option)<(.+)>$/);
  if (generic) {
    const [kind, inner] = generic.slice(1);
    if (kind === "vector") {
      return suiBcs.vector(schemaFromName(inner));
    } else {
      return suiBcs.option(schemaFromName(inner));
    }
  }
  throw new Error(`Invalid Pure type name: ${name}`);
}

// ../../node_modules/@mysten/sui/dist/esm/transactions/hash.js
function hashTypedData(typeTag, data2) {
  const typeTagBytes = Array.from(`${typeTag}::`).map((e) => e.charCodeAt(0));
  const dataWithTag = new Uint8Array(typeTagBytes.length + data2.length);
  dataWithTag.set(typeTagBytes);
  dataWithTag.set(data2, typeTagBytes.length);
  return blake2b(dataWithTag, { dkLen: 32 });
}

// ../../node_modules/@mysten/sui/dist/esm/transactions/TransactionData.js
function prepareSuiAddress(address) {
  return normalizeSuiAddress(address).replace("0x", "");
}
var TransactionDataBuilder = class _TransactionDataBuilder {
  constructor(clone) {
    this.version = 2;
    this.sender = clone?.sender ?? null;
    this.expiration = clone?.expiration ?? null;
    this.inputs = clone?.inputs ?? [];
    this.commands = clone?.commands ?? [];
    this.gasData = clone?.gasData ?? {
      budget: null,
      price: null,
      owner: null,
      payment: null
    };
  }
  static fromKindBytes(bytes) {
    const kind = suiBcs.TransactionKind.parse(bytes);
    const programmableTx = kind.ProgrammableTransaction;
    if (!programmableTx) {
      throw new Error("Unable to deserialize from bytes.");
    }
    return _TransactionDataBuilder.restore({
      version: 2,
      sender: null,
      expiration: null,
      gasData: {
        budget: null,
        owner: null,
        payment: null,
        price: null
      },
      inputs: programmableTx.inputs,
      commands: programmableTx.commands
    });
  }
  static fromBytes(bytes) {
    const rawData = suiBcs.TransactionData.parse(bytes);
    const data2 = rawData?.V1;
    const programmableTx = data2.kind.ProgrammableTransaction;
    if (!data2 || !programmableTx) {
      throw new Error("Unable to deserialize from bytes.");
    }
    return _TransactionDataBuilder.restore({
      version: 2,
      sender: data2.sender,
      expiration: data2.expiration,
      gasData: data2.gasData,
      inputs: programmableTx.inputs,
      commands: programmableTx.commands
    });
  }
  static restore(data2) {
    if (data2.version === 2) {
      return new _TransactionDataBuilder(parse(TransactionData2, data2));
    } else {
      return new _TransactionDataBuilder(parse(TransactionData2, transactionDataFromV1(data2)));
    }
  }
  /**
   * Generate transaction digest.
   *
   * @param bytes BCS serialized transaction data
   * @returns transaction digest.
   */
  static getDigestFromBytes(bytes) {
    const hash = hashTypedData("TransactionData", bytes);
    return toBase58(hash);
  }
  // @deprecated use gasData instead
  get gasConfig() {
    return this.gasData;
  }
  // @deprecated use gasData instead
  set gasConfig(value) {
    this.gasData = value;
  }
  build({
    maxSizeBytes = Infinity,
    overrides,
    onlyTransactionKind
  } = {}) {
    const inputs = this.inputs;
    const commands = this.commands;
    const kind = {
      ProgrammableTransaction: {
        inputs,
        commands
      }
    };
    if (onlyTransactionKind) {
      return suiBcs.TransactionKind.serialize(kind, { maxSize: maxSizeBytes }).toBytes();
    }
    const expiration = overrides?.expiration ?? this.expiration;
    const sender = overrides?.sender ?? this.sender;
    const gasData = { ...this.gasData, ...overrides?.gasConfig, ...overrides?.gasData };
    if (!sender) {
      throw new Error("Missing transaction sender");
    }
    if (!gasData.budget) {
      throw new Error("Missing gas budget");
    }
    if (!gasData.payment) {
      throw new Error("Missing gas payment");
    }
    if (!gasData.price) {
      throw new Error("Missing gas price");
    }
    const transactionData = {
      sender: prepareSuiAddress(sender),
      expiration: expiration ? expiration : { None: true },
      gasData: {
        payment: gasData.payment,
        owner: prepareSuiAddress(this.gasData.owner ?? sender),
        price: BigInt(gasData.price),
        budget: BigInt(gasData.budget)
      },
      kind: {
        ProgrammableTransaction: {
          inputs,
          commands
        }
      }
    };
    return suiBcs.TransactionData.serialize(
      { V1: transactionData },
      { maxSize: maxSizeBytes }
    ).toBytes();
  }
  addInput(type, arg) {
    const index = this.inputs.length;
    this.inputs.push(arg);
    return { Input: index, type, $kind: "Input" };
  }
  getInputUses(index, fn) {
    this.mapArguments((arg, command) => {
      if (arg.$kind === "Input" && arg.Input === index) {
        fn(arg, command);
      }
      return arg;
    });
  }
  mapArguments(fn) {
    for (const command of this.commands) {
      switch (command.$kind) {
        case "MoveCall":
          command.MoveCall.arguments = command.MoveCall.arguments.map((arg) => fn(arg, command));
          break;
        case "TransferObjects":
          command.TransferObjects.objects = command.TransferObjects.objects.map(
            (arg) => fn(arg, command)
          );
          command.TransferObjects.address = fn(command.TransferObjects.address, command);
          break;
        case "SplitCoins":
          command.SplitCoins.coin = fn(command.SplitCoins.coin, command);
          command.SplitCoins.amounts = command.SplitCoins.amounts.map((arg) => fn(arg, command));
          break;
        case "MergeCoins":
          command.MergeCoins.destination = fn(command.MergeCoins.destination, command);
          command.MergeCoins.sources = command.MergeCoins.sources.map((arg) => fn(arg, command));
          break;
        case "MakeMoveVec":
          command.MakeMoveVec.elements = command.MakeMoveVec.elements.map(
            (arg) => fn(arg, command)
          );
          break;
        case "Upgrade":
          command.Upgrade.ticket = fn(command.Upgrade.ticket, command);
          break;
        case "$Intent":
          const inputs = command.$Intent.inputs;
          command.$Intent.inputs = {};
          for (const [key, value] of Object.entries(inputs)) {
            command.$Intent.inputs[key] = Array.isArray(value) ? value.map((arg) => fn(arg, command)) : fn(value, command);
          }
          break;
        case "Publish":
          break;
        default:
          throw new Error(`Unexpected transaction kind: ${command.$kind}`);
      }
    }
  }
  replaceCommand(index, replacement) {
    if (!Array.isArray(replacement)) {
      this.commands[index] = replacement;
      return;
    }
    const sizeDiff = replacement.length - 1;
    this.commands.splice(index, 1, ...replacement);
    if (sizeDiff !== 0) {
      this.mapArguments((arg) => {
        switch (arg.$kind) {
          case "Result":
            if (arg.Result > index) {
              arg.Result += sizeDiff;
            }
            break;
          case "NestedResult":
            if (arg.NestedResult[0] > index) {
              arg.NestedResult[0] += sizeDiff;
            }
            break;
        }
        return arg;
      });
    }
  }
  getDigest() {
    const bytes = this.build({ onlyTransactionKind: false });
    return _TransactionDataBuilder.getDigestFromBytes(bytes);
  }
  snapshot() {
    return parse(TransactionData2, this);
  }
};

// ../../node_modules/@mysten/sui/dist/esm/transactions/utils.js
function getIdFromCallArg(arg) {
  if (typeof arg === "string") {
    return normalizeSuiAddress(arg);
  }
  if (arg.Object) {
    if (arg.Object.ImmOrOwnedObject) {
      return normalizeSuiAddress(arg.Object.ImmOrOwnedObject.objectId);
    }
    if (arg.Object.Receiving) {
      return normalizeSuiAddress(arg.Object.Receiving.objectId);
    }
    return normalizeSuiAddress(arg.Object.SharedObject.objectId);
  }
  if (arg.UnresolvedObject) {
    return normalizeSuiAddress(arg.UnresolvedObject.objectId);
  }
  return void 0;
}

// ../../node_modules/@mysten/sui/dist/esm/transactions/Transaction.js
var __typeError4 = (msg) => {
  throw TypeError(msg);
};
var __accessCheck4 = (obj, member, msg) => member.has(obj) || __typeError4("Cannot " + msg);
var __privateGet4 = (obj, member, getter) => (__accessCheck4(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd4 = (obj, member, value) => member.has(obj) ? __typeError4("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet4 = (obj, member, value, setter) => (__accessCheck4(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod3 = (obj, member, method) => (__accessCheck4(obj, member, "access private method"), method);
var _serializationPlugins;
var _buildPlugins;
var _intentResolvers;
var _data;
var _Transaction_instances;
var normalizeTransactionArgument_fn;
var resolveArgument_fn;
var prepareBuild_fn;
var runPlugins_fn;
function createTransactionResult(index, length = Infinity) {
  const baseResult = { $kind: "Result", Result: index };
  const nestedResults = [];
  const nestedResultFor = (resultIndex) => nestedResults[resultIndex] ?? (nestedResults[resultIndex] = {
    $kind: "NestedResult",
    NestedResult: [index, resultIndex]
  });
  return new Proxy(baseResult, {
    set() {
      throw new Error(
        "The transaction result is a proxy, and does not support setting properties directly"
      );
    },
    // TODO: Instead of making this return a concrete argument, we should ideally
    // make it reference-based (so that this gets resolved at build-time), which
    // allows re-ordering transactions.
    get(target, property) {
      if (property in target) {
        return Reflect.get(target, property);
      }
      if (property === Symbol.iterator) {
        return function* () {
          let i = 0;
          while (i < length) {
            yield nestedResultFor(i);
            i++;
          }
        };
      }
      if (typeof property === "symbol") return;
      const resultIndex = parseInt(property, 10);
      if (Number.isNaN(resultIndex) || resultIndex < 0) return;
      return nestedResultFor(resultIndex);
    }
  });
}
var TRANSACTION_BRAND = Symbol.for("@mysten/transaction");
function isTransaction(obj) {
  return !!obj && typeof obj === "object" && obj[TRANSACTION_BRAND] === true;
}
var modulePluginRegistry = {
  buildPlugins: /* @__PURE__ */ new Map(),
  serializationPlugins: /* @__PURE__ */ new Map()
};
var TRANSACTION_REGISTRY_KEY = Symbol.for("@mysten/transaction/registry");
function getGlobalPluginRegistry() {
  try {
    const target = globalThis;
    if (!target[TRANSACTION_REGISTRY_KEY]) {
      target[TRANSACTION_REGISTRY_KEY] = modulePluginRegistry;
    }
    return target[TRANSACTION_REGISTRY_KEY];
  } catch (e) {
    return modulePluginRegistry;
  }
}
var _Transaction = class _Transaction2 {
  constructor() {
    __privateAdd4(this, _Transaction_instances);
    __privateAdd4(this, _serializationPlugins);
    __privateAdd4(this, _buildPlugins);
    __privateAdd4(this, _intentResolvers, /* @__PURE__ */ new Map());
    __privateAdd4(this, _data);
    this.object = createObjectMethods(
      (value) => {
        if (typeof value === "function") {
          return this.object(value(this));
        }
        if (typeof value === "object" && is(Argument2, value)) {
          return value;
        }
        const id = getIdFromCallArg(value);
        const inserted = __privateGet4(this, _data).inputs.find((i) => id === getIdFromCallArg(i));
        if (inserted?.Object?.SharedObject && typeof value === "object" && value.Object?.SharedObject) {
          inserted.Object.SharedObject.mutable = inserted.Object.SharedObject.mutable || value.Object.SharedObject.mutable;
        }
        return inserted ? { $kind: "Input", Input: __privateGet4(this, _data).inputs.indexOf(inserted), type: "object" } : __privateGet4(this, _data).addInput(
          "object",
          typeof value === "string" ? {
            $kind: "UnresolvedObject",
            UnresolvedObject: { objectId: normalizeSuiAddress(value) }
          } : value
        );
      }
    );
    const globalPlugins = getGlobalPluginRegistry();
    __privateSet4(this, _data, new TransactionDataBuilder());
    __privateSet4(this, _buildPlugins, [...globalPlugins.buildPlugins.values()]);
    __privateSet4(this, _serializationPlugins, [...globalPlugins.serializationPlugins.values()]);
  }
  /**
   * Converts from a serialize transaction kind (built with `build({ onlyTransactionKind: true })`) to a `Transaction` class.
   * Supports either a byte array, or base64-encoded bytes.
   */
  static fromKind(serialized) {
    const tx = new _Transaction2();
    __privateSet4(tx, _data, TransactionDataBuilder.fromKindBytes(
      typeof serialized === "string" ? fromBase64(serialized) : serialized
    ));
    return tx;
  }
  /**
   * Converts from a serialized transaction format to a `Transaction` class.
   * There are two supported serialized formats:
   * - A string returned from `Transaction#serialize`. The serialized format must be compatible, or it will throw an error.
   * - A byte array (or base64-encoded bytes) containing BCS transaction data.
   */
  static from(transaction) {
    const newTransaction = new _Transaction2();
    if (isTransaction(transaction)) {
      __privateSet4(newTransaction, _data, new TransactionDataBuilder(transaction.getData()));
    } else if (typeof transaction !== "string" || !transaction.startsWith("{")) {
      __privateSet4(newTransaction, _data, TransactionDataBuilder.fromBytes(
        typeof transaction === "string" ? fromBase64(transaction) : transaction
      ));
    } else {
      __privateSet4(newTransaction, _data, TransactionDataBuilder.restore(JSON.parse(transaction)));
    }
    return newTransaction;
  }
  static registerGlobalSerializationPlugin(stepOrStep, step) {
    getGlobalPluginRegistry().serializationPlugins.set(
      stepOrStep,
      step ?? stepOrStep
    );
  }
  static unregisterGlobalSerializationPlugin(name) {
    getGlobalPluginRegistry().serializationPlugins.delete(name);
  }
  static registerGlobalBuildPlugin(stepOrStep, step) {
    getGlobalPluginRegistry().buildPlugins.set(
      stepOrStep,
      step ?? stepOrStep
    );
  }
  static unregisterGlobalBuildPlugin(name) {
    getGlobalPluginRegistry().buildPlugins.delete(name);
  }
  addSerializationPlugin(step) {
    __privateGet4(this, _serializationPlugins).push(step);
  }
  addBuildPlugin(step) {
    __privateGet4(this, _buildPlugins).push(step);
  }
  addIntentResolver(intent, resolver) {
    if (__privateGet4(this, _intentResolvers).has(intent) && __privateGet4(this, _intentResolvers).get(intent) !== resolver) {
      throw new Error(`Intent resolver for ${intent} already exists`);
    }
    __privateGet4(this, _intentResolvers).set(intent, resolver);
  }
  setSender(sender) {
    __privateGet4(this, _data).sender = sender;
  }
  /**
   * Sets the sender only if it has not already been set.
   * This is useful for sponsored transaction flows where the sender may not be the same as the signer address.
   */
  setSenderIfNotSet(sender) {
    if (!__privateGet4(this, _data).sender) {
      __privateGet4(this, _data).sender = sender;
    }
  }
  setExpiration(expiration) {
    __privateGet4(this, _data).expiration = expiration ? parse(TransactionExpiration2, expiration) : null;
  }
  setGasPrice(price) {
    __privateGet4(this, _data).gasConfig.price = String(price);
  }
  setGasBudget(budget) {
    __privateGet4(this, _data).gasConfig.budget = String(budget);
  }
  setGasBudgetIfNotSet(budget) {
    if (__privateGet4(this, _data).gasData.budget == null) {
      __privateGet4(this, _data).gasConfig.budget = String(budget);
    }
  }
  setGasOwner(owner) {
    __privateGet4(this, _data).gasConfig.owner = owner;
  }
  setGasPayment(payments) {
    __privateGet4(this, _data).gasConfig.payment = payments.map((payment) => parse(ObjectRef, payment));
  }
  /** @deprecated Use `getData()` instead. */
  get blockData() {
    return serializeV1TransactionData(__privateGet4(this, _data).snapshot());
  }
  /** Get a snapshot of the transaction data, in JSON form: */
  getData() {
    return __privateGet4(this, _data).snapshot();
  }
  // Used to brand transaction classes so that they can be identified, even between multiple copies
  // of the builder.
  get [TRANSACTION_BRAND]() {
    return true;
  }
  // Temporary workaround for the wallet interface accidentally serializing transactions via postMessage
  get pure() {
    Object.defineProperty(this, "pure", {
      enumerable: false,
      value: createPure((value) => {
        if (isSerializedBcs(value)) {
          return __privateGet4(this, _data).addInput("pure", {
            $kind: "Pure",
            Pure: {
              bytes: value.toBase64()
            }
          });
        }
        return __privateGet4(this, _data).addInput(
          "pure",
          is(NormalizedCallArg, value) ? parse(NormalizedCallArg, value) : value instanceof Uint8Array ? Inputs.Pure(value) : { $kind: "UnresolvedPure", UnresolvedPure: { value } }
        );
      })
    });
    return this.pure;
  }
  /** Returns an argument for the gas coin, to be used in a transaction. */
  get gas() {
    return { $kind: "GasCoin", GasCoin: true };
  }
  /**
   * Add a new object input to the transaction using the fully-resolved object reference.
   * If you only have an object ID, use `builder.object(id)` instead.
   */
  objectRef(...args) {
    return this.object(Inputs.ObjectRef(...args));
  }
  /**
   * Add a new receiving input to the transaction using the fully-resolved object reference.
   * If you only have an object ID, use `builder.object(id)` instead.
   */
  receivingRef(...args) {
    return this.object(Inputs.ReceivingRef(...args));
  }
  /**
   * Add a new shared object input to the transaction using the fully-resolved shared object reference.
   * If you only have an object ID, use `builder.object(id)` instead.
   */
  sharedObjectRef(...args) {
    return this.object(Inputs.SharedObjectRef(...args));
  }
  /** Add a transaction to the transaction */
  add(command) {
    if (typeof command === "function") {
      return command(this);
    }
    const index = __privateGet4(this, _data).commands.push(command);
    return createTransactionResult(index - 1);
  }
  // Method shorthands:
  splitCoins(coin, amounts) {
    const command = Commands.SplitCoins(
      typeof coin === "string" ? this.object(coin) : __privateMethod3(this, _Transaction_instances, resolveArgument_fn).call(this, coin),
      amounts.map(
        (amount) => typeof amount === "number" || typeof amount === "bigint" || typeof amount === "string" ? this.pure.u64(amount) : __privateMethod3(this, _Transaction_instances, normalizeTransactionArgument_fn).call(this, amount)
      )
    );
    const index = __privateGet4(this, _data).commands.push(command);
    return createTransactionResult(index - 1, amounts.length);
  }
  mergeCoins(destination, sources) {
    return this.add(
      Commands.MergeCoins(
        this.object(destination),
        sources.map((src) => this.object(src))
      )
    );
  }
  publish({ modules, dependencies }) {
    return this.add(
      Commands.Publish({
        modules,
        dependencies
      })
    );
  }
  upgrade({
    modules,
    dependencies,
    package: packageId,
    ticket
  }) {
    return this.add(
      Commands.Upgrade({
        modules,
        dependencies,
        package: packageId,
        ticket: this.object(ticket)
      })
    );
  }
  moveCall({
    arguments: args,
    ...input
  }) {
    return this.add(
      Commands.MoveCall({
        ...input,
        arguments: args?.map((arg) => __privateMethod3(this, _Transaction_instances, normalizeTransactionArgument_fn).call(this, arg))
      })
    );
  }
  transferObjects(objects, address) {
    return this.add(
      Commands.TransferObjects(
        objects.map((obj) => this.object(obj)),
        typeof address === "string" ? this.pure.address(address) : __privateMethod3(this, _Transaction_instances, normalizeTransactionArgument_fn).call(this, address)
      )
    );
  }
  makeMoveVec({
    type,
    elements
  }) {
    return this.add(
      Commands.MakeMoveVec({
        type,
        elements: elements.map((obj) => this.object(obj))
      })
    );
  }
  /**
   * @deprecated Use toJSON instead.
   * For synchronous serialization, you can use `getData()`
   * */
  serialize() {
    return JSON.stringify(serializeV1TransactionData(__privateGet4(this, _data).snapshot()));
  }
  async toJSON(options = {}) {
    await this.prepareForSerialization(options);
    return JSON.stringify(
      parse(SerializedTransactionDataV2, __privateGet4(this, _data).snapshot()),
      (_key, value) => typeof value === "bigint" ? value.toString() : value,
      2
    );
  }
  /** Build the transaction to BCS bytes, and sign it with the provided keypair. */
  async sign(options) {
    const { signer, ...buildOptions } = options;
    const bytes = await this.build(buildOptions);
    return signer.signTransaction(bytes);
  }
  /** Build the transaction to BCS bytes. */
  async build(options = {}) {
    await this.prepareForSerialization(options);
    await __privateMethod3(this, _Transaction_instances, prepareBuild_fn).call(this, options);
    return __privateGet4(this, _data).build({
      onlyTransactionKind: options.onlyTransactionKind
    });
  }
  /** Derive transaction digest */
  async getDigest(options = {}) {
    await __privateMethod3(this, _Transaction_instances, prepareBuild_fn).call(this, options);
    return __privateGet4(this, _data).getDigest();
  }
  async prepareForSerialization(options) {
    const intents = /* @__PURE__ */ new Set();
    for (const command of __privateGet4(this, _data).commands) {
      if (command.$Intent) {
        intents.add(command.$Intent.name);
      }
    }
    const steps = [...__privateGet4(this, _serializationPlugins)];
    for (const intent of intents) {
      if (options.supportedIntents?.includes(intent)) {
        continue;
      }
      if (!__privateGet4(this, _intentResolvers).has(intent)) {
        throw new Error(`Missing intent resolver for ${intent}`);
      }
      steps.push(__privateGet4(this, _intentResolvers).get(intent));
    }
    await __privateMethod3(this, _Transaction_instances, runPlugins_fn).call(this, steps, options);
  }
};
_serializationPlugins = /* @__PURE__ */ new WeakMap();
_buildPlugins = /* @__PURE__ */ new WeakMap();
_intentResolvers = /* @__PURE__ */ new WeakMap();
_data = /* @__PURE__ */ new WeakMap();
_Transaction_instances = /* @__PURE__ */ new WeakSet();
normalizeTransactionArgument_fn = function(arg) {
  if (isSerializedBcs(arg)) {
    return this.pure(arg);
  }
  return __privateMethod3(this, _Transaction_instances, resolveArgument_fn).call(this, arg);
};
resolveArgument_fn = function(arg) {
  if (typeof arg === "function") {
    return parse(Argument2, arg(this));
  }
  return parse(Argument2, arg);
};
prepareBuild_fn = async function(options) {
  if (!options.onlyTransactionKind && !__privateGet4(this, _data).sender) {
    throw new Error("Missing transaction sender");
  }
  await __privateMethod3(this, _Transaction_instances, runPlugins_fn).call(this, [...__privateGet4(this, _buildPlugins), resolveTransactionData], options);
};
runPlugins_fn = async function(plugins, options) {
  const createNext = (i) => {
    if (i >= plugins.length) {
      return () => {
      };
    }
    const plugin = plugins[i];
    return async () => {
      const next = createNext(i + 1);
      let calledNext = false;
      let nextResolved = false;
      await plugin(__privateGet4(this, _data), options, async () => {
        if (calledNext) {
          throw new Error(`next() was call multiple times in TransactionPlugin ${i}`);
        }
        calledNext = true;
        await next();
        nextResolved = true;
      });
      if (!calledNext) {
        throw new Error(`next() was not called in TransactionPlugin ${i}`);
      }
      if (!nextResolved) {
        throw new Error(`next() was not awaited in TransactionPlugin ${i}`);
      }
    };
  };
  await createNext(0)();
};

// ../../node_modules/@mysten/sui/dist/esm/client/client.js
var SUI_CLIENT_BRAND = Symbol.for("@mysten/SuiClient");
var SuiClient = class {
  get [SUI_CLIENT_BRAND]() {
    return true;
  }
  /**
   * Establish a connection to a Sui RPC endpoint
   *
   * @param options configuration options for the API Client
   */
  constructor(options) {
    this.transport = options.transport ?? new SuiHTTPTransport({ url: options.url });
  }
  async getRpcApiVersion() {
    const resp = await this.transport.request({
      method: "rpc.discover",
      params: []
    });
    return resp.info.version;
  }
  /**
   * Get all Coin<`coin_type`> objects owned by an address.
   */
  async getCoins(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
      throw new Error("Invalid Sui address");
    }
    return await this.transport.request({
      method: "suix_getCoins",
      params: [input.owner, input.coinType, input.cursor, input.limit]
    });
  }
  /**
   * Get all Coin objects owned by an address.
   */
  async getAllCoins(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
      throw new Error("Invalid Sui address");
    }
    return await this.transport.request({
      method: "suix_getAllCoins",
      params: [input.owner, input.cursor, input.limit]
    });
  }
  /**
   * Get the total coin balance for one coin type, owned by the address owner.
   */
  async getBalance(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
      throw new Error("Invalid Sui address");
    }
    return await this.transport.request({
      method: "suix_getBalance",
      params: [input.owner, input.coinType]
    });
  }
  /**
   * Get the total coin balance for all coin types, owned by the address owner.
   */
  async getAllBalances(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
      throw new Error("Invalid Sui address");
    }
    return await this.transport.request({ method: "suix_getAllBalances", params: [input.owner] });
  }
  /**
   * Fetch CoinMetadata for a given coin type
   */
  async getCoinMetadata(input) {
    return await this.transport.request({
      method: "suix_getCoinMetadata",
      params: [input.coinType]
    });
  }
  /**
   *  Fetch total supply for a coin
   */
  async getTotalSupply(input) {
    return await this.transport.request({
      method: "suix_getTotalSupply",
      params: [input.coinType]
    });
  }
  /**
   * Invoke any RPC method
   * @param method the method to be invoked
   * @param args the arguments to be passed to the RPC request
   */
  async call(method, params) {
    return await this.transport.request({ method, params });
  }
  /**
   * Get Move function argument types like read, write and full access
   */
  async getMoveFunctionArgTypes(input) {
    return await this.transport.request({
      method: "sui_getMoveFunctionArgTypes",
      params: [input.package, input.module, input.function]
    });
  }
  /**
   * Get a map from module name to
   * structured representations of Move modules
   */
  async getNormalizedMoveModulesByPackage(input) {
    return await this.transport.request({
      method: "sui_getNormalizedMoveModulesByPackage",
      params: [input.package]
    });
  }
  /**
   * Get a structured representation of Move module
   */
  async getNormalizedMoveModule(input) {
    return await this.transport.request({
      method: "sui_getNormalizedMoveModule",
      params: [input.package, input.module]
    });
  }
  /**
   * Get a structured representation of Move function
   */
  async getNormalizedMoveFunction(input) {
    return await this.transport.request({
      method: "sui_getNormalizedMoveFunction",
      params: [input.package, input.module, input.function]
    });
  }
  /**
   * Get a structured representation of Move struct
   */
  async getNormalizedMoveStruct(input) {
    return await this.transport.request({
      method: "sui_getNormalizedMoveStruct",
      params: [input.package, input.module, input.struct]
    });
  }
  /**
   * Get all objects owned by an address
   */
  async getOwnedObjects(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
      throw new Error("Invalid Sui address");
    }
    return await this.transport.request({
      method: "suix_getOwnedObjects",
      params: [
        input.owner,
        {
          filter: input.filter,
          options: input.options
        },
        input.cursor,
        input.limit
      ]
    });
  }
  /**
   * Get details about an object
   */
  async getObject(input) {
    if (!input.id || !isValidSuiObjectId(normalizeSuiObjectId(input.id))) {
      throw new Error("Invalid Sui Object id");
    }
    return await this.transport.request({
      method: "sui_getObject",
      params: [input.id, input.options]
    });
  }
  async tryGetPastObject(input) {
    return await this.transport.request({
      method: "sui_tryGetPastObject",
      params: [input.id, input.version, input.options]
    });
  }
  /**
   * Batch get details about a list of objects. If any of the object ids are duplicates the call will fail
   */
  async multiGetObjects(input) {
    input.ids.forEach((id) => {
      if (!id || !isValidSuiObjectId(normalizeSuiObjectId(id))) {
        throw new Error(`Invalid Sui Object id ${id}`);
      }
    });
    const hasDuplicates = input.ids.length !== new Set(input.ids).size;
    if (hasDuplicates) {
      throw new Error(`Duplicate object ids in batch call ${input.ids}`);
    }
    return await this.transport.request({
      method: "sui_multiGetObjects",
      params: [input.ids, input.options]
    });
  }
  /**
   * Get transaction blocks for a given query criteria
   */
  async queryTransactionBlocks(input) {
    return await this.transport.request({
      method: "suix_queryTransactionBlocks",
      params: [
        {
          filter: input.filter,
          options: input.options
        },
        input.cursor,
        input.limit,
        (input.order || "descending") === "descending"
      ]
    });
  }
  async getTransactionBlock(input) {
    if (!isValidTransactionDigest(input.digest)) {
      throw new Error("Invalid Transaction digest");
    }
    return await this.transport.request({
      method: "sui_getTransactionBlock",
      params: [input.digest, input.options]
    });
  }
  async multiGetTransactionBlocks(input) {
    input.digests.forEach((d) => {
      if (!isValidTransactionDigest(d)) {
        throw new Error(`Invalid Transaction digest ${d}`);
      }
    });
    const hasDuplicates = input.digests.length !== new Set(input.digests).size;
    if (hasDuplicates) {
      throw new Error(`Duplicate digests in batch call ${input.digests}`);
    }
    return await this.transport.request({
      method: "sui_multiGetTransactionBlocks",
      params: [input.digests, input.options]
    });
  }
  async executeTransactionBlock({
    transactionBlock,
    signature,
    options,
    requestType
  }) {
    const result = await this.transport.request({
      method: "sui_executeTransactionBlock",
      params: [
        typeof transactionBlock === "string" ? transactionBlock : toBase64(transactionBlock),
        Array.isArray(signature) ? signature : [signature],
        options
      ]
    });
    if (requestType === "WaitForLocalExecution") {
      try {
        await this.waitForTransaction({
          digest: result.digest
        });
      } catch (_) {
      }
    }
    return result;
  }
  async signAndExecuteTransaction({
    transaction,
    signer,
    ...input
  }) {
    let transactionBytes;
    if (transaction instanceof Uint8Array) {
      transactionBytes = transaction;
    } else {
      transaction.setSenderIfNotSet(signer.toSuiAddress());
      transactionBytes = await transaction.build({ client: this });
    }
    const { signature, bytes } = await signer.signTransaction(transactionBytes);
    return this.executeTransactionBlock({
      transactionBlock: bytes,
      signature,
      ...input
    });
  }
  /**
   * Get total number of transactions
   */
  async getTotalTransactionBlocks() {
    const resp = await this.transport.request({
      method: "sui_getTotalTransactionBlocks",
      params: []
    });
    return BigInt(resp);
  }
  /**
   * Getting the reference gas price for the network
   */
  async getReferenceGasPrice() {
    const resp = await this.transport.request({
      method: "suix_getReferenceGasPrice",
      params: []
    });
    return BigInt(resp);
  }
  /**
   * Return the delegated stakes for an address
   */
  async getStakes(input) {
    if (!input.owner || !isValidSuiAddress(normalizeSuiAddress(input.owner))) {
      throw new Error("Invalid Sui address");
    }
    return await this.transport.request({ method: "suix_getStakes", params: [input.owner] });
  }
  /**
   * Return the delegated stakes queried by id.
   */
  async getStakesByIds(input) {
    input.stakedSuiIds.forEach((id) => {
      if (!id || !isValidSuiObjectId(normalizeSuiObjectId(id))) {
        throw new Error(`Invalid Sui Stake id ${id}`);
      }
    });
    return await this.transport.request({
      method: "suix_getStakesByIds",
      params: [input.stakedSuiIds]
    });
  }
  /**
   * Return the latest system state content.
   */
  async getLatestSuiSystemState() {
    return await this.transport.request({ method: "suix_getLatestSuiSystemState", params: [] });
  }
  /**
   * Get events for a given query criteria
   */
  async queryEvents(input) {
    return await this.transport.request({
      method: "suix_queryEvents",
      params: [
        input.query,
        input.cursor,
        input.limit,
        (input.order || "descending") === "descending"
      ]
    });
  }
  /**
   * Subscribe to get notifications whenever an event matching the filter occurs
   *
   * @deprecated
   */
  async subscribeEvent(input) {
    return this.transport.subscribe({
      method: "suix_subscribeEvent",
      unsubscribe: "suix_unsubscribeEvent",
      params: [input.filter],
      onMessage: input.onMessage
    });
  }
  /**
   * @deprecated
   */
  async subscribeTransaction(input) {
    return this.transport.subscribe({
      method: "suix_subscribeTransaction",
      unsubscribe: "suix_unsubscribeTransaction",
      params: [input.filter],
      onMessage: input.onMessage
    });
  }
  /**
   * Runs the transaction block in dev-inspect mode. Which allows for nearly any
   * transaction (or Move call) with any arguments. Detailed results are
   * provided, including both the transaction effects and any return values.
   */
  async devInspectTransactionBlock(input) {
    let devInspectTxBytes;
    if (isTransaction(input.transactionBlock)) {
      input.transactionBlock.setSenderIfNotSet(input.sender);
      devInspectTxBytes = toBase64(
        await input.transactionBlock.build({
          client: this,
          onlyTransactionKind: true
        })
      );
    } else if (typeof input.transactionBlock === "string") {
      devInspectTxBytes = input.transactionBlock;
    } else if (input.transactionBlock instanceof Uint8Array) {
      devInspectTxBytes = toBase64(input.transactionBlock);
    } else {
      throw new Error("Unknown transaction block format.");
    }
    return await this.transport.request({
      method: "sui_devInspectTransactionBlock",
      params: [input.sender, devInspectTxBytes, input.gasPrice?.toString(), input.epoch]
    });
  }
  /**
   * Dry run a transaction block and return the result.
   */
  async dryRunTransactionBlock(input) {
    return await this.transport.request({
      method: "sui_dryRunTransactionBlock",
      params: [
        typeof input.transactionBlock === "string" ? input.transactionBlock : toBase64(input.transactionBlock)
      ]
    });
  }
  /**
   * Return the list of dynamic field objects owned by an object
   */
  async getDynamicFields(input) {
    if (!input.parentId || !isValidSuiObjectId(normalizeSuiObjectId(input.parentId))) {
      throw new Error("Invalid Sui Object id");
    }
    return await this.transport.request({
      method: "suix_getDynamicFields",
      params: [input.parentId, input.cursor, input.limit]
    });
  }
  /**
   * Return the dynamic field object information for a specified object
   */
  async getDynamicFieldObject(input) {
    return await this.transport.request({
      method: "suix_getDynamicFieldObject",
      params: [input.parentId, input.name]
    });
  }
  /**
   * Get the sequence number of the latest checkpoint that has been executed
   */
  async getLatestCheckpointSequenceNumber() {
    const resp = await this.transport.request({
      method: "sui_getLatestCheckpointSequenceNumber",
      params: []
    });
    return String(resp);
  }
  /**
   * Returns information about a given checkpoint
   */
  async getCheckpoint(input) {
    return await this.transport.request({ method: "sui_getCheckpoint", params: [input.id] });
  }
  /**
   * Returns historical checkpoints paginated
   */
  async getCheckpoints(input) {
    return await this.transport.request({
      method: "sui_getCheckpoints",
      params: [input.cursor, input?.limit, input.descendingOrder]
    });
  }
  /**
   * Return the committee information for the asked epoch
   */
  async getCommitteeInfo(input) {
    return await this.transport.request({
      method: "suix_getCommitteeInfo",
      params: [input?.epoch]
    });
  }
  async getNetworkMetrics() {
    return await this.transport.request({ method: "suix_getNetworkMetrics", params: [] });
  }
  async getAddressMetrics() {
    return await this.transport.request({ method: "suix_getLatestAddressMetrics", params: [] });
  }
  async getEpochMetrics(input) {
    return await this.transport.request({
      method: "suix_getEpochMetrics",
      params: [input?.cursor, input?.limit, input?.descendingOrder]
    });
  }
  async getAllEpochAddressMetrics(input) {
    return await this.transport.request({
      method: "suix_getAllEpochAddressMetrics",
      params: [input?.descendingOrder]
    });
  }
  /**
   * Return the committee information for the asked epoch
   */
  async getEpochs(input) {
    return await this.transport.request({
      method: "suix_getEpochs",
      params: [input?.cursor, input?.limit, input?.descendingOrder]
    });
  }
  /**
   * Returns list of top move calls by usage
   */
  async getMoveCallMetrics() {
    return await this.transport.request({ method: "suix_getMoveCallMetrics", params: [] });
  }
  /**
   * Return the committee information for the asked epoch
   */
  async getCurrentEpoch() {
    return await this.transport.request({ method: "suix_getCurrentEpoch", params: [] });
  }
  /**
   * Return the Validators APYs
   */
  async getValidatorsApy() {
    return await this.transport.request({ method: "suix_getValidatorsApy", params: [] });
  }
  // TODO: Migrate this to `sui_getChainIdentifier` once it is widely available.
  async getChainIdentifier() {
    const checkpoint = await this.getCheckpoint({ id: "0" });
    const bytes = fromBase58(checkpoint.digest);
    return toHex(bytes.slice(0, 4));
  }
  async resolveNameServiceAddress(input) {
    return await this.transport.request({
      method: "suix_resolveNameServiceAddress",
      params: [input.name]
    });
  }
  async resolveNameServiceNames({
    format = "dot",
    ...input
  }) {
    const { nextCursor, hasNextPage, data: data2 } = await this.transport.request({
      method: "suix_resolveNameServiceNames",
      params: [input.address, input.cursor, input.limit]
    });
    return {
      hasNextPage,
      nextCursor,
      data: data2.map((name) => normalizeSuiNSName(name, format))
    };
  }
  async getProtocolConfig(input) {
    return await this.transport.request({
      method: "sui_getProtocolConfig",
      params: [input?.version]
    });
  }
  /**
   * Wait for a transaction block result to be available over the API.
   * This can be used in conjunction with `executeTransactionBlock` to wait for the transaction to
   * be available via the API.
   * This currently polls the `getTransactionBlock` API to check for the transaction.
   */
  async waitForTransaction({
    signal,
    timeout = 60 * 1e3,
    pollInterval = 2 * 1e3,
    ...input
  }) {
    const timeoutSignal = AbortSignal.timeout(timeout);
    const timeoutPromise = new Promise((_, reject) => {
      timeoutSignal.addEventListener("abort", () => reject(timeoutSignal.reason));
    });
    timeoutPromise.catch(() => {
    });
    while (!timeoutSignal.aborted) {
      signal?.throwIfAborted();
      try {
        return await this.getTransactionBlock(input);
      } catch (e) {
        await Promise.race([
          new Promise((resolve) => setTimeout(resolve, pollInterval)),
          timeoutPromise
        ]);
      }
    }
    timeoutSignal.throwIfAborted();
    throw new Error("Unexpected error while waiting for transaction block.");
  }
};

// src/providers/coinMetaDataSui.ts
var suiClient = new SuiClient({
  url: "https://fullnode.mainnet.sui.io"
  // Hoặc testnet/devnet nếu cần
});
async function getInfoTokenOnSui(coinType) {
  try {
    const metadata = await suiClient.getCoinMetadata({ coinType });
    return metadata;
  } catch (error) {
    console.log(error);
    return "ADDRESS_NOT_EXIST";
  }
}

// src/providers/getImageOnSuiScan.ts
import axios3 from "axios";
async function getImageOnSuiScan(tokenAddress) {
  try {
    const response = await axios3.get(`https://suiscan.xyz/api/sui-backend/mainnet/api/coins/${tokenAddress}`);
    console.log(response.data);
    return response.data.iconUrl;
  } catch (error) {
    console.log(error);
    return "ADDRESS_NOT_EXIST";
  }
}

// src/actions/swapByAddress.ts
var swapTemplate2 = `Please extract the following swap details for SUI network:

{
    "inputTokenAddress": string | null,     // Token being sold (e.g. "0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::uni::UNI")
    "outputTokenAddress": string | null,    // Token being bought
    "amount": number | 0,               // Amount to swap
}

Recent messages: {{recentMessages}}

Extract the swap parameters from the conversation and wallet context above. Return only a JSON object with the specified fields. Use null for any values that cannot be determined.

Example response:
{
    "inputTokenAddress": "0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::uni::UNI",
    "outputTokenAddress": "0xb6a9f896fd6c0f777699b9aa2b1bb745caa5eb1f3978173c1ddffd4bdd3994e9::suicy::SUICY",
    "amount": 1.5,
}
\`\`\`
VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON


`;
var executeSwapByAddress = {
  name: "SUI_EXECUTE_SWAP_BY_ADDRESS",
  similes: ["SUI_SWAP_TOKENS_BY_ADDRESS", "SUI_TOKEN_SWAP_BY_ADDRESS", "SUI_TRADE_TOKENS_BY_ADDRESS", "SUI_EXCHANGE_TOKENS_BY_ADDRESS"],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Perform a token swap.",
  handler: async (runtime, message, state, _options2, callback) => {
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const swapContext = composeContext7({
      state,
      template: swapTemplate2
    });
    const content = await generateObjectDeprecated6({
      runtime,
      context: swapContext,
      modelClass: ModelClass7.LARGE
    });
    console.log("content:", content);
    const inputTokenObject = await getInfoTokenOnSui(content.inputTokenAddress);
    if (inputTokenObject === "ADDRESS_NOT_EXIST") {
      callback({
        text: `We do not support ${content.inputTokenAddress} token in SUI network yet, We only support swapping token symbol to token symbol or token address to token address.`
      });
      return false;
    }
    const outputTokenObject = await getInfoTokenOnSui(content.outputTokenAddress);
    if (outputTokenObject === "ADDRESS_NOT_EXIST") {
      callback({
        text: `We do not support ${content.outputTokenAddress} token in SUI network yet, We only support swapping token symbol to token symbol or token address to token address.`
      });
      return false;
    }
    const responseData = {
      amount: content.amount,
      fromToken: {
        ...inputTokenObject,
        type: content.inputTokenAddress,
        imgUrl: await getImageOnSuiScan(content.inputTokenAddress)
      },
      toToken: {
        ...outputTokenObject,
        type: content.outputTokenAddress,
        imgUrl: await getImageOnSuiScan(content.outputTokenAddress)
      }
    };
    try {
      callback({
        text: `Please double-check all details before swapping to avoid any loss`,
        action: "SUI_EXECUTE_SWAP_BY_ADDRESS",
        result: {
          type: "swap",
          data: responseData
        }
      });
      return true;
    } catch (error) {
      console.error("Error during token swap:", error);
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          inputTokenSymbol: "SUI",
          outputTokenSymbol: "USDT",
          amount: 10,
          slippageBps: 50
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Initiating swap of 10 SUI for USDT on SUI network...",
          action: "SUI_EXECUTE_SWAP_BY_SYMBOL",
          params: {
            inputType: "0x2::sui::SUI",
            outputType: "0x4fb3c0f9e62b5d3956e2f0e284f2a5d128954750b109203a0f34c92c6ba21247::coin::USDT",
            amount: "10000000000",
            // Amount in base units
            slippageBps: 50
          }
        }
      }
    ]
  ]
};

// src/actions/sendTokenBySymbol.ts
import {
  composeContext as composeContext8,
  generateObjectDeprecated as generateObjectDeprecated7,
  ModelClass as ModelClass8
} from "@elizaos/core";
var sendTokenTemplate = `Please extract the following swap details for SUI network:

{
    "amount": number | 0,               // Amount of tokens to transfer
    "tokenSymbol": string | null,          // Token symbol on the SUI network (e.g., "SUI", "UNI")
    "destinationAddress": string | null    // Recipient's wallet address
}

Recent messages: {{recentMessages}}

Extract the token transfer parameters from the conversation and wallet context above. Return only a JSON object with the specified fields. Use null for any values that cannot be determined.

Example Response:
{
    "amount": 10.5,
    "tokenSymbol": "UNI",
    "destinationAddress": "0xa3b1c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0"
}
\`\`\`
VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON


`;
var sendTokenBySymbol = {
  name: "SUI_SEND_TOKEN_BY_SYMBOL",
  similes: [
    "SUI_TRANSFER_TOKENS_BY_SYMBOL",
    "SUI_TOKENS_SEND_BY_SYMBOL",
    "SUI_ASSET_SEND_BY_SYMBOL",
    "SUI_TOKENS_TRANSFER_BY_SYMBOL",
    "SUI_SEND_ASSETS_BY_SYMBOL",
    "SUI_TOKENS_TRANSFER_BY_SYMBOL",
    "SUI_ASSET_TRANSFER_BY_SYMBOL",
    "SUI_TOKENS_DISPATCH_BY_SYMBOL",
    "SUI_SEND_ASSETS_BY_SYMBOL",
    "SUI_TOKENS_SHIP_BY_SYMBOL",
    "SUI_TOKENS_DELIVER_BY_SYMBOL",
    "SUI_ASSET_SHIP_BY_SYMBOL",
    "SUI_TOKENS_SEND_OUT_BY_SYMBOL",
    "SUI_ASSET_DISPATCH_BY_SYMBOL",
    "SUI_ASSET_TRANSFER_OUT_BY_SYMBOL",
    "SUI_TOKENS_SEND_OUT_BY_SYMBOL",
    "SUI_ASSETS_DELIVER_BY_SYMBOL"
  ],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Perform a token swap.",
  handler: async (runtime, message, state, _options2, callback) => {
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const sendTokenContext = composeContext8({
      state,
      template: sendTokenTemplate
    });
    const content = await generateObjectDeprecated7({
      runtime,
      context: sendTokenContext,
      modelClass: ModelClass8.LARGE
    });
    console.log("content:", content);
    const tokenObject = await searchCoinInAggre_default(content.tokenSymbol);
    if (!tokenObject) {
      callback({
        text: `We do not support ${content.inputTokenSymbol} token in SUI network yet. However, if your token is supported, we can proceed with sending tokens using the token's address `
      });
      return false;
    }
    const checkSuiAddress = await isValidSuiAddress(content.destinationAddress);
    if (!checkSuiAddress) {
      callback({
        text: `This wallet address ${content.destinationAddress} does not exist. Please enter a valid one.`,
        action: "SUI_SEND_TOKEN_BY_SYMBOL"
      });
      return false;
    }
    const responseData = {
      amount: content.amount,
      token_info: tokenObject,
      destinationAddress: content.destinationAddress
    };
    try {
      callback({
        text: `Please double-check all details before swapping to avoid any loss`,
        action: "SUI_SEND_TOKEN_BY_SYMBOL",
        result: {
          type: "send_sui_chain",
          data: responseData
        }
      });
      return true;
    } catch (error) {
      console.error("Error during token swap:", error);
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          "amount": 10.5,
          "tokenSymbol": "UNI",
          "destinationAddress": "0xa3b1c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Send 10 UNI to 0xa3b1c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0",
          action: "SUI_EXECUTE_SWAP_BY_SYMBOL",
          params: {
            "amount": 10.5,
            "tokenSymbol": "UNI",
            "destinationAddress": "0xa3b1c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0"
          }
        }
      }
    ]
  ]
};

// src/actions/checkInfoTxHash.ts
import {
  composeContext as composeContext9,
  generateObjectDeprecated as generateObjectDeprecated8,
  ModelClass as ModelClass9
} from "@elizaos/core";

// src/providers/checkTxHash.ts
var client = new SuiClient({ url: getFullnodeUrl("mainnet") });
async function getTransactionInfo(txHash) {
  try {
    const txDetails = await client.getTransactionBlock({
      digest: txHash,
      options: {
        showEffects: true,
        showInput: true,
        showEvents: true
      }
    });
    return txDetails;
  } catch (error) {
    console.log("getTransactionInfo ", error);
    throw Error("ERR_CHECK_TXHASH");
  }
}

// src/actions/checkInfoTxHash.ts
var checkTxHashTemplate = `Please extract the following swap details for SUI network:

{
    "txHash": string  | null                // txHash is transaction block on sui network
}

Recent messages: {{recentMessages}}

Retrieve and return the transaction details using the given txHash. The response should be a JSON object with the specified field. If the txHash is unavailable or invalid, return null.

Example response:
{
    "txHash": "3JKomKRrX1cWeHiy4KHDcHMY66b2MyAdrMJqy2E5AV1D"
}
\`\`\`
VALIDATION RULES:
            All property names must use double quotes
            All string values must use double quotes
            null values should not use quotes
            No trailing commas allowed
            No single quotes anywhere in the JSON


`;
var checkTxhashOnSui = {
  name: "CHECK_TXHASH_SUI_NETWORK",
  similes: [
    "SUI_VERIFY_TXHASH",
    "SUI_GET_TRANSACTION_DETAILS",
    "SUI_LOOKUP_TXHASH",
    "SUI_FETCH_TXHASH_INFO",
    "SUI_QUERY_TRANSACTION",
    "SUI_CHECK_TX_STATUS",
    "SUI_INSPECT_TXHASH",
    "SUI_RETRIEVE_TXHASH_DATA",
    "SUI_ANALYZE_TRANSACTION",
    "SUI_SCAN_TXHASH"
  ],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Perform a token swap.",
  handler: async (runtime, message, state, _options2, callback) => {
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const checkTxHashContext = composeContext9({
      state,
      template: checkTxHashTemplate
    });
    const content = await generateObjectDeprecated8({
      runtime,
      context: checkTxHashContext,
      modelClass: ModelClass9.SMALL
    });
    console.log("content:", content);
    const checkInfoTxHash = await getTransactionInfo(content.txHash);
    try {
      callback({
        text: `Your transaction status for txhash ${content.txHash} is ${checkInfoTxHash.effects.status.status}.`,
        action: "CHECK_TXHASH_SUI_NETWORK",
        result: {
          type: "info_txhash",
          data: checkInfoTxHash
        }
      });
      return true;
    } catch (error) {
      callback({
        text: `Your transaction for txhash ${content.txHash} is not available.`,
        action: "CHECK_TXHASH_SUI_NETWORK"
      });
      console.error("Error during token swap:", error);
      return false;
    }
  },
  examples: [
    [
      {
        "user": "{{user1}}",
        "content": {
          "txHash": "9XbGmKRrX2cYeHiY4LJDdHNY77c3MzBrMKpxz3F5BV2E"
        }
      },
      {
        "user": "{{user2}}",
        "content": {
          "text": "Fetching transaction details for txHash: 9XbGmKRrX2cYeHiY4LJDdHNY77c3MzBrMKpxz3F5BV2E...",
          "action": "SUI_CHECK_TXHASH",
          "params": {
            "txHash": "9XbGmKRrX2cYeHiY4LJDdHNY77c3MzBrMKpxz3F5BV2E"
          }
        }
      }
    ],
    [
      {
        "user": "{{user1}}",
        "content": {
          "txHash": "9XbGmKRrX2cYeHiY4LJDdHNY77c3MzBrMKpxz3F5BV2E"
        }
      },
      {
        "user": "{{user2}}",
        "content": {
          "text": "check txhash 3LvEnUFK7qxTU4Wh3CwgUhJJowiuMAiyNhyMDpteAknC",
          "action": "SUI_CHECK_TXHASH",
          "params": {
            "txHash": "3LvEnUFK7qxTU4Wh3CwgUhJJowiuMAiyNhyMDpteAknC"
          }
        }
      }
    ]
  ]
};

// src/actions/infoChain.ts
import {
  ModelClass as ModelClass10,
  composeContext as composeContext10,
  elizaLogger as elizaLogger7,
  generateObjectDeprecated as generateObjectDeprecated9
} from "@elizaos/core";
var chainInfoTemplate = `"Give me detailed information about [Blockchain Name], including its consensus mechanism, block time, average transaction fees, number of nodes, scalability, and key projects running on this chain."

Extracted Text to Display Outside Chat:

"Detailed Information About [Blockchain Name]:

Consensus Mechanism:
Block Time:
Average Transaction Fees:
Number of Nodes:
Scalability:
Key Projects Running on This Chain:"`;
var chainInfo = {
  name: "SUI_GET_CHAIN_INFO",
  similes: [
    "SUI_GET_NETWORK_INFO"
  ],
  examples: [],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Get detailed information about a blockchain network.",
  handler: async (runtime, message, state, _options2, callback) => {
    elizaLogger7.log("[tokenInfo]");
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const _context = composeContext10({
      state,
      template: chainInfoTemplate
    });
    const content = await generateObjectDeprecated9({
      runtime,
      context: _context,
      modelClass: ModelClass10.MEDIUM
    });
    console.log("content", content);
    if (callback) {
      callback({
        text: content
      });
    }
    return true;
  }
};

// src/index.ts
var suimarketPlugin = {
  name: "suimarketPlugin",
  description: "Everything about Sui blockchain",
  actions: [
    chainInfo,
    topMarkets,
    trendingTokens,
    coinInfo,
    // topAiTokens,
    searchSuiTokenSymbol,
    suiTokenInfo,
    executeSwap,
    executeSwapByAddress,
    sendTokenBySymbol,
    checkTxhashOnSui
  ],
  evaluators: [],
  providers: []
};
var index_default = suimarketPlugin;
export {
  index_default as default,
  suimarketPlugin
};
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
//# sourceMappingURL=index.js.map