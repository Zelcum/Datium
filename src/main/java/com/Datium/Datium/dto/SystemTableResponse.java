package com.Datium.Datium.dto;

import java.time.LocalDateTime;

public class SystemTableResponse {
    private Integer id;
    private Integer systemId;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private Long fieldsCount;
    private Long recordsCount;

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public Long getFieldsCount() {
        return fieldsCount;
    }

    public void setFieldsCount(Long fieldsCount) {
        this.fieldsCount = fieldsCount;
    }

    public Long getRecordsCount() {
        return recordsCount;
    }

    public void setRecordsCount(Long recordsCount) {
        this.recordsCount = recordsCount;
    }
}
