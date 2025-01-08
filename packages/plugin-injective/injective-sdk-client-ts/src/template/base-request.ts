export const generateParamTemplate = (
    moduleName: string,
    functionName: string,
    parameters: Record<string, string>
) => {
    const parametersList = Object.entries(parameters)
        .map(([key, type]) => `- ${key} (${type})`)
        .join("\n");

    return `
  Extract ${moduleName} Module - ${functionName} Parameters from the latest message:
  {{recentMessages}}

  Expected parameters:
  ${parametersList}

  Please extract and validate the following parameters from the message.
  Each parameter should be properly typed and validated according to its specification.

  Response format:
  {
    ${Object.entries(parameters)
        .map(([key, type]) => `"${key}": <extracted_${key}> // ${type}`)
        .join(",\n  ")}
  }

  Validation rules:
  ${Object.entries(parameters)
      .map(([key, type]) => `- ${key}: Must be a valid ${type}`)
      .join("\n")}
  `;
};
