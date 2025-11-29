package com.Datium.Datium.controller;

import com.Datium.Datium.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auditoria/sistema/{systemId}")
@CrossOrigin(origins = "*")
public class AuditController {

    @Autowired
    private JwtUtil jwtUtil;

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

    @GetMapping("/logs")
    public ResponseEntity<?> getAuditLogs(
            @PathVariable Integer systemId,
            @RequestHeader(value = "Authorization", required = false) String token) {
        try {
            Integer userId = getUserIdFromToken(token);
            if (userId == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            List<Map<String, Object>> logs = new ArrayList<>();
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
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

            List<Map<String, Object>> logs = new ArrayList<>();
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
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

            List<Map<String, Object>> audits = new ArrayList<>();
            return ResponseEntity.ok(audits);
        } catch (Exception e) {
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

            List<Map<String, Object>> audits = new ArrayList<>();
            return ResponseEntity.ok(audits);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}

