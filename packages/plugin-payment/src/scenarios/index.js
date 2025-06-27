"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scenarios = void 0;
// Export all payment scenarios
var _60_payment_basic_flow_1 = require("./60-payment-basic-flow");
var _61_payment_trust_exemptions_1 = require("./61-payment-trust-exemptions");
var _62_payment_confirmation_flow_1 = require("./62-payment-confirmation-flow");
var _63_payment_insufficient_funds_1 = require("./63-payment-insufficient-funds");
var _64_payment_multi_currency_1 = require("./64-payment-multi-currency");
var _65_payment_multi_agent_1 = require("./65-payment-multi-agent");
var _66_payment_real_integration_1 = require("./66-payment-real-integration");
var _67_payment_crossmint_integration_1 = require("./67-payment-crossmint-integration");
var _70_payment_send_real_money_1 = require("./70-payment-send-real-money");
var _71_payment_receive_transaction_1 = require("./71-payment-receive-transaction");
var _72_payment_request_1 = require("./72-payment-request");
var _73_polymarket_bets_1 = require("./73-polymarket-bets");
var _74_polymarket_bet_placement_1 = require("./74-polymarket-bet-placement");
var _75_uniswap_swap_1 = require("./75-uniswap-swap");
var _76_coinbase_agentkit_1 = require("./76-coinbase-agentkit");
var _77_crossmint_nft_1 = require("./77-crossmint-nft");
var _78_defi_yield_1 = require("./78-defi-yield");
var _79_multi_chain_bridge_1 = require("./79-multi-chain-bridge");
// Export as array for plugin
exports.scenarios = [
    _60_payment_basic_flow_1.default,
    _61_payment_trust_exemptions_1.default,
    _62_payment_confirmation_flow_1.default,
    _63_payment_insufficient_funds_1.default,
    _64_payment_multi_currency_1.default,
    _65_payment_multi_agent_1.default,
    _66_payment_real_integration_1.default,
    _67_payment_crossmint_integration_1.default,
    _70_payment_send_real_money_1.default,
    _71_payment_receive_transaction_1.default,
    _72_payment_request_1.default,
    _73_polymarket_bets_1.default,
    _74_polymarket_bet_placement_1.default,
    _75_uniswap_swap_1.default,
    _76_coinbase_agentkit_1.default,
    _77_crossmint_nft_1.default,
    _78_defi_yield_1.default,
    _79_multi_chain_bridge_1.default,
];
exports.default = exports.scenarios;
