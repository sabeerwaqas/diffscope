import kvs from '@forge/kvs';
import type {
  ArtifactProduct,
  PathArtifactMapping,
  RelationshipType,
} from './impact-analysis';
import { validateRepositorySlug } from './api-validation';

type ForgeResolverContext = {
  workspaceId?: string;
  installation?: {
    ari?: {
      installationId?: string;
    };
  };
};

type MappingInput = {
  path: string;
  relationship: RelationshipType;
  artifact: {
    product: ArtifactProduct;
    id: string;
    title: string;
    url: string;
  };
};

const MAX_MAPPINGS_PER_REPOSITORY = 500;
const MAX_STORAGE_BYTES = 200 * 1024;
const MAX_PATH_LENGTH = 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new TypeError(`${field} must be text.`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new TypeError(`${field} must contain between 1 and ${maxLength} characters.`);
  }
  return normalized;
}

function normalizeRepositoryPath(value: unknown): string {
  const path = requireText(value, 'Repository path', MAX_PATH_LENGTH);
  if (
    path.startsWith('/') ||
    path.includes('\\') ||
    path.split('/').some((segment) =>
      segment.length === 0 || segment === '.' || segment === '..',
    )
  ) {
    throw new TypeError('Enter a normalized repository-relative file path.');
  }
  return path;
}

function normalizeArtifact(value: unknown): MappingInput['artifact'] {
  if (!isRecord(value)) {
    throw new TypeError('Artifact details must be an object.');
  }

  const product = value.product;
  if (product !== 'jira' && product !== 'confluence' && product !== 'verification') {
    throw new TypeError('Choose a supported artifact product.');
  }

  const url = requireText(value.url, 'Artifact URL', 2048);
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new TypeError('Artifact URL must be a valid HTTPS URL.');
  }
  if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
    throw new TypeError('Artifact URL must be a valid HTTPS URL.');
  }

  return {
    product,
    id: requireText(value.id, 'Artifact ID', 128),
    title: requireText(value.title, 'Artifact title', 256),
    url: parsedUrl.href,
  };
}

function normalizeMapping(value: unknown): MappingInput {
  if (!isRecord(value)) {
    throw new TypeError('Mapping data must be an object.');
  }
  const relationship = value.relationship;
  if (
    relationship !== 'implements' &&
    relationship !== 'documents' &&
    relationship !== 'verifies'
  ) {
    throw new TypeError('Choose a supported mapping relationship.');
  }

  return {
    path: normalizeRepositoryPath(value.path),
    relationship,
    artifact: normalizeArtifact(value.artifact),
  };
}

function repositoryContext(context: ForgeResolverContext): {
  installationId: string;
  workspaceId: string;
} {
  const installationId = context.installation?.ari?.installationId;
  const workspaceId = context.workspaceId;
  if (!installationId || !workspaceId) {
    throw new Error('DiffScope could not verify the current Forge installation and Bitbucket workspace.');
  }
  return { installationId, workspaceId };
}

function repositoryKey(
  context: ForgeResolverContext,
  repository: unknown,
): { key: string; repositoryId: string } {
  const { installationId, workspaceId } = repositoryContext(context);
  const repositorySlug = validateRepositorySlug(repository);
  return {
    key: `diffscope:${installationId}:${workspaceId}:${repositorySlug}`,
    repositoryId: `${workspaceId}:${repositorySlug}`,
  };
}

function mappingIdentity(mapping: PathArtifactMapping): string {
  return JSON.stringify([
    mapping.path,
    mapping.relationship,
    mapping.artifact.product,
    mapping.artifact.id,
  ]);
}

async function readMappings(key: string): Promise<PathArtifactMapping[]> {
  const value = await kvs.get<unknown>(key);
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error('Stored repository mappings have an invalid format.');
  }
  return value as PathArtifactMapping[];
}

export async function listRepositoryMappings(
  repository: unknown,
  context: ForgeResolverContext,
): Promise<PathArtifactMapping[]> {
  const { key, repositoryId } = repositoryKey(context, repository);
  const mappings = await readMappings(key);
  if (mappings.some((mapping) => mapping.repositoryId !== repositoryId)) {
    throw new Error('Stored mapping repository does not match the current workspace.');
  }
  return mappings.sort((left, right) =>
    mappingIdentity(left).localeCompare(mappingIdentity(right)),
  );
}

export async function saveRepositoryMapping(
  payload: unknown,
  context: ForgeResolverContext,
): Promise<PathArtifactMapping[]> {
  if (!isRecord(payload)) {
    throw new TypeError('Request data must be an object.');
  }
  const { key, repositoryId } = repositoryKey(context, payload.repository);
  const input = normalizeMapping(payload.mapping);
  const mapping: PathArtifactMapping = { ...input, repositoryId };
  const mappings = await readMappings(key);
  if (mappings.some((entry) => entry.repositoryId !== repositoryId)) {
    throw new Error('Stored mapping repository does not match the current workspace.');
  }

  const identity = mappingIdentity(mapping);
  const existingIndex = mappings.findIndex((entry) => mappingIdentity(entry) === identity);
  if (existingIndex >= 0) {
    mappings[existingIndex] = mapping;
  } else {
    if (mappings.length >= MAX_MAPPINGS_PER_REPOSITORY) {
      throw new Error(`A repository can have at most ${MAX_MAPPINGS_PER_REPOSITORY} explicit mappings.`);
    }
    mappings.push(mapping);
  }

  if (JSON.stringify(mappings).length > MAX_STORAGE_BYTES) {
    throw new Error('Repository mappings exceed the safe storage size. Remove unused mappings before adding more.');
  }

  await kvs.set(key, mappings);
  return mappings.sort((left, right) =>
    mappingIdentity(left).localeCompare(mappingIdentity(right)),
  );
}

export async function deleteRepositoryMapping(
  payload: unknown,
  context: ForgeResolverContext,
): Promise<PathArtifactMapping[]> {
  if (!isRecord(payload)) {
    throw new TypeError('Request data must be an object.');
  }
  const { key, repositoryId } = repositoryKey(context, payload.repository);
  const input = normalizeMapping(payload.mapping);
  const target: PathArtifactMapping = { ...input, repositoryId };
  const mappings = await readMappings(key);
  const filtered = mappings.filter((entry) =>
    mappingIdentity(entry) !== mappingIdentity(target),
  );

  if (filtered.length !== mappings.length) {
    await kvs.set(key, filtered);
  }
  return filtered.sort((left, right) =>
    mappingIdentity(left).localeCompare(mappingIdentity(right)),
  );
}
