#![no_std]

//! UseKollo savings-goal contract.
//!
//! Implements /docs/02-smart-contract-spec.md. This file is the source of
//! truth for goal state; see that spec for the rationale behind each design
//! decision referenced in comments below (sections are cited as "spec §N").

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
    String, Vec,
};

/// Cap on goal name length in bytes (spec §6 — unbounded strings inflate
/// storage rent and resource cost, and the UI doesn't need long names).
const MAX_NAME_LEN: u32 = 64;

// Persistent storage is archived once its TTL runs out. Every write bumps the
// touched entries back up to ~30 days whenever they have fallen below ~15, so
// a goal cannot be archived out from under an owner still saving into it.
const LEDGERS_PER_DAY: u32 = 17_280; // ~5s per ledger
const TTL_THRESHOLD: u32 = LEDGERS_PER_DAY * 15;
const TTL_EXTEND_TO: u32 = LEDGERS_PER_DAY * 30;

// -- events ---------------------------------------------------------------
//
// Every event is published under the fixed topic pair ("goal", <verb>) plus
// the owner, so the off-chain indexer subscribes with a single topic filter,
// switches on the verb, and can additionally narrow to one account. Each verb
// must stay inside the 9-character Symbol limit — the previous CamelCase
// topics ("GoalCreated", "GoalCompleted") exceeded it and would not compile.
//
// The payload is a map keyed by field name rather than a positional tuple, so
// adding a field later does not silently shift what the indexer reads.

#[contractevent(topics = ["goal", "created"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GoalCreated {
    #[topic]
    pub owner: Address,
    pub goal_id: u64,
    pub asset: Address,
    pub target_amount: i128,
    pub target_date: u64,
}

#[contractevent(topics = ["goal", "deposit"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GoalDeposit {
    #[topic]
    pub owner: Address,
    pub goal_id: u64,
    pub amount: i128,
    pub new_amount: i128,
}

#[contractevent(topics = ["goal", "withdraw"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GoalWithdrawal {
    #[topic]
    pub owner: Address,
    pub goal_id: u64,
    pub amount: i128,
    pub new_amount: i128,
}

