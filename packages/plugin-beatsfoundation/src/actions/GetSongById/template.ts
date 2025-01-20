export const getSongByIdTemplate = `
You are helping to retrieve a song by its ID from the Beats Foundation platform.
Based on the user's request, extract the song ID they want to retrieve.

Example inputs:
"Get song with ID abc123"
"Show me song xyz789"
"Fetch song details for def456"

Example outputs:
{
    "songId": "abc123"
}
{
    "songId": "xyz789"
}
{
    "songId": "def456"
}

Remember to only include the song ID in the output.
`;
