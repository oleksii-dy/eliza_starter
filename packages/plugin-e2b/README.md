# @elizaos/plugin-e2b

E2B Code Interpreter plugin for ElizaOS that provides secure code execution in isolated sandboxes. Execute Python, JavaScript, and other languages safely with full filesystem access, package installation, and internet connectivity.

## Features

- 🔒 **Secure Isolation**: Each code execution runs in isolated E2B sandboxes (Firecracker micro-VMs)
- 🐍 **Multi-Language Support**: Python, JavaScript, and other languages
- 📦 **Package Installation**: Install and use any packages (pip, npm, etc.)
- 💾 **Persistent Sessions**: Variables and files persist across code executions
- 🌐 **Internet Access**: Full network connectivity for data fetching and API calls
- 📊 **Rich Output**: Support for plots, charts, images, and multimedia results
- ⚡ **Fast Startup**: Sandboxes start in ~150ms
- 🔄 **Automatic Management**: Lifecycle management with cleanup and monitoring

## Installation

```bash
npm install @elizaos/plugin-e2b @e2b/code-interpreter
```

## Configuration

### Environment Variables

```bash
# Required for cloud E2B (get from https://e2b.dev)
E2B_API_KEY=your_e2b_api_key_here

# Optional: Local E2B setup (self-hosted)
# If no API key provided, plugin attempts local connection
```

### Plugin Setup

```typescript
import { e2bPlugin } from '@elizaos/plugin-e2b';

// Add to your ElizaOS configuration
export default {
  plugins: [
    e2bPlugin,
    // ... other plugins
  ],
  // ... rest of config
};
```

## Usage

### Code Execution

The plugin automatically detects and executes code blocks:

````
Execute this Python code:
```python
import numpy as np
import matplotlib.pyplot as plt

# Generate data
x = np.linspace(0, 10, 100)
y = np.sin(x)

# Create plot
plt.figure(figsize=(10, 6))
plt.plot(x, y, 'b-', linewidth=2, label='sin(x)')
plt.xlabel('x')
plt.ylabel('y')
plt.title('Sine Wave')
plt.legend()
plt.grid(True)
plt.show()

print(f"Generated {len(x)} data points")
````

### Sandbox Management

Create, list, and manage sandboxes:

```
# Create new sandbox
"Create a new sandbox with 10 minute timeout"

# List active sandboxes
"Show me all active sandboxes"

# Kill specific sandbox
"Kill sandbox sbx-abc123def456"
```

### Multi-Language Support

```python
# Python
import requests
response = requests.get('https://api.github.com/user', headers={'Authorization': 'token YOUR_TOKEN'})
print(response.json())
```

```javascript
// JavaScript (if supported by template)
const fs = require('fs');
const data = { message: 'Hello from E2B!' };
fs.writeFileSync('output.json', JSON.stringify(data, null, 2));
console.log('File written successfully');
```

## Actions

### `EXECUTE_CODE`

Executes code in secure E2B sandboxes.

**Triggers:**

- Messages containing code blocks (```language)
- Messages with code-like content
- Keywords: execute, run, code, python, calculate

**Examples:**

```typescript
// Action chaining example
const result = await runtime.processActions(message, [], state);
if (result.values.success) {
  console.log('Code executed:', result.data.executionResults);
}
```

### `MANAGE_SANDBOX`

Creates, lists, and manages E2B sandboxes.

**Triggers:**

- Keywords: sandbox, create sandbox, list sandbox, kill sandbox

**Examples:**

```typescript
// Create sandbox programmatically
const e2bService = runtime.getService('e2b');
const sandboxId = await e2bService.createSandbox({
  timeoutMs: 600000, // 10 minutes
  metadata: { purpose: 'data-analysis' },
});
```

## Service Integration

### Using E2B Service Directly

```typescript
import type { E2BService } from '@elizaos/plugin-e2b';

// Get service instance
const e2bService = runtime.getService<E2BService>('e2b');

// Execute code
const result = await e2bService.executeCode('print("Hello World")', 'python');

// Manage sandboxes
const sandboxId = await e2bService.createSandbox({
  timeoutMs: 300000,
  metadata: { user: 'alice' },
});

// File operations
await e2bService.writeFileToSandbox(sandboxId, '/tmp/data.txt', 'Hello!');
const content = await e2bService.readFileFromSandbox(sandboxId, '/tmp/data.txt');
```

### Provider Integration

The E2B provider gives context about sandbox availability:

```typescript
// Provider automatically included in state
const state = await runtime.composeState(message);
console.log(state.e2b); // E2B sandbox status and capabilities
```

## Advanced Usage

### Custom Sandbox Templates

