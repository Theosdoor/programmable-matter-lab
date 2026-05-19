(function () {
  'use strict';

  function buildFormalRules() {
    return [];
  }

  function buildResourceMap() {
    return new Map();
  }

  function analyzeOneStep() {
    return {
      status: 'pass',
      diagnostics: [],
      maximalSets: []
    };
  }

  function cloneMembranes(membranes) {
    return new Map(membranes || []);
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
