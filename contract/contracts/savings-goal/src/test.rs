#![cfg(test)]

//! Tests for the savings-goal contract.
//!
//! Two things worth knowing before reading these:
//!
//! 1. The generated client exposes each entrypoint twice. `client.deposit(..)`
//!    returns the success type and panics on a contract error; `try_deposit(..)`
//!    returns `Result<Result<T, _>, Result<Error, _>>` and is what the failure
//!    cases below assert against. An earlier revision of this file called
//!    `.unwrap()` on the non-`try_` form, which does not compile — none of
//!    these tests had ever run.
//! 2. Deposits and withdrawals move real tokens, so the suite registers an
//!    actual Stellar Asset Contract and mints to the owner rather than
//!    stopping at the guard clauses. `assert_balances` pins down the
//!    invariant that matters most: every unit credited to a goal is a unit
//!    actually held in the contract's custody.

use super::*;
use soroban_sdk::testutils::{Address as _, Events as _, Ledger as _};
use soroban_sdk::{vec, Env};

// A fixed, non-zero "now". The Env default of 0 makes every target date look
// like it is in the past, which is what the date guards key off.
const NOW: u64 = 1_700_000_000;
const FUTURE: u64 = NOW + 86_400 * 30;

// 64 bytes exactly — the MAX_NAME_LEN boundary. Written out rather than built
// with `"a".repeat(64)` because that needs std, which a `#![no_std]` crate
// does not link.
const NAME_64: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const NAME_65: &str = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

struct Harness<'a> {
    env: Env,
    admin: Address,
    token: Address,
    token_admin: token::StellarAssetClient<'a>,
    token_client: token::Client<'a>,
    client: ContractClient<'a>,
    contract_id: Address,
}

impl<'a> Harness<'a> {
    fn goal_name(&self, name: &str) -> String {
        String::from_str(&self.env, name)
    }

    /// Asserts the goal's bookkeeping and the contract's real token balance
    /// agree, which is the core solvency invariant.
    fn assert_balances(&self, goal_id: u64, expected_credited: i128, owner: &Address, expected_owner: i128) {
        let goal = self.client.get_goal(&goal_id);
        assert_eq!(goal.current_amount, expected_credited, "goal bookkeeping");
        assert_eq!(
            self.token_client.balance(&self.contract_id),
            expected_credited,
            "contract custody"
        );
        assert_eq!(self.token_client.balance(owner), expected_owner, "owner wallet");
    }
}

fn setup<'a>() -> Harness<'a> {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(NOW);

    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();

    // Constructor args, supplied at deploy — there is no separate initialize
    // call to make any more.
    let contract_id = env.register(Contract, (admin.clone(), vec![&env, token.clone()]));
    let client = ContractClient::new(&env, &contract_id);

    Harness {
        token_admin: token::StellarAssetClient::new(&env, &token),
        token_client: token::Client::new(&env, &token),
        env,
        admin,
        token,
        client,
        contract_id,
    }
}

/// An owner with `funded` units of the allowlisted asset already in hand.
fn funded_owner(h: &Harness, funded: i128) -> Address {
    let owner = Address::generate(&h.env);
    h.token_admin.mint(&owner, &funded);
    owner
}

// -- constructor ---------------------------------------------------------

#[test]
fn constructor_sets_admin_and_allowlist() {
    let h = setup();
    let allowed = h.client.get_allowed_assets();

    assert_eq!(allowed.len(), 1);
    assert!(allowed.contains(&h.token));
}

// `initialize_is_one_time_only` and `entrypoints_reject_calls_before_initialize`
// used to live here. Both tested a callable `initialize`, which no longer
// exists: setup is a constructor, so the contract cannot be initialised twice
// and cannot be observed uninitialised. The states they asserted on are now
// unrepresentable rather than merely rejected.

