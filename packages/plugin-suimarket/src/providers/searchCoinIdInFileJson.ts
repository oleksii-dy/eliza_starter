
import fs from "fs/promises"
import { fileURLToPath } from "url";
import path from "path";

// Chuyển đổi import.meta.url sang __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const files = [
    path.join(__dirname, "../src/coin_list/coin_list_part_1.json"),
    path.join(__dirname, "../src/coin_list/coin_list_part_2.json"),
    path.join(__dirname, "../src/coin_list/coin_list_part_3.json"),
    path.join(__dirname, "../src/coin_list/coin_list_part_4.json"),
];

export const searchCoinInFileJsonProvider = async(coinSymbol:string)=>{
    const results = await Promise.all(
        files.map(async (file) => {
            try {

                const data = await fs.readFile(file, 'utf8');
                const coins = JSON.parse(data);

                // Tìm kiếm coin
                const foundCoin = coins.find(
                    coin =>
                        coin.symbol.toLowerCase() === coinSymbol.toLowerCase()
                );

                return foundCoin || null; // Trả về kết quả hoặc null
            } catch (err) {
                console.error(`Error reading file ${file}:`, err);
                return null; // Trả về null nếu xảy ra lỗi
            }
        })
    );

    // Lọc kết quả để tìm phần tử đầu tiên không null
    return results.find(result => result !== null) || null;
}
// Module exports
export const searchCoinInFileJsonProvider2 = async(coinSymbol:string, coinName:string)=>{
    const results = await Promise.all(
        files.map(async (file) => {
            try {

                const data = await fs.readFile(file, 'utf8');
                const coins = JSON.parse(data);

                // Tìm kiếm coin gân đúng
                const foundCoin = coins.find(
                    coin =>
                        coin.symbol.toLowerCase() === coinSymbol.toLowerCase()&&
                    coin.name.toLowerCase() === coinName.toLowerCase()
                );

                return foundCoin || null; // Trả về kết quả hoặc null
            } catch (err) {
                console.error(`Error reading file ${file}:`, err);
                return null; // Trả về null nếu xảy ra lỗi
            }
        })
    );

    // Lọc kết quả để tìm phần tử đầu tiên không null
    return results.find(result => result !== null) || null;
}
