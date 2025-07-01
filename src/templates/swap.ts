export const estimationTemplate = (usd?: boolean) =>
  `Estimated to receive {{amountOut}} {{symbol}}${usd ? " ({{amountOutUsd}})" : ""}, gas fee {{gas}}${usd ? " ({{gasUsd}})" : ""}`;

export const swapTemplate = `Given the recent messages below:

{{recentMessages}}

Extract the following information:

- Token symbol or address to swap from
- Token symbol or address to swap to
- Amount of tokens to swap, denominated in token to be sent

If user asked to cancel transaction do not extract data in the messages preceding the cancel.
If user confirmed successfull transaction do not extract data in the messages preceding the confirmation.

Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
    "fromToken": string | null,
    "toToken": string | null,
    "amount": string | null,
}
\`\`\`
`;
