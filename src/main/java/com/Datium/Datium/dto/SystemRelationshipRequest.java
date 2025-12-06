package com.Datium.Datium.dto;

public class SystemRelationshipRequest {
    private Integer fromTableId;
    private Integer fromFieldId;
    private Integer toTableId;
    private Integer toFieldId;
    private String relationType;

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

    public String getType() {
        return relationType;
    }

    public void setType(String relationType) {
        this.relationType = relationType;
    }
}
