export const IAaveDepositor = [
  {
    inputs: [
      {
        internalType: "address",
        name: "pool",
        type: "address"
      },
      {
        internalType: "address",
        name: "asset",
        type: "address"
      },
      {
        internalType: "address",
        name: "onBehalfOf",
        type: "address"
      },
      {
        internalType: "uint16",
        name: "referralCode",
        type: "uint16"
      }
    ],
    name: "supply",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];