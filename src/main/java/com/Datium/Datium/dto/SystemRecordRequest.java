package com.Datium.Datium.dto;

import java.util.Map;

public class SystemRecordRequest {
    private Integer tableId;
    private Map<String, String> fieldValues;

    public Integer getTableId() {
        return tableId;
    }

    public void setTableId(Integer tableId) {
        this.tableId = tableId;
    }

    public Map<String, String> getFieldValues() {
        return fieldValues;
    }

    public void setFieldValues(Map<String, String> fieldValues) {
        this.fieldValues = fieldValues;
    }
}
