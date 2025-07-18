import { Worker } from 'near-workspaces';
import { parseNearAmount } from 'near-api-js/lib/utils/format.js';
import test from 'ava';

test.beforeEach(async t => {
  // Init the worker and start a Sandbox server
  const worker = await Worker.init();

  // Deploy contract
  const root = worker.rootAccount;
  const contract = await root.createSubAccount('escrow');
  
  // Deploy the contract
  await contract.deploy(
    './build/escrow.wasm',
  );

  // Initialize the contract
  await contract.call(contract, 'init', { owner: root.accountId });

  // Create test accounts
  const alice = await root.createSubAccount('alice', {
    initialBalance: parseNearAmount('10')
  });
  const bob = await root.createSubAccount('bob', {
    initialBalance: parseNearAmount('10')
  });
  const charlie = await root.createSubAccount('charlie', {
    initialBalance: parseNearAmount('10')
  });

  // Save state for test runs
  t.context.worker = worker;
  t.context.accounts = { root, contract, alice, bob, charlie };
});

test.afterEach(async t => {
  // Stop Sandbox server
  await t.context.worker.tearDown().catch(error => {
    console.log('Failed to stop the Sandbox:', error);
  });
});

test('initializes with correct owner', async t => {
  const { contract, root } = t.context.accounts;
  
  const owner = await contract.view('get_owner');
  t.is(owner, root.accountId);
});

test('creates escrow successfully', async t => {
  const { contract, alice, bob } = t.context.accounts;
  
  const escrowId = 'test-escrow-1';
  const totalAmount = parseNearAmount('2');
  
  // Create escrow
  await alice.call(
    contract,
    'create_escrow',
    {
      escrow_id: escrowId,
      parties: [
        { account_id: alice.accountId, amount: parseNearAmount('1') },
        { account_id: bob.accountId, amount: parseNearAmount('1') }
      ],
      total_amount: totalAmount
    },
    { attachedDeposit: totalAmount }
  );
  
  // Verify escrow was created
  const escrow = await contract.view('get_escrow', { escrow_id: escrowId });
  t.truthy(escrow);
  t.is(escrow.id, escrowId);
  t.is(escrow.parties.length, 2);
  t.is(escrow.total_amount, totalAmount);
  t.false(escrow.released);
});

test('validates attached deposit matches total amount', async t => {
  const { contract, alice, bob } = t.context.accounts;
  
  const escrowId = 'invalid-deposit';
  const totalAmount = parseNearAmount('2');
  
  // Try with wrong deposit amount
  await t.throwsAsync(
    alice.call(
      contract,
      'create_escrow',
      {
        escrow_id: escrowId,
        parties: [
          { account_id: alice.accountId, amount: parseNearAmount('1') },
          { account_id: bob.accountId, amount: parseNearAmount('1') }
        ],
        total_amount: totalAmount
      },
      { attachedDeposit: parseNearAmount('1') } // Wrong amount
    ),
    { message: /does not match total amount/ }
  );
});

test('validates party amounts sum to total', async t => {
  const { contract, alice, bob } = t.context.accounts;
  
  const escrowId = 'invalid-sum';
  const totalAmount = parseNearAmount('2');
  
  // Party amounts don't sum to total
  await t.throwsAsync(
    alice.call(
      contract,
      'create_escrow',
      {
        escrow_id: escrowId,
        parties: [
          { account_id: alice.accountId, amount: parseNearAmount('0.5') },
          { account_id: bob.accountId, amount: parseNearAmount('0.5') } // Sum is 1, not 2
        ],
        total_amount: totalAmount
      },
      { attachedDeposit: totalAmount }
    ),
    { message: /do not sum to total amount/ }
  );
});

test('releases escrow and distributes funds', async t => {
  const { contract, alice, bob, root } = t.context.accounts;
  
  const escrowId = 'release-test';
  const totalAmount = parseNearAmount('2');
  
  // Create escrow
  await alice.call(
    contract,
    'create_escrow',
    {
      escrow_id: escrowId,
      parties: [
        { account_id: alice.accountId, amount: parseNearAmount('1') },
        { account_id: bob.accountId, amount: parseNearAmount('1') }
      ],
      total_amount: totalAmount
    },
    { attachedDeposit: totalAmount }
  );
  
  // Release escrow (as owner)
  await root.call(contract, 'release_escrow', { escrow_id: escrowId });
  
  // Check escrow is marked as released
  const escrow = await contract.view('get_escrow', { escrow_id: escrowId });
  t.true(escrow.released);
});

test('only owner can release escrow', async t => {
  const { contract, alice, bob } = t.context.accounts;
  
  const escrowId = 'auth-test';
  const totalAmount = parseNearAmount('2');
  
  // Create escrow
  await alice.call(
    contract,
    'create_escrow',
    {
      escrow_id: escrowId,
      parties: [
        { account_id: alice.accountId, amount: parseNearAmount('1') },
        { account_id: bob.accountId, amount: parseNearAmount('1') }
      ],
      total_amount: totalAmount
    },
    { attachedDeposit: totalAmount }
  );
  
  // Try to release as non-owner
  await t.throwsAsync(
    alice.call(contract, 'release_escrow', { escrow_id: escrowId }),
    { message: /Only owner can release escrow/ }
  );
});

test('cancels escrow and refunds to owner', async t => {
  const { contract, alice, bob, root } = t.context.accounts;
  
  const escrowId = 'cancel-test';
  const totalAmount = parseNearAmount('2');
  
  // Create escrow
  await alice.call(
    contract,
    'create_escrow',
    {
      escrow_id: escrowId,
      parties: [
        { account_id: alice.accountId, amount: parseNearAmount('1') },
        { account_id: bob.accountId, amount: parseNearAmount('1') }
      ],
      total_amount: totalAmount
    },
    { attachedDeposit: totalAmount }
  );
  
  // Cancel escrow (as owner)
  await root.call(contract, 'cancel_escrow', { escrow_id: escrowId });
  
  // Verify escrow is deleted
  const escrow = await contract.view('get_escrow', { escrow_id: escrowId });
  t.is(escrow, null);
});

test('only owner can cancel escrow', async t => {
  const { contract, alice, bob } = t.context.accounts;
  
  const escrowId = 'cancel-auth-test';
  const totalAmount = parseNearAmount('2');
  
  // Create escrow
  await alice.call(
    contract,
    'create_escrow',
    {
      escrow_id: escrowId,
      parties: [
        { account_id: alice.accountId, amount: parseNearAmount('1') },
        { account_id: bob.accountId, amount: parseNearAmount('1') }
      ],
      total_amount: totalAmount
    },
    { attachedDeposit: totalAmount }
  );
  
  // Try to cancel as non-owner
  await t.throwsAsync(
    alice.call(contract, 'cancel_escrow', { escrow_id: escrowId }),
    { message: /Only owner can cancel escrow/ }
  );
}); 