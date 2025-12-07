package com.Datium.Datium.dto;

import java.util.Map;

public class SystemRecordRequest {
    private Map<String, String> fieldValues;

    public Map<String, String> getFieldValues() {
        return fieldValues;
    }

    public void setFieldValues(Map<String, String> fieldValues) {
        this.fieldValues = fieldValues;
    }

    private Map<Integer, Object> values;

    public Map<Integer, Object> getValues() {
        return values;
    }

    public void setValues(Map<Integer, Object> values) {
        this.values = values;
    }
}
