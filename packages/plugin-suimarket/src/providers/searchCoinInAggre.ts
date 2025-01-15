import fs from "fs"
import path from "path";
import { fileURLToPath } from "url";
// Chuyển đổi import.meta.url sang __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.join(__dirname, "../src/coin-info-sui.json")
// Load the JSON data
const data = JSON.parse(fs.readFileSync(file, 'utf8'));

// Function to find items based on verified status and symbol
async function findByVerifiedAndSymbol( symbol) {
    const matchingItems = data.filter(item => item.symbol === symbol);

    if (matchingItems.length === 0) {
        // No items match the symbol
        return null;
    }

    // Find the first verified item
    const verifiedItem = matchingItems.find(item => item.verified === true);

    // Return the verified item if found, otherwise return the first item
    return verifiedItem || matchingItems[0];
}

export default findByVerifiedAndSymbol;

