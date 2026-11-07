import api, { route, type Response as ForgeResponse } from '@forge/api';
import type {
  PullRequestInput,
  PullRequestOverview,
} from './api-contracts';
import { validatePullRequestInput } from './api-validation';

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function recordAt(value: unknown, key: string): JsonRecord {
  if (!isRecord(value) || !isRecord(value[key])) {
    return {};
  }
  return value[key];
}

function stringAt(value: unknown, key: string, fallback = ''): string {
  return isRecord(value) && typeof value[key] === 'string'
    ? value[key]
    : fallback;
}

function numberAt(value: unknown, key: string): number {
  return isRecord(value) && typeof value[key] === 'number' ? value[key] : 0;
}

function safeHttpsUrl(value: string): string {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function responseError(product: string, status: number): Error {
  if (status === 401) {
    return new Error(
      `${product} did not authorize this request. Confirm that your account has access and approve the app's requested permissions.`,
    );
  }
  if (status === 403) {
    return new Error(
      `Access to ${product} was denied. Check your product access and the app's granted permissions.`,
    );
  }
  if (status === 404) {
    return new Error(
      `The requested ${product} resource was not found or is not visible to your account.`,
    );
  }
  if (status === 429) {
    return new Error(`${product} rate-limited the request. Wait and try again.`);
  }
  return new Error(`${product} request failed with HTTP ${status}.`);
}

async function readJsonResponse(
  response: ForgeResponse,
  product: string,
): Promise<JsonRecord> {
  if (!response.ok) {
    throw responseError(product, response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`${product} returned an invalid JSON response.`);
  }
  if (!isRecord(payload)) {
    throw new Error(`${product} returned an unexpected response.`);
  }
  return payload;
}

function mapPullRequest(
  payload: JsonRecord,
  diffstat: JsonRecord,
): PullRequestOverview {
  const source = recordAt(payload, 'source');
  const destination = recordAt(payload, 'destination');
  const sourceCommit = stringAt(recordAt(source, 'commit'), 'hash');
  const destinationCommit = stringAt(recordAt(destination, 'commit'), 'hash');
  if (!sourceCommit || !destinationCommit) {
    throw new Error(
      'Bitbucket did not return both pull request commit hashes, so changed files could not be loaded.',
    );
  }

  const rawFiles = Array.isArray(diffstat.values) ? diffstat.values : [];
  const files = rawFiles.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }
    const oldFile = recordAt(entry, 'old');
    const newFile = recordAt(entry, 'new');
    const path = stringAt(newFile, 'path') || stringAt(oldFile, 'path');
    if (!path) {
      return [];
    }
    return [{
      path,
      status: stringAt(entry, 'status', 'changed'),
      linesAdded: numberAt(entry, 'lines_added'),
      linesRemoved: numberAt(entry, 'lines_removed'),
    }];
  });

  const links = recordAt(payload, 'links');
  const htmlLink = safeHttpsUrl(stringAt(recordAt(links, 'html'), 'href'));
  const next = stringAt(diffstat, 'next');

  return {
    id: numberAt(payload, 'id'),
    title: stringAt(payload, 'title', 'Untitled pull request'),
    state: stringAt(payload, 'state', 'Unknown'),
    author: stringAt(recordAt(payload, 'author'), 'display_name', 'Unknown'),
    sourceBranch: stringAt(recordAt(source, 'branch'), 'name', 'Unknown'),
    destinationBranch: stringAt(
      recordAt(destination, 'branch'),
      'name',
      'Unknown',
    ),
    sourceCommit,
    destinationCommit,
    url: htmlLink,
    files,
    filesTruncated: Boolean(next),
  };
}

export async function getPullRequestOverview(
  input: unknown,
): Promise<PullRequestOverview> {
  const { workspace, repository, pullRequestId } =
    validatePullRequestInput(input);
  const pullRequest = await readJsonResponse(
    await api.asUser().requestBitbucket(
      route`/2.0/repositories/${workspace}/${repository}/pullrequests/${pullRequestId}`,
    ),
    'Bitbucket pull request',
  );
  const sourceCommit = stringAt(recordAt(pullRequest, 'source').commit, 'hash');
  const destinationCommit = stringAt(
    recordAt(pullRequest, 'destination').commit,
    'hash',
  );
  if (!/^[a-f0-9]{7,64}$/i.test(sourceCommit) ||
      !/^[a-f0-9]{7,64}$/i.test(destinationCommit)) {
    throw new Error('Bitbucket returned invalid pull request commit hashes.');
  }

  const commitRange = `${sourceCommit}..${destinationCommit}`;
  const diffstat = await readJsonResponse(
    await api.asUser().requestBitbucket(
      route`/2.0/repositories/${workspace}/${repository}/diffstat/${commitRange}?topic=true&pagelen=500`,
    ),
    'Bitbucket changed-file list',
  );
  return mapPullRequest(pullRequest, diffstat);
}
