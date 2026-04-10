# ClickHouse Query Skill

Execute queries against ClickHouse databases (staging and production) for debugging and data exploration.

## Usage

Invoke this skill when you need to:

- Query ClickHouse databases directly
- Explore data in staging or production environments
- Debug data issues or verify data integrity
- Test queries before implementing them in code

## Instructions

### 1. Determine Environment

Ask the user which environment to query:

- **Staging**: `10.35.62.55` (no authentication required)
- **Production**: `stats.corp.acronis.com` (requires authentication)

### 2. Get Credentials (if needed)

**For Production Environment:**
Ask the user for credentials:

- Username
- Password

Set environment variables:

```bash
export CLICKHOUSE_USER=<username>
export CLICKHOUSE_PASSWORD=<password>
```

### 3. ClickHouse Connection Details

**Staging Environment:**

- Host: `10.35.62.55`
- Port: `8123`
- Protocol: HTTP
- Authentication: None required

**Production Environment:**

- Host: `stats.corp.acronis.com`
- Port: `8123`
- Protocol: HTTP
- Authentication: Required (ask user for credentials)

### 4. Query Execution

**Staging (no authentication):**

```bash
curl -s http://10.35.62.55:8123/ \
  --data-binary "SELECT * FROM metrics.commits_with_jira_flat LIMIT 5 FORMAT JSONCompact"
```

**Production (with authentication):**

```bash
curl -s http://stats.corp.acronis.com:8123/ \
  --data "SELECT * FROM metrics.commits_with_jira_flat LIMIT 5 FORMAT JSONCompact" \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"
```

**Common Query Patterns:**

#### List Databases

**Staging:**

```bash
curl -s http://10.35.62.55:8123/ \
  --data-binary "SHOW DATABASES FORMAT JSONCompact"
```

**Production:**

```bash
curl -s http://stats.corp.acronis.com:8123/ \
  --data "SHOW DATABASES FORMAT JSONCompact" \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"
```

#### List Tables in a Database

**Staging:**

```bash
curl -s http://10.35.62.55:8123/ \
  --data-binary "SHOW TABLES FROM metrics FORMAT JSONCompact"
```

**Production:**

```bash
curl -s http://stats.corp.acronis.com:8123/ \
  --data "SHOW TABLES FROM metrics FORMAT JSONCompact" \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"
```

#### Describe Table Schema

**Staging:**

```bash
curl -s http://10.35.62.55:8123/ \
  --data-binary "DESCRIBE TABLE metrics.commits_with_jira_flat FORMAT JSONCompact"
```

**Production:**

```bash
curl -s http://stats.corp.acronis.com:8123/ \
  --data "DESCRIBE TABLE metrics.commits_with_jira_flat" \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"
```

#### Query with Parameters

**Staging:**

```bash
curl -s http://10.35.62.55:8123/ \
  --data-binary "SELECT * FROM metrics.copilot_metrics_by_model WHERE date >= '2024-01-01' LIMIT 10 FORMAT JSONCompact"
```

**Production:**

```bash
curl -s http://stats.corp.acronis.com:8123/ \
  --data "SELECT * FROM metrics.copilot_metrics_by_model WHERE date >= '2024-01-01' LIMIT 10 FORMAT JSONCompact" \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"
```

### 5. Output Formats

ClickHouse supports various output formats. Common ones:

- `FORMAT JSONCompact` - Compact JSON (recommended for readability)
- `FORMAT JSON` - Full JSON with metadata
- `FORMAT TabSeparated` - Tab-separated values
- `FORMAT Pretty` - Human-readable table format
- `FORMAT CSV` - CSV format

### 6. Common Tables

**Metrics Database (`metrics.`):**

- `commits_with_jira_flat` - Commit data with JIRA information
- `panopticum_people` - User/employee data from Panopticum
- `author_aliases` - Author alias mappings
- `user_email_lookup` - Email to user mappings
- `copilot_metrics_by_language` - Copilot usage by programming language
- `copilot_metrics_by_feature` - Copilot usage by feature
- `copilot_metrics_by_ide` - Copilot usage by IDE
- `copilot_metrics_by_model` - Copilot usage by AI model
- `windsurf_cascade_metrics` - Windsurf/Cascade usage metrics

### 7. Best Practices

1. **Always use LIMIT** when exploring data to avoid overwhelming output
2. **Use FINAL** for ReplacingMergeTree tables to get deduplicated results:

   ```sql
   SELECT * FROM metrics.copilot_metrics_by_model FINAL LIMIT 10
   ```

3. **Check table schema first** before querying to understand available columns
4. **Use appropriate date filters** to limit data volume
5. **Format output** appropriately for the use case (JSONCompact for parsing, Pretty for viewing)

### 8. Example Workflow

**Staging Environment:**

