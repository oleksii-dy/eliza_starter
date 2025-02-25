import { Action, IAgentRuntime, Memory, State, HandlerCallback } from "@elizaos/core";
import { ChapterContentProvider } from "../providers/ChapterContentProvider";
import { logger } from '../utils/logger';

export const FetchChapterContent: Action = {
  name: "FETCH_CHAPTER_CONTENT",
  similes: ["GET_COURSE", "LOAD_COURSE_CONTENT"],
  description: "Fetches and displays the entire course content by courseId.",

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    logger.log(`[FetchChapterContent] Running validate with message: ${JSON.stringify(message)}`);
  
    const isFromUser = message.userId && !message.agentId;
    const { courseId } = message.content || {};
  
    const isValidCourseId = typeof courseId === "string" && courseId.length > 0;
  
    logger.log(`[FetchChapterContent] Validation result - isFromUser: ${isFromUser}, isValidCourseId: ${isValidCourseId}`);
  
    return isFromUser && isValidCourseId;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    logger.log("[FetchChapterContent] Handler triggered for message: " + JSON.stringify(message));

    try {
      logger.log("[FetchChapterContent] Calling ChapterContentProvider.get");
      const result = await ChapterContentProvider.get(runtime, message);

      logger.debug("[FetchChapterContent] Provider response: " + JSON.stringify(result));

      if (result.error) {
        logger.error("Provider Error: " + result.error);
        callback?.({ text: `⚠️ Error: ${result.error}` });
        return false;
      }

      const course = result.course;

      callback?.({
        text: "📚 Full Course Data:",
        data: course,
        debug: JSON.stringify(course, null, 2),
        instruction: "Displaying full course data."
      });

      logger.log("Course data sent to callback.");
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Unexpected error in FetchChapterContent: " + errorMessage);
      callback?.({
        text: "🚨 An unexpected error occurred while fetching the course."
      });
      return false;
    }
  },

  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Show me the course with ID 67b9a25b9b9bd23062cb80db",
          courseId: "67b9a25b9b9bd23062cb80db"
        }
      },
      {
        user: "{{assistant}}",
        content: {
          text: "Here’s the full course data:"
        }
      }
    ]
  ]
};
