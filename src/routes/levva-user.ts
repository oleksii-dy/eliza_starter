import { eq } from "drizzle-orm";
import { type Request, type Response } from "express";
import { createUniqueUuid, findWorldsForOwner, IAgentRuntime, Route, UUID } from "@elizaos/core";
import { levvaUserTable } from "../schema/levva-user";
import { getDb, getLogger } from "../util";
import { lower } from "src/schema/util";
import { getAddress, isHex } from "viem";

const DEFAULT_SERVER_ID: UUID = '00000000-0000-0000-0000-000000000000';

async function handler(req: Request, res: Response, runtime: IAgentRuntime) {
  const { address: _address } = req.query;
  const logger = getLogger(runtime);

  try {
    if (!isHex(_address)) {
      throw new Error("Invalid address");
    }

    const address = getAddress(_address);
    const db = getDb(runtime);
    const result = await db
      .select()
      .from(levvaUserTable)
      .where(eq(lower(levvaUserTable.address), address.toLowerCase()));

    let id: string;

    if (!result.length) {
      logger.info(`User ${address} not found, creating...`);
      const result = await db
        .insert(levvaUserTable)
        .values({ address })
        .returning();
      id = result[0].id;
    } else {
      logger.info(`User ${address} found, id: ${result[0].id}`);
      id = result[0].id;
    }

    const entityId = createUniqueUuid(runtime, id);
    const entity = await runtime.getEntityById(entityId);

    if (!entity) {
      if (
        !(await runtime.createEntity({
          id: entityId,
          names: [`User-${id}`, `User-${address}`],
          agentId: runtime.agentId,
          metadata: {
            eth: { address },
          },
        }))
      ) {
        throw new Error("Failed to create entity");
      }
    }

    const worlds = await findWorldsForOwner(runtime, entityId);
    let worldId = worlds?.[0]?.id;

    if (!worldId) {
      // @ts-expect-error createWorld expects id
      worldId = await runtime.createWorld({
        name: `Levva:${address}`,
        agentId: runtime.agentId,
        serverId: DEFAULT_SERVER_ID,
        metadata: {
          ownership: {
            ownerId: entityId,
          },
          settings: {}
        },
      });
    }

    res.status(200).json({ success: true, id, entityId, worldId });
  } catch (error) {
    logger.error(error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

const route: Route = {
  name: "levva-user",
  path: "/levva-user",
  type: "GET",
  handler,
};

export default route;
