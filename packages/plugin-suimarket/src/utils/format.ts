export async function formatObjectsToText(items: any[]): Promise<string> {  
  return items
  .map((item, index) => {
    const header = `Item ${index + 1}:\n`;
    
    const formattedItem = Object.entries(item)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `  ${key}:\n${formatObjectsToText(value)}`;
        } else if (typeof value === "object" && value !== null) {
          return `  ${key}:\n${formatObjectsToText([value])}`;
        }
        return `  ${key}: ${value}`;
      })
      .join("\n");

    return header + formattedItem;
  })
  .join("\n\n");
}


export function formatObjectToText(data: any): string {
  return Object.entries(data)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
}
