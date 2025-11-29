package com.Datium.Datium.dto;

import java.time.LocalDateTime;
import java.util.List;

public class SystemResponse {
    private Integer id;
    private Integer ownerId;
    private String name;
    private String description;
    private String imageUrl;
    private String securityMode;
    private LocalDateTime createdAt;
    private Long userCount;
    private List<UserResponse> users;

    public static class UserResponse {
        private Integer userId;
        private String userEmail;
        private String userName;
        private String role;

        public Integer getUserId() { return userId; }
        public void setUserId(Integer userId) { this.userId = userId; }
        public String getUserEmail() { return userEmail; }
        public void setUserEmail(String userEmail) { this.userEmail = userEmail; }
        public String getUserName() { return userName; }
        public void setUserName(String userName) { this.userName = userName; }
        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getOwnerId() { return ownerId; }
    public void setOwnerId(Integer ownerId) { this.ownerId = ownerId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getSecurityMode() { return securityMode; }
    public void setSecurityMode(String securityMode) { this.securityMode = securityMode; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public Long getUserCount() { return userCount; }
    public void setUserCount(Long userCount) { this.userCount = userCount; }
    public List<UserResponse> getUsers() { return users; }
    public void setUsers(List<UserResponse> users) { this.users = users; }
}


