
'''
building the first essentially tools for our market maker
creating something that will allow us to
essentially put in a number and have the bot do what is correlated

0 - close the position (in chunks)
1 - open a buying position (in chunks)
5 - market maker above or below


4 - pnl close, just monitor position for tp and sl

6 - funding buy
7 - liquidation amount

'''

from config import *
import nice_funcs as n
import time
from termcolor import colored, cprint
import schedule


###### ASKING USER WHAT THEY WANNA DO - WILL REMOVE USER SOON AND REPLACE WITH BOT ######
buy = 0
print('slow down, dont trade by hand... moon dev told you so...')
buy = input('0 to close, 1 to buy, 5 market maker  |||| 6 funding buy, 7 liquidation amount:')
print('you entered:', buy)
buy = int(buy)

def bot():

    while buy == 0:
        print('closing position')
        # get pos first
        pos = n.get_position(symbol)
        while pos > 0:
            n.chunk_kill(symbol, max_usd_order_size, slippage)
            pos = n.get_position(symbol)
            time.sleep(1)

        if pos < .9:
            time.sleep(15)
            pos = n.get_position(symbol)
            if pos < .9:
                print('position closed thanks moon dev....')
                time.sleep(876786)
                break


    print('bot successfully closed position...')

    while buy == 1:
        print('opening buying position')
        pos = n.get_position(symbol)
        price = n.token_price(symbol)
        pos_usd = pos * price
        size_needed = usd_size - pos_usd
        if size_needed > max_usd_order_size: chunk_size = max_usd_order_size
        else: chunk_size = size_needed

        chunk_size = int(chunk_size * 10**6)
        chunk_size = str(chunk_size)

        if pos_usd > (.97 * usd_size):
            print('position filled')
            time.sleep(7867678)

        while pos_usd < (.97 * usd_size):

            print(f'position: {round(pos,2)} price: {round(price,8)} buy_under: {buy_under} pos_usd: ${round(pos_usd,2)}')

            try:

                for i in range(orders_per_open):
                    n.market_buy(symbol, chunk_size, slippage)
                    # cprint green background black text
                    cprint(f'chunk buy submitted of {symbol[-4:]} sz: {chunk_size} you my dawg moon dev', 'white', 'on_blue')
                    time.sleep(1)

                time.sleep(tx_sleep)

                pos = n.get_position(symbol)
                price = n.token_price(symbol)
                pos_usd = pos * price
                size_needed = usd_size - pos_usd
                if size_needed > max_usd_order_size: chunk_size = max_usd_order_size
                else: chunk_size = size_needed
                chunk_size = int(chunk_size * 10**6)
                chunk_size = str(chunk_size)

            except:

                try:
                    cprint(f'trying again to make the order in 30 seconds.....', 'light_blue', 'on_light_magenta')
                    time.sleep(30)
                    for i in range(orders_per_open):
                        n.market_buy(symbol, chunk_size, slippage)
                        # cprint green background black text
                        cprint(f'chunk buy submitted of {symbol[-4:]} sz: {chunk_size} you my dawg moon dev', 'white', 'on_blue')
                        time.sleep(1)

                    time.sleep(tx_sleep)
                    pos = n.get_position(symbol)
                    price = n.token_price(symbol)
                    pos_usd = pos * price
                    size_needed = usd_size - pos_usd
                    if size_needed > max_usd_order_size: chunk_size = max_usd_order_size
                    else: chunk_size = size_needed
                    chunk_size = int(chunk_size * 10**6)
                    chunk_size = str(chunk_size)


                except:
                    cprint(f'Final Error in the buy, restart needed', 'white', 'on_red')
                    time.sleep(10)
                    break

            time.sleep(3)
            pos = n.get_position(symbol)
            price = n.token_price(symbol)
            pos_usd = pos * price
            size_needed = usd_size - pos_usd
            if size_needed > max_usd_order_size: chunk_size = max_usd_order_size
            else: chunk_size = size_needed
            chunk_size = int(chunk_size * 10**6)
            chunk_size = str(chunk_size)


        # cprint white on greeen
        cprint(f'position filled of {symbol[-4:]} total: ${pos_usd}', 'white', 'on_green')
        break

    while buy == 4:
        print('pnl close')

    while buy == 5:
        print(f'market maker buying below {buy_under} and selling above {sell_over}')

        # get token price
        pos = n.get_position(symbol)
        price = n.token_price(symbol)
        pos_usd = pos * price
        size_needed = usd_size - pos_usd
        if size_needed > max_usd_order_size: chunk_size = max_usd_order_size
        else: chunk_size = size_needed

        chunk_size = int(chunk_size * 10**6)
        chunk_size = str(chunk_size)

        if price > sell_over:
            print(f'selling {symbol[-4:]} bc price is {price} and sell over is {sell_over}')
            n.chunk_kill(symbol, max_usd_order_size, slippage)
            print(f'chunk kill complete... thank you moon dev you are my savior 777')
            time.sleep(15)


        elif (price < buy_under) and (pos_usd < usd_size):

            time.sleep(10)

            # get token price
            pos = n.get_position(symbol)
            price = n.token_price(symbol)
            pos_usd = pos * price
            size_needed = usd_size - pos_usd
            if size_needed > max_usd_order_size: chunk_size = max_usd_order_size
            else: chunk_size = size_needed

            chunk_size = int(chunk_size * 10**6)
            chunk_size = str(chunk_size)

            if (pos_usd < usd_size) and (price < buy_under):
                print(f'buying {symbol[-4:]} bc price is {price} and buy under is {buy_under}')
                n.elegant_entry(symbol, buy_under)
                print('elegant entry complete...')
                time.sleep(15)

        else:
            print(f'price is {price} and not buying or selling position is {pos_usd} and usd size is {usd_size}')
            time.sleep(30)

    while buy == 6:
        print('funding buy')

    while buy == 7:
        print('liquidation amount')

    else:
        print('COMPLETE THANKS MOON DEV!')


bot()

schedule.every(30).seconds.do(bot)

while True:
    try:
        schedule.run_pending()
        time.sleep(3)
    except:
        print('*** error, sleeping')
        time.sleep(15)

