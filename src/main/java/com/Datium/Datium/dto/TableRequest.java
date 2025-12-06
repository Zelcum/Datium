package com.Datium.Datium.dto;

public class TableRequest {
    private String name;
    private String description;

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
    private java.util.List<SystemFieldRequest> fields;

    public java.util.List<SystemFieldRequest> getFields() {
        return fields;
    }

    public void setFields(java.util.List<SystemFieldRequest> fields) {
        this.fields = fields;
    }
}
