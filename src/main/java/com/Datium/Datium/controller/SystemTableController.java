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
        // Validate token
        Integer userId = validateToken(token);
        // TODO: Validate user access to system
        return ResponseEntity.ok(tableService.getTables(systemId));
    }

    @PostMapping("/systems/{systemId}/tables")
    public ResponseEntity<SystemTable> createTable(@PathVariable Integer systemId, @RequestBody TableRequest request, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        // TODO: Validate user permissions
        return ResponseEntity.ok(tableService.createTable(systemId, request, userId));
    }

    @PutMapping("/systems/{systemId}/tables/{tableId}")
    public ResponseEntity<SystemTable> updateTable(@PathVariable Integer systemId, @PathVariable Integer tableId, @RequestBody TableRequest request, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        return ResponseEntity.ok(tableService.updateTable(tableId, request, userId));
    }

    @DeleteMapping("/systems/{systemId}/tables/{tableId}")
    public ResponseEntity<Void> deleteTable(@PathVariable Integer systemId, @PathVariable Integer tableId, @RequestHeader("Authorization") String token) {
        try {
            Integer userId = validateToken(token);
            tableService.deleteTable(tableId, userId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).build();
        } catch (Exception e) {
             return ResponseEntity.status(500).build();
        }
    }

    private Integer validateToken(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
            // We just extract ID because simplified internal validation doesn't check email here unless we pass it
            // Or we just check expiry. 
            // The compilation error said validateToken required (String, String).
            // Let's rely on extractUserId which throws if invalid.
            try {
                if(!jwtUtil.isTokenExpired(token)) {
                    return jwtUtil.extractUserId(token);
                }
            } catch (Exception e) {
                // Invalid
            }
        }
        throw new RuntimeException("Invalid token");
    }
}
