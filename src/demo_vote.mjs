/**
 * Offline, in-memory vote demonstration using synthetic tokens only.
 * NOT identity verification, legal assembly voting, access control or persistence.
 * Any holder of the returned session can close it; never connect to real voters.
 * Choice totals are intentionally hidden until explicit close (not a security boundary).
 */
const TOKEN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/u;
const CHOICES = Object.freeze(['yes', 'no', 'abstain']);
const MAX_VOTERS = 1000;

export class DemoVoteError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DemoVoteError';
  }
}

function validToken(value) {
  return typeof value === 'string' && TOKEN.test(value);
}

/** Each session is ephemeral and contains no identifying voter details. */
export function createDemoVoteSession({ motionId, eligibleTokens } = {}) {
  if (!validToken(motionId)) throw new DemoVoteError('Invalid motion ID');
  if (!Array.isArray(eligibleTokens) || eligibleTokens.length === 0 ||
      eligibleTokens.length > MAX_VOTERS) {
    throw new DemoVoteError('Invalid synthetic voter token catalog');
  }

  // Read only own indexed data slots. Array#some skips holes and Set uses a
  // caller-controlled iterator, either of which could admit phantom voters.
  const validatedTokens = [];
  for (let i = 0; i < eligibleTokens.length; i++) {
    const descriptor = Object.getOwnPropertyDescriptor(eligibleTokens, i);
    if (!descriptor || !Object.hasOwn(descriptor, 'value') ||
        !validToken(descriptor.value)) {
      throw new DemoVoteError('Invalid synthetic voter token catalog');
    }
    validatedTokens.push(descriptor.value);
  }
  const allowed = new Set(validatedTokens);
  if (allowed.size !== validatedTokens.length) {
    throw new DemoVoteError('Invalid synthetic voter token catalog');
  }
  const ballots = new Map();
  let closed = false;

  function snapshot() {
    // Prevent casual disclosure of live results through either snapshot() or
    // castVote() responses. This does NOT authorize who may close the session.
    const counts = closed ? { yes: 0, no: 0, abstain: 0 } : null;
    if (closed) {
      for (const choice of ballots.values()) counts[choice]++;
    }
    return Object.freeze({
      motionId,
      status: closed ? 'closed' : 'open',
      eligible: allowed.size,
      ballots: ballots.size,
      remaining: allowed.size - ballots.size,
      yes: counts?.yes ?? null,
      no: counts?.no ?? null,
      abstain: counts?.abstain ?? null,
    });
  }

  return Object.freeze({
    castVote(token, choice) {
      if (closed) throw new DemoVoteError('Demonstration vote is closed');
      if (!validToken(token) || !allowed.has(token)) {
        throw new DemoVoteError('Token not eligible for demonstration');
      }
      if (!CHOICES.includes(choice)) throw new DemoVoteError('Invalid choice');
      if (ballots.has(token)) throw new DemoVoteError('Token already voted');
      ballots.set(token, choice);
      return snapshot();
    },
    close() {
      closed = true;
      return snapshot();
    },
    snapshot,
  });
}
