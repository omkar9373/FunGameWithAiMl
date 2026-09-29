CREATE DATABASE IF NOT EXISTS game_prediction_db;
USE game_prediction_db;

CREATE TABLE IF NOT EXISTS game_results (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    game_id VARCHAR(100) NULL,
    sequence_number BIGINT NOT NULL,
    result_number INT NOT NULL,
    result_time DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY (sequence_number),
    INDEX (result_time)
);

CREATE TABLE IF NOT EXISTS prediction_results (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    prediction_for_sequence BIGINT NOT NULL,
    predicted_number INT NOT NULL,
    probability DECIMAL(8,5) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    confidence DECIMAL(8,5) NOT NULL,
    actual_number INT NULL,
    prediction_status ENUM('PENDING','CORRECT','INCORRECT') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX (prediction_for_sequence)
);

CREATE TABLE IF NOT EXISTS model_metrics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    model_name VARCHAR(100) NOT NULL,
    training_samples INT NOT NULL,
    testing_samples INT NOT NULL,
    accuracy DECIMAL(8,5) NOT NULL,
    precision_score DECIMAL(8,5) NOT NULL,
    recall_score DECIMAL(8,5) NOT NULL,
    f1_score DECIMAL(8,5) NOT NULL,
    log_loss DECIMAL(8,5) NULL,
    trained_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS model_training_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    training_start_time DATETIME NOT NULL,
    training_end_time DATETIME NOT NULL,
    number_of_records INT NOT NULL,
    feature_count INT NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    metrics JSON NOT NULL,
    errors TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
