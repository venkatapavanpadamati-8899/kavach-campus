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

  it('keeps manual dispatch non-invasive and reserves live requests for the schedule', () => {
    expect(workflow).toContain("if: github.event_name == 'workflow_dispatch'");
    expect(workflow).toContain('configuration-only dry run');
    expect(workflow.match(/if: github\.event_name == 'schedule'/g)).toHaveLength(2);
  });

  it('uses the expected POST endpoints and bounds request time', () => {
    expect(workflow).toContain('/api/cron/safe-walk-timeout');
    expect(workflow).toContain('/api/cron/escalate');
    expect(workflow).toContain('-X POST');
    expect(workflow).toContain('--connect-timeout 10 --max-time 30');
    expect(workflow).toContain('HTTP_STATUS');
  });
});
