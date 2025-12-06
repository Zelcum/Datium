package com.Datium.Datium.controller;

import com.Datium.Datium.dto.SystemFieldRequest;
import com.Datium.Datium.dto.SystemFieldResponse;
import com.Datium.Datium.dto.SystemRecordRequest;
import com.Datium.Datium.dto.SystemRecordResponse;
import com.Datium.Datium.service.SystemDataService;
import com.Datium.Datium.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tables/{tableId}")
public class TableDataController {

    @Autowired
    private SystemDataService systemDataService;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping("/fields")
    public ResponseEntity<List<SystemFieldResponse>> getFields(@PathVariable Integer tableId, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        return ResponseEntity.ok(systemDataService.getFieldsByTable(tableId, userId));
    }

    @PostMapping("/fields")
    public ResponseEntity<SystemFieldResponse> createField(@PathVariable Integer tableId, @RequestBody SystemFieldRequest request, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        return ResponseEntity.ok(systemDataService.createFieldForTable(tableId, request, userId));
    }

    @GetMapping("/records")
    public ResponseEntity<List<SystemRecordResponse>> getRecords(@PathVariable Integer tableId, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        return ResponseEntity.ok(systemDataService.getRecordsByTable(tableId, userId));
    }

    @PostMapping("/records")
    public ResponseEntity<SystemRecordResponse> createRecord(@PathVariable Integer tableId, @RequestBody SystemRecordRequest request, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        return ResponseEntity.ok(systemDataService.createRecordForTable(tableId, request, userId));
    }

    @PutMapping("/records/{recordId}")
    public ResponseEntity<SystemRecordResponse> updateRecord(@PathVariable Integer tableId, @PathVariable Integer recordId, @RequestBody SystemRecordRequest request, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        return ResponseEntity.ok(systemDataService.updateRecord(recordId, request, userId));
    }

    @DeleteMapping("/records/{recordId}")
    public ResponseEntity<Void> deleteRecord(@PathVariable Integer tableId, @PathVariable Integer recordId, @RequestHeader("Authorization") String token) {
        try {
            Integer userId = validateToken(token);
            systemDataService.deleteRecord(recordId, userId);
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
