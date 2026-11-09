import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response as ForgeResponse } from '@forge/api';

const mocks = vi.hoisted(() => ({
  requestBitbucket: vi.fn(),
}));

vi.mock('@forge/api', () => ({
  default: {
    asUser: () => ({
      requestBitbucket: mocks.requestBitbucket,
    }),
  },
  route: (strings: TemplateStringsArray, ...values: string[]) =>
    strings.reduce(
      (path, segment, index) => path + segment + (values[index] ?? ''),
      '',
    ),
  assumeTrustedRoute: (value: string) => value,
}));

import { getPullRequestOverview } from '../../../src/atlassian-api';

function jsonResponse(payload: unknown, status = 200): ForgeResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Forbidden',
    headers: {
      append: () => {},
      delete: () => {},
      get: () => null,
      has: () => false,
      set: () => {},
      forEach: () => {},
    },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
    arrayBuffer: async () => new ArrayBuffer(0),
  };
}

const pullRequestPayload = {
  id: 21,
  title: 'Update API contract',
  state: 'OPEN',
  author: { display_name: 'A. Developer' },
  source: {
    branch: { name: 'feature/api' },
    commit: { hash: 'abc123456789' },
  },
  destination: {
    branch: { name: 'main' },
    commit: { hash: 'def123456789' },
  },
  links: { html: { href: 'https://bitbucket.org/team/repo/pull-requests/21' } },
};

beforeEach(() => {
  mocks.requestBitbucket.mockReset();
});

describe('authenticated Bitbucket API function', () => {
  it('retrieves all changed-file pages and marks the result complete', async () => {
    const nextUrl =
      'https://api.bitbucket.org/2.0/repositories/team/repo/diffstat/abc123456789..def123456789?page=2';

    mocks.requestBitbucket
      .mockResolvedValueOnce(jsonResponse(pullRequestPayload))
      .mockResolvedValueOnce(jsonResponse({
        next: nextUrl,
        values: [
          {
            status: 'modified',
            lines_added: 4,
            lines_removed: 2,
            old: { path: 'src/api.ts' },
            new: { path: 'src/api.ts' },
          },
        ],
      }))
      .mockResolvedValueOnce(jsonResponse({
        values: [
          {
            status: 'added',
            lines_added: 12,
            lines_removed: 0,
            new: { path: 'src/new-api.ts' },
          },
        ],
      }));

    const result = await getPullRequestOverview({
      workspace: 'team',
      repository: 'repo',
      pullRequestId: '21',
    });

    expect(result).toMatchObject({
      title: 'Update API contract',
      sourceBranch: 'feature/api',
      destinationBranch: 'main',
      files: [
        {
          path: 'src/api.ts',
          status: 'modified',
          linesAdded: 4,
          linesRemoved: 2,
        },
        {
          path: 'src/new-api.ts',
          status: 'added',
          linesAdded: 12,
          linesRemoved: 0,
        },
      ],
      filesTruncated: false,
    });
    expect(mocks.requestBitbucket).toHaveBeenNthCalledWith(
      1,
      '/2.0/repositories/team/repo/pullrequests/21',
    );
    expect(mocks.requestBitbucket).toHaveBeenNthCalledWith(
      2,
      '/2.0/repositories/team/repo/diffstat/abc123456789..def123456789?topic=true&pagelen=500',
    );
    expect(mocks.requestBitbucket).toHaveBeenNthCalledWith(3, nextUrl);
  });

  it('rejects pagination URLs outside the expected Bitbucket diffstat resource', async () => {
    mocks.requestBitbucket
      .mockResolvedValueOnce(jsonResponse(pullRequestPayload))
      .mockResolvedValueOnce(jsonResponse({
        next: 'https://attacker.example/steal-token',
        values: [],
      }));

    await expect(
      getPullRequestOverview({
        workspace: 'team',
        repository: 'repo',
        pullRequestId: '21',
      }),
    ).rejects.toThrow('Bitbucket returned an unexpected changed-file pagination URL.');

    expect(mocks.requestBitbucket).toHaveBeenCalledTimes(2);
  });

  it('reports product access failures and validates input before requests', async () => {
    mocks.requestBitbucket.mockResolvedValueOnce(jsonResponse({}, 403));

    await expect(
      getPullRequestOverview({
        workspace: 'team',
        repository: 'repo',
        pullRequestId: '21',
      }),
    ).rejects.toThrow('Access to Bitbucket pull request was denied.');
    await expect(
      getPullRequestOverview({
        workspace: '../other',
        repository: 'repo',
        pullRequestId: '21',
      }),
    ).rejects.toThrow('Enter a valid Bitbucket workspace slug.');
    expect(mocks.requestBitbucket).toHaveBeenCalledTimes(1);
  });
});
