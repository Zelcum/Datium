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

    max_records_per_system INT DEFAULT 100000,

    max_users_per_system INT DEFAULT 500,

    max_fields_per_system INT DEFAULT 200

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



INSERT INTO plans (name, max_systems) VALUES

('Básico', 3),

('Pro', 10),

('Empresarial', 99999999);



CREATE TABLE systems (

    id INT AUTO_INCREMENT PRIMARY KEY,

    owner_id INT NOT NULL,

    name VARCHAR(100) NOT NULL,

    description TEXT,

    image_url TEXT,

    security_mode ENUM('none','general','individual') DEFAULT 'none',

    general_password_hash TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE system_user_passwords (

    id INT AUTO_INCREMENT PRIMARY KEY,

    system_id INT NOT NULL,

    user_id INT NOT NULL,

    password_hash TEXT,

    UNIQUE KEY unique_system_user (system_id, user_id),

    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE system_users (

    id INT AUTO_INCREMENT PRIMARY KEY,

    system_id INT NOT NULL,

    user_id INT NOT NULL,

    role ENUM('admin','editor','viewer') NOT NULL,

    UNIQUE KEY unique_user_system (system_id, user_id),

    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE system_fields (

    id INT AUTO_INCREMENT PRIMARY KEY,

    system_id INT NOT NULL,

    name VARCHAR(100) NOT NULL,

    type VARCHAR(50) NOT NULL,

    required BOOLEAN DEFAULT FALSE,

    order_index INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE system_field_options (

    id INT AUTO_INCREMENT PRIMARY KEY,

    field_id INT NOT NULL,

    value VARCHAR(100) NOT NULL,

    FOREIGN KEY (field_id) REFERENCES system_fields(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE system_records (

    id INT AUTO_INCREMENT PRIMARY KEY,

    system_id INT NOT NULL,

    created_by INT,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE system_record_values (

    id INT AUTO_INCREMENT PRIMARY KEY,

    record_id INT NOT NULL,

    field_id INT NOT NULL,

    value TEXT,

    FOREIGN KEY (record_id) REFERENCES system_records(id) ON DELETE CASCADE,

    FOREIGN KEY (field_id) REFERENCES system_fields(id) ON DELETE CASCADE,

    UNIQUE KEY unique_field_per_record (record_id, field_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



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



CREATE TABLE chatbot_history (

    id INT AUTO_INCREMENT PRIMARY KEY,

    user_id INT,

    system_id INT,

    message TEXT,

    response TEXT,

    type ENUM('text','voice') DEFAULT 'text',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,

    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE system_shares (

    id INT AUTO_INCREMENT PRIMARY KEY,

    from_system_id INT NOT NULL,

    to_system_id INT NOT NULL,

    shared_type ENUM('fields','records','both') NOT NULL,

    status ENUM('pending','active','revoked') DEFAULT 'pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (from_system_id) REFERENCES systems(id) ON DELETE CASCADE,

    FOREIGN KEY (to_system_id) REFERENCES systems(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE shared_field_mappings (

    id INT AUTO_INCREMENT PRIMARY KEY,

    share_id INT NOT NULL,

    from_field_id INT NOT NULL,

    to_field_id INT NOT NULL,

    FOREIGN KEY (share_id) REFERENCES system_shares(id) ON DELETE CASCADE,

    FOREIGN KEY (from_field_id) REFERENCES system_fields(id) ON DELETE CASCADE,

    FOREIGN KEY (to_field_id) REFERENCES system_fields(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE shared_record_links (

    id INT AUTO_INCREMENT PRIMARY KEY,

    share_id INT NOT NULL,

    from_record_id INT NOT NULL,

    to_record_id INT NOT NULL,

    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (share_id) REFERENCES system_shares(id) ON DELETE CASCADE,

    FOREIGN KEY (from_record_id) REFERENCES system_records(id) ON DELETE CASCADE,

    FOREIGN KEY (to_record_id) REFERENCES system_records(id) ON DELETE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE shared_system_users (

    id INT AUTO_INCREMENT PRIMARY KEY,

    share_id INT NOT NULL,

    user_id INT NOT NULL,

    role ENUM('admin','editor','viewer') NOT NULL,

    access_type ENUM('general','individual') DEFAULT 'general',

    individual_password_hash TEXT,

    FOREIGN KEY (share_id) REFERENCES system_shares(id) ON DELETE CASCADE,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    UNIQUE KEY unique_shared_user (share_id, user_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE INDEX idx_record_system ON system_records(system_id);

CREATE INDEX idx_value_field ON system_record_values(field_id);

CREATE INDEX idx_value_record ON system_record_values(record_id);

CREATE INDEX idx_system_users_system ON system_users(system_id);

CREATE INDEX idx_system_users_user ON system_users(user_id);

CREATE INDEX idx_system_user_passwords_system ON system_user_passwords(system_id);

CREATE INDEX idx_system_user_passwords_user ON system_user_passwords(user_id);



CREATE TABLE system_invitations (

    id INT AUTO_INCREMENT PRIMARY KEY,

    system_id INT NOT NULL,

    inviter_id INT NOT NULL,

    invitee_email VARCHAR(150) NOT NULL,

    invitee_id INT,

    role ENUM('admin','editor','viewer') NOT NULL DEFAULT 'viewer',

    access_type ENUM('none','general','individual') NOT NULL DEFAULT 'none',

    individual_password_hash TEXT,

    status ENUM('pending','accepted','rejected','expired','cancelled') DEFAULT 'pending',

    expires_at TIMESTAMP NULL,

    accepted_at TIMESTAMP NULL,

    rejected_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (system_id) REFERENCES systems(id) ON DELETE CASCADE,

    FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,

    FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE SET NULL,

    UNIQUE KEY unique_pending_invitation (system_id, invitee_email, status),

    INDEX idx_invitee_email (invitee_email),

    INDEX idx_inviter_id (inviter_id),

    INDEX idx_system_id (system_id),

    INDEX idx_status (status),

    INDEX idx_expires_at (expires_at),

    INDEX idx_invitee_id (invitee_id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;



CREATE TABLE invitation_audit (

    id INT AUTO_INCREMENT PRIMARY KEY,

    invitation_id INT NOT NULL,

    action VARCHAR(100) NOT NULL,

    performed_by INT,

    details TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (invitation_id) REFERENCES system_invitations(id) ON DELETE CASCADE,

    FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE SET NULL,

    INDEX idx_invitation_id (invitation_id),

    INDEX idx_performed_by (performed_by),

    INDEX idx_created_at (created_at)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
