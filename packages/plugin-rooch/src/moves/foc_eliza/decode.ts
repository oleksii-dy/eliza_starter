import { Style, TwitterProfile, MessageTemplate, Content, Media, CharacterData } from "./types"

// Helper function to convert hex string to UTF-8 string
function hexToString(hex: string): string {
    const bytes = Buffer.from(hex.replace(/^0x/, ''), 'hex');
    return bytes.toString('utf8');
}

// Helper function to parse Option<String>
function parseOptionString(optionValue: any): string | null {
    if (optionValue.value.vec.length === 0) {
        return null;
    } else {
        const hexString = optionValue.value.vec[0];
        return hexToString(hexString);
    }
}

// Helper function to parse vector<String>
function parseVectorString(vectorValue: any[]): string[] {
    return vectorValue.map((hexString: any) => hexToString(hexString));
}

// Helper function to parse Style
function parseStyle(styleValue: any): Style {
    const all = parseVectorString(styleValue.all.value);
    const chat = parseVectorString(styleValue.chat.value);
    const post = parseVectorString(styleValue.post.value);
    return { all, chat, post };
}

// Helper function to parse TwitterProfile
function parseTwitterProfile(profileValue: any): TwitterProfile | null {
    if (profileValue.value.vec.length === 0) {
        return null;
    } else {
        const profile = profileValue.value.vec[0];
        return {
            id: hexToString(profile.id),
            username: hexToString(profile.username),
            screenName: hexToString(profile.screenName),
            bio: hexToString(profile.bio),
            nicknames: parseVectorString(profile.nicknames.value)
        };
    }
}

// Helper function to parse Media
function parseMedia(mediaValue: any): Media {
    return {
        id: hexToString(mediaValue.id),
        url: hexToString(mediaValue.url),
        title: hexToString(mediaValue.title),
        source: hexToString(mediaValue.source),
        description: hexToString(mediaValue.description),
        text: hexToString(mediaValue.text),
        contentType: hexToString(mediaValue.contentType)
    };
}

// Helper function to parse vector<Media>
function parseVectorMedia(mediaVector: any[]): Media[] {
    return mediaVector.map((media: any) => parseMedia(media));
}

// Helper function to parse Content
function parseContent(contentValue: any): Content {
    const text = hexToString(contentValue.text);
    const action = contentValue.action.value.vec.length === 0 ? null : hexToString(contentValue.action.value.vec[0]);
    const source = contentValue.source.value.vec.length === 0 ? null : hexToString(contentValue.source.value.vec[0]);
    const url = contentValue.url.value.vec.length === 0 ? null : hexToString(contentValue.url.value.vec[0]);
    const inReplyTo = contentValue.inReplyTo.value.vec.length === 0 ? null : hexToString(contentValue.inReplyTo.value.vec[0]);
    const attachments = parseVectorMedia(contentValue.attachments.value);
    return { text, action, source, url, inReplyTo, attachments };
}

// Helper function to parse MessageTemplate
function parseMessageTemplate(templateValue: any): MessageTemplate {
    return {
        user: hexToString(templateValue.user),
        content: parseContent(templateValue.content)
    };
}

// Main function to parse CharacterData
function parseCharacterData(decodedValue: any): CharacterData {
    return {
        id: parseOptionString(decodedValue.id),
        name: hexToString(decodedValue.name),
        username: parseOptionString(decodedValue.username),
        plugins: parseVectorString(decodedValue.plugins.value),
        clients: parseVectorString(decodedValue.clients.value),
        modelProvider: hexToString(decodedValue.modelProvider),
        imageModelProvider: parseOptionString(decodedValue.imageModelProvider),
        imageVisionModelProvider: parseOptionString(decodedValue.imageVisionModelProvider),
        modelEndpointOverride: parseOptionString(decodedValue.modelEndpointOverride),
        system: parseOptionString(decodedValue.system),
        bio: parseVectorString(decodedValue.bio.value),
        lore: parseVectorString(decodedValue.lore.value),
        messageExamples: decodedValue.messageExamples.value.map((vectorMT: any[]) => vectorMT.map((mt: any) => parseMessageTemplate(mt))),
        postExamples: parseVectorString(decodedValue.postExamples.value),
        topics: parseVectorString(decodedValue.topics.value),
        style: parseStyle(decodedValue.style),
        adjectives: parseVectorString(decodedValue.adjectives.value),
        knowledge: parseVectorString(decodedValue.knowledge.value),
        twitterProfile: parseTwitterProfile(decodedValue.twitterProfile)
    };
}

// Function to decode CharacterData
export function decodeCharacterData(decoded_value: any): CharacterData {
    const decodedValue = decoded_value.value;
    return parseCharacterData(decodedValue);
}