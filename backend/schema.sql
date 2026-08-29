CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS users_email_idx
ON users (email);


CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,

    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    transaction_reference VARCHAR(50) NOT NULL,
    receiver_name VARCHAR(150) NOT NULL,
    receiver_upi_id VARCHAR(150),

    amount NUMERIC(14, 2) NOT NULL
        CHECK (amount > 0),

    payment_method VARCHAR(50) NOT NULL DEFAULT 'UPI',
    bank_name VARCHAR(100),

    transaction_time TIMESTAMPTZ NOT NULL,

    risk_level VARCHAR(10) NOT NULL
        CHECK (risk_level IN ('safe', 'medium', 'high')),

    risk_reason TEXT,
    receiver_category VARCHAR(50) DEFAULT 'person',

    transaction_status VARCHAR(20) NOT NULL DEFAULT 'completed'
        CHECK (
            transaction_status IN (
                'pending',
                'completed',
                'failed',
                'blocked'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (user_id, transaction_reference)
);

CREATE INDEX IF NOT EXISTS transactions_user_time_idx
ON transactions (user_id, transaction_time DESC);

CREATE INDEX IF NOT EXISTS transactions_user_risk_idx
ON transactions (user_id, risk_level);
