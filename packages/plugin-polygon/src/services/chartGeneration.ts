import puppeteer from 'puppeteer';
import path from 'path';
import { format } from 'date-fns';

/**
 * Generates a line graph stock price chart as a JPEG image with sparse X and Y axis labels.
 * 
 * @param {Object[]} data - Array of stock price objects (e.g., { date, close }).
 * @param {string} period - The time period for the chart.
 * @param {string} ticker - The ticker symbol for the chart.
 * @param {string} outputPath - Path to save the generated JPEG image.
 * @returns {Promise<string>} - Resolves with the path to the generated JPEG image.
 */
export const generateLineGraph = async (data, period, ticker, outputPath) => {
  const height = 720;
  const width = 1280;
  const title = `${ticker} Stock Chart`;


  


  // Prepare chart data
  const labels = data.map(({ date }) => format(new Date(date), getDateFormatter(period)));
  const prices = data.map(({ close }) => close);

  // Calculate slope
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const slope = lastPrice - firstPrice;
  const lineColor = slope < 0 ? '#ff4444' : '#00ff88';
  const backgroundColor = slope < 0 ? 'rgba(255, 68, 68, 0.1)' : 'rgba(0, 255, 136, 0.1)';

  // Calculate better Y axis bounds
  const max = Math.max(...prices);
  const min = Math.min(...prices);
  const range = max - min;
  const middle = (max + min) / 2;
  const paddedRange = range * 1.2; // Add 20% to the range

  // Create HTML for the chart
  const chartHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
      <canvas id="chart" width="${width}" height="${height}"></canvas>
      <script>
        const ctx = document.getElementById('chart').getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(labels)},
            datasets: [{
              label: '${title}',
              data: ${JSON.stringify(prices)},
              borderColor: '${lineColor}',
              backgroundColor: '${backgroundColor}',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.3,
              fill: true
            }]
          },
          options: {
            responsive: false,
            animation: {
              duration: 0 // Disable animations for screenshot
            },
            layout: {
              padding: 20
            },
            plugins: {
              legend: { 
                display: true,
                labels: { 
                  color: '#e0e0e0',
                  font: { size: 14 }
                }
              },
              title: { 
                display: true, 
                text: '${title}',
                color: '#e0e0e0',
                font: { size: 16, weight: 'bold' }
              }
            },
            scales: {
              y: {
                beginAtZero: false,
                min: ${min - (paddedRange / 2)},
                max: ${max + (paddedRange / 2)},
                grid: {
				          display: false
                },
                ticks: {
                  autoSkip: true,
                  maxTicksLimit: 8,
                  color: '#a0a0a0',
                  font: { size: 12 }
                }
              }
            }
          }
        });
      </script>
      <style>
        body {
          background: #111;
          margin: 0;
          padding: 20px;
        }
      </style>
    </body>
    </html>
  `;

  // Replace Playwright browser launch with Puppeteer
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width, height });

  // Load the chart HTML
  await page.setContent(chartHTML);

  // Wait for the chart to render
  await page.waitForSelector('#chart');

  // Capture the chart as a JPEG
  const chartPath = path.resolve(outputPath);
  await page.screenshot({ 
    path: chartPath, 
    type: 'jpeg',
    quality: 100 
  });

  await browser.close();

  return chartPath;
};

const getDateFormatter = (period) => {
	switch (period) {
		case 'minute':
			return 'HH:mm'
		case 'hour':
			return 'HH:mm'
		case 'day':
			return 'MMM dd';
		case 'week':
			return 'MMM dd';
		case 'month':
			return 'MMM dd';
		case 'year':
			return 'MMM yy';
	}
}

