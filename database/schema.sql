-- SJTMO App Database Schema
-- Run this in PostgreSQL to set up the database

-- Create tables
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150),
    email VARCHAR(150) UNIQUE,
    password VARCHAR(150),
    role VARCHAR(20) CHECK (role IN ('admin','enforcer','motorist')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS violation_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    motorist_name VARCHAR(150),
    violation_type VARCHAR(150),
    notes TEXT,
    date_issued TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    enforcer_name VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS ordinances (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed data
INSERT INTO users (name, email, password, role) VALUES
('Admin User', 'admin@test.com', '123456', 'admin'),
('Enforcer Juan', 'enforcer@test.com', '123456', 'enforcer'),
('Pedro Motorist', 'motorist@test.com', '123456', 'motorist')
ON CONFLICT (email) DO NOTHING;

INSERT INTO violation_types (name) VALUES
('No Helmet'),
('Illegal Parking'),
('No License'),
('Reckless Driving'),
('Beating Red Light'),
('Obstruction')
ON CONFLICT DO NOTHING;

INSERT INTO violations (motorist_name, violation_type, notes, latitude, longitude, enforcer_name, status) VALUES
('Pedro Motorist', 'No Helmet', 'First offense, no helmet on EDSA', 14.5995, 120.9842, 'Enforcer Juan', 'pending'),
('Juan dela Cruz', 'Illegal Parking', 'Parked on no parking zone near City Hall', 14.6010, 120.9820, 'Enforcer Juan', 'pending'),
('Maria Santos', 'No License', 'Cannot produce license during checkpoint', 14.5980, 120.9860, 'Enforcer Juan', 'resolved'),
('Carlos Reyes', 'Reckless Driving', 'Weaving through traffic dangerously', 14.5970, 120.9880, 'Enforcer Juan', 'pending'),
('Pedro Motorist', 'Beating Red Light', 'Ran red light at main intersection', 14.5950, 120.9900, 'Enforcer Juan', 'pending');
