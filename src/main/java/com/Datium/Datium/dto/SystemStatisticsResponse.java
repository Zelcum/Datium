package com.Datium.Datium.dto;

import java.util.List;

public class SystemStatisticsResponse {
    private Long totalSystems;
    private Long securityNone;
    private Long securityGeneral;
    private Long securityIndividual;
    private Long totalUsers;
    private Long totalRecords;
    private Long planBasic;
    private Long planPro;
    private Long planEnterprise;
    private PlanUsage planUsage;
    private List<String> activityLabels;
    private List<Long> activityData;

    public static class PlanUsage {
        private Long current;
        private Long max;
        private String planName;

        public Long getCurrent() { return current; }
        public void setCurrent(Long current) { this.current = current; }
        public Long getMax() { return max; }
        public void setMax(Long max) { this.max = max; }
        public String getPlanName() { return planName; }
        public void setPlanName(String planName) { this.planName = planName; }
    }

    public Long getTotalSystems() { return totalSystems; }
    public void setTotalSystems(Long totalSystems) { this.totalSystems = totalSystems; }
    public Long getSecurityNone() { return securityNone; }
    public void setSecurityNone(Long securityNone) { this.securityNone = securityNone; }
    public Long getSecurityGeneral() { return securityGeneral; }
    public void setSecurityGeneral(Long securityGeneral) { this.securityGeneral = securityGeneral; }
    public Long getSecurityIndividual() { return securityIndividual; }
    public void setSecurityIndividual(Long securityIndividual) { this.securityIndividual = securityIndividual; }
    public Long getTotalUsers() { return totalUsers; }
    public void setTotalUsers(Long totalUsers) { this.totalUsers = totalUsers; }
    public Long getTotalRecords() { return totalRecords; }
    public void setTotalRecords(Long totalRecords) { this.totalRecords = totalRecords; }
    public Long getPlanBasic() { return planBasic; }
    public void setPlanBasic(Long planBasic) { this.planBasic = planBasic; }
    public Long getPlanPro() { return planPro; }
    public void setPlanPro(Long planPro) { this.planPro = planPro; }
    public Long getPlanEnterprise() { return planEnterprise; }
    public void setPlanEnterprise(Long planEnterprise) { this.planEnterprise = planEnterprise; }
    public PlanUsage getPlanUsage() { return planUsage; }
    public void setPlanUsage(PlanUsage planUsage) { this.planUsage = planUsage; }
    public List<String> getActivityLabels() { return activityLabels; }
    public void setActivityLabels(List<String> activityLabels) { this.activityLabels = activityLabels; }
    public List<Long> getActivityData() { return activityData; }
    public void setActivityData(List<Long> activityData) { this.activityData = activityData; }
}

