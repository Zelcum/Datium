package com.Datium.Datium.controller;

import com.Datium.Datium.dto.TableRequest;
import com.Datium.Datium.entity.SystemTable;
import com.Datium.Datium.service.SystemTableService;
import com.Datium.Datium.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SystemTableController {

    @Autowired
    private SystemTableService tableService;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping("/systems/{systemId}/tables")
    public ResponseEntity<List<SystemTable>> getTables(@PathVariable Integer systemId, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        return ResponseEntity.ok(tableService.getTables(systemId));
    }

    @PostMapping("/systems/{systemId}/tables")
    public ResponseEntity<SystemTable> createTable(@PathVariable Integer systemId, @RequestBody TableRequest request, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        return ResponseEntity.ok(tableService.createTable(systemId, request, userId));
    }

    @PutMapping("/systems/{systemId}/tables/{tableId}")
    public ResponseEntity<SystemTable> updateTable(@PathVariable Integer systemId, @PathVariable Integer tableId, @RequestBody TableRequest request, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        return ResponseEntity.ok(tableService.updateTable(tableId, request, userId));
    }

    @DeleteMapping("/systems/{systemId}/tables/{tableId}")
    public ResponseEntity<Void> deleteTable(@PathVariable Integer systemId, @PathVariable Integer tableId, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        tableService.deleteTable(tableId, userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/tables/{tableId}/move")
    public ResponseEntity<?> moveTable(@PathVariable Integer tableId, @RequestParam Integer targetSystemId, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        tableService.copyTable(tableId, targetSystemId, userId);
        return ResponseEntity.ok().body("{\"message\": \"Tabla copiada exitosamente\"}");
    }

    private Integer validateToken(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
            try {
                if(!jwtUtil.isTokenExpired(token)) {
                    return jwtUtil.extractUserId(token);
                }
            } catch (Exception e) {
            }
        }
        throw new RuntimeException("Invalid token");
    }
}
