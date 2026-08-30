
-- ============================================================
-- UPI GUARDIAN DATABASE SCHEMA
-- ============================================================
--
-- Tables:
--   1. users
--   2. transactions
--   3. evidence
--
-- Evidence Locker:
--   Each evidence item belongs to:
--       → one user
--       → one transaction
--
-- ============================================================


-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,

    name VARCHAR(120) NOT NULL,

    email VARCHAR(255) NOT NULL UNIQUE,

    password VARCHAR(255) NOT NULL,

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX IF NOT EXISTS users_email_idx
ON users (email);



-- ============================================================
-- TRANSACTIONS
-- ============================================================

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

    payment_method VARCHAR(50) NOT NULL
        DEFAULT 'UPI',

    bank_name VARCHAR(100),

    transaction_time TIMESTAMPTZ NOT NULL,

    risk_level VARCHAR(10) NOT NULL
        CHECK (
            risk_level IN (
                'safe',
                'medium',
                'high'
            )
        ),

    risk_reason TEXT,

    receiver_category VARCHAR(50)
        DEFAULT 'person',

    transaction_status VARCHAR(20) NOT NULL
        DEFAULT 'completed'
        CHECK (
            transaction_status IN (
                'pending',
                'completed',
                'failed',
                'blocked'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (
        user_id,
        transaction_reference
    )
);


CREATE INDEX IF NOT EXISTS transactions_user_time_idx
ON transactions (
    user_id,
    transaction_time DESC
);


CREATE INDEX IF NOT EXISTS transactions_user_risk_idx
ON transactions (
    user_id,
    risk_level
);



-- ============================================================
-- EVIDENCE LOCKER
-- ============================================================
--
-- Stores files/evidence uploaded during Recovery Mode.
--
-- Relationship:
--
-- users
--   ↓
-- transactions
--   ↓
-- evidence
--
-- One transaction can have MANY evidence items.
--
-- Example:
--
-- Transaction #25
--     ├── payment screenshot
--     ├── scam message
--     ├── suspicious link
--     └── payment receipt
--
-- ============================================================

CREATE TABLE IF NOT EXISTS evidence (
    id BIGSERIAL PRIMARY KEY,

    -- User who owns this evidence
    user_id BIGINT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    -- Transaction this evidence belongs to
    transaction_id BIGINT NOT NULL
        REFERENCES transactions(id)
        ON DELETE CASCADE,

    -- Evidence category
    --
    -- Allowed values:
    -- transaction_details
    -- payment_screenshot
    -- scam_message
    -- suspicious_link
    -- qr_code_details
    -- call_details
    -- other

    evidence_type VARCHAR(50) NOT NULL
        CHECK (
            evidence_type IN (
                'transaction_details',
                'payment_screenshot',
                'scam_message',
                'suspicious_link',
                'qr_code_details',
                'call_details',
                'other'
            )
        ),

    -- Original file name uploaded by user
    file_name VARCHAR(255) NOT NULL,

    -- Path of stored file on backend
    file_path TEXT,

    -- MIME type
    -- Example:
    -- image/png
    -- image/jpeg
    -- application/pdf
    -- text/plain

    mime_type VARCHAR(150),

    -- File size in bytes
    file_size BIGINT,

    -- Optional description entered by user
    description TEXT,

    -- Security status shown in Evidence Locker
    security_status VARCHAR(20) NOT NULL
        DEFAULT 'secure'
        CHECK (
            security_status IN (
                'secure',
                'verified'
            )
        ),

    -- Time evidence was uploaded
    created_at TIMESTAMPTZ NOT NULL
        DEFAULT CURRENT_TIMESTAMP
);



-- ============================================================
-- EVIDENCE INDEXES
-- ============================================================

-- Quickly find all evidence belonging to a user
CREATE INDEX IF NOT EXISTS evidence_user_idx
ON evidence (user_id);


-- Quickly find all evidence belonging to a transaction
CREATE INDEX IF NOT EXISTS evidence_transaction_idx
ON evidence (transaction_id);


-- Quickly calculate category counts
CREATE INDEX IF NOT EXISTS evidence_type_idx
ON evidence (
    transaction_id,
    evidence_type
);


-- Quickly load newest evidence first
CREATE INDEX IF NOT EXISTS evidence_created_idx
ON evidence (
    transaction_id,
    created_at DESC
);



-- ============================================================
-- OPTIONAL SAFETY INDEX
-- ============================================================
--
-- Helps ensure that evidence always belongs to the same
-- user as the referenced transaction at the application level.
--
-- The backend will additionally verify ownership before
-- reading, uploading or deleting evidence.
--
-- ============================================================


-- ============================================================
-- END OF UPI GUARDIAN DATABASE SCHEMA
-- ============================================================
