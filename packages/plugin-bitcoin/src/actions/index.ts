import { sendBitcoinAction } from './send';
import { showBitcoinAddressesAction } from './addresses';
import { balanceAction } from './balance';
import { coinsAction } from './coins';

export const actions = [sendBitcoinAction, showBitcoinAddressesAction, balanceAction, coinsAction];