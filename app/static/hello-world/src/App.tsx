import { useState, type FormEvent, type ReactNode } from 'react';
import type {
  ConfluenceSearchInput,
  ConfluenceSearchResult,
  JiraIssueInput,
  JiraIssueSummary,
  PullRequestInput,
  PullRequestOverview,
} from '../../../src/api-contracts';
import './index.css';

type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

const demoPullRequest: PullRequestOverview = {
  id: 42,
  title: 'Add account recovery workflow',
  state: 'OPEN',
  author: 'S. Example',
  sourceBranch: 'feature/account-recovery',
  destinationBranch: 'main',
  sourceCommit: 'a1b2c3d4e5f6',
  destinationCommit: '0f9e8d7c6b5a',
  url: 'https://example.com/bitbucket/pull-requests/42',
  files: [
    {
      path: 'src/auth/recovery.ts',
      status: 'modified',
      linesAdded: 28,
      linesRemoved: 4,
    },
    {
      path: 'src/auth/recovery.test.ts',
      status: 'added',
      linesAdded: 61,
      linesRemoved: 0,
    },
    {
      path: 'docs/account-recovery.md',
      status: 'added',
      linesAdded: 16,
      linesRemoved: 0,
    },
  ],
  filesTruncated: false,
};

function isInvokeResponse<T>(
  value: unknown,
): value is { body: T; metadata?: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'body' in value
  );
}

async function invokeResolver<T>(
  resolver: 'getPullRequestOverview',
  payload: object,
): Promise<T> {
  const { invoke } = await import('@forge/bridge');
  const response: unknown = await invoke<T>(resolver, payload);
  if (isInvokeResponse<T>(response)) {
    return response.body;
  }
  return response as T;
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed.';
}

function demoJiraIssue(input: JiraIssueInput): JiraIssueSummary {
  return {
    key: input.issueKey,
    summary: 'Support secure account recovery',
    status: 'In Progress',
    issueType: 'Story',
    updated: '2026-11-07T10:30:00.000Z',
    url: `https://example.com/jira/browse/${encodeURIComponent(input.issueKey)}`,
  };
}

function demoConfluenceResults(input: ConfluenceSearchInput): ConfluenceSearchResult {
  return {
    query: input.query,
    pages: [
      {
        id: 'demo-1',
        title: 'Account recovery requirements',
        type: 'page',
        status: 'current',
        space: 'Product',
        url: 'https://example.com/wiki/account-recovery',
      },
      {
        id: 'demo-2',
        title: 'Identity verification runbook',
        type: 'page',
        status: 'current',
        space: 'Operations',
        url: 'https://example.com/wiki/identity-verification',
      },
    ],
  };
}

