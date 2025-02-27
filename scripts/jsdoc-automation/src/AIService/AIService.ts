//import { AzureOpenAIInput, ChatOpenAI, ChatOpenAIResponseFormat, ChatOpenAIStructuredOutputMethodOptions, ClientOptions, LegacyOpenAIInput, OpenAIChatInput, OpenAIClient, OpenAIToolChoice } from "@langchain/openai";
import dotenv from "dotenv";
import type { Configuration } from "../Configuration.js";

// import { TypeScriptParser } from "../TypeScriptParser.js";
// This is the retriever we will use in RAG
import { CodeFormatter } from "./utils/CodeFormatter.js";
import { DocumentOrganizer } from "./utils/DocumentOrganizer.js";
//import { CustomErrorParams, InputTypeOfTupleWithRest, IssueData, OutputTypeOfTupleWithRest, ParseParams, ParsePathComponent, ParseStatus, RefinementCtx, RefinementEffect, SafeParseReturnType, z, ZodBranded, ZodCatch, ZodCustomIssue, ZodDefault, ZodEffects, ZodError, ZodIntersection, ZodInvalidArgumentsIssue, ZodInvalidDateIssue, ZodInvalidEnumValueIssue, ZodInvalidIntersectionTypesIssue, ZodInvalidLiteralIssue, ZodInvalidReturnTypeIssue, ZodInvalidStringIssue, ZodInvalidUnionDiscriminatorIssue, ZodInvalidUnionIssue, ZodIssueBase, ZodIssueCode, ZodNotFiniteIssue, ZodNotMultipleOfIssue, ZodOptionalDef, ZodParsedType, ZodPipeline, ZodPromise, ZodReadonly, ZodTooBigIssue, ZodTooSmallIssue, ZodTupleDef, ZodUnion, ZodUnrecognizedKeysIssue } from "zod";

//export declare type InputTypeOfTupleWithRest<T extends ZodTupleItems | [], Rest extends ZodTypeAny | null = null> = Rest extends ZodTypeAny ? [...InputTypeOfTuple<T>, ...Rest["_input"][]] : InputTypeOfTuple<T>;

export declare type InputTypeOfTuple<T extends ZodTupleItems | []> = AssertArray<{
    [k in keyof T]: T[k] extends ZodType<any, any, any> ? T[k]["_input"] : never;
}>;

type stripPath<T> = T extends `${infer _Start}/${infer Rest}` ? stripPath<Rest> : T;
//export declare type OutputTypeOfTupleWithRest<T extends ZodTupleItems | [], Rest extends ZodTypeAny | null = null> = Rest extends ZodTypeAny ? [...OutputTypeOfTuple<T>, ...Rest["_output"][]] : OutputTypeOfTuple<T>;
export declare type ParseParams = {
    path: (string | number)[];
    errorMap: ZodErrorMap;
    async: boolean;
};
export declare type ParsePathComponent = string | number;
export declare class ParseStatus {
    value: "aborted" | "dirty" | "valid";
    dirty(): void;
    abort(): void;
    static mergeArray(status: ParseStatus, results: SyncParseReturnType<any>[]): SyncParseReturnType;
    static mergeObjectAsync(status: ParseStatus, pairs: {
        key: ParseReturnType<any>;
        value: ParseReturnType<any>;
    }[]): Promise<SyncParseReturnType<any>>;
    static mergeObjectSync(status: ParseStatus, pairs: {
        key: SyncParseReturnType<any>;
        value: SyncParseReturnType<any>;
        alwaysSet?: boolean;
    }[]): SyncParseReturnType;
}
export declare type IssueData = stripPath<ZodIssueOptionalMessage> & {
    path?: (string | number)[];
    fatal?: boolean;
};
export interface RefinementCtx {
    addIssue: (arg: IssueData) => void;
    path: (string | number)[];
}

export declare type RefinementEffect<T> = {
    type: "refinement";
    refinement: (arg: T, ctx: RefinementCtx) => any;
};
//export declare class ZodBranded<T extends ZodTypeAny, B extends string | number | symbol> extends ZodType<T["_output"] & BRAND<B>, ZodBrandedDef<T>, T["_input"]> {
    //_parse(input: ParseInput): ParseReturnType<any>;
//    unwrap(): T;
//}
// export declare class ZodCatch<T extends ZodTypeAny> extends ZodType<T["_output"], ZodCatchDef<T>, unknown> {
//     _parse(input: ParseInput): ParseReturnType<this["_output"]>;
//     removeCatch(): T;
//     static create: <T_1 extends ZodTypeAny>(type: T_1, params: {
//         errorMap?: ZodErrorMap | undefined;
//         invalid_type_error?: string | undefined;
//         required_error?: string | undefined;
//         message?: string | undefined;
//         description?: string | undefined;
//     } & {
//         catch: T_1["_output"] | (() => T_1["_output"]);
//     }) => ZodCatch<T_1>;
// }
export interface ZodCustomIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.custom;
    params?: {
        [k: string]: any;
    };
}
export declare type SafeParseReturnType<Input, Output> = SafeParseSuccess<Output> | SafeParseError<Input>;
import { 
    AssertArray,
       BRAND,
       InputTypeOfTupleWithRest,
       
       OutputTypeOfTuple,
       SafeParseError,
       SafeParseSuccess,
       z,
       ZodBrandedDef,
       ZodCatchDef,
       ZodDefault,
       ZodEffects,
       ZodError,
       ZodIntersection,
       ZodIssueBase,
       ZodIssueCode,
       ZodNullable,
       ZodOptionalDef,
              ZodPipeline,
       ZodPromise,
       ZodReadonly,
       ZodTupleDef,
       ZodType,
       ZodUnion
    // ZodDefault, ZodEffects, ZodError, ZodIntersection,
    //  ZodInvalidArgumentsIssue, ZodInvalidDateIssue, ZodInvalidEnumValueIssue,
    //  ZodInvalidIntersectionTypesIssue, ZodInvalidLiteralIssue, ZodInvalidReturnTypeIssue,
    //  ZodInvalidStringIssue, ZodInvalidUnionDiscriminatorIssue, ZodInvalidUnionIssue,
    //  ZodIssueBase, ZodIssueCode, ZodNotFiniteIssue, ZodNotMultipleOfIssue,
    //  ZodOptionalDef, ZodParsedType, ZodPipeline, 
    // ZodPromise, ZodReadonly, ZodTooBigIssue,
    //  ZodTooSmallIssue, ZodTupleDef, ZodUnion, ZodUnrecognizedKeysIssue 
    } from "zod";
import { AsyncCaller } from "langsmith/dist/utils/async_caller.js";
import { ClientOptions } from "ws";
    export declare type CustomErrorParams = Partial<util.Omit<ZodCustomIssue, "code">>;
//import { ZodInvalidTypeIssue, ZodTypeDef } from "zod";
export interface ZodTypeDef {
    errorMap?: ZodErrorMap;
    description?: string;
}
export interface ZodInvalidTypeIssue extends ZodIssueBase {
    code: typeof ZodIssueCode.invalid_type;
    expected: ZodParsedType;
    received: ZodParsedType;
}
export interface AsyncLocalStorageInterface {
    getStore: () => any | undefined;
  
    run: <T>(store: any, callback: () => T) => T;
  
    enterWith: (store: any) => void;
  }
  export const TRACING_ALS_KEY = Symbol.for("ls:tracing_async_local_storage");
export const getGlobalAsyncLocalStorageInstance = ():
  | AsyncLocalStorageInterface
  | undefined => {
  return (globalThis as any)[TRACING_ALS_KEY];
};
export const setGlobalAsyncLocalStorageInstance = (
    instance: AsyncLocalStorageInterface
  ) => {
    (globalThis as any)[TRACING_ALS_KEY] = instance;
  };
export async function consumeCallback<T>(
    promiseFn: () => Promise<T> | T | void,
    wait: boolean
  ): Promise<void> {
    //
  }
  
export class BaseRunManager {
  constructor(
    public readonly runId: string,
    public readonly handlers: BaseCallbackHandler[],
    protected readonly inheritableHandlers: BaseCallbackHandler[],
    protected readonly tags: string[],
    protected readonly inheritableTags: string[],
    protected readonly metadata: Record<string, unknown>,
    protected readonly inheritableMetadata: Record<string, unknown>,
    protected readonly _parentRunId?: string
  ) {}

  get parentRunId() {
    return this._parentRunId;
  }

  async handleText(text: string): Promise<void> {
    await Promise.all(
      this.handlers.map((handler) =>
        consumeCallback(async () => {
          try {
            await handler.handleText?.(
              text,
              this.runId,
              this._parentRunId,
              this.tags
            );
          } catch (err) {
            const logFunction = handler.raiseError
              ? console.error
              : console.warn;
            logFunction(
              `Error in handler ${handler.constructor.name}, handleText: ${err}`
            );
            if (handler.raiseError) {
              throw err;
            }
          }
        }, handler.awaitHandlers)
      )
    );
  }

  async handleCustomEvent(
    eventName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    _runId?: string,
    _tags?: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _metadata?: Record<string, any>
  ): Promise<void> {
    await Promise.all(
      this.handlers.map((handler) =>
        consumeCallback(async () => {
          try {
            await handler.handleCustomEvent?.(
              eventName,
              data,
              this.runId,
              this.tags,
              this.metadata
            );
          } catch (err) {
            const logFunction = handler.raiseError
              ? console.error
              : console.warn;
            logFunction(
              `Error in handler ${handler.constructor.name}, handleCustomEvent: ${err}`
            );
            if (handler.raiseError) {
              throw err;
            }
          }
        }, handler.awaitHandlers)
      )
    );
  }
}
export class CallbackManagerForChainRun
  extends BaseRunManager
  implements BaseCallbackManagerMethods
{
  getChild(tag?: string): CallbackManager {
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const manager = new CallbackManager(this.runId);
    manager.setHandlers(this.inheritableHandlers);
    manager.addTags(this.inheritableTags);
    manager.addMetadata(this.inheritableMetadata);
    if (tag) {
      manager.addTags([tag], false);
    }
    return manager;
  }

  async handleChainError(
    err: Error | unknown,
    _runId?: string,
    _parentRunId?: string,
    _tags?: string[],
    kwargs?: { inputs?: Record<string, unknown> }
  ): Promise<void> {
    await Promise.all(
      this.handlers.map((handler) =>
        consumeCallback(async () => {
          if (!handler.ignoreChain) {
            try {
              await handler.handleChainError?.(
                err,
                this.runId,
                this._parentRunId,
                this.tags,
                kwargs
              );
            } catch (err) {
              const logFunction = handler.raiseError
                ? console.error
                : console.warn;
              logFunction(
                `Error in handler ${handler.constructor.name}, handleChainError: ${err}`
              );
              if (handler.raiseError) {
                throw err;
              }
            }
          }
        }, handler.awaitHandlers)
      )
    );
  }

  async handleChainEnd(
    output: ChainValues,
    _runId?: string,
    _parentRunId?: string,
    _tags?: string[],
    kwargs?: { inputs?: Record<string, unknown> }
  ): Promise<void> {
    await Promise.all(
      this.handlers.map((handler) =>
        consumeCallback(async () => {
          if (!handler.ignoreChain) {
            try {
              await handler.handleChainEnd?.(
                output,
                this.runId,
                this._parentRunId,
                this.tags,
                kwargs
              );
            } catch (err) {
              const logFunction = handler.raiseError
                ? console.error
                : console.warn;
              logFunction(
                `Error in handler ${handler.constructor.name}, handleChainEnd: ${err}`
              );
              if (handler.raiseError) {
                throw err;
              }
            }
          }
        }, handler.awaitHandlers)
      )
    );
  }

  async handleAgentAction(action: AgentAction): Promise<void> {
    await Promise.all(
      this.handlers.map((handler) =>
        consumeCallback(async () => {
          if (!handler.ignoreAgent) {
            try {
              await handler.handleAgentAction?.(
                action,
                this.runId,
                this._parentRunId,
                this.tags
              );
            } catch (err) {
              const logFunction = handler.raiseError
                ? console.error
                : console.warn;
              logFunction(
                `Error in handler ${handler.constructor.name}, handleAgentAction: ${err}`
              );
              if (handler.raiseError) {
                throw err;
              }
            }
          }
        }, handler.awaitHandlers)
      )
    );
  }

  async handleAgentEnd(action: AgentFinish): Promise<void> {
    await Promise.all(
      this.handlers.map((handler) =>
        consumeCallback(async () => {
          if (!handler.ignoreAgent) {
            try {
              await handler.handleAgentEnd?.(
                action,
                this.runId,
                this._parentRunId,
                this.tags
              );
            } catch (err) {
              const logFunction = handler.raiseError
                ? console.error
                : console.warn;
              logFunction(
                `Error in handler ${handler.constructor.name}, handleAgentEnd: ${err}`
              );
              if (handler.raiseError) {
                throw err;
              }
            }
          }
        }, handler.awaitHandlers)
      )
    );
  }
}
// import { wrapOpenAI } from "langsmith/wrappers";
//import { FakeListChatModel } from "@langchain/core/utils/testing";
//import { AIMessageChunk, BaseMessage, BaseMessageChunk, BaseMessageLike } from "@langchain/core/messages";
//import { ChatGenerationChunk, ChatResult, LLMResult } from "@langchain/core/outputs";
//import { BaseChatModel, BaseChatModelParams, LangSmithParams } from "@langchain/core/language_models/chat_models";
//import { CallbackManager, CallbackManagerForChainRun, CallbackManagerForLLMRun } from "@langchain/core/callbacks/manager";
export declare type CatchallOutput<T extends ZodType> = ZodType extends T ? unknown : {
    [k: string]: T["_output"];
};
export declare type ZodIssue = ZodIssueOptionalMessage & {
    fatal?: boolean;
    message: string;
};
export interface ParseContext {
    readonly common: {
        readonly issues: ZodIssue[];
        readonly contextualErrorMap?: ZodErrorMap;
        readonly async: boolean;
    };
    readonly path: ParsePath;
    readonly schemaErrorMap?: ZodErrorMap;
    readonly parent: ParseContext | null;
    readonly data: any;
    readonly parsedType: ZodParsedType;
}
export declare type PassthroughType<T extends UnknownKeysParam> = T extends "passthrough" ? {
    [k: string]: unknown;
} : unknown;
// export declare class ZodArray<T extends ZodTypeAny, Cardinality extends ArrayCardinality = "many"> extends ZodType<arrayOutputType<T, Cardinality>, ZodArrayDef<T>, Cardinality extends "atleastone" ? [T["_input"], ...T["_input"][]] : T["_input"][]> {
//     _parse(input: ParseInput): ParseReturnType<this["_output"]>;
//     get element(): T;
//     min(minLength: number, message?: errorUtil.ErrMessage): this;
//     max(maxLength: number, message?: errorUtil.ErrMessage): this;
//     length(len: number, message?: errorUtil.ErrMessage): this;
//     nonempty(message?: errorUtil.ErrMessage): ZodArray<T, "atleastone">;
//     static create: <T_1 extends ZodTypeAny>(schema: T_1, params?: RawCreateParams) => ZodArray<T_1, "many">;
// }
//declare function createZodEnum<U extends string, T extends Readonly<[U, ...U[]]>>(values: T, params?: RawCreateParams): ZodEnum<Writeable<T>>;
//declare function createZodEnum<U extends string, T extends [U, ...U[]]>(values: T, params?: RawCreateParams): ZodEnum<T>;
// export declare class ZodEnum<T extends [string, ...string[]]> extends ZodType<T[number], ZodEnumDef<T>, T[number]> {
//     #private;
//     _parse(input: ParseInput): ParseReturnType<this["_output"]>;
//     get options(): T;
//     get enum(): Values<T>;
//     get Values(): Values<T>;
//     get Enum(): Values<T>;
//     extract<ToExtract extends readonly [T[number], ...T[number][]]>(values: ToExtract, newDef?: RawCreateParams): ZodEnum<Writeable<ToExtract>>;
//     exclude<ToExclude extends readonly [T[number], ...T[number][]]>(values: ToExclude, newDef?: RawCreateParams): ZodEnum<typecast<Writeable<FilterEnum<T, ToExclude[number]>>, [string, ...string[]]>>;
//     static create: typeof createZodEnum;
// }

