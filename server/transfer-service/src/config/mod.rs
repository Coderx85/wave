use anyhow::{Context, Result};

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub tb_cluster_id: u128,
    pub tb_host: String,
    pub tb_port: u16,
    pub ledger_code: u32,
    pub currency_code: u16,
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Ok(Self {
            port: std::env::var("PORT")
                .unwrap_or_else(|_| "3001".into())
                .parse()
                .context("Invalid PORT")?,

            tb_cluster_id: std::env::var("TB_CLUSTER_ID")
                .unwrap_or_else(|_| "1".into())
                .parse()
                .context("Invalid TB_CLUSTER_ID")?,

            tb_host: std::env::var("TB_HOST")
                .unwrap_or_else(|_| "localhost".into()),

            tb_port: std::env::var("TB_PORT")
                .unwrap_or_else(|_| "4343".into())
                .parse()
                .context("Invalid TB_PORT")?,

            ledger_code: std::env::var("LEDGER_CODE")
                .unwrap_or_else(|_| "85".into())
                .parse()
                .context("Invalid LEDGER_CODE")?,

            currency_code: std::env::var("CURRENCY_CODE")
                .unwrap_or_else(|_| "356".into())  // INR
                .parse()
                .context("Invalid CURRENCY_CODE")?,
        })
    }

    pub fn tb_address(&self) -> String {
        format!("{}:{}", self.tb_host, self.tb_port)
    }
}