/// Naming an address as admin is not enough — it has to actually sign the
/// deploy. This is what stops a third party from deploying a copy that claims
/// someone else as its admin.
#[test]
#[should_panic]
fn constructor_rejects_a_deploy_the_admin_did_not_authorise() {
    let env = Env::default();
    env.ledger().set_timestamp(NOW);

    let admin = Address::generate(&env);
    let asset = Address::generate(&env);

    // Deliberately no mock_all_auths: require_auth in the constructor must
    // reject this deploy.
    env.register(Contract, (admin.clone(), vec![&env, asset.clone()]));
}

// -- create_goal ---------------------------------------------------------

#[test]
fn create_goal_stores_every_field() {
    let h = setup();
    let owner = funded_owner(&h, 0);

    let id = h
        .client
        .create_goal(&owner, &h.goal_name("New Laptop"), &h.token, &500, &FUTURE);

    let goal = h.client.get_goal(&id);
    assert_eq!(goal.id, id);
    assert_eq!(goal.owner, owner);
    assert_eq!(goal.name, h.goal_name("New Laptop"));
    assert_eq!(goal.asset, h.token);
    assert_eq!(goal.target_amount, 500);
    assert_eq!(goal.current_amount, 0);
    assert_eq!(goal.target_date, FUTURE);
    assert_eq!(goal.created_at, NOW);
    // Active, not Withdrawn, despite a zero balance — see status_after_withdrawal.
    assert_eq!(goal.status, GoalStatus::Active);
}

#[test]
fn create_goal_ids_are_one_based_and_sequential() {
    let h = setup();
    let owner = funded_owner(&h, 0);

    let first = h.client.create_goal(&owner, &h.goal_name("1"), &h.token, &100, &FUTURE);
    let second = h.client.create_goal(&owner, &h.goal_name("2"), &h.token, &200, &FUTURE);
    let third = h.client.create_goal(&owner, &h.goal_name("3"), &h.token, &300, &FUTURE);

    // 0 is reserved for "no goal", so the first real id is 1.
    assert_eq!((first, second, third), (1, 2, 3));
}

#[test]
fn create_goal_rejects_non_positive_target() {
    let h = setup();
    let owner = funded_owner(&h, 0);

    for bad in [0i128, -1i128] {
        assert_eq!(
            h.client
                .try_create_goal(&owner, &h.goal_name("x"), &h.token, &bad, &FUTURE)
                .unwrap_err()
                .unwrap(),
            Error::InvalidAmount
        );
    }
}

#[test]
fn create_goal_rejects_asset_off_the_allowlist() {
    let h = setup();
    let owner = funded_owner(&h, 0);
    let rogue = Address::generate(&h.env);

    assert_eq!(
        h.client
            .try_create_goal(&owner, &h.goal_name("x"), &rogue, &100, &FUTURE)
            .unwrap_err()
            .unwrap(),
        Error::InvalidAsset
    );
}

#[test]
fn create_goal_rejects_target_date_at_or_before_now() {
    let h = setup();
    let owner = funded_owner(&h, 0);

    for bad in [NOW, NOW - 1] {
        assert_eq!(
            h.client
                .try_create_goal(&owner, &h.goal_name("x"), &h.token, &100, &bad)
                .unwrap_err()
                .unwrap(),
            Error::InvalidTargetDate
        );
    }
}

#[test]
fn create_goal_enforces_the_name_length_boundary() {
    let h = setup();
    let owner = funded_owner(&h, 0);

    assert!(h
        .client
        .try_create_goal(&owner, &h.goal_name(NAME_64), &h.token, &100, &FUTURE)
        .is_ok());

    assert_eq!(
        h.client
            .try_create_goal(&owner, &h.goal_name(NAME_65), &h.token, &100, &FUTURE)
            .unwrap_err()
            .unwrap(),
        Error::NameTooLong
    );
}

// -- deposit -------------------------------------------------------------

#[test]
fn deposit_moves_tokens_into_contract_custody() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Laptop"), &h.token, &500, &FUTURE);

    h.client.deposit(&owner, &id, &200);

    h.assert_balances(id, 200, &owner, 800);
    assert_eq!(h.client.get_goal(&id).status, GoalStatus::Active);
}

