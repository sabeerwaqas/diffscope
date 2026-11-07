import { describe, expect, it } from 'vitest';
import {
  analyzeMappedImpact,
  type PathArtifactMapping,
} from '../../../src/impact-analysis';

const mappings: PathArtifactMapping[] = [
  {
    repositoryId: 'repo-1',
    path: 'src/api.ts',
    relationship: 'implements',
    artifact: {
      product: 'jira',
      id: 'PROJ-12',
      title: 'Update API contract',
      url: 'https://example.atlassian.net/browse/PROJ-12',
    },
  },
  {
    repositoryId: 'repo-1',
    path: 'src/api.ts',
    relationship: 'verifies',
    artifact: {
      product: 'verification',
      id: 'test-api',
      title: 'API contract tests',
      url: 'https://example.test/api',
    },
  },
  {
    repositoryId: 'repo-2',
    path: 'src/api.ts',
    relationship: 'implements',
    artifact: {
      product: 'jira',
      id: 'OTHER-1',
      title: 'Unrelated repository mapping',
      url: 'https://example.atlassian.net/browse/OTHER-1',
    },
  },
];

describe('analyzeMappedImpact', () => {
  it('returns explicitly mapped artifacts and the paths supporting each finding', () => {
    const result = analyzeMappedImpact(
      'repo-1',
      ['src/api.ts', 'src/api.ts'],
      mappings,
    );

    expect(result).toEqual({
      findings: [
        {
          artifact: mappings[0].artifact,
          relationship: 'implements',
          changedPaths: ['src/api.ts'],
          confidence: 'explicit-mapping',
        },
        {
          artifact: mappings[1].artifact,
          relationship: 'verifies',
          changedPaths: ['src/api.ts'],
          confidence: 'explicit-mapping',
        },
      ],
      unmappedPaths: [],
    });
  });

  it('aggregates evidence paths and sorts results deterministically', () => {
    const result = analyzeMappedImpact(
      'repo-1',
      ['src/z.ts', 'src/api.ts'],
      [
        ...mappings,
        { ...mappings[0], path: 'src/z.ts' },
      ],
    );

    expect(result.findings[0].changedPaths).toEqual(['src/api.ts', 'src/z.ts']);
    expect(result.findings.map((finding) => finding.artifact.id)).toEqual([
      'PROJ-12',
      'test-api',
    ]);
  });

  it('keeps unmatched changed paths explicit instead of inferring relationships', () => {
    const result = analyzeMappedImpact('repo-1', ['docs/unknown.md'], mappings);

    expect(result).toEqual({ findings: [], unmappedPaths: ['docs/unknown.md'] });
  });

  it('rejects absolute, traversal, and non-normalized paths', () => {
    expect(() => analyzeMappedImpact('repo-1', ['/etc/passwd'], mappings)).toThrow(
      TypeError,
    );
    expect(() => analyzeMappedImpact('repo-1', ['src/../secret.ts'], mappings)).toThrow(
      TypeError,
    );
    expect(() =>
      analyzeMappedImpact('repo-1', ['src\\api.ts'], mappings),
    ).toThrow(TypeError);
  });

  it('rejects conflicting details for one mapped artifact', () => {
    expect(() =>
      analyzeMappedImpact('repo-1', ['src/api.ts'], [
        ...mappings,
        {
          ...mappings[0],
          artifact: { ...mappings[0].artifact, title: 'Conflicting title' },
        },
      ]),
    ).toThrow(/Conflicting artifact details/);
  });
});
