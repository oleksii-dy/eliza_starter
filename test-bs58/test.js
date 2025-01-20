import bs58 from "bs58";
console.log("Testing bs58 v6.0.0");
const encoded = bs58.encode(Buffer.from("Hello World"));
console.log("Encoded:", encoded);
const decoded = bs58.decode(encoded);
console.log("Decoded:", decoded.toString());
