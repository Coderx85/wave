use anyhow::{Context, Result};
use cn_tigerbeetle as tb;

use crate::config::Config;

pub struct TigerBeetleClient {
    client: tb::Client,
    pub ledger_code: u32,
    pub currency_code: u16,
}

impl TigerBeetleClient {
    pub async fn new(config: &Config) -> Result<Self> {
        let address = config.tb_address();

        let resolved_addr = if is_ip(&address.split(':').next().unwrap_or("")) {
            address.clone()
        } else {
            let host = address.split(':').next().unwrap_or("");
            let port = address.split(':').last().unwrap_or("4343");
            let ip = resolve_host(host).await.unwrap_or_else(|_| host.to_string());
            format!("{}:{}", ip, port)
        };

        tracing::info!("Connecting to TigerBeetle at {}", resolved_addr);

        let client = tb::Client::new(config.tb_cluster_id, &resolved_addr)
            .context("Failed to create TigerBeetle client")?;

        Ok(Self {
            client,
            ledger_code: config.ledger_code,
            currency_code: config.currency_code,
        })
    }

    pub async fn create_account(
        &self,
        id: u128,
        ledger: Option<u32>,
        code: Option<u16>,
        user_data_128: Option<u128>,
        user_data_64: Option<u64>,
        user_data_32: Option<u32>,
    ) -> Result<tb::Account> {
        let mut account = tb::Account {
            id,
            ledger: ledger.unwrap_or(self.ledger_code),
            code: code.unwrap_or(self.currency_code),
            flags: tb::AccountFlags::History,
            ..Default::default()
        };

        account.user_data_128 = user_data_128.unwrap_or(0);
        account.user_data_64 = user_data_64.unwrap_or(0);
        account.user_data_32 = user_data_32.unwrap_or(0);

        let results = self.client
            .create_accounts(&[account])
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create account: {:?}", e))?;

        if !results.is_empty() {
            return Err(anyhow::anyhow!("Account creation failed: {:?}", results));
        }

        let accounts = self.client
            .lookup_accounts(&[id])
            .await
            .map_err(|e| anyhow::anyhow!("Failed to lookup account: {:?}", e))?;

        accounts
            .into_iter()
            .next()
            .ok_or_else(|| anyhow::anyhow!("Account not found after creation"))
    }

    pub async fn get_account(&self, id: u128) -> Result<Option<tb::Account>> {
        let accounts = self.client
            .lookup_accounts(&[id])
            .await
            .map_err(|e| anyhow::anyhow!("Failed to lookup account: {:?}", e))?;

        Ok(accounts.into_iter().next())
    }

    pub async fn create_transfer(
        &self,
        req: crate::models::CreateTransferRequest,
    ) -> Result<tb::Transfer> {
        let transfer_id = req.id.unwrap_or_else(|| tb::id());

        let mut transfer = tb::Transfer {
            id: transfer_id,
            debit_account_id: req.debit_account_id,
            credit_account_id: req.credit_account_id,
            amount: req.amount,
            ledger: req.ledger.unwrap_or(self.ledger_code),
            code: req.code.unwrap_or(self.currency_code),
            flags: req.flags.map(|f| tb::TransferFlags::from_bits_retain(f as u16)).unwrap_or(tb::TransferFlags::empty()),
            ..Default::default()
        };

        transfer.user_data_128 = req.user_data_128.unwrap_or(0);
        transfer.user_data_64 = req.user_data_64.unwrap_or(0);
        transfer.user_data_32 = req.user_data_32.unwrap_or(0);

        let results = self.client
            .create_transfers(&[transfer])
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create transfer: {:?}", e))?;

        if !results.is_empty() {
            return Err(anyhow::anyhow!("Transfer creation failed: {:?}", results));
        }

        let transfers = self.client
            .lookup_transfers(&[transfer_id])
            .await
            .map_err(|e| anyhow::anyhow!("Failed to lookup transfer: {:?}", e))?;

        transfers
            .into_iter()
            .next()
            .ok_or_else(|| anyhow::anyhow!("Transfer not found after creation"))
    }

    pub async fn get_transfer(&self, id: u128) -> Result<Option<tb::Transfer>> {
        let transfers = self.client
            .lookup_transfers(&[id])
            .await
            .map_err(|e| anyhow::anyhow!("Failed to lookup transfer: {:?}", e))?;

        Ok(transfers.into_iter().next())
    }

    pub fn client(&self) -> &tb::Client {
        &self.client
    }
}

fn is_ip(host: &str) -> bool {
    std::net::IpAddr::from_str(host).is_ok()
}

use std::str::FromStr;

async fn resolve_host(host: &str) -> Result<String> {
    use tokio::net::lookup_host;

    let addr = format!("{}:0", host);
    let resolved = lookup_host(&addr)
        .await
        .context(format!("Failed to resolve host: {}", host))?
        .next()
        .ok_or_else(|| anyhow::anyhow!("No addresses found for {}", host))?;

    Ok(resolved.ip().to_string())
}
