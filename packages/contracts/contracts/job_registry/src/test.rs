//! Tests for the job-registry contract (issue #1018).
//! Verifies that the public interface is unchanged after the modular refactor.

#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env, Symbol};

fn zero_hash(env: &Env) -> BytesN<32> {
    BytesN::from_array(env, &[0u8; 32])
}

fn setup(env: &Env) -> (Address, Address, JobRegistryContractClient) {
    env.mock_all_auths();
    let admin = Address::generate(env);
    let poster = Address::generate(env);
    let contract_id = env.register_contract(None, JobRegistryContract);
    let client = JobRegistryContractClient::new(env, &contract_id);
    client.initialize(&admin);
    (admin, poster, client)
}

// ---------------------------------------------------------------------------
// initialize
// ---------------------------------------------------------------------------

#[test]
fn test_initialize_sets_admin() {
    let env = Env::default();
    let (admin, _poster, client) = setup(&env);
    assert_eq!(client.get_admin(), admin);
}

#[test]
#[should_panic(expected = "Already initialized")]
fn test_initialize_twice_panics() {
    let env = Env::default();
    let (admin, _poster, client) = setup(&env);
    client.initialize(&admin);
}

// ---------------------------------------------------------------------------
// post_job
// ---------------------------------------------------------------------------

#[test]
fn test_post_job_success() {
    let env = Env::default();
    let (_admin, poster, client) = setup(&env);
    let job_id = Symbol::new(&env, "job1");
    let token = Address::generate(&env);

    let job = client.post_job(
        &poster,
        &job_id,
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &1_000_000,
        &token,
    );

    assert_eq!(job.id, job_id);
    assert_eq!(job.poster, poster);
    assert_eq!(job.budget, 1_000_000);
}

#[test]
#[should_panic(expected = "Job already exists")]
fn test_post_job_duplicate_panics() {
    let env = Env::default();
    let (_admin, poster, client) = setup(&env);
    let job_id = Symbol::new(&env, "job1");
    let token = Address::generate(&env);

    client.post_job(
        &poster,
        &job_id,
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &0,
        &token,
    );
    client.post_job(
        &poster,
        &job_id,
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &0,
        &token,
    );
}

#[test]
#[should_panic(expected = "budget must be non-negative")]
fn test_post_job_negative_budget_panics() {
    let env = Env::default();
    let (_admin, poster, client) = setup(&env);
    let token = Address::generate(&env);

    client.post_job(
        &poster,
        &Symbol::new(&env, "job1"),
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &-1,
        &token,
    );
}

// ---------------------------------------------------------------------------
// assign_worker
// ---------------------------------------------------------------------------

#[test]
fn test_assign_worker_success() {
    let env = Env::default();
    let (_admin, poster, client) = setup(&env);
    let job_id = Symbol::new(&env, "job1");
    let token = Address::generate(&env);
    let worker = Address::generate(&env);

    client.post_job(
        &poster,
        &job_id,
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &0,
        &token,
    );
    client.assign_worker(&poster, &job_id, &worker);

    let job = client.get_job(&job_id);
    assert_eq!(job.worker, Some(worker));
}

#[test]
#[should_panic(expected = "Not job poster")]
fn test_assign_worker_not_poster_panics() {
    let env = Env::default();
    let (_admin, poster, client) = setup(&env);
    let job_id = Symbol::new(&env, "job1");
    let token = Address::generate(&env);
    let worker = Address::generate(&env);
    let attacker = Address::generate(&env);

    client.post_job(
        &poster,
        &job_id,
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &0,
        &token,
    );
    client.assign_worker(&attacker, &job_id, &worker);
}

// ---------------------------------------------------------------------------
// complete_job
// ---------------------------------------------------------------------------

#[test]
fn test_complete_job_success() {
    let env = Env::default();
    let (_admin, poster, client) = setup(&env);
    let job_id = Symbol::new(&env, "job1");
    let token = Address::generate(&env);
    let worker = Address::generate(&env);

    client.post_job(
        &poster,
        &job_id,
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &0,
        &token,
    );
    client.assign_worker(&poster, &job_id, &worker);
    client.complete_job(&worker, &job_id);

    let job = client.get_job(&job_id);
    assert_eq!(job.status, storage::JobStatus::Completed);
}

