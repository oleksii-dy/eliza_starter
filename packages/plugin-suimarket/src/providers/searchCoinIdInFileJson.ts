
import fs from "fs/promises"


const files = [
    "../coin_list/coin_list_part_1.json",
    "../coin_list/coin_list_part_2.json",
    "../coin_list/coin_list_part_3.json",
    "../coin_list/coin_list_part_4.json",
  ];

const searchCoinInFIleJsonProvider = async(coinSymbol:string, coinName:string)=>{
    const results = await Promise.all(
        files.map(async (file) => {
            try {
                const data = await fs.readFile(file, 'utf8');
                const coins = JSON.parse(data);

                // Tìm kiếm coin
                const foundCoin = coins.find(
                    coin =>
                        coin.symbol.toLowerCase() === coinSymbol.toLowerCase() &&
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
// Module exports
export default searchCoinInFIleJsonProvider;
