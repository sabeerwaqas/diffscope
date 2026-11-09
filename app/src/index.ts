import Resolver from '@forge/resolver';
import { getPullRequestOverview } from './atlassian-api';
import {
  deleteRepositoryMapping,
  listRepositoryMappings,
  saveRepositoryMapping,
} from './mapping-storage';

const resolver = new Resolver();

resolver.define('getText', () => 'Hello, world!');
resolver.define('getPullRequestOverview', ({ payload }) =>
  getPullRequestOverview(payload),
);
resolver.define('listRepositoryMappings', ({ payload, context }) => {
  if (typeof payload !== 'object' || payload === null || !('repository' in payload)) {
    throw new TypeError('Repository slug is required.');
  }
  return listRepositoryMappings(payload.repository, context);
});
resolver.define('saveRepositoryMapping', ({ payload, context }) =>
  saveRepositoryMapping(payload, context),
);
resolver.define('deleteRepositoryMapping', ({ payload, context }) =>
  deleteRepositoryMapping(payload, context),
);

export const handler = resolver.getDefinitions();
