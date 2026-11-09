import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock('@forge/kvs', () => ({
  default: {
    get: mocks.get,
    set: mocks.set,
  },
}));

import {
  deleteRepositoryMapping,
  listRepositoryMappings,
  saveRepositoryMapping,
} from '../../../src/mapping-storage';

const context = {
  workspaceId: 'workspace-uuid',
  installation: { ari: { installationId: 'installation-uuid' } },
};

const mapping = {
  path: 'src/billing/checkout.ts',
  relationship: 'implements' as const,
  artifact: {
    product: 'jira' as const,
    id: 'PAY-42',
    title: 'Support checkout',
    url: 'https://example.atlassian.net/browse/PAY-42',
  },
};

beforeEach(() => {
  mocks.get.mockReset();
  mocks.set.mockReset().mockResolvedValue(undefined);
});

describe('repository mapping storage', () => {
  it('stores mappings under keys scoped to the Forge installation and workspace', async () => {
    mocks.get.mockResolvedValue([]);

    const result = await saveRepositoryMapping(
      { repository: 'payments', mapping },
      context,
    );

    expect(result).toEqual([{
      ...mapping,
      repositoryId: 'workspace-uuid:payments',
    }]);
    expect(mocks.get).toHaveBeenCalledWith(
      'diffscope:installation-uuid:workspace-uuid:payments',
    );
    expect(mocks.set).toHaveBeenCalledWith(
      'diffscope:installation-uuid:workspace-uuid:payments',
      result,
    );
  });

  it('updates an existing mapping rather than creating a duplicate', async () => {
    const existing = { ...mapping, repositoryId: 'workspace-uuid:payments' };
    mocks.get.mockResolvedValue([existing]);

    const updated = {
      ...mapping,
      artifact: { ...mapping.artifact, title: 'Checkout workflow' },
    };
    const result = await saveRepositoryMapping(
      { repository: 'payments', mapping: updated },
      context,
    );

    expect(result).toHaveLength(1);
    expect(result[0].artifact.title).toBe('Checkout workflow');
  });

  it('lists and deletes mappings for the requested repository', async () => {
    const existing = { ...mapping, repositoryId: 'workspace-uuid:payments' };
    mocks.get.mockResolvedValue([existing]);

    expect(await listRepositoryMappings('payments', context)).toEqual([existing]);
    expect(await deleteRepositoryMapping(
      { repository: 'payments', mapping },
      context,
    )).toEqual([]);
    expect(mocks.set).toHaveBeenCalledWith(
      'diffscope:installation-uuid:workspace-uuid:payments',
      [],
    );
  });

  it('rejects unsafe paths and non-HTTPS artifact URLs', async () => {
    mocks.get.mockResolvedValue([]);

    await expect(saveRepositoryMapping({
      repository: 'payments',
      mapping: { ...mapping, path: '../secrets.env' },
    }, context)).rejects.toThrow('normalized repository-relative');

    await expect(saveRepositoryMapping({
      repository: 'payments',
      mapping: {
        ...mapping,
        artifact: { ...mapping.artifact, url: 'http://example.com/item' },
      },
    }, context)).rejects.toThrow('valid HTTPS URL');

    expect(mocks.set).not.toHaveBeenCalled();
  });

  it('fails closed when trusted Forge context is missing', async () => {
    await expect(listRepositoryMappings('payments', {})).rejects.toThrow(
      'could not verify the current Forge installation',
    );
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it('rejects invalid repository slugs', async () => {
    await expect(listRepositoryMappings('../other', context)).rejects.toThrow(
      'valid Bitbucket repository slug',
    );
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
