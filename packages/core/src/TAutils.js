import Chart from 'chart.js/auto';
import puppeteer from 'puppeteer-extra';

async function fetchTopCoins() {
    const options = {
        method: 'GET',
        headers: {accept: 'application/json', 'X-API-KEY': process.env.BIRDEYE_API_KEY}
    };

    const response = await fetch(`https://public-api.birdeye.so/defi/token_trending?sort_by=rank&sort_type=asc&offset=0&limit=20`, options);
    const data = await response.json();
    // only keep the token address
    const tokens = data.data.tokens.map(token => token.address);
    const symbols = data.data.tokens.map(token => token.symbol);
    // combine tokens and symbols into an array of objects
    const tokenData = tokens.map((token, index) => ({
        token: token,
        symbol: symbols[index]
    }));
    //console.log(tokenData);
    return tokenData;
}

async function generateChart(ohlcvData, symbol) {
    // Validate input data
    if (!ohlcvData || !Array.isArray(ohlcvData) || ohlcvData.length === 0) {
        console.error('Invalid or empty OHLCV data:', ohlcvData);
        throw new Error('Invalid OHLCV data provided');
    }

    if (!symbol) {
        console.error('No symbol provided');
        throw new Error('Symbol is required');
    }

    let browser;
    try {
        const html = `
            <html>
                <body style="width: 1200px; height: 700px; padding-bottom: 20px; padding-left: 20px; padding-right: 20px; background-color: #1e1e1e;">
                    <div style="display: flex; flex-direction: column; color: white;">
                        <div style="font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500; color: #ffffff; margin-top: -10px;">
                            <p>${symbol.toUpperCase()}/SOL • 1H</p>
                        </div>
                        <div>
                            <div style="border: 1px solid #444; padding: 10px; margin-bottom: 30px; height: 300px;">
                                <canvas id="candlestickChart"></canvas>
                            </div>
                            <div style="border: 1px solid #444; padding-left: 10px; padding-right: 10px; margin-bottom: 30px; height: 140px;">
                                <canvas id="rsiChart"></canvas>
                            </div>
                            <div style="border: 1px solid #444; padding-left: 10px; padding-right: 10px; height: 140px;">
                                <canvas id="macdChart"></canvas>
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        `;
        //console.log(ohlcvData);
        const rsiData = calculateRSI(ohlcvData);
        const macdData = prepareChartData(ohlcvData);

        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        // Add error handling for page operations
        page.on('error', err => {
            console.error('Page error:', err);
        });
        page.on('pageerror', err => {
            console.error('Page error:', err);
        });

        await page.setContent(html);

        // Load required scripts with error handling
        try {
            await Promise.all([
                page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/chart.js' }),
                page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns' }),
                page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/chartjs-chart-financial' }),
                page.evaluate(() => {
                    import('https://cdn.jsdelivr.net/npm/chartjs-chart-financial').then(module => {
                        Chart.register(module.default);
                    });
                })
            ]);
        } catch (error) {
            console.error('Error loading scripts:', error);
            throw error;
        }

        const chartConfig = {
            candlestick: {
                type: 'candlestick',
                data: {
                    datasets: [{
                        label: 'OHLC',
                        data: ohlcvData.map(d => ({
                            x: d.unixTime * 1000,
                            o: d.o,
                            h: d.h,
                            l: d.l,
                            c: d.c
                        }))
                    }, {
                        label: 'Volume',
                        data: ohlcvData.map(d => ({
                            x: d.unixTime * 1000,
                            y: d.v
                        })),
                        type: 'bar',
                        backgroundColor: ohlcvData.map(d => d.c >= d.o ? 'rgba(0, 192, 0, 0.3)' : 'rgba(192, 0, 0, 0.3)'),
                        yAxisID: 'volume',
                        order: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'hour',
                                displayFormats: {
                                    hour: 'MMM dd, HH:mm'
                                }
                            },
                            grid: {
                                display: true,
                                color: '#444'
                            }
                        },
                        y: {
                            position: 'left',
                            grid: {
                                display: true,
                                color: '#444'
                            },
                            ticks: {
                                count: 5,
                                color: '#ffffff'
                            }
                        },
                        volume: {
                            position: 'left',
                            grid: {
                                display: false
                            },
                            ticks: {
                                callback: (value) => {
                                    return (value / 1000000).toFixed(1) + 'M';
                                },
                                color: '#ffffff'
                            },
                            display: false
                        }
                    },
                    plugins: {
                        legend: {
                            display: false,
                            labels: {
                                color: '#ffffff'
                            }
                        }
                    }
                }
            },
            rsi: {
                type: 'line',
                data: {
                    datasets: [
                        {
                            label: 'RSI',
                            data: rsiData,
                            borderColor: 'purple',
                            borderWidth: 2,
                            pointRadius: 0
                        },
                        {
                            label: 'Overbought',
                            data: rsiData.map(d => ({
                                x: d.x,
                                y: 70  // Overbought level
                            })),
                            borderColor: 'rgba(255, 82, 82, 0.5)',  // Red with transparency
                            borderWidth: 2,
                            borderDash: [5, 5],  // Dashed line
                            pointRadius: 0,
                            fill: false
                        },
                        {
                            label: 'Oversold',
                            data: rsiData.map(d => ({
                                x: d.x,
                                y: 30  // Oversold level
                            })),
                            borderColor: 'rgba(76, 175, 80, 0.5)',  // Green with transparency
                            borderWidth: 2,
                            borderDash: [5, 5],  // Dashed line
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'hour',
                                displayFormats: {
                                    hour: 'MMM dd, HH:mm'
                                }
                            },
                            display: false,
                            grid: {
                                color: '#444'
                            }
                        },
                        y: {
                            min: 0,
                            max: 100,
                            position: 'left',
                            grid: {
                                color: '#444'
                            },
                            ticks: {
                                count: 3,
                                color: '#ffffff'
                            }
                        }
                    },
                    plugins: {
                        CustomLegend: {},
                        legend: {
                            display: true,
                            position: 'top',
                            align: 'start',
                            labels: {
                                usePointStyle: true,
                                padding: 15,
                                boxWidth: 10,
                                boxHeight: 10,
                                font: {
                                    size: 11
                                },
                                filter: function(legendItem, data) {
                                    // Only show "RSI" in the legend
                                    return legendItem.text === 'RSI';
                                },
                                color: '#ffffff'
                            },
                        }
                    }
                }
            },
            macd: {
                type: 'bar',
                data: {
                    datasets: [
                        {
                            label: 'Histogram',
                            data: macdData.map(d => ({
                                x: d.x,
                                y: d.histogram
                            })),
                            type: 'bar',
                            backgroundColor: macdData.map(d =>
                                d.histogram >= 0
                                    ? 'rgba(0, 255, 128, 0.6)' // Bright green for positive
                                    : 'rgba(255, 64, 64, 0.6)'  // Bright red for negative
                            ),
                            order: 5,
                            barPercentage: 1,
                            categoryPercentage: 1
                        },
                        {
                            label: 'MACD',
                            data: macdData.map(d => ({
                                x: d.x,
                                y: d.macd
                            })),
                            type: 'line',
                            borderColor: 'rgba(75, 192, 192, 1)', // Cyan
                            borderWidth: 1.5,
                            pointRadius: 0,
                            order: 1,
                            fill: false
                        },
                        {
                            label: 'Signal',
                            data: macdData.map(d => ({
                                x: d.x,
                                y: d.signal
                            })),
                            type: 'line',
                            borderColor: 'rgba(255, 140, 0, 1)', // Orange
                            borderWidth: 1.5,
                            pointRadius: 0,
                            order: 2,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: 'hour',
                                displayFormats: {
                                    hour: 'MMM dd, HH:mm'
                                }
                            },
                            display: false,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)' // Light gray grid lines
                            }
                        },
                        y: {
                            position: 'left',
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)' // Light gray grid lines
                            },
                            ticks: {
                                count: 2,
                                padding: 10,
                                callback: function(value) {
                                    return value.toFixed(4);
                                },
                                color: '#ffffff' // White tick labels
                            },
                            beginAtZero: false,
                            afterDataLimits: (scale) => {
                                const allValues = macdData.reduce((acc, d) => {
                                    acc.push(d.macd, d.signal, d.histogram);
                                    return acc;
                                }, []);

                                const maxValue = Math.max(...allValues);
                                const minValue = Math.min(...allValues);
                                const maxAbs = Math.max(Math.abs(maxValue), Math.abs(minValue));

                                const topPadding = maxAbs;
                                const bottomPadding = maxAbs;
                                scale.max = maxAbs + topPadding;
                                scale.min = -(maxAbs + bottomPadding);
                            }
                        }
                    },
                    plugins: {
                        CustomLegend: {},
                        legend: {
                            display: true,
                            position: 'top',
                            align: 'start',
                            labels: {
                                usePointStyle: true,
                                padding: 15,
                                boxWidth: 10,
                                boxHeight: 10,
                                color: '#ffffff' // White legend text
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                label: function(context) {
                                    let label = context.dataset.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    if (context.parsed.y !== null) {
                                        label += context.parsed.y.toFixed(4);
                                    }
                                    return label;
                                }
                            },
                            backgroundColor: 'rgba(0, 0, 0, 0.8)', // Dark tooltip background
                            titleColor: '#ffffff', // White tooltip title
                            bodyColor: '#ffffff' // White tooltip text
                        },
                        annotation: {
                            annotations: {
                                zeroLine: {
                                    type: 'line',
                                    yMin: 0,
                                    yMax: 0,
                                    borderColor: 'rgba(255, 255, 255, 0.4)', // Light gray zero line
                                    borderWidth: 1,
                                    borderDash: [2, 2],
                                    label: {
                                        display: false
                                    }
                                }
                            }
                        }
                    }
                }
            }

        };

        // Add error handling for chart creation
        try {
            await page.evaluate((config) => {
                const CustomLegend = {
                    id: 'customLegend',
                    beforeInit: (chart) => {
                        const originalFit = chart.legend.fit;
                        chart.legend.fit = function fit() {
                            originalFit.bind(chart.legend)();
                            this.height = this.height + 20;
                        };
                    }
                };

                Chart.register(CustomLegend);
                new Chart('candlestickChart', config.candlestick);
                new Chart('rsiChart', config.rsi);
                new Chart('macdChart', config.macd);
            }, chartConfig);
        } catch (error) {
            console.error('Error creating charts:', error);
            throw error;
        }

        const screenshot = await page.screenshot({
            fullPage: true,
            encoding: 'base64'
        });

        return screenshot;
    } catch (error) {
        console.error('Error in generateChart:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

function calculateEMA(prices, period) {
    const multiplier = 2 / (period + 1);
    let ema = prices[0]; // Start with first price as SMA

    return prices.map((price, index) => {
        if (index === 0) return ema;
        ema = (price - ema) * multiplier + ema;
        return ema;
    });
};

function calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    // Extract closing prices from your OHLCV data
    const closingPrices = data.map(candle => candle.c);

    // Calculate fast and slow EMAs
    const fastEMA = calculateEMA(closingPrices, fastPeriod);
    const slowEMA = calculateEMA(closingPrices, slowPeriod);

    // Calculate MACD line
    const macdLine = fastEMA.map((fast, index) => fast - slowEMA[index]);

    // Calculate Signal line (9-day EMA of MACD line)
    const signalLine = calculateEMA(macdLine, signalPeriod);

    // Calculate MACD histogram
    const histogram = macdLine.map((macd, index) => macd - signalLine[index]);

    return {
        macdLine,
        signalLine,
        histogram
    };
};

function prepareChartData(ohlcvData) {
    // Calculate MACD
    const macdResult = calculateMACD(ohlcvData);
    //console.log(macdResult);
    // Prepare data for the chart
    const macdData = ohlcvData.map((candle, index) => ({
        x: new Date(candle.unixTime * 1000), // Convert Unix timestamp to Date object
        macd: macdResult.macdLine[index],
        signal: macdResult.signalLine[index],
        histogram: macdResult.histogram[index]
    }));

    return macdData;
};

const calculateRSI = (ohlcData, period = 5) => {
    if (!Array.isArray(ohlcData) || ohlcData.length < period + 1) {
        throw new Error("Not enough data points to calculate RSI");
    }

    const rsiData = [];
    const changes = [];

    // Calculate price changes
    for (let i = 1; i < ohlcData.length; i++) {
        changes.push(ohlcData[i].c - ohlcData[i - 1].c);
    }

    // Calculate first average gain and loss
    let avgGain = 0;
    let avgLoss = 0;
    changes.slice(0, period).forEach(change => {
        if (change > 0) avgGain += change;
        else avgLoss += Math.abs(change);
    });
    avgGain /= period;
    avgLoss /= period;

    // Calculate RSI for first period
    let rs = avgGain / avgLoss;
    let rsi = 100 - (100 / (1 + rs));
    rsiData.push({
        x: ohlcData[period].unixTime * 1000,
        y: rsi
    });

    // Calculate remaining RSI values
    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        const gain = change > 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;

        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;

        rs = avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));

        rsiData.push({
            x: ohlcData[i + 1].unixTime * 1000,
            y: rsi
        });
    }

    return rsiData;
};

