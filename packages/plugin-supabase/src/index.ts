import type { Plugin } from "@elizaos/core";
import { saveAction } from "./actions/save";

export const supabasePlugin: Plugin = {
    name: "supabase",
    description: "Supabase integration plugin for saving listings",
    actions: [saveAction],
    evaluators: [],
    providers: [],
};

export default supabasePlugin;