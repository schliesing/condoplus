#!/usr/bin/env node

/**
 * Test Runner - Orquestra testes com relatórios
 *
 * Usage:
 *   node scripts/run-tests.js [module] [options]
 *
 * Examples:
 *   node scripts/run-tests.js backend
 *   node scripts/run-tests.js votings --coverage
 *   node scripts/run-tests.js all --ci
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const module = args[0] || 'all';
const options = args.slice(1);
const isCi = options.includes('--ci');
const withCoverage = options.includes('--coverage');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = (msg, color = 'reset') => {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
};

const runTests = (pattern, name) => {
  log(`\n📋 Running ${name}...`, 'blue');

  try {
    const cmd = [
      'npx jest',
      pattern,
      withCoverage ? '--coverage' : '',
      isCi ? '--ci' : '',
      '--verbose',
      '--json',
      `--outputFile=test-results-${name}.json`
    ].filter(Boolean).join(' ');

    log(`Command: ${cmd}`, 'yellow');
    execSync(cmd, { stdio: 'inherit' });

    log(`✅ ${name} passed`, 'green');
    return { module: name, passed: true };
  } catch (error) {
    log(`❌ ${name} failed`, 'red');
    return { module: name, passed: false, error: error.message };
  }
};

const printSummary = (results) => {
  log('\n' + '='.repeat(60), 'blue');
  log('TEST SUMMARY', 'blue');
  log('='.repeat(60), 'blue');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    log(`${icon} ${result.module}`, result.passed ? 'green' : 'red');
  });

  log(`\nResults: ${passed}/${total} passed`, passed === total ? 'green' : 'red');

  if (failed > 0) {
    process.exit(1);
  }
};

const main = () => {
  log('🧪 CondoPlus Test Suite', 'blue');
  log(`Mode: ${module}`, 'yellow');
  if (isCi) log('CI Mode: ON', 'yellow');
  if (withCoverage) log('Coverage: ON', 'yellow');

  const results = [];

  // Run tests based on module
  if (module === 'all' || module === 'auth') {
    results.push(runTests('__tests__/routes/auth.test.js', 'Auth'));
  }

  if (module === 'all' || module === 'votings') {
    results.push(runTests('__tests__/routes/votings.test.js', 'Votings'));
  }

  if (module === 'all' || module === 'scheduling') {
    results.push(runTests('__tests__/routes/scheduling.test.js', 'Scheduling'));
  }

  if (module === 'all' || module === 'suppliers') {
    results.push(runTests('__tests__/routes/suppliers.test.js', 'Suppliers'));
  }

  if (module === 'all' || module === 'notifications') {
    results.push(runTests('__tests__/routes/notifications.test.js', 'Notifications'));
  }

  if (module === 'all' || module === 'services') {
    results.push(runTests('__tests__/services/', 'Services'));
  }

  // Generate coverage badge
  if (withCoverage) {
    log('\n📊 Generating coverage badges...', 'blue');
    // This would generate SVG badges for README
  }

  // Print summary
  printSummary(results);

  log('\n🎉 All tests completed!', 'green');
};

main();
