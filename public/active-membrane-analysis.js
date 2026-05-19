(function () {
  'use strict';

  function cloneMultiset(multiset) {
    return new Map(multiset || []);
  }

  function cloneMembrane(membrane) {
    return {
      ...membrane,
      objects: cloneMultiset(membrane.objects),
      childrenIds: Array.from(membrane.childrenIds || [])
    };
  }

  function cloneMembranes(membranes) {
    return new Map(Array.from(membranes || []).map(([id, membrane]) => [id, cloneMembrane(membrane)]));
  }

  function resourceKey(membraneId) {
    return `membrane:${membraneId}`;
  }

  function buildResourceMap(membranes) {
    const resources = new Map();
    membranes.forEach((membrane, membraneId) => {
      resources.set(resourceKey(membraneId), cloneMultiset(membrane.objects));
    });
    return resources;
  }

  function hasChildren(membranes, membraneId) {
    for (const membrane of membranes.values()) {
      if (membrane.parentId === membraneId) return true;
    }
    return false;
  }

  function rowDiagnostic(row, message) {
    return `${row.id}: ${message}`;
  }

  function buildFormalRules(membranes, rows, options) {
    const diagnostics = [];
    const formalRules = [];
    const allowElementaryDivision = Boolean(options && options.allowElementaryDivision);

    for (const row of rows || []) {
      if (row.status === 'fail') {
        diagnostics.push(rowDiagnostic(row, row.diagnostic));
        continue;
      }
      if (row.status === 'blocked') {
        diagnostics.push(rowDiagnostic(row, row.diagnostic));
        continue;
      }

      const rule = row.rule;
      const membrane = membranes.get(rule.membrane);
      if (!membrane) {
        diagnostics.push(rowDiagnostic(row, `Unknown membrane "${rule.membrane}".`));
        continue;
      }
      if (membrane.charge !== rule.initialCharge) continue;

      if (rule.type === 'e' && !allowElementaryDivision) {
        diagnostics.push(rowDiagnostic(row, 'Elementary division parsed, but one-step transition semantics are not enabled in this build.'));
        continue;
      }

      if (rule.type === 'e' && hasChildren(membranes, rule.membrane)) continue;

      if (rule.type === 'f' && !innerMembranesMatch(membranes, rule)) continue;

      const formal = {
        id: row.id,
        displayLabel: row.id,
        type: rule.type,
        membraneId: rule.membrane,
        resourceKey: resourceKey(rule.membrane),
        lhs: cloneMultiset(rule.lhs),
        raw: row.source,
        parsedRow: row,
        exclusiveKeys: []
      };

      if (rule.type === 'b') {
        if (!membrane.parentId) continue;
        formal.resourceKey = resourceKey(membrane.parentId);
        formal.exclusiveKeys = [resourceKey(rule.membrane)];
      } else if (['c', 'd', 'e'].includes(rule.type)) {
        formal.exclusiveKeys = [resourceKey(rule.membrane)];
      } else if (rule.type === 'f') {
        formal.lhs = new Map();
        formal.exclusiveKeys = [
          resourceKey(rule.membrane),
          ...rule.lhsInner.map(inner => resourceKey(inner.label))
        ];
      }

      formalRules.push(formal);
    }

    return { formalRules, diagnostics };
  }

  function innerMembranesMatch(membranes, rule) {
    for (const inner of rule.lhsInner || []) {
      const membrane = membranes.get(inner.label);
      if (!membrane || membrane.parentId !== rule.membrane || membrane.charge !== inner.charge) return false;
    }
    return true;
  }

  function analyzeOneStep(membranes, rows, options) {
    const parserProblems = (rows || []).filter(row => row.status === 'fail' || row.status === 'blocked');
    if (parserProblems.length > 0) {
      return {
        status: parserProblems.some(row => row.status === 'blocked') ? 'blocked' : 'fail',
        diagnostics: parserProblems.map(row => rowDiagnostic(row, row.diagnostic)),
        maximalSets: []
      };
    }

    const built = buildFormalRules(membranes, rows, options);
    if (built.diagnostics.some(message => message.includes('Elementary division'))) {
      return {
        status: 'blocked',
        diagnostics: built.diagnostics,
        maximalSets: []
      };
    }

    const maximalSets = window.FormalStep.enumerateMaximalRuleMultisets(
      built.formalRules,
      buildResourceMap(membranes),
      rule => rule.exclusiveKeys
    );

    return {
      status: 'pass',
      diagnostics: built.diagnostics,
      maximalSets,
      formalRules: built.formalRules
    };
  }

  function applyRuleMultiset(membranes) {
    return cloneMembranes(membranes);
  }

  window.ActiveMembraneAnalysis = {
    buildFormalRules,
    buildResourceMap,
    analyzeOneStep,
    cloneMembranes,
    applyRuleMultiset
  };
}());
