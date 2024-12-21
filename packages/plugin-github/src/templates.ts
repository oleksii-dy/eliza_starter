export const initializeTemplate = `
Extract the details for initializing the GitHub repository:
- **owner** (string): The owner of the GitHub repository (e.g., "octocat")
- **repo** (string): The name of the GitHub repository (e.g., "hello-world")
- **branch** (string): The branch of the GitHub repository (e.g., "main")

Provide the repository details in the following JSON format:

\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "branch": "<branch>"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const createMemoriesFromFilesTemplate = `
Extract the details for creating memories from files in the GitHub repository:
- **owner** (string): The owner of the GitHub repository (e.g., "octocat")
- **repo** (string): The name of the GitHub repository (e.g., "hello-world")
- **path** (string): The path to the files in the GitHub repository (e.g., "docs/")

Provide the repository details in the following JSON format:

\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "path": "<path>"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const createPullRequestTemplate = `
Extract the details for creating a pull request in the GitHub repository:
- **owner** (string): The owner of the GitHub repository (e.g., "octocat")
- **repo** (string): The name of the GitHub repository (e.g., "hello-world")
- **branch** (string): The branch of the GitHub repository (e.g., "main")
- **title** (string): The title of the pull request (e.g., "Add new documentation")
- **description** (string): The description of the pull request (optional)
- **files** (array): An array of files to commit with their content

Provide the pull request details in the following JSON format:

\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "branch": "<branch>",
    "title": "<title>",
    "description": "<description>"
    "files": [
        {
            "path": "<path>",
            "content": "<content>"
        }
    ]
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const createCommitTemplate = `
Extract the details for creating a commit in the GitHub repository:
- **owner** (string): The owner of the GitHub repository (e.g., "octocat")
- **repo** (string): The name of the GitHub repository (e.g., "hello-world")
- **branch** (string): The branch of the GitHub repository (e.g., "main")
- **message** (string): The commit message (e.g., "Update documentation")
- **files** (array): An array of files to commit with their content

Provide the commit details in the following JSON format:

\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "branch": "<branch>",
    "message": "<message>",
    "files": [
        {
            "path": "<path>",
            "content": "<content>"
        }
    ]
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const fetchFilesTemplate = `
Extract the details for fetching files from the GitHub repository:
- **owner** (string): The owner of the GitHub repository (e.g., "octocat")
- **repo** (string): The name of the GitHub repository (e.g., "hello-world")
- **branch** (string): The branch of the GitHub repository (e.g., "main")

Provide the repository details in the following JSON format:

\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "branch": "<branch>"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const createIssueTemplate = `

Create a new GitHub issue, ensure it is distinct from existing issues by comparing the title, body, and labels with previous issues, using a similarity threshold to determine if the issue should be created. Align the issue with the character's goals and the user's request to ensure its relevance and necessity.

Extract the necessary details for creating the issue and complete the issue template with additional information. Here is the character context:
{{character}}

Owner details:
{{owner}}

Repository details:
{{repository}}

Review previous interactions to avoid duplicate issues:
    - Previous Pull Requests: {{previousPRs}}
    - Previous Issues: {{previousIssues}}

