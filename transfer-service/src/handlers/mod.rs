use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};

use crate::error::AppError;
use crate::models::*;
use crate::AppState;

fn u128_to_string(v: u128) -> String {
    v.to_string()
}

fn parse_id(s: &str) -> Result<u128, AppError> {
    s.parse::<u128>().map_err(|_| AppError::BadRequest(format!("Invalid ID: {}", s)))
}

// ── Health ───────────────────────────────────────────
pub async fn health() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "service": "transfer-service",
    }))
}

// ── Account Handlers ─────────────────────────────────
pub async fn create_account(
    State(state): State<AppState>,
    Json(req): Json<CreateAccountRequest>,
) -> Result<Json<Value>, AppError> {
    let id = req.id.unwrap_or_else(|| fastrand::u128(..));

    let account = state
        .tigerbeetle
        .create_account(
            id,
            Some(req.ledger),
            Some(req.code),
            req.user_data_128,
            req.user_data_64,
            req.user_data_32,
        )
        .await
        .map_err(|e: anyhow::Error| AppError::TigerBeetle(e.to_string()))?;

    Ok(Json(json!({
        "id": u128_to_string(account.id),
        "ledger": account.ledger,
        "code": account.code,
        "debits_pending": account.debits_pending.to_string(),
        "debits_posted": account.debits_posted.to_string(),
        "credits_pending": account.credits_pending.to_string(),
        "credits_posted": account.credits_posted.to_string(),
        "user_data_128": u128_to_string(account.user_data_128),
        "user_data_64": account.user_data_64,
        "user_data_32": account.user_data_32,
    })))
}

pub async fn get_account(
    State(state): State<AppState>,
    Path(account_id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let id = parse_id(&account_id)?;
    let account = state
        .tigerbeetle
        .get_account(id)
        .await
        .map_err(|e: anyhow::Error| AppError::TigerBeetle(e.to_string()))?
        .ok_or(AppError::AccountNotFound(id))?;

    Ok(Json(json!({
        "id": u128_to_string(account.id),
        "ledger": account.ledger,
        "code": account.code,
        "debits_pending": account.debits_pending.to_string(),
        "debits_posted": account.debits_posted.to_string(),
        "credits_pending": account.credits_pending.to_string(),
        "credits_posted": account.credits_posted.to_string(),
        "user_data_128": u128_to_string(account.user_data_128),
        "user_data_64": account.user_data_64,
        "user_data_32": account.user_data_32,
    })))
}

pub async fn get_balance(
    State(state): State<AppState>,
    Path(account_id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let id = parse_id(&account_id)?;
    let account = state
        .tigerbeetle
        .get_account(id)
        .await
        .map_err(|e: anyhow::Error| AppError::TigerBeetle(e.to_string()))?
        .ok_or(AppError::AccountNotFound(id))?;

    let balance = account.credits_posted as i128 - account.debits_posted as i128;

    Ok(Json(json!({
        "account_id": u128_to_string(account.id),
        "balance": balance.to_string(),
        "debits_pending": account.debits_pending.to_string(),
        "debits_posted": account.debits_posted.to_string(),
        "credits_pending": account.credits_pending.to_string(),
        "credits_posted": account.credits_posted.to_string(),
    })))
}

pub async fn list_accounts(
    State(_state): State<AppState>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(json!({
        "accounts": [],
        "message": "Use GET /accounts/:id to lookup specific accounts"
    })))
}

// ── Transfer Handlers ────────────────────────────────
pub async fn create_transfer(
    State(state): State<AppState>,
    Json(req): Json<CreateTransferRequest>,
) -> Result<Json<Value>, AppError> {
    if req.amount == 0 {
        return Err(AppError::BadRequest("Amount must be greater than 0".into()));
    }

    if req.debit_account_id == req.credit_account_id {
        return Err(AppError::BadRequest("Cannot transfer to same account".into()));
    }

    let source_account = state
        .tigerbeetle
        .get_account(req.debit_account_id)
        .await
        .map_err(|e: anyhow::Error| AppError::TigerBeetle(e.to_string()))?
        .ok_or(AppError::AccountNotFound(req.debit_account_id))?;

    let available = source_account.credits_posted as i128 - source_account.debits_posted as i128;
    if available < req.amount as i128 {
        return Err(AppError::InsufficientFunds {
            available: available as u128,
            requested: req.amount,
        });
    }

    let transfer = state
        .tigerbeetle
        .create_transfer(req)
        .await
        .map_err(|e: anyhow::Error| AppError::TigerBeetle(e.to_string()))?;

    Ok(Json(json!({
        "id": u128_to_string(transfer.id),
        "debit_account_id": u128_to_string(transfer.debit_account_id),
        "credit_account_id": u128_to_string(transfer.credit_account_id),
        "amount": transfer.amount.to_string(),
        "ledger": transfer.ledger,
        "code": transfer.code,
        "pending_id": u128_to_string(transfer.pending_id),
        "user_data_128": u128_to_string(transfer.user_data_128),
        "user_data_64": transfer.user_data_64,
        "user_data_32": transfer.user_data_32,
    })))
}

pub async fn get_transfer(
    State(state): State<AppState>,
    Path(transfer_id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let id = parse_id(&transfer_id)?;
    let transfer = state
        .tigerbeetle
        .get_transfer(id)
        .await
        .map_err(|e: anyhow::Error| AppError::TigerBeetle(e.to_string()))?
        .ok_or(AppError::AccountNotFound(id))?;

    Ok(Json(json!({
        "id": u128_to_string(transfer.id),
        "debit_account_id": u128_to_string(transfer.debit_account_id),
        "credit_account_id": u128_to_string(transfer.credit_account_id),
        "amount": transfer.amount.to_string(),
        "ledger": transfer.ledger,
        "code": transfer.code,
        "pending_id": u128_to_string(transfer.pending_id),
        "user_data_128": u128_to_string(transfer.user_data_128),
        "user_data_64": transfer.user_data_64,
        "user_data_32": transfer.user_data_32,
    })))
}

pub async fn list_transfers(
    State(_state): State<AppState>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(json!({
        "transfers": [],
        "message": "Use GET /transfers/:id to lookup specific transfers"
    })))
}
