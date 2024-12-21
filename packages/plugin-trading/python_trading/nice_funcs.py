from config import *
import requests
import pandas as pd
import pprint
import re as reggie
import sys
import os
import time
import json
import numpy as np
import datetime
from config import *
import pandas_ta as ta
from datetime import datetime, timedelta
from termcolor import colored, cprint
import solders
import os
from dontshare import dontshare as d
print(d.birdeye)
time.sleep(8978)

# API Key from your 'dontshare' file
API_KEY = d.birdeye

sample_address = "2yXTyarttn2pTZ6cwt4DqmrRuBw1G7pmFv9oT6MStdKP"

BASE_URL = "https://public-api.birdeye.so/defi"

# Custom function to print JSON in a human-readable format
def print_pretty_json(data):
    pp = pprint.PrettyPrinter(indent=4)
    pp.pprint(data)

# Function to print JSON in a human-readable format - assuming you already have it as print_pretty_json
# Helper function to find URLs in text
def find_urls(string):
    # Regex to extract URLs
    return reggie.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', string)

# UPDATED TO RMEOVE THE OTHER ONE so now we can just use this filter instead of filtering twice
def token_overview(address):
    """
    Fetch token overview for a given address and return structured information, including specific links,
    and assess if any price change suggests a rug pull.
    """

    print(f'Getting the token overview for {address}')
    API_KEY = d.birdeye
    BASE_URL = "https://public-api.birdeye.so/defi"
    overview_url = f"{BASE_URL}/token_overview?address={address}"
    headers = {"X-API-KEY": API_KEY}

    response = requests.get(overview_url, headers=headers)
    result = {}

    if response.status_code == 200:
        overview_data = response.json().get('data', {})

        # Retrieve buy1h, sell1h, and calculate trade1h
        buy1h = overview_data.get('buy1h', 0)
        sell1h = overview_data.get('sell1h', 0)
        trade1h = buy1h + sell1h

        # Add the calculated values to the result
        result['buy1h'] = buy1h
        result['sell1h'] = sell1h
        result['trade1h'] = trade1h

        # Calculate buy and sell percentages
        total_trades = trade1h  # Assuming total_trades is the sum of buy and sell
        buy_percentage = (buy1h / total_trades * 100) if total_trades else 0
        sell_percentage = (sell1h / total_trades * 100) if total_trades else 0
        result['buy_percentage'] = buy_percentage
        result['sell_percentage'] = sell_percentage

        # Check if trade1h is bigger than MIN_TRADES_LAST_HOUR
        result['minimum_trades_met'] = True if trade1h >= MIN_TRADES_LAST_HOUR else False

        # Extract price changes over different timeframes
        price_changes = {k: v for k, v in overview_data.items() if 'priceChange' in k}
        result['priceChangesXhrs'] = price_changes

        # Check for rug pull indicator
        rug_pull = any(value < -80 for key, value in price_changes.items() if value is not None)
        result['rug_pull'] = rug_pull
        if rug_pull:
            print("Warning: Price change percentage below -80%, potential rug pull")

        # Extract other metrics
        unique_wallet2hr = overview_data.get('uniqueWallet24h', 0)
        v24USD = overview_data.get('v24hUSD', 0)
        watch = overview_data.get('watch', 0)
        view24h = overview_data.get('view24h', 0)
        liquidity = overview_data.get('liquidity', 0)

        # Add the retrieved data to result
        result.update({
            'uniqueWallet2hr': unique_wallet2hr,
            'v24USD': v24USD,
            'watch': watch,
            'view24h': view24h,
            'liquidity': liquidity,
        })

        # Extract and process description links if extensions are not None
        extensions = overview_data.get('extensions', {})
        description = extensions.get('description', '') if extensions else ''
        urls = find_urls(description)
        links = []
        for url in urls:
            if 't.me' in url:
                links.append({'telegram': url})
            elif 'twitter.com' in url:
                links.append({'twitter': url})
            elif 'youtube' not in url:  # Assume other URLs are for website
                links.append({'website': url})

        # Add extracted links to result
        result['description'] = links


        # Return result dictionary with all the data
        return result
    else:
        print(f"Failed to retrieve token overview for address {address}: HTTP status code {response.status_code}")
        return None


def token_security_info(address):

    '''

    bigmatter
​freeze authority is like renouncing ownership on eth

    Token Security Info:
{   'creationSlot': 242801308,
    'creationTime': 1705679481,
    'creationTx': 'ZJGoayaNDf2dLzknCjjaE9QjqxocA94pcegiF1oLsGZ841EMWBEc7TnDKLvCnE8cCVfkvoTNYCdMyhrWFFwPX6R',
    'creatorAddress': 'AGWdoU4j4MGJTkSor7ZSkNiF8oPe15754hsuLmwcEyzC',
    'creatorBalance': 0,
    'creatorPercentage': 0,
    'freezeAuthority': None,
    'freezeable': None,
    'isToken2022': False,
    'isTrueToken': None,
    'lockInfo': None,
    'metaplexUpdateAuthority': 'AGWdoU4j4MGJTkSor7ZSkNiF8oPe15754hsuLmwcEyzC',
    'metaplexUpdateAuthorityBalance': 0,
    'metaplexUpdateAuthorityPercent': 0,
    'mintSlot': 242801308,
    'mintTime': 1705679481,
    'mintTx': 'ZJGoayaNDf2dLzknCjjaE9QjqxocA94pcegiF1oLsGZ841EMWBEc7TnDKLvCnE8cCVfkvoTNYCdMyhrWFFwPX6R',
    'mutableMetadata': True,
    'nonTransferable': None,
    'ownerAddress': None,
    'ownerBalance': None,
    'ownerPercentage': None,
    'preMarketHolder': [],
    'top10HolderBalance': 357579981.3372284,
    'top10HolderPercent': 0.6439307358062863,
    'top10UserBalance': 138709981.9366756,
    'top10UserPercent': 0.24978920911102176,
    'totalSupply': 555308143.3354646,
    'transferFeeData': None,
    'transferFeeEnable': None}
    '''

    # API endpoint for getting token security information
    url = f"{BASE_URL}/token_security?address={address}"
    headers = {"X-API-KEY": API_KEY}

    # Sending a GET request to the API
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        # Parse the JSON response
        security_data = response.json()['data']
        print_pretty_json(security_data)
    else:
        print("Failed to retrieve token security info:", response.status_code)

