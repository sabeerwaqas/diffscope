import Resolver from '@forge/resolver';
import { getPullRequestOverview } from './atlassian-api';

const resolver = new Resolver();

resolver.define('getText', () => 'Hello, world!');
resolver.define('getPullRequestOverview', ({ payload }) =>
  getPullRequestOverview(payload),
);

export const handler = resolver.getDefinitions();
