export type PullRequestInput = {
  workspace: string;
  repository: string;
  pullRequestId: string;
};

export type PullRequestFile = {
  path: string;
  status: string;
  linesAdded: number;
  linesRemoved: number;
};

export type PullRequestOverview = {
  id: number;
  title: string;
  state: string;
  author: string;
  sourceBranch: string;
  destinationBranch: string;
  sourceCommit: string;
  destinationCommit: string;
  url: string;
  files: PullRequestFile[];
  filesTruncated: boolean;
};

export type JiraIssueInput = {
  issueKey: string;
};

export type JiraIssueSummary = {
  key: string;
  summary: string;
  status: string;
  issueType: string;
  updated: string;
  url: string;
};

export type ConfluenceSearchInput = {
  query: string;
};

export type ConfluencePageSummary = {
  id: string;
  title: string;
  type: string;
  status: string;
  space: string;
  url: string;
};

export type ConfluenceSearchResult = {
  query: string;
  pages: ConfluencePageSummary[];
};
