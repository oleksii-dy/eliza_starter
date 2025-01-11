import express from "express";
import bodyParser from "body-parser";
import { fromHex, toHex } from "@mysten/sui/utils"
import cors from "cors";
import { bcs } from "@mysten/sui/bcs"
import { verifyPersonalMessageSignature } from "@mysten/sui/verify"
import {

    getEnvVariable,
} from "@elizaos/core";


// import authMiddleware from "../middleware/auth";

import { RedisClient } from "@elizaos/adapter-redis";
export default function createAgentRouter() {
    const router = express.Router();

    router.use(cors());
    router.use(bodyParser.json());
    router.use(bodyParser.urlencoded({ extended: true }));
    router.use(
        express.json({
            limit: getEnvVariable("EXPRESS_MAX_PAYLOAD") || "100kb",
        })
    );

    router.get("/:address/nonce",(req,res)=>{
        const address = req.params.address;


        const msgPayload = {
            seed:`0x${randomValue(address)}`,
            nonce:Date.now()

        }
        const msg = LOGIN_STRUCT.serialize(msgPayload).toHex()
        const redisClient = new RedisClient(process.env.REDIS_URL)
        redisClient.setValue({key:`login_signature_${address}`,value:msg})
        res.json({
            nonce:msg
        });
     })

     router.post("/login",async (req,res)=>{
        const {address,signature} = req.body;
        const redisClient = new RedisClient(process.env.REDIS_URL)
        const msg = await redisClient.getValue({key:`login_signature_${address}`})
        if(!msg){
            res.status(401).json({error:"Invalid signature"})
            return;
        }
        const nonce = await verifyLoginSignature(signature,msg);
        if(!nonce){
            res.status(401).json({error:"Invalid signature"})
            return;
        }
        


     })
    return router;
}
function randomValue(seed: string) {
    return toHex(crypto.getRandomValues(fromHex(seed)))
}
async function verifyLoginSignature(signature:string,msg:string){
    try {
        const message = new Uint8Array(Buffer.from(msg,'hex'))
        await   verifyPersonalMessageSignature(message,signature)
        const user  = LOGIN_STRUCT.parse(message)
        return Number(user.nonce);
    } catch (error) {
        console.error("Error verifying signature:",error)
        return false;
    }

}
const LOGIN_STRUCT = bcs.struct("RefreshSignature", {
    nonce: bcs.u64(),
    seed: bcs.Address,
  })