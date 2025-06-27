import { expect } from 'bun:test';
import { createUnitTest } from '../test-utils/unifiedTestSuite';
import { BM25 } from '../search';

const bm25SearchSuite = createUnitTest('BM25 Search Tests');

bm25SearchSuite.addTest('should index documents and find matches', async () => {
  const docs = [
    { text: 'hello world' },
    { text: 'another document' },
    { text: 'world of javascript' },
  ];
  const bm = new BM25(docs, { fieldBoosts: { text: 1 } });
  const results = bm.search('world');
  expect(results[0].index).toBe(0);
});

bm25SearchSuite.addTest('should rank documents by relevance', async () => {
  const docs = [
    { content: 'The quick brown fox jumps over the lazy dog' },
    { content: 'The quick brown fox is very quick' },
    { content: 'A lazy dog sleeps all day' },
    { content: 'Quick quick quick!' },
  ];
  const bm = new BM25(docs, { fieldBoosts: { content: 1 } });

  const results = bm.search('quick');
  // Document with most "quick" occurrences should rank highest
  expect(results[0].index).toBe(3);
  expect(results[1].index).toBe(1);
});

bm25SearchSuite.addTest('should handle empty search query', async () => {
  const docs = [{ text: 'hello world' }, { text: 'another document' }];
  const bm = new BM25(docs, { fieldBoosts: { text: 1 } });
  // BM25 throws an error for empty search queries
  expect(() => bm.search('')).toThrow('Input text cannot be null or empty');
});

bm25SearchSuite.addTest('should handle no matching documents', async () => {
  const docs = [{ text: 'hello world' }, { text: 'another document' }];
  const bm = new BM25(docs, { fieldBoosts: { text: 1 } });
  const results = bm.search('nonexistent');
  expect(results).toHaveLength(0);
});

bm25SearchSuite.addTest('should handle multiple fields with different boosts', async () => {
  const docs = [
    { title: 'JavaScript Guide', content: 'A guide about programming' },
    { title: 'Programming Basics', content: 'Learn JavaScript and more' },
    { title: 'Web Development', content: 'JavaScript is essential' },
  ];
  const bm = new BM25(docs, {
    fieldBoosts: {
      title: 2, // Title matches are more important
      content: 1,
    },
  });

  const results = bm.search('JavaScript');
  // First doc has JavaScript in title (boosted)
  expect(results[0].index).toBe(0);
});

bm25SearchSuite.addTest('should handle special characters in search query', async () => {
  const docs = [
    { text: 'hello@world.com' },
    { text: 'test#hashtag' },
    { text: 'special!characters?' },
  ];
  const bm = new BM25(docs, { fieldBoosts: { text: 1 } });

  const results = bm.search('hello@world.com');
  expect(results[0].index).toBe(0);
});

bm25SearchSuite.addTest('should limit results when specified', async () => {
  const docs = Array.from({ length: 20 }, (_, i) => ({
    text: `Document ${i} contains the word search`,
  }));
  const bm = new BM25(docs, { fieldBoosts: { text: 1 } });

  const results = bm.search('search', 5);
  expect(results).toHaveLength(5);
});

bm25SearchSuite.addTest('should handle case-insensitive search', async () => {
  const docs = [{ text: 'Hello World' }, { text: 'HELLO WORLD' }, { text: 'hello world' }];
  const bm = new BM25(docs, { fieldBoosts: { text: 1 } });

  const results = bm.search('HELLO');
  expect(results.length).toBeGreaterThan(0);
  // All documents should match regardless of case
  expect(results).toHaveLength(3);
});

bm25SearchSuite.addTest('should return scores with results', async () => {
  const docs = [{ text: 'The quick brown fox' }, { text: 'The quick quick fox' }];
  const bm = new BM25(docs, { fieldBoosts: { text: 1 } });

  const results = bm.search('quick');
  expect(results[0]).toHaveProperty('score');
  expect(results[0].score).toBeGreaterThan(0);
  // Document with more occurrences should have higher score
  expect(results[0].score).toBeGreaterThan(results[1].score);
});