#[test]
fn deposit_accumulates_across_calls() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Laptop"), &h.token, &500, &FUTURE);

    h.client.deposit(&owner, &id, &100);
    h.client.deposit(&owner, &id, &150);

    h.assert_balances(id, 250, &owner, 750);
}

#[test]
fn deposit_reaching_target_completes_the_goal() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Laptop"), &h.token, &500, &FUTURE);

    h.client.deposit(&owner, &id, &500);

    assert_eq!(h.client.get_goal(&id).status, GoalStatus::Completed);
}

#[test]
fn deposit_overshooting_target_still_completes_and_credits_the_excess() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Laptop"), &h.token, &500, &FUTURE);

    h.client.deposit(&owner, &id, &600);

    h.assert_balances(id, 600, &owner, 400);
    assert_eq!(h.client.get_goal(&id).status, GoalStatus::Completed);
}

#[test]
fn deposit_emits_a_completed_event_only_on_the_crossing_deposit() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Laptop"), &h.token, &500, &FUTURE);

    // Short of the target: the deposit event alone.
    h.client.deposit(&owner, &id, &400);
    assert_eq!(our_events(&h), 1, "deposit below target");

    // The deposit that reaches the target: deposit *and* completed.
    h.client.deposit(&owner, &id, &100);
    assert_eq!(our_events(&h), 2, "deposit reaching target");

    // Already Completed, so staying there must not re-announce it.
    h.client.deposit(&owner, &id, &100);
    assert_eq!(our_events(&h), 1, "deposit while already complete");
}

/// Events emitted by the savings-goal contract during the most recent
/// invocation. `env.events().all()` is scoped to that invocation rather than
/// accumulating over the test, so these are absolute counts, not deltas. The
/// token contract emits its own transfer events into the same log, hence the
/// filter.
fn our_events(h: &Harness) -> usize {
    h.env
        .events()
        .all()
        .filter_by_contract(&h.contract_id)
        .events()
        .len()
}

#[test]
fn deposit_rejects_non_positive_amounts() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Goal"), &h.token, &100, &FUTURE);

    for bad in [0i128, -1i128] {
        assert_eq!(
            h.client.try_deposit(&owner, &id, &bad).unwrap_err().unwrap(),
            Error::InvalidAmount
        );
    }
}

#[test]
fn deposit_rejects_a_non_owner() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let stranger = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Goal"), &h.token, &100, &FUTURE);

    assert_eq!(
        h.client.try_deposit(&stranger, &id, &50).unwrap_err().unwrap(),
        Error::Unauthorized
    );
    // The stranger's money stayed put.
    assert_eq!(h.token_client.balance(&stranger), 1_000);
}

#[test]
fn deposit_rejects_an_unknown_goal() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);

    assert_eq!(
        h.client.try_deposit(&owner, &999, &50).unwrap_err().unwrap(),
        Error::NotFound
    );
}

// -- withdraw ------------------------------------------------------------

#[test]
fn withdraw_returns_tokens_to_the_owner() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Laptop"), &h.token, &500, &FUTURE);
    h.client.deposit(&owner, &id, &400);

    h.client.withdraw(&owner, &id, &150);

    h.assert_balances(id, 250, &owner, 750);
    assert_eq!(h.client.get_goal(&id).status, GoalStatus::Active);
}

#[test]
fn withdrawing_everything_marks_the_goal_withdrawn() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Laptop"), &h.token, &500, &FUTURE);
    h.client.deposit(&owner, &id, &500);

    h.client.withdraw(&owner, &id, &500);

    h.assert_balances(id, 0, &owner, 1_000);
    assert_eq!(h.client.get_goal(&id).status, GoalStatus::Withdrawn);
}