function StatusMessage<T>({ state }: { state: RequestState<T> }) {
  if (state.status === 'loading') {
    return <p className="message message--info" role="status">Loading…</p>;
  }
  if (state.status === 'error') {
    return <p className="message message--error" role="alert">{state.message}</p>;
  }
  return null;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="card">
      <div className="card__heading">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function App() {
  const isLocalDemo =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('demo') === '1';
  const [pullRequestInput, setPullRequestInput] = useState<PullRequestInput>({
    workspace: isLocalDemo ? 'example' : '',
    repository: isLocalDemo ? 'diffscope' : '',
    pullRequestId: isLocalDemo ? '42' : '',
  });
  const [jiraInput, setJiraInput] = useState<JiraIssueInput>({
    issueKey: isLocalDemo ? 'PROJ-123' : '',
  });
  const [confluenceInput, setConfluenceInput] = useState<ConfluenceSearchInput>({
    query: isLocalDemo ? 'account recovery' : '',
  });
  const [pullRequestState, setPullRequestState] =
    useState<RequestState<PullRequestOverview>>({ status: 'idle' });
  const [jiraState, setJiraState] =
    useState<RequestState<JiraIssueSummary>>({ status: 'idle' });
  const [confluenceState, setConfluenceState] =
    useState<RequestState<ConfluenceSearchResult>>({ status: 'idle' });

  async function loadPullRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPullRequestState({ status: 'loading' });
    try {
      const data = isLocalDemo
        ? demoPullRequest
        : await invokeResolver<PullRequestOverview>(
            'getPullRequestOverview',
            pullRequestInput,
          );
      setPullRequestState({ status: 'success', data });
    } catch (error) {
      setPullRequestState({ status: 'error', message: messageFromError(error) });
    }
  }

  async function loadJiraIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setJiraState({ status: 'loading' });
    try {
      const data = demoJiraIssue(jiraInput);
      setJiraState({ status: 'success', data });
    } catch (error) {
      setJiraState({ status: 'error', message: messageFromError(error) });
    }
  }

  async function searchConfluence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setConfluenceState({ status: 'loading' });
    try {
      const data = demoConfluenceResults(confluenceInput);
      setConfluenceState({ status: 'success', data });
    } catch (error) {
      setConfluenceState({ status: 'error', message: messageFromError(error) });
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">PULL REQUEST IMPACT</p>
          <h1>DiffScope</h1>
          <p className="page-header__summary">
            Review a Bitbucket pull request and its changed files. Related
            Jira and Confluence panels are preview-only for now.
          </p>
        </div>
        <span className={`connection-badge${isLocalDemo ? ' connection-badge--demo' : ''}`}>
          <span className="connection-badge__dot" aria-hidden="true" />
          {isLocalDemo ? 'Demo data' : 'Bitbucket read-only'}
        </span>
      </header>

      <div className="privacy-note">
        Requests use your Atlassian account permissions. DiffScope does not
        create or change source-system data.
      </div>

      {isLocalDemo && (
        <div className="demo-banner" role="status">
          <strong>Local demo</strong>
          <span>
            Results below are examples. Live Bitbucket reads require an
            installed, authorized Forge app; Jira and Confluence are sample
            panels only in this app.
          </span>
        </div>
      )}

      <div className="workspace-grid">
        <SectionCard
          title="Pull request"
          description="Load a Bitbucket pull request and its changed-file summary."
        >
          <form className="form-stack" onSubmit={loadPullRequest}>
            <div className="form-row">
              <label>
                <span>Workspace slug</span>
                <input
                  autoComplete="off"
                  name="workspace"
                  placeholder="your-workspace"
                  required
                  value={pullRequestInput.workspace}
                  onChange={(event) =>
                    setPullRequestInput({
                      ...pullRequestInput,
                      workspace: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                <span>Repository slug</span>
                <input
                  autoComplete="off"
                  name="repository"
                  placeholder="repository"
                  required
                  value={pullRequestInput.repository}
                  onChange={(event) =>
                    setPullRequestInput({
                      ...pullRequestInput,
                      repository: event.target.value,
                    })
                  }
                />
              </label>
              <label className="form-row__id">
                <span>PR number</span>
                <input
                  autoComplete="off"
                  inputMode="numeric"
                  name="pullRequestId"
                  placeholder="42"
                  required
                  value={pullRequestInput.pullRequestId}
                  onChange={(event) =>
                    setPullRequestInput({
                      ...pullRequestInput,
                      pullRequestId: event.target.value,
                    })
                  }
                />
              </label>
            </div>
            <button
              className="button button--primary"
              disabled={pullRequestState.status === 'loading'}
              type="submit"
            >
              {pullRequestState.status === 'loading' ? 'Loading…' : 'Load pull request'}
            </button>
          </form>

          <StatusMessage state={pullRequestState} />
          {pullRequestState.status === 'success' && (
            <div className="result-panel" aria-live="polite">
              <div className="result-panel__title">
                <div>
                  <p className="eyebrow">PULL REQUEST #{pullRequestState.data.id}</p>
                  <h3>{pullRequestState.data.title}</h3>
                </div>
                <span className="state-pill">{pullRequestState.data.state}</span>
              </div>
              <p className="muted">
                {pullRequestState.data.sourceBranch} <span aria-hidden="true">→</span>{' '}
                {pullRequestState.data.destinationBranch}
                {' · '}by {pullRequestState.data.author}
              </p>
              <div className="file-list-heading">
                <h4>Changed files</h4>
                <span>{pullRequestState.data.files.length}</span>
              </div>
              {pullRequestState.data.files.length > 0 ? (
                <ul className="file-list">
                  {pullRequestState.data.files.map((file) => (
                    <li key={`${file.path}:${file.status}`}>
                      <div>
                        <code>{file.path}</code>
                        <span className="file-status">{file.status}</span>
                      </div>
                      <span className="file-counts">
                        <span className="added">+{file.linesAdded}</span>
                        <span className="removed">−{file.linesRemoved}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No changed files were returned.</p>
              )}
              {pullRequestState.data.filesTruncated && (
                <p className="message message--warning">
                  The API returned another page of changed files. Showing the
                  first page only.
                </p>
              )}
              {pullRequestState.data.url && (
                <a
                  className="text-link"
                  href={pullRequestState.data.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open pull request <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          )}
        </SectionCard>

        <div className="reference-column">
          <SectionCard
            title="Jira issue"
            description={
              isLocalDemo
                ? 'Preview an issue lookup with sample data.'
                : 'Live Jira access is not available from this Bitbucket app.'
            }
          >
            {isLocalDemo ? (
              <>
                <form className="form-inline" onSubmit={loadJiraIssue}>
                  <label className="grow">
                    <span>Issue key</span>
                    <input
                      autoComplete="off"
                      name="issueKey"
                      placeholder="PROJ-123"
                      required
                      value={jiraInput.issueKey}
                      onChange={(event) =>
                        setJiraInput({ issueKey: event.target.value.toUpperCase() })
                      }
                    />
                  </label>
                  <button
                    className="button button--secondary"
                    disabled={jiraState.status === 'loading'}
                    type="submit"
                  >
                    {jiraState.status === 'loading' ? 'Loading…' : 'Look up'}
                  </button>
                </form>
                <StatusMessage state={jiraState} />
                {jiraState.status === 'success' && (
                  <article className="artifact-card" aria-live="polite">
                    <div className="artifact-card__meta">
                      <span className="artifact-key">{jiraState.data.key}</span>
                      <span className="state-pill">{jiraState.data.status}</span>
                    </div>
                    <h3>{jiraState.data.summary}</h3>
                    <p className="muted">
                      {jiraState.data.issueType}
                      {jiraState.data.updated &&
                        ` · Updated ${new Date(jiraState.data.updated).toLocaleDateString()}`}
                    </p>
                    {jiraState.data.url && (
                      <a
                        className="text-link"
                        href={jiraState.data.url}
                        rel="noreferrer"
                        target="_blank"
                      >
                        Open issue <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </article>
                )}
              </>
            ) : (
              <IntegrationNotice />
            )}
          </SectionCard>

          <SectionCard
            title="Confluence pages"
            description={
              isLocalDemo
                ? 'Preview a page search with sample data.'
                : 'Live Confluence access is not available from this Bitbucket app.'
            }
          >
            {isLocalDemo ? (
              <>
                <form className="form-inline" onSubmit={searchConfluence}>
                  <label className="grow">
                    <span>Search terms</span>
                    <input
                      autoComplete="off"
                      name="query"
                      placeholder="e.g. account recovery"
                      required
                      value={confluenceInput.query}
                      onChange={(event) =>
                        setConfluenceInput({ query: event.target.value })
                      }
                    />
                  </label>
                  <button
                    className="button button--secondary"
                    disabled={confluenceState.status === 'loading'}
                    type="submit"
                  >
                    {confluenceState.status === 'loading' ? 'Searching…' : 'Search'}
                  </button>
                </form>
                <StatusMessage state={confluenceState} />
                {confluenceState.status === 'success' &&
                  (confluenceState.data.pages.length > 0 ? (
                    <ul className="page-results" aria-live="polite">
                      {confluenceState.data.pages.map((page) => (
                        <li key={page.id}>
                          <div>
                            <p className="artifact-key">{page.space}</p>
                            <h3>{page.title}</h3>
                            <p className="muted">
                              {page.type} · {page.status}
                            </p>
                          </div>
                          <a
                            aria-label={`Open ${page.title}`}
                            className="open-link"
                            href={page.url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            ↗
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="empty-state" aria-live="polite">
                      No pages matched “{confluenceState.data.query}”.
                    </p>
                  ))}
              </>
            ) : (
              <IntegrationNotice />
            )}
          </SectionCard>
        </div>
      </div>

      <footer className="page-footer">
        Live Bitbucket results reflect your Atlassian permissions. Jira and
        Confluence are not connected: Forge does not allow their site scopes in
        this app alongside Bitbucket workspace scopes.
      </footer>
    </main>
  );
}

function IntegrationNotice() {
  return (
    <p className="message message--warning" role="status">
      This app uses Bitbucket workspace permissions. Forge does not allow Jira
      or Confluence site scopes in the same app manifest. Live cross-product
      access needs a separate architecture decision; no Jira or Confluence
      requests are sent.
    </p>
  );
}

export default App;
