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
    private com.Datium.Datium.service.SystemTableService systemTableService;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping("")
    public ResponseEntity<?> getTable(@PathVariable Integer tableId, @RequestHeader("Authorization") String token) {
        try {
            Integer userId = validateToken(token);
            com.Datium.Datium.entity.SystemTable table = systemTableService.getTable(tableId);
            
            java.util.Map<String, Object> response = new java.util.HashMap<>();
            response.put("id", table.getId());
            response.put("systemId", table.getSystemId());
            response.put("name", table.getName());
            response.put("description", table.getDescription());
            response.put("createdAt", table.getCreatedAt());
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
             return ResponseEntity.status(404).body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
             e.printStackTrace(); // Log to console
             return ResponseEntity.status(500).body("{\"error\": \"" + e.getMessage() + "\"}");
        }
    }

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

    @GetMapping("/export")
    public ResponseEntity<byte[]> exportTable(@PathVariable Integer tableId, @RequestParam(defaultValue = "csv") String format, @RequestHeader("Authorization") String token) {
        Integer userId = validateToken(token);
        
        byte[] data;
        String contentType;
        String filename;

        switch (format.toLowerCase()) {
            case "xlsx":
                data = systemDataService.exportTableToExcel(tableId, userId);
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                filename = "table_" + tableId + ".xlsx";
                break;
            case "pdf":
                data = systemDataService.exportTableToPdf(tableId, userId);
                contentType = "application/pdf";
                filename = "table_" + tableId + ".pdf";
                break;
            case "csv":
            default:
                data = systemDataService.exportTableToCsv(tableId, userId);
                contentType = "text/csv; charset=UTF-8";
                filename = "table_" + tableId + ".csv";
                break;
        }
        
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(org.springframework.http.MediaType.parseMediaType(contentType))
                .body(data);
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
