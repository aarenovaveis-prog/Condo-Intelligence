import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoVoteSession, DemoVoteError } from '../src/demo_vote.mjs';

const create = () => createDemoVoteSession({
  motionId: 'demo-motion', eligibleTokens: ['demo-A', 'demo-B'],
});

test('a confirmation proxy with a throwing descriptor trap is rejected as a domain error', () => {
  const session = create();
  session.castVote('demo-A', 'yes');
  let reads = 0;
  const hostile = new Proxy({}, {
    getOwnPropertyDescriptor() { reads++; throw new Error('untrusted proxy trap'); },
  });
  assert.throws(() => session.close(hostile), DemoVoteError);
  assert.equal(reads, 1);
  assert.deepEqual([session.snapshot().status, session.snapshot().ballots, session.snapshot().yes], ['open', 1, null]);
  session.castVote('demo-B', 'no');
  assert.deepEqual([session.close({ confirm: true }).yes, session.snapshot().no], [1, 1]);
});

test('a revoked confirmation proxy cannot leak a TypeError or close the vote', () => {
  const session = create();
  const { proxy, revoke } = Proxy.revocable({ confirm: true }, {});
  revoke();
  assert.throws(() => session.close(proxy), DemoVoteError);
  assert.equal(session.snapshot().status, 'open');
  assert.equal(session.close({ confirm: true }).status, 'closed');
});

test('invalid proxy descriptors do not escape as native TypeError', () => {
  const session = create();
  const hostile = new Proxy({}, {
    getOwnPropertyDescriptor() { return { get: 42, configurable: true }; },
  });
  assert.throws(() => session.close(hostile), DemoVoteError);
  assert.equal(session.snapshot().status, 'open');
});

test('ordinary explicit confirmation and previously closed idempotency are preserved', () => {
  const session = create();
  assert.throws(() => session.close({ confirm: false }), DemoVoteError);
  session.castVote('demo-A', 'abstain');
  const result = session.close(Object.freeze({ confirm: true }));
  assert.deepEqual([result.status, result.yes, result.no, result.abstain], ['closed', 0, 0, 1]);
  assert.deepEqual(session.close(), result);
});
