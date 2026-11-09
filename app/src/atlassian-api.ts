import api, { route, type Response as ForgeResponse } from '@forge/api';
import type {
  PullRequestOverview,
  PullRequestFile,
} from './api-contracts';
import { validatePullRequestInput } from './api-validation';

type JsonRecord = Record<string, unknown>;

const MAX_DIFFSTAT_PAGES = 100;
const BITBUCKET_API_ORIGIN = 'https://api.bitbucket.org';

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

function validateDiffstatNextUrl(
  value: string,
  workspace: string,
  repository: string,
  commitRange: string,
): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('Bitbucket returned an invalid changed-file pagination URL.');
  }

  const expectedPath =
    `/2.0/repositories/${workspace}/${repository}/diffstat/${commitRange}`;

  if (
    url.origin !== BITBUCKET_API_ORIGIN ||
    url.username ||
    url.password ||
    url.pathname !== expectedPath
  ) {
    throw new Error('Bitbucket returned an unexpected changed-file pagination URL.');
  }

  return url;
}

async function getRepositoryUuid(
  workspaceId: string,
  repositorySlug: string,
): Promise<string> {
  const query = new URLSearchParams({
    q: `slug="${repositorySlug}"`,
    pagelen: '1',
  });
  const payload = await readJsonResponse(
    await api.asUser().requestBitbucket(
      route`/2.0/repositories/${workspaceId}?${query}`,
    ),
    'Bitbucket repository lookup',
  );
  const values = Array.isArray(payload.values) ? payload.values : [];
  const repository = values.find(
    (entry) => isRecord(entry) && stringAt(entry, 'slug') === repositorySlug,
  );
  const uuid = stringAt(repository, 'uuid');
  if (!/^\{?[a-f0-9-]{36}\}?$/i.test(uuid)) {
    throw new Error('Bitbucket did not return a valid repository ID for the selected repository.');
  }
  return uuid;
}

function mapDiffstatFiles(payload: JsonRecord): PullRequestFile[] {
  if (!Array.isArray(payload.values)) {
    throw new Error('Bitbucket returned an unexpected changed-file page.');
  }

  return payload.values.flatMap((entry) => {
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
}

async function readAllDiffstatPages(
  firstPage: JsonRecord,
  workspace: string,
  repository: string,
  commitRange: string,
  workspaceId: string,
  repositoryId: string,
): Promise<{ files: PullRequestFile[]; filesTruncated: boolean }> {
  const filesByPath = new Map<string, PullRequestFile>();
  const visitedUrls = new Set<string>();
  let page = firstPage;
  let pageCount = 0;

  while (true) {
    pageCount += 1;
    for (const file of mapDiffstatFiles(page)) {
      filesByPath.set(file.path, file);
    }

    const next = stringAt(page, 'next');
    if (!next) {
      return { files: [...filesByPath.values()], filesTruncated: false };
    }

    if (pageCount >= MAX_DIFFSTAT_PAGES) {
      return { files: [...filesByPath.values()], filesTruncated: true };
    }

    const nextUrl = validateDiffstatNextUrl(
      next,
      workspace,
      repository,
      commitRange,
    );
    if (visitedUrls.has(nextUrl.href)) {
      throw new Error('Bitbucket returned a repeated changed-file pagination URL.');
    }
    visitedUrls.add(nextUrl.href);

    // Bitbucket's pagination links use workspace/repository slugs. Forge's
    // Bitbucket proxy expects IDs, so validate the returned link and rebuild
    // the same query against the trusted workspace and repository IDs.
    const query = new URLSearchParams(nextUrl.searchParams);
    const nextResponse = await api.asUser().requestBitbucket(
      route`/2.0/repositories/${workspaceId}/${repositoryId}/diffstat/${commitRange}?${query}`,
    );
    page = await readJsonResponse(nextResponse, 'Bitbucket changed-file list');
  }
}

function mapPullRequest(
  payload: JsonRecord,
  files: PullRequestFile[],
  filesTruncated: boolean,
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

  const links = recordAt(payload, 'links');
  const htmlLink = safeHttpsUrl(stringAt(recordAt(links, 'html'), 'href'));

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
    filesTruncated,
  };
}

type BitbucketResolverContext = {
  workspaceId?: string;
};

export async function getPullRequestOverview(
  input: unknown,
  context: BitbucketResolverContext,
): Promise<PullRequestOverview> {
  const { workspace, repository, pullRequestId } =
    validatePullRequestInput(input);
  const workspaceId = context.workspaceId;
  if (!workspaceId) {
    throw new Error('DiffScope could not identify the Bitbucket workspace from Forge context.');
  }
  const repositoryId = await getRepositoryUuid(workspaceId, repository);
  const pullRequest = await readJsonResponse(
    await api.asUser().requestBitbucket(
      route`/2.0/repositories/${workspaceId}/${repositoryId}/pullrequests/${pullRequestId}`,
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
  const firstDiffstatPage = await readJsonResponse(
    await api.asUser().requestBitbucket(
      route`/2.0/repositories/${workspaceId}/${repositoryId}/diffstat/${commitRange}?topic=true&pagelen=500`,
    ),
    'Bitbucket changed-file list',
  );
  const { files, filesTruncated } = await readAllDiffstatPages(
    firstDiffstatPage,
    workspace,
    repository,
    commitRange,
    workspaceId,
    repositoryId,
  );

  return mapPullRequest(pullRequest, files, filesTruncated);
}
