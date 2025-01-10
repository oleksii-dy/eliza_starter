import {
    elizaLogger,
    IAgentRuntime,
    Plugin,
    Service,
    ServiceType,
} from "@elizaos/core";
import { markAsReadAction, readEmailsAction, sendEmailAction } from "./actions";
import { validateMailConfig } from "./environment";
import { MailService } from "./service";
import { MailConfig } from "./types";

export { MailConfig, MailService };

class MailPluginService extends Service {
    static get serviceType(): ServiceType {
        return ServiceType.MAIL;
    }

    private runtime: IAgentRuntime | undefined;

    async initialize(runtime: IAgentRuntime) {
        this.runtime = runtime;

        const mailConfig = validateMailConfig(runtime);
        const service = new MailService(mailConfig);
        await service.connect();

        global.mailService = service;

        elizaLogger.info("Mail plugin initialized");
    }
}

export const mailPlugin: Plugin = {
    name: "mail",
    description: "Email plugin for IMAP/SMTP support",
    actions: [readEmailsAction, sendEmailAction, markAsReadAction],
    services: [new MailPluginService()],
    providers: [],
    evaluators: [],
};

export default mailPlugin;
