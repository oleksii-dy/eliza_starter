export default [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me the holdings for Farcaster users @vitalik and @jessepollak",
            },
        },
        {
            user: "{{user2}}",
            content: { text: "", action: "FARCASTER_PORTFOLIO" },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "What's the portfolio for @dwr?",
            },
        },
        {
            user: "{{user2}}",
            content: { text: "", action: "FARCASTER_PORTFOLIO" },
        },
    ],
];