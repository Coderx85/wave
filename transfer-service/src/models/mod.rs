use serde::{Deserialize, Deserializer, Serialize};

fn de_u128<'de, D>(deserializer: D) -> Result<u128, D::Error>
where
    D: Deserializer<'de>,
{
    struct U128Visitor;

    impl<'de> serde::de::Visitor<'de> for U128Visitor {
        type Value = u128;

        fn expecting(&self, formatter: &mut std::fmt::Formatter) -> std::fmt::Result {
            formatter.write_str("a u128 number or string")
        }

        fn visit_u64<E>(self, v: u64) -> Result<u128, E> {
            Ok(v as u128)
        }

        fn visit_u128<E>(self, v: u128) -> Result<u128, E> {
            Ok(v)
        }

        fn visit_i64<E>(self, v: i64) -> Result<u128, E> {
            Ok(v as u128)
        }

        fn visit_str<E>(self, v: &str) -> Result<u128, E>
        where
            E: serde::de::Error,
        {
            v.parse::<u128>().map_err(serde::de::Error::custom)
        }
    }

    deserializer.deserialize_any(U128Visitor)
}

fn de_opt_u128<'de, D>(deserializer: D) -> Result<Option<u128>, D::Error>
where
    D: Deserializer<'de>,
{
    #[derive(Deserialize)]
    struct Wrapper(#[serde(deserialize_with = "de_u128")] u128);

    let v: Option<Wrapper> = Option::deserialize(deserializer)?;
    Ok(v.map(|w| w.0))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAccountRequest {
    #[serde(default, deserialize_with = "de_opt_u128")]
    pub id: Option<u128>,
    pub ledger: u32,
    pub code: u16,
    #[serde(default, deserialize_with = "de_opt_u128")]
    pub user_data_128: Option<u128>,
    pub user_data_64: Option<u64>,
    pub user_data_32: Option<u32>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTransferRequest {
    #[serde(default, deserialize_with = "de_opt_u128")]
    pub id: Option<u128>,
    #[serde(deserialize_with = "de_u128")]
    pub debit_account_id: u128,
    #[serde(deserialize_with = "de_u128")]
    pub credit_account_id: u128,
    #[serde(deserialize_with = "de_u128")]
    pub amount: u128,
    pub ledger: Option<u32>,
    pub code: Option<u16>,
    #[serde(default, deserialize_with = "de_opt_u128")]
    pub user_data_128: Option<u128>,
    pub user_data_64: Option<u64>,
    pub user_data_32: Option<u32>,
    pub flags: Option<u32>,
}