export declare type ZodErrorMap = (issue: ZodIssueOptionalMessage, _ctx: ErrorMapCtx) => {
    message: string;
};
// export declare class ZodNullable<T extends ZodTypeAny> extends ZodType<T["_output"] | null, ZodNullableDef<T>, T["_input"] | null> {
//     _parse(input: ParseInput): ParseReturnType<this["_output"]>;
//     unwrap(): T;
//     static create: <T_1 extends ZodTypeAny>(type: T_1, params?: RawCreateParams) => ZodNullable<T_1>;
// }
export declare type typecast<A, T> = A extends T ? A : never;
export declare type Values<T extends EnumValues> = {
    [k in T[number]]: k;
};
export declare type Writeable<T> = {
    -readonly [P in keyof T]: T[P];
};
export interface ZodArrayDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    type: T;
    typeName: ZodFirstPartyTypeKind.ZodArray;
    exactLength: {
        value: number;
        message?: string;
    } | null;
    minLength: {
        value: number;
        message?: string;
    } | null;
    maxLength: {
        value: number;
        message?: string;
    } | null;
}
export declare enum ZodFirstPartyTypeKind {
    ZodString = "ZodString",
    ZodNumber = "ZodNumber",
    ZodNaN = "ZodNaN",
    ZodBigInt = "ZodBigInt",
    ZodBoolean = "ZodBoolean",
    ZodDate = "ZodDate",
    ZodSymbol = "ZodSymbol",
    ZodUndefined = "ZodUndefined",
    ZodNull = "ZodNull",
    ZodAny = "ZodAny",
    ZodUnknown = "ZodUnknown",
    ZodNever = "ZodNever",
    ZodVoid = "ZodVoid",
    ZodArray = "ZodArray",
    ZodObject = "ZodObject",
    ZodUnion = "ZodUnion",
    ZodDiscriminatedUnion = "ZodDiscriminatedUnion",
    ZodIntersection = "ZodIntersection",
    ZodTuple = "ZodTuple",
    ZodRecord = "ZodRecord",
    ZodMap = "ZodMap",
    ZodSet = "ZodSet",
    ZodFunction = "ZodFunction",
    ZodLazy = "ZodLazy",
    ZodLiteral = "ZodLiteral",
    ZodEnum = "ZodEnum",
    ZodEffects = "ZodEffects",
    ZodNativeEnum = "ZodNativeEnum",
    ZodOptional = "ZodOptional",
    ZodNullable = "ZodNullable",
    ZodDefault = "ZodDefault",
    ZodCatch = "ZodCatch",
    ZodPromise = "ZodPromise",
    ZodBranded = "ZodBranded",
    ZodPipeline = "ZodPipeline",
    ZodReadonly = "ZodReadonly"
}
export declare type EnumValues<T extends string = string> = readonly [T, ...T[]];
export interface ZodEnumDef<T extends EnumValues = EnumValues> extends ZodTypeDef {
    values: T;
    typeName: ZodFirstPartyTypeKind.ZodEnum;
}
export declare type ZodIssueOptionalMessage = ZodInvalidTypeIssue
// | ZodInvalidLiteralIssue | ZodUnrecognizedKeysIssue | ZodInvalidUnionIssue | ZodInvalidUnionDiscriminatorIssue | ZodInvalidEnumValueIssue | ZodInvalidArgumentsIssue | ZodInvalidReturnTypeIssue | ZodInvalidDateIssue | ZodInvalidStringIssue | ZodTooSmallIssue | ZodTooBigIssue | ZodInvalidIntersectionTypesIssue | ZodNotMultipleOfIssue | ZodNotFiniteIssue | ZodCustomIssue;
;


export interface ZodNullableDef<T extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    innerType: T;
    typeName: ZodFirstPartyTypeKind.ZodNullable;
}

export interface ZodObjectDef<T extends ZodRawShape = ZodRawShape, UnknownKeys extends UnknownKeysParam = UnknownKeysParam, Catchall extends ZodTypeAny = ZodTypeAny> extends ZodTypeDef {
    typeName: ZodFirstPartyTypeKind.ZodObject;
    shape: () => T;
    catchall: Catchall;
    unknownKeys: UnknownKeys;
}
export declare class ZodOptional<T extends ZodTypeAny> {
// extends ZodType<T["_output"] | undefined, ZodOptionalDef<T>, T["_input"] | undefined> {
    //_parse(input: ParseInput): ParseReturnType<this["_output"]>;
    //unwrap(): T;
    //static create: <T_1 extends ZodTypeAny>(type: T_1, params?: RawCreateParams) => ZodOptional<T_1>;
}
export declare type ZodParsedType = {}//= keyof typeof ZodParsedType;
export declare type ZodRawShape = {
    [k: string]: ZodTypeAny;
};
// export declare class ZodTuple<T extends [ZodTypeAny, ...ZodTypeAny[]] | [] = [ZodTypeAny, ...ZodTypeAny[]], Rest extends ZodTypeAny | null = null> extends ZodType<OutputTypeOfTupleWithRest<T, Rest>, ZodTupleDef<T, Rest>, InputTypeOfTupleWithRest<T, Rest>> {
//     _parse(input: ParseInput): ParseReturnType<this["_output"]>;
//     get items(): T;
//     rest<Rest extends ZodTypeAny>(rest: Rest): ZodTuple<T, Rest>;
//     static create: <T_1 extends [] | [ZodTypeAny, ...ZodTypeAny[]]>(schemas: T_1, params?: RawCreateParams) => ZodTuple<T_1, null>;
// }
//type ZodOptional={}
export declare type ZodTupleItems = [ZodTypeAny, ...ZodTypeAny[]];
// export declare abstract class ZodType<Output = any, Def extends ZodTypeDef = ZodTypeDef, Input = Output> {
//     readonly _type: Output;
//     readonly _output: Output;
//     readonly _input: Input;
//     readonly _def: Def;
//     get description(): string | undefined;
//     abstract _parse(input: ParseInput): ParseReturnType<Output>;
//     _getType(input: ParseInput): string;
//     _getOrReturnCtx(input: ParseInput, ctx?: ParseContext | undefined): ParseContext;
//     _processInputParams(input: ParseInput): {
//         status: ParseStatus;
//         ctx: ParseContext;
//     };
//     _parseSync(input: ParseInput): SyncParseReturnType<Output>;
//     _parseAsync(input: ParseInput): AsyncParseReturnType<Output>;
//     parse(data: unknown, params?: Partial<ParseParams>): Output;
//     safeParse(data: unknown, params?: Partial<ParseParams>): SafeParseReturnType<Input, Output>;
//     parseAsync(data: unknown, params?: Partial<ParseParams>): Promise<Output>;
//     safeParseAsync(data: unknown, params?: Partial<ParseParams>): Promise<SafeParseReturnType<Input, Output>>;
//     /** Alias of safeParseAsync */
//     spa: (data: unknown, params?: Partial<ParseParams> | undefined) => Promise<SafeParseReturnType<Input, Output>>;
//     //refine<RefinedOutput extends Output>(check: (arg: Output) => arg is RefinedOutput, refinementData: IssueData | ((arg: Output, ctx: RefinementCtx) => IssueData)): ZodEffects<this, RefinedOutput, Input>;
//     //=> arg is RefinedOutput, message?: string | CustomErrorParams | ((arg: Output) => CustomErrorParams)): ZodEffects<this, RefinedOutput, Input>;
//     //refine(check: (arg: Output) => unknown | Promise<unknown>, message?: string | CustomErrorParams | ((arg: Output) => CustomErrorParams)): ZodEffects<this, Output, Input>;
//     //refinement<RefinedOutput extends Output>(check: (arg: Output) => arg is RefinedOutput, refinementData: IssueData | ((arg: Output, ctx: RefinementCtx) => IssueData)): ZodEffects<this, RefinedOutput, Input>;
//     //refinement(check: (arg: Output) => boolean, refinementData: IssueData | ((arg: Output, ctx: RefinementCtx) => IssueData)): ZodEffects<this, Output, Input>;
//     //_refinement(refinement: RefinementEffect<Output>["refinement"]): ZodEffects<this, Output, Input>;
//     //superRefine<RefinedOutput extends Output>(refinement: (arg: Output, ctx: RefinementCtx) => arg is RefinedOutput): ZodEffects<this, RefinedOutput, Input>;
//     //superRefine(refinement: (arg: Output, ctx: RefinementCtx) => void): ZodEffects<this, Output, Input>;
//     //superRefine(refinement: (arg: Output, ctx: RefinementCtx) => Promise<void>): ZodEffects<this, Output, Input>;
//     constructor(def: Def);
//     optional(): ZodOptional<this>;
//     nullable(): ZodNullable<this>;
//     nullish(): ZodOptional<ZodNullable<this>>;
//     array(): ZodArray<this>;
//     promise():undefined
//     //: ZodPromise<this>;
//     or<T extends ZodTypeAny>(option: T): ZodUnion<[this, T]>;
//     and<T extends ZodTypeAny>(incoming: T): ZodIntersection<this, T>;
//     transform<NewOut>(transform: (arg: Output, ctx: RefinementCtx) => NewOut | Promise<NewOut>): ZodEffects<this, NewOut>;
//     default(def: util.noUndefined<Input>): ZodDefault<this>;
//     default(def: () => util.noUndefined<Input>): ZodDefault<this>;
//     brand<B extends string | number | symbol>(brand?: B): ZodBranded<this, B>;
//     catch(def: Output): ZodCatch<this>;
//     catch(def: (ctx: {
//         error: ZodError;
//         input: Input;
//     }) => Output): ZodCatch<this>;
//     describe(description: string): this;
//     pipe<T extends ZodTypeAny>(target: T): ZodPipeline<this, T>;
//     readonly(): ZodReadonly<this>;
//     isOptional(): boolean;
//     isNullable(): boolean;
// }

export declare type ZodTypeAny = ZodType<any, any, any>;


export declare type ParsePath = ParsePathComponent[];

export declare type FilterEnum<Values, ToExclude> = Values extends [] ? [] : Values extends [infer Head, ...infer Rest] ? Head extends ToExclude ? FilterEnum<Rest, ToExclude> : [Head, ...FilterEnum<Rest, ToExclude>] : never;

export declare type ErrorMapCtx = {
    defaultError: string;
    data: any;
};

export declare type arrayOutputType<T extends ZodTypeAny, Cardinality extends ArrayCardinality = "many"> = Cardinality extends "atleastone" ? [T["_output"], ...T["_output"][]] : T["_output"][];

export declare type ArrayCardinality = "many" | "atleastone";

export declare type CatchallInput<T extends ZodType> = ZodType extends T ? unknown : {
    [k: string]: T["_input"];
};

