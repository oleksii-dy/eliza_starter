import type { TestSuite, IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { E2BService } from '../../services/E2BService.js';

export class RealWorldScenariosE2ETestSuite implements TestSuite {
  name = 'plugin-e2b-real-world-scenarios-e2e';
  description = 'Real-world scenarios testing E2B Code Interpreter with complete applications';

  tests = [
    {
      name: 'Scenario 1: Build a Personal Finance Calculator',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('🏦 Testing Personal Finance Calculator scenario...');

        const e2bService = runtime.getService<E2BService>('e2b');
        if (!e2bService) throw new Error('E2B service not available');

        // User request: "I need a personal finance calculator that can calculate compound interest, 
        // loan payments, and investment growth. Can you build this for me?"

        const financeCalculatorCode = `# Personal Finance Calculator
import math

class FinanceCalculator:
    def __init__(self):
        self.name = "Personal Finance Calculator"
        
    def compound_interest(self, principal, rate, time, compound_frequency=12):
        """Calculate compound interest"""
        try:
            amount = principal * (1 + rate/compound_frequency) ** (compound_frequency * time)
            interest_earned = amount - principal
            return {
                'principal': principal,
                'rate': rate * 100,
                'time_years': time,
                'compound_frequency': compound_frequency,
                'final_amount': round(amount, 2),
                'interest_earned': round(interest_earned, 2)
            }
        except Exception as e:
            return {'error': str(e)}
    
    def loan_payment(self, principal, annual_rate, years):
        """Calculate monthly loan payment using formula"""
        try:
            monthly_rate = annual_rate / 12
            num_payments = years * 12
            
            if monthly_rate == 0:
                payment = principal / num_payments
            else:
                payment = principal * (monthly_rate * (1 + monthly_rate)**num_payments) / ((1 + monthly_rate)**num_payments - 1)
            
            total_paid = payment * num_payments
            total_interest = total_paid - principal
            
            return {
                'loan_amount': principal,
                'annual_rate': annual_rate * 100,
                'loan_term_years': years,
                'monthly_payment': round(payment, 2),
                'total_paid': round(total_paid, 2),
                'total_interest': round(total_interest, 2)
            }
        except Exception as e:
            return {'error': str(e)}

# Create calculator instance and run tests
calc = FinanceCalculator()

print("=== PERSONAL FINANCE CALCULATOR ===")
print()

# Test 1: Compound Interest
print("1. COMPOUND INTEREST CALCULATION")
print("Scenario: $10,000 invested at 5% annual interest for 10 years, compounded monthly")
compound_result = calc.compound_interest(10000, 0.05, 10, 12)
print("Initial amount: $" + str(compound_result['principal']))
print("Interest rate: " + str(compound_result['rate']) + "% annually")
print("Time period: " + str(compound_result['time_years']) + " years")
print("Final amount: $" + str(compound_result['final_amount']))
print("Interest earned: $" + str(compound_result['interest_earned']))
print()

# Test 2: Loan Payment
print("2. LOAN PAYMENT CALCULATION")
print("Scenario: $300,000 mortgage at 3.5% annual rate for 30 years")
loan_result = calc.loan_payment(300000, 0.035, 30)
print("Loan amount: $" + str(loan_result['loan_amount']))
print("Interest rate: " + str(loan_result['annual_rate']) + "% annually")
print("Loan term: " + str(loan_result['loan_term_years']) + " years")
print("Monthly payment: $" + str(loan_result['monthly_payment']))
print("Total paid: $" + str(loan_result['total_paid']))
print("Total interest: $" + str(loan_result['total_interest']))
print()

# Validation tests
print("3. VALIDATION TESTS")
test_cases = [
    {'name': 'Zero interest rate', 'func': lambda: calc.compound_interest(1000, 0, 5)},
    {'name': 'Zero loan rate', 'func': lambda: calc.loan_payment(100000, 0, 10)}
]

all_tests_passed = True
for test in test_cases:
    try:
        result = test['func']()
        if 'error' not in result:
            print("✅ " + test['name'] + ": PASSED")
        else:
            print("❌ " + test['name'] + ": FAILED - " + str(result['error']))
            all_tests_passed = False
    except Exception as e:
        print("❌ " + test['name'] + ": FAILED - " + str(e))
        all_tests_passed = False

if all_tests_passed:
    print("\\\\n🎉 All tests passed! Finance calculator is working correctly.")
else:
    print("\\\\n⚠️ Some tests failed. Please review the implementation.")

print("\\\\n📊 Calculator ready for use!")`;

        const result = await e2bService.executeCode(financeCalculatorCode, 'python');

        // Verify execution
        if (result.error) {
          throw new Error(`Finance calculator execution failed: ${result.error.value}`);
        }

        // Verify expected outputs
        const expectedOutputs = [
          'PERSONAL FINANCE CALCULATOR',
          'COMPOUND INTEREST CALCULATION',
          'Final amount: $16470.09',
          'LOAN PAYMENT CALCULATION', 
          'Monthly payment: $1347.13',
          'All tests passed! Finance calculator is working correctly'
        ];

        const output = result.logs.stdout.join('\n');
        for (const expected of expectedOutputs) {
          if (!output.includes(expected)) {
            throw new Error(`Expected output '${expected}' not found in result`);
          }
        }

        elizaLogger.info('✅ Personal Finance Calculator scenario completed successfully');
      },
    },

    {
      name: 'Scenario 2: Build a Simple Data Analytics Dashboard',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('📈 Testing Simple Data Analytics scenario...');

        const e2bService = runtime.getService<E2BService>('e2b');
        if (!e2bService) throw new Error('E2B service not available');

        // User request: "Create a simple analytics dashboard that processes sales data"

        const analyticsCode = `# Simple Analytics Dashboard
import random
import statistics

class SimpleAnalytics:
    def __init__(self):
        self.data = []
        
    def generate_sample_data(self):
        """Generate sample sales data"""
        products = ['Widget A', 'Widget B', 'Widget C']
        regions = ['North', 'South', 'East', 'West']
        
        for i in range(50):
            self.data.append({
                'id': i + 1,
                'product': random.choice(products),
                'region': random.choice(regions),
                'quantity': random.randint(1, 20),
                'price': round(random.uniform(10.0, 100.0), 2),
                'revenue': 0  # Will calculate
            })
            
        # Calculate revenue
        for item in self.data:
            item['revenue'] = round(item['quantity'] * item['price'], 2)
    
    def calculate_metrics(self):
        """Calculate key metrics"""
        revenues = [item['revenue'] for item in self.data]
        quantities = [item['quantity'] for item in self.data]
        
        return {
            'total_revenue': round(sum(revenues), 2),
            'total_quantity': sum(quantities),
            'avg_revenue': round(statistics.mean(revenues), 2),
            'total_transactions': len(self.data)
        }
    
    def generate_report(self):
        """Generate simple report"""
        metrics = self.calculate_metrics()
        
        print("=== SALES ANALYTICS DASHBOARD ===")
        print("Total Revenue: $" + str(metrics['total_revenue']))
        print("Total Quantity Sold: " + str(metrics['total_quantity']))
        print("Average Revenue per Sale: $" + str(metrics['avg_revenue']))
        print("Total Transactions: " + str(metrics['total_transactions']))
        print()
        
        # Product breakdown
        product_sales = {}
        for item in self.data:
            product = item['product']
            if product not in product_sales:
                product_sales[product] = 0
            product_sales[product] += item['revenue']
        
        print("Product Performance:")
        for product, revenue in sorted(product_sales.items(), key=lambda x: x[1], reverse=True):
            print("  " + product + ": $" + str(round(revenue, 2)))
        
        print("\\\\n✅ Dashboard generated successfully!")
        return metrics

# Run the analytics
dashboard = SimpleAnalytics()
dashboard.generate_sample_data()
print("📊 Generated 50 sample sales records")
metrics = dashboard.generate_report()

# Validation
if metrics['total_transactions'] == 50:
    print("✅ Validation: Correct number of transactions")
else:
    print("❌ Validation: Transaction count mismatch")

print("\\\\n🎉 Analytics dashboard ready!")`;

        const result = await e2bService.executeCode(analyticsCode, 'python');

        // Verify execution
        if (result.error) {
          throw new Error(`Analytics execution failed: ${result.error.value}`);
        }

        // Verify expected outputs
        const expectedOutputs = [
          'SALES ANALYTICS DASHBOARD',
          'Total Revenue:',
          'Total Quantity Sold:',
          'Product Performance:',
          'Analytics dashboard ready!'
        ];

        const output = result.logs.stdout.join('\n');
        for (const expected of expectedOutputs) {
          if (!output.includes(expected)) {
            throw new Error(`Expected output '${expected}' not found in result`);
          }
        }

        elizaLogger.info('✅ Simple Data Analytics scenario completed successfully');
      },
    },

    {
      name: 'Scenario 3: Build a Task Management System (JavaScript)',
      fn: async (runtime: IAgentRuntime) => {
        elizaLogger.info('📋 Testing Task Management System scenario...');

        const e2bService = runtime.getService<E2BService>('e2b');
        if (!e2bService) throw new Error('E2B service not available');

        // User request: "Build a simple task management system in JavaScript"

        const taskManagerCode = `// Simple Task Management System
class TaskManager {
    constructor() {
        this.tasks = [];
        this.nextId = 1;
    }
    
    addTask(title, priority = 'medium') {
        const task = {
            id: this.nextId++,
            title: title,
            priority: priority,
            status: 'pending',
            createdAt: new Date().toISOString(),
            completedAt: null
        };
        
        this.tasks.push(task);
        console.log('✅ Added task: "' + title + '" with priority ' + priority);
        return task;
    }
    
    completeTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            console.log('❌ Task with ID ' + taskId + ' not found');
            return null;
        }
        
        task.status = 'completed';
        task.completedAt = new Date().toISOString();
        console.log('✅ Completed task: "' + task.title + '"');
        return task;
    }
    
    listTasks() {
        console.log('\\\\n=== TASK MANAGEMENT SYSTEM ===');
        console.log('Total tasks: ' + this.tasks.length);
        
        const pending = this.tasks.filter(t => t.status === 'pending');
        const completed = this.tasks.filter(t => t.status === 'completed');
        
        console.log('Pending: ' + pending.length + ', Completed: ' + completed.length);
        console.log('\\\\nTask List:');
        
        this.tasks.forEach(task => {
            const status = task.status === 'completed' ? '✅' : '⏳';
            console.log('  ' + status + ' [' + task.id + '] ' + task.title + ' (Priority: ' + task.priority + ')');
        });
        
        return {
            total: this.tasks.length,
            pending: pending.length,
            completed: completed.length
        };
    }
    
    getTasksByPriority(priority) {
        return this.tasks.filter(task => task.priority === priority);
    }
}

// Demo usage
const taskManager = new TaskManager();

console.log('🚀 Starting Task Management System Demo');

// Add some tasks
taskManager.addTask('Complete project proposal', 'high');
taskManager.addTask('Review code changes', 'medium');
taskManager.addTask('Update documentation', 'low');
taskManager.addTask('Schedule team meeting', 'high');
taskManager.addTask('Fix bug in login system', 'high');

// Complete some tasks
taskManager.completeTask(1);
taskManager.completeTask(3);

// List all tasks
const summary = taskManager.listTasks();

// Get high priority tasks
const highPriorityTasks = taskManager.getTasksByPriority('high');
console.log('\\\\nHigh priority tasks: ' + highPriorityTasks.length);

// Validation tests
console.log('\\\\n🧪 VALIDATION TESTS');
let testsPassed = 0;
let totalTests = 3;

// Test 1: Task creation
if (taskManager.tasks.length === 5) {
    console.log('✅ Test 1: Task creation - PASSED');
    testsPassed++;
} else {
    console.log('❌ Test 1: Task creation - FAILED (Expected 5, got ' + taskManager.tasks.length + ')');
}

// Test 2: Task completion
if (summary.completed === 2) {
    console.log('✅ Test 2: Task completion - PASSED');
    testsPassed++;
} else {
    console.log('❌ Test 2: Task completion - FAILED (Expected 2, got ' + summary.completed + ')');
}

// Test 3: Priority filtering
if (highPriorityTasks.length === 2) {
    console.log('✅ Test 3: Priority filtering - PASSED');
    testsPassed++;
} else {
    console.log('❌ Test 3: Priority filtering - FAILED (Expected 2, got ' + highPriorityTasks.length + ')');
}

if (testsPassed === totalTests) {
    console.log('\\\\n🎉 All tests passed! Task manager is working correctly.');
} else {
    console.log('\\\\n⚠️ ' + (totalTests - testsPassed) + ' test(s) failed. Please review the implementation.');
}

console.log('\\\\n📋 Task Management System ready for use!');`;

        const result = await e2bService.executeCode(taskManagerCode, 'javascript');

        // Verify execution
        if (result.error) {
          throw new Error(`Task manager execution failed: ${result.error.value}`);
        }

        // Verify expected outputs
        const expectedOutputs = [
          'TASK MANAGEMENT SYSTEM',
          'Added task:',
          'Completed task:',
          'Total tasks: 5',
          'All tests passed! Task manager is working correctly'
        ];

        const output = result.logs.stdout.join('\n');
        for (const expected of expectedOutputs) {
          if (!output.includes(expected)) {
            throw new Error(`Expected output '${expected}' not found in result`);
          }
        }

        elizaLogger.info('✅ Task Management System scenario completed successfully');
      },
    },
  ];
}

export default new RealWorldScenariosE2ETestSuite();