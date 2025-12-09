DROP DATABASE IF EXISTS Datium;
CREATE DATABASE Datium;
USE Datium;

-- =========================================
-- USERS & PLANS
-- =========================================

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    plan_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    max_systems INT,
    max_tables_per_system INT DEFAULT 3,
    max_records_per_table INT DEFAULT 50000,
    max_fields_per_table INT DEFAULT 200
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO plans (name, max_systems, max_tables_per_system)
VALUES
('Básico', 1, 3),
('Pro', 10, 15),
('Empresarial', 99999999, 99999999);

-- =========================================
-- SYSTEM (BASE DE DATOS ARTIFICIAL)
-- =========================================

CREATE TABLE systems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- SYSTEM TABLES (TABLAS DENTRO DEL SISTEMA)
-- =========================================

CREATE TABLE system_tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    system_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_table_name (system_id, name),
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- FIELDS (CAMPOS POR TABLA)
-- =========================================

CREATE TABLE system_fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    type ENUM('text','number','date','boolean','relation') NOT NULL,
    required BOOLEAN DEFAULT FALSE,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES system_tables(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE system_field_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    field_id INT NOT NULL,
    value VARCHAR(100) NOT NULL,
    FOREIGN KEY (field_id) REFERENCES system_fields(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- RECORDS (REGISTROS POR TABLA)
-- =========================================

CREATE TABLE system_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_id INT NOT NULL,
    created_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES system_tables(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_record_table ON system_records(table_id);

-- =========================================
-- RECORD VALUES (VALORES DE CAMPOS)
-- =========================================

CREATE TABLE system_record_values (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_id INT NOT NULL,
    field_id INT NOT NULL,
    value TEXT,
    FOREIGN KEY (record_id) REFERENCES system_records(id) ON DELETE CASCADE,
    FOREIGN KEY (field_id) REFERENCES system_fields(id) ON DELETE CASCADE,
    UNIQUE KEY unique_field_per_record (record_id, field_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_value_field ON system_record_values(field_id);
CREATE INDEX idx_value_record ON system_record_values(record_id);

-- =========================================
-- RELATIONSHIPS (RELACIONES ENTRE TABLAS)
-- =========================================

CREATE TABLE system_relationships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    system_id INT NOT NULL,
    from_table_id INT NOT NULL,
    from_field_id INT NOT NULL,
    to_table_id INT NOT NULL,
    to_field_id INT NOT NULL,
    relation_type ENUM('one_to_one','one_to_many','many_to_many') DEFAULT 'many_to_many',
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,
    FOREIGN KEY (from_table_id) REFERENCES system_tables(id) ON DELETE CASCADE,
    FOREIGN KEY (from_field_id) REFERENCES system_fields(id) ON DELETE CASCADE,
    FOREIGN KEY (to_table_id) REFERENCES system_tables(id) ON DELETE CASCADE,
    FOREIGN KEY (to_field_id) REFERENCES system_fields(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =========================================
-- LOGS (OPCIONAL PERO ÚTIL)
-- =========================================

CREATE TABLE audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    system_id INT,
    action VARCHAR(200),
    details TEXT,
    ip VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE security_audit (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    system_id INT,
    severity ENUM('low','medium','high') NOT NULL,
    event VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE system_shares (
    id INT AUTO_INCREMENT PRIMARY KEY,
    system_id INT NOT NULL,
    user_email VARCHAR(150) NOT NULL,
    permission_level VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACCEPTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
