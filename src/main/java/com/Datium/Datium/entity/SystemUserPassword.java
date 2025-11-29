package com.Datium.Datium.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "system_user_passwords", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"system_id", "user_id"})
})
public class SystemUserPassword {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "system_id", nullable = false)
    private Integer systemId;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "password_hash", columnDefinition = "TEXT")
    private String passwordHash;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getSystemId() {
        return systemId;
    }

    public void setSystemId(Integer systemId) {
        this.systemId = systemId;
    }

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}