export declare namespace util {
    type AssertEqual<T, U> = (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
    export type isAny<T> = 0 extends 1 & T ? true : false;
    export const assertEqual: <A, B>(val: AssertEqual<A, B>) => AssertEqual<A, B>;
    export function assertIs<T>(_arg: T): void;
    export function assertNever(_x: never): never;
    export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
    export type OmitKeys<T, K extends string> = Pick<T, Exclude<keyof T, K>>;
    export type MakePartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
    export type Exactly<T, X> = T & Record<Exclude<keyof X, keyof T>, never>;
    export const arrayToEnum: <T extends string, U extends [T, ...T[]]>(items: U) => { [k in U[number]]: k; };
    export const getValidEnumValues: (obj: any) => any[];
    export const objectValues: (obj: any) => any[];
    export const objectKeys: ObjectConstructor["keys"];
    export const find: <T>(arr: T[], checker: (arg: T) => any) => T | undefined;
    export type identity<T> = objectUtil.identity<T>;
    export type flatten<T> = objectUtil.flatten<T>;
    export type noUndefined<T> = T extends undefined ? never : T;
    export const isInteger: NumberConstructor["isInteger"];
    export function joinValues<T extends any[]>(array: T, separator?: string): string;
    export const jsonStringifyReplacer: (_: string, value: any) => any;
    export {};
}
export declare type UnknownKeysParam = "passthrough" | "strict" | "strip";
export interface ParseResult {
    status: "aborted" | "dirty" | "valid";
    data: any;
}
export declare type INVALID = {
    status: "aborted";
};
export declare const INVALID: INVALID;
export declare type DIRTY<T> = {
    status: "dirty";
    value: T;
};
export declare const DIRTY: <T>(value: T) => DIRTY<T>;
export declare type OK<T> = {
    status: "valid";
    value: T;
};
export declare type SyncParseReturnType<T = any> = OK<T> | DIRTY<T> | INVALID;
export declare type AsyncParseReturnType<T> = Promise<SyncParseReturnType<T>>;
export declare type ParseReturnType<T> = SyncParseReturnType<T> | AsyncParseReturnType<T>;

export declare type RawCreateParams = {
    errorMap?: ZodErrorMap;
    invalid_type_error?: string;
    required_error?: string;
    message?: string;
    description?: string;
} | undefined;



export declare type ParseInput = {
    data: any;
    path: (string | number)[];
    parent: ParseContext;
};

export declare namespace objectUtil {
    export type MergeShapes<U, V> = {
        [k in Exclude<keyof U, keyof V>]: U[k];
    } & V;
    type optionalKeys<T extends object> = {
        [k in keyof T]: undefined extends T[k] ? k : never;
    }[keyof T];
    type requiredKeys<T extends object> = {
        [k in keyof T]: undefined extends T[k] ? never : k;
    }[keyof T];
    export type addQuestionMarks<T extends object, _O = any> = {
        [K in requiredKeys<T>]: T[K];
    } & {
        [K in optionalKeys<T>]?: T[K];
    } & {
        [k in keyof T]?: unknown;
    };
    export type identity<T> = T;
    export type flatten<T> = identity<{
        [k in keyof T]: T[k];
    }>;
    export type noNeverKeys<T> = {
        [k in keyof T]: [T[k]] extends [never] ? never : k;
    }[keyof T];
    export type noNever<T> = identity<{
        [k in noNeverKeys<T>]: k extends keyof T ? T[k] : never;
    }>;
    export const mergeShapes: <U, T>(first: U, second: T) => T & U;
    export type extendShape<A extends object, B extends object> = {
        [K in keyof A as K extends keyof B ? never : K]: A[K];
    } & {
        [K in keyof B]: B[K];
    };
    export {};
}
export declare type objectOutputType<Shape extends ZodRawShape, Catchall extends ZodTypeAny, UnknownKeys extends UnknownKeysParam = UnknownKeysParam> = objectUtil.flatten<objectUtil.addQuestionMarks<baseObjectOutputType<Shape>>> & CatchallOutput<Catchall> & PassthroughType<UnknownKeys>;

export declare type objectInputType<Shape extends ZodRawShape, Catchall extends ZodTypeAny, UnknownKeys extends UnknownKeysParam = UnknownKeysParam> = objectUtil.flatten<baseObjectInputType<Shape>> & CatchallInput<Catchall> & PassthroughType<UnknownKeys>;

//export declare type deoptional<T extends ZodTypeAny> = T extends ZodOptional<infer U> ? deoptional<U> : T extends ZodNullable<infer U> ? ZodNullable<deoptional<U>> : T;

export declare type baseObjectOutputType<Shape extends ZodRawShape> = {
    [k in keyof Shape]: Shape[k]["_output"];
};

export declare type baseObjectInputType<Shape extends ZodRawShape> = objectUtil.addQuestionMarks<{
    [k in keyof Shape]: Shape[k]["_input"];
}>;
export declare type AnyZodObject = ZodObject<any, any, any>;
//import { AgentAction, AgentFinish } from "@langchain/core/dist/agents.js";
export type AgentAction = {
    tool: string;
    toolInput: string | Record<string, any>;
    log: string;
};
export type AgentFinish = {
    returnValues: Record<string, any>;
    log: string;
};
export type AgentStep = {
    action: AgentAction;
    observation: string;
};

//import { NewTokenIndices, HandleLLMNewTokenCallbackFields, BaseCallbackHandler } from "@langchain/core/dist/callbacks/base.js";
export interface BaseCallbackHandlerInput {
    ignoreLLM?: boolean;
    ignoreChain?: boolean;
    ignoreAgent?: boolean;
    ignoreRetriever?: boolean;
    ignoreCustomEvent?: boolean;
    _awaitHandler?: boolean;
    raiseError?: boolean;
}
export declare abstract class BaseCallbackHandler extends BaseCallbackHandlerMethodsClass implements BaseCallbackHandlerInput, Serializable {
    lc_serializable: boolean;
    get lc_namespace(): ["langchain_core", "callbacks", string];
    get lc_secrets(): {
        [key: string]: string;
    } | undefined;
    get lc_attributes(): {
        [key: string]: string;
    } | undefined;
    get lc_aliases(): {
        [key: string]: string;
    } | undefined;
    /**
     * The name of the serializable. Override to provide an alias or
     * to preserve the serialized module name in minified environments.
     *
     * Implemented as a static method to support loading logic.
     */
    static lc_name(): string;
    /**
     * The final serialized identifier for the module.
     */
    get lc_id(): string[];
    lc_kwargs: SerializedFields;
    abstract name: string;
    ignoreLLM: boolean;
    ignoreChain: boolean;
    ignoreAgent: boolean;
    ignoreRetriever: boolean;
    ignoreCustomEvent: boolean;
    raiseError: boolean;
    awaitHandlers: boolean;
    constructor(input?: BaseCallbackHandlerInput);
    copy(): BaseCallbackHandler;
    toJSON(): Serialized;
    toJSONNotImplemented(): SerializedNotImplemented;
    static fromMethods(methods: CallbackHandlerMethods): {
        name: string;
        lc_serializable: boolean;
        readonly lc_namespace: ["langchain_core", "callbacks", string];
        readonly lc_secrets: {
            [key: string]: string;
        } | undefined;
        readonly lc_attributes: {
            [key: string]: string;
        } | undefined;
        readonly lc_aliases: {
            [key: string]: string;
        } | undefined;
        /**
         * The final serialized identifier for the module.
         */
        readonly lc_id: string[];
        lc_kwargs: SerializedFields;
        ignoreLLM: boolean;
        ignoreChain: boolean;
        ignoreAgent: boolean;
        ignoreRetriever: boolean;
        ignoreCustomEvent: boolean;
        raiseError: boolean;
        awaitHandlers: boolean;
        copy(): BaseCallbackHandler;
        toJSON(): Serialized;
        toJSONNotImplemented(): SerializedNotImplemented;
        /**
         * Called at the start of an LLM or Chat Model run, with the prompt(s)
         * and the run ID.
         */
        handleLLMStart?(llm: Serialized, prompts: string[], runId: string, parentRunId?: string | undefined, extraParams?: Record<string, unknown> | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, runName?: string | undefined): any;
        /**
         * Called when an LLM/ChatModel in `streaming` mode produces a new token
         */
        handleLLMNewToken?(token: string, idx: NewTokenIndices, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, fields?: HandleLLMNewTokenCallbackFields | undefined): any;
        /**
         * Called if an LLM/ChatModel run encounters an error
         */
        handleLLMError?(err: any, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): any;
        /**
         * Called at the end of an LLM/ChatModel run, with the output and the run ID.
         */
        handleLLMEnd?(output: LLMResult, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): any;
        /**
         * Called at the start of a Chat Model run, with the prompt(s)
         * and the run ID.
         */
        handleChatModelStart?(llm: Serialized, messages: BaseMessage[][], runId: string, parentRunId?: string | undefined, extraParams?: Record<string, unknown> | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, runName?: string | undefined): any;
        /**
         * Called at the start of a Chain run, with the chain name and inputs
         * and the run ID.
         */
        handleChainStart?(chain: Serialized, inputs: ChainValues, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, runType?: string | undefined, runName?: string | undefined): any;
        /**
         * Called if a Chain run encounters an error
         */
        handleChainError?(err: any, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, kwargs?: {
            inputs?: Record<string, unknown> | undefined;
        } | undefined): any;
        /**
         * Called at the end of a Chain run, with the outputs and the run ID.
         */
        handleChainEnd?(outputs: ChainValues, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, kwargs?: {
            inputs?: Record<string, unknown> | undefined;
        } | undefined): any;
        /**
         * Called at the start of a Tool run, with the tool name and input
         * and the run ID.
         */
        handleToolStart?(tool: Serialized, input: string, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, runName?: string | undefined): any;
        /**
         * Called if a Tool run encounters an error
         */
        handleToolError?(err: any, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): any;
        /**
         * Called at the end of a Tool run, with the tool output and the run ID.
         */
        handleToolEnd?(output: any, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): any;
        handleText?(text: string, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): void | Promise<void>;
        /**
         * Called when an agent is about to execute an action,
         * with the action and the run ID.
         */
        handleAgentAction?(action: AgentAction, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): void | Promise<void>;
        /**
         * Called when an agent finishes execution, before it exits.
         * with the final output and the run ID.
         */
        handleAgentEnd?(action: AgentFinish, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): void | Promise<void>;
        handleRetrieverStart?(retriever: Serialized, query: string, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined, metadata?: Record<string, unknown> | undefined, name?: string | undefined): any;
        handleRetrieverEnd?(documents: DocumentInterface<Record<string, any>>[], runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): any;
        handleRetrieverError?(err: any, runId: string, parentRunId?: string | undefined, tags?: string[] | undefined): any;
        handleCustomEvent?(eventName: string, data: any, runId: string, tags?: string[] | undefined, metadata?: Record<string, any> | undefined): any;
    };
}
export interface NewTokenIndices {
    prompt: number;
    completion: number;
}
export type HandleLLMNewTokenCallbackFields = {
    chunk?: GenerationChunk | ChatGenerationChunk;
};
//import { DocumentInterface } from "@langchain/core/dist/documents/document.js";
//import { ChainValues } from "@langchain/core/dist/utils/types/index.js";
export interface DocumentInterface<Metadata extends Record<string, any> = Record<string, any>> {
    pageContent: string;
    metadata: Metadata;
    /**
     * An optional identifier for the document.
     *
     * Ideally this should be unique across the document collection and formatted
     * as a UUID, but this will not be enforced.
     */
    id?: string;
}
export declare const RUN_KEY = "__run";
export type LLMResult = {
    /**
     * List of the things generated. Each input could have multiple {@link Generation | generations}, hence this is a list of lists.
     */
    generations: Generation[][];
    /**
     * Dictionary of arbitrary LLM-provider specific output.
     */
    llmOutput?: Record<string, any>;
    /**
     * Dictionary of run metadata
     */
    [RUN_KEY]?: Record<string, any>;
};
export type GenerationChunkFields = {
    text: string;
    generationInfo?: Record<string, any>;
};
export declare class GenerationChunk implements Generation {
    text: string;
    generationInfo?: Record<string, any>;
    constructor(fields: GenerationChunkFields);
    concat(chunk: GenerationChunk): GenerationChunk;
}

export interface ChatResult {
    generations: ChatGeneration[];
    llmOutput?: Record<string, any>;
}
export type ChatGenerationChunkFields = GenerationChunkFields & {
    message: BaseMessageChunk;
};
export interface ChatGeneration extends Generation {
    message: BaseMessage;
}
//import { , , , , ToolDefinition } from "@langchain/core/language_models/base.js";
export interface ToolDefinition {
    type: "function";
    function: FunctionDefinition;
}

export type StructuredOutputMethodOptions<IncludeRaw extends boolean = false> = {
    name?: string;
    method?: "functionCalling" | "jsonMode" | "jsonSchema" | string;
    includeRaw?: IncludeRaw;
    /** Whether to use strict mode. Currently only supported by OpenAI models. */
    strict?: boolean;
};

export type SerializedLLM = {
    _model: string;
    _type: string;
} & Record<string, any>;

export type BaseLanguageModelInput = BasePromptValueInterface | string | BaseMessageLike[];
const getVerbosity = () => false;
export abstract class BaseLangChain<
    RunInput,
    RunOutput,
    CallOptions extends RunnableConfig = RunnableConfig
  >
  extends Runnable<RunInput, RunOutput, CallOptions>
  implements BaseLangChainParams
{
  /**
   * Whether to print out response text.
   */
  verbose: boolean;

  callbacks?: Callbacks;

  tags?: string[];

  metadata?: Record<string, unknown>;

  get lc_attributes(): { [key: string]: undefined } | undefined {
    return {
      callbacks: undefined,
      verbose: undefined,
    };
  }

  constructor(params: BaseLangChainParams) {
    super(params);
    this.verbose = params.verbose ?? getVerbosity();
    this.callbacks = params.callbacks;
    this.tags = params.tags ?? [];
    this.metadata = params.metadata ?? {};
  }
}
export interface BaseLanguageModelInterface<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  RunOutput = any,
  CallOptions extends BaseLanguageModelCallOptions = BaseLanguageModelCallOptions
> extends RunnableInterface<BaseLanguageModelInput, RunOutput, CallOptions> {
  get callKeys(): string[];

  generatePrompt(
    promptValues: BasePromptValueInterface[],
    options?: string[] | CallOptions,
    callbacks?: Callbacks
  ): Promise<LLMResult>;

  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
   */
  predict(
    text: string,
    options?: string[] | CallOptions,
    callbacks?: Callbacks
  ): Promise<string>;

  /**
   * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
   */
  predictMessages(
    messages: BaseMessage[],
    options?: string[] | CallOptions,
    callbacks?: Callbacks
  ): Promise<BaseMessage>;

  _modelType(): string;

  _llmType(): string;

  getNumTokens(content: MessageContent): Promise<number>;

  /**
   * Get the identifying parameters of the LLM.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _identifyingParams(): Record<string, any>;

  serialize(): SerializedLLM;
}
export declare abstract class BaseLanguageModel<RunOutput = any, CallOptions extends BaseLanguageModelCallOptions = BaseLanguageModelCallOptions> extends BaseLangChain<BaseLanguageModelInput, RunOutput, CallOptions> implements BaseLanguageModelParams, BaseLanguageModelInterface<RunOutput, CallOptions> {
    /**
     * Keys that the language model accepts as call options.
     */
    get callKeys(): string[];
    /**
     * The async caller should be used by subclasses to make any async calls,
     * which will thus benefit from the concurrency and retry logic.
     */
    caller: AsyncCaller;
    cache?: BaseCache;
    constructor({ callbacks, callbackManager, ...params }: BaseLanguageModelParams);
    abstract generatePrompt(promptValues: BasePromptValueInterface[], options?: string[] | CallOptions, callbacks?: Callbacks): Promise<LLMResult>;
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
     */
    abstract predict(text: string, options?: string[] | CallOptions, callbacks?: Callbacks): Promise<string>;
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
     */
    abstract predictMessages(messages: BaseMessage[], options?: string[] | CallOptions, callbacks?: Callbacks): Promise<BaseMessage>;
    abstract _modelType(): string;
    abstract _llmType(): string;
    private _encoding?;
    getNumTokens(content: MessageContent): Promise<number>;
    protected static _convertInputToPromptValue(input: BaseLanguageModelInput): BasePromptValueInterface;
    /**
     * Get the identifying parameters of the LLM.
     */
    _identifyingParams(): Record<string, any>;
    /**
     * Create a unique cache key for a specific call to a specific language model.
     * @param callOptions Call options for the model
     * @returns A unique cache key.
     */
    _getSerializedCacheKeyParametersForCall({ config, ...callOptions }: CallOptions & {
        config?: RunnableConfig;
    }): string;
    /**
     * @deprecated
     * Return a json-like object representing this LLM.
     */
    serialize(): SerializedLLM;
    /**
     * @deprecated
     * Load an LLM from a json-like object describing it.
     */
    static deserialize(_data: SerializedLLM): Promise<BaseLanguageModel>;
    withStructuredOutput?<RunOutput extends Record<string, any> = Record<string, any>>(schema: z.ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
    withStructuredOutput?<RunOutput extends Record<string, any> = Record<string, any>>(schema: z.ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
        raw: BaseMessage;
        parsed: RunOutput;
    }>;
    /**
     * Model wrapper that returns outputs formatted to match the given schema.
     *
     * @template {BaseLanguageModelInput} RunInput The input type for the Runnable, expected to be the same input for the LLM.
     * @template {Record<string, any>} RunOutput The output type for the Runnable, expected to be a Zod schema object for structured output validation.
     *
     * @param {z.ZodEffects<RunOutput>} schema The schema for the structured output. Either as a Zod schema or a valid JSON schema object.
     *   If a Zod schema is passed, the returned attributes will be validated, whereas with JSON schema they will not be.
     * @param {string} name The name of the function to call.
     * @param {"functionCalling" | "jsonMode"} [method=functionCalling] The method to use for getting the structured output. Defaults to "functionCalling".
     * @param {boolean | undefined} [includeRaw=false] Whether to include the raw output in the result. Defaults to false.
     * @returns {Runnable<RunInput, RunOutput> | Runnable<RunInput, { raw: BaseMessage; parsed: RunOutput }>} A new runnable that calls the LLM with structured output.
     */
    withStructuredOutput?<RunOutput extends Record<string, any> = Record<string, any>>(schema: z.ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<boolean>): Runnable<BaseLanguageModelInput, RunOutput> | Runnable<BaseLanguageModelInput, {
        raw: BaseMessage;
        parsed: RunOutput;
    }>;
}

//import { , RunnableMapLike } from "@langchain/core/dist/runnables/base.js";
export type RunnableMapLike<RunInput, RunOutput> = {
    [K in keyof RunOutput]: RunnableLike<RunInput, RunOutput[K]>;
};
//import { Graph } from "@langchain/core/dist/runnables/graph.js";
export type RunnableIOSchema = {
    name?: string;
    schema: z.ZodType;
  };
export class Node{};
export class Edge {};
export declare class Graph {
    nodes: Record<string, Node>;
    edges: Edge[];
    constructor(params?: {
        nodes: Record<string, Node>;
        edges: Edge[];
    });
    toJSON(): Record<string, any>;
    addNode(data: RunnableInterface | RunnableIOSchema, id?: string, metadata?: Record<string, any>): Node;
    removeNode(node: Node): void;
    addEdge(source: Node, target: Node, data?: string, conditional?: boolean): Edge;
    firstNode(): Node | undefined;
    lastNode(): Node | undefined;
    /**
     * Add all nodes and edges from another graph.
     * Note this doesn't check for duplicates, nor does it connect the graphs.
     */
    extend(graph: Graph, prefix?: string): ({
        id: string;
        data: RunnableIOSchema | RunnableInterface<any, any, RunnableConfig<Record<string, any>>>;
    } | undefined)[];
    trimFirstNode(): void;
    trimLastNode(): void;
    /**
     * Return a new graph with all nodes re-identified,
     * using their unique, readable names where possible.
     */
    reid(): Graph;
    drawMermaid(params?: {
        withStyles?: boolean;
        curveStyle?: string;
        nodeColors?: Record<string, string>;
        wrapLabelNWords?: number;
    }): string;
    drawMermaidPng(params?: {
        withStyles?: boolean;
        curveStyle?: string;
        nodeColors?: Record<string, string>;
        wrapLabelNWords?: number;
        backgroundColor?: string;
    }): Promise<Blob>;
}

// import { EventStreamCallbackHandlerInput, StreamEvent } from "@langchain/core/dist/tracers/event_stream.js";
// import { LogStreamCallbackHandlerInput, RunLogPatch, LogStreamCallbackHandler } from "@langchain/core/dist/tracers/log_stream.js";
// import { IterableReadableStream, IterableReadableStreamInterface } from "@langchain/core/dist/utils/stream.js";
// import { RunnableIOSchema } from "@langchain/core/runnables.js";
// import { BaseCallbackHandlerInput } from "@langchain/core/dist/callbacks/base.js";
// import { BaseLangChain, BaseLanguageModelInterface } from "@langchain/core/language_models/base.js";
// import { RUN_KEY, GenerationChunkFields } from "@langchain/core/outputs.js";
// import { AsyncCaller } from "langsmith/dist/utils/async_caller.js";
// import { EnumValues, ZodTypeDef, ZodInvalidTypeIssue, ZodInvalidLiteralIssue, ZodUnrecognizedKeysIssue, ZodInvalidUnionIssue, ZodInvalidUnionDiscriminatorIssue, ZodInvalidEnumValueIssue, ZodInvalidArgumentsIssue, ZodInvalidReturnTypeIssue, ZodInvalidDateIssue, ZodInvalidStringIssue, ZodTooSmallIssue, ZodTooBigIssue, ZodInvalidIntersectionTypesIssue, ZodNotMultipleOfIssue, ZodNotFiniteIssue, ZodCustomIssue, ZodOptionalDef, ZodParsedType, OutputTypeOfTupleWithRest, ZodTupleDef, InputTypeOfTupleWithRest, ParseStatus, ParseParams, SafeParseReturnType, CustomErrorParams, ZodEffects, IssueData, RefinementCtx, RefinementEffect, ZodPromise, ZodUnion, ZodIntersection, ZodDefault, ZodBranded, ZodCatch, ZodError, ZodPipeline, ZodReadonly, ParsePathComponent, z } from "zod";
//import { , , , RunnableToolLikeArgs } from "@langchain/core/runnables.js";
export interface RunnableToolLikeArgs<RunInput extends z.ZodType = z.ZodType, RunOutput = unknown> extends Omit<RunnableBindingArgs<z.infer<RunInput>, RunOutput>, "config"> {
    name: string;
    description?: string;
    schema: RunInput;
    config?: RunnableConfig;
}
interface IterableReadableStreamInterface<T> {}
class LogStreamCallbackHandlerInput {}
//class IterableReadableStream<T> implements IterableReadableStreamInterface<Uint8Array> {}

export class IterableReadableStream<T>
  extends ReadableStream<T>
  implements IterableReadableStreamInterface<T>
{
  public reader!: ReadableStreamDefaultReader<T>;

  ensureReader() {
    if (!this.reader) {
      this.reader = this.getReader();
    }
  }

  async next(): Promise<IteratorResult<T>> {
    this.ensureReader();
    try {
      const result = await this.reader.read();
      if (result.done) {
        this.reader.releaseLock(); // release lock when stream becomes closed
        return {
          done: true,
          value: undefined,
        };
      } else {
        return {
          done: false,
          value: result.value,
        };
      }
    } catch (e) {
      this.reader.releaseLock(); // release lock when stream becomes errored
      throw e;
    }
  }

  async return(): Promise<IteratorResult<T>> {
    this.ensureReader();
    // If wrapped in a Node stream, cancel is already called.
    if (this.locked) {
      const cancelPromise = this.reader.cancel(); // cancel first, but don't await yet
      this.reader.releaseLock(); // release lock first
      await cancelPromise; // now await it
    }
    return { done: true, value: undefined };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async throw(e: any): Promise<IteratorResult<T>> {
    this.ensureReader();
    if (this.locked) {
      const cancelPromise = this.reader.cancel(); // cancel first, but don't await yet
      this.reader.releaseLock(); // release lock first
      await cancelPromise; // now await it
    }
    throw e;
  }

  [Symbol.asyncIterator]() {
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Not present in Node 18 types, required in latest Node 22
  async [Symbol.asyncDispose]() {
    await this.return();
  }

  static fromReadableStream<T>(stream: ReadableStream<T>) {
    // From https://developer.mozilla.org/en-US/docs/Web/API/Streams_API/Using_readable_streams#reading_the_stream
    const reader = stream.getReader();
    return new IterableReadableStream<T>({
      start(controller) {
        return pump();
        function pump(): Promise<T | undefined> {
          return reader.read().then(({ done, value }) => {
            // When no more data needs to be consumed, close the stream
            if (done) {
              controller.close();
              return;
            }
            // Enqueue the next data chunk into our target stream
            controller.enqueue(value);
            return pump();
          });
        }
      },
      cancel() {
        reader.releaseLock();
      },
    });
  }

  static fromAsyncGenerator<T>(generator: AsyncGenerator<T>) {
    return new IterableReadableStream<T>({
      async pull(controller) {
        const { value, done } = await generator.next();
        // When no more data needs to be consumed, close the stream
        if (done) {
          controller.close();
        }
        // Fix: `else if (value)` will hang the streaming when nullish value (e.g. empty string) is pulled
        controller.enqueue(value);
      },
      async cancel(reason) {
        await generator.return(reason);
      },
    });
  }
}

export function atee<T>(
  iter: AsyncGenerator<T>,
  length = 2
): AsyncGenerator<T>[] {
  const buffers = Array.from(
    { length },
    () => [] as Array<IteratorResult<T> | IteratorReturnResult<T>>
  );
  return buffers.map(async function* makeIter(buffer) {
    while (true) {
      if (buffer.length === 0) {
        const result = await iter.next();
        for (const buffer of buffers) {
          buffer.push(result);
        }
      } else if (buffer[0].done) {
        return;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        yield buffer.shift()!.value;
      }
    }
  });
}

export function concat<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends Array<any> | string | number | Record<string, any> | any
>(first: T, second: T): T {
  if (Array.isArray(first) && Array.isArray(second)) {
    return first.concat(second) as T;
  } else if (typeof first === "string" && typeof second === "string") {
    return (first + second) as T;
  } else if (typeof first === "number" && typeof second === "number") {
    return (first + second) as T;
  } else if (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "concat" in (first as any) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (first as any).concat === "function"
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (first as any).concat(second) as T;
  } else if (typeof first === "object" && typeof second === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chunk = { ...first } as Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const [key, value] of Object.entries(second as Record<string, any>)) {
      if (key in chunk && !Array.isArray(chunk[key])) {
        chunk[key] = concat(chunk[key], value);
      } else {
        chunk[key] = value;
      }
    }
    return chunk as T;
  } else {
    throw new Error(`Cannot concat ${typeof first} and ${typeof second}`);
  }
}
export type StreamEventData = {
    /**
     * The input passed to the runnable that generated the event.
     * Inputs will sometimes be available at the *START* of the runnable, and
     * sometimes at the *END* of the runnable.
     * If a runnable is able to stream its inputs, then its input by definition
     * won't be known until the *END* of the runnable when it has finished streaming
     * its inputs.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input?: any;
  
    /**
     * The output of the runnable that generated the event.
     * Outputs will only be available at the *END* of the runnable.
     * For most runnables, this field can be inferred from the `chunk` field,
     * though there might be some exceptions for special cased runnables (e.g., like
     * chat models), which may return more information.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    output?: any;
  
    /**
     * A streaming chunk from the output that generated the event.
     * chunks support addition in general, and adding them up should result
     * in the output of the runnable that generated the event.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chunk?: any;
  };
  
export type StreamEvent = {
    /**
     * Event names are of the format: on_[runnable_type]_(start|stream|end).
     *
     * Runnable types are one of:
     * - llm - used by non chat models
     * - chat_model - used by chat models
     * - prompt --  e.g., ChatPromptTemplate
     * - tool -- LangChain tools
     * - chain - most Runnables are of this type
     *
     * Further, the events are categorized as one of:
     * - start - when the runnable starts
     * - stream - when the runnable is streaming
     * - end - when the runnable ends
     *
     * start, stream and end are associated with slightly different `data` payload.
     *
     * Please see the documentation for `EventData` for more details.
     */
    event: string;
    /** The name of the runnable that generated the event. */
    name: string;
    /**
     * An randomly generated ID to keep track of the execution of the given runnable.
     *
     * Each child runnable that gets invoked as part of the execution of a parent runnable
     * is assigned its own unique ID.
     */
    run_id: string;
    /**
     * Tags associated with the runnable that generated this event.
     * Tags are always inherited from parent runnables.
     */
    tags?: string[];
    /** Metadata associated with the runnable that generated this event. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: Record<string, any>;
    /**
     * Event data.
     *
     * The contents of the event data depend on the event type.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: StreamEventData;
  };
export declare class RunnableBinding<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig> extends Runnable<RunInput, RunOutput, CallOptions> {
    static lc_name(): string;
    lc_namespace: string[];
    lc_serializable: boolean;
    bound: Runnable<RunInput, RunOutput, CallOptions>;
    config: RunnableConfig;
    kwargs?: Partial<CallOptions>;
    configFactories?: Array<(config: RunnableConfig) => RunnableConfig | Promise<RunnableConfig>>;
    constructor(fields: RunnableBindingArgs<RunInput, RunOutput, CallOptions>);
    getName(suffix?: string | undefined): string;
    _mergeConfig(...options: (Partial<CallOptions> | RunnableConfig | undefined)[]): Promise<Partial<CallOptions>>;
    bind(kwargs: Partial<CallOptions>): RunnableBinding<RunInput, RunOutput, CallOptions>;
    withConfig(config: RunnableConfig): Runnable<RunInput, RunOutput, CallOptions>;
    withRetry(fields?: {
        stopAfterAttempt?: number;
        onFailedAttempt?: RunnableRetryFailedAttemptHandler;
    }): RunnableRetry<RunInput, RunOutput, CallOptions>;
    invoke(input: RunInput, options?: Partial<CallOptions>): Promise<RunOutput>;
    batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
        returnExceptions?: false;
    }): Promise<RunOutput[]>;
    batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
        returnExceptions: true;
    }): Promise<(RunOutput | Error)[]>;
    batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
    _streamIterator(input: RunInput, options?: Partial<CallOptions> | undefined): AsyncGenerator<Awaited<RunOutput>, void, unknown>;
    //stream(input: RunInput, options?: Partial<CallOptions> | undefined): Promise<IterableReadableStream>;
    transform<TInput = RunInput, TOutput = RunOutput>(generator: AsyncGenerator<TInput>, options?: Partial<CallOptions>): AsyncGenerator<TOutput>;
    streamEvents(input: RunInput, options: Partial<CallOptions> & {
        version: "v1" | "v2";
    }, streamOptions?: Omit<LogStreamCallbackHandlerInput, "autoClose">): IterableReadableStream<StreamEvent>;
    streamEvents(input: RunInput, options: Partial<CallOptions> & {
        version: "v1" | "v2";
        encoding: "text/event-stream";
    }, streamOptions?: Omit<LogStreamCallbackHandlerInput, "autoClose">): IterableReadableStream<Uint8Array>;
    static isRunnableBinding(thing: any): thing is RunnableBinding<any, any, any>;
    /**
     * Bind lifecycle listeners to a Runnable, returning a new Runnable.
     * The Run object contains information about the run, including its id,
     * type, input, output, error, startTime, endTime, and any tags or metadata
     * added to the run.
     *
     * @param {Object} params - The object containing the callback functions.
     * @param {(run: Run) => void} params.onStart - Called before the runnable starts running, with the Run object.
     * @param {(run: Run) => void} params.onEnd - Called after the runnable finishes running, with the Run object.
     * @param {(run: Run) => void} params.onError - Called if the runnable throws an error, with the Run object.
     */
    withListeners({ onStart, onEnd, onError, }: {
        onStart?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
        onEnd?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
        onError?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
    }): Runnable<RunInput, RunOutput, CallOptions>;
}

export type RunnableFunc<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig> = (input: RunInput, options: CallOptions | Record<string, any> | (Record<string, any> & CallOptions)) => RunOutput | Promise<RunOutput>;
export type RunnableLike<RunInput = any, RunOutput = any, CallOptions extends RunnableConfig = RunnableConfig> = RunnableInterface<RunInput, RunOutput, CallOptions> | RunnableFunc<RunInput, RunOutput, CallOptions> | RunnableMapLike<RunInput, RunOutput>;

export type RunnableBatchOptions = {
    /** @deprecated Pass in via the standard runnable config object instead */
    maxConcurrency?: number;
    returnExceptions?: boolean;
};

export declare class RunnableWithFallbacks<RunInput, RunOutput> extends Runnable<RunInput, RunOutput> {
    static lc_name(): string;
    lc_namespace: string[];
    lc_serializable: boolean;
    runnable: Runnable<RunInput, RunOutput>;
    fallbacks: Runnable<RunInput, RunOutput>[];
    constructor(fields: {
        runnable: Runnable<RunInput, RunOutput>;
        fallbacks: Runnable<RunInput, RunOutput>[];
    });
    runnables(): Generator<Runnable<RunInput, RunOutput, RunnableConfig<Record<string, any>>>, void, unknown>;
    invoke(input: RunInput, options?: Partial<RunnableConfig>): Promise<RunOutput>;
    _streamIterator(input: RunInput, options?: Partial<RunnableConfig> | undefined): AsyncGenerator<RunOutput>;
    batch(inputs: RunInput[], options?: Partial<RunnableConfig> | Partial<RunnableConfig>[], batchOptions?: RunnableBatchOptions & {
        returnExceptions?: false;
    }): Promise<RunOutput[]>;
    batch(inputs: RunInput[], options?: Partial<RunnableConfig> | Partial<RunnableConfig>[], batchOptions?: RunnableBatchOptions & {
        returnExceptions: true;
    }): Promise<(RunOutput | Error)[]>;
    batch(inputs: RunInput[], options?: Partial<RunnableConfig> | Partial<RunnableConfig>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
}
export declare class RunnableRetry<RunInput = any, RunOutput = any, CallOptions extends RunnableConfig = RunnableConfig> extends RunnableBinding<RunInput, RunOutput, CallOptions> {
    static lc_name(): string;
    lc_namespace: string[];
    protected maxAttemptNumber: number;
    onFailedAttempt: RunnableRetryFailedAttemptHandler;
    constructor(fields: RunnableBindingArgs<RunInput, RunOutput, CallOptions> & {
        maxAttemptNumber?: number;
        onFailedAttempt?: RunnableRetryFailedAttemptHandler;
    });
    _patchConfigForRetry(attempt: number, config?: Partial<CallOptions>, runManager?: CallbackManagerForChainRun): Partial<CallOptions>;
    protected _invoke(input: RunInput, config?: CallOptions, runManager?: CallbackManagerForChainRun): Promise<RunOutput>;
    /**
     * Method that invokes the runnable with the specified input, run manager,
     * and config. It handles the retry logic by catching any errors and
     * recursively invoking itself with the updated config for the next retry
     * attempt.
     * @param input The input for the runnable.
     * @param runManager The run manager for the runnable.
     * @param config The config for the runnable.
     * @returns A promise that resolves to the output of the runnable.
     */
    invoke(input: RunInput, config?: CallOptions): Promise<RunOutput>;
    _batch<ReturnExceptions extends boolean = false>(inputs: RunInput[], configs?: RunnableConfig[], runManagers?: (CallbackManagerForChainRun | undefined)[], batchOptions?: RunnableBatchOptions): Promise<ReturnExceptions extends false ? RunOutput[] : (Error | RunOutput)[]>;
    batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
        returnExceptions?: false;
    }): Promise<RunOutput[]>;
    batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
        returnExceptions: true;
    }): Promise<(RunOutput | Error)[]>;
    batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
}
export type RunnableRetryFailedAttemptHandler = (error: any, input: any) => any;
export interface RunnableInterface<RunInput = any, RunOutput = any, CallOptions extends RunnableConfig = RunnableConfig> extends SerializableInterface {
    lc_serializable: boolean;
    invoke(input: RunInput, options?: Partial<CallOptions>): Promise<RunOutput>;
    batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
        returnExceptions?: false;
    }): Promise<RunOutput[]>;
    batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
        returnExceptions: true;
    }): Promise<(RunOutput | Error)[]>;
    batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
    stream(input: RunInput, options?: Partial<CallOptions>): Promise<IterableReadableStreamInterface<RunOutput>>;
    transform(generator: AsyncGenerator<RunInput>, options: Partial<CallOptions>): AsyncGenerator<RunOutput>;
    getName(suffix?: string): string;
}

