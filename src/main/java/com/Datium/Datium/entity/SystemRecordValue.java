package com.Datium.Datium.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "system_record_values", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"record_id", "field_id"})
})
public class SystemRecordValue {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "record_id", nullable = false)
    private Integer recordId;

    @Column(name = "field_id", nullable = false)
    private Integer fieldId;

    @Column(columnDefinition = "TEXT")
    private String value;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getRecordId() {
        return recordId;
    }

    public void setRecordId(Integer recordId) {
        this.recordId = recordId;
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


