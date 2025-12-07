package com.Datium.Datium.dto;

public class PlanDTO {
    private Integer id;
    private String name;
    private Integer maxSystems;
    private Integer maxRecordsPerSystem;
    private Integer maxUsersPerSystem;
    private Integer maxFieldsPerSystem;

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
}
