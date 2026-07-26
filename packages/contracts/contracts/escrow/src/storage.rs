//! # Escrow — Storage Layer
//!
//! All persistent/instance storage reads and writes for the escrow contract.
//! No business logic lives here — only raw get/set/has operations plus the
//! type definitions and TTL extension helpers.

use soroban_sdk::{contracttype, Address, Env, Symbol, Vec};

// =============================================================================
// TTL Constants
// =============================================================================

pub const TTL_EXTEND_TO: u32 = 535_000;
pub const TTL_THRESHOLD: u32 = 267_500;

// =============================================================================
// Types
// =============================================================================

/// Escrow lifecycle state.
#[contracttype]
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum EscrowState {
    /// Funds locked; awaiting release or cancellation.
    Active = 0,
    /// Funds released to the beneficiary.
    Released = 1,
    /// Funds refunded to the depositor.
    Cancelled = 2,
    /// Dispute filed; awaiting arbitrator decision.
    Disputed = 3,
}

/// On-chain escrow record.
#[contracttype]
#[derive(Clone)]
pub struct EscrowRecord {
    /// Unique escrow identifier.
    pub id: Symbol,
    /// Address that deposited funds.
    pub depositor: Address,
    /// Address that receives funds on release.
    pub beneficiary: Address,
    /// Token contract address.
    pub token: Address,
    /// Locked amount in smallest token units.
    pub amount: i128,
    /// Unix timestamp after which depositor may cancel unilaterally.
    pub expiry: u64,
    /// Current state.
    pub state: EscrowState,
    /// Ledger sequence when escrow was created.
    pub created_at: u32,
    /// Ledger sequence of last state change.
    pub updated_at: u32,
}

/// Storage keys.
#[contracttype]
pub enum DataKey {
    /// Instance — initialisation flag.
    Initialized,
    /// Instance — paused flag.
    Paused,
    /// Persistent — admin address.
    Admin,
    /// Persistent — role member lists.
    RoleMembers(u64),
    /// Persistent — escrow record by id.
    Escrow(Symbol),
    /// Persistent — ordered list of all escrow ids.
    EscrowList,
    /// Persistent — schema version.
    SchemaVersion,
}

// =============================================================================
// Storage accessors
// =============================================================================

/// Load an escrow record by id. Returns `None` if not found.
pub fn load_escrow(env: &Env, id: &Symbol) -> Option<EscrowRecord> {
    env.storage()
        .persistent()
        .get(&DataKey::Escrow(id.clone()))
}

/// Write an escrow record and extend its TTL.
pub fn save_escrow(env: &Env, record: &EscrowRecord) {
    env.storage()
        .persistent()
        .set(&DataKey::Escrow(record.id.clone()), record);
    extend_escrow_ttl(env, &record.id);
}

/// Extend the TTL on an escrow entry.
pub fn extend_escrow_ttl(env: &Env, id: &Symbol) {
    let key = DataKey::Escrow(id.clone());
    if env.storage().persistent().has(&key) {
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }
}

/// Load the global escrow id list.
pub fn load_escrow_list(env: &Env) -> Vec<Symbol> {
    env.storage()
        .persistent()
        .get(&DataKey::EscrowList)
        .unwrap_or(Vec::new(env))
}

/// Write the global escrow id list.
pub fn save_escrow_list(env: &Env, list: &Vec<Symbol>) {
    env.storage().persistent().set(&DataKey::EscrowList, list);
}

/// Read the admin address.
pub fn load_admin(env: &Env) -> Option<Address> {
    env.storage().persistent().get(&DataKey::Admin)
}

/// Write the admin address.
pub fn save_admin(env: &Env, admin: &Address) {
    env.storage().persistent().set(&DataKey::Admin, admin);
}

/// Read the role member list for a given role id.
pub fn load_role_members(env: &Env, role_id: u64) -> Vec<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::RoleMembers(role_id))
        .unwrap_or(Vec::new(env))
}

/// Write the role member list.
pub fn save_role_members(env: &Env, role_id: u64, members: &Vec<Address>) {
    env.storage()
        .persistent()
        .set(&DataKey::RoleMembers(role_id), members);
}

/// Return `true` if the contract has been initialised.
pub fn is_initialized(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Initialized)
}

/// Mark the contract as initialised.
pub fn set_initialized(env: &Env) {
    env.storage().instance().set(&DataKey::Initialized, &true);
}

/// Return `true` if the contract is paused.
pub fn is_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get::<_, bool>(&DataKey::Paused)
        .unwrap_or(false)
}

/// Set the paused flag.
pub fn set_paused(env: &Env, paused: bool) {
    env.storage().instance().set(&DataKey::Paused, &paused);
}
