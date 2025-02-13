export default [
    [
        {
            user: "{{user1}}",
            content: {
                text: "Show me the holdings for 0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
            },
        },
        {
            user: "{{user2}}",
            content: { text: "", action: "ZAPPER_PORTFOLIO" },
        },
    ],
    [
        {
            user: "{{user1}}",
            content: {
                text: "Check these wallets: 0xd8da6bf26964af9d7eed9e03e53415d37aa96045, 0xd8da6bf26964af9d7eed9e03e53415d37aa96048",
            },
        },
        {
            user: "{{user2}}",
            content: { text: "", action: "ZAPPER_PORTFOLIO" },
        },
    ],
];