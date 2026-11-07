import type { PullRequestInput } from './api-contracts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inputRecord(value: unknown): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new TypeError('Request data must be an object.');
  }
  return value;
}

function inputString(input: Record<string, unknown>, key: string): string {
  if (typeof input[key] !== 'string') {
    throw new TypeError('Request fields must be text.');
  }
  return input[key];
}

function requireMatch(value: string, pattern: RegExp, message: string): string {
  const normalized = value.trim();
  if (!pattern.test(normalized)) {
    throw new TypeError(message);
  }
  return normalized;
}

export function validatePullRequestInput(
  value: unknown,
): PullRequestInput {
  const input = inputRecord(value);
  return {
    workspace: requireMatch(
      inputString(input, 'workspace'),
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/,
      'Enter a valid Bitbucket workspace slug.',
    ),
    repository: requireMatch(
      inputString(input, 'repository'),
      /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/,
      'Enter a valid Bitbucket repository slug.',
    ),
    pullRequestId: requireMatch(
      inputString(input, 'pullRequestId'),
      /^[1-9]\d{0,9}$/,
      'Pull request ID must be a positive number.',
    ),
  };
}