const getOHLCV = async (tokenAddress) => {
    try {
        // start time is now - 5 days
        const startTime = Math.floor(Date.now() / 1000) - 5 * 24 * 60 * 60;
        // end time is now
        const endTime = Math.floor(Date.now() / 1000);
        const options = {
            method: 'GET',
            headers: {accept: 'application/json', 'X-API-KEY': process.env.BIRDEYE_API_KEY}
        };
        const response = await fetch(`https://public-api.birdeye.so/defi/ohlcv?address=${tokenAddress}&type=1H&time_from=${startTime}&time_to=${endTime}`, options);
        const data = await response.json();
        //console.log('ohlcvData:', JSON.stringify(data.data.items, null, 2));
        return data.data.items;
    } catch (error) {
        console.error("Error getting OHLC:", error);
        return null;
    }
};

const findAddressByCashtag = async (cashtag) => {
    try {
        const options = {
            method: 'GET',
            headers: {accept: 'application/json', 'X-API-KEY': process.env.BIRDEYE_API_KEY}
        };
        const response = await fetch(`https://public-api.birdeye.so/defi/v3/search?chain=all&keyword=${cashtag}&target=all&sort_by=volume_24h_usd&sort_type=desc&offset=0&limit=20`, options);
        const data = await response.json();
        //console.log(JSON.stringify(data, null, 2));
        const tokenAddress = data.data.items[0].result[0].address;
        console.log(tokenAddress);
        return tokenAddress;
    } catch (error) {
        console.error("Error finding address by cashtag:", error);
        return null;
    }
};

const makeChart = async (cashtag, ohlcvData) => {
    //const tokenAddress = await findAddressByCashtag(cashtag);
    //const ohlcvData = await getOHLCV(tokenAddress);
    console.log('test');
    const chartPath = await generateChart(ohlcvData, cashtag);
    console.log("chartPath:", chartPath);
    return chartPath;
};

export { makeChart, calculateRSI, calculateMACD, getOHLCV, findAddressByCashtag, fetchTopCoins };