package com.Datium.Datium.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "system_field_links")
public class SystemFieldLink {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "source_system_id", nullable = false)
    private Integer sourceSystemId;

    @Column(name = "source_field_id", nullable = false)
    private Integer sourceFieldId;

    @Column(name = "target_system_id", nullable = false)
    private Integer targetSystemId;

    @Column(name = "target_field_id", nullable = false)
    private Integer targetFieldId;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getSourceSystemId() {
        return sourceSystemId;
    }

    public void setSourceSystemId(Integer sourceSystemId) {
        this.sourceSystemId = sourceSystemId;
    }

    public Integer getSourceFieldId() {
        return sourceFieldId;
    }

    public void setSourceFieldId(Integer sourceFieldId) {
        this.sourceFieldId = sourceFieldId;
    }

    public Integer getTargetSystemId() {
        return targetSystemId;
    }

    public void setTargetSystemId(Integer targetSystemId) {
        this.targetSystemId = targetSystemId;
    }

    public Integer getTargetFieldId() {
        return targetFieldId;
    }

    public void setTargetFieldId(Integer targetFieldId) {
        this.targetFieldId = targetFieldId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}


