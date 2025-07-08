import { type Request, type Response } from "express";
import { IAgentRuntime, Route } from "@elizaos/core";
import { ILevvaService } from "src/types/service";
import { LEVVA_SERVICE } from "src/constants/enum";

async function handler(req: Request, res: Response, runtime: IAgentRuntime) {
  const { hash } = req.query;

  if (!hash) {
    res.status(400).json({ error: "Hash is required" });
    return;
  }

  try {
    const service = runtime.getService<ILevvaService>(
      LEVVA_SERVICE.LEVVA_COMMON
    );

    const calldata = await service.getCalldata(hash as `0x${string}`);

    res.status(200).json({
      success: true,
      calldata,
    });
  } catch (e) {
    res.status(500).json({
      success: false,
      error: e.message ?? "Unknown error",
    });
  }
}

const calldataRoute: Route = {
  name: "calldata",
  path: "/calldata",
  type: "GET",
  handler,
};

export default calldataRoute;
