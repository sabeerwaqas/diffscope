export type ArtifactProduct = 'jira' | 'confluence' | 'verification';

export type RelationshipType = 'implements' | 'documents' | 'verifies';

export type ArtifactReference = {
  product: ArtifactProduct;
  id: string;
  title: string;
  url: string;
};

export type PathArtifactMapping = {
  repositoryId: string;
  path: string;
  relationship: RelationshipType;
  artifact: ArtifactReference;
};

export type ImpactFinding = {
  artifact: ArtifactReference;
  relationship: RelationshipType;
  changedPaths: string[];
  confidence: 'explicit-mapping';
};

export type ImpactAnalysis = {
  findings: ImpactFinding[];
  unmappedPaths: string[];
};

function assertRepositoryPath(path: string): string {
  if (
    path.length === 0 ||
    path.startsWith('/') ||
    path.includes('\\') ||
    path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new TypeError(`Expected a normalized repository-relative path: "${path}"`);
  }

  return path;
}

export function analyzeMappedImpact(
  repositoryId: string,
  changedPaths: string[],
  mappings: PathArtifactMapping[],
): ImpactAnalysis {
  const paths = [...new Set(changedPaths.map(assertRepositoryPath))].sort();
  const mappingsByPath = new Map<string, PathArtifactMapping[]>();

  for (const mapping of mappings) {
    if (mapping.repositoryId !== repositoryId) {
      continue;
    }

    const path = assertRepositoryPath(mapping.path);
    const pathMappings = mappingsByPath.get(path) ?? [];
    pathMappings.push(mapping);
    mappingsByPath.set(path, pathMappings);
  }

  const findingsByKey = new Map<string, ImpactFinding>();
  const unmappedPaths: string[] = [];

  for (const path of paths) {
    const pathMappings = mappingsByPath.get(path);

    if (!pathMappings?.length) {
      unmappedPaths.push(path);
      continue;
    }

    for (const mapping of pathMappings) {
      const key = JSON.stringify([
        mapping.relationship,
        mapping.artifact.product,
        mapping.artifact.id,
      ]);
      const existing = findingsByKey.get(key);

      if (existing) {
        if (
          existing.artifact.title !== mapping.artifact.title ||
          existing.artifact.url !== mapping.artifact.url
        ) {
          throw new TypeError(
            `Conflicting artifact details for "${mapping.artifact.product}:${mapping.artifact.id}"`,
          );
        }
        existing.changedPaths.push(path);
      } else {
        findingsByKey.set(key, {
          artifact: mapping.artifact,
          relationship: mapping.relationship,
          changedPaths: [path],
          confidence: 'explicit-mapping',
        });
      }
    }
  }

  const findings = [...findingsByKey.values()].sort((left, right) => {
    const leftKey = `${left.artifact.product}:${left.artifact.id}:${left.relationship}`;
    const rightKey = `${right.artifact.product}:${right.artifact.id}:${right.relationship}`;
    return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
  });

  return { findings, unmappedPaths };
}

/**
 * Returns the percentage of distinct changed paths covered by at least one
 * explicit mapping. Returns null when there are no changed paths.
 */
export function calculateMappingCoverage(
  changedPaths: string[],
  unmappedPaths: string[],
): number | null {
  const uniqueChangedPaths = new Set(changedPaths);
  if (uniqueChangedPaths.size === 0) {
    return null;
  }

  const uniqueUnmappedPaths = new Set(unmappedPaths);
  let mappedCount = 0;
  for (const path of uniqueChangedPaths) {
    if (!uniqueUnmappedPaths.has(path)) {
      mappedCount += 1;
    }
  }

  return Math.round((mappedCount / uniqueChangedPaths.size) * 100);
}
