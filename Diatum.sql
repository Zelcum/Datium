CREATE DATABASE IF NOT EXISTS Datium;
USE Datium;


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

CREATE TABLE systems (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE system_tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    system_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_table_name (system_id, name),
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

ALTER TABLE system_fields
    ADD COLUMN system_id INT NOT NULL AFTER id,
    MODIFY COLUMN table_id INT NULL;

ALTER TABLE system_records
    ADD COLUMN system_id INT NOT NULL AFTER id,
    MODIFY COLUMN table_id INT NULL;

ALTER TABLE system_fields
    ADD CONSTRAINT fk_system_fields_system
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE;

ALTER TABLE system_records
    ADD CONSTRAINT fk_system_records_system
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE;

CREATE TABLE system_table_columns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    table_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    length INT,
    is_primary_key BOOLEAN DEFAULT FALSE,
    is_foreign_key BOOLEAN DEFAULT FALSE,
    is_unique BOOLEAN DEFAULT FALSE,
    is_nullable BOOLEAN DEFAULT TRUE,
    default_value TEXT,
    foreign_table_id INT,
    foreign_column_id INT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES system_tables(id) ON DELETE CASCADE,
    FOREIGN KEY (foreign_table_id) REFERENCES system_tables(id) ON DELETE SET NULL,
    FOREIGN KEY (foreign_column_id) REFERENCES system_table_columns(id) ON DELETE SET NULL,
    UNIQUE KEY unique_column_name (table_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE system_modules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    system_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,
    UNIQUE KEY unique_module_name (system_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE system_module_tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    table_id INT NOT NULL,
    order_index INT DEFAULT 0,
    FOREIGN KEY (module_id) REFERENCES system_modules(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES system_tables(id) ON DELETE CASCADE,
    UNIQUE KEY unique_module_table (module_id, table_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE system_module_columns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module_id INT NOT NULL,
    table_id INT NOT NULL,
    column_id INT NOT NULL,
    display_name VARCHAR(100),
    order_index INT DEFAULT 0,
    is_required BOOLEAN DEFAULT FALSE,
    is_visible BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (module_id) REFERENCES system_modules(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES system_tables(id) ON DELETE CASCADE,
    FOREIGN KEY (column_id) REFERENCES system_table_columns(id) ON DELETE CASCADE,
    UNIQUE KEY unique_module_column (module_id, column_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
