export const extractEmailText = (email: any) => {
    const body = email.data.payload.parts[0].body.data;
    if (body == undefined) {
        console.log("Email has no body - returning snippet!");
        console.log(email.data.payload);
        return email.data.snippet;
    }
    const decodedBody = Buffer.from(body, "base64").toString("utf-8");
    return decodedBody;
};

export const isCalendarInvite = (email: any) => {
    if (!email?.data?.payload?.parts) {
        return false;
    }

    return email.data.payload.parts.some(
        (part: any) => part.mimeType === "application/ics"
    );
};