Utilize the related files to provide context and enrich the issue template with additional details and whenever possible use code snippets from the files to clarify the issue details.
\`\`\`
{{files}}
\`\`\`

Incorporate examples from the provided files to clarify the issue details. Generate the title, body, and labels based on the character's goals and the user's request, ensuring the owner and repository remain unchanged. Assign relevant labels as appropriate:
- **owner** (string): The owner of the GitHub repository (e.g., "octocat")
- **repo** (string): The name of the GitHub repository (e.g., "hello-world")
- **title** (string): The title of the issue (e.g., "Add new documentation")
- **body** (string): The body of the issue (e.g., "Add new documentation")
- **labels** (array): The labels of the issue (optional)

Complete the issue template for the body of the issue generated by the agent.

If it is a bug report use:

\`\`\`
**Describe the bug**

<!-- A clear and concise description of what the bug is. Include relevant code snippets to illustrate the issue. -->

**To Reproduce**

<!-- Steps to reproduce the behavior, including code snippets if applicable. -->

**Expected behavior**

<!-- A clear and concise description of what you expected to happen, with code examples if relevant. -->

**Screenshots**

<!-- If applicable, add screenshots to help explain your problem. -->

**Additional context**

<!-- Add any other context about the problem here, including code snippets and file references. -->

**Related Issues** (if any)

<!-- Reference any related issues with their URLs if relevant. -->
{{#each previousIssues}}
- [Issue #{{this.number}}]({{this.url}})
{{/each}}
\`\`\`

If it is a feature request use:

\`\`\`
**Is your feature request related to a problem? Please describe.**

<!-- A clear and concise description of what the problem is, with code snippets to illustrate the current limitations. -->

**Describe the solution you'd like**

<!-- A clear and concise description of what you want to happen, with code examples or pseudocode if applicable. -->

**Describe alternatives you've considered**

<!-- A clear and concise description of any alternative solutions or features you've considered, with code snippets if relevant. -->

**Additional context**

<!-- Add any other context or screenshots about the feature request here, including code snippets and file references. -->

**Related Issues**

<!-- Reference any related issues with their URLs if relevant. -->
{{#each previousIssues}}
- [Issue #{{this.number}}]({{this.url}})
{{/each}}
\`\`\`

Examples of bug reports:

1. Logging system not capturing error stack traces:

\`\`\`
**Describe the bug**

The logging system is not properly capturing and formatting error stack traces when errors occur in the application.

**To Reproduce**

1. Add error logging to your application:
\`\`\`javascript
logger.error('An error occurred', error);
\`\`\`

2. Run the application and trigger an error condition

3. Check the logs and notice that the stack trace is either missing or malformed

4. The error details are limited to just the error message without the full stack trace context

**Expected behavior**

I expect the logging system to:
- Capture the complete error stack trace
- Format it in a readable way with proper indentation
- Include the file name and line number for each stack frame
- Preserve the error cause chain for nested errors

**Screenshots**

None

**Additional context**

This makes debugging production issues much more difficult since we can't trace the exact origin and path of errors through the codebase.
\`\`\`

2. Missing debug logs for authentication flow:

\`\`\`
**Describe the bug**

Unable to debug authentication failures due to insufficient logging in the auth flow.

**To Reproduce**

1. Start the application with default logging level
2. Attempt to authenticate with invalid credentials
3. Check logs for debugging information

**Expected behavior**

The logs should contain detailed information about:
- Authentication request parameters (excluding sensitive data)
- Each step of the auth flow
- Specific failure points and error codes
- Token validation results

**Additional context**

Current logs only show success/failure without intermediate steps, making it difficult to diagnose issues.
\`\`\`

3. Event tracking logs missing critical metadata:

\`\`\`
**Describe the bug**

Event tracking logs are missing important metadata needed for analytics and debugging.

**To Reproduce**

1. Trigger a user action (e.g. button click)
2. Check the event logs in monitoring system
3. Notice missing context like user session, feature flags, etc.

**Expected behavior**

Each event log should include:
- Timestamp with timezone
- User session ID
- Feature flag states
- Device/browser info
- Action context
- Related entity IDs

**Additional context**

This makes it difficult to:
- Track user journeys
- Debug edge cases
- Analyze feature usage
- Correlate events
\`\`\`

Examples of feature requests:

1. Add structured logging framework:

\`\`\`
**Is your feature request related to a problem? Please describe.**

Debugging production issues is difficult due to inconsistent log formats and missing context.

**Describe the solution you'd like**

Implement a structured logging framework that:
- Uses JSON format for all logs
- Includes standard fields (timestamp, severity, correlation ID)
- Supports context injection
- Has different log levels (DEBUG, INFO, WARN, ERROR)
- Allows adding custom fields
- Provides performance logging utilities

**Describe alternatives you've considered**

- Using plain text logs with grep
- Manual JSON formatting
- Application Performance Monitoring (APM) tools only

**Additional context**

This would help with:
- Faster debugging
- Better monitoring
- Easier log aggregation
- Consistent logging patterns
\`\`\`

2. Add distributed tracing capability:

\`\`\`
**Is your feature request related to a problem? Please describe.**

Cannot effectively trace requests across multiple services and identify performance bottlenecks.

**Describe the solution you'd like**

Implement distributed tracing that:
- Generates unique trace IDs
- Tracks request flow across services
- Measures timing of operations
- Shows service dependencies
- Integrates with existing logging
- Supports sampling for high-traffic systems

**Describe alternatives you've considered**

- Logging correlation IDs only
- Service-level metrics without tracing
- Manual request tracking

**Additional context**

Would integrate with observability stack and help with:
- Performance optimization
- Dependency analysis
- Error correlation
- System understanding

- [Issue #456](https://github.com/octocat/hello-world/issues/456)
\`\`\`

Provide the issue details in the following JSON format:

\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "<title>",
    "body": "<body>",
    "labels": ["<label1>", "<label2>"]
}
\`\`\`

## Examples of Issues

### 1. Architecture & Design
#### Feature Request: Implement Singleton Design Pattern
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Implement Singleton Design Pattern",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nTo ensure a class has only one instance and provide a global point of access to it.\\n\\n**Describe the solution you'd like**\\n\\nImplement the Singleton design pattern for the Logger class. This can be achieved by creating a private static instance of the class and a public static method that returns the instance.\\n\\n**Code Example**\\n\\n\`\`\`typescript\\nclass Logger {\\n  private static instance: Logger;\\n  private constructor() {}\\n  public static getInstance(): Logger {\\n    if (!Logger.instance) {\\n      Logger.instance = new Logger();\\n    }\\n    return Logger.instance;\\n  }\\n}\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nUsing static methods, but this does not provide the same level of control over instance creation.\\n\\n**Additional context**\\n\\nThis will help in managing a single instance of the Logger class across the application, ensuring consistent logging behavior.\\n\\n**Linked PR:** [PR #123](https://github.com/octocat/hello-world/pull/123)",
    "labels": ["enhancement", "design"]
}
\`\`\`

### 2. Coding Practices
#### Refactor: Improve Code Readability
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Refactor: Improve Code Readability",
    "body": "## Refactor\\n\\n**Is your refactor related to a problem? Please describe.**\\n\\nThe current codebase has inconsistent naming conventions and lacks comments.\\n\\n**Describe the solution you'd like**\\n\\nRefactor the code to follow consistent naming conventions and add comments for better readability. For example, rename variables to be more descriptive and add JSDoc comments.\\n\\n**Code Example**\\n\\n\`\`\`typescript\\n// Before\\nconst x = 10;\\nfunction foo() {\\n  return x * 2;\\n}\\n\\n// After\\nconst multiplier = 10;\\n/**\\n * Multiplies the multiplier by 2\\n * @returns {number} The result of the multiplication\\n */\\nfunction multiplyByTwo() {\\n  return multiplier * 2;\\n}\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nLeaving the code as is, but this would make it harder for new developers to understand and maintain.\\n\\n**Additional context**\\n\\nThis will improve maintainability and ease of understanding for new developers.\\n\\n**Linked PR:** [PR #124](https://github.com/octocat/hello-world/pull/124)",
    "labels": ["refactor", "code quality"]
}
\`\`\`

### 3. Logging & Monitoring
#### Feature Request: Enhance Logging Practices
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Enhance Logging Practices",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nCurrent logging lacks structure and meaningful messages.\\n\\n**Describe the solution you'd like**\\n\\nImplement structured logging with meaningful messages and log levels. Use a logging library like Winston or Bunyan to create structured logs.\\n\\n**Code Example**\\n\\n\`\`\`typescript\\nconst winston = require('winston');\\nconst logger = winston.createLogger({\\n  level: 'info',\\n  format: winston.format.json(),\\n  transports: [\\n    new winston.transports.Console(),\\n    new winston.transports.File({ filename: 'combined.log' })\\n  ]\\n});\\nlogger.info('User logged in', { userId: 123 });\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nUsing existing logging practices, but they do not provide the same level of detail and structure.\\n\\n**Additional context**\\n\\nThis will help in better debugging and monitoring of the application by providing more detailed and structured logs.\\n\\n**Linked PR:** [PR #125](https://github.com/octocat/hello-world/pull/125)",
    "labels": ["enhancement", "logging"]
}
\`\`\`

### 4. Frontend Development
#### Bug: Fix Responsive Design Issues
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Fix Responsive Design Issues",
    "body": "## Bug\\n\\n**Describe the bug**\\n\\nThe application does not render correctly on mobile devices.\\n\\n**To Reproduce**\\n\\nSteps to reproduce the behavior:\\n1. Open the application on a mobile device.\\n2. Observe the layout issues.\\n\\n**Expected behavior**\\n\\nThe application should render correctly on all devices.\\n\\n**Code Example**\\n\\n\`\`\`css\\n/* Before */\\n.container {\\n  width: 1000px;\\n}\\n\\n/* After */\\n.container {\\n  width: 100%;\\n  max-width: 1000px;\\n}\\n\`\`\`\\n\\n**Screenshots**\\n\\nIf applicable, add screenshots to help explain your problem.\\n\\n**Additional context**\\n\\nEnsure the application is fully responsive by using media queries and flexible layouts.",
    "labels": ["bug", "frontend"]
}
\`\`\`

### 5. Backend Development
#### Feature Request: Implement JWT Authentication
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Implement JWT Authentication",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nNeed a secure method for user authentication.\\n\\n**Describe the solution you'd like**\\n\\nImplement JWT (JSON Web Token) for user authentication and authorization. This involves generating a token upon user login and verifying the token for protected routes.\\n\\n**Code Example**\\n\\n\`\`\`typescript\\nconst jwt = require('jsonwebtoken');\\nconst token = jwt.sign({ userId: 123 }, 'secretKey', { expiresIn: '1h' });\\n// Middleware to verify token\\nfunction authenticateToken(req, res, next) {\\n  const token = req.header('Authorization');\\n  if (!token) return res.status(401).send('Access Denied');\\n  try {\\n    const verified = jwt.verify(token, 'secretKey');\\n    req.user = verified;\\n    next();\\n  } catch (err) {\\n    res.status(400).send('Invalid Token');\\n  }\\n}\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nUsing session-based authentication, but this is less scalable and requires server-side session management.\\n\\n**Additional context**\\n\\nJWT will provide a stateless and scalable authentication mechanism, improving security and performance.",
    "labels": ["enhancement", "backend"]
}
\`\`\`

### 6. Database Design
#### Feature Request: Optimize Database Indexing
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Optimize Database Indexing",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nSlow query performance due to lack of proper indexing.\\n\\n**Describe the solution you'd like**\\n\\nImplement appropriate indexing strategies to optimize query performance. This includes creating indexes on frequently queried columns and analyzing query patterns.\\n\\n**Code Example**\\n\\n\`\`\`sql\\n-- Before\\nSELECT * FROM users WHERE email = 'example@example.com';\\n\\n-- After\\nCREATE INDEX idx_users_email ON users(email);\\nSELECT * FROM users WHERE email = 'example@example.com';\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nLeaving the database as is, but this would result in continued slow performance.\\n\\n**Additional context**\\n\\nThis will improve the overall performance of the application by reducing query execution time.\\n\\n**Linked PR:** [PR #128](https://github.com/octocat/hello-world/pull/128)",
    "labels": ["enhancement", "database"]
}
\`\`\`

### 7. Testing
#### Feature Request: Add Unit Tests for User Service
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Add Unit Tests for User Service",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nLack of unit tests for the User Service.\\n\\n**Describe the solution you'd like**\\n\\nAdd comprehensive unit tests for the User Service to ensure its functionality. Use a testing framework like Jest or Mocha to write and run the tests.\\n\\n**Code Example**\\n\\n\`\`\`typescript\\n// userService.test.ts\\nconst userService = require('./userService');\\ntest('should create a new user', () => {\\n  const user = userService.createUser('testUser');\\n  expect(user).toHaveProperty('id');\\n  expect(user.name).toBe('testUser');\\n});\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nManual testing, but this is time-consuming and prone to human error.\\n\\n**Additional context**\\n\\nUnit tests will help in maintaining code quality and catching bugs early, ensuring the reliability of the User Service.\\n\\n**Linked PR:** [PR #129](https://github.com/octocat/hello-world/pull/129)",
    "labels": ["enhancement", "testing"]
}
\`\`\`

### 8. Performance & Optimization
#### Feature Request: Implement Caching for API Responses
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Implement Caching for API Responses",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nSlow API response times due to repeated data fetching.\\n\\n**Describe the solution you'd like**\\n\\nImplement caching mechanisms to store and retrieve API responses efficiently. Use a caching solution like Redis or Memcached to cache frequently requested data.\\n\\n**Code Example**\\n\\n\`\`\`typescript\\nconst redis = require('redis');\\nconst client = redis.createClient();\\n// Middleware to check cache\\nfunction checkCache(req, res, next) {\\n  const { id } = req.params;\\n  client.get(id, (err, data) => {\\n    if (err) throw err;\\n    if (data) {\\n      res.send(JSON.parse(data));\\n    } else {\\n      next();\\n    }\\n  });\\n}\\n// Route to get data\\napp.get('/data/:id', checkCache, (req, res) => {\\n  const data = getDataFromDatabase(req.params.id);\\n  client.setex(req.params.id, 3600, JSON.stringify(data));\\n  res.send(data);\\n});\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nFetching data on every request, but this results in slower response times and higher server load.\\n\\n**Additional context**\\n\\nCaching will improve the performance and reduce server load, providing a better user experience.",
    "labels": ["enhancement", "performance"]
}
\`\`\`

### 9. Security
#### Feature Request: Enhance Data Encryption
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Enhance Data Encryption",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nSensitive data is not encrypted adequately.\\n\\n**Describe the solution you'd like**\\n\\nImplement stronger encryption algorithms for sensitive data. Use libraries like CryptoJS or Node.js built-in crypto module to encrypt data.\\n\\n**Code Example**\\n\\n\`\`\`typescript\\nconst crypto = require('crypto');\\nconst algorithm = 'aes-256-ctr';\\nconst secretKey = 'vOVH6sdmpNWjRRIqCc7rdxs01lwHzfr3';\\nconst iv = crypto.randomBytes(16);\\n\\nfunction encrypt(text) {\\n  const cipher = crypto.createCipheriv(algorithm, secretKey, iv);\\n  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);\\n  return { iv: iv.toString('hex'), content: encrypted.toString('hex') };\\n}\\n\\nfunction decrypt(hash) {\\n  const decipher = crypto.createDecipheriv(algorithm, secretKey, Buffer.from(hash.iv, 'hex'));\\n  const decrypted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);\\n  return decrypted.toString();\\n}\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nUsing existing encryption methods, but they may not provide the required level of security.\\n\\n**Additional context**\\n\\nEnhanced encryption will improve data security and compliance, protecting sensitive information from unauthorized access.\\n\\n**Linked PR:** [PR #131](https://github.com/octocat/hello-world/pull/131)",
    "labels": ["enhancement", "security"]
}
\`\`\`

### 10. Deployment & DevOps
#### Feature Request: Implement CI/CD Pipeline
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Implement CI/CD Pipeline",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nManual deployment processes are error-prone and time-consuming.\\n\\n**Describe the solution you'd like**\\n\\nImplement a CI/CD pipeline to automate the build, testing, and deployment processes. Use tools like Jenkins, GitHub Actions, or GitLab CI to set up the pipeline.\\n\\n**Code Example**\\n\\n\`\`\`yaml\\n# .github/workflows/ci-cd.yml\\nname: CI/CD Pipeline\\non: [push]\\njobs:\\n  build:\\n    runs-on: ubuntu-latest\\n    steps:\\n    - uses: actions/checkout@v2\\n    - name: Set up Node.js\\n      uses: actions/setup-node@v2\\n      with:\\n        node-version: '14'\\n    - name: Install dependencies\\n      run: npm install\\n    - name: Run tests\\n      run: npm test\\n    - name: Deploy\\n      run: npm run deploy\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nManual deployment, but this is prone to errors and delays.\\n\\n**Additional context**\\n\\nCI/CD will streamline the development workflow and ensure faster releases, improving the overall efficiency of the development process.",
    "labels": ["enhancement", "devops"]
}
\`\`\`

### 11. Version Control
#### Feature Request: Adopt Git Flow Branching Strategy
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Adopt Git Flow Branching Strategy",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nInconsistent branching and merging practices.\\n\\n**Describe the solution you'd like**\\n\\nAdopt the Git Flow branching strategy to standardize the development process. This involves using specific branches for features, releases, and hotfixes.\\n\\n**Code Example**\\n\\n\`\`\`\\n# Create a new feature branch\\ngit checkout -b feature/my-new-feature\\n# Commit changes\\ngit commit -m 'Add new feature'\\n# Push the feature branch\\ngit push origin feature/my-new-feature\\n# Merge the feature branch into develop\\ngit checkout develop\\ngit merge feature/my-new-feature\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nUsing the current branching strategy, but this leads to confusion and conflicts.\\n\\n**Additional context**\\n\\nGit Flow will improve collaboration and code management by providing a clear and structured workflow.",
    "labels": ["enhancement", "version control"]
}
\`\`\`

### 12. Project Management
#### Feature Request: Implement Agile Methodology
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Implement Agile Methodology",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nLack of structured project management practices.\\n\\n**Describe the solution you'd like**\\n\\nImplement Agile methodology to manage and iterate on projects efficiently. This includes adopting practices like Scrum or Kanban, conducting regular stand-ups, and using tools like Jira or Trello.\\n\\n**Code Example**\\n\\n\`\`\`\\n# Example of a Jira ticket\\nSummary: Implement user authentication\\nDescription: As a user, I want to securely log in to the application so that I can access my account.\\nAcceptance Criteria:\\n- User can log in with email and password\\n- User receives an error message for invalid credentials\\n- User session is maintained across pages\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nUsing traditional project management methods, but they are less flexible and adaptive.\\n\\n**Additional context**\\n\\nAgile will improve project visibility and adaptability, allowing the team to respond to changes quickly and deliver value incrementally.\\n\\n**Linked PR:** [PR #134](https://github.com/octocat/hello-world/pull/134)",
    "labels": ["enhancement", "project management"]
}
\`\`\`

### 13. User Experience (UX)
#### Feature Request: Conduct Usability Testing
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Conduct Usability Testing",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nUncertainty about the application's ease of use.\\n\\n**Describe the solution you'd like**\\n\\nConduct usability testing to evaluate and improve the user experience. This involves recruiting real users to perform tasks and providing feedback on their experience.\\n\\n**Code Example**\\n\\n\`\`\`\\n# Example of a usability test script\\nTask: Log in to the application\\nSteps:\\n1. Open the application\\n2. Click on the 'Log In' button\\n3. Enter your email and password\\n4. Click 'Submit'\\nQuestions:\\n- Was the log-in process straightforward?\\n- Did you encounter any issues?\\n- How would you rate the overall experience?\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nRelying on internal feedback, but this may not provide an accurate representation of the user experience.\\n\\n**Additional context**\\n\\nUsability testing will provide valuable insights from real users, helping to identify and address usability issues.",
    "labels": ["enhancement", "ux"]
}
\`\`\`

### 14. Maintainability
#### Refactor: Modularize Codebase
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Refactor: Modularize Codebase",
    "body": "## Refactor\\n\\n**Is your refactor related to a problem? Please describe.**\\n\\nThe current codebase is monolithic and hard to maintain.\\n\\n**Describe the solution you'd like**\\n\\nRefactor the codebase to be more modular and organized into distinct modules. This involves breaking down the code into smaller, reusable components and organizing them into separate files or directories.\\n\\n**Code Example**\\n\\n\`\`\`typescript\\n// Before\\nclass UserService {\\n  createUser() {\\n    // ...\\n  }\\n  deleteUser() {\\n    // ...\\n  }\\n}\\n\\n// After\\n// userService.ts\\nexport class UserService {\\n  createUser() {\\n    // ...\\n  }\\n}\\n\\n// deleteUserService.ts\\nexport class DeleteUserService {\\n  deleteUser() {\\n    // ...\\n  }\\n}\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nLeaving the codebase as is, but this would make it harder to maintain and scale.\\n\\n**Additional context**\\n\\nModularizing the codebase will improve maintainability and scalability, making it easier to manage and extend.\\n\\n**Linked PR:** [PR #136](https://github.com/octocat/hello-world/pull/136)",
    "labels": ["refactor", "maintainability"]
}
\`\`\`

### 15. Internationalization & Localization (i18n & l10n)
#### Feature Request: Add Support for Multiple Languages
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Add Support for Multiple Languages",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nThe application currently supports only one language.\\n\\n**Describe the solution you'd like**\\n\\nImplement internationalization to support multiple languages. Use libraries like i18next or react-intl to manage translations and language switching.\\n\\n**Code Example**\\n\\n\`\`\`typescript\\n// i18n.js\\nimport i18n from 'i18next';\\nimport { initReactI18next } from 'react-i18next';\\nimport translationEN from './locales/en/translation.json';\\nimport translationES from './locales/es/translation.json';\\n\\ni18n\\n  .use(initReactI18next)\\n  .init({\\n    resources: {\\n      en: { translation: translationEN },\\n      es: { translation: translationES }\\n    },\\n    lng: 'en',\\n    fallbackLng: 'en',\\n    interpolation: { escapeValue: false }\\n  });\\nexport default i18n;\\n\`\`\`\\n\\n**Describe alternatives you've considered**\\n\\nMaintaining a single language application, but this limits the user base.\\n\\n**Additional context**\\n\\nSupporting multiple languages will make the application accessible to a wider audience, improving user experience and engagement.",
    "labels": ["enhancement", "i18n"]
}
\`\`\`

### 16. Documentation
#### Feature Request: Enhance API Documentation
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Enhance API Documentation",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nThe current API documentation is insufficient and lacks detailed examples.\\n\\n**Describe the solution you'd like**\\n\\nImprove the API documentation by adding comprehensive guides and illustrative examples.\\n\\n**Describe alternatives you've considered**\\n\\nRelying on the existing documentation.\\n\\n**Additional context**\\n\\nBetter documentation will assist developers in effectively integrating with the API.",
    "labels": ["enhancement", "documentation"]
}
\`\`\`

### 17. Continuous Learning & Improvement
#### Feature Request: Implement Regular Code Reviews
\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "title": "Implement Regular Code Reviews",
    "body": "## Feature Request\\n\\n**Is your feature request related to a problem? Please describe.**\\n\\nThe absence of regular code reviews may lead to potential code quality issues.\\n\\n**Describe the solution you'd like**\\n\\nIntroduce a structured process for regular code reviews to ensure code quality and facilitate knowledge sharing.\\n\\n**Describe alternatives you've considered**\\n\\nConducting ad-hoc code reviews.\\n\\n**Additional context**\\n\\nRegular code reviews will contribute to maintaining high code quality and enhancing team collaboration.",
    "labels": ["enhancement", "continuous improvement"]
}
\`\`\`


Here are the recent user messages for context:
{{recentMessages}}
`;