//import { enumUtil } from "zod/lib/helpers/enumUtil.js";
export declare namespace enumUtil {
    type UnionToIntersectionFn<T> = (T extends unknown ? (k: () => T) => void : never) extends (k: infer Intersection) => void ? Intersection : never;
    type GetUnionLast<T> = UnionToIntersectionFn<T> extends () => infer Last ? Last : never;
    type UnionToTuple<T, Tuple extends unknown[] = []> = [T] extends [never] ? Tuple : UnionToTuple<Exclude<T, GetUnionLast<T>>, [GetUnionLast<T>, ...Tuple]>;
    type CastToStringTuple<T> = T extends [string, ...string[]] ? T : never;
    export type UnionToTupleString<T> = CastToStringTuple<UnionToTuple<T>>;
    export {};
}

//import { errorUtil } from "zod/lib/helpers/errorUtil.js";
export declare namespace errorUtil {
    type ErrMessage = string | {
        message?: string;
    };
    const errToObj: (message?: ErrMessage | undefined) => {
        message?: string | undefined;
    };
    const toString: (message?: ErrMessage | undefined) => string | undefined;
}

//import { partialUtil } from "zod/lib/helpers/partialUtil.js";
export declare namespace partialUtil {
    type DeepPartial<T extends ZodTypeAny> = T extends ZodObject<ZodRawShape> ? ZodObject<{
        [k in keyof T["shape"]]: ZodOptional<DeepPartial<T["shape"][k]>>;
    }, T["_def"]["unknownKeys"], T["_def"]["catchall"]> : T extends ZodArray<infer Type, infer Card> ? ZodArray<DeepPartial<Type>, Card> : T extends ZodOptional<infer Type> ? ZodOptional<DeepPartial<Type>> : T extends ZodNullable<infer Type> ? ZodNullable<DeepPartial<Type>> : T extends ZodTuple<infer Items> ? {
        [k in keyof Items]: Items[k] extends ZodTypeAny ? DeepPartial<Items[k]> : never;
    } extends infer PI ? PI extends ZodTupleItems ? ZodTuple<PI> : never : never : T;
}