#[test]
fn partial_withdrawal_below_target_reopens_a_completed_goal() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Laptop"), &h.token, &500, &FUTURE);
    h.client.deposit(&owner, &id, &500);
    assert_eq!(h.client.get_goal(&id).status, GoalStatus::Completed);

    h.client.withdraw(&owner, &id, &1);

    assert_eq!(h.client.get_goal(&id).status, GoalStatus::Active);
}

#[test]
fn depositing_into_a_withdrawn_goal_revives_it() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Laptop"), &h.token, &500, &FUTURE);
    h.client.deposit(&owner, &id, &200);
    h.client.withdraw(&owner, &id, &200);
    assert_eq!(h.client.get_goal(&id).status, GoalStatus::Withdrawn);

    h.client.deposit(&owner, &id, &50);

    // Back to Active rather than stuck reading as Withdrawn while holding funds.
    assert_eq!(h.client.get_goal(&id).status, GoalStatus::Active);
    h.assert_balances(id, 50, &owner, 950);
}

#[test]
fn withdraw_rejects_more_than_the_goal_holds() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Goal"), &h.token, &500, &FUTURE);
    h.client.deposit(&owner, &id, &100);

    assert_eq!(
        h.client.try_withdraw(&owner, &id, &101).unwrap_err().unwrap(),
        Error::InsufficientBalance
    );
    h.assert_balances(id, 100, &owner, 900);
}

#[test]
fn withdraw_rejects_non_positive_amounts() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let id = h.client.create_goal(&owner, &h.goal_name("Goal"), &h.token, &100, &FUTURE);

    for bad in [0i128, -1i128] {
        assert_eq!(
            h.client.try_withdraw(&owner, &id, &bad).unwrap_err().unwrap(),
            Error::InvalidAmount
        );
    }
}

#[test]
fn withdraw_rejects_a_non_owner() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let stranger = Address::generate(&h.env);
    let id = h.client.create_goal(&owner, &h.goal_name("Goal"), &h.token, &500, &FUTURE);
    h.client.deposit(&owner, &id, &300);

    assert_eq!(
        h.client.try_withdraw(&stranger, &id, &300).unwrap_err().unwrap(),
        Error::Unauthorized
    );
    // The funds are still in custody, not drained to the stranger.
    assert_eq!(h.token_client.balance(&h.contract_id), 300);
    assert_eq!(h.token_client.balance(&stranger), 0);
}

#[test]
fn withdraw_rejects_an_unknown_goal() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);

    assert_eq!(
        h.client.try_withdraw(&owner, &999, &50).unwrap_err().unwrap(),
        Error::NotFound
    );
}

// -- reads ---------------------------------------------------------------

#[test]
fn get_goal_rejects_an_unknown_id() {
    let h = setup();

    assert_eq!(h.client.try_get_goal(&42).unwrap_err().unwrap(), Error::NotFound);
}

#[test]
fn get_user_goals_is_scoped_per_owner() {
    let h = setup();
    let alice = funded_owner(&h, 0);
    let bob = funded_owner(&h, 0);

    let a1 = h.client.create_goal(&alice, &h.goal_name("Alice"), &h.token, &100, &FUTURE);
    let b1 = h.client.create_goal(&bob, &h.goal_name("Bob"), &h.token, &200, &FUTURE);

    let alice_ids = h.client.get_user_goals(&alice);
    let bob_ids = h.client.get_user_goals(&bob);

    assert_eq!(alice_ids.len(), 1);
    assert!(alice_ids.contains(&a1) && !alice_ids.contains(&b1));
    assert_eq!(bob_ids.len(), 1);
    assert!(bob_ids.contains(&b1) && !bob_ids.contains(&a1));
}

#[test]
fn get_user_goals_is_empty_for_a_new_address() {
    let h = setup();
    let stranger = Address::generate(&h.env);

    assert_eq!(h.client.get_user_goals(&stranger).len(), 0);
}