export const modifyIssueTemplate = `
Extract the details for modifying a GitHub issue and ensure the modifications align with the character's goals and the user's request:
- **owner** (string): The owner of the GitHub repository (e.g., "octocat")
- **repo** (string): The name of the GitHub repository (e.g., "hello-world")
- **issue_number** (number): The number of the issue (e.g., 1)
- **title** (string): The title of the issue (e.g., "Add new documentation") (optional)
- **body** (string): The body of the issue (e.g., "Add new documentation") (optional)
- **state** (string): The state of the issue (e.g., "open", "closed") (optional)
- **labels** (array): The labels of the issue (optional)

Ensure that the modifications are consistent with the character's objectives and the user's request without altering the owner and repo.

Here is the original request:
{{memory}}

Please use the related files to provide context and fill in the issue template with additional details:
{{files}}

Try to integrate examples using the files provided to explain details of the issue.

Ensure that the title, body, and labels are generated based on the character's goals and the user's request without changing the owner and repo.

Please do not change the issue number, owner, repo.

Provide the issue details in the following JSON format:

\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "issue_number": "<issue_number>",
    "title": "<title>",
    "body": "<body>",
    "state": "<state>",
    "labels": ["<label1>", "<label2>"]
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

export const addCommentToIssueTemplate = `
Extract the details for adding a comment to a GitHub issue and ensure the comment aligns with the character's goals and the user's request:
- **owner** (string): The owner of the GitHub repository (e.g., "octocat")
- **repo** (string): The name of the GitHub repository (e.g., "hello-world")
- **issue_number** (number): The number of the issue (e.g., 1)
- **comment** (string): The comment to add (e.g., "Add new documentation")

Ensure that the comment is consistent with the character's objectives and the user's request without altering the owner and repo.

Here is the original request:
{{memory}}

Please use the related files to provide context and fill in the issue template with additional details:
{{files}}

Try to integrate examples using the files provided to explain details of the issue.

Ensure that the comment is generated based on the character's goals and the user's request without changing the owner and repo.

Provide the comment details in the following JSON format:

\`\`\`json
{
    "owner": "<owner>",
    "repo": "<repo>",
    "issue_number": "<issue_number>",
    "comment": "<comment>"
}
\`\`\`

Here are the recent user messages for context:
{{recentMessages}}
`;

// Initialize the repository ai16z/eliza on develop branch
// Create memories from file on repository ai16z/eliza at path '/packages/plugin-coinbase'
// Create an issue in repository ai16z/eliza titled about improving logging in /packages/plugin-github/plugins
// pnpm build && pnpm start
