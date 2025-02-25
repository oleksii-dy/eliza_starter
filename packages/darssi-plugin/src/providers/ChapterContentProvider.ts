import { Provider, IAgentRuntime, Memory } from "@elizaos/core";
import { getDatabase } from "../utils/mongoClient";
import { ObjectId } from "mongodb";
import { logger } from '../utils/logger';

export const ChapterContentProvider: Provider = {
  get: async (_runtime: IAgentRuntime, message: Memory) => {
    logger.log("[ChapterContentProvider] get() method called.");

    try {
      logger.log("[ChapterContentProvider] Incoming message: " + JSON.stringify(message.content));

      let db;
      try {
        db = await getDatabase("darssi");
        logger.log("[ChapterContentProvider] Connected to Darssi DB");
      } catch (dbError) {
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        logger.error("DB Connection Failed: " + errorMessage);
        return { error: "Database connection failed." };
      }

      const { courseId } = message.content;

      if (!courseId || typeof courseId !== 'string' || !ObjectId.isValid(courseId)) {
        logger.error("Invalid Course ID: " + courseId);
        return { error: "Invalid Course ID provided." };
      }

      logger.log(`Fetching course with ID: ${courseId}`);

      let course;
      try {
        course = await db.collection("Course").findOne({ _id: new ObjectId(courseId) });
        logger.debug("Fetched Course: " + JSON.stringify(course, null, 2));
      } catch (fetchError) {
        const errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
        logger.error("Error fetching course: " + errorMessage);
        return { error: "Error fetching course." };
      }

      if (!course) {
        logger.error("Course not found: " + courseId);
        return { error: "Course not found." };
      }

      logger.log("Course fetched successfully.");
      return { course };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("Unexpected error in ChapterContentProvider: " + errorMessage);
      return { error: "An unexpected error occurred." };
    }
  }
};