#[test]
#[should_panic(expected = "Not assigned worker")]
fn test_complete_job_wrong_caller_panics() {
    let env = Env::default();
    let (_admin, poster, client) = setup(&env);
    let job_id = Symbol::new(&env, "job1");
    let token = Address::generate(&env);
    let worker = Address::generate(&env);

    client.post_job(
        &poster,
        &job_id,
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &0,
        &token,
    );
    client.assign_worker(&poster, &job_id, &worker);
    client.complete_job(&poster, &job_id); // poster cannot complete
}

// ---------------------------------------------------------------------------
// cancel_job
// ---------------------------------------------------------------------------

#[test]
fn test_cancel_job_success() {
    let env = Env::default();
    let (_admin, poster, client) = setup(&env);
    let job_id = Symbol::new(&env, "job1");
    let token = Address::generate(&env);

    client.post_job(
        &poster,
        &job_id,
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &0,
        &token,
    );
    client.cancel_job(&poster, &job_id);

    let job = client.get_job(&job_id);
    assert_eq!(job.status, storage::JobStatus::Cancelled);
}

#[test]
#[should_panic(expected = "Job already settled")]
fn test_cancel_completed_job_panics() {
    let env = Env::default();
    let (_admin, poster, client) = setup(&env);
    let job_id = Symbol::new(&env, "job1");
    let token = Address::generate(&env);
    let worker = Address::generate(&env);

    client.post_job(
        &poster,
        &job_id,
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &0,
        &token,
    );
    client.assign_worker(&poster, &job_id, &worker);
    client.complete_job(&worker, &job_id);
    client.cancel_job(&poster, &job_id); // already completed
}

// ---------------------------------------------------------------------------
// dispute_job
// ---------------------------------------------------------------------------

#[test]
fn test_dispute_job_by_poster() {
    let env = Env::default();
    let (_admin, poster, client) = setup(&env);
    let job_id = Symbol::new(&env, "job1");
    let token = Address::generate(&env);
    let worker = Address::generate(&env);

    client.post_job(
        &poster,
        &job_id,
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &0,
        &token,
    );
    client.assign_worker(&poster, &job_id, &worker);
    client.dispute_job(&poster, &job_id);

    let job = client.get_job(&job_id);
    assert_eq!(job.status, storage::JobStatus::Disputed);
}

#[test]
#[should_panic(expected = "Not a party")]
fn test_dispute_job_by_stranger_panics() {
    let env = Env::default();
    let (_admin, poster, client) = setup(&env);
    let job_id = Symbol::new(&env, "job1");
    let token = Address::generate(&env);
    let worker = Address::generate(&env);
    let stranger = Address::generate(&env);

    client.post_job(
        &poster,
        &job_id,
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &0,
        &token,
    );
    client.assign_worker(&poster, &job_id, &worker);
    client.dispute_job(&stranger, &job_id);
}

// ---------------------------------------------------------------------------
// list / query
// ---------------------------------------------------------------------------

#[test]
fn test_list_jobs_and_poster_jobs() {
    let env = Env::default();
    let (_admin, poster, client) = setup(&env);
    let token = Address::generate(&env);

    client.post_job(
        &poster,
        &Symbol::new(&env, "job1"),
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &0,
        &token,
    );
    client.post_job(
        &poster,
        &Symbol::new(&env, "job2"),
        &Symbol::new(&env, "welder"),
        &zero_hash(&env),
        &0,
        &token,
    );

    assert_eq!(client.list_jobs().len(), 2);
    assert_eq!(client.poster_jobs(&poster).len(), 2);
}

// ---------------------------------------------------------------------------
// pause / unpause
// ---------------------------------------------------------------------------

#[test]
#[should_panic(expected = "Contract is paused")]
fn test_post_job_while_paused_panics() {
    let env = Env::default();
    let (admin, poster, client) = setup(&env);
    let token = Address::generate(&env);

    client.grant_role(&admin, &Symbol::new(&env, logic::ROLE_PAUSER), &admin);
    client.pause(&admin);

    client.post_job(
        &poster,
        &Symbol::new(&env, "job1"),
        &Symbol::new(&env, "plumber"),
        &zero_hash(&env),
        &0,
        &token,
    );
}
