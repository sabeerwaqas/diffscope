import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

const { mockInvoke } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
}));

vi.mock('@forge/bridge', () => ({
  invoke: mockInvoke,
}));

afterEach(cleanup);

beforeEach(() => {
  mockInvoke.mockReset();
  window.history.replaceState({}, '', '/');
});

describe('DiffScope UI', () => {
  it('uses clearly labeled local sample data without calling Forge', async () => {
    window.history.replaceState({}, '', '/?demo=1');

    render(<App />);

    expect(screen.getByText('Local demo')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Load pull request' }));

    expect(await screen.findByText('Add account recovery workflow')).toBeTruthy();
    expect(screen.getByText('src/auth/recovery.ts')).toBeTruthy();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('invokes the Bitbucket resolver and renders pull request files', async () => {
    mockInvoke.mockResolvedValue({
      body: {
        id: 21,
        title: 'Update API contract',
        state: 'OPEN',
        author: 'A. Developer',
        sourceBranch: 'feature/api',
        destinationBranch: 'main',
        sourceCommit: 'abc123456789',
        destinationCommit: 'def123456789',
        url: 'https://bitbucket.org/team/repo/pull-requests/21',
        files: [
          {
            path: 'src/api.ts',
            status: 'modified',
            linesAdded: 4,
            linesRemoved: 2,
          },
        ],
        filesTruncated: false,
      },
    });

    render(<App />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Workspace slug' }), {
      target: { value: 'team' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Repository slug' }), {
      target: { value: 'repo' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'PR number' }), {
      target: { value: '21' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Load pull request' }));

    expect(await screen.findByText('Update API contract')).toBeTruthy();
    expect(screen.getByText('src/api.ts')).toBeTruthy();
    expect(mockInvoke).toHaveBeenCalledWith('getPullRequestOverview', {
      workspace: 'team',
      repository: 'repo',
      pullRequestId: '21',
    });
  });

  it('keeps Jira and Confluence examples explicitly in local demo mode', async () => {
    window.history.replaceState({}, '', '/?demo=1');

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Look up' }));
    expect(await screen.findByText('Support secure account recovery')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(await screen.findByText('Account recovery requirements')).toBeTruthy();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('explains why Jira and Confluence live calls are unavailable', () => {
    render(<App />);
    const notices = screen.getAllByRole('status');
    expect(notices.length).toBe(2);
    expect(notices[0].textContent).toContain(
      'Forge does not allow Jira or Confluence site scopes',
    );
    expect(notices[1].textContent).toContain(
      'no Jira or Confluence requests are sent',
    );
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
