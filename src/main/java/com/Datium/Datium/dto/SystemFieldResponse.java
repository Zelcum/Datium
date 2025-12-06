package com.Datium.Datium.dto;

import java.time.LocalDateTime;
import java.util.List;

public class SystemFieldResponse {
    private Integer id;
    private String name;
    private String type;
    private Boolean required;
    private Integer orderIndex;
    private Integer tableId;
    private List<String> options;
    private LocalDateTime createdAt;

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

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public Boolean getRequired() {
        return required;
    }

    public void setRequired(Boolean required) {
        this.required = required;
    }

    public Integer getOrderIndex() {
        return orderIndex;
    }

    public void setOrderIndex(Integer orderIndex) {
        this.orderIndex = orderIndex;
    }

    public Integer getTableId() {
        return tableId;
    }

    public void setTableId(Integer tableId) {
        this.tableId = tableId;
    }

    public List<String> getOptions() {
        return options;
    }

    public void setOptions(List<String> options) {
        this.options = options;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    private Integer relatedTableId;
    private String relatedFieldName;

    public Integer getRelatedTableId() {
        return relatedTableId;
    }

    public void setRelatedTableId(Integer relatedTableId) {
        this.relatedTableId = relatedTableId;
    }

    public String getRelatedFieldName() {
        return relatedFieldName;
    }

    public void setRelatedFieldName(String relatedFieldName) {
        this.relatedFieldName = relatedFieldName;
    }
}
