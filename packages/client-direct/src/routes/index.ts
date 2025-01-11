import createAgentRouter from "./agent";
import createUserRouter from "./user";
import {
    AgentRuntime,

} from "@elizaos/core";
import  express from "express";
import { DirectClient } from "../index";

export default function createApiRouter(
    agents: Map<string, AgentRuntime>,
    directClient: DirectClient

) {
    const router = express.Router();

    const agentRouter = createAgentRouter(agents, directClient);
    const userRouter = createUserRouter();

    router.use("/agents", agentRouter);
    router.use("/users", userRouter);
    return router;
}