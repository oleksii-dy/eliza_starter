import { Evaluator, IAgentRuntime, Memory } from "@elizaos/core";
import { ObjectId } from "mongodb";

export const ContentAccuracyEvaluator: Evaluator = {
  name: "ContentAccuracyEvaluator",
  similes: ["CHAPTER_ACCURACY"],
  description: "Ensures responses are accurate to chapter content.",

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const chapterId = message.content?.chapterId as string | undefined;
    return !!chapterId && ObjectId.isValid(chapterId);
  },

  handler: async (runtime: IAgentRuntime, message: Memory) => {
    try {
      console.log("Evaluating chapter content for accuracy...");

      const chapterId = message.content?.chapterId as string;
      const courseId = message.content?.courseId as string;

      if (!ObjectId.isValid(courseId) || !ObjectId.isValid(chapterId)) {
        console.error("Invalid courseId or chapterId:", courseId, chapterId);
        return;
      }

      const dbAdapter = runtime.databaseAdapter as any;
      const db = dbAdapter.db("darssi");

      const course = await db.collection("Course").findOne({ _id: new ObjectId(courseId) });

      if (!course) {
        console.error(`Course not found with ID: ${courseId}`);
        return;
      }

      const chapter = course.chapters.find((ch: any) => ch._id.toString() === chapterId);

      if (!chapter) {
        console.error(`Chapter not found with ID: ${chapterId}`);
        return;
      }

      const inaccuracies: string[] = [];

      if (message.content?.chapterTitle !== chapter.title) {
        inaccuracies.push("Chapter title mismatch");
      }

      if (message.content?.videoUrl !== chapter.videoUrl) {
        inaccuracies.push("Video URL mismatch");
      }

      if (inaccuracies.length > 0) {
        console.warn("Content inaccuracies detected:", inaccuracies);

        const memoryManager = runtime.getMemoryManager("default");

        if (!memoryManager) {
          console.error("Memory manager not found.");
          return;
        }

        await memoryManager.createMemory({
          userId: message.userId,
          agentId: message.agentId || "default-agent",
          roomId: message.roomId,
          content: {
            text: "Content inaccuracies detected.",
            type: "evaluation",
            details: inaccuracies
          }
        });
      } else {
        console.log("Chapter content is accurate.");
      }
    } catch (error) {
      console.error("Error during ContentAccuracyEvaluator execution:", error);
    }
  },

  examples: [
    {
      context: "Validating chapter content accuracy",
      messages: [
        {
          user: "{{user1}}",
          content: {
            text: "Here's Chapter 1 content.",
            chapterId: "64fa2a3b9c4d95bf46d1a2e7",
            courseId: "67b9a25b9b9bd23062cb80db",
            chapterTitle: "Introduction to Machine Learning",
            videoUrl: "https://example.com/intro-ml"
          }
        }
      ],
      outcome: "Validates chapter content for accuracy"
    }
  ]
  
};