//import { Attachments } from "langsmith/dist/schemas.js";
export type KVMap = Record<string, any>;
//import { BaseRun, KVMap } from "langsmith/dist/schemas.js";
export interface TracerSession {
    tenant_id: string;
    id: string;
    start_time: number;
    end_time?: number;
    description?: string;
    name?: string;
    /** Extra metadata for the project. */
    extra?: KVMap;
    reference_dataset_id?: string;
}
export interface TracerSessionResult extends TracerSession {
    run_count?: number;
    latency_p50?: number;
    latency_p99?: number;
    total_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    last_run_start_time?: number;
    feedback_stats?: Record<string, unknown>;
    run_facets?: KVMap[];
}
//export type KVMap = Record<string, any>;
export type RunType = "llm" | "chain" | "tool" | "retriever" | "embedding" | "prompt" | "parser";
export type ScoreType = number | boolean | null;
export type ValueType = number | boolean | string | object | null;
export type DataType = "kv" | "llm" | "chat";
export interface BaseExample {
    dataset_id: string;
    inputs: KVMap;
    outputs?: KVMap;
    metadata?: KVMap;
    source_run_id?: string;
}
export interface AttachmentInfo {
    presigned_url: string;
    mime_type?: string;
}
export type AttachmentData = Uint8Array | ArrayBuffer;
export type AttachmentDescription = {
    mimeType: string;
    data: AttachmentData;
};
export type Attachments = Record<string, [
    string,
    AttachmentData
] | AttachmentDescription>;

export interface BaseRun {
    /** Optionally, a unique identifier for the run. */
    id?: string;
    /** A human-readable name for the run. */
    name: string;
    /** The epoch time at which the run started, if available. */
    start_time?: number;
    /** Specifies the type of run (tool, chain, llm, etc.). */
    run_type: string;
    /** The epoch time at which the run ended, if applicable. */
    end_time?: number;
    /** Any additional metadata or settings for the run. */
    extra?: KVMap;
    /** Error message, captured if the run faces any issues. */
    error?: string;
    /** Serialized state of the run for potential future use. */
    serialized?: object;
    /** Events like 'start', 'end' linked to the run. */
    events?: KVMap[];
    /** Inputs that were used to initiate the run. */
    inputs: KVMap;
    /** Outputs produced by the run, if any. */
    outputs?: KVMap;
    /** ID of an example that might be related to this run. */
    reference_example_id?: string;
    /** ID of a parent run, if this run is part of a larger operation. */
    parent_run_id?: string;
    /** Tags for further categorizing or annotating the run. */
    tags?: string[];
    /** Unique ID assigned to every run within this nested trace. **/
    trace_id?: string;
    /**
     * The dotted order for the run.
     *
     * This is a string composed of {time}{run-uuid}.* so that a trace can be
     * sorted in the order it was executed.
     *
     * Example:
     * - Parent: 20230914T223155647Z1b64098b-4ab7-43f6-afee-992304f198d8
     * - Children:
     *    - 20230914T223155647Z1b64098b-4ab7-43f6-afee-992304f198d8.20230914T223155649Z809ed3a2-0172-4f4d-8a02-a64e9b7a0f8a
     *   - 20230915T223155647Z1b64098b-4ab7-43f6-afee-992304f198d8.20230914T223155650Zc8d9f4c5-6c5a-4b2d-9b1c-3d9d7a7c5c7c
     */
    dotted_order?: string;
    /**
     * Attachments associated with the run.
     * Each entry is a tuple of [mime_type, bytes]
     */
    attachments?: Attachments;
}
type S3URL = {
    ROOT: {
        /** A pre-signed URL */
        presigned_url: string;
        /** The S3 path to the object in storage */
        s3_url: string;
    };
};
//import { Run } from "langsmith";
export interface Run extends BaseRun {
    /** A unique identifier for the run, mandatory when loaded from DB. */
    id: string;
    /** The ID of the project that owns this run. */
    session_id?: string;
    /** IDs of any child runs spawned by this run. */
    child_run_ids?: string[];
    /** Child runs, loaded explicitly via a heavier query. */
    child_runs?: Run[];
    /** Stats capturing feedback for this run. */
    feedback_stats?: KVMap;
    /** The URL path where this run is accessible within the app. */
    app_path?: string;
    /** The manifest ID that correlates with this run. */
    manifest_id?: string;
    /** The current status of the run, such as 'success'. */
    status?: string;
    /** Number of tokens used in the prompt. */
    prompt_tokens?: number;
    /** Number of tokens generated in the completion. */
    completion_tokens?: number;
    /** Total token count, combining prompt and completion. */
    total_tokens?: number;
    /** Time when the first token was processed. */
    first_token_time?: number;
    /** IDs of parent runs, if multiple exist. */
    parent_run_ids?: string[];
    /** Whether the run is included in a dataset. */
    in_dataset?: boolean;
    /** The output S3 URLs */
    outputs_s3_urls?: S3URL;
    /** The input S3 URLs */
    inputs_s3_urls?: S3URL;
}
//import { BindToolsInput, LangSmithParams } from "@langchain/core/language_models/chat_models.js";
export type BindToolsInput = StructuredToolInterface | Record<string, any> | ToolDefinition | RunnableToolLike | StructuredToolParams;

//import { BasePromptValueInterface } from "@langchain/core/prompt_values.js";
export interface BasePromptValueInterface extends Serializable {
    toString(): string;
    toChatMessages(): BaseMessage[];
}
export declare abstract class Runnable<RunInput = any, RunOutput = any, CallOptions extends RunnableConfig = RunnableConfig> extends Serializable implements RunnableInterface<RunInput, RunOutput, CallOptions> {
    protected lc_runnable: boolean;
    name?: string;
    getName(suffix?: string): string;
    abstract invoke(input: RunInput, options?: Partial<CallOptions>): Promise<RunOutput>;
    /**
     * Bind arguments to a Runnable, returning a new Runnable.
     * @param kwargs
     * @returns A new RunnableBinding that, when invoked, will apply the bound args.
     */
    bind(kwargs: Partial<CallOptions>): Runnable<RunInput, RunOutput, CallOptions>;
    /**
     * Return a new Runnable that maps a list of inputs to a list of outputs,
     * by calling invoke() with each input.
     */
    map(): Runnable<RunInput[], RunOutput[], CallOptions>;
    /**
     * Add retry logic to an existing runnable.
     * @param kwargs
     * @returns A new RunnableRetry that, when invoked, will retry according to the parameters.
     */
    withRetry(fields?: {
        stopAfterAttempt?: number;
        onFailedAttempt?: RunnableRetryFailedAttemptHandler;
    }): RunnableRetry<RunInput, RunOutput, CallOptions>;
    /**
     * Bind config to a Runnable, returning a new Runnable.
     * @param config New configuration parameters to attach to the new runnable.
     * @returns A new RunnableBinding with a config matching what's passed.
     */
    withConfig(config: RunnableConfig): Runnable<RunInput, RunOutput, CallOptions>;
    /**
     * Create a new runnable from the current one that will try invoking
     * other passed fallback runnables if the initial invocation fails.
     * @param fields.fallbacks Other runnables to call if the runnable errors.
     * @returns A new RunnableWithFallbacks.
     */
    withFallbacks(fields: {
        fallbacks: Runnable<RunInput, RunOutput>[];
    } | Runnable<RunInput, RunOutput>[]): RunnableWithFallbacks<RunInput, RunOutput>;
    protected _getOptionsList<O extends CallOptions & {
        runType?: string;
    }>(options: Partial<O> | Partial<O>[], length?: number): Partial<O>[];
    /**
     * Default implementation of batch, which calls invoke N times.
     * Subclasses should override this method if they can batch more efficiently.
     * @param inputs Array of inputs to each batch call.
     * @param options Either a single call options object to apply to each batch call or an array for each call.
     * @param batchOptions.returnExceptions Whether to return errors rather than throwing on the first one
     * @returns An array of RunOutputs, or mixed RunOutputs and errors if batchOptions.returnExceptions is set
     */
    batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
        returnExceptions?: false;
    }): Promise<RunOutput[]>;
    batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions & {
        returnExceptions: true;
    }): Promise<(RunOutput | Error)[]>;
    batch(inputs: RunInput[], options?: Partial<CallOptions> | Partial<CallOptions>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
    /**
     * Default streaming implementation.
     * Subclasses should override this method if they support streaming output.
     * @param input
     * @param options
     */
    _streamIterator(input: RunInput, options?: Partial<CallOptions>): AsyncGenerator<RunOutput>;
    /**
     * Stream output in chunks.
     * @param input
     * @param options
     * @returns A readable stream that is also an iterable.
     */
    stream(input: RunInput, options?: Partial<CallOptions>): Promise<IterableReadableStream<RunOutput>>;
    protected _separateRunnableConfigFromCallOptions(options?: Partial<CallOptions>): [RunnableConfig, Omit<Partial<CallOptions>, keyof RunnableConfig>];
    protected _callWithConfig<T extends RunInput>(func: ((input: T) => Promise<RunOutput>) | ((input: T, config?: Partial<CallOptions>, runManager?: CallbackManagerForChainRun) => Promise<RunOutput>), input: T, options?: Partial<CallOptions> & {
        runType?: string;
    }): Promise<RunOutput>;
    /**
     * Internal method that handles batching and configuration for a runnable
     * It takes a function, input values, and optional configuration, and
     * returns a promise that resolves to the output values.
     * @param func The function to be executed for each input value.
     * @param input The input values to be processed.
     * @param config Optional configuration for the function execution.
     * @returns A promise that resolves to the output values.
     */
    _batchWithConfig<T extends RunInput>(func: (inputs: T[], options?: Partial<CallOptions>[], runManagers?: (CallbackManagerForChainRun | undefined)[], batchOptions?: RunnableBatchOptions) => Promise<(RunOutput | Error)[]>, inputs: T[], options?: Partial<CallOptions & {
        runType?: string;
    }> | Partial<CallOptions & {
        runType?: string;
    }>[], batchOptions?: RunnableBatchOptions): Promise<(RunOutput | Error)[]>;
    /**
     * Helper method to transform an Iterator of Input values into an Iterator of
     * Output values, with callbacks.
     * Use this to implement `stream()` or `transform()` in Runnable subclasses.
     */
    protected _transformStreamWithConfig<I extends RunInput, O extends RunOutput>(inputGenerator: AsyncGenerator<I>, transformer: (generator: AsyncGenerator<I>, runManager?: CallbackManagerForChainRun, options?: Partial<CallOptions>) => AsyncGenerator<O>, options?: Partial<CallOptions> & {
        runType?: string;
    }): AsyncGenerator<O>;
    getGraph(_?: RunnableConfig): Graph;
    /**
     * Create a new runnable sequence that runs each individual runnable in series,
     * piping the output of one runnable into another runnable or runnable-like.
     * @param coerceable A runnable, function, or object whose values are functions or runnables.
     * @returns A new runnable sequence.
     */
    pipe<NewRunOutput>(coerceable: RunnableLike<RunOutput, NewRunOutput>): Runnable<RunInput, Exclude<NewRunOutput, Error>>;
    /**
     * Pick keys from the dict output of this runnable. Returns a new runnable.
     */
    pick(keys: string | string[]): Runnable;
    /**
     * Assigns new fields to the dict output of this runnable. Returns a new runnable.
     */
    assign(mapping: RunnableMapLike<Record<string, unknown>, Record<string, unknown>>): Runnable;
    /**
     * Default implementation of transform, which buffers input and then calls stream.
     * Subclasses should override this method if they can start producing output while
     * input is still being generated.
     * @param generator
     * @param options
     */
    transform(generator: AsyncGenerator<RunInput>, options: Partial<CallOptions>): AsyncGenerator<RunOutput>;
    /**
     * Stream all output from a runnable, as reported to the callback system.
     * This includes all inner runs of LLMs, Retrievers, Tools, etc.
     * Output is streamed as Log objects, which include a list of
     * jsonpatch ops that describe how the state of the run has changed in each
     * step, and the final state of the run.
     * The jsonpatch ops can be applied in order to construct state.
     * @param input
     * @param options
     * @param streamOptions
     */
    streamLog(input: RunInput, options?: Partial<CallOptions>, streamOptions?: Omit<LogStreamCallbackHandlerInput, "autoClose">): AsyncGenerator<RunLogPatch>;
    protected _streamLog(input: RunInput, logStreamCallbackHandler: LogStreamCallbackHandler, config: Partial<CallOptions>): AsyncGenerator<RunLogPatch>;
    /**
     * Generate a stream of events emitted by the internal steps of the runnable.
     *
     * Use to create an iterator over StreamEvents that provide real-time information
     * about the progress of the runnable, including StreamEvents from intermediate
     * results.
     *
     * A StreamEvent is a dictionary with the following schema:
     *
     * - `event`: string - Event names are of the format: on_[runnable_type]_(start|stream|end).
     * - `name`: string - The name of the runnable that generated the event.
     * - `run_id`: string - Randomly generated ID associated with the given execution of
     *   the runnable that emitted the event. A child runnable that gets invoked as part of the execution of a
     *   parent runnable is assigned its own unique ID.
     * - `tags`: string[] - The tags of the runnable that generated the event.
     * - `metadata`: Record<string, any> - The metadata of the runnable that generated the event.
     * - `data`: Record<string, any>
     *
     * Below is a table that illustrates some events that might be emitted by various
     * chains. Metadata fields have been omitted from the table for brevity.
     * Chain definitions have been included after the table.
     *
     * **ATTENTION** This reference table is for the V2 version of the schema.
     *
     * ```md
     * +----------------------+-----------------------------+------------------------------------------+
     * | event                | input                       | output/chunk                             |
     * +======================+=============================+==========================================+
     * | on_chat_model_start  | {"messages": BaseMessage[]} |                                          |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_chat_model_stream |                             | AIMessageChunk("hello")                  |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_chat_model_end    | {"messages": BaseMessage[]} | AIMessageChunk("hello world")            |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_llm_start         | {'input': 'hello'}          |                                          |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_llm_stream        |                             | 'Hello'                                  |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_llm_end           | 'Hello human!'              |                                          |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_chain_start       |                             |                                          |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_chain_stream      |                             | "hello world!"                           |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_chain_end         | [Document(...)]             | "hello world!, goodbye world!"           |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_tool_start        | {"x": 1, "y": "2"}          |                                          |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_tool_end          |                             | {"x": 1, "y": "2"}                       |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_retriever_start   | {"query": "hello"}          |                                          |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_retriever_end     | {"query": "hello"}          | [Document(...), ..]                      |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_prompt_start      | {"question": "hello"}       |                                          |
     * +----------------------+-----------------------------+------------------------------------------+
     * | on_prompt_end        | {"question": "hello"}       | ChatPromptValue(messages: BaseMessage[]) |
     * +----------------------+-----------------------------+------------------------------------------+
     * ```
     *
     * The "on_chain_*" events are the default for Runnables that don't fit one of the above categories.
     *
     * In addition to the standard events above, users can also dispatch custom events.
     *
     * Custom events will be only be surfaced with in the `v2` version of the API!
     *
     * A custom event has following format:
     *
     * ```md
     * +-----------+------+------------------------------------------------------------+
     * | Attribute | Type | Description                                                |
     * +===========+======+============================================================+
     * | name      | str  | A user defined name for the event.                         |
     * +-----------+------+------------------------------------------------------------+
     * | data      | Any  | The data associated with the event. This can be anything.  |
     * +-----------+------+------------------------------------------------------------+
     * ```
     *
     * Here's an example:
     *
     * ```ts
     * import { RunnableLambda } from "@langchain/core/runnables";
     * import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
     * // Use this import for web environments that don't support "async_hooks"
     * // and manually pass config to child runs.
     * // import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch/web";
     *
     * const slowThing = RunnableLambda.from(async (someInput: string) => {
     *   // Placeholder for some slow operation
     *   await new Promise((resolve) => setTimeout(resolve, 100));
     *   await dispatchCustomEvent("progress_event", {
     *    message: "Finished step 1 of 2",
     *  });
     *  await new Promise((resolve) => setTimeout(resolve, 100));
     *  return "Done";
     * });
     *
     * const eventStream = await slowThing.streamEvents("hello world", {
     *   version: "v2",
     * });
     *
     * for await (const event of eventStream) {
     *  if (event.event === "on_custom_event") {
     *    console.log(event);
     *  }
     * }
     * ```
     */
    streamEvents(input: RunInput, options: Partial<CallOptions> & {
        version: "v1" | "v2";
    }, streamOptions?: Omit<EventStreamCallbackHandlerInput, "autoClose">): IterableReadableStream<StreamEvent>;
    streamEvents(input: RunInput, options: Partial<CallOptions> & {
        version: "v1" | "v2";
        encoding: "text/event-stream";
    }, streamOptions?: Omit<EventStreamCallbackHandlerInput, "autoClose">): IterableReadableStream<Uint8Array>;
    private _streamEventsV2;
    private _streamEventsV1;
    static isRunnable(thing: any): thing is Runnable;
    /**
     * Bind lifecycle listeners to a Runnable, returning a new Runnable.
     * The Run object contains information about the run, including its id,
     * type, input, output, error, startTime, endTime, and any tags or metadata
     * added to the run.
     *
     * @param {Object} params - The object containing the callback functions.
     * @param {(run: Run) => void} params.onStart - Called before the runnable starts running, with the Run object.
     * @param {(run: Run) => void} params.onEnd - Called after the runnable finishes running, with the Run object.
     * @param {(run: Run) => void} params.onError - Called if the runnable throws an error, with the Run object.
     */
    withListeners({ onStart, onEnd, onError, }: {
        onStart?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
        onEnd?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
        onError?: (run: Run, config?: RunnableConfig) => void | Promise<void>;
    }): Runnable<RunInput, RunOutput, CallOptions>;
    /**
     * Convert a runnable to a tool. Return a new instance of `RunnableToolLike`
     * which contains the runnable, name, description and schema.
     *
     * @template {T extends RunInput = RunInput} RunInput - The input type of the runnable. Should be the same as the `RunInput` type of the runnable.
     *
     * @param fields
     * @param {string | undefined} [fields.name] The name of the tool. If not provided, it will default to the name of the runnable.
     * @param {string | undefined} [fields.description] The description of the tool. Falls back to the description on the Zod schema if not provided, or undefined if neither are provided.
     * @param {z.ZodType<T>} [fields.schema] The Zod schema for the input of the tool. Infers the Zod type from the input type of the runnable.
     * @returns {RunnableToolLike<z.ZodType<T>, RunOutput>} An instance of `RunnableToolLike` which is a runnable that can be used as a tool.
     */
    asTool<T extends RunInput = RunInput>(fields: {
        name?: string;
        description?: string;
        schema: z.ZodType<T>;
    }): RunnableToolLike<z.ZodType<T | ToolCall>, RunOutput>;
}
export type RunnableBindingArgs<RunInput, RunOutput, CallOptions extends RunnableConfig = RunnableConfig> = {
    bound: Runnable<RunInput, RunOutput, CallOptions>;
    kwargs?: Partial<CallOptions>;
    config: RunnableConfig;
    configFactories?: Array<(config: RunnableConfig) => RunnableConfig>;
};

