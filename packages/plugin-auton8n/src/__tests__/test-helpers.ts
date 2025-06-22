export const getTestApiKey = (): string => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is required for tests. Please ensure your .env file contains ANTHROPIC_API_KEY'
    );
  }
  return apiKey;
};

export const skipIfNoApiKey = (): boolean => {
  return !process.env.ANTHROPIC_API_KEY;
};
