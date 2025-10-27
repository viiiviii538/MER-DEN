/**
 * @jest-environment jsdom
 */
// @ts-check
const { findPrice, findTitleKey, isSold } = require('../content-metrics');

describe('content-metrics', () => {
  describe('findPrice', () => {
    test('extracts numeric value from price text', () => {
      const el = document.createElement('div');
      el.innerText = ' \n  ¥12,345  ';
      expect(findPrice(el)).toBe(12345);
    });

    test('returns null when price not found', () => {
      const el = document.createElement('div');
      el.textContent = 'no price here';
      expect(findPrice(el)).toBeNull();
    });

    test('extracts when price uses fallback pattern', () => {
      const el = document.createElement('div');
      el.innerText = '合計 1,980円';
      expect(findPrice(el)).toBe(1980);
    });

    test('reads price from attributes when text is empty', () => {
      const el = document.createElement('div');
      el.setAttribute('aria-label', 'price ¥99');
      expect(findPrice(el)).toBe(99);
    });

    test('parses numeric data-price attribute', () => {
      const el = document.createElement('div');
      el.setAttribute('data-price', '1,234');
      expect(findPrice(el)).toBe(1234);
    });

    test('parses numeric dataset price attribute', () => {
      const el = document.createElement('div');
      el.dataset.price = '5678';
      expect(findPrice(el)).toBe(5678);
    });
  });

  describe('findTitleKey', () => {
    test('normalises title text for grouping', () => {
      const el = document.createElement('div');
      el.setAttribute('title', '【限定】NIKE-Air Max (27cm)');
      expect(findTitleKey(el)).toBe('限定 nike air max 27cm');
    });

    test('lowercases alphanumeric characters', () => {
      const el = document.createElement('div');
      el.innerText = 'Camera CASE';
      expect(findTitleKey(el)).toBe('camera case');
    });
  });

  describe('isSold', () => {
    test('detects sold text', () => {
      const el = document.createElement('div');
      el.innerText = '売り切れです';
      expect(isSold(el)).toBe(true);
    });

    test('detects sold badge via querySelector', () => {
      const el = document.createElement('div');
      el.innerHTML = '<img alt="SOLD badge" />';
      expect(isSold(el)).toBe(true);
    });

    test('returns false for active items', () => {
      const el = document.createElement('div');
      el.innerText = '在庫あり';
      expect(isSold(el)).toBe(false);
    });
  });
});
