# advanced trading by moon dev

- this plugin will include a ton of helpful trading functions so that agents can buy, sell & manage risk
- while everything is currently in python i will later convert to ts

how to use
1. config controls the solana contract that is being traded, size, etc.
2. run from ezbot, there are a bunch of different options of bots
3. nice_funcs has a lot of helpful functions to enable the bot to trade

'

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