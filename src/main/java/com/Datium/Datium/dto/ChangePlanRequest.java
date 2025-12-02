package com.Datium.Datium.dto;

public class ChangePlanRequest {
    private Integer newPlanId;

    public ChangePlanRequest() {
    }

    public ChangePlanRequest(Integer newPlanId) {
        this.newPlanId = newPlanId;
    }

    public Integer getNewPlanId() {
        return newPlanId;
    }

    public void setNewPlanId(Integer newPlanId) {
        this.newPlanId = newPlanId;
    }
}
