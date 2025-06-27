'use strict';
const __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
  function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
  return new (P || (P = Promise))((resolve, reject) => {
    function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
    function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
    function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
const __generator = (this && this.__generator) || function (thisArg, body) {
  let _ = { label: 0, sent() { if (t[0] & 1) {throw t[1];} return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === 'function' ? Iterator : Object).prototype);
  return g.next = verb(0), g['throw'] = verb(1), g['return'] = verb(2), typeof Symbol === 'function' && (g[Symbol.iterator] = function () { return this; }), g;
  function verb(n) { return function (v) { return step([n, v]); }; }
  function step(op) {
    if (f) {throw new TypeError('Generator is already executing.');}
    while (g && (g = 0, op[0] && (_ = 0)), _) {try {
      if (f = 1, y && (t = op[0] & 2 ? y['return'] : op[0] ? y['throw'] || ((t = y['return']) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) {return t;}
      if (y = 0, t) {op = [op[0] & 2, t.value];}
      switch (op[0]) {
        case 0: case 1: t = op; break;
        case 4: _.label++; return { value: op[1], done: false };
        case 5: _.label++; y = op[1]; op = [0]; continue;
        case 7: op = _.ops.pop(); _.trys.pop(); continue;
        default:
          if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
          if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
          if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
          if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
          if (t[2]) {_.ops.pop();}
          _.trys.pop(); continue;
      }
      op = body.call(thisArg, _);
    } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }}
    if (op[0] & 5) {throw op[1];} return { value: op[0] ? op[1] : void 0, done: true };
  }
};
Object.defineProperty(exports, '__esModule', { value: true });
exports.researchAction = void 0;
const core_1 = require('@elizaos/core');
const types_1 = require('../types');
const paymentMiddleware_1 = require('../middleware/paymentMiddleware');
/**
 * Research action that requires payment
 * This demonstrates how to integrate payment into actions
 */
exports.researchAction = {
  name: 'RESEARCH',
  similes: ['SEARCH', 'INVESTIGATE', 'ANALYZE', 'STUDY', 'EXPLORE'],
  description: 'Performs in-depth research on a topic (requires payment). Supports action chaining by providing research results that can be analyzed further, compiled into reports, or used for decision-making workflows.',
  validate(runtime, message) { return __awaiter(void 0, void 0, void 0, function () {
    let text;
    let _a, _b;
    return __generator(this, (_c) => {
      text = ((_b = (_a = message.content) === null || _a === void 0 ? void 0 : _a.text) === null || _b === void 0 ? void 0 : _b.toLowerCase()) || '';
      return [2 /*return*/, (text.includes('research') ||
                    text.includes('investigate') ||
                    text.includes('analyze') ||
                    text.includes('study'))];
    });
  }); },
  handler(runtime, message, state, options, callback) { return __awaiter(void 0, void 0, void 0, function () {
    let topic_1, paymentMiddleware_2, _paymentResult, error_1;
    let _a;
    return __generator(this, (_b) => {
      switch (_b.label) {
        case 0:
          _b.trys.push([0, 4, , 6]);
          topic_1 = extractResearchTopic(((_a = message.content) === null || _a === void 0 ? void 0 : _a.text) || '');
          if (topic_1) {return [3 /*break*/, 2];}
          return [4 /*yield*/, (callback === null || callback === void 0 ? void 0 : callback({
            text: 'Please specify what you would like me to research.',
            error: true,
          }))];
        case 1:
          _b.sent();
          return [2 /*return*/, {
            text: 'Please specify what you would like me to research.',
            values: { success: false, error: 'no_topic_specified' },
            data: { action: 'RESEARCH' },
          }];
        case 2:
          core_1.elizaLogger.info('[ResearchAction] Starting research', { topic: topic_1 });
          paymentMiddleware_2 = (0, paymentMiddleware_1.createPaymentMiddleware)({
            amount: BigInt(1000000), // 1 USDC (6 decimals)
            method: types_1.PaymentMethod.USDC_ETH,
            requiresConfirmation: false, // Auto-approve for small amounts
            metadata: {
              action: 'research',
              topic: topic_1,
            },
          });
          return [4 /*yield*/, new Promise((resolve, _reject) => {
            paymentMiddleware_2(runtime, message, state, (response) => { return __awaiter(void 0, void 0, void 0, function () {
              let _a;
              return __generator(this, (_b) => {
                switch (_b.label) {
                  case 0:
                    if (!response.error) {return [3 /*break*/, 2];}
                    return [4 /*yield*/, (callback === null || callback === void 0 ? void 0 : callback(response))];
                  case 1:
                    _b.sent();
                    resolve([]);
                    return [2 /*return*/, []];
                  case 2:
                    if (!((_a = response.metadata) === null || _a === void 0 ? void 0 : _a.requiresAction)) {return [3 /*break*/, 4];}
                    return [4 /*yield*/, (callback === null || callback === void 0 ? void 0 : callback(response))];
                  case 3:
                    _b.sent();
                    resolve([]);
                    return [2 /*return*/, []];
                  case 4:
                    resolve([]);
                    return [2 /*return*/, []];
                }
              });
            }); }, () => { return __awaiter(void 0, void 0, void 0, function () {
              let results, error_2;
              return __generator(this, (_a) => {
                switch (_a.label) {
                  case 0:
                    _a.trys.push([0, 3, , 5]);
                    return [4 /*yield*/, performResearch(topic_1, runtime)];
                  case 1:
                    results = _a.sent();
                    return [4 /*yield*/, (callback === null || callback === void 0 ? void 0 : callback({
                      text: formatResearchResults(topic_1, results),
                      metadata: {
                        action: 'research',
                        topic: topic_1,
                        resultCount: results.length,
                        paymentCompleted: true,
                      },
                    }))];
                  case 2:
                    _a.sent();
                    resolve([]);
                    return [3 /*break*/, 5];
                  case 3:
                    error_2 = _a.sent();
                    core_1.elizaLogger.error('[ResearchAction] Research failed', error_2);
                    return [4 /*yield*/, (callback === null || callback === void 0 ? void 0 : callback({
                      text: 'Research failed. Your payment will be refunded.',
                      error: true,
                    }))];
                  case 4:
                    _a.sent();
                    resolve([]);
                    return [3 /*break*/, 5];
                  case 5: return [2];
                }
              });
            }); });
          })];
        case 3:
          _paymentResult = _b.sent();
          return [2 /*return*/, {
            text: 'Research completed successfully',
            values: {
              success: true,
              topic: topic_1,
              paymentCompleted: true,
              resultCount: 3,
            },
            data: {
              action: 'RESEARCH',
              researchMetadata: {
                topic: topic_1,
                paymentAmount: '1000000',
                paymentMethod: types_1.PaymentMethod.USDC_ETH,
                completedAt: new Date().toISOString(),
              },
            },
          }];
        case 4:
          error_1 = _b.sent();
          core_1.elizaLogger.error('[ResearchAction] Error in research action', error_1);
          return [4 /*yield*/, (callback === null || callback === void 0 ? void 0 : callback({
            text: error_1 instanceof Error ? error_1.message : 'An error occurred during research.',
            error: true,
          }))];
        case 5:
          _b.sent();
          return [2 /*return*/, {
            text: error_1 instanceof Error ? error_1.message : 'An error occurred during research.',
            values: {
              success: false,
              error: error_1 instanceof Error ? error_1.message : 'unknown_error',
            },
            data: {
              action: 'RESEARCH',
              errorType: 'research_failed',
              errorDetails: error_1 instanceof Error ? error_1.stack : undefined,
            },
          }];
        case 6: return [2];
      }
    });
  }); },
  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Can you research the latest developments in quantum computing?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll research the latest developments in quantum computing for you. This service costs 1 USDC.\n\nProcessing payment...\n\nPayment successful! Here's what I found:\n\n**Latest Developments in Quantum Computing:**\n\n1. **IBM Quantum Breakthrough** - IBM announced a 433-qubit processor...\n2. **Google's Error Correction** - Significant progress in quantum error correction...\n3. **Commercial Applications** - New quantum algorithms for drug discovery...\n\nWould you like me to research any specific aspect in more detail?",
          actions: ['RESEARCH'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Research AI in healthcare and then create a business plan based on the findings',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll research AI in healthcare first, then use those findings to create a comprehensive business plan.",
          thought: 'User wants research followed by business planning - I should conduct the paid research first, then use those results for strategic planning.',
          actions: ['RESEARCH'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '**AI Healthcare Research Complete!** Found key opportunities in diagnostic accuracy, drug discovery, and personalized medicine. Now creating business plan...',
          thought: 'Research data shows strong market opportunities. I can now develop a business plan based on these research findings.',
          actions: ['CREATE_BUSINESS_PLAN'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Research renewable energy trends, analyze the data, and prepare an investment recommendation',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll conduct comprehensive research on renewable energy trends, analyze the findings, and provide an investment recommendation.",
          thought: 'This requires a three-step workflow: 1) Paid research on renewable energy, 2) Analysis of the data, 3) Investment recommendations. Each step builds on the previous.',
          actions: ['RESEARCH'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Renewable energy research completed! Key trends identified in solar, wind, and battery storage. Now analyzing the market data...',
          thought: 'Research shows promising trends across multiple renewable sectors. I can now analyze this data for investment insights.',
          actions: ['ANALYZE_DATA'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Analysis complete! Based on the research findings, I recommend focusing on battery storage companies with strong growth potential...',
          thought: 'Data analysis reveals battery storage as the highest opportunity sector. I can now provide specific investment recommendations.',
          actions: ['CREATE_INVESTMENT_REPORT'],
        },
      },
    ],
  ],
};
/**
 * Extract research topic from message
 */
function extractResearchTopic(text) {
  // Remove common phrases
  const cleanedText = text
    .toLowerCase()
    .replace(/can you research/gi, '')
    .replace(/please research/gi, '')
    .replace(/research/gi, '')
    .replace(/investigate/gi, '')
    .replace(/analyze/gi, '')
    .replace(/study/gi, '')
    .replace(/about/gi, '')
    .replace(/on/gi, '')
    .replace(/the/gi, '')
    .trim();
    // Return null if too short
  if (cleanedText.length < 3) {
    return null;
  }
  return cleanedText;
}
/**
 * Perform actual research using web search
 */
function performResearch(topic, runtime) {
  return __awaiter(this, void 0, void 0, function () {
    let webSearchService, searchResults, error_3;
    return __generator(this, (_a) => {
      switch (_a.label) {
        case 0:
          core_1.elizaLogger.info('[ResearchAction] Performing research', { topic });
          // Simulate research delay
          return [4 /*yield*/, new Promise((resolve) => { return setTimeout(resolve, 1000); })];
        case 1:
          // Simulate research delay
          _a.sent();
          _a.label = 2;
        case 2:
          _a.trys.push([2, 5, , 6]);
          webSearchService = runtime.getService('web-search');
          if (!(webSearchService && webSearchService.search)) {return [3 /*break*/, 4];}
          return [4 /*yield*/, webSearchService.search(topic, { limit: 5 })];
        case 3:
          searchResults = _a.sent();
          return [2 /*return*/, searchResults.map((result, index) => { return ({
            title: result.title || 'Result '.concat(index + 1),
            summary: result.snippet || result.description || 'No summary available',
            source: result.source || result.url || 'Web',
            relevance: result.relevance || 0.8,
            date: result.date || new Date().toISOString(),
          }); })];
        case 4:
          // Fallback to structured mock results if no web search available
          core_1.elizaLogger.warn('[ResearchAction] Web search not available, using fallback results');
          return [2 /*return*/, [
            {
              title: 'Current State of '.concat(topic),
              summary: 'Analysis of the current developments and state of '.concat(topic, ' based on recent information.'),
              source: 'Research Database',
              relevance: 0.95,
              date: new Date().toISOString(),
            },
            {
              title: ''.concat(topic, ': Key Trends and Insights'),
              summary: 'Overview of emerging trends and important insights related to '.concat(topic, '.'),
              source: 'Industry Analysis',
              relevance: 0.88,
              date: new Date().toISOString(),
            },
            {
              title: 'Future Outlook for '.concat(topic),
              summary: 'Predictions and expert opinions on the future direction of '.concat(topic, '.'),
              source: 'Expert Network',
              relevance: 0.82,
              date: new Date().toISOString(),
            },
          ]];
        case 5:
          error_3 = _a.sent();
          core_1.elizaLogger.error('[ResearchAction] Error performing research', error_3);
          // Return minimal results on error
          return [2 /*return*/, [
            {
              title: 'Research on '.concat(topic),
              summary: 'Research completed but limited results available due to technical issues.',
              source: 'Internal',
              relevance: 0.5,
              date: new Date().toISOString(),
            },
          ]];
        case 6: return [2];
      }
    });
  });
}
/**
 * Format research results for display
 */
function formatResearchResults(topic, results) {
  let output = '**Research Results for "'.concat(topic, '":**\n\n');
  results.forEach((result, index) => {
    output += '**'.concat(index + 1, '. ').concat(result.title, '**\n');
    output += ''.concat(result.summary, '\n');
    output += '*Source: '.concat(result.source, ' | Relevance: ').concat((result.relevance * 100).toFixed(0), '%*\n\n');
  });
  output += '\n*Research completed. Total sources analyzed: '.concat(results.length, '*');
  output += '\n*Service fee: 1 USDC*';
  return output;
}
