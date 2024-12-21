symbol = 'wUtwjNmjCP9TTTtoc5Xn5h5sZ2cYJm5w2w44b79yr2o'

usd_size = 500
max_usd_order_size = 100 # max usd size to sell in one chunk
tx_sleep = 30
# for entering. closing we spam 3 in a row. hard coded.
slippage = 199 # 50% slippage, so 500 = 5% and 50 = .5% slippage
PRIORITY_FEE = 100000 # 200000 is about .035 usd at 150 sol, after a bit of testing 100000 is sufficient and is .02 usd
orders_per_open = 2 # as orders are hard to get through, we can send multiple

# this is for ezbot buy under/sell over function
buy_under = .0946
sell_over = 1

# this is for ezbot sell under/buy over function
sell_under = .037
buy_over = 1