def token_creation_info(address):

    '''
    output sampel =

    Token Creation Info:
{   'decimals': 9,
    'owner': 'AGWdoU4j4MGJTkSor7ZSkNiF8oPe15754hsuLmwcEyzC',
    'slot': 242801308,
    'tokenAddress': '9dQi5nMznCAcgDPUMDPkRqG8bshMFnzCmcyzD8afjGJm',
    'txHash': 'ZJGoayaNDf2dLzknCjjaE9QjqxocA94pcegiF1oLsGZ841EMWBEc7TnDKLvCnE8cCVfkvoTNYCdMyhrWFFwPX6R'}
    '''
    # API endpoint for getting token creation information
    url = f"{BASE_URL}/token_creation_info?address={address}"
    headers = {"X-API-KEY": API_KEY}

    # Sending a GET request to the API
    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        # Parse the JSON response
        creation_data = response.json()['data']
        print_pretty_json(creation_data)
    else:
        print("Failed to retrieve token creation info:", response.status_code)

def market_buy(token, amount, slippage):

    import requests
    import sys
    import json
    import base64
    from solders.keypair import Keypair
    from solders.transaction import VersionedTransaction
    from solana.rpc.api import Client
    from solana.rpc.types import TxOpts
    import dontshare.dontshare as d

    KEY = Keypair.from_base58_string(d.sol_key)
    SLIPPAGE = slippage # 5000 is 50%, 500 is 5% and 50 is .5%

    #QUOTE_TOKEN = "So11111111111111111111111111111111111111112"
    QUOTE_TOKEN = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" # usdc

    #http_client = Client("https://api.mainnet-beta.solana.com")
    http_client = Client(d.ankr_key)

    quote = requests.get(f'https://quote-api.jup.ag/v6/quote?inputMint={QUOTE_TOKEN}&outputMint={token}&amount={amount}&slippageBps={SLIPPAGE}').json()
    #print(quote)

    txRes = requests.post('https://quote-api.jup.ag/v6/swap',
                          headers={"Content-Type": "application/json"},
                          data=json.dumps({
                              "quoteResponse": quote,
                              "userPublicKey": str(KEY.pubkey()),
                              "prioritizationFeeLamports": PRIORITY_FEE  # or replace 'auto' with your specific lamport value
                          })).json()
    #print(txRes)
    swapTx = base64.b64decode(txRes['swapTransaction'])
    #print(swapTx)
    tx1 = VersionedTransaction.from_bytes(swapTx)
    tx = VersionedTransaction(tx1.message, [KEY])
    txId = http_client.send_raw_transaction(bytes(tx), TxOpts(skip_preflight=True)).value
    print(f"https://solscan.io/tx/{str(txId)}")



def market_sell(QUOTE_TOKEN, amount, slippage):

    import requests
    import sys
    import json
    import base64
    from solders.keypair import Keypair
    from solders.transaction import VersionedTransaction
    from solana.rpc.api import Client
    from solana.rpc.types import TxOpts
    import dontshare.dontshare as d

    KEY = Keypair.from_base58_string(d.sol_key)
    SLIPPAGE = slippage # 5000 is 50%, 500 is 5% and 50 is .5%

    #QUOTE_TOKEN = "So11111111111111111111111111111111111111112"
    # QUOTE_TOKEN = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" # usdc

    # token would be usdc for sell orders cause we are selling
    token =  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"

    #http_client = Client("https://api.mainnet-beta.solana.com")
    http_client = Client(d.ankr_key)

    quote = requests.get(f'https://quote-api.jup.ag/v6/quote?inputMint={QUOTE_TOKEN}&outputMint={token}&amount={amount}&slippageBps={SLIPPAGE}').json()
    #print(quote)
    txRes = requests.post('https://quote-api.jup.ag/v6/swap',
                          headers={"Content-Type": "application/json"},
                          data=json.dumps({
                              "quoteResponse": quote,
                              "userPublicKey": str(KEY.pubkey()),
                              "prioritizationFeeLamports": PRIORITY_FEE  # or replace 'auto' with your specific lamport value
                          })).json()
    #txRes = requests.post('https://quote-api.jup.ag/v6/swap',headers={"Content-Type": "application/json"}, data=json.dumps({"quoteResponse": quote, "userPublicKey": str(KEY.pubkey()) })).json()
    #print(txRes)
    swapTx = base64.b64decode(txRes['swapTransaction'])
    #print(swapTx)
    tx1 = VersionedTransaction.from_bytes(swapTx)
    #print(tx1)
    tx = VersionedTransaction(tx1.message, [KEY])
    #print(tx)
    txId = http_client.send_raw_transaction(bytes(tx), TxOpts(skip_preflight=True)).value
    print(f"https://solscan.io/tx/{str(txId)}")
