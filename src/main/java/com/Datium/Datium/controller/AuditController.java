package com.Datium.Datium.controller;

import com.Datium.Datium.entity.AuditLog;
import com.Datium.Datium.entity.SecurityAudit;
import com.Datium.Datium.entity.User;
import com.Datium.Datium.repository.AuditLogRepository;
import com.Datium.Datium.repository.SecurityAuditRepository;
import com.Datium.Datium.repository.UserRepository;
import com.Datium.Datium.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auditoria/sistema/{systemId}")
@CrossOrigin(origins = "*")
public class AuditController {

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private AuditLogRepository auditLogRepository;

    @Autowired
    private SecurityAuditRepository securityAuditRepository;

    @Autowired
    private UserRepository userRepository;

    private Integer getUserIdFromToken(String token) {
        if (token == null) return null;
        if (!token.startsWith("Bearer ")) {
            try {
                return jwtUtil.extractUserId(token);
            } catch (Exception e) {
                return null;
            }
        }
        try {
            String jwt = token.substring(7);
            return jwtUtil.extractUserId(jwt);
        } catch (Exception e) {
            return null;
        }
    }

    private List<Map<String, Object>> convertAuditLogsToResponse(List<AuditLog> logs) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (AuditLog log : logs) {
            Map<String, Object> logMap = new HashMap<>();
            logMap.put("id", log.getId());
            logMap.put("userId", log.getUserId());
            logMap.put("systemId", log.getSystemId());
            logMap.put("action", log.getAction());
            logMap.put("details", log.getDetails());
            logMap.put("ip", log.getIp());
            logMap.put("createdAt", log.getCreatedAt());

            if (log.getUserId() != null) {
                Optional<User> userOpt = userRepository.findById(log.getUserId());
                if (userOpt.isPresent()) {
                    logMap.put("userName", userOpt.get().getName());
                    logMap.put("userEmail", userOpt.get().getEmail());
                } else {
                    logMap.put("userName", "Usuario eliminado");
                    logMap.put("userEmail", null);
                }
            } else {
                logMap.put("userName", "Sistema");
                logMap.put("userEmail", null);
            }

            result.add(logMap);
        }
        return result;
    }

    private List<Map<String, Object>> convertSecurityAuditsToResponse(List<SecurityAudit> audits) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (SecurityAudit audit : audits) {
            Map<String, Object> auditMap = new HashMap<>();
            auditMap.put("id", audit.getId());
            auditMap.put("userId", audit.getUserId());
            auditMap.put("systemId", audit.getSystemId());
            auditMap.put("severity", audit.getSeverity() != null ? audit.getSeverity().toString() : null);
            auditMap.put("event", audit.getEvent());
            auditMap.put("details", audit.getDetails());
            auditMap.put("createdAt", audit.getCreatedAt());

            if (audit.getUserId() != null) {
                Optional<User> userOpt = userRepository.findById(audit.getUserId());
                if (userOpt.isPresent()) {
                    auditMap.put("userName", userOpt.get().getName());
                    auditMap.put("userEmail", userOpt.get().getEmail());
                } else {
                    auditMap.put("userName", "Usuario eliminado");
                    auditMap.put("userEmail", null);
                }
            } else {
                auditMap.put("userName", "Sistema");
                auditMap.put("userEmail", null);
            }

            result.add(auditMap);
        }
        return result;
    }

    @GetMapping("/logs")
    public ResponseEntity<?> getAuditLogs(
            @PathVariable Integer systemId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            List<AuditLog> auditLogs = auditLogRepository.findBySystemIdOrderByCreatedAtDesc(systemId);
            return ResponseEntity.ok(convertAuditLogsToResponse(auditLogs));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/logs/buscar")
    public ResponseEntity<?> searchAuditLogs(
            @PathVariable Integer systemId,
            @RequestParam String search,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            List<AuditLog> auditLogs = auditLogRepository.searchBySystemId(systemId, search);
            return ResponseEntity.ok(convertAuditLogsToResponse(auditLogs));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/logs/filtrar")
    public ResponseEntity<?> filterAuditLogs(
            @PathVariable Integer systemId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) Integer userId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer requesterId = getUserIdFromToken(token);
            if (requesterId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            LocalDateTime from = dateFrom != null && !dateFrom.isEmpty() 
                ? LocalDateTime.parse(dateFrom + "T00:00:00") : null;
            LocalDateTime to = dateTo != null && !dateTo.isEmpty() 
                ? LocalDateTime.parse(dateTo + "T23:59:59") : null;

            List<AuditLog> auditLogs = auditLogRepository.filterBySystemId(
                systemId, search, from, to, userId);
            return ResponseEntity.ok(convertAuditLogsToResponse(auditLogs));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/seguridad")
    public ResponseEntity<?> getSecurityAudit(
            @PathVariable Integer systemId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            List<SecurityAudit> securityAudits = securityAuditRepository.findBySystemIdOrderByCreatedAtDesc(systemId);
            return ResponseEntity.ok(convertSecurityAuditsToResponse(securityAudits));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/seguridad/buscar")
    public ResponseEntity<?> searchSecurityAudit(
            @PathVariable Integer systemId,
            @RequestParam String search,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            List<SecurityAudit> securityAudits = securityAuditRepository.searchBySystemId(systemId, search);
            return ResponseEntity.ok(convertSecurityAuditsToResponse(securityAudits));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/seguridad/filtrar")
    public ResponseEntity<?> filterSecurityAudit(
            @PathVariable Integer systemId,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            @RequestParam(required = false) Integer userId,
            @RequestParam(required = false) String severity,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer requesterId = getUserIdFromToken(token);
            if (requesterId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            LocalDateTime from = dateFrom != null && !dateFrom.isEmpty() 
                ? LocalDateTime.parse(dateFrom + "T00:00:00") : null;
            LocalDateTime to = dateTo != null && !dateTo.isEmpty() 
                ? LocalDateTime.parse(dateTo + "T23:59:59") : null;
            SecurityAudit.Severity severityEnum = null;
            if (severity != null && !severity.isEmpty()) {
                try {
                    severityEnum = SecurityAudit.Severity.valueOf(severity.toLowerCase());
                } catch (IllegalArgumentException e) {
                }
            }

            List<SecurityAudit> securityAudits = securityAuditRepository.filterBySystemId(
                systemId, search, from, to, userId, severityEnum);
            return ResponseEntity.ok(convertSecurityAuditsToResponse(securityAudits));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/estadisticas")
    public ResponseEntity<?> getStatistics(
            @PathVariable Integer systemId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Map<String, Object> stats = new HashMap<>();
            Long totalLogs = auditLogRepository.countBySystemId(systemId);
            Long totalSecurity = securityAuditRepository.countBySystemId(systemId);
            
            stats.put("totalLogs", totalLogs + totalSecurity);
            stats.put("highSeverity", securityAuditRepository.countBySystemIdAndSeverity(systemId, SecurityAudit.Severity.high));
            stats.put("mediumSeverity", securityAuditRepository.countBySystemIdAndSeverity(systemId, SecurityAudit.Severity.medium));
            stats.put("lowSeverity", securityAuditRepository.countBySystemIdAndSeverity(systemId, SecurityAudit.Severity.low));

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    public static class AuditExportRequest {
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

    @PostMapping("/exportar")
    public ResponseEntity<?> exportAuditData(
            @PathVariable Integer systemId,
            @RequestBody AuditExportRequest request,
            @RequestParam String format,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            String type = request.getType();
            List<Map<String, Object>> data = request.getData();

            if (data == null || data.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No hay datos para exportar"));
            }

            StringBuilder content = new StringBuilder();

            if ("csv".equalsIgnoreCase(format)) {
                if ("logs".equals(type)) {
                    content.append("Fecha,Usuario,Acción,Detalles,IP\n");
                    for (Map<String, Object> item : data) {
                        content.append(String.format("%s,%s,%s,%s,%s\n",
                            item.get("createdAt"),
                            item.get("userName"),
                            escapeCsv((String) item.get("action")),
                            escapeCsv((String) item.get("details")),
                            item.get("ip")));
                    }
                } else {
                    content.append("Fecha,Usuario,Evento,Severidad,Detalles\n");
                    for (Map<String, Object> item : data) {
                        content.append(String.format("%s,%s,%s,%s,%s\n",
                            item.get("createdAt"),
                            item.get("userName"),
                            escapeCsv((String) item.get("event")),
                            item.get("severity"),
                            escapeCsv((String) item.get("details"))));
                    }
                }
                return ResponseEntity.ok()
                    .header("Content-Type", "text/csv")
                    .header("Content-Disposition", "attachment; filename=auditoria.csv")
                    .body(content.toString());
            } else if ("json".equalsIgnoreCase(format)) {
                return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .header("Content-Disposition", "attachment; filename=auditoria.json")
                    .body(data);
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "Formato no soportado"));
            }
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/usuarios")
    public ResponseEntity<?> getUsers(
            @PathVariable Integer systemId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            java.util.Set<Integer> userIds = new java.util.HashSet<>();
            List<AuditLog> logs = auditLogRepository.findBySystemIdOrderByCreatedAtDesc(systemId);
            List<SecurityAudit> securityAudits = securityAuditRepository.findBySystemIdOrderByCreatedAtDesc(systemId);

            for (AuditLog log : logs) {
                if (log.getUserId() != null) {
                    userIds.add(log.getUserId());
                }
            }
            for (SecurityAudit audit : securityAudits) {
                if (audit.getUserId() != null) {
                    userIds.add(audit.getUserId());
                }
            }

            List<Map<String, Object>> users = new ArrayList<>();
            for (Integer uid : userIds) {
                Optional<User> userOpt = userRepository.findById(uid);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    Map<String, Object> userMap = new HashMap<>();
                    userMap.put("id", user.getId());
                    userMap.put("userId", user.getId());
                    userMap.put("name", user.getName());
                    userMap.put("userName", user.getName());
                    userMap.put("email", user.getEmail());
                    userMap.put("userEmail", user.getEmail());
                    users.add(userMap);
                }
            }

            return ResponseEntity.ok(users);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        if (value.contains(",") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
