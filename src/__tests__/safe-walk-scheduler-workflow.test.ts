import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync(
  new URL('../../.github/workflows/safe-walk-scheduler.yml', import.meta.url),
  'utf8'
);

describe('Safe Walk scheduler workflow', () => {
  it('reads the URL and cron secret through the GitHub Actions environment', () => {
    expect(workflow).toContain('RAW_PROJECT_URL: ${{ secrets.VERCEL_PROJECT_URL || vars.VERCEL_PROJECT_URL }}');
    expect(workflow).toContain('CRON_SECRET: ${{ secrets.CRON_SECRET }}');
    expect(workflow).toContain('echo "::add-mask::$CRON_SECRET"');
    expect(workflow).toMatch(/Authorization:.*\$(?:\{CRON_SECRET\}|CRON_SECRET)/);
  });

  it('validates and normalizes the configured target before requesting endpoints', () => {
    expect(workflow).toContain('url.protocol !== "https:"');
    expect(workflow).toContain('url.pathname !== "/"');
    expect(workflow).toContain('VERCEL_PROJECT_URL must be an HTTPS origin');
    expect(workflow).toContain('printf \'TARGET_URL=%s\\n\' "$TARGET_URL" >> "$GITHUB_ENV"');
  });

  it('runs on a 2-minute schedule and supports manual workflow_dispatch with dry_run option', () => {
    expect(workflow).toContain("- cron: '*/2 * * * *'");
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('dry_run:');
    expect(workflow).toContain("if: env.IS_DRY_RUN != 'true'");
  });

  it('honestly reports failure when CRON_SECRET is missing instead of pretending success', () => {
    expect(workflow).toContain('if [ -z "$CRON_SECRET" ]; then');
    expect(workflow).toContain('CRON_SECRET is not configured in GitHub Repository Secrets');
    expect(workflow).toContain('exit 1');
  });

  it('uses the expected POST endpoints and bounds request time', () => {
    expect(workflow).toContain('/api/cron/safe-walk-timeout');
    expect(workflow).toContain('/api/cron/escalate');
    expect(workflow).toContain('-X POST');
    expect(workflow).toContain('--connect-timeout 10');
    expect(workflow).toContain('--max-time 30');
    expect(workflow).toContain('HTTP_STATUS');
  });

  it('enforces non-overlapping execution and protects active life-safety tasks', () => {
    expect(workflow).toContain('group: safe-walk-escalation-scheduler');
    expect(workflow).toContain('cancel-in-progress: false');
  });

  it('provides a dedicated dry-run notice step and avoids calling endpoints during dry-run', () => {
    expect(workflow).toContain("if: env.IS_DRY_RUN == 'true'");
    expect(workflow).toContain('CONFIGURATION-ONLY DRY RUN');
    expect(workflow).toContain('Configuration validated. Live endpoints were skipped because dry_run was requested.');
  });

  it('enforces strict shell error handling, curl exit code capture, and response contract validation', () => {
    expect(workflow).toContain('set -Eeuo pipefail');
    expect(workflow).toContain('CURL_EXIT');
    expect(workflow).toContain('does not satisfy the required success contract');
  });

  it('enforces production execution guard to prevent accidental production calls during remediation', () => {
    expect(workflow).toContain('ENABLE_PRODUCTION_CRON');
    expect(workflow).toContain('Production Cron Guard Active');
  });
});
