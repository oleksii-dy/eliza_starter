import express from "express";
import {
    getTracesByAgentId,
    getUniqueAgentId,
    getUniqueRuns,
    getAllTraces,
    getTracesByRun,
    getUniqueRunsByAgent,
} from "../controllers/tracesController";

const router = express.Router();

/**
 * @swagger
 * /api/traces:
 *   get:
 *     summary: Fetch all traces
 *     description: Retrieves all traces from the database.
 *     responses:
 *       200:
 *         description: A JSON array of traces.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_records:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
router.get("/", getAllTraces);

/**
 * @swagger
 * /api/traces/unique-runs:
 *   get:
 *     summary: Fetch all unique RUN values
 *     description: Retrieves a list of all unique RUN values from the traces table.
 *     responses:
 *       200:
 *         description: A JSON array of unique RUN values.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unique_runs:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get("/unique-runs", getUniqueRuns);

/**
 * @swagger
 * /api/traces/unique-runs/by-agent/{agentId}:
 *   get:
 *     summary: Fetch unique RUN values for a specific Agent ID
 *     description: Retrieves a list of distinct RUN values where the given agentId exists in the traces table.
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Agent ID to filter unique runs.
 *     responses:
 *       200:
 *         description: A JSON array of unique RUN values linked to the given agentId.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agent_id:
 *                   type: string
 *                 unique_runs:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Missing or invalid Agent ID
 *       500:
 *         description: Server error
 */
router.get("/unique-runs/by-agent/:agentId", getUniqueRunsByAgent);

/**
 * @swagger
 * /api/traces/unique-agent-ids:
 *   get:
 *     summary: Fetch all unique AgentId values
 *     description: Retrieves a list of all unique agentId values from the traces table.
 *     responses:
 *       200:
 *         description: A JSON array of unique agentId values.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 unique_agentId:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error
 */
router.get("/unique-agent-ids", getUniqueAgentId);

/**
 * @swagger
 * /api/traces/by-run/{runId}:
 *   get:
 *     summary: Fetch traces by RUN value
 *     description: Retrieves traces filtered by a specific RUN ID.
 *     parameters:
 *       - in: path
 *         name: runId
 *         required: true
 *         schema:
 *           type: string
 *         description: The RUN value to filter traces.
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by name field (optional)
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by start timestamp (YYYY-MM-DD HH:MM:SS) (optional)
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by end timestamp (YYYY-MM-DD HH:MM:SS) (optional)
 *     responses:
 *       200:
 *         description: A JSON array of traces for the specified RUN ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 run_id:
 *                   type: string
 *                 total_records:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Unique ID of the trace
 *                       run:
 *                         type: string
 *                         description: UUID of the RUN
 *                       time:
 *                         type: string
 *                         format: date-time
 *                         description: Timestamp of the trace event
 *                       name:
 *                         type: string
 *                         description: Name of the trace event
 *                       data:
 *                         type: object
 *                         description: JSON data associated with the trace event
 *       400:
 *         description: Missing or invalid RUN ID
 *       500:
 *         description: Server error
 */
router.get("/by-run/:runId", getTracesByRun);

/**
 * @swagger
 * /api/traces/by-agent/{agentId}:
 *   get:
 *     summary: Fetch traces by Agent ID
 *     description: Retrieves traces filtered by a specific Agent ID with optional filters.
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The Agent ID to filter traces.
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Filter by trace name (optional).
 *       - in: query
 *         name: start_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by start date (YYYY-MM-DD) (optional).
 *       - in: query
 *         name: end_date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by end date (YYYY-MM-DD) (optional).
 *     responses:
 *       200:
 *         description: A JSON array of traces for the specified Agent ID.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 agent_id:
 *                   type: string
 *                   description: The Agent ID used for filtering.
 *                 total_records:
 *                   type: integer
 *                   description: Total number of matching records.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: Unique ID of the trace.
 *                       run:
 *                         type: string
 *                         description: UUID of the RUN.
 *                       time:
 *                         type: string
 *                         format: date-time
 *                         description: Timestamp of the trace event.
 *                       name:
 *                         type: string
 *                         description: Name of the trace event.
 *                       data:
 *                         type: object
 *                         description: JSON data associated with the trace event.
 *                       agentId:
 *                         type: string
 *                         nullable: true
 *                         description: The agent ID associated with the trace.
 *                       roomId:
 *                         type: string
 *                         nullable: true
 *                         description: The room ID associated with the trace (optional).
 *       400:
 *         description: Missing or invalid Agent ID.
 *       500:
 *         description: Server error.
 */
router.get("/by-agent/:agentId", getTracesByAgentId);

export default router;
