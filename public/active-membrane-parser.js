(function () {
  'use strict';

  const CHARGE_RE = String.raw`(?:\+|-|0)`;
  const LABEL_RE = String.raw`[A-Za-z0-9_]+`;

  function fail(line, lineNumber, message) {
    return {
      lineNumber,
      id: `L${lineNumber}`,
      source: line,
      type: '',
      status: 'fail',
      diagnostic: message || `Line ${lineNumber} does not match any supported active-membrane rule pattern.`,
      normalized: '',
      rule: null
    };
  }

  function pass(line, lineNumber, type, normalized, rule) {
    return {
      lineNumber,
      id: `L${lineNumber}`,
      source: line,
      type,
      status: 'pass',
      diagnostic: '',
      normalized,
      rule
    };
  }

  function parseRulesText(text) {
    return String(text || '')
      .split(/\r?\n/)
      .map((line, index) => ({ line, lineNumber: index + 1 }))
      .filter(({ line }) => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('#');
      })
      .map(({ line, lineNumber }) => parseRuleLine(line, lineNumber));
  }

  function parseMultiset(text) {
    const trimmed = String(text || '').trim();
    const multiset = new Map();
    if (!trimmed || trimmed === 'lambda') return multiset;

    for (const token of trimmed.split(/\s+/)) {
      const match = token.match(/^([A-Za-z][A-Za-z0-9_]*)(?:\^([1-9][0-9]*))?$/);
      if (!match) throw new Error(`Invalid multiset token "${token}"`);
      const object = match[1];
      const count = match[2] ? Number(match[2]) : 1;
      multiset.set(object, (multiset.get(object) || 0) + count);
    }

    return multiset;
  }

  function formatMultiset(multiset) {
    if (!multiset || multiset.size === 0) return 'lambda';
    return Array.from(multiset)
      .filter(([, count]) => count > 0)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([object, count]) => count === 1 ? object : `${object}^${count}`)
      .join(' ');
  }

  function parseInnerMembranes(text) {
    const trimmed = String(text || '').trim();
    if (!trimmed) return [];

    const matches = Array.from(trimmed.matchAll(new RegExp(String.raw`\[(${LABEL_RE})\]\^(${CHARGE_RE})`, 'g')));
    const consumed = matches.map(match => match[0]).join(' ').replace(/\s+/g, ' ').trim();
    if (consumed !== trimmed.replace(/\s+/g, ' ').trim()) {
      throw new Error(`Invalid inner membrane list "${text}"`);
    }

    return matches.map(match => ({ label: match[1], charge: match[2] }));
  }

  function parseEvolution(line, lineNumber) {
    const re = new RegExp(String.raw`^\[\s*(${LABEL_RE})\s+(.+?)\s*->\s*(.*?)\s*\]\s*\1\^(${CHARGE_RE})$`);
    const match = line.match(re);
    if (!match) return null;
    const membrane = match[1];
    const lhs = parseMultiset(match[2]);
    const products = parseMultiset(match[3]);
    const initialCharge = match[4];
    const normalized = `[${membrane} ${formatMultiset(lhs)} -> ${formatMultiset(products)}]${membrane}^${initialCharge}`;
    return pass(line, lineNumber, 'a', normalized, {
      type: 'a',
      membrane,
      initialCharge,
      lhs,
      rhs: { products }
    });
  }

  function parseSendIn(line, lineNumber) {
    const re = new RegExp(String.raw`^(.+?)\s+\[\s*(${LABEL_RE})\s*\]\^(${CHARGE_RE})\s*->\s*\[\s*\2(?:\s+(.*?))?\s*\]\^(${CHARGE_RE})$`);
    const match = line.match(re);
    if (!match) return null;
    const objectOutside = parseMultiset(match[1]);
    const membrane = match[2];
    const initialCharge = match[3];
    const products = parseMultiset(match[4] || 'lambda');
    const finalCharge = match[5];
    const normalized = `${formatMultiset(objectOutside)} [${membrane}]^${initialCharge} -> [${membrane} ${formatMultiset(products)}]^${finalCharge}`;
    return pass(line, lineNumber, 'b', normalized, {
      type: 'b',
      membrane,
      initialCharge,
      lhs: objectOutside,
      rhs: { finalCharge, products }
    });
  }

  function parseSendOut(line, lineNumber) {
    const re = new RegExp(String.raw`^\[\s*(${LABEL_RE})\s+(.+?)\s*\]\^(${CHARGE_RE})\s*->\s*\[\s*\1\s*\]\^(${CHARGE_RE})(?:\s+(.*))?$`);
    const match = line.match(re);
    if (!match) return null;
    const membrane = match[1];
    const lhs = parseMultiset(match[2]);
    const initialCharge = match[3];
    const finalCharge = match[4];
    const parentProducts = parseMultiset(match[5] || 'lambda');
    const normalized = `[${membrane} ${formatMultiset(lhs)}]^${initialCharge} -> [${membrane}]^${finalCharge} ${formatMultiset(parentProducts)}`;
    return pass(line, lineNumber, 'c', normalized, {
      type: 'c',
      membrane,
      initialCharge,
      lhs,
      rhs: { finalCharge, parentProducts }
    });
  }

  function parseDissolution(line, lineNumber) {
    const re = new RegExp(String.raw`^\[\s*(${LABEL_RE})\s+(.+?)\s*\]\^(${CHARGE_RE})\s*->\s*(.+)$`);
    const match = line.match(re);
    if (!match) return null;
    if (line.match(new RegExp(String.raw`->\s*\[\s*${LABEL_RE}`, ''))) return null;
    const membrane = match[1];
    const lhs = parseMultiset(match[2]);
    const initialCharge = match[3];
    const productsToParent = parseMultiset(match[4]);
    const normalized = `[${membrane} ${formatMultiset(lhs)}]^${initialCharge} -> ${formatMultiset(productsToParent)}`;
    return pass(line, lineNumber, 'd', normalized, {
      type: 'd',
      membrane,
      initialCharge,
      lhs,
      rhs: { productsToParent }
    });
  }

  function parseElementaryDivision(line, lineNumber) {
    const re = new RegExp(String.raw`^\[\s*(${LABEL_RE})\s+(.+?)\s*\]\^(${CHARGE_RE})\s*->\s*\[\s*\1(?:\s+(.*?))?\s*\]\^(${CHARGE_RE})\s+\[\s*\1(?:\s+(.*?))?\s*\]\^(${CHARGE_RE})$`);
    const match = line.match(re);
    if (!match) return null;
    const membrane = match[1];
    const lhs = parseMultiset(match[2]);
    const initialCharge = match[3];
    const firstProducts = parseMultiset(match[4] || 'lambda');
    const firstCharge = match[5];
    const secondProducts = parseMultiset(match[6] || 'lambda');
    const secondCharge = match[7];
    const normalized = `[${membrane} ${formatMultiset(lhs)}]^${initialCharge} -> [${membrane} ${formatMultiset(firstProducts)}]^${firstCharge} [${membrane} ${formatMultiset(secondProducts)}]^${secondCharge}`;
    return pass(line, lineNumber, 'e', normalized, {
      type: 'e',
      membrane,
      initialCharge,
      lhs,
      rhs: {
        first: { label: membrane, charge: firstCharge, products: firstProducts },
        second: { label: membrane, charge: secondCharge, products: secondProducts }
      }
    });
  }

  function parseNonElementaryDivision(line, lineNumber) {
    const re = new RegExp(String.raw`^\[\s*(${LABEL_RE})\s+(.+?)\s*\]\^(${CHARGE_RE})\s*->\s*\[\s*\1\s+(.*?)\s*\]\^(${CHARGE_RE})\s+\[\s*\1\s+(.*?)\s*\]\^(${CHARGE_RE})$`);
    const match = line.match(re);
    if (!match) return null;
    const membrane = match[1];
    try {
      const lhsInner = parseInnerMembranes(match[2]);
      const initialCharge = match[3];
      const firstInner = parseInnerMembranes(match[4]);
      const firstCharge = match[5];
      const secondInner = parseInnerMembranes(match[6]);
      const secondCharge = match[7];
      const normalized = `[${membrane} ${formatInnerMembranes(lhsInner)}]^${initialCharge} -> [${membrane} ${formatInnerMembranes(firstInner)}]^${firstCharge} [${membrane} ${formatInnerMembranes(secondInner)}]^${secondCharge}`;
      return pass(line, lineNumber, 'f', normalized, {
        type: 'f',
        membrane,
        initialCharge,
        lhsInner,
        rhs: {
          first: { label: membrane, charge: firstCharge, inner: firstInner },
          second: { label: membrane, charge: secondCharge, inner: secondInner }
        }
      });
    } catch (e) {
      return null;
    }
  }

  function formatInnerMembranes(inner) {
    return inner.map(mem => `[${mem.label}]^${mem.charge}`).join(' ');
  }

  function parseRuleLine(line, lineNumber) {
    const source = String(line || '').trim();
    try {
      const parsers = [
        parseNonElementaryDivision,
        parseElementaryDivision,
        parseSendIn,
        parseSendOut,
        parseEvolution,
        parseDissolution
      ];

      for (const parser of parsers) {
        const row = parser(source, lineNumber);
        if (row) return row;
      }
    } catch (error) {
      return fail(source, lineNumber, `Line ${lineNumber}: ${error.message}`);
    }

    return fail(source, lineNumber, `Line ${lineNumber} does not match any supported active-membrane rule pattern.`);
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
