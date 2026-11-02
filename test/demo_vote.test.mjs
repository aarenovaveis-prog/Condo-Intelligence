import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoVoteSession, DemoVoteError } from '../src/demo_vote.mjs';

const create = () => createDemoVoteSession({ motionId: 'motion-01', eligibleTokens: ['demo-A', 'demo-B', 'demo-C'] });

test('initial state is open and empty', () => {
  assert.deepEqual(create().snapshot(), {
    motionId: 'motion-01', status: 'open', eligible: 3, ballots: 0,
    remaining: 3, yes: null, no: null, abstain: null,
  });
});
test('counts yes, no and abstain exactly once', () => {
  const session = create();
  session.castVote('demo-A', 'yes');
  session.castVote('demo-B', 'no');
  const result = session.castVote('demo-C', 'abstain');
  assert.deepEqual([result.yes, result.no, result.abstain, result.remaining], [null, null, null, 0]);
  assert.deepEqual([session.close({ confirm: true }).yes, session.snapshot().no, session.snapshot().abstain], [1, 1, 1]);
});
test('rejects duplicate votes without changing tally', () => {
  const session = create();
  session.castVote('demo-A', 'yes');
  assert.throws(() => session.castVote('demo-A', 'no'), DemoVoteError);
  assert.equal(session.snapshot().yes, null);
  assert.equal(session.snapshot().no, null);
  assert.equal(session.close({ confirm: true }).yes, 1);
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
  assert.equal(session.close({ confirm: true }).status, 'closed');
  assert.throws(() => session.castVote('demo-B', 'no'), DemoVoteError);
  assert.equal(session.snapshot().ballots, 1);
});
test('close is idempotent', () => {
  const session = create();
  assert.deepEqual(session.close({ confirm: true }), session.close({ confirm: true }));
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
  assert.equal(session.snapshot().yes, null);
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
  assert.equal(session.castVote('demo-A', 'yes').yes, null);
  assert.equal(session.close({ confirm: true }).yes, 1);
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

// Regression: early tally disclosure can influence remaining demo participants.
test('open snapshot does not disclose option tallies', () => {
  const session = create();
  session.castVote('demo-A', 'yes');
  assert.deepEqual(
    [session.snapshot().yes, session.snapshot().no, session.snapshot().abstain],
    [null, null, null],
  );
  assert.equal(session.snapshot().ballots, 1);
});

test('castVote response cannot disclose live option tallies', () => {
  const session = create();
  const response = session.castVote('demo-A', 'no');
  assert.deepEqual([response.yes, response.no, response.abstain], [null, null, null]);
  assert.equal(response.remaining, 2);
});

test('all ballots submitted still hide results until explicit close', () => {
  const session = create();
  session.castVote('demo-A', 'yes');
  session.castVote('demo-B', 'yes');
  session.castVote('demo-C', 'no');
  assert.deepEqual([session.snapshot().yes, session.snapshot().no, session.snapshot().abstain], [null, null, null]);
  assert.equal(session.snapshot().remaining, 0);
});

test('closing reveals exact totals and keeps them immutable', () => {
  const session = create();
  session.castVote('demo-A', 'yes');
  session.castVote('demo-B', 'no');
  session.castVote('demo-C', 'abstain');
  const result = session.close({ confirm: true });
  assert.deepEqual([result.yes, result.no, result.abstain], [1, 1, 1]);
  assert.equal(result.status, 'closed');
  assert.equal(Object.isFrozen(result), true);
  assert.deepEqual(session.snapshot(), result);
});


// Regression: closing a demo vote requires a deliberate local confirmation.
test('close without explicit confirmation is rejected and keeps session open', () => {
  const session = create();
  for (const invalid of [undefined, null, true, false, 'confirm', {}, { confirm: false }, { confirm: 'true' }, { confirm: 1 }]) {
    assert.throws(() => session.close(invalid), DemoVoteError);
    assert.equal(session.snapshot().status, 'open');
  }
  assert.equal(session.snapshot().ballots, 0);
});

test('inherited confirmation and getter confirmation cannot close session', () => {
  const session = create();
  let reads = 0;
  const accessor = {};
  Object.defineProperty(accessor, 'confirm', { get() { reads++; return true; } });
  for (const invalid of [Object.create({ confirm: true }), accessor]) {
    assert.throws(() => session.close(invalid), DemoVoteError);
  }
  assert.equal(reads, 0);
  assert.equal(session.snapshot().status, 'open');
});

test('explicit confirmed close reveals exact tally and blocks further votes', () => {
  const session = create();
  session.castVote('demo-A', 'yes');
  const result = session.close({ confirm: true });
  assert.deepEqual([result.status, result.yes, result.no, result.abstain], ['closed', 1, 0, 0]);
  assert.throws(() => session.castVote('demo-B', 'no'), DemoVoteError);
  assert.deepEqual(session.close(), result); // idempotent once already closed
});

test('failed close confirmation preserves ability to vote before valid close', () => {
  const session = create();
  session.castVote('demo-A', 'no');
  assert.throws(() => session.close({ confirm: false }), DemoVoteError);
  session.castVote('demo-B', 'yes');
  assert.equal(session.snapshot().yes, null);
  assert.deepEqual([session.close({ confirm: true }).yes, session.snapshot().no], [1, 1]);
});