```bash
# 1. List available tables
curl -s http://10.35.62.55:8123/ \
  --data-binary "SHOW TABLES FROM metrics FORMAT Pretty"

# 2. Describe table structure
curl -s http://10.35.62.55:8123/ \
  --data-binary "DESCRIBE TABLE metrics.copilot_metrics_by_model FORMAT Pretty"

# 3. Query data with filters
curl -s http://10.35.62.55:8123/ \
  --data-binary "
    SELECT 
      acronis_user,
      model,
      sum(code_generation_activity_count) as total_activity
    FROM metrics.copilot_metrics_by_model FINAL
    WHERE date >= today() - 30
      AND model != ''
    GROUP BY acronis_user, model
    ORDER BY total_activity DESC
    LIMIT 20
    FORMAT Pretty
  "
```

**Production Environment:**

```bash
# 1. List available tables
curl -s http://stats.corp.acronis.com:8123/ \
  --data "SHOW TABLES FROM metrics FORMAT Pretty" \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"

# 2. Describe table structure
curl -s http://stats.corp.acronis.com:8123/ \
  --data "DESCRIBE TABLE metrics.copilot_metrics_by_model FORMAT Pretty" \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"

# 3. Query data with filters
curl -s http://stats.corp.acronis.com:8123/ \
  --data "
    SELECT 
      acronis_user,
      model,
      sum(code_generation_activity_count) as total_activity
    FROM metrics.copilot_metrics_by_model FINAL
    WHERE date >= today() - 30
      AND model != ''
    GROUP BY acronis_user, model
    ORDER BY total_activity DESC
    LIMIT 20
    FORMAT Pretty
  " \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"
```

### 9. Real-World Investigation Examples

#### Case Study: Email Case-Sensitivity Issue (Sergey Volkov)

**Problem**: Commits by Sergey Volkov with email `Sergey.Volkov@acronis.com` (capitalized) were not showing up on the Users page.

**Investigation Queries:**

1. **Check for author aliases:**

```bash
curl -s http://stats.corp.acronis.com:8123/ \
  --data "SELECT * FROM metrics.author_aliases 
         WHERE lower(alias_value) LIKE '%sergey%volkov%' 
            OR lower(canonical_username) LIKE '%sergey%volkov%' 
         FORMAT Pretty" \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"
```

1. **Check user_email_lookup table:**

```bash
curl -s http://stats.corp.acronis.com:8123/ \
  --data "SELECT * FROM metrics.user_email_lookup 
         WHERE lower(lookup_email) LIKE '%sergey%volkov%' 
            OR lower(canonical_username) LIKE '%sergey%volkov%' 
         FORMAT Pretty" \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"
```

1. **Check Panopticum data:**

```bash
curl -s http://stats.corp.acronis.com:8123/ \
  --data "SELECT user_username, user_email 
         FROM metrics.panopticum_people 
         WHERE lower(user_email) LIKE '%sergey%volkov%' 
            OR lower(user_username) LIKE '%sergey%volkov%' 
         FORMAT Pretty" \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"
```

1. **Check commit count by email:**

```bash
curl -s http://stats.corp.acronis.com:8123/ \
  --data "SELECT author_email, count() as commit_count 
         FROM metrics.bitbucket_commits 
         WHERE lower(author_email) LIKE '%sergey%volkov%' 
         GROUP BY author_email 
         FORMAT Pretty" \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"
```

1. **Verify materialized view join logic:**

```bash
curl -s http://stats.corp.acronis.com:8123/ \
  --data "SHOW CREATE TABLE metrics.commits_with_jira_flat FORMAT Pretty" \
  --user "$CLICKHOUSE_USER:$CLICKHOUSE_PASSWORD"
```

**Root Cause Found**:

- Panopticum had `user_email: "Sergey.Volkov@acronis.com"` (capitalized)
- Frontend was storing user email with original casing instead of lowercase
- Commits had mixed case emails but were being lowercased for comparison
- Mismatch prevented proper attribution

**Solution**: Modified `fetchUsers()` in `dataAdapters.ts` to use `emailLower` instead of `person.user_email`

**Key Tables Used**:

- `metrics.bitbucket_commits` - Raw commit data
- `metrics.commits_with_jira_flat` - Materialized view with alias resolution
- `metrics.author_aliases` - Email and account aliases
- `metrics.user_email_lookup` - Unified email lookup view
- `metrics.panopticum_people` - User/employee data

### 10. Troubleshooting

**Common Issues:**

1. **Authentication Error**: Verify credentials are correct
2. **Table Not Found**: Check database name and table name (case-sensitive)
3. **Syntax Error**: Validate SQL syntax, ensure proper quoting
4. **Timeout**: Add LIMIT or more restrictive WHERE clauses
5. **Empty Result**: Check date ranges and filter conditions

### 11. Safety Guidelines

- **READ-ONLY**: Only execute SELECT queries, never INSERT/UPDATE/DELETE
- **LIMIT RESULTS**: Always use LIMIT to prevent overwhelming output
- **STAGING FIRST**: Test queries on staging before production
- **SENSITIVE DATA**: Be mindful of PII and sensitive information in results
- **PERFORMANCE**: Avoid full table scans on large tables

## Output

After executing the query:

1. Show the formatted results
2. Explain what the data represents
3. Suggest follow-up queries if relevant
4. Note any data quality issues observed
