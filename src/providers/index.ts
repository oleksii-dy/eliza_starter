import { State, UUID, type Provider } from "@elizaos/core";
import { RawMessage } from "../types/core";
import { getLevvaUser } from "src/util";

export interface LevvaProviderState {
  chainId: number;
  user?: { id: UUID; address: `0x${string}` };
}

export const selectLevvaState = (state: State): LevvaProviderState | undefined =>
  'levva' in state.data.providers ? (state.data.providers.levva as { data: LevvaProviderState }).data : undefined;

// provider text gets inserted after system prompt, so add levva-specific prompts
const prompts = [
  "User handles transaction signing.",
  "Expect that user should either wish to cancel transaction or confirm it by sending JSON object with transaction receipt.",
].join(" ");

export const levvaProvider: Provider = {
  name: "levva",
  description: "Levva provider",
  async get(runtime, message, state) {
    const raw: RawMessage = (message.metadata as unknown as { raw: RawMessage })
      .raw;

    const chainId = (raw.metadata.chainId ?? 1) as number;
    const userId = raw.senderId;
    const user = (await getLevvaUser(runtime, { id: userId }))[0];

    if (!user) {
      return {
        text: "Levva user not found",
        data: {
          chainId,
        },
      };
    }

    return {
      text: `Found levva user with address ${user.address}. ${prompts}`,
      data: {
        chainId,
        user,
      },
    };
  },
};
