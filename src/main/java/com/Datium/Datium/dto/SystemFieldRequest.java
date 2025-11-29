package com.Datium.Datium.dto;

import java.util.List;

public class SystemFieldRequest {
    private String name;
    private String type;
    private Boolean required;
    private Integer orderIndex;
    private List<String> options;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public Boolean getRequired() { return required; }
    public void setRequired(Boolean required) { this.required = required; }
    public Integer getOrderIndex() { return orderIndex; }
    public void setOrderIndex(Integer orderIndex) { this.orderIndex = orderIndex; }
    public List<String> getOptions() { return options; }
    public void setOptions(List<String> options) { this.options = options; }
}


