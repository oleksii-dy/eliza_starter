import { NearBindgen, call, view, near, initialize } from 'near-sdk-js';

@NearBindgen({})
class EscrowContract {
  constructor() {
    this.owner = '';
    this.escrows = {};
  }

  @initialize({})
  init({ owner }) {
    this.owner = owner;
    near.log(`Contract initialized with owner: ${owner}`);
  }

  @view({})
  get_owner() {
    return this.owner;
  }

  @view({})
  get_escrow({ escrow_id }) {
    return this.escrows[escrow_id] || null;
  }

  @call({ payableFunction: true })
  create_escrow({ escrow_id, parties, total_amount }) {
    near.log(`Creating escrow ${escrow_id} with ${parties.length} parties`);
    
    if (this.escrows[escrow_id]) {
      throw new Error('Escrow already exists');
    }

    // Verify the total amount matches attached deposit
    const attached = near.attachedDeposit();
    if (attached.toString() !== total_amount.toString()) {
      throw new Error(`Attached deposit ${attached} does not match total amount ${total_amount}`);
    }

    // Verify parties amounts sum to total
    let sum = BigInt(0);
    for (const party of parties) {
      sum += BigInt(party.amount);
    }
    
    if (sum.toString() !== total_amount.toString()) {
      throw new Error('Party amounts do not sum to total amount');
    }

    this.escrows[escrow_id] = {
      id: escrow_id,
      parties: parties,
      released: false,
      total_amount: total_amount.toString()
    };

    near.log(`Escrow ${escrow_id} created successfully`);
  }

  @call({})
  release_escrow({ escrow_id }) {
    const escrow = this.escrows[escrow_id];
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.released) {
      throw new Error('Escrow already released');
    }

    // Only owner can release
    const caller = near.predecessorAccountId();
    if (caller !== this.owner) {
      throw new Error('Only owner can release escrow');
    }

    // Transfer funds to parties
    for (const party of escrow.parties) {
      near.log(`Transferring ${party.amount} to ${party.account_id}`);
      const promise = near.promiseBatchCreate(party.account_id);
      near.promiseBatchActionTransfer(promise, BigInt(party.amount));
    }

    escrow.released = true;
    this.escrows[escrow_id] = escrow;
    
    near.log(`Escrow ${escrow_id} released successfully`);
  }

  @call({})
  cancel_escrow({ escrow_id }) {
    const escrow = this.escrows[escrow_id];
    if (!escrow) {
      throw new Error('Escrow not found');
    }

    if (escrow.released) {
      throw new Error('Cannot cancel released escrow');
    }

    // Only owner can cancel
    const caller = near.predecessorAccountId();
    if (caller !== this.owner) {
      throw new Error('Only owner can cancel escrow');
    }

    // Refund to contract owner
    const promise = near.promiseBatchCreate(this.owner);
    near.promiseBatchActionTransfer(promise, BigInt(escrow.total_amount));

    delete this.escrows[escrow_id];
    
    near.log(`Escrow ${escrow_id} cancelled and refunded`);
  }
} 