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
    expect(workflow).toContain('--connect-timeout 10 --max-time 30');
    expect(workflow).toContain('HTTP_STATUS');
  });
});
