export const getFileLocationTemplate = `
{{recentMessages}}

Extract the file location from the users message or the attachment in the message history that they are referring to.
Your job is to infer the correct attachment based on the recent messages, the users most recent message, and the attachments in the message
Image attachments are the result of the users uploads, or images you have created.
Only respond with the file location, no other text.
Typically the file location is in the form of a URL or a file path.
`;
