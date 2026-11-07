import { describe, expect, it } from 'vitest';
import {
  validatePullRequestInput,
} from '../../../src/api-validation';

describe('Forge API input validation', () => {
  it('accepts normalized pull request identifiers', () => {
    expect(
      validatePullRequestInput({
        workspace: 'team-one',
        repository: 'api_service',
        pullRequestId: '42',
      }),
    ).toEqual({
      workspace: 'team-one',
      repository: 'api_service',
      pullRequestId: '42',
    });
  });

  it('rejects unsafe or malformed pull request identifiers', () => {
    expect(() =>
      validatePullRequestInput({
        workspace: '../other',
        repository: 'repo',
        pullRequestId: '1',
      }),
    ).toThrow('Enter a valid Bitbucket workspace slug.');
    expect(() =>
      validatePullRequestInput({
        workspace: 'team',
        repository: 'repo',
        pullRequestId: '1/../../2',
      }),
    ).toThrow('Pull request ID must be a positive number.');
    expect(() => validatePullRequestInput(null)).toThrow(
      'Request data must be an object.',
    );
  });
});
