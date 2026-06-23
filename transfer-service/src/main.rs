mod config;
mod error;
mod handlers;
mod models;
mod tigerbeetle;

use axum::{routing::get, Router};
use std::sync::Arc;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::config::Config;
use crate::tigerbeetle::TigerBeetleClient;

#[derive(Clone)]
pub struct AppState {
    pub tigerbeetle: Arc<TigerBeetleClient>,
    pub config: Arc<Config>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _ = dotenvy::dotenv();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "transfer_service=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = Arc::new(Config::from_env()?);
    tracing::info!("Configuration loaded");

    let tb_client = Arc::new(TigerBeetleClient::new(&config).await?);
    tracing::info!("Connected to TigerBeetle at {}:{}", config.tb_host, config.tb_port);

    let state = AppState {
        tigerbeetle: tb_client,
        config,
    };

    let app = Router::new()
        .route("/health", get(handlers::health))
        .route("/accounts", get(handlers::list_accounts).post(handlers::create_account))
        .route("/accounts/:account_id", get(handlers::get_account))
        .route("/accounts/:account_id/balance", get(handlers::get_balance))
        .route("/transfers", get(handlers::list_transfers).post(handlers::create_transfer))
        .route("/transfers/:transfer_id", get(handlers::get_transfer))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = format!("0.0.0.0:{}", std::env::var("PORT").unwrap_or_else(|_| "3001".into()));
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("Transfer service listening on {}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}
