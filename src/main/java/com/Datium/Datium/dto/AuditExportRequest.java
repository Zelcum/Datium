package com.Datium.Datium.dto;

import java.util.List;
import java.util.Map;

public class AuditExportRequest {
    private String type;
    private List<Map<String, Object>> data;

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public List<Map<String, Object>> getData() {
        return data;
    }

    public void setData(List<Map<String, Object>> data) {
        this.data = data;
    }
}