#[test]
fn get_goals_resolves_full_records_in_one_call() {
    let h = setup();
    let owner = funded_owner(&h, 1_000);
    let first = h.client.create_goal(&owner, &h.goal_name("One"), &h.token, &100, &FUTURE);
    h.client.create_goal(&owner, &h.goal_name("Two"), &h.token, &200, &FUTURE);
    h.client.deposit(&owner, &first, &100);

    let goals = h.client.get_goals(&owner);

    assert_eq!(goals.len(), 2);
    let one = goals.get(0).unwrap();
    assert_eq!(one.name, h.goal_name("One"));
    assert_eq!(one.current_amount, 100);
    assert_eq!(one.status, GoalStatus::Completed);
    assert_eq!(goals.get(1).unwrap().name, h.goal_name("Two"));
}

#[test]
fn reads_do_not_require_auth() {
    let h = setup();
    let owner = funded_owner(&h, 0);
    let id = h.client.create_goal(&owner, &h.goal_name("Test"), &h.token, &100, &FUTURE);

    h.env.set_auths(&[]);

    assert_eq!(h.client.get_goal(&id).id, id);
    assert_eq!(h.client.get_user_goals(&owner).len(), 1);
    assert_eq!(h.client.get_goals(&owner).len(), 1);
}

// -- allowlist administration --------------------------------------------

#[test]
fn add_allowed_asset_widens_the_allowlist() {
    let h = setup();
    let owner = funded_owner(&h, 0);
    let second = env_sac(&h);

    h.client.add_allowed_asset(&h.admin, &second);

    let allowed = h.client.get_allowed_assets();
    assert_eq!(allowed.len(), 2);
    assert!(allowed.contains(&h.token) && allowed.contains(&second));

    // And the new asset is immediately usable.
    assert!(h
        .client
        .try_create_goal(&owner, &h.goal_name("x"), &second, &100, &FUTURE)
        .is_ok());
}

fn env_sac(h: &Harness) -> Address {
    h.env
        .register_stellar_asset_contract_v2(h.admin.clone())
        .address()
}

#[test]
fn add_allowed_asset_rejects_a_non_admin() {
    let h = setup();
    let stranger = Address::generate(&h.env);
    let second = env_sac(&h);

    assert_eq!(
        h.client
            .try_add_allowed_asset(&stranger, &second)
            .unwrap_err()
            .unwrap(),
        Error::Unauthorized
    );
    assert_eq!(h.client.get_allowed_assets().len(), 1);
}

#[test]
fn add_allowed_asset_is_idempotent() {
    let h = setup();

    h.client.add_allowed_asset(&h.admin, &h.token);

    assert_eq!(h.client.get_allowed_assets().len(), 1);
}

// -- status transition rules ---------------------------------------------
//
// These pin the asymmetry that the two helpers exist to express: only a
// withdrawal can produce Withdrawn. A deposit landing on zero is impossible,
// and a goal that has simply never been funded must not read as withdrawn.

#[test]
fn status_after_deposit_never_yields_withdrawn() {
    assert_eq!(Contract::status_after_deposit(0, 100), GoalStatus::Active);
    assert_eq!(Contract::status_after_deposit(1, 100), GoalStatus::Active);
    assert_eq!(Contract::status_after_deposit(99, 100), GoalStatus::Active);
    assert_eq!(Contract::status_after_deposit(100, 100), GoalStatus::Completed);
    assert_eq!(Contract::status_after_deposit(101, 100), GoalStatus::Completed);
    assert_eq!(
        Contract::status_after_deposit(i128::MAX, 100),
        GoalStatus::Completed
    );
}

#[test]
fn status_after_withdrawal_reserves_withdrawn_for_an_empty_goal() {
    assert_eq!(Contract::status_after_withdrawal(0, 100), GoalStatus::Withdrawn);
    assert_eq!(Contract::status_after_withdrawal(1, 100), GoalStatus::Active);
    assert_eq!(Contract::status_after_withdrawal(99, 100), GoalStatus::Active);
    assert_eq!(
        Contract::status_after_withdrawal(100, 100),
        GoalStatus::Completed
    );
}
