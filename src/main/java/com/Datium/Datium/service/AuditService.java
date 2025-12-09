package com.Datium.Datium.service;

import com.Datium.Datium.entity.AuditLog;
import com.Datium.Datium.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuditService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    public void log(Integer systemId, Integer userId, String action, String details, String ip) {
        try {
            AuditLog log = new AuditLog();
            log.setSystemId(systemId);
            log.setUserId(userId);
            log.setAction(action);
            log.setDetails(details);
            log.setIp(ip != null ? ip : "Unknown");
            log.setCreatedAt(LocalDateTime.now());
            auditLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("Error saving audit log: " + e.getMessage());
            // Fail silently to not impact main transaction?
            // Or log to console.
        }
    }
}
