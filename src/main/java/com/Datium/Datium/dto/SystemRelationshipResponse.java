package com.Datium.Datium.dto;

public class SystemRelationshipResponse {
    private Integer id;
    private Integer systemId;
    private Integer fromTableId;
    private String fromTableName;
    private Integer fromFieldId;
    private String fromFieldName;
    private Integer toTableId;
    private String toTableName;
    private Integer toFieldId;
    private String toFieldName;
    private String relationType;

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

    public String getFromTableName() {
        return fromTableName;
    }

    public void setFromTableName(String fromTableName) {
        this.fromTableName = fromTableName;
    }

    public Integer getFromFieldId() {
        return fromFieldId;
    }

    public void setFromFieldId(Integer fromFieldId) {
        this.fromFieldId = fromFieldId;
    }

    public String getFromFieldName() {
        return fromFieldName;
    }

    public void setFromFieldName(String fromFieldName) {
        this.fromFieldName = fromFieldName;
    }

    public Integer getToTableId() {
        return toTableId;
    }

    public void setToTableId(Integer toTableId) {
        this.toTableId = toTableId;
    }

    public String getToTableName() {
        return toTableName;
    }

    public void setToTableName(String toTableName) {
        this.toTableName = toTableName;
    }

    public Integer getToFieldId() {
        return toFieldId;
    }

    public void setToFieldId(Integer toFieldId) {
        this.toFieldId = toFieldId;
    }

    public String getToFieldName() {
        return toFieldName;
    }

    public void setToFieldName(String toFieldName) {
        this.toFieldName = toFieldName;
    }

    public String getRelationType() {
        return relationType;
    }

    public void setRelationType(String relationType) {
        this.relationType = relationType;
    }
}