export declare class RunnableToolLike<RunInput extends z.ZodType = z.ZodType, RunOutput = unknown> extends RunnableBinding<z.infer<RunInput>, RunOutput> {
    name: string;
    description?: string;
    schema: RunInput;
    constructor(fields: RunnableToolLikeArgs<RunInput, RunOutput>);
    static lc_name(): string;
}
//import { Runnable, RunnableToolLike } from "@langchain/core/runnables.js";
export declare class ZodObject<T extends ZodRawShape, UnknownKeys extends UnknownKeysParam = UnknownKeysParam, Catchall extends ZodTypeAny = ZodTypeAny, Output = objectOutputType<T, Catchall, UnknownKeys>, Input = objectInputType<T, Catchall, UnknownKeys>> extends ZodType<Output, ZodObjectDef<T, UnknownKeys, Catchall>, Input> {
    private _cached;
    _getCached(): {
        shape: T;
        keys: string[];
    };
    _parse(input: ParseInput): ParseReturnType<this["_output"]>;
    get shape(): T;
    strict(message?: errorUtil.ErrMessage): ZodObject<T, "strict", Catchall>;
    strip(): ZodObject<T, "strip", Catchall>;
    passthrough(): ZodObject<T, "passthrough", Catchall>;
    /**
     * @deprecated In most cases, this is no longer needed - unknown properties are now silently stripped.
     * If you want to pass through unknown properties, use `.passthrough()` instead.
     */
    nonstrict: () => ZodObject<T, "passthrough", Catchall>;
    extend<Augmentation extends ZodRawShape>(augmentation: Augmentation): ZodObject<objectUtil.extendShape<T, Augmentation>, UnknownKeys, Catchall>;
    /**
     * @deprecated Use `.extend` instead
     *  */
    augment: <Augmentation extends ZodRawShape>(augmentation: Augmentation) => ZodObject<objectUtil.extendShape<T, Augmentation>, UnknownKeys, Catchall, objectOutputType<objectUtil.extendShape<T, Augmentation>, Catchall, UnknownKeys>, objectInputType<objectUtil.extendShape<T, Augmentation>, Catchall, UnknownKeys>>;
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge<Incoming extends AnyZodObject, Augmentation extends Incoming["shape"]>(merging: Incoming): ZodObject<objectUtil.extendShape<T, Augmentation>, Incoming["_def"]["unknownKeys"], Incoming["_def"]["catchall"]>;
    setKey<Key extends string, Schema extends ZodTypeAny>(key: Key, schema: Schema): ZodObject<T & {
        [k in Key]: Schema;
    }, UnknownKeys, Catchall>;
    catchall<Index extends ZodTypeAny>(index: Index): ZodObject<T, UnknownKeys, Index>;
    pick<Mask extends util.Exactly<{
        [k in keyof T]?: true;
    }, Mask>>(mask: Mask): ZodObject<Pick<T, Extract<keyof T, keyof Mask>>, UnknownKeys, Catchall>;
    omit<Mask extends util.Exactly<{
        [k in keyof T]?: true;
    }, Mask>>(mask: Mask): ZodObject<Omit<T, keyof Mask>, UnknownKeys, Catchall>;
    /**
     * @deprecated
     */
    deepPartial(): partialUtil.DeepPartial<this>;
    partial(): ZodObject<{
        [k in keyof T]: ZodOptional<T[k]>;
    }, UnknownKeys, Catchall>;
    partial<Mask extends util.Exactly<{
        [k in keyof T]?: true;
    }, Mask>>(mask: Mask): ZodObject<objectUtil.noNever<{
        [k in keyof T]: k extends keyof Mask ? ZodOptional<T[k]> : T[k];
    }>, UnknownKeys, Catchall>;
    required(): ZodObject<{
        [k in keyof T]: deoptional<T[k]>;
    }, UnknownKeys, Catchall>;
    required<Mask extends util.Exactly<{
        [k in keyof T]?: true;
    }, Mask>>(mask: Mask): ZodObject<objectUtil.noNever<{
        [k in keyof T]: k extends keyof Mask ? deoptional<T[k]> : T[k];
    }>, UnknownKeys, Catchall>;
    keyof(): ZodEnum<enumUtil.UnionToTupleString<keyof T>>;
    static create: <T_1 extends ZodRawShape>(shape: T_1, params?: RawCreateParams) => ZodObject<T_1, "strip", ZodTypeAny, { [k in keyof objectUtil.addQuestionMarks<baseObjectOutputType<T_1>, any>]: objectUtil.addQuestionMarks<baseObjectOutputType<T_1>, any>[k]; }, { [k_1 in keyof baseObjectInputType<T_1>]: baseObjectInputType<T_1>[k_1]; }>;
    static strictCreate: <T_1 extends ZodRawShape>(shape: T_1, params?: RawCreateParams) => ZodObject<T_1, "strict", ZodTypeAny, { [k in keyof objectUtil.addQuestionMarks<baseObjectOutputType<T_1>, any>]: objectUtil.addQuestionMarks<baseObjectOutputType<T_1>, any>[k]; }, { [k_1 in keyof baseObjectInputType<T_1>]: baseObjectInputType<T_1>[k_1]; }>;
    static lazycreate: <T_1 extends ZodRawShape>(shape: () => T_1, params?: RawCreateParams) => ZodObject<T_1, "strip", ZodTypeAny, { [k in keyof objectUtil.addQuestionMarks<baseObjectOutputType<T_1>, any>]: objectUtil.addQuestionMarks<baseObjectOutputType<T_1>, any>[k]; }, { [k_1 in keyof baseObjectInputType<T_1>]: baseObjectInputType<T_1>[k_1]; }>;
}

class ToolReturnType {}
export type ZodObjectAny = ZodObject<any, UnknownKeysParam>;
export interface StructuredToolInterface<T extends ZodObjectAny = ZodObjectAny> extends RunnableInterface<(z.output<T> extends string ? string : never) | z.input<T> | ToolCall, ToolReturnType> {
    lc_namespace: string[];
    /**
     * A Zod schema representing the parameters of the tool.
     */
    schema: T | z.ZodEffects<T>;
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.3.0.
     *
     * Calls the tool with the provided argument, configuration, and tags. It
     * parses the input according to the schema, handles any errors, and
     * manages callbacks.
     * @param arg The input argument for the tool.
     * @param configArg Optional configuration or callbacks for the tool.
     * @param tags Optional tags for the tool.
     * @returns A Promise that resolves with a string.
     */
    call(arg: (z.output<T> extends string ? string : never) | z.input<T> | ToolCall, configArg?: Callbacks | RunnableConfig, 
    /** @deprecated */
    tags?: string[]): Promise<ToolReturnType>;
    /**
     * The name of the tool.
     */
    name: string;
    /**
     * A description of the tool.
     */
    description: string;
    returnDirect: boolean;
}

export interface StructuredToolParams extends Pick<StructuredToolInterface, "name" | "schema"> {
    /**
     * An optional description of the tool to pass to the model.
     */
    description?: string;
}
//import { StructuredToolInterface, StructuredToolParams } from "@langchain/core/tools.js";
//import { ToolChoice } from "@langchain/core/language_models/chat_models.js";
//import { BaseChatModelParams } from "@langchain/core/language_models/chat_models.js";
//import { FunctionDefinition } from "@langchain/core/language_models/base.js";
//import { BaseFunctionCallOptions } from "@langchain/core/language_models/base.js";
//import { Serialized } from "@langchain/core/dist/load/serializable.js";

//import { ChatOpenAIFields, ChatOpenAICallOptions, ChatOpenAIStructuredOutputMethodOptions } from "./types.js";

dotenv.config();

// export class ChatWrapper {
//    // private chatModel: ChatOpenAI;
//     callKeys: string[] = [];
//     lc_serializeable = true;
//     lc_secrets = ["apiKey"];
    
//      lc_serializable = true;
//       lc_aliases = ["chat"];
//       temperature = 0.5;
//       topP = 1;
//       frequencyPenalty= 0;
//        presencePenalty= 0;
//        n=1000;
//        modelName = "gpt-4o";
//        model="gpt-4o";       

//     constructor({ apiKey, model = "gpt-4o" }: { apiKey: string; model?: string }) {
//         this.chatModel = new ChatOpenAI({ apiKey, model });
//     }

//     async invoke(prompt: string) {
//         return this.chatModel.invoke( prompt );
//     }
// };
export type OpenAICoreRequestOptions<Req extends object = Record<string, unknown>> = {
    path?: string;
    query?: Req | undefined;
    body?: Req | undefined;
    headers?: Record<string, string | null | undefined> | undefined;
    maxRetries?: number;
    stream?: boolean | undefined;
    timeout?: number;
    httpAgent?: any;
    signal?: AbortSignal | undefined | null;
    idempotencyKey?: string;
};
export interface BaseSerialized<T extends string> {
    lc: number;
    type: T;
    id: string[];
    name?: string;
    graph?: Record<string, any>;
}
export interface SerializedFields {
    [key: string]: any;
}
export interface SerializedKeyAlias {
    [key: string]: string;
}
export declare function keyToJson(key: string, map?: SerializedKeyAlias): string;
export declare function keyFromJson(key: string, map?: SerializedKeyAlias): string;
export declare function mapKeys(fields: SerializedFields, mapper: typeof keyToJson, map?: SerializedKeyAlias): SerializedFields;

export interface SerializedConstructor extends BaseSerialized<"constructor"> {
    kwargs: SerializedFields;
}
export interface SerializedSecret extends BaseSerialized<"secret"> {
}
export interface SerializedNotImplemented extends BaseSerialized<"not_implemented"> {
}
export interface FunctionCall {
    /**
     * The arguments to call the function with, as generated by the model in JSON
     * format. Note that the model does not always generate valid JSON, and may
     * hallucinate parameters not defined by your function schema. Validate the
     * arguments in your code before calling your function.
     */
    arguments: string;
    /**
     * The name of the function to call.
     */
    name: string;
}
export type Serialized = SerializedConstructor | SerializedSecret | SerializedNotImplemented;
export type OpenAIToolCall = {
    /**
     * The ID of the tool call.
     */
    id: string;
    /**
     * The function that the model called.
     */
    function: FunctionCall;
    /**
     * The type of the tool. Currently, only `function` is supported.
     */
    type: "function";
    index?: number;
};

export type BaseMessageFields = {
    content: MessageContent;
    name?: string;
    additional_kwargs?: {
        /**
         * @deprecated Use "tool_calls" field on AIMessages instead
         */
        function_call?: FunctionCall;
        /**
         * @deprecated Use "tool_calls" field on AIMessages instead
         */
        tool_calls?: OpenAIToolCall[];
        [key: string]: unknown;
    };
    /** Response metadata. For example: response headers, logprobs, token counts. */
    response_metadata?: Record<string, any>;
    /**
     * An optional unique identifier for the message. This should ideally be
     * provided by the provider/model which created the message.
     */
    id?: string;
};
export type MessageContentText = {
    type: "text";
    text: string;
};
export type ImageDetail = "auto" | "low" | "high";
export type MessageContentImageUrl = {
    type: "image_url";
    image_url: string | {
        url: string;
        detail?: ImageDetail;
    };
};
export type MessageContentComplex = MessageContentText | MessageContentImageUrl | (Record<string, any> & {
    type?: "text" | "image_url" | string;
}) | (Record<string, any> & {
    type?: never;
});
export type MessageContent = string | MessageContentComplex[];
export interface SerializableInterface {
    get lc_id(): string[];
}
export declare abstract class Serializable implements SerializableInterface {
    lc_serializable: boolean;
    lc_kwargs: SerializedFields;
    /**
     * A path to the module that contains the class, eg. ["langchain", "llms"]
     * Usually should be the same as the entrypoint the class is exported from.
     */
    abstract lc_namespace: string[];
    /**
     * The name of the serializable. Override to provide an alias or
     * to preserve the serialized module name in minified environments.
     *
     * Implemented as a static method to support loading logic.
     */
    static lc_name(): string;
    /**
     * The final serialized identifier for the module.
     */
    get lc_id(): string[];
    /**
     * A map of secrets, which will be omitted from serialization.
     * Keys are paths to the secret in constructor args, e.g. "foo.bar.baz".
     * Values are the secret ids, which will be used when deserializing.
     */
    get lc_secrets(): {
        [key: string]: string;
    } | undefined;
    /**
     * A map of additional attributes to merge with constructor args.
     * Keys are the attribute names, e.g. "foo".
     * Values are the attribute values, which will be serialized.
     * These attributes need to be accepted by the constructor as arguments.
     */
    get lc_attributes(): SerializedFields | undefined;
    /**
     * A map of aliases for constructor args.
     * Keys are the attribute names, e.g. "foo".
     * Values are the alias that will replace the key in serialization.
     * This is used to eg. make argument names match Python.
     */
    get lc_aliases(): {
        [key: string]: string;
    } | undefined;
    constructor(kwargs?: SerializedFields, ..._args: never[]);
    toJSON(): Serialized;
    toJSONNotImplemented(): SerializedNotImplemented;
}
export interface StoredMessageData {
    content: string;
    role: string | undefined;
    name: string | undefined;
    tool_call_id: string | undefined;
    additional_kwargs?: Record<string, any>;
    /** Response metadata. For example: response headers, logprobs, token counts. */
    response_metadata?: Record<string, any>;
    id?: string;
}
export interface StoredMessage {
    type: string;
    data: StoredMessageData;
}
export type MessageType = "human" | "ai" | "generic" | "developer" | "system" | "function" | "tool" | "remove";
export declare abstract class BaseMessage extends Serializable implements BaseMessageFields {
    lc_namespace: string[];
    lc_serializable: boolean;
    get lc_aliases(): Record<string, string>;
    /**
     * @deprecated
     * Use {@link BaseMessage.content} instead.
     */
    get text(): string;
    /** The content of the message. */
    content: MessageContent;
    /** The name of the message sender in a multi-user chat. */
    name?: string;
    /** Additional keyword arguments */
    additional_kwargs: NonNullable<BaseMessageFields["additional_kwargs"]>;
    /** Response metadata. For example: response headers, logprobs, token counts. */
    response_metadata: NonNullable<BaseMessageFields["response_metadata"]>;
    /**
     * An optional unique identifier for the message. This should ideally be
     * provided by the provider/model which created the message.
     */
    id?: string;
    /**
     * @deprecated Use .getType() instead or import the proper typeguard.
     * For example:
     *
     * ```ts
     * import { isAIMessage } from "@langchain/core/messages";
     *
     * const message = new AIMessage("Hello!");
     * isAIMessage(message); // true
     * ```
     */
    abstract _getType(): MessageType;
    /** The type of the message. */
    getType(): MessageType;
    constructor(fields: string | BaseMessageFields, 
    /** @deprecated */
    kwargs?: Record<string, unknown>);
    toDict(): StoredMessage;
    static lc_name(): string;
    get _printableFields(): Record<string, unknown>;
    _updateId(value: string | undefined): void;
    get [Symbol.toStringTag](): any;
}

