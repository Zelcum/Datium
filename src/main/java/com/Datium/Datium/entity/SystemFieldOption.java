package com.Datium.Datium.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "system_field_options")
public class SystemFieldOption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "field_id", nullable = false)
    private Integer fieldId;

    @Column(length = 100, nullable = false)
    private String value;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getFieldId() {
        return fieldId;
    }

    public void setFieldId(Integer fieldId) {
        this.fieldId = fieldId;
    }

    public String getValue() {
        return value;
    }

    public void setValue(String value) {
        this.value = value;
    }
}


