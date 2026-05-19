(function () {
  'use strict';

  function parseRulesText() {
    return [];
  }

  function parseRuleLine(line, lineNumber) {
    return {
      lineNumber,
      id: `L${lineNumber}`,
      source: line,
      type: '',
      status: 'fail',
      diagnostic: `Line ${lineNumber} does not match any supported active-membrane rule pattern.`,
      normalized: '',
      rule: null
    };
  }

  function parseMultiset() {
    return new Map();
  }

  function formatMultiset(multiset) {
    if (!multiset || multiset.size === 0) return 'lambda';
    return Array.from(multiset).map(([obj, count]) => count === 1 ? obj : `${obj}^${count}`).join(' ');
  }

  function normalizeRule(row) {
    return row && row.normalized ? row.normalized : '';
  }

  window.ActiveMembraneParser = {
    parseRulesText,
    parseRuleLine,
    parseMultiset,
    formatMultiset,
    normalizeRule
  };
}());
