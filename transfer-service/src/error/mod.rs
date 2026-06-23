use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("TigerBeetle error: {0}")]
    TigerBeetle(String),

    #[error("Account not found: {0}")]
    AccountNotFound(u128),

    #[error("Insufficient funds: available {available}, requested {requested}")]
    InsufficientFunds { available: u128, requested: u128 },

    #[error("Invalid request: {0}")]
    BadRequest(String),

    #[allow(dead_code)]
    #[error("Internal error: {0}")]
    Internal(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match &self {
            AppError::TigerBeetle(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
            AppError::AccountNotFound(_) => (StatusCode::NOT_FOUND, self.to_string()),
            AppError::InsufficientFunds { .. } => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::BadRequest(_) => (StatusCode::BAD_REQUEST, self.to_string()),
            AppError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, self.to_string()),
        };

        let body = Json(json!({
            "error": message,
            "status": status.as_u16(),
        }));

        (status, body).into_response()
    }
}
