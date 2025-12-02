package com.Datium.Datium.dto;

import java.time.LocalDateTime;

public class UserProfileResponse {
    private Integer id;
    private String name;
    private String email;
    private Integer planId;
    private String planName;
    private String avatarUrl;
    private LocalDateTime createdAt;

    public UserProfileResponse() {
    }

    public UserProfileResponse(Integer id, String name, String email, Integer planId, String planName, String avatarUrl,
            LocalDateTime createdAt) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.planId = planId;
        this.planName = planName;
        this.avatarUrl = avatarUrl;
        this.createdAt = createdAt;
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Integer getPlanId() {
        return planId;
    }

    public void setPlanId(Integer planId) {
        this.planId = planId;
    }

    public String getPlanName() {
        return planName;
    }

    public void setPlanName(String planName) {
        this.planName = planName;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