/// Fires once, on the deposit that first takes a goal to its target — not on
/// every subsequent deposit while it stays there.
#[contractevent(topics = ["goal", "completed"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GoalCompleted {
    #[topic]
    pub owner: Address,
    pub goal_id: u64,
    pub total_amount: i128,
}

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Admin,
    AssetAllowlist,
    NextGoalId,
    Goal(u64),
    UserGoals(Address),
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum GoalStatus {
    Active,
    Completed,
    Withdrawn,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Goal {
    pub id: u64,
    pub owner: Address,
    pub name: String,
    pub asset: Address,
    pub target_amount: i128,
    pub current_amount: i128,
    pub target_date: u64,
    pub status: GoalStatus,
    pub created_at: u64,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    NotFound = 3,
    Unauthorized = 4,
    InvalidAmount = 5,
    InvalidAsset = 6,
    InvalidTargetDate = 7,
    InsufficientBalance = 8,
    Overflow = 9,
    NameTooLong = 10,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    /// One-time setup. Sets the admin (who may extend the asset allowlist,
    /// see spec §5) and the initial allowlist.
    pub fn initialize(env: Env, admin: Address, allowed_assets: Vec<Address>) -> Result<(), Error> {
        admin.require_auth();

        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::AssetAllowlist, &allowed_assets);
        // Goal ids are 1-based: 0 is reserved as "no goal", so a caller can
        // never mistake an uninitialised default for a real id.
        env.storage().instance().set(&DataKey::NextGoalId, &1u64);

        Ok(())
    }

    /// Admin-gated. Adds one more asset contract address to the allowlist
    /// (spec §5) without redeploying the contract.
    pub fn add_allowed_asset(env: Env, admin: Address, asset: Address) -> Result<(), Error> {
        admin.require_auth();

        let stored_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if stored_admin != admin {
            return Err(Error::Unauthorized);
        }

        let mut allowlist = Self::allowlist(&env)?;
        if !allowlist.contains(&asset) {
            allowlist.push_back(asset);
            env.storage()
                .instance()
                .set(&DataKey::AssetAllowlist, &allowlist);
        }

        Ok(())
    }

    /// Read-only view of the allowlist, so the app can populate its asset
    /// picker from the chain rather than from a hardcoded list.
    pub fn get_allowed_assets(env: Env) -> Result<Vec<Address>, Error> {
        Self::allowlist(&env)
    }

    /// Creates a new savings goal owned by `owner`. See spec §2.
    pub fn create_goal(
        env: Env,
        owner: Address,
        name: String,
        asset: Address,
        target_amount: i128,
        target_date: u64,
    ) -> Result<u64, Error> {
        owner.require_auth();

        if target_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if name.len() > MAX_NAME_LEN {
            return Err(Error::NameTooLong);
        }
        if target_date <= env.ledger().timestamp() {
            return Err(Error::InvalidTargetDate);
        }

        let allowlist = Self::allowlist(&env)?;
        if !allowlist.contains(&asset) {
            return Err(Error::InvalidAsset);
        }

        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextGoalId)
            .unwrap_or(1);
        let next_id = id.checked_add(1).ok_or(Error::Overflow)?;
        env.storage().instance().set(&DataKey::NextGoalId, &next_id);

        let goal = Goal {
            id,
            owner: owner.clone(),
            name,
            asset: asset.clone(),
            target_amount,
            current_amount: 0,
            target_date,
            // Always Active at creation, regardless of current_amount == 0 —
            // see spec §3: Withdrawn only ever means "money was taken out",
            // never "no money was ever added."
            status: GoalStatus::Active,
            created_at: env.ledger().timestamp(),
        };
        env.storage().persistent().set(&DataKey::Goal(id), &goal);

        let mut user_goals = Self::user_goal_ids(&env, &owner);
        user_goals.push_back(id);
        env.storage()
            .persistent()
            .set(&DataKey::UserGoals(owner.clone()), &user_goals);

        Self::bump_ttl(&env, id, &owner);

        GoalCreated {
            owner: owner.clone(),
            goal_id: id,
            asset: asset.clone(),
            target_amount,
            target_date,
        }
        .publish(&env);

        Ok(id)
    }

    /// Adds `amount` of the goal's asset from the owner's wallet into the
    /// contract's custody, crediting the goal. See spec §2.
    pub fn deposit(env: Env, owner: Address, goal_id: u64, amount: i128) -> Result<(), Error> {
        owner.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut goal = Self::load_goal(&env, goal_id)?;
        if goal.owner != owner {
            return Err(Error::Unauthorized);
        }

        let new_amount = goal
            .current_amount
            .checked_add(amount)
            .ok_or(Error::Overflow)?;

        // Effects before interactions (spec §2): storage is updated before
        // the external token transfer. If the transfer subsequently fails,
        // Soroban aborts the whole transaction and none of this is
        // committed, but ordering it this way costs nothing and removes a
        // whole class of doubt during review.
        goal.current_amount = new_amount;
        let was_completed = goal.status == GoalStatus::Completed;
        goal.status = Self::status_after_deposit(new_amount, goal.target_amount);
        let just_completed = !was_completed && goal.status == GoalStatus::Completed;
        env.storage().persistent().set(&DataKey::Goal(goal_id), &goal);

        Self::bump_ttl(&env, goal_id, &owner);

        token::Client::new(&env, &goal.asset).transfer(
            &owner,
            &env.current_contract_address(),
            &amount,
        );

        GoalDeposit {
            owner: owner.clone(),
            goal_id,
            amount,
            new_amount,
        }
        .publish(&env);

        if just_completed {
            GoalCompleted {
                owner: owner.clone(),
                goal_id,
                total_amount: new_amount,
            }
            .publish(&env);
        }

        Ok(())
    }

    /// Withdraws `amount` of the goal's asset from the contract's custody
    /// back to the owner's wallet, debiting the goal. See spec §2.
    pub fn withdraw(env: Env, owner: Address, goal_id: u64, amount: i128) -> Result<(), Error> {
        owner.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut goal = Self::load_goal(&env, goal_id)?;
        if goal.owner != owner {
            return Err(Error::Unauthorized);
        }
        if amount > goal.current_amount {
            return Err(Error::InsufficientBalance);
        }

        let new_amount = goal
            .current_amount
            .checked_sub(amount)
            .ok_or(Error::Overflow)?;

        goal.current_amount = new_amount;
        goal.status = Self::status_after_withdrawal(new_amount, goal.target_amount);
        env.storage().persistent().set(&DataKey::Goal(goal_id), &goal);

        Self::bump_ttl(&env, goal_id, &owner);

        token::Client::new(&env, &goal.asset).transfer(
            &env.current_contract_address(),
            &owner,
            &amount,
        );

        GoalWithdrawal {
            owner: owner.clone(),
            goal_id,
            amount,
            new_amount,
        }
        .publish(&env);

        Ok(())
    }

    /// Read-only. No auth required — a goal's data isn't sensitive; it's
    /// already public on-chain (spec §2).
    pub fn get_goal(env: Env, goal_id: u64) -> Result<Goal, Error> {
        Self::load_goal(&env, goal_id)
    }

    /// Read-only list of goal IDs owned by `owner`. No auth required.
    pub fn get_user_goals(env: Env, owner: Address) -> Vec<u64> {
        Self::user_goal_ids(&env, &owner)
    }

    /// Read-only. Every goal owned by `owner`, resolved in a single call so
    /// the dashboard costs one RPC round trip rather than one per goal id.
    pub fn get_goals(env: Env, owner: Address) -> Vec<Goal> {
        let ids = Self::user_goal_ids(&env, &owner);
        let mut goals = Vec::new(&env);

        for id in ids.iter() {
            if let Some(goal) = env
                .storage()
                .persistent()
                .get::<DataKey, Goal>(&DataKey::Goal(id))
            {
                goals.push_back(goal);
            }
        }

        goals
    }

    // -- internal helpers -----------------------------------------------

    fn load_goal(env: &Env, goal_id: u64) -> Result<Goal, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Goal(goal_id))
            .ok_or(Error::NotFound)
    }

    fn user_goal_ids(env: &Env, owner: &Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::UserGoals(owner.clone()))
            .unwrap_or(Vec::new(env))
    }

    fn allowlist(env: &Env) -> Result<Vec<Address>, Error> {
        env.storage()
            .instance()
            .get(&DataKey::AssetAllowlist)
            .ok_or(Error::NotInitialized)
    }

    /// Called from every state-changing entrypoint, on exactly the entries
    /// that entrypoint touched, so an actively used goal never expires.
    fn bump_ttl(env: &Env, goal_id: u64, owner: &Address) {
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND_TO);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Goal(goal_id), TTL_THRESHOLD, TTL_EXTEND_TO);
        env.storage().persistent().extend_ttl(
            &DataKey::UserGoals(owner.clone()),
            TTL_THRESHOLD,
            TTL_EXTEND_TO,
        );
    }

    /// Status after a balance-*increasing* operation. Deliberately cannot
    /// yield Withdrawn: a deposit into a previously emptied goal revives it
    /// rather than leaving it labelled withdrawn (spec §3 decision 2).
    fn status_after_deposit(current_amount: i128, target_amount: i128) -> GoalStatus {
        if current_amount >= target_amount {
            GoalStatus::Completed
        } else {
            GoalStatus::Active
        }
    }

    /// Status after a balance-*decreasing* operation. This is the only path
    /// that can yield Withdrawn, which is what keeps "emptied by its owner"
    /// distinguishable from "never funded" — a goal sitting at 0 because
    /// nobody has deposited into it yet stays Active (spec §3 decision 3).
    fn status_after_withdrawal(current_amount: i128, target_amount: i128) -> GoalStatus {
        if current_amount <= 0 {
            GoalStatus::Withdrawn
        } else if current_amount >= target_amount {
            GoalStatus::Completed
        } else {
            GoalStatus::Active
        }
    }
}

mod test;