```typescript
// Create sandbox with custom template
const sandboxId = await e2bService.createSandbox({
  template: 'python-datascience', // Custom template with pre-installed packages
  timeoutMs: 1800000, // 30 minutes
  metadata: {
    project: 'ml-training',
    user: userId,
  },
});
```

### Error Handling

```typescript
try {
  const result = await e2bService.executeCode(userCode);

  if (result.error) {
    console.error('Execution error:', result.error.name, result.error.value);
    console.error('Traceback:', result.error.traceback);
  } else {
    console.log('Result:', result.text);
    console.log('Outputs:', result.logs.stdout);
  }
} catch (error) {
  console.error('Service error:', error.message);
}
```

### Monitoring and Cleanup

```typescript
// Health monitoring
const isHealthy = await e2bService.isHealthy();

// List and cleanup old sandboxes
const sandboxes = e2bService.listSandboxes();
const oldSandboxes = sandboxes.filter(
  (s) => Date.now() - s.lastActivity.getTime() > 3600000 // 1 hour old
);

for (const sandbox of oldSandboxes) {
  await e2bService.killSandbox(sandbox.sandboxId);
}
```

## Security

### Isolation Features

- **Process Isolation**: Each sandbox runs in a separate Firecracker micro-VM
- **Network Policies**: Controlled internet access with optional restrictions
- **File System**: Sandboxed filesystem with no access to host files
- **Resource Limits**: CPU, memory, and disk space limitations
- **Automatic Cleanup**: Sandboxes auto-terminate after timeout

### Best Practices

1. **Set Appropriate Timeouts**: Prevent resource waste
2. **Monitor Resource Usage**: Track active sandboxes
3. **Validate User Input**: Sanitize code before execution
4. **Use Metadata**: Tag sandboxes for tracking and cleanup
5. **Regular Cleanup**: Remove unused sandboxes

```typescript
// Secure sandbox creation
const sandboxId = await e2bService.createSandbox({
  timeoutMs: 300000, // 5 minute limit
  metadata: {
    userId: runtime.userId,
    sessionId: runtime.sessionId,
    purpose: 'user-code-execution',
  },
});
```

## Testing

Run the included E2E tests:

```bash
# Run tests with real E2B infrastructure
npm test

# Test specific functionality
npm run test -- --grep "code execution"
```

### Test Examples

```typescript
// Example E2E test
const testSuite = new E2BBasicE2ETestSuite();
await testSuite.tests[0].fn(runtime); // Test service initialization
```

## Troubleshooting

### Common Issues

**API Key Issues:**

```bash
# Check API key
export E2B_API_KEY=your_key_here
# Verify with E2B CLI
npx @e2b/cli auth whoami
```

**Local E2B Setup:**

```bash
# Install E2B CLI
npm install -g @e2b/cli

# Setup local runtime
e2b template build
```

**Network Issues:**

```bash
# Check connectivity
curl -X GET "https://api.e2b.dev/sandboxes" \
  -H "X-API-Key: $E2B_API_KEY"
```

### Debug Mode

```bash
# Enable detailed logging
DEBUG=e2b:* npm start
```

## Examples

### Data Analysis Workflow

```python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load and analyze data
df = pd.read_csv('https://raw.githubusercontent.com/datasets/iris/master/data/iris.csv')
print(df.describe())

# Create visualization
plt.figure(figsize=(12, 8))
sns.pairplot(df, hue='Name')
plt.suptitle('Iris Dataset Analysis')
plt.show()

# Statistical analysis
correlation = df.select_dtypes(include=[float, int]).corr()
print("Correlation matrix:")
print(correlation)
```

### Web Scraping and API Integration

```python
import requests
from bs4 import BeautifulSoup
import json

# Fetch and parse web content
response = requests.get('https://httpbin.org/json')
data = response.json()
print("API Response:", json.dumps(data, indent=2))

# Web scraping example
html_response = requests.get('https://httpbin.org/html')
soup = BeautifulSoup(html_response.text, 'html.parser')
title = soup.find('title').text
print(f"Page title: {title}")
```

### Machine Learning Pipeline

```python
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

# Load data
iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(
    iris.data, iris.target, test_size=0.2, random_state=42
)

# Train model
model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

# Evaluate
predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)

print(f"Model accuracy: {accuracy:.4f}")
print("\nClassification Report:")
print(classification_report(y_test, predictions, target_names=iris.target_names))
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Run tests: `npm test`
4. Submit pull request

## License

MIT - see LICENSE file for details.

## Support

- 📖 [E2B Documentation](https://e2b.dev/docs)
- 💬 [ElizaOS Discord](https://discord.gg/elizaos)
- 🐛 [Issues](https://github.com/elizaos/eliza/issues)
- 🔑 [Get E2B API Key](https://e2b.dev)