declare abstract class BaseCallbackHandlerMethodsClass {
    /**
     * Called at the start of an LLM or Chat Model run, with the prompt(s)
     * and the run ID.
     */
    handleLLMStart?(llm: Serialized, prompts: string[], runId: string, parentRunId?: string, extraParams?: Record<string, unknown>, tags?: string[], metadata?: Record<string, unknown>, runName?: string): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    /**
     * Called when an LLM/ChatModel in `streaming` mode produces a new token
     */
    handleLLMNewToken?(token: string, 
    /**
     * idx.prompt is the index of the prompt that produced the token
     *   (if there are multiple prompts)
     * idx.completion is the index of the completion that produced the token
     *   (if multiple completions per prompt are requested)
     */
    idx: NewTokenIndices, runId: string, parentRunId?: string, tags?: string[], fields?: HandleLLMNewTokenCallbackFields): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    /**
     * Called if an LLM/ChatModel run encounters an error
     */
    handleLLMError?(err: Error, runId: string, parentRunId?: string, tags?: string[]): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    /**
     * Called at the end of an LLM/ChatModel run, with the output and the run ID.
     */
    handleLLMEnd?(output: LLMResult, runId: string, parentRunId?: string, tags?: string[]): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    /**
     * Called at the start of a Chat Model run, with the prompt(s)
     * and the run ID.
     */
    handleChatModelStart?(llm: Serialized, messages: BaseMessage[][], runId: string, parentRunId?: string, extraParams?: Record<string, unknown>, tags?: string[], metadata?: Record<string, unknown>, runName?: string): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    /**
     * Called at the start of a Chain run, with the chain name and inputs
     * and the run ID.
     */
    handleChainStart?(chain: Serialized, inputs: ChainValues, runId: string, parentRunId?: string, tags?: string[], metadata?: Record<string, unknown>, runType?: string, runName?: string): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    /**
     * Called if a Chain run encounters an error
     */
    handleChainError?(err: Error, runId: string, parentRunId?: string, tags?: string[], kwargs?: {
        inputs?: Record<string, unknown>;
    }): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    /**
     * Called at the end of a Chain run, with the outputs and the run ID.
     */
    handleChainEnd?(outputs: ChainValues, runId: string, parentRunId?: string, tags?: string[], kwargs?: {
        inputs?: Record<string, unknown>;
    }): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    /**
     * Called at the start of a Tool run, with the tool name and input
     * and the run ID.
     */
    handleToolStart?(tool: Serialized, input: string, runId: string, parentRunId?: string, tags?: string[], metadata?: Record<string, unknown>, runName?: string): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    /**
     * Called if a Tool run encounters an error
     */
    handleToolError?(err: Error, runId: string, parentRunId?: string, tags?: string[]): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    /**
     * Called at the end of a Tool run, with the tool output and the run ID.
     */
    handleToolEnd?(output: any, runId: string, parentRunId?: string, tags?: string[]): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    handleText?(text: string, runId: string, parentRunId?: string, tags?: string[]): Promise<void> | void;
    /**
     * Called when an agent is about to execute an action,
     * with the action and the run ID.
     */
    handleAgentAction?(action: AgentAction, runId: string, parentRunId?: string, tags?: string[]): Promise<void> | void;
    /**
     * Called when an agent finishes execution, before it exits.
     * with the final output and the run ID.
     */
    handleAgentEnd?(action: AgentFinish, runId: string, parentRunId?: string, tags?: string[]): Promise<void> | void;
    handleRetrieverStart?(retriever: Serialized, query: string, runId: string, parentRunId?: string, tags?: string[], metadata?: Record<string, unknown>, name?: string): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    handleRetrieverEnd?(documents: DocumentInterface[], runId: string, parentRunId?: string, tags?: string[]): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    handleRetrieverError?(err: Error, runId: string, parentRunId?: string, tags?: string[]): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
    handleCustomEvent?(eventName: string, data: any, runId: string, tags?: string[], metadata?: Record<string, any>): // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Promise<any> | any;
}

export type CallbackHandlerMethods = BaseCallbackHandlerMethodsClass;

type BaseCallbackManagerMethods = {
    [K in keyof CallbackHandlerMethods]?: (...args: Parameters<Required<CallbackHandlerMethods>[K]>) => Promise<unknown>;
};
export interface CallbackManagerOptions {
    verbose?: boolean;
    tracing?: boolean;
}
export type Callbacks = CallbackManager | (BaseCallbackHandler | CallbackHandlerMethods)[];
export interface BaseCallbackConfig {
    /**
     * Name for the tracer run for this call. Defaults to the name of the class.
     */
    runName?: string;
    /**
     * Tags for this call and any sub-calls (eg. a Chain calling an LLM).
     * You can use these to filter calls.
     */
    tags?: string[];
    /**
     * Metadata for this call and any sub-calls (eg. a Chain calling an LLM).
     * Keys should be strings, values should be JSON-serializable.
     */
    metadata?: Record<string, unknown>;
    /**
     * Callbacks for this call and any sub-calls (eg. a Chain calling an LLM).
     * Tags are passed to all callbacks, metadata is passed to handle*Start callbacks.
     */
    callbacks?: Callbacks;
    /**
     * Unique identifier for the tracer run for this call. If not provided, a new UUID
     * will be generated.
     */
    runId?: string;
}
export interface RunnableConfig<ConfigurableFieldType extends Record<string, any> = Record<string, any>> extends BaseCallbackConfig {
    /**
     * Runtime values for attributes previously made configurable on this Runnable,
     * or sub-Runnables.
     */
    configurable?: ConfigurableFieldType;
    /**
     * Maximum number of times a call can recurse. If not provided, defaults to 25.
     */
    recursionLimit?: number;
    /** Maximum number of parallel calls to make. */
    maxConcurrency?: number;
    /**
     * Timeout for this call in milliseconds.
     */
    timeout?: number;
    /**
     * Abort signal for this call.
     * If provided, the call will be aborted when the signal is aborted.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
     */
    signal?: AbortSignal;
}

export interface BaseLanguageModelCallOptions extends RunnableConfig {
    /**
     * Stop tokens to use for this call.
     * If not provided, the default stop tokens for the model will be used.
     */
    stop?: string[];
}
export interface OpenAICallOptions extends BaseLanguageModelCallOptions {
    /**
     * Additional options to pass to the underlying axios request.
     */
    options?: OpenAICoreRequestOptions;
}
export type FunctionCallOption = {
    name: string;
};
export interface FunctionDefinition {
    /**
     * The name of the function to be called. Must be a-z, A-Z, 0-9, or contain
     * underscores and dashes, with a maximum length of 64.
     */
    name: string;
    /**
     * The parameters the functions accepts, described as a JSON Schema object. See the
     * [guide](https://platform.openai.com/docs/guides/gpt/function-calling) for
     * examples, and the
     * [JSON Schema reference](https://json-schema.org/understanding-json-schema/) for
     * documentation about the format.
     *
     * To describe a function that accepts no parameters, provide the value
     * `{"type": "object", "properties": {}}`.
     */
    parameters: Record<string, unknown>;
    /**
     * A description of what the function does, used by the model to choose when and
     * how to call the function.
     */
    description?: string;
}
export interface BaseFunctionCallOptions extends BaseLanguageModelCallOptions {
    function_call?: FunctionCallOption;
    functions?: FunctionDefinition[];
}
class ChatOpenAIToolType{}
export interface ChatOpenAICallOptions extends OpenAICallOptions, BaseFunctionCallOptions {
    tools?: ChatOpenAIToolType[];
    tool_choice?: OpenAIToolChoice;
    promptIndex?: number;
    response_format?: ChatOpenAIResponseFormat;
    seed?: number;
    /**
     * Additional options to pass to streamed completions.
     * If provided takes precedence over "streamUsage" set at initialization time.
     */
    stream_options?: {
        /**
         * Whether or not to include token usage in the stream.
         * If set to `true`, this will include an additional
         * chunk at the end of the stream with the token usage.
         */
        include_usage: boolean;
    };
    /**
     * Whether or not to restrict the ability to
     * call multiple tools in one response.
     */
    parallel_tool_calls?: boolean;
    /**
     * If `true`, model output is guaranteed to exactly match the JSON Schema
     * provided in the tool definition. If `true`, the input schema will also be
     * validated according to
     * https://platform.openai.com/docs/guides/structured-outputs/supported-schemas.
     *
     * If `false`, input schema will not be validated and model output will not
     * be validated.
     *
     * If `undefined`, `strict` argument will not be passed to the model.
     *
     * @version 0.2.6
     */
    strict?: boolean;
    /**
     * Output types that you would like the model to generate for this request. Most
     * models are capable of generating text, which is the default:
     *
     * `["text"]`
     *
     * The `gpt-4o-audio-preview` model can also be used to
     * [generate audio](https://platform.openai.com/docs/guides/audio). To request that
     * this model generate both text and audio responses, you can use:
     *
     * `["text", "audio"]`
     */
    modalities?: Array<OpenAIClient.Chat.ChatCompletionModality>;
    /**
     * Parameters for audio output. Required when audio output is requested with
     * `modalities: ["audio"]`.
     * [Learn more](https://platform.openai.com/docs/guides/audio).
     */
    audio?: OpenAIClient.Chat.ChatCompletionAudioParam;
    /**
     * Static predicted output content, such as the content of a text file that is being regenerated.
     * [Learn more](https://platform.openai.com/docs/guides/latency-optimization#use-predicted-outputs).
     */
    prediction?: OpenAIClient.ChatCompletionPredictionContent;
    /**
     * Constrains effort on reasoning for reasoning models. Currently supported values are low, medium, and high.
     * Reducing reasoning effort can result in faster responses and fewer tokens used on reasoning in a response.
     */
    reasoning_effort?: OpenAIClient.Chat.ChatCompletionReasoningEffort;
}
export type FailedAttemptHandler = (error: any) => any;
export interface AsyncCallerParams {
    /**
     * The maximum number of concurrent calls that can be made.
     * Defaults to `Infinity`, which means no limit.
     */
    maxConcurrency?: number;
    /**
     * The maximum number of retries that can be made for a single call,
     * with an exponential backoff between each attempt. Defaults to 6.
     */
    maxRetries?: number;
    /**
     * Custom handler to handle failed attempts. Takes the originally thrown
     * error object as input, and should itself throw an error if the input
     * error is not retryable.
     */
    onFailedAttempt?: FailedAttemptHandler;
}
export interface BaseLangChainParams {
    verbose?: boolean;
    callbacks?: Callbacks;
    tags?: string[];
    metadata?: Record<string, unknown>;
}
export interface Generation {
    /**
     * Generated text output
     */
    text: string;
    /**
     * Raw generation info response from the provider.
     * May include things like reason for finishing (e.g. in {@link OpenAI})
     */
    generationInfo?: Record<string, any>;
}
export declare abstract class BaseCache<T = Generation[]> {
    abstract lookup(prompt: string, llmKey: string): Promise<T | null>;
    abstract update(prompt: string, llmKey: string, value: T): Promise<void>;
}
export interface BaseLanguageModelParams extends AsyncCallerParams, BaseLangChainParams {
    /**
     * @deprecated Use `callbacks` instead
     */
    callbackManager?: CallbackManager;
    cache?: BaseCache | boolean;
}
export type BaseChatModelParams = BaseLanguageModelParams & {
    /**
     * Whether to disable streaming.
     *
     * If streaming is bypassed, then `stream()` will defer to
     * `invoke()`.
     *
     * - If true, will always bypass streaming case.
     * - If false (default), will always use streaming case if available.
     */
    disableStreaming?: boolean;
};
export interface ChatOpenAIFields extends Partial<OpenAIChatInput>, Partial<AzureOpenAIInput>, BaseChatModelParams {
    configuration?: ClientOptions & LegacyOpenAIInput;
}
export declare abstract class BaseMessageChunk extends BaseMessage {
    abstract concat(chunk: BaseMessageChunk): BaseMessageChunk;
}
export declare class ChatGenerationChunk extends GenerationChunk implements ChatGeneration {
    message: BaseMessageChunk;
    constructor(fields: ChatGenerationChunkFields);
    concat(chunk: ChatGenerationChunk): ChatGenerationChunk;

    //

    lc_namespace: string[];
    lc_serializable: boolean;
    get lc_aliases(): Record<string, string>;
    /**
     * @deprecated
     * Use {@link BaseMessage.content} instead.
     */
    text: string;
    /** The content of the message. */
    content: MessageContent;
    /** The name of the message sender in a multi-user chat. */
    name?: string;
    /** Additional keyword arguments */
    additional_kwargs: NonNullable<BaseMessageFields["additional_kwargs"]>;
    /** Response metadata. For example: response headers, logprobs, token counts. */
    response_metadata: NonNullable<BaseMessageFields["response_metadata"]>;
    /**
     * An optional unique identifier for the message. This should ideally be
     * provided by the provider/model which created the message.
     */
    id?: string;
    /**
     * @deprecated Use .getType() instead or import the proper typeguard.
     * For example:
     *
     * ```ts
     * import { isAIMessage } from "@langchain/core/messages";
     *
     * const message = new AIMessage("Hello!");
     * isAIMessage(message); // true
     * ```
     */
    _getType(): MessageType;
    /** The type of the message. */
    lc_kwargs: SerializedFields;
    lc_id: string[];
    lc_secrets: {}
    lc_attributes: {}
    toJSON(): Serialized;
    toJSONNotImplemented(): SerializedNotImplemented;
    getType(): MessageType;
    constructor(fields: string | BaseMessageFields, 
    /** @deprecated */
    kwargs?: Record<string, unknown>);
    toDict(): StoredMessage;
    static lc_name(): string;
    get _printableFields(): Record<string, unknown>;
    _updateId(value: string | undefined): void;
    get [Symbol.toStringTag](): any;
}
export type ToolChoice = string | Record<string, any> | "auto" | "any";
export type BaseChatModelCallOptions = BaseLanguageModelCallOptions & {
    /**
     * Specifies how the chat model should use tools.
     * @default undefined
     *
     * Possible values:
     * - "auto": The model may choose to use any of the provided tools, or none.
     * - "any": The model must use one of the provided tools.
     * - "none": The model must not use any tools.
     * - A string (not "auto", "any", or "none"): The name of a specific tool the model must use.
     * - An object: A custom schema specifying tool choice parameters. Specific to the provider.
     *
     * Note: Not all providers support tool_choice. An error will be thrown
     * if used with an unsupported model.
     */
    tool_choice?: ToolChoice;
};
export type ToolCall = {
    name: string;
    args: Record<string, any>;
    id?: string;
    type?: "tool_call";
};
export type ToolCallChunk = {
    name?: string;
    args?: string;
    id?: string;
    index?: number;
    type?: "tool_call_chunk";
};
export type InvalidToolCall = {
    name?: string;
    args?: string;
    id?: string;
    error?: string;
    type?: "invalid_tool_call";
};
export type InputTokenDetails = {
    /**
     * Audio input tokens.
     */
    audio?: number;
    /**
     * Input tokens that were cached and there was a cache hit.
     *
     * Since there was a cache hit, the tokens were read from the cache.
     * More precisely, the model state given these tokens was read from the cache.
     */
    cache_read?: number;
    /**
     * Input tokens that were cached and there was a cache miss.
     *
     * Since there was a cache miss, the cache was created from these tokens.
     */
    cache_creation?: number;
};
export type OutputTokenDetails = {
    /**
     * Audio output tokens
     */
    audio?: number;
    /**
     * Reasoning output tokens.
     *
     * Tokens generated by the model in a chain of thought process (i.e. by
     * OpenAI's o1 models) that are not returned as part of model output.
     */
    reasoning?: number;
};
export type UsageMetadata = {
    /**
     * Count of input (or prompt) tokens. Sum of all input token types.
     */
    input_tokens: number;
    /**
     * Count of output (or completion) tokens. Sum of all output token types.
     */
    output_tokens: number;
    /**
     * Total token count. Sum of input_tokens + output_tokens.
     */
    total_tokens: number;
    /**
     * Breakdown of input token counts.
     *
     * Does *not* need to sum to full input token count. Does *not* need to have all keys.
     */
    input_token_details?: InputTokenDetails;
    /**
     * Breakdown of output token counts.
     *
     * Does *not* need to sum to full output token count. Does *not* need to have all keys.
     */
    output_token_details?: OutputTokenDetails;
};
export type AIMessageFields = BaseMessageFields & {
    tool_calls?: ToolCall[];
    invalid_tool_calls?: InvalidToolCall[];
    usage_metadata?: UsageMetadata;
};
export type AIMessageChunkFields = AIMessageFields & {
    tool_call_chunks?: ToolCallChunk[];
};
export declare class AIMessageChunk extends BaseMessageChunk {
    tool_calls?: ToolCall[];
    invalid_tool_calls?: InvalidToolCall[];
    tool_call_chunks?: ToolCallChunk[];
    /**
     * If provided, token usage information associated with the message.
     */
    usage_metadata?: UsageMetadata;
    constructor(fields: string | AIMessageChunkFields);
    get lc_aliases(): Record<string, string>;
    static lc_name(): string;
    _getType(): MessageType;
    get _printableFields(): Record<string, unknown>;
    concat(chunk: AIMessageChunk): AIMessageChunk;
}
export type StringWithAutocomplete<T> = T | (string & Record<never, never>);
export type InputValues<K extends string = string> = Record<K, any>;
export type PartialValues<K extends string = string> = Record<K, string | (() => Promise<string>) | (() => string)>;
export type ChainValues = Record<string, any>;


