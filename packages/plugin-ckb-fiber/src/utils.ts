import {IAgentRuntime} from "@elizaos/core";
import {Script} from "./ckb/fiber/types.ts";
import {CKBDecimal, EnvDefaults, EnvKeys, SupportedUDTs, UDTType} from "./constants.ts";

export function env(runtime: IAgentRuntime, key: keyof (typeof EnvKeys)) {
    return runtime.getSetting(EnvKeys[key]) || EnvDefaults[key];
}

export function toDecimal(amount: number | string, udtType?: UDTType) {
    return Number(amount) / Math.pow(10, udtType ? SupportedUDTs[udtType].decimal : CKBDecimal);
}

export function fromDecimal(amount: number | string, udtType?: UDTType) {
    return Number(amount) * Math.pow(10, udtType ? SupportedUDTs[udtType].decimal : CKBDecimal);
}

export function udtEq(a: Script, b: Script) {
    return a.code_hash.toLowerCase() === b.code_hash.toLowerCase() &&
        a.hash_type.toLowerCase() === b.hash_type.toLowerCase() &&
        a.args.toLowerCase() === b.args.toLowerCase()
}
