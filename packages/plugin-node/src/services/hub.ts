import {
    IAgentRuntime,
    IHubService,
    Service,
    ServiceType,
} from "@elizaos/core";

import axios, { AxiosResponse } from 'axios';
import {elizaLogger} from "@elizaos/core";

interface MemeStruct {
  Owner: string;
  ID: string;
  Message: string;
}

export class HubService extends Service implements IHubService {
  static serviceType: ServiceType = ServiceType.HUB;

  private baseUrl: string | null;
  private runtime: IAgentRuntime | null = null;

  async initialize(runtime: IAgentRuntime): Promise<void> {
    console.log("Initializing HubService");
    this.runtime = runtime;
    this.baseUrl = runtime.getSetting("HUB_ENDPOINT") ?? 'http://54.151.130.2:8080';
  }

  async uploadHub(owner: string, filename: string, msg: string): Promise<any> {
    try {
      // Create the meme structure as an object
      const memeStruct: MemeStruct = {
        Owner: owner,
        ID: filename,
        Message: msg
      };

      // Serialize the meme structure to JSON
      const memeStructJson = JSON.stringify(memeStruct);

      // Set the headers for the request
      const headers = {
        'Content-Type': 'application/json'
      };

      // Send the POST request to the API
      const response: AxiosResponse = await axios.post(
        `${this.baseUrl}/api/upload`,
        memeStructJson,
        { headers }
      );

      // Log the upload completion
      elizaLogger.info("Upload done", JSON.stringify(response.data));

      // Optionally return the response if needed
      return response.data;

    } catch (err) {
      elizaLogger.error("Error during upload: ", err);
      return null;
    }
  }
}

export default HubService;