export type MessageFieldWithRole = {
    role: StringWithAutocomplete<"user" | "assistant" | MessageType>;
    content: MessageContent;
    name?: string;
} & Record<string, unknown>;
export type BaseMessageLike = BaseMessage | MessageFieldWithRole | [
    StringWithAutocomplete<MessageType | "user" | "assistant" | "placeholder">,
    MessageContent
] | string
export declare abstract class BaseChatModel<CallOptions extends BaseChatModelCallOptions = BaseChatModelCallOptions, OutputMessageType extends BaseMessageChunk = AIMessageChunk> extends BaseLanguageModel<OutputMessageType, CallOptions> {
    ParsedCallOptions: Omit<CallOptions, Exclude<keyof RunnableConfig, "signal" | "timeout" | "maxConcurrency">>;
    lc_namespace: string[];
    disableStreaming: boolean;
    constructor(fields: BaseChatModelParams);
    _combineLLMOutput?(...llmOutputs: LLMResult["llmOutput"][]): LLMResult["llmOutput"];
    protected _separateRunnableConfigFromCallOptionsCompat(options?: Partial<CallOptions>): [RunnableConfig, this["ParsedCallOptions"]];
    /**
     * Bind tool-like objects to this chat model.
     *
     * @param tools A list of tool definitions to bind to this chat model.
     * Can be a structured tool, an OpenAI formatted tool, or an object
     * matching the provider's specific tool schema.
     * @param kwargs Any additional parameters to bind.
     */
    bindTools?(tools: BindToolsInput[], kwargs?: Partial<CallOptions>): Runnable<BaseLanguageModelInput, OutputMessageType, CallOptions>;
    /**
     * Invokes the chat model with a single input.
     * @param input The input for the language model.
     * @param options The call options.
     * @returns A Promise that resolves to a BaseMessageChunk.
     */
    invoke(input: BaseLanguageModelInput, options?: CallOptions): Promise<OutputMessageType>;
    _streamResponseChunks(_messages: BaseMessage[], _options: this["ParsedCallOptions"], _runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk>;
    _streamIterator(input: BaseLanguageModelInput, options?: CallOptions): AsyncGenerator<OutputMessageType>;
    getLsParams(options: this["ParsedCallOptions"]): LangSmithParams;
    /** @ignore */
    _generateUncached(messages: BaseMessageLike[][], parsedOptions: this["ParsedCallOptions"], handledOptions: RunnableConfig): Promise<LLMResult>;
    _generateCached({ messages, cache, llmStringKey, parsedOptions, handledOptions, }: {
        messages: BaseMessageLike[][];
        cache: BaseCache<Generation[]>;
        llmStringKey: string;
        parsedOptions: any;
        handledOptions: RunnableConfig;
    }): Promise<LLMResult & {
        missingPromptIndices: number[];
    }>;
    /**
     * Generates chat based on the input messages.
     * @param messages An array of arrays of BaseMessage instances.
     * @param options The call options or an array of stop sequences.
     * @param callbacks The callbacks for the language model.
     * @returns A Promise that resolves to an LLMResult.
     */
    generate(messages: BaseMessageLike[][], options?: string[] | CallOptions, callbacks?: Callbacks): Promise<LLMResult>;
    /**
     * Get the parameters used to invoke the model
     */
    invocationParams(_options?: this["ParsedCallOptions"]): any;
    _modelType(): string;
    abstract _llmType(): string;
    /**
     * @deprecated
     * Return a json-like object representing this LLM.
     */
    serialize(): SerializedLLM;
    /**
     * Generates a prompt based on the input prompt values.
     * @param promptValues An array of BasePromptValue instances.
     * @param options The call options or an array of stop sequences.
     * @param callbacks The callbacks for the language model.
     * @returns A Promise that resolves to an LLMResult.
     */
    generatePrompt(promptValues: BasePromptValueInterface[], options?: string[] | CallOptions, callbacks?: Callbacks): Promise<LLMResult>;
    abstract _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult>;
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
     *
     * Makes a single call to the chat model.
     * @param messages An array of BaseMessage instances.
     * @param options The call options or an array of stop sequences.
     * @param callbacks The callbacks for the language model.
     * @returns A Promise that resolves to a BaseMessage.
     */
    call(messages: BaseMessageLike[], options?: string[] | CallOptions, callbacks?: Callbacks): Promise<BaseMessage>;
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
     *
     * Makes a single call to the chat model with a prompt value.
     * @param promptValue The value of the prompt.
     * @param options The call options or an array of stop sequences.
     * @param callbacks The callbacks for the language model.
     * @returns A Promise that resolves to a BaseMessage.
     */
    callPrompt(promptValue: BasePromptValueInterface, options?: string[] | CallOptions, callbacks?: Callbacks): Promise<BaseMessage>;
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
     *
     * Predicts the next message based on the input messages.
     * @param messages An array of BaseMessage instances.
     * @param options The call options or an array of stop sequences.
     * @param callbacks The callbacks for the language model.
     * @returns A Promise that resolves to a BaseMessage.
     */
    predictMessages(messages: BaseMessage[], options?: string[] | CallOptions, callbacks?: Callbacks): Promise<BaseMessage>;
    /**
     * @deprecated Use .invoke() instead. Will be removed in 0.2.0.
     *
     * Predicts the next message based on a text input.
     * @param text The text input.
     * @param options The call options or an array of stop sequences.
     * @param callbacks The callbacks for the language model.
     * @returns A Promise that resolves to a string.
     */
    predict(text: string, options?: string[] | CallOptions, callbacks?: Callbacks): Promise<string>;
    //withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: z.ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<false>): Runnable<BaseLanguageModelInput, RunOutput>;
    //withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: z.ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, {
        //raw: BaseMessage;
        //parsed: RunOutput;
    //}>;
}
type ChatCompletionCreateParamsNonStreaming= {} //fixme what a mess
type ChatCompletionCreateParamsStreaming = {} //fixme
class OpenAIClientClientOptions {}
export type LangSmithParams = {
    ls_provider?: string;
    ls_model_name?: string;
    ls_model_type: "chat";
    ls_temperature?: number;
    ls_max_tokens?: number;
    ls_stop?: Array<string>;
};
export type ChatCompletionCreateParams =
  | ChatCompletionCreateParamsNonStreaming
  | ChatCompletionCreateParamsStreaming;

  type ChatCompletionCreateParamsmodelKwargs = {}

export class ChatWrapper<CallOptions extends ChatOpenAICallOptions = ChatOpenAICallOptions> extends BaseChatModel<CallOptions, ChatGenerationChunk> {
    static lc_name(): string {
        return "ChatOpenAI";
    }

    
    get callKeys(): string[] {
        return [];
    }

    lc_serializable: boolean = false;

    get lc_secrets(): { [key: string]: string } | undefined {
        return undefined;
    }

    get lc_aliases(): Record<string, string> {
        return {};
    }

    temperature: number = 0;
    topP: number = 0;
    frequencyPenalty: number = 0;
    presencePenalty: number = 0;
    n: number = 0;
    logitBias?: Record<string, number>;
    modelName: string = "";
    model: string = "";
    modelKwargs?: ChatCompletionCreateParamsmodelKwargs //OpenAIClient.Chat.ChatCompletionCreateParams["modelKwargs"];
    stop?: string[];
    stopSequences?: string[];
    user?: string;
    timeout?: number;
    streaming: boolean = false;
    streamUsage: boolean = false;
    maxTokens?: number;
    logprobs?: boolean;
    topLogprobs?: number;
    openAIApiKey?: string;
    apiKey?: string;
    azureOpenAIApiVersion?: string;
    azureOpenAIApiKey?: string;
    azureADTokenProvider?: () => Promise<string>;
    azureOpenAIApiInstanceName?: string;
    azureOpenAIApiDeploymentName?: string;
    azureOpenAIBasePath?: string;
    azureOpenAIEndpoint?: string;
    organization?: string;
    __includeRawResponse?: boolean;
    protected client: OpenAIClient | undefined;
    protected clientConfig: OpenAIClientClientOptions | undefined;
    supportsStrictToolCalling?: boolean;
    audio?: OpenAIClient.Chat.ChatCompletionAudioParam;
    modalities?: Array<OpenAIClient.Chat.ChatCompletionModality>;
    reasoningEffort?: OpenAIClient.Chat.ChatCompletionReasoningEffort;

    //constructor(fields?: ChatOpenAIFields, configuration?: OpenAIClientClientOptions) {
        //super();
        //this.client = new OpenAIClient(configuration);
        ///this.clientConfig = configuration || {};
    //}

    ls_params: LangSmithParams = {
        ls_model_type: "chat",
    }
    getLsParams(options: this["ParsedCallOptions"]): LangSmithParams {
        
        return this.ls_params

    }
        //console.log("getLsParams called with options:", options);
        //return {};
    //}

    bindTools(tools: any[], kwargs?: Partial<CallOptions>): any {
        console.log("bindTools called with tools:", tools, "and kwargs:", kwargs);
        return this;
    }

    private createResponseFormat() {
        console.log("createResponseFormat called");
    }

    invocationParams(options?: this["ParsedCallOptions"], extra?: { streaming?: boolean }): any {
        console.log("invocationParams called with options:", options, "and extra:", extra);
        return {};
    }

    identifyingParams(): any {
        console.log("identifyingParams called");
        return {};
    }

    _streamResponseChunks(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): AsyncGenerator<ChatGenerationChunk> {
        console.log("streamResponseChunks called with messages:", messages, "and options:", options);
        return (async function* () {})();
    }

    _generate(messages: BaseMessage[], options: this["ParsedCallOptions"], runManager?: CallbackManagerForLLMRun): Promise<ChatResult> {
        console.log("generate called with messages:", messages, "and options:", options);
        return Promise.resolve({} as ChatResult);
    }

    private getEstimatedTokenCountFromPrompt() {
        console.log("getEstimatedTokenCountFromPrompt called");
    }

    private getNumTokensFromGenerations() {
        console.log("getNumTokensFromGenerations called");
    }

    getNumTokensFromMessages(messages: BaseMessage[]): Promise<{ totalCount: number; countPerMessage: number[] }> {
        console.log("getNumTokensFromMessages called with messages:", messages);
        return Promise.resolve({ totalCount: 0, countPerMessage: [] });
    }

    completionWithRetry(request: any, options?: any): Promise<any> {
        console.log("completionWithRetry called with request:", request, "and options:", options);
        return Promise.resolve({});
    }

    betaParsedCompletionWithRetry(request: any, options?: any): Promise<any> {
        console.log("betaParsedCompletionWithRetry called with request:", request, "and options:", options);
        return Promise.resolve({});
    }

    protected _getClientOptions(options: any): any {
        console.log("getClientOptions called with options:", options);
        return {};
    }

    _llmType(): string {
        console.log("llmType called");
        return "ChatOpenAI";
    }

    _combineLLMOutput(...llmOutputs: any[]): any {
        console.log("combineLLMOutput called with llmOutputs:", llmOutputs);
        return {};
    }
    

    //withStructuredOutput<RunOutput extends Record<string, any> = Record<string, any>>(outputSchema: z.ZodType<RunOutput> | Record<string, any>, config?: StructuredOutputMethodOptions<true>): Runnable<BaseLanguageModelInput, { raw: BaseMessage; parsed: RunOutput }> {
    //    console.log("withStructuredOutput called with outputSchema:", outputSchema, "and config:", config);
    //    return this;
    //}
}

/**
 * Service for interacting with OpenAI chat API.
 */
export class AIService {
    private chatModel: ChatWrapper<ChatOpenAICallOptions>;
    private codeFormatter: CodeFormatter;
    private chatModelFAQ: ChatWrapper<ChatOpenAICallOptions>;

    /**
     * Constructor for initializing the ChatOpenAI instance.
     *
     * @param {Configuration} configuration - The configuration instance to be used
     * @throws {Error} If OPENAI_API_KEY environment variable is not set
     */
    constructor(private configuration: Configuration) {

        if (!process.env.OPENAI_API_KEY) {
            throw new Error("OPENAI_API_KEY is not set");
        }
 
        this.chatModel = new ChatWrapper({ apiKey: process.env.OPENAI_API_KEY });
        this.chatModelFAQ = new ChatWrapper({
            apiKey: process.env.OPENAI_API_KEY,
            model: "gpt-4o",
        });

	//        this.chatModel = new FakeListChatModel({ responses: []});
	//				this.chatModelFAQ = new FakeListChatModel({	    responses: []        });
        this.codeFormatter = new CodeFormatter();
    }


    /**
     * Generates a comment based on the specified prompt by invoking the chat model.
     * @param {string} prompt - The prompt for which to generate a comment
     * @returns {Promise<string>} The generated comment
     */
    public async generateComment(prompt: string, isFAQ = false): Promise<string> {
        try {
            // First try with generous limit
            let finalPrompt = prompt;
            if (!isFAQ) {
                finalPrompt = this.codeFormatter.truncateCodeBlock(prompt, 8000);
            }

            console.log(
                `Generating comment for prompt of length: ${finalPrompt.length}`
            );

            try {
                let response;
                if (isFAQ) {
                    response = await this.chatModelFAQ.invoke(finalPrompt);
                } else {
                    response = await this.chatModel.invoke(finalPrompt);
                }
                return response.content as string;
            } catch (error) {
                if (
                    error instanceof Error &&
                    error.message.includes("maximum context length")
                ) {
                    console.warn(
                        "Token limit exceeded, attempting with further truncation..."
                    );
                    // Try with more aggressive truncation
                    finalPrompt = this.codeFormatter.truncateCodeBlock(prompt, 4000);
                    try {
                        const response =
                            await this.chatModel.invoke(finalPrompt);
                        return response.content as string;
                    } catch (retryError) {
                        if (
                            retryError instanceof Error &&
                            retryError.message.includes(
                                "maximum context length"
                            )
                        ) {
                            console.warn(
                                "Still exceeding token limit, using minimal context..."
                            );
                            // Final attempt with minimal context
                            finalPrompt = this.codeFormatter.truncateCodeBlock(prompt, 2000);
                            const response =
                                await this.chatModel.invoke(finalPrompt);
                            return response.content as string;
                        }
                        throw retryError;
                    }
                }
                throw error;
            }
        } catch (error) {
            this.handleAPIError(error as Error);
            return "";
        }
    }

    /**
     * Handle API errors by logging the error message and throwing the error.
     *
     *
     * @param {Error} error The error object to handle
     * @returns {void}
     */
    public handleAPIError(error: Error): void {
        console.error("API Error:", error.message);
        throw error;
    }
}
