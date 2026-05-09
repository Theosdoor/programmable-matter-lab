(function () {
  'use strict';

  function cloneMultiset(multiset) {
    return new Map(multiset || []);
  }

  function cloneResourceMap(resources) {
    const clone = new Map();
    for (const [key, multiset] of resources || []) {
      clone.set(key, cloneMultiset(multiset));
    }
    return clone;
  }

  function addToMultiset(multiset, obj, count) {
    if (!obj || count <= 0) return;
    multiset.set(obj, (multiset.get(obj) || 0) + count);
  }

  function resourceKeyForRule(rule) {
    return rule.resourceKey || rule.membraneId;
  }

  function maxApplicationsForRule(rule, availableResources, exclusiveKey, usedExclusiveKeys) {
    if (exclusiveKey && usedExclusiveKeys.has(exclusiveKey)) return 0;

    const resourceKey = resourceKeyForRule(rule);
    const resource = availableResources.get(resourceKey);
    if (!resource) return 0;

    const lhs = rule.lhs || new Map();
    if (lhs.size === 0) return exclusiveKey ? 1 : 0;

    let max = Infinity;
    for (const [obj, needed] of lhs) {
      if (needed <= 0) continue;
      max = Math.min(max, Math.floor((resource.get(obj) || 0) / needed));
    }

    if (!Number.isFinite(max)) return exclusiveKey ? 1 : 0;
    return exclusiveKey ? Math.min(max, 1) : max;
  }

  function consumeRule(rule, availableResources, count) {
    if (count <= 0) return availableResources;

    const nextResources = cloneResourceMap(availableResources);
    const resourceKey = resourceKeyForRule(rule);
    const resource = nextResources.get(resourceKey) || new Map();
    nextResources.set(resourceKey, resource);

    for (const [obj, needed] of rule.lhs || []) {
      const nextCount = (resource.get(obj) || 0) - needed * count;
      if (nextCount > 0) {
        resource.set(obj, nextCount);
      } else {
        resource.delete(obj);
      }
    }

    return nextResources;
  }

  function signatureForCounts(counts) {
    return Array.from(counts)
      .filter(([, count]) => count > 0)
      .sort(([left], [right]) => String(left).localeCompare(String(right)))
      .map(([id, count]) => `${id}:${count}`)
      .join('|');
  }

  function isStrictSubset(left, right) {
    let hasSmallerCount = false;
    const ids = new Set([...left.counts.keys(), ...right.counts.keys()]);

    for (const id of ids) {
      const leftCount = left.counts.get(id) || 0;
      const rightCount = right.counts.get(id) || 0;
      if (leftCount > rightCount) return false;
      if (leftCount < rightCount) hasSmallerCount = true;
    }

    return hasSmallerCount;
  }

  function enumerateMaximalRuleMultisets(rules, resources, exclusiveKeyForRule) {
    const allCandidates = [];
    const seenSignatures = new Set();
    const ruleList = Array.from(rules || []);
    const keyForRule = exclusiveKeyForRule || (() => '');

    function recordCandidate(counts) {
      const signature = signatureForCounts(counts);
      if (!signature) return;
      if (seenSignatures.has(signature)) return;
      seenSignatures.add(signature);
      allCandidates.push({ counts: cloneMultiset(counts), signature });
    }

    function visit(index, availableResources, usedExclusiveKeys, counts) {
      if (index >= ruleList.length) {
        recordCandidate(counts);
        return;
      }

      const rule = ruleList[index];
      const exclusiveKey = keyForRule(rule) || '';
      const maxApplications = maxApplicationsForRule(rule, availableResources, exclusiveKey, usedExclusiveKeys);

      for (let count = 0; count <= maxApplications; count += 1) {
        const nextCounts = cloneMultiset(counts);
        const nextUsedExclusiveKeys = new Set(usedExclusiveKeys);

        if (count > 0) {
          nextCounts.set(rule.id, count);
          if (exclusiveKey) nextUsedExclusiveKeys.add(exclusiveKey);
        }

        visit(index + 1, consumeRule(rule, availableResources, count), nextUsedExclusiveKeys, nextCounts);
      }
    }

    visit(0, cloneResourceMap(resources), new Set(), new Map());

    return allCandidates.filter((candidate, index) => {
      return !allCandidates.some((other, otherIndex) => {
        return otherIndex !== index && isStrictSubset(candidate, other);
      });
    });
  }

  window.FormalStep = {
    cloneMultiset,
    cloneResourceMap,
    addToMultiset,
    enumerateMaximalRuleMultisets
  };
}());
