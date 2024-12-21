# advanced trading by moon dev

- this plugin will include a ton of helpful trading functions so that agents can buy, sell & manage risk. i use these for onchain solana bots
- while everything is currently in python i will later convert to ts if needed or i will add a shell (researching best approach)

how to use
1. config.py controls the solana contract that is being traded, size, etc.
2. run from bot.py, there are a bunch of different 'actions' for the trading, like buy under x price, while sell over y price. or a breakout option or stop loss.
3. nice_funcs has a ton of helpful functions to algo trade onchain solana
4. if the ai needs ohlcv data they can get it on get_ohlcv_data.py

things needed in dontshare.py (add to .gitignore and never share this file)
1. sketch but private solana key if you want them to trade
2. birdeye api key
3. rpc_url (i use helius)

Completed 12/21

1. nice_funcs.py - a ton of solana onchain infastructure to trade. ive been using this code for all my onchain bots but believe ai will utilize them better.

2. bot.py - a simple script to allow any ai to call actions like 0 - close a position 1- open a position 2- sell if price falls under x price (stop loss) 3- buy if price goes over y price (breakout) 5- buy if under X price and sell if over Y price (market maker)

3. get_ohlcv_data.py - an easy way for ai to get any ohlcv data anytime. every great trade starts with data so this is essential


















CONVERTING FROM PYTHON TO TYPESCRIPT

## step 1: make the python usable by typescript with a shell.

import { PythonShell } from 'python-shell';

class TradingBridge {
  async executeBot(command: number): Promise<void> {
    const options = {
      mode: 'text',
      pythonPath: 'python3',
      pythonOptions: ['-u'], // unbuffered output
      scriptPath: './packages/plugin-trading/python_trading/',
      args: [command.toString()]
    };

    console.log('🚀 Calling Python trading bot...');

    return new Promise((resolve, reject) => {
      PythonShell.run('ezbot.py', options, (err, results) => {
        if (err) {
          console.log('❌ Error running trading bot:', err);
          reject(err);
        }
        console.log('✨ Python bot results:', results);
        console.log('🌙 Moon Dev's trading magic completed!');
        resolve();
      });
    });
  }
}

## step 2: if needed

Here are the key trade-offs between using Python with a shell vs. rewriting in TypeScript:
Benefits of Keeping Python + Shell:
✅ Faster development - your code already works
✅ Python has excellent numerical/scientific libraries (numpy, pandas)
✅ Most trading/quant libraries are Python-first
✅ Easier to find examples/documentation for crypto trading in Python
✅ Can still integrate with TypeScript system via shell
Benefits of Rewriting in TypeScript:
1. ✅ Better performance (no shell overhead/context switching)
2. ✅ Type safety across your entire application
✅ Easier debugging (single language stack)
✅ Better IDE support/autocomplete
✅ Simpler deployment (no Python dependency)
My Recommendation:
Start with the Python shell approach since:
You already have working code
Trading systems prioritize reliability over pure performance
The shell overhead is negligible for trading operations
You can gradually port functions to TypeScript if needed later
Only consider rewriting if you:
Hit performance issues with the shell approach
Need deep integration with TypeScript features
Want to remove Python as a dependency entirely
For now, I'd suggest focusing on making your trading logic robust rather than rewriting working code! 🎯