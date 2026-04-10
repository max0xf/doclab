# Weekly Project Updates Report

Use this procedure to generate a periodic update report for the `cyber-wiki` project.

**Inputs:**

- **Start Date**: (Required) Date to start collecting updates from (YYYY-MM-DD). Default: last 7 days.
- **Data Sources**: (Optional) `["git", "teams", "jira"]`.
- **Target Channel**: "stats.acronis.work" (`19:e31799cf4f844845a5b08b0fc3d5b84b@thread.v2`)

**Execution Steps:**

1. **Git Logs**:
    - Run: `git log --since="<START_DATE>" --pretty=format:"%cd|%s|%b" --date=short`
    - Goal: Identify technical changes and Jira keys.

2. **MS Teams Messages**:
    - Tool: `mcp_mcp-ms365_list-chat-messages`
    - Target: Use the *Default Channel ID* above (do not search unless requested).
    - Goal: Find announcements and discussions since Start Date.

3. **Jira Enrichment**:
    - Extract unique Jira keys (e.g., `AIT-XXX`).
    - Fetch details (Summary, Status) for each key (use batch tools if available).
    - Goal: Translate technical commits into user-friendly feature descriptions.

**Output Requirements:**

- **Format**: Markdown, categorized (Features, Fixes, Docs, etc.).
- **Links**: Clickable Jira links: `[KEY-123](https://pmc.acronis.work/browse/KEY-123)`.
- **Style**: Concise (max 240 chars), English B2, Flesch Reading Ease (FRE) 50.
