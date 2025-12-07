package com.Datium.Datium.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "plans")
public class Plan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 50)
    private String name;

    @Column(name = "max_systems")
    private Integer maxSystems;

    @Column(name = "max_records_per_system")
    private Integer maxRecordsPerSystem;

    @Column(name = "max_users_per_system")
    private Integer maxUsersPerSystem;

    @Column(name = "max_fields_per_system")
    private Integer maxFieldsPerSystem;

    @Column(name = "max_tables_per_system")
    private Integer maxTablesPerSystem;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getMaxSystems() {
        return maxSystems;
    }

    public void setMaxSystems(Integer maxSystems) {
        this.maxSystems = maxSystems;
    }

    public Integer getMaxRecordsPerSystem() {
        return maxRecordsPerSystem;
    }

    public void setMaxRecordsPerSystem(Integer maxRecordsPerSystem) {
        this.maxRecordsPerSystem = maxRecordsPerSystem;
    }

    public Integer getMaxUsersPerSystem() {
        return maxUsersPerSystem;
    }

    public void setMaxUsersPerSystem(Integer maxUsersPerSystem) {
        this.maxUsersPerSystem = maxUsersPerSystem;
    }

    public Integer getMaxFieldsPerSystem() {
        return maxFieldsPerSystem;
    }

    public void setMaxFieldsPerSystem(Integer maxFieldsPerSystem) {
        this.maxFieldsPerSystem = maxFieldsPerSystem;
    }

    public Integer getMaxTablesPerSystem() {
        return maxTablesPerSystem;
    }

    public void setMaxTablesPerSystem(Integer maxTablesPerSystem) {
        this.maxTablesPerSystem = maxTablesPerSystem;
    }
}
