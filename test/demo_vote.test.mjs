import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoVoteSession, DemoVoteError } from '../src/demo_vote.mjs';

const create = () => createDemoVoteSession({ motionId: 'motion-01', eligibleTokens: ['demo-A', 'demo-B', 'demo-C'] });

test('initial state is open and empty', () => {
  assert.deepEqual(create().snapshot(), {
    motionId: 'motion-01', status: 'open', eligible: 3, ballots: 0,
    remaining: 3, yes: 0, no: 0, abstain: 0,
  });
});
test('counts yes, no and abstain exactly once', () => {
  const session = create();
  session.castVote('demo-A', 'yes');
  session.castVote('demo-B', 'no');
  const result = session.castVote('demo-C', 'abstain');
  assert.deepEqual([result.yes, result.no, result.abstain, result.remaining], [1, 1, 1, 0]);
});
test('rejects duplicate votes without changing tally', () => {
  const session = create();
  session.castVote('demo-A', 'yes');
  assert.throws(() => session.castVote('demo-A', 'no'), DemoVoteError);
  assert.equal(session.snapshot().yes, 1);
  assert.equal(session.snapshot().no, 0);
});
test('rejects unknown or malformed tokens', () => {
  const session = create();
  for (const token of ['outsider', ' demo-A', '', null, {}, 'demo-A\n']) {
    assert.throws(() => session.castVote(token, 'yes'), DemoVoteError);
  }
  assert.equal(session.snapshot().ballots, 0);
});
test('rejects invalid choices without consuming vote', () => {
  const session = create();
  for (const choice of ['YES', 'maybe', '', null, 1, {}]) {
    assert.throws(() => session.castVote('demo-A', choice), DemoVoteError);
  }
  assert.equal(session.snapshot().ballots, 0);
  session.castVote('demo-A', 'yes');
  assert.equal(session.snapshot().ballots, 1);
});
test('closed session cannot accept more votes', () => {
  const session = create();
  session.castVote('demo-A', 'yes');
  assert.equal(session.close().status, 'closed');
  assert.throws(() => session.castVote('demo-B', 'no'), DemoVoteError);
  assert.equal(session.snapshot().ballots, 1);
});
test('close is idempotent', () => {
  const session = create();
  assert.deepEqual(session.close(), session.close());
});
test('snapshots do not disclose voter tokens', () => {
  const session = create();
  session.castVote('demo-A', 'yes');
  const result = session.snapshot();
  assert.equal(JSON.stringify(result).includes('demo-A'), false);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(session), true);
});
test('snapshot mutation does not affect tally', () => {
  const session = create();
  const result = session.snapshot();
  assert.throws(() => { result.yes = 900; }, TypeError);
  assert.equal(session.snapshot().yes, 0);
});
test('catalog mutation after creation does not alter eligibility', () => {
  const eligibleTokens = ['demo-A'];
  const session = createDemoVoteSession({ motionId: 'M1', eligibleTokens });
  eligibleTokens.push('demo-B');
  assert.throws(() => session.castVote('demo-B', 'yes'), DemoVoteError);
});
test('rejects invalid motion IDs', () => {
  for (const motionId of ['', ' M1', 'M 1', 'á', null, 5, 'x'.repeat(65)]) {
    assert.throws(() => createDemoVoteSession({ motionId, eligibleTokens: ['a'] }), DemoVoteError);
  }
});
test('rejects empty, duplicate and malformed catalogs', () => {
  for (const eligibleTokens of [[], ['a', 'a'], ['a', ' b'], ['a', null], 'abc', null, {}]) {
    assert.throws(() => createDemoVoteSession({ motionId: 'M1', eligibleTokens }), DemoVoteError);
  }
});
test('enforces maximum 1000 demo voters', () => {
  const tokens = Array.from({ length: 1001 }, (_, i) => `token-${i}`);
  assert.throws(() => createDemoVoteSession({ motionId: 'M1', eligibleTokens: tokens }), DemoVoteError);
  const session = createDemoVoteSession({ motionId: 'M1', eligibleTokens: tokens.slice(0, 1000) });
  assert.equal(session.snapshot().eligible, 1000);
});
test('no source data or external services required', () => {
  const session = create();
  assert.deepEqual(Object.keys(session).sort(), ['castVote', 'close', 'snapshot']);
});

// Regression: sparse array holes and custom iterators must not create phantom voters.
test('rejects sparse eligible-token catalogs', () => {
  const sparseSingle = new Array(1);
  const sparseMixed = ['demo-A', , 'demo-C'];
  const sparseMax = new Array(1000);
  for (const eligibleTokens of [sparseSingle, sparseMixed, sparseMax]) {
    assert.throws(
      () => createDemoVoteSession({ motionId: 'M1', eligibleTokens }),
      DemoVoteError,
    );
  }
});

test('ignores a custom iterator and uses only validated indexed token values', () => {
  const eligibleTokens = ['demo-A'];
  eligibleTokens[Symbol.iterator] = function* () { yield 'intruder'; };
  const session = createDemoVoteSession({ motionId: 'M1', eligibleTokens });
  assert.throws(() => session.castVote('intruder', 'yes'), DemoVoteError);
  assert.equal(session.castVote('demo-A', 'yes').yes, 1);
});

test('rejects accessor-based token slots without invoking their getters', () => {
  const eligibleTokens = ['demo-A'];
  let reads = 0;
  Object.defineProperty(eligibleTokens, '0', { configurable: true, get() { reads++; return 'demo-A'; } });
  assert.throws(
    () => createDemoVoteSession({ motionId: 'M1', eligibleTokens }),
    DemoVoteError,
  );
  assert.equal(reads, 0);
});
