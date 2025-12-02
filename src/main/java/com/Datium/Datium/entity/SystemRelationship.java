package com.Datium.Datium.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "system_relationships")
public class SystemRelationship {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "system_id", nullable = false)
    private Integer systemId;

    @Column(name = "from_table_id", nullable = false)
    private Integer fromTableId;

    @Column(name = "from_field_id", nullable = false)
    private Integer fromFieldId;

    @Column(name = "to_table_id", nullable = false)
    private Integer toTableId;

    @Column(name = "to_field_id", nullable = false)
    private Integer toFieldId;

    @Enumerated(EnumType.STRING)
    @Column(name = "relation_type")
    private RelationType relationType = RelationType.many_to_many;

    public enum RelationType {
        one_to_one, one_to_many, many_to_many
    }

    // Getters and Setters
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

    public Integer getFromTableId() {
        return fromTableId;
    }

    public void setFromTableId(Integer fromTableId) {
        this.fromTableId = fromTableId;
    }

    public Integer getFromFieldId() {
        return fromFieldId;
    }

    public void setFromFieldId(Integer fromFieldId) {
        this.fromFieldId = fromFieldId;
    }

    public Integer getToTableId() {
        return toTableId;
    }

    public void setToTableId(Integer toTableId) {
        this.toTableId = toTableId;
    }

    public Integer getToFieldId() {
        return toFieldId;
    }

    public void setToFieldId(Integer toFieldId) {
        this.toFieldId = toFieldId;
    }

    public RelationType getRelationType() {
        return relationType;
    }

    public void setRelationType(RelationType relationType) {
        this.relationType = relationType;
    }
